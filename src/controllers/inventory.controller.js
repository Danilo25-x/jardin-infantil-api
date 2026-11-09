const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

exports.list = async (req, res) => res.json(await Inventory.find().sort({ kitType: 1 }));

function parseLowAt(value) {
  const lowAt = Number(value);
  if (!Number.isSafeInteger(lowAt) || lowAt < 0) throw new HttpError(400, 'lowAt debe ser un entero mayor o igual a 0');
  return lowAt;
}

exports.create = async (req, res) => {
  const kitType = String(req.body.kitType || '').trim();
  const unit = String(req.body.unit || 'unidad').trim() || 'unidad';
  const description = String(req.body.description || '').trim();
  const lowAt = req.body.lowAt === undefined ? 5 : parseLowAt(req.body.lowAt);
  const stock = req.body.stock === undefined ? 0 : Number(req.body.stock);
  if (!kitType) throw new HttpError(400, 'kitType es obligatorio');
  if (!Number.isSafeInteger(stock) || stock < 0) throw new HttpError(400, 'stock debe ser un entero mayor o igual a 0');
  if (await Inventory.exists({ kitType })) throw new HttpError(409, 'Ya existe un producto con ese nombre');
  const item = await Inventory.create({ kitType, unit, description, lowAt, stock });
  if (stock > 0) {
    try {
      await InventoryMovement.create({ kitType, quantity: stock, type: 'entrada', date: todayISO(), note: 'Existencia inicial', createdBy: req.user.id });
    } catch (error) {
      await Inventory.deleteOne({ _id: item._id });
      throw error;
    }
  }
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const kitType = String(req.params.kitType || '').trim();
  const data = {};
  if (req.body.unit !== undefined) data.unit = String(req.body.unit).trim() || 'unidad';
  if (req.body.description !== undefined) data.description = String(req.body.description).trim();
  if (req.body.lowAt !== undefined) data.lowAt = parseLowAt(req.body.lowAt);
  const item = await Inventory.findOneAndUpdate({ kitType }, { $set: data }, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Producto no encontrado');
  res.json(item);
};

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
