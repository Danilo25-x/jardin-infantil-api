const mongoose = require('mongoose');
const Child = require('../models/Child');
const AAVNProgramacion = require('../models/AAVNProgramacion');
const Inventory = require('../models/Inventory');
const NutritionPlan = require('../models/NutritionPlan');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate } = require('../utils/dates');
const { mesesCumplidos } = require('../utils/edad');
const { construirItems, resumenFrecuencia } = require('../services/programacionAAVN');

const MODALIDADES = ['hogar_infantil'];
const MAX_ITEMS_MANUALES = 50;
const MAX_LARGO_UNIDAD = 20;

/**
 * Busca el niño o responde 404.
 * @param {string} id Identificador del niño.
 * @returns {Promise<object>} Documento del niño.
 */
async function requireChild(id) {
  const child = await Child.findById(id);
  if (!child) throw new HttpError(404, 'Niño no encontrado');
  return child;
}

/** Lista los complementos del niño, del más reciente al más antiguo. */
exports.list = async (req, res) => {
  await requireChild(req.params.id);
  res.json(await NutritionPlan.find({ child: req.params.id }).sort({ startDate: -1, createdAt: -1 }));
};

/**
 * Valida los datos comunes de un plan: fechas, profesional y notas.
 * @param {object} body Cuerpo de la solicitud.
 * @returns {{ startDate: string, endDate: string|null, professionalName: string, professionalRole: string, notes: string }}
 */
function validarBase(body) {
  const startDate = String(body.startDate || '').trim();
  const endDate = body.endDate ? String(body.endDate).trim() : null;
  const professionalName = String(body.professionalName || '').trim();
  const professionalRole = String(body.professionalRole || '').trim();
  const notes = String(body.notes || '').trim();
  if (!isValidDate(startDate)) throw new HttpError(400, 'startDate debe ser una fecha real en formato YYYY-MM-DD');
  if (endDate && (!isValidDate(endDate) || endDate < startDate)) throw new HttpError(400, 'endDate debe ser una fecha válida igual o posterior a startDate');
  if (!professionalName) throw new HttpError(400, 'professionalName es obligatorio');
  return { startDate, endDate, professionalName, professionalRole, notes };
}

/**
 * Valida los productos que nutrición indica a mano: al menos uno, sin repetidos,
 * cantidades enteras mayores que cero y unidad obligatoria.
 * @param {unknown} items Valor recibido en `items`.
 * @returns {{ name: string, tipo: string, quantity: number, unit: string, detalle: string }[]}
 */
function normalizarItemsManuales(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'items debe ser una lista con al menos un producto');
  if (items.length > MAX_ITEMS_MANUALES) throw new HttpError(400, `Un plan admite como máximo ${MAX_ITEMS_MANUALES} productos`);
  const vistos = new Set();
  return items.map((item) => {
    const name = String(item?.name || '').trim();
    const unit = String(item?.unit || '').trim();
    const detalle = String(item?.detalle || '').trim();
    const quantity = item?.quantity;
    if (!name) throw new HttpError(400, 'Cada producto necesita name');
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new HttpError(400, `La cantidad de ${name} debe ser un entero mayor que 0`);
    if (!unit) throw new HttpError(400, `La unidad de ${name} es obligatoria`);
    if (unit.length > MAX_LARGO_UNIDAD) throw new HttpError(400, `La unidad de ${name} admite como máximo ${MAX_LARGO_UNIDAD} caracteres`);
    if (vistos.has(name)) throw new HttpError(400, `El producto ${name} aparece repetido en el plan`);
    vistos.add(name);
    return { name, tipo: 'indicacion', quantity, unit, detalle };
  });
}

/**
 * Plan ICBF: productos y cantidades de la programación según la edad del niño en la fecha de inicio.
 * El cliente NO envía productos ni cantidades.
 */
