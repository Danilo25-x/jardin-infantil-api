const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { verifyPassword } = require('../utils/passwords');
const { signToken } = require('../utils/tokens');

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  if (!email || typeof password !== 'string' || !password) throw new HttpError(400, 'Correo y contraseña son obligatorios.');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'El correo o la contraseña no son correctos.');
  }
  res.json({ token: signToken(user), user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
};

exports.me = async (req, res) => res.json({ user: req.user });
