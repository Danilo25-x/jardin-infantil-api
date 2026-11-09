const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  kitType: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: '' },
  unit: { type: String, trim: true, default: 'unidad' },
  lowAt: { type: Number, min: 0, default: 5 },
  stock: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
