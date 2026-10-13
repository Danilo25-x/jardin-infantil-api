function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Error interno del servidor';

  if (err.name === 'CastError') {
    status = 400;
    message = 'El ID tiene un formato inválido';
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  }
  if (err.code === 11000) {
    status = 409;
    message = 'Ya existe un registro con esos datos';
  }
  if (status === 500) console.error(err);

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
