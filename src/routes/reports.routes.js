const { Router } = require('express');
const c = require('../controllers/reports.controller');

const router = Router();
router.get('/summary', c.summary);

module.exports = router;
