const { Router } = require('express');
const c = require('../controllers/aidDeliveries.controller');

const router = Router();
router.get('/', c.list);
router.post('/', c.create);

module.exports = router;
