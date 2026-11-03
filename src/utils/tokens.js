const crypto = require('node:crypto');
const HttpError = require('./httpError');

function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET es obligatorio en producción');
  return 'solo-desarrollo-cambiar-antes-de-publicar';
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(user, lifetimeSeconds = 8 * 60 * 60) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: String(user._id), name: user.name, email: user.email, role: user.role, iat: issuedAt, exp: issuedAt + lifetimeSeconds });
  const content = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret()).update(content).digest('base64url');
  return `${content}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, 'La sesión no es válida. Inicia sesión de nuevo.');
  const content = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', secret()).update(content).digest();
  const received = Buffer.from(parts[2], 'base64url');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new HttpError(401, 'La sesión no es válida. Inicia sesión de nuevo.');
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
  catch { throw new HttpError(401, 'La sesión no es válida. Inicia sesión de nuevo.'); }
  if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'La sesión venció. Inicia sesión de nuevo.');
  }
  return payload;
}

module.exports = { signToken, verifyToken };
