const { Router } = require('express');
const c = require('../controllers/reports.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = Router();
router.use(requireAuth, requireRole('administradora'));
router.get('/summary', c.summary);
module.exports = router;
