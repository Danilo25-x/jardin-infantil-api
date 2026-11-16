const mongoose = require('mongoose');
const AidDelivery = require('../models/AidDelivery');
const Child = require('../models/Child');
const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const Kit = require('../models/Kit');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate, isValidMonth } = require('../utils/dates');

const PUEDE_APOYO_ADICIONAL = ['administradora', 'nutricionista'];
const MAX_ITEMS_LOTE = 50;

/** Valida los datos comunes de una entrega (niño, tipo, acudiente o nutrición, fecha). */
function validarEntregaBase(body, user) {
  const childId = body.childId;
  const date = body.date || todayISO();
  const deliveryType = String(body.deliveryType || 'hogar').trim();
  const guardianName = String(body.guardianName || '').trim();
  const nutritionNote = String(body.nutritionNote || '').trim();
  const nutritionist = String(body.nutritionist || '').trim();
  if (deliveryType === 'adicional' && !PUEDE_APOYO_ADICIONAL.includes(user.role)) {
    throw new HttpError(403, 'Solo nutrición o administración pueden registrar apoyos adicionales.');
  }
  if (!childId) throw new HttpError(400, 'childId es obligatorio');
  if (!['jardin', 'hogar', 'adicional'].includes(deliveryType)) throw new HttpError(400, 'deliveryType debe ser jardin, hogar o adicional');
  if (deliveryType === 'hogar' && !guardianName) throw new HttpError(400, 'guardianName es obligatorio para entregas al hogar');
  if (deliveryType === 'adicional' && (!nutritionNote || !nutritionist)) throw new HttpError(400, 'Las ayudas adicionales requieren observación y profesional de nutrición');
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  return { childId, date, deliveryType, guardianName, nutritionNote, nutritionist };
}

/**
 * Valida la lista de productos de un lote: al menos uno, sin repetidos y con cantidades enteras positivas.
 * @param {unknown} items Valor recibido en `items`.
 * @returns {{ kitType: string, quantity: number }[]}
 */
function normalizarItemsLote(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'items debe ser una lista con al menos un producto');
  if (items.length > MAX_ITEMS_LOTE) throw new HttpError(400, `Una entrega admite como máximo ${MAX_ITEMS_LOTE} productos`);
  const vistos = new Set();
  return items.map((item) => {
    const kitType = String(item?.kitType || '').trim();
    const quantity = item?.quantity;
    if (!kitType) throw new HttpError(400, 'Cada producto necesita kitType');
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, `La cantidad de ${kitType} debe ser un entero mayor que 0`);
    if (vistos.has(kitType)) throw new HttpError(400, `El producto ${kitType} aparece repetido en la entrega`);
    vistos.add(kitType);
    return { kitType, quantity };
  });
}

/**
 * Devuelve al inventario y elimina los registros de los productos ya aplicados en un lote que falló.
 * Se recorre en orden inverso; cada paso es independiente para que un error no impida los demás.
 * @param {object[]} aplicados Estado de cada producto: restado, deliveryId y movimientoId.
 */
async function revertirLote(aplicados) {
  for (const a of [...aplicados].reverse()) {
    if (a.movimientoId) await InventoryMovement.deleteOne({ _id: a.movimientoId }).catch(() => {});
    if (a.deliveryId) await AidDelivery.deleteOne({ _id: a.deliveryId }).catch(() => {});
    if (a.restado) await Inventory.updateOne({ kitType: a.kitType }, { $inc: { stock: a.quantity } }).catch(() => {});
  }
}

/**
 * Registra en una sola operación varios productos para el mismo niño, fecha y tipo.
 *
 * Es todo o nada: se validan el niño, los productos, las existencias y los duplicados antes de
 * tocar el inventario; si un producto falla durante el registro, se revierten los anteriores.
 * @returns {Promise<object[]>} Registros de entrega creados.
 */
