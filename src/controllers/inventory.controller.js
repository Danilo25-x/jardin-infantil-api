const Inventory = require('../models/Inventory');

// GET /api/inventory
exports.list = async (req, res) => {
  const items = await Inventory.find().sort({ kitType: 1 });
  res.json(items);
};
