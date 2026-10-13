const { Router } = require('express');
const c = require('../controllers/attendance.controller');

const router = Router();
router.get('/', c.list);
router.post('/', c.checkIn);
router.patch('/:id/checkout', c.checkOut);

module.exports = router;
