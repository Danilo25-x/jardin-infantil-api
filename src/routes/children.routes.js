const { Router } = require('express');
const c = require('../controllers/children.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const plans = require('../controllers/nutritionPlans.controller');
const programacion = require('../controllers/programacion.controller');

const router = Router();
router.use(requireAuth);
router.get('/', c.list);
router.post('/', requireRole('administradora'), c.create);
router.get('/:id', c.getById);
router.put('/:id', requireRole('administradora'), c.update);
router.delete('/:id', requireRole('administradora'), c.retire);
router.get('/:id/programacion', programacion.forChild);
router.get('/:id/plans', plans.list);
router.post('/:id/plans', requireRole('administradora', 'nutricionista'), plans.create);
router.patch('/:id/plans/:planId/finish', requireRole('administradora', 'nutricionista'), plans.finish);
module.exports = router;
