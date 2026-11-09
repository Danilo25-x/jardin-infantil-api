const AAVNProgramacion = require('../models/AAVNProgramacion');
const Child = require('../models/Child');
const HttpError = require('../utils/httpError');
const { todayISO, isValidDate } = require('../utils/dates');
const { mesesCumplidos } = require('../utils/edad');

const MODALIDADES = ['hogar_infantil'];
const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function parseVigencia(value) {
  const vigencia = Number(value || new Date().getUTCFullYear());
  if (!Number.isSafeInteger(vigencia) || vigencia < 2000) throw new HttpError(400, 'vigencia debe ser un año válido');
  return vigencia;
}

function parseModalidad(value) {
  const modalidad = String(value || 'hogar_infantil').trim();
  if (!MODALIDADES.includes(modalidad)) throw new HttpError(400, `modalidad no soportada. Usa: ${MODALIDADES.join(', ')}`);
  return modalidad;
}

/** Programación completa de una vigencia y modalidad. */
exports.list = async (req, res) => {
  const vigencia = parseVigencia(req.query.vigencia);
  const modalidad = parseModalidad(req.query.modalidad);
  const items = await AAVNProgramacion.find({ vigencia, modalidad }).sort({ tipo: 1, edadMinMeses: 1 });
  res.json(items);
};

/**
 * Programación aplicable a un niño en una fecha: filtra por edad en meses cumplidos.
 * Si el niño no tiene fecha de nacimiento, no se asigna programación por defecto.
 */
exports.forChild = async (req, res) => {
  const child = await Child.findById(req.params.id);
  if (!child || (!child.isActive && req.user.role !== 'administradora')) throw new HttpError(404, 'Niño no encontrado');
  const date = req.query.date || todayISO();
  if (!isValidDate(date)) throw new HttpError(400, 'date debe ser una fecha real en formato YYYY-MM-DD');
  const vigencia = parseVigencia(req.query.vigencia || date.slice(0, 4));
  const modalidad = parseModalidad(req.query.modalidad);

  const edadMeses = mesesCumplidos(child.birthDate, date);
  if (edadMeses === null) {
    throw new HttpError(422, 'El niño no tiene fecha de nacimiento; no se puede determinar su programación de AAVN.');
  }

  const candidatos = await AAVNProgramacion.find({
    vigencia, modalidad,
    edadMinMeses: { $lte: edadMeses },
    edadMaxMesesExclusivo: { $gt: edadMeses },
  }).sort({ tipo: 1 });

  const mesDate = Number(date.slice(5, 7)) - 1;
  const programacion = candidatos.map((item) => {
    const base = {
      producto: item.producto,
      tipo: item.tipo,
      cantidad: item.cantidad,
      unidad: item.unidad,
      vigencia: item.vigencia,
      modalidad: item.modalidad,
    };
    if (item.tipo === 'servicio_diario') return { ...base, diasAnuales: item.diasAnuales, regla: 'por día hábil de atención' };
    return {
      ...base,
      paquetesAnuales: item.mesesEntrega.length,
      mesesEntrega: item.mesesEntrega.map((m) => MESES_NOMBRE[m - 1]),
      entregaEnEsteMes: item.mesesEntrega.includes(mesDate + 1),
    };
  });

  res.json({ childId: String(child._id), fecha: date, edadMeses, vigencia, modalidad, programacion });
};
