const { Router } = require('express');
const c = require('../controllers/programacion.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);
router.get('/', c.list);
module.exports = router;
