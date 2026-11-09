/**
 * Meses cumplidos entre una fecha de nacimiento (AAAA-MM-DD) y una fecha de referencia (AAAA-MM-DD).
 * Devuelve null si falta la fecha de nacimiento.
 */
function mesesCumplidos(birthDate, referenceDate) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  let months = (ry - by) * 12 + (rm - bm);
  if (rd < bd) months -= 1;
  return months < 0 ? 0 : months;
}

module.exports = { mesesCumplidos };
