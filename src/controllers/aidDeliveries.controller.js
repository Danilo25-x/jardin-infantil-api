const AidDelivery = require('../models/AidDelivery');
const Child = require('../models/Child');
const Inventory = require('../models/Inventory');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate } = require('../utils/dates');

// POST /api/aid-deliveries -> entrega de ayuda nutricional (valida existencias)
exports.create = async (req, res) => {
  const { childId, kitType, quantity, date = todayISO() } = req.body;

  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!kitType) throw new HttpError(400, 'kitType es obligatorio');
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new HttpError(400, 'quantity debe ser un entero mayor que 0');
  }
  if (!isValidDate(date)) throw new HttpError(400, 'date debe tener formato YYYY-MM-DD');

  const child = await Child.findById(childId);
  if (!child) throw new HttpError(404, 'Niño no encontrado');

  const item = await Inventory.findOne({ kitType });
  if (!item) throw new HttpError(404, 'Tipo de kit no existe en el inventario');

  // Descuento atómico: solo descuenta si hay existencias suficientes
  const updated = await Inventory.findOneAndUpdate(
    { kitType, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  if (!updated) throw new HttpError(409, 'No hay existencias suficientes del kit');

  let delivery;
  try {
    delivery = await AidDelivery.create({
      child: childId,
      date,
      kitType,
      quantity,
      stockAfter: updated.stock,
    });
  } catch (err) {
    // Si no se pudo guardar la entrega, se devuelve el stock descontado
    await Inventory.updateOne({ kitType }, { $inc: { stock: quantity } });
    throw err;
  }

  res.status(201).json(delivery);
};

// GET /api/aid-deliveries?date=
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.date) {
    if (!isValidDate(req.query.date)) throw new HttpError(400, 'date debe tener formato YYYY-MM-DD');
    filter.date = req.query.date;
  }
  const deliveries = await AidDelivery.find(filter)
    .populate('child', 'name classroom')
    .sort({ createdAt: 1 });
  res.json(deliveries);
};
