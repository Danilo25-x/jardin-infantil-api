const { Router } = require('express');
const c = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.post('/login', c.login);
router.get('/me', requireAuth, c.me);
router.post('/change-password', requireAuth, c.changePassword);
const users = require('../controllers/users.controller');
const { requireRole } = require('../middleware/auth');
router.get('/users', requireAuth, requireRole('administradora'), users.list);
router.post('/users', requireAuth, requireRole('administradora'), users.create);
router.patch('/users/:id', requireAuth, requireRole('administradora'), users.update);
module.exports = router;
