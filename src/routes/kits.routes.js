const { Router } = require('express');
const c = require('../controllers/kits.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.get('/:id', c.getById);
router.post('/', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.retire);
module.exports = router;
