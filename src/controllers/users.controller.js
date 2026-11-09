const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/passwords');

const ROLES = ['cuidadora', 'nutricionista', 'administradora'];
const MIN_PASSWORD = 8;

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function parseRole(value) {
  if (!ROLES.includes(value)) throw new HttpError(400, `role debe ser uno de: ${ROLES.join(', ')}`);
  return value;
}

function parsePassword(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD) {
    throw new HttpError(400, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  return value;
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active };
}

/** Lista todas las cuentas del jardín (sin contraseñas). */
exports.list = async (req, res) => {
  const users = await User.find().sort({ active: -1, name: 1 });
  res.json(users.map(publicUser));
};

/** Crea una cuenta con contraseña inicial que la administradora comunica a la persona. */
exports.create = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = cleanEmail(req.body.email);
  if (!name) throw new HttpError(400, 'El nombre es obligatorio.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'El correo no es válido.');
  const role = parseRole(req.body.role);
  const password = parsePassword(req.body.password);
  if (await User.exists({ email })) throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
  const user = await User.create({ name, email, role, active: true, mustChangePassword: true, passwordHash: hashPassword(password) });
  res.status(201).json(publicUser(user));
};

/**
 * Cambia nombre, rol, estado o contraseña de una cuenta.
 * La administradora no puede quitarse su propio rol ni desactivarse, para no bloquear el jardín.
 */
exports.update = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Cuenta no encontrada');
  const esSiMisma = String(user._id) === req.user.id;

  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) throw new HttpError(400, 'El nombre no puede quedar vacío.');
    user.name = name;
  }
  if (req.body.role !== undefined) {
    const role = parseRole(req.body.role);
    if (esSiMisma && role !== 'administradora') throw new HttpError(400, 'No puedes quitarte tu propio rol de administración.');
    user.role = role;
  }
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== 'boolean') throw new HttpError(400, 'active debe ser true o false.');
    if (esSiMisma && !req.body.active) throw new HttpError(400, 'No puedes desactivar tu propia cuenta.');
    user.active = req.body.active;
  }
  if (req.body.password !== undefined) {
    user.passwordHash = hashPassword(parsePassword(req.body.password));
    user.mustChangePassword = true;
  }
  await user.save();
  res.json(publicUser(user));
};

exports.ROLES = ROLES;
