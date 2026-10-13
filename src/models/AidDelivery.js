const mongoose = require('mongoose');

const aidDeliverySchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    kitType: { type: String, required: [true, 'El tipo de kit es obligatorio'], trim: true },
    quantity: { type: Number, required: true, min: 1 },
    stockAfter: { type: Number }, // existencias que quedaron tras la entrega
  },
  { timestamps: true }
);

module.exports = mongoose.model('AidDelivery', aidDeliverySchema);
