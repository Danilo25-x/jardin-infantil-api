const { Router } = require('express');
const c = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.post('/login', c.login);
router.get('/me', requireAuth, c.me);
module.exports = router;
