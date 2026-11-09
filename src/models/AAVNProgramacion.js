const mongoose = require('mongoose');

/**
 * Programación de Alimentos de Alto Valor Nutricional (AAVN) por vigencia, modalidad y rango de edad.
 * Fuente: Anexo 2 "Raciones de Alimentos de Alto Valor Nutricional – AAVN – Vigencia 2026" (Dirección de Nutrición).
 */
const aavnProgramacionSchema = new mongoose.Schema({
  vigencia: { type: Number, required: true, index: true },
  modalidad: { type: String, required: true, trim: true, index: true },
  producto: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['servicio_diario', 'paquete_casa'], required: true },
  cantidad: { type: Number, required: true, min: 1 },
  unidad: { type: String, enum: ['g'], default: 'g' },
  diasAnuales: { type: Number, default: null },
  mesesEntrega: { type: [Number], default: [] },
  edadMinMeses: { type: Number, required: true, min: 0 },
  edadMaxMesesExclusivo: { type: Number, required: true },
  fuente: { type: String, trim: true, default: '' },
}, { timestamps: true });

aavnProgramacionSchema.index({ vigencia: 1, modalidad: 1, tipo: 1 });
module.exports = mongoose.model('AAVNProgramacion', aavnProgramacionSchema);