async function registrarLote(user, base, items) {
  if (!mongoose.isValidObjectId(base.childId)) throw new HttpError(404, 'Niño no encontrado o inactivo');
  const child = await Child.findOne({ _id: base.childId, isActive: true });
  if (!child) throw new HttpError(404, 'Niño no encontrado o inactivo');
  for (const item of items) {
    if (!(await Inventory.exists({ kitType: item.kitType }))) throw new HttpError(404, `Tipo de kit no existe en el inventario: ${item.kitType}`);
  }
  for (const item of items) {
    const existente = await AidDelivery.findOne({ child: base.childId, date: base.date, deliveryType: base.deliveryType, kitType: item.kitType });
    if (existente) throw new HttpError(409, `Ya existe ese registro para el niño, fecha y producto: ${item.kitType}`);
  }
  const aplicados = [];
  const entregas = [];
  try {
    for (const item of items) {
      const estado = { kitType: item.kitType, quantity: item.quantity, restado: false, deliveryId: null, movimientoId: null };
      aplicados.push(estado);
      const updated = await Inventory.findOneAndUpdate(
        { kitType: item.kitType, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!updated) throw new HttpError(409, `No hay existencias suficientes del kit: ${item.kitType}`);
      estado.restado = true;
      const delivery = await AidDelivery.create({
        child: base.childId, date: base.date, deliveryType: base.deliveryType, kitType: item.kitType,
        quantity: item.quantity, guardianName: base.guardianName, nutritionNote: base.nutritionNote,
        nutritionist: base.nutritionist, stockAfter: updated.stock, deliveredBy: user.id,
      });
      estado.deliveryId = delivery._id;
      const movimiento = await InventoryMovement.create({
        kitType: item.kitType, quantity: item.quantity, date: base.date, type: 'salida',
        note: `Entrega para ${base.deliveryType}`, reference: String(delivery._id), createdBy: user.id,
      });
      estado.movimientoId = movimiento._id;
      entregas.push(delivery);
    }
  } catch (error) {
    await revertirLote(aplicados);
    if (error.code === 11000) throw new HttpError(409, 'Ya existe ese registro para el niño, fecha y producto');
    throw error;
  }
  return entregas;
}

exports.create = async (req, res) => {
  const { childId, quantity } = req.body;
  const kitType = String(req.body.kitType || '').trim();
  const date = req.body.date || todayISO();
  const deliveryType = String(req.body.deliveryType || 'hogar').trim();
  const guardianName = String(req.body.guardianName || '').trim();
  const nutritionNote = String(req.body.nutritionNote || '').trim();
  const nutritionist = String(req.body.nutritionist || '').trim();
  if (deliveryType === 'adicional' && !PUEDE_APOYO_ADICIONAL.includes(req.user.role)) {
    throw new HttpError(403, 'Solo nutrición o administración pueden registrar apoyos adicionales.');
  }
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
  let delivery;
  try {
    delivery = await AidDelivery.create({ child: childId, date, deliveryType, kitType, quantity, guardianName, nutritionNote, nutritionist, stockAfter: updated.stock, deliveredBy: req.user.id });
  } catch (error) {
    await Inventory.updateOne({ kitType }, { $inc: { stock: quantity } });
    if (error.code === 11000) throw new HttpError(409, 'Ya existe ese registro para el niño, fecha y producto');
    throw error;
  }
  try {
    await InventoryMovement.create({ kitType, quantity, date, type: 'salida', note: `Entrega para ${deliveryType}`, reference: String(delivery._id), createdBy: req.user.id });
  } catch (error) {
    await AidDelivery.deleteOne({ _id: delivery._id });
    await Inventory.updateOne({ kitType }, { $inc: { stock: quantity } });
    throw error;
  }
  res.status(201).json(delivery);
};

/** Entrega por lote de productos sueltos (todo o nada). */
exports.createBulk = async (req, res) => {
  const base = validarEntregaBase(req.body, req.user);
  const items = normalizarItemsLote(req.body.items);
  const deliveries = await registrarLote(req.user, base, items);
  res.status(201).json({ deliveries });
};

/** Entrega un kit completo: registra todos sus productos con las cantidades que definió el kit. */
exports.createKit = async (req, res) => {
  const base = validarEntregaBase(req.body, req.user);
  if (!mongoose.isValidObjectId(req.body.kitId)) throw new HttpError(400, 'kitId no es válido');
  const kit = await Kit.findOne({ _id: req.body.kitId, active: true }).lean();
  if (!kit) throw new HttpError(404, 'Kit no encontrado');
  const items = kit.items.map((i) => ({ kitType: i.kitType, quantity: i.quantity }));
  const deliveries = await registrarLote(req.user, base, items);
  res.status(201).json({ kit: kit.name, deliveries });
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

exports._internos = { normalizarItemsLote, validarEntregaBase, MAX_ITEMS_LOTE };
