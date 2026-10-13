const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    arrivalTime: { type: String, required: true }, // HH:mm
    checkoutTime: { type: String, default: null }, // HH:mm
    status: { type: String, enum: ['presente', 'entregado'], default: 'presente' },
    pickedUpBy: { type: String, default: null },
    pickedUpDocument: { type: String, default: null },
  },
  { timestamps: true }
);

// Un solo registro de asistencia por niño y por día
attendanceSchema.index({ child: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
