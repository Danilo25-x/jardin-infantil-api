const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/children', require('./routes/children.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/aid-deliveries', require('./routes/aidDeliveries.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/reports', require('./routes/reports.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
