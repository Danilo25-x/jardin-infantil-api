const mongoose = require('mongoose');

const aidDeliverySchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  date: { type: String, required: true },
  deliveryType: { type: String, enum: ['jardin', 'hogar', 'adicional'], default: 'hogar', index: true },
  kitType: { type: String, required: [true, 'El tipo de kit es obligatorio'], trim: true },
  quantity: { type: Number, required: true, min: 1 },
  stockAfter: { type: Number },
  guardianName: { type: String, trim: true, default: '' },
  nutritionNote: { type: String, trim: true, default: '' },
  nutritionist: { type: String, trim: true, default: '' },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

aidDeliverySchema.index({ child: 1, date: 1, deliveryType: 1, kitType: 1 }, { unique: true });
module.exports = mongoose.model('AidDelivery', aidDeliverySchema);
