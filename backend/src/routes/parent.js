const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const ctrl = require('../controllers/parentController');

router.get('/children', auth, authorize('parent'), ctrl.getChildren);
router.get('/children/:studentId/progress', auth, authorize('parent'), ctrl.getChildProgress);

module.exports = router;