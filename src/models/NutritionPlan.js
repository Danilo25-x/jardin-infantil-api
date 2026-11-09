const mongoose = require('mongoose');

/** Un producto que recibe el niño, tomado del Anexo 2 del ICBF. */
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['servicio_diario', 'paquete_casa'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, trim: true, default: 'g' },
  detalle: { type: String, trim: true, default: '' },
}, { _id: false });

/**
 * Complemento de un niño. Los items se calculan desde la programación ICBF según la edad;
 * no se escriben a mano. Se guarda como plan independiente y se finaliza, nunca se borra.
 */
const nutritionPlanSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
  product: { type: String, trim: true, default: '' },
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

module.exports = mongoose.model('NutritionPlan', nutritionPlanSchema);
