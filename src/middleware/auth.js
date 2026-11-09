const HttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/tokens');
const User = require('../models/User');

const RUTAS_PERMITIDAS_SIN_CAMBIO = ['/api/auth/me', '/api/auth/change-password'];

async function requireAuth(req, res, next) {
  try {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new HttpError(401, 'Inicia sesión para continuar.');
    const claims = verifyToken(match[1]);
    const user = await User.findById(claims.sub);
    if (!user || !user.active) throw new HttpError(401, 'La cuenta ya no está disponible.');
    req.user = {
      id: String(user._id), name: user.name, email: user.email, role: user.role,
      mustChangePassword: user.mustChangePassword === true,
    };
    const ruta = req.originalUrl.split('?')[0];
    if (req.user.mustChangePassword && !RUTAS_PERMITIDAS_SIN_CAMBIO.includes(ruta)) {
      const error = new HttpError(403, 'Debes cambiar tu contraseña antes de continuar.');
      error.code = 'PASSWORD_CHANGE_REQUIRED';
      throw error;
    }
    next();
  } catch (error) { next(error); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'No tienes permiso para realizar esta acción.'));
    next();
  };
}

module.exports = { requireAuth, requireRole };
