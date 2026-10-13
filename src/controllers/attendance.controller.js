const Attendance = require('../models/Attendance');
const Child = require('../models/Child');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, nowHHmm } = require('../utils/dates');

const clean = (value) => String(value ?? '').trim();

// POST /api/attendance -> registrar llegada
exports.checkIn = async (req, res) => {
  const { childId, date = todayISO(), arrivalTime } = req.body;

  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe tener formato YYYY-MM-DD');

  const child = await Child.findById(childId);
  if (!child) throw new HttpError(404, 'Niño no encontrado');

  const existing = await Attendance.findOne({ child: childId, date });
  if (existing) throw new HttpError(409, 'El niño ya tiene llegada registrada para esa fecha');

  const record = await Attendance.create({
    child: childId,
    date,
    arrivalTime: arrivalTime || nowHHmm(),
    status: 'presente',
  });
  res.status(201).json(record);
};

// PATCH /api/attendance/:id/checkout -> registrar entrega (valida acudiente autorizado)
exports.checkOut = async (req, res) => {
  const guardianName = clean(req.body.guardianName);
  const guardianDocument = clean(req.body.guardianDocument);

  if (!guardianName || !guardianDocument) {
    throw new HttpError(400, 'guardianName y guardianDocument son obligatorios');
  }

  const record = await Attendance.findById(req.params.id);
  if (!record) throw new HttpError(404, 'Registro de asistencia no encontrado');
  if (record.status === 'entregado') throw new HttpError(409, 'Ese niño ya fue entregado');

  const child = await Child.findById(record.child);
  if (!child) throw new HttpError(404, 'Niño no encontrado');

  const authorized = child.authorizedGuardians.some(
    (g) =>
      clean(g.document) === guardianDocument &&
      clean(g.name).toLowerCase() === guardianName.toLowerCase()
  );
  if (!authorized) {
    throw new HttpError(403, 'La persona que recoge no está en la lista de acudientes autorizados');
  }

  record.status = 'entregado';
  record.checkoutTime = nowHHmm();
  record.pickedUpBy = guardianName;
  record.pickedUpDocument = guardianDocument;
  await record.save();

  res.json(record);
};

// GET /api/attendance?date=&status=
exports.list = async (req, res) => {
  const filter = {};
  const { date, status } = req.query;

  if (date) {
    if (!isValidDate(date)) throw new HttpError(400, 'date debe tener formato YYYY-MM-DD');
    filter.date = date;
  }
  if (status) {
    if (!['presente', 'entregado'].includes(status)) {
      throw new HttpError(400, 'status debe ser "presente" o "entregado"');
    }
    filter.status = status;
  }

  const records = await Attendance.find(filter)
    .populate('child', 'name classroom')
    .sort({ arrivalTime: 1 });
  res.json(records);
};
