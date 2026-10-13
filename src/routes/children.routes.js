const { Router } = require('express');
const c = require('../controllers/children.controller');

const router = Router();
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getById);

module.exports = router;
