const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

exports.list = async (req, res) => res.json(await Inventory.find().sort({ kitType: 1 }));

exports.restock = async (req, res) => {
  const kitType = String(req.body.kitType || '').trim();
  const quantity = Number(req.body.quantity);
  const date = req.body.date || todayISO();
  const note = String(req.body.note || '').trim();
  if (!kitType) throw new HttpError(400, 'kitType es obligatorio');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, 'quantity debe ser un entero mayor que 0');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  const stock = await Inventory.findOneAndUpdate(
    { kitType },
    { $inc: { stock: quantity }, $setOnInsert: { kitType } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  try {
    await InventoryMovement.create({ kitType, quantity, date, note, createdBy: req.user.id });
  } catch (error) {
    await Inventory.updateOne({ kitType }, { $inc: { stock: -quantity } });
    throw error;
  }
  res.status(201).json({ message: 'Reposición registrada', item: stock, movement: { kitType, quantity, date, note } });
};

exports.movements = async (req, res) => {
  const filter = {};
  if (req.query.date) {
    if (!isValidDate(req.query.date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
    filter.date = req.query.date;
  } else if (req.query.month) {
    if (!isValidMonth(req.query.month)) throw new HttpError(400, 'month debe tener formato YYYY-MM');
    filter.date = { $regex: `^${req.query.month}` };
  }
  res.json(await InventoryMovement.find(filter).sort({ date: -1, createdAt: -1 }));
};
