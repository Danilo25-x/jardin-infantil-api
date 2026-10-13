const { Router } = require('express');
const c = require('../controllers/inventory.controller');

const router = Router();
router.get('/', c.list);

module.exports = router;
