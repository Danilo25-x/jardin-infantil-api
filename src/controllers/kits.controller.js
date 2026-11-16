const Kit = require('../models/Kit');
const Inventory = require('../models/Inventory');
const HttpError = require('../utils/httpError');

/** Roles que pueden crear y cambiar kits: docentes (cuidadora), nutrición y administración. */
const PUEDE_GESTIONAR_KITS = ['administradora', 'cuidadora', 'nutricionista'];
const MAX_PRODUCTOS_POR_KIT = 50;

/**
 * Valida la composición de un kit: al menos un producto, sin repetidos y con cantidades enteras positivas.
 * @param {unknown} items Valor recibido en `items`.
 * @returns {{ kitType: string, quantity: number }[]}
 */
function normalizarComposicion(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'El kit debe tener al menos un producto');
  if (items.length > MAX_PRODUCTOS_POR_KIT) throw new HttpError(400, `Un kit admite como máximo ${MAX_PRODUCTOS_POR_KIT} productos`);
  const vistos = new Set();
  return items.map((item) => {
    const kitType = String(item?.kitType || '').trim();
    const quantity = item?.quantity;
    if (!kitType) throw new HttpError(400, 'Cada producto del kit necesita kitType');
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, `La cantidad de ${kitType} en el kit debe ser un entero mayor que 0`);
    if (vistos.has(kitType)) throw new HttpError(400, `El producto ${kitType} aparece repetido en el kit`);
    vistos.add(kitType);
    return { kitType, quantity };
  });
}

/** Comprueba que cada producto de la composición exista en el inventario. */
async function verificarProductos(composicion) {
  for (const item of composicion) {
    if (!(await Inventory.exists({ kitType: item.kitType }))) {
      throw new HttpError(400, `El producto ${item.kitType} no existe en el inventario`);
    }
  }
}

/**
 * Añade a cada kit sus existencias actuales y cuántos kits completos se pueden entregar.
 * Una sola consulta al inventario para todos los kits.
 */
async function conExistencias(kits) {
  const tipos = [...new Set(kits.flatMap((k) => k.items.map((i) => i.kitType)))];
  const inventario = await Inventory.find({ kitType: { $in: tipos } }).lean();
  const stockPor = new Map(inventario.map((i) => [i.kitType, i.stock]));
  return kits.map((kit) => {
    const items = kit.items.map((i) => ({ kitType: i.kitType, quantity: i.quantity, stock: stockPor.get(i.kitType) ?? 0 }));
    const unidadesDisponibles = items.length ? Math.min(...items.map((i) => Math.floor(i.stock / i.quantity))) : 0;
    return { _id: kit._id, name: kit.name, description: kit.description, items, unidadesDisponibles, updatedAt: kit.updatedAt };
  });
}

exports.puedeGestionarKits = PUEDE_GESTIONAR_KITS;

/** Lista los kits activos con su contenido y existencias. */
exports.list = async (req, res) => {
  const kits = await Kit.find({ active: true }).sort({ name: 1 }).lean();
  res.json(await conExistencias(kits));
};

/** Devuelve un kit activo con su contenido y existencias. */
exports.getById = async (req, res) => {
  const kit = await Kit.findOne({ _id: req.params.id, active: true }).lean();
  if (!kit) throw new HttpError(404, 'Kit no encontrado');
  const [detalle] = await conExistencias([kit]);
  res.json(detalle);
};

/** Crea un kit con los productos y cantidades que indique el docente o la administración. */
exports.create = async (req, res) => {
  if (!PUEDE_GESTIONAR_KITS.includes(req.user.role)) throw new HttpError(403, 'Tu rol no puede crear kits');
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name) throw new HttpError(400, 'El nombre del kit es obligatorio');
  const items = normalizarComposicion(req.body.items);
  await verificarProductos(items);
  if (await Kit.exists({ name })) throw new HttpError(409, 'Ya existe un kit con ese nombre');
  const kit = await Kit.create({ name, description, items, createdBy: req.user.id });
  res.status(201).json(kit);
};

/** Cambia el nombre, la descripción o la composición de un kit. */
exports.update = async (req, res) => {
  if (!PUEDE_GESTIONAR_KITS.includes(req.user.role)) throw new HttpError(403, 'Tu rol no puede modificar kits');
  const kit = await Kit.findOne({ _id: req.params.id, active: true });
  if (!kit) throw new HttpError(404, 'Kit no encontrado');
  const name = String(req.body.name ?? kit.name).trim();
  const description = String(req.body.description ?? kit.description).trim();
  if (!name) throw new HttpError(400, 'El nombre del kit es obligatorio');
  const items = req.body.items === undefined ? kit.items.map((i) => ({ kitType: i.kitType, quantity: i.quantity })) : normalizarComposicion(req.body.items);
  await verificarProductos(items);
  if (await Kit.exists({ name, _id: { $ne: kit._id } })) throw new HttpError(409, 'Ya existe un kit con ese nombre');
  kit.name = name;
  kit.description = description;
  kit.items = items;
  await kit.save();
  res.json(kit);
};

/** Retira un kit de la lista. No borra el historial de entregas. */
exports.retire = async (req, res) => {
  if (!PUEDE_GESTIONAR_KITS.includes(req.user.role)) throw new HttpError(403, 'Tu rol no puede retirar kits');
  const kit = await Kit.findOneAndUpdate({ _id: req.params.id, active: true }, { $set: { active: false } }, { new: true });
  if (!kit) throw new HttpError(404, 'Kit no encontrado');
  res.json({ retired: true, _id: kit._id });
};
exports.normalizarComposicion = normalizarComposicion;