async function crearPlanIcbf(req, res, child, base) {
  const modalidad = String(req.body.modalidad || 'hogar_infantil').trim();
  if (!MODALIDADES.includes(modalidad)) throw new HttpError(400, `modalidad no soportada. Usa: ${MODALIDADES.join(', ')}`);
  const vigencia = Number(base.startDate.slice(0, 4));
  const edadMeses = mesesCumplidos(child.birthDate, base.startDate);
  if (edadMeses === null) throw new HttpError(422, 'El niño no tiene fecha de nacimiento; no se puede determinar su complemento ICBF.');
  const candidatos = await AAVNProgramacion.find({
    vigencia, modalidad,
    edadMinMeses: { $lte: edadMeses },
    edadMaxMesesExclusivo: { $gt: edadMeses },
  }).sort({ tipo: 1 });
  if (candidatos.length === 0) throw new HttpError(422, 'No hay programación ICBF para la edad del niño, la modalidad y la vigencia indicadas.');
  const items = construirItems(candidatos);
  const plan = await NutritionPlan.create({
    child: child._id,
    origen: 'icbf',
    product: [...new Set(items.map((i) => i.name))].join(', '),
    items,
    frequency: resumenFrecuencia(items),
    fuente: `Anexo 2 AAVN Vigencia ${vigencia} (${modalidad})`,
    ...base,
    createdBy: req.user.id,
  });
  res.status(201).json(plan);
}

/**
 * Plan de nutrición: productos y cantidades que indica el profesional, tomados del inventario.
 * No depende de la edad, así que no exige fecha de nacimiento. Exige justificación en `notes`.
 * No modifica ni reemplaza el plan ICBF del niño.
 */
async function crearPlanNutricion(req, res, child, base) {
  if (!base.notes) throw new HttpError(400, 'notes es obligatorio: justifica la indicación de nutrición');
  const items = normalizarItemsManuales(req.body.items);
  for (const item of items) {
    if (!(await Inventory.exists({ kitType: item.name }))) {
      throw new HttpError(400, `El producto ${item.name} no existe en el inventario; no se podría entregar`);
    }
  }
  const frequency = String(req.body.frequency || '').trim() || 'Según indicación de nutrición';
  const plan = await NutritionPlan.create({
    child: child._id,
    origen: 'nutricion',
    product: items.map((i) => i.name).join(', '),
    items,
    frequency,
    fuente: 'Indicación de nutrición',
    ...base,
    createdBy: req.user.id,
  });
  res.status(201).json(plan);
}

/**
 * Crea un complemento. `origen` decide cómo se arman los productos:
 * 'icbf' (por defecto) los calcula desde la programación; 'nutricion' usa los `items` enviados.
 */
exports.create = async (req, res) => {
  const child = await requireChild(req.params.id);
  const origen = String(req.body.origen || 'icbf').trim();
  if (!NutritionPlan.ORIGENES.includes(origen)) throw new HttpError(400, `origen debe ser: ${NutritionPlan.ORIGENES.join(', ')}`);
  const base = validarBase(req.body);
  if (origen === 'nutricion') return crearPlanNutricion(req, res, child, base);
  return crearPlanIcbf(req, res, child, base);
};

/** Finaliza un complemento: conserva el registro y marca la fecha de fin. */
exports.finish = async (req, res) => {
  await requireChild(req.params.id);
  if (!mongoose.isValidObjectId(req.params.planId)) throw new HttpError(404, 'Complemento no encontrado');
  const plan = await NutritionPlan.findOne({ _id: req.params.planId, child: req.params.id });
  if (!plan) throw new HttpError(404, 'Complemento no encontrado');
  if (plan.status === 'finalizado') throw new HttpError(409, 'El complemento ya está finalizado');
  const endDate = req.body.endDate ? String(req.body.endDate).trim() : todayISO();
  if (!isValidDate(endDate) || endDate < plan.startDate) throw new HttpError(400, 'endDate debe ser una fecha válida igual o posterior al inicio');
  plan.status = 'finalizado';
  plan.endDate = endDate;
  plan.finishedAt = new Date();
  plan.finishedBy = req.user.id;
  await plan.save();
  res.json(plan);
};

exports._internos = { normalizarItemsManuales, validarBase, MAX_ITEMS_MANUALES };
