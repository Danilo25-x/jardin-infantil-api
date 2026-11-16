const mongoose = require('mongoose');

/** Un producto que recibe el niño: del Anexo 2 del ICBF ('servicio_diario', 'paquete_casa') o indicado por nutrición ('indicacion'). */
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['servicio_diario', 'paquete_casa', 'indicacion'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, trim: true, default: 'g' },
  detalle: { type: String, trim: true, default: '' },
}, { _id: false });

/** Origen de un plan: programación ICBF (calculada por edad) o indicación de nutrición (escrita a mano). */
const ORIGENES = ['icbf', 'nutricion'];

/**
 * Complemento de un niño. Según su origen, los items se calculan desde la programación ICBF
 * según la edad ('icbf') o los indica nutrición con productos del inventario ('nutricion').
 * Un niño puede tener planes de ambos orígenes a la vez; cada uno es independiente,
 * se finaliza por separado y nunca se borra.
 */
const nutritionPlanSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
  product: { type: String, trim: true, default: '' },
  origen: { type: String, enum: ORIGENES, default: 'icbf' },
  items: { type: [itemSchema], default: [] },
  frequency: { type: String, trim: true, default: '' },
  fuente: { type: String, trim: true, default: '' },
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  professionalName: { type: String, required: [true, 'El profesional responsable es obligatorio'], trim: true },
  professionalRole: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['activo', 'finalizado'], default: 'activo' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  finishedAt: { type: Date, default: null },
  finishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const NutritionPlan = mongoose.model('NutritionPlan', nutritionPlanSchema);
NutritionPlan.ORIGENES = ORIGENES;
module.exports = NutritionPlan;
