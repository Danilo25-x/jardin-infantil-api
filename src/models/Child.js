const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del acudiente es obligatorio'], trim: true },
  document: { type: String, required: [true, 'El documento del acudiente es obligatorio'], trim: true },
  relation: { type: String, trim: true, default: 'Acudiente' },
}, { _id: false });

const childSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del niño es obligatorio'], trim: true },
  classroom: { type: String, required: [true, 'El salón es obligatorio'], trim: true },
  birthDate: { type: String, default: null },
  document: { type: String, trim: true, default: '' },
  complement: { type: String, trim: true, default: 'Según inventario' },
  authorizedGuardians: {
    type: [guardianSchema],
    validate: [(items) => items.length > 0, 'Debe tener al menos un acudiente autorizado'],
  },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Child', childSchema);

