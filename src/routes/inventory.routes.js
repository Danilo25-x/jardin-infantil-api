const { Router } = require('express');
const c = require('../controllers/inventory.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.get('/movements', requireRole('administradora'), c.movements);
router.post('/restock', requireRole('administradora'), c.restock);
router.post('/', requireRole('administradora'), c.create);
router.put('/:kitType', requireRole('administradora'), c.update);
module.exports = router;
