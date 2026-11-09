const Child = require('../models/Child');
const Inventory = require('../models/Inventory');
const HttpError = require('../utils/httpError');
const { isValidDate } = require('../utils/dates');

function childData(body) {
  const name = String(body.name || '').trim();
  const classroom = String(body.classroom || '').trim();
  const guardians = Array.isArray(body.authorizedGuardians) ? body.authorizedGuardians : [];
  if (!name || !classroom) throw new HttpError(400, 'El nombre y el salón son obligatorios.');
  if (!guardians.length || guardians.some((item) => !String(item.name || '').trim() || !String(item.document || '').trim())) {
    throw new HttpError(400, 'Agrega al menos un acudiente con nombre y documento.');
  }
  const birthDate = body.birthDate ? String(body.birthDate).trim() : null;
  if (birthDate && !isValidDate(birthDate)) throw new HttpError(400, 'La fecha de nacimiento debe ser válida y usar AAAA-MM-DD.');
  return {
    name,
    classroom,
    birthDate,
    document: String(body.document || '').trim(),
    complement: String(body.complement || '').trim(),
    authorizedGuardians: guardians.map(({ name: guardianName, document, relation }) => ({ name: String(guardianName).trim(), document: String(document).trim(), relation: String(relation || 'Acudiente').trim() })),
  };
}

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.classroom) filter.classroom = String(req.query.classroom).trim();
  if (req.query.includeInactive === 'true' && req.user.role === 'administradora') {
    // Las cuentas cuidadoras solo consultan niños activos.
  } else filter.isActive = { $ne: false };
  res.json(await Child.find(filter).sort({ name: 1 }));
};

async function assertCatalogSupport(complement) {
  if (!complement) return;
  if (!(await Inventory.exists({ kitType: complement }))) throw new HttpError(400, 'El apoyo indicado no existe en el catálogo del jardín.');
}

exports.create = async (req, res) => {
  const data = childData(req.body);
  await assertCatalogSupport(data.complement);
  const child = await Child.create(data);
  res.status(201).json(child);
};

exports.getById = async (req, res) => {
  const child = await Child.findById(req.params.id);
  if (!child || (!child.isActive && req.user.role !== 'administradora')) throw new HttpError(404, 'Niño no encontrado');
  res.json(child);
};

exports.update = async (req, res) => {
  const data = childData(req.body);
  await assertCatalogSupport(data.complement);
  const child = await Child.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado');
  res.json(child);
};

exports.retire = async (req, res) => {
  const child = await Child.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado');
  res.json({ message: 'El niño quedó inactivo y se conserva su historial.', child });
};

