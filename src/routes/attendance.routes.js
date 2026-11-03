const { Router } = require('express');
const c = require('../controllers/attendance.controller');
const { requireAuth } = require('../middleware/auth');
const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.post('/', c.checkIn);
router.patch('/:id/checkout', c.checkOut);
module.exports = router;
