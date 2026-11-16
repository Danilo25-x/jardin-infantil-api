const mongoose = require('mongoose');

/**
 * Kit: conjunto de productos del inventario que se entrega junto.
 * Cada item apunta a un producto (kitType del inventario) con la cantidad que incluye el kit.
 */
const kitSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del kit es obligatorio'], trim: true, unique: true },
  description: { type: String, trim: true, default: '' },
  items: [{
    _id: false,
    kitType: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Kit', kitSchema);
