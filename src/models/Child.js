const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'El nombre del acudiente es obligatorio'], trim: true },
    document: { type: String, required: [true, 'El documento del acudiente es obligatorio'], trim: true },
  },
  { _id: false }
);

const childSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'El nombre del niño es obligatorio'], trim: true },
    classroom: { type: String, required: [true, 'El salón es obligatorio'], trim: true },
    authorizedGuardians: {
      type: [guardianSchema],
      validate: [(v) => v.length > 0, 'Debe tener al menos un acudiente autorizado'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Child', childSchema);
