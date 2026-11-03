const { Router } = require('express');
const c = require('../controllers/children.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.post('/', requireRole('administradora'), c.create);
router.get('/:id', c.getById);
router.put('/:id', requireRole('administradora'), c.update);
router.delete('/:id', requireRole('administradora'), c.retire);
module.exports = router;
