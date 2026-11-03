const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim()) : true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'jardin-infantil-api' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/children', require('./routes/children.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/aid-deliveries', require('./routes/aidDeliveries.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
