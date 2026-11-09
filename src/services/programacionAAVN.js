/**
 * Convierte la programación oficial del Anexo 2 (AAVN, vigencia 2026) en items de un complemento.
 * Función pura: no consulta la base de datos. Recibe las filas ya filtradas por edad y modalidad.
 */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Formato colombiano de miles: 4500 -> "4.500". */
function formatearNumero(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Une una lista en español: ["a", "b", "c"] -> "a, b y c". */
function listar(xs) {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/** "Bienestarina Más® - consumo diario" -> "Bienestarina Más®". */
function nombreBase(producto) {
  return String(producto).split(' - ')[0].trim();
}

/**
 * @param {Array} candidatos Filas de AAVNProgramacion aplicables al niño.
 * @returns {Array<{name, tipo, quantity, unit, detalle}>} Items listos para guardar en el complemento.
 */
function construirItems(candidatos) {
  return candidatos.map((c) => {
    const name = nombreBase(c.producto);
    if (c.tipo === 'servicio_diario') {
      return {
        name, tipo: c.tipo, quantity: c.cantidad, unit: c.unidad,
        detalle: `${c.cantidad} ${c.unidad} por día hábil durante ${c.diasAnuales} días`,
      };
    }
    const meses = [...c.mesesEntrega].sort((a, b) => a - b).map((m) => MESES[m - 1]);
    const total = c.cantidad * meses.length;
    return {
      name, tipo: c.tipo, quantity: total, unit: c.unidad,
      detalle: `${formatearNumero(total)} ${c.unidad} al año: ${meses.length} paquetes de ${c.cantidad} ${c.unidad} en ${listar(meses)}`,
    };
  });
}

/** Frecuencia legible que se guarda junto al complemento. */
function resumenFrecuencia(items) {
  return items.map((i) => i.detalle).join('; ');
}

module.exports = { construirItems, resumenFrecuencia, formatearNumero };
