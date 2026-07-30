const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const auth   = require('../middleware/auth');

router.get('/', auth, ctrl.list);
router.post('/read', auth, ctrl.markRead);

module.exports = router;
