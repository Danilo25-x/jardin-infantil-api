const AidDelivery = require('../models/AidDelivery');
const Child = require('../models/Child');
const Inventory = require('../models/Inventory');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

exports.create = async (req, res) => {
  const { childId, quantity } = req.body;
  const kitType = String(req.body.kitType || '').trim();
  const date = req.body.date || todayISO();
  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!kitType) throw new HttpError(400, 'kitType es obligatorio');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, 'quantity debe ser un entero mayor que 0');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  const child = await Child.findOne({ _id: childId, isActive: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado o inactivo');
  if (await AidDelivery.exists({ child: childId, date })) throw new HttpError(409, 'Ya se registró un complemento para ese niño en esa fecha');
  const updated = await Inventory.findOneAndUpdate({ kitType, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
  if (!updated) {
    if (!(await Inventory.exists({ kitType }))) throw new HttpError(404, 'Tipo de kit no existe en el inventario');
    throw new HttpError(409, 'No hay existencias suficientes del kit');
  }
  try {
    const delivery = await AidDelivery.create({ child: childId, date, kitType, quantity, stockAfter: updated.stock, deliveredBy: req.user.id });
    res.status(201).json(delivery);
  } catch (error) {
    await Inventory.updateOne({ kitType }, { $inc: { stock: quantity } });
    if (error.code === 11000) throw new HttpError(409, 'Ya se registró un complemento para ese niño en esa fecha');
    throw error;
  }
};

exports.list = async (req, res) => {
  const filter = {};
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
