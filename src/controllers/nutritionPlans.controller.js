const mongoose = require('mongoose');
const Child = require('../models/Child');
const AAVNProgramacion = require('../models/AAVNProgramacion');
const NutritionPlan = require('../models/NutritionPlan');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate } = require('../utils/dates');
const { mesesCumplidos } = require('../utils/edad');
const { construirItems, resumenFrecuencia } = require('../services/programacionAAVN');

const MODALIDADES = ['hogar_infantil'];

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
 * Crea el complemento con los productos y cantidades de la programación ICBF según la edad
 * del niño en la fecha de inicio. El cliente NO envía productos ni cantidades.
 */
exports.create = async (req, res) => {
  const child = await requireChild(req.params.id);
  const startDate = String(req.body.startDate || '').trim();
  const endDate = req.body.endDate ? String(req.body.endDate).trim() : null;
  const professionalName = String(req.body.professionalName || '').trim();
  const professionalRole = String(req.body.professionalRole || '').trim();
  const notes = String(req.body.notes || '').trim();
  const modalidad = String(req.body.modalidad || 'hogar_infantil').trim();

  if (!MODALIDADES.includes(modalidad)) throw new HttpError(400, `modalidad no soportada. Usa: ${MODALIDADES.join(', ')}`);
  if (!isValidDate(startDate)) throw new HttpError(400, 'startDate debe ser una fecha real en formato YYYY-MM-DD');
  if (endDate && (!isValidDate(endDate) || endDate < startDate)) throw new HttpError(400, 'endDate debe ser una fecha válida igual o posterior a startDate');
  if (!professionalName) throw new HttpError(400, 'professionalName es obligatorio');

  const vigencia = Number(startDate.slice(0, 4));
  const edadMeses = mesesCumplidos(child.birthDate, startDate);
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
    product: [...new Set(items.map((i) => i.name))].join(', '),
    items,
    frequency: resumenFrecuencia(items),
    fuente: `Anexo 2 AAVN Vigencia ${vigencia} (${modalidad})`,
    startDate, endDate, professionalName, professionalRole, notes,
    createdBy: req.user.id,
  });
  res.status(201).json(plan);
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
