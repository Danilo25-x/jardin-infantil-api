const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('base64url')}.${hash.toString('base64url')}`;
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !stored) return false;
  const [saltValue, hashValue] = stored.split('.');
  if (!saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, 'base64url');
  const actual = crypto.scryptSync(password, Buffer.from(saltValue, 'base64url'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
