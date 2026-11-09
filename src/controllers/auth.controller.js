const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { verifyPassword, hashPassword } = require('../utils/passwords');
const { signToken } = require('../utils/tokens');

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  if (!email || typeof password !== 'string' || !password) throw new HttpError(400, 'Correo y contraseña son obligatorios.');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'El correo o la contraseña no son correctos.');
  }
  res.json({
    token: signToken(user),
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword === true },
  });
};

exports.me = async (req, res) => res.json({ user: req.user });

/** Cambio de contraseña propio. Obligatorio tras el primer ingreso o un restablecimiento. */
exports.changePassword = async (req, res) => {
  const actual = req.body.currentPassword;
  const nueva = req.body.newPassword;
  if (typeof actual !== 'string' || !actual) throw new HttpError(400, 'Escribe tu contraseña actual.');
  if (typeof nueva !== 'string' || nueva.length < 8) throw new HttpError(400, 'La nueva contraseña debe tener al menos 8 caracteres.');
  if (nueva === actual) throw new HttpError(400, 'La nueva contraseña debe ser distinta a la actual.');
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user || !verifyPassword(actual, user.passwordHash)) throw new HttpError(401, 'La contraseña actual no es correcta.');
  user.passwordHash = hashPassword(nueva);
  user.mustChangePassword = false;
  await user.save();
  res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, mustChangePassword: false } });
};
