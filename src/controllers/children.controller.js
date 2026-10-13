const Child = require('../models/Child');
const HttpError = require('../utils/httpError');

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.classroom) filter.classroom = req.query.classroom;
  const children = await Child.find(filter).sort({ name: 1 });
  res.json(children);
};

exports.create = async (req, res) => {
  const child = await Child.create(req.body);
  res.status(201).json(child);
};

exports.getById = async (req, res) => {
  const child = await Child.findById(req.params.id);
  if (!child) throw new HttpError(404, 'Niño no encontrado');
  res.json(child);
};
