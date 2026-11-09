const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  kitType: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  date: { type: String, required: true },
  note: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['entrada', 'salida'], default: 'entrada', index: true },
  reference: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);

