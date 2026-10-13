// Fecha de hoy en formato YYYY-MM-DD (hora local del servidor)
function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value + 'T00:00:00Z'));
}

function isValidMonth(value) {
  return /^\d{4}-\d{2}$/.test(value);
}

// Hora actual en formato HH:mm
function nowHHmm() {
  return new Date().toTimeString().slice(0, 5);
}

module.exports = { todayISO, isValidDate, isValidMonth, nowHHmm };
