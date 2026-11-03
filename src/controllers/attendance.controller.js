const Attendance = require('../models/Attendance');
const Child = require('../models/Child');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth, nowHHmm } = require('../utils/dates');
const clean = (value) => String(value ?? '').trim();

exports.checkIn = async (req, res) => {
  const { childId, date = todayISO(), arrivalTime } = req.body;
  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  const child = await Child.findOne({ _id: childId, isActive: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado o inactivo');
  const existing = await Attendance.findOne({ child: childId, date });
  if (existing) throw new HttpError(409, 'El niño ya tiene llegada registrada para esa fecha');
  const record = await Attendance.create({ child: childId, date, arrivalTime: arrivalTime || nowHHmm(), status: 'presente' });
  res.status(201).json(record);
};

exports.checkOut = async (req, res) => {
  const guardianName = clean(req.body.guardianName);
  const guardianDocument = clean(req.body.guardianDocument);
  if (!guardianName || !guardianDocument) throw new HttpError(400, 'guardianName y guardianDocument son obligatorios');
  const record = await Attendance.findById(req.params.id);
  if (!record) throw new HttpError(404, 'Registro de asistencia no encontrado');
  if (record.status === 'entregado') throw new HttpError(409, 'Ese niño ya fue entregado');
  const child = await Child.findById(record.child);
  if (!child) throw new HttpError(404, 'Niño no encontrado');
  const authorized = child.authorizedGuardians.some((g) => clean(g.document) === guardianDocument && clean(g.name).toLocaleLowerCase('es-CO') === guardianName.toLocaleLowerCase('es-CO'));
  if (!authorized) throw new HttpError(403, 'La persona que recoge no está en la lista de acudientes autorizados');
  record.status = 'entregado';
  record.checkoutTime = nowHHmm();
  record.pickedUpBy = guardianName;
  record.pickedUpDocument = guardianDocument;
  await record.save();
  res.json(record);
};

exports.list = async (req, res) => {
  const filter = {};
  const { date, month, from, to, status } = req.query;
  if (date) {
    if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
    filter.date = date;
  } else if (month) {
    if (!isValidMonth(month)) throw new HttpError(400, 'month debe tener formato YYYY-MM');
    filter.date = { $regex: `^${month}` };
  } else if (from || to) {
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) throw new HttpError(400, 'from y to deben usar formato YYYY-MM-DD');
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (status) {
    if (!['presente', 'entregado'].includes(status)) throw new HttpError(400, 'status debe ser "presente" o "entregado"');
    filter.status = status;
  }
  const records = await Attendance.find(filter).populate('child', 'name classroom isActive').sort({ date: -1, arrivalTime: 1 });
  res.json(records);
};
