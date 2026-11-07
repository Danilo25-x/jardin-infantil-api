const AidDelivery = require('../models/AidDelivery');
const Child = require('../models/Child');
const Inventory = require('../models/Inventory');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

exports.create = async (req, res) => {
  const { childId, quantity } = req.body;
  const kitType = String(req.body.kitType || '').trim();
  const date = req.body.date || todayISO();
  const deliveryType = String(req.body.deliveryType || 'hogar').trim();
  const guardianName = String(req.body.guardianName || '').trim();
  const nutritionNote = String(req.body.nutritionNote || '').trim();
  const nutritionist = String(req.body.nutritionist || '').trim();
  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!kitType) throw new HttpError(400, 'kitType es obligatorio');
  if (!['jardin', 'hogar', 'adicional'].includes(deliveryType)) throw new HttpError(400, 'deliveryType debe ser jardin, hogar o adicional');
  if (deliveryType === 'hogar' && !guardianName) throw new HttpError(400, 'guardianName es obligatorio para entregas al hogar');
  if (deliveryType === 'adicional' && (!nutritionNote || !nutritionist)) throw new HttpError(400, 'Las ayudas adicionales requieren observación y profesional de nutrición');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, 'quantity debe ser un entero mayor que 0');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  const child = await Child.findOne({ _id: childId, isActive: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado o inactivo');
  const updated = await Inventory.findOneAndUpdate({ kitType, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
  if (!updated) {
    if (!(await Inventory.exists({ kitType }))) throw new HttpError(404, 'Tipo de kit no existe en el inventario');
    throw new HttpError(409, 'No hay existencias suficientes del kit');
  }
  try {
    const delivery = await AidDelivery.create({ child: childId, date, deliveryType, kitType, quantity, guardianName, nutritionNote, nutritionist, stockAfter: updated.stock, deliveredBy: req.user.id });
    res.status(201).json(delivery);
  } catch (error) {
    await Inventory.updateOne({ kitType }, { $inc: { stock: quantity } });
    if (error.code === 11000) throw new HttpError(409, 'Ya existe ese registro para el niño, fecha y producto');
    throw error;
  }
};

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.childId) filter.child = req.query.childId;
  if (req.query.deliveryType) {
    if (!['jardin', 'hogar', 'adicional'].includes(req.query.deliveryType)) throw new HttpError(400, 'deliveryType inválido');
    filter.deliveryType = req.query.deliveryType;
  }
  if (req.query.date) {
    if (!isValidDate(req.query.date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
    filter.date = req.query.date;
  } else if (req.query.month) {
    if (!isValidMonth(req.query.month)) throw new HttpError(400, 'month debe tener formato YYYY-MM');
    filter.date = { $regex: `^${req.query.month}` };
  }
  const deliveries = await AidDelivery.find(filter).populate('child', 'name classroom').sort({ date: -1, createdAt: 1 });
  res.json(deliveries);
};
