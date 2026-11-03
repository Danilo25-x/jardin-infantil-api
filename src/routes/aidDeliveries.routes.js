const { Router } = require('express');
const c = require('../controllers/aidDeliveries.controller');
const { requireAuth } = require('../middleware/auth');
const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.post('/', c.create);
module.exports = router;
