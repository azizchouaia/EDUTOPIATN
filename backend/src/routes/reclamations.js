const router    = require('express').Router();
const { body }  = require('express-validator');
const ctrl      = require('../controllers/reclamationController');
const auth      = require('../middleware/auth');
const authorize = require('../middleware/roles');

router.get('/',  auth, ctrl.getAll);

router.post('/',
  auth,
  [
    body('subject').trim().isLength({ min: 4 }).withMessage('Le sujet doit contenir au moins 4 caracteres.'),
    body('category').optional({ values: 'falsy' }).isIn(['course', 'payment', 'technical', 'other']).withMessage('La categorie est invalide.'),
    body('message').trim().isLength({ min: 20 }).withMessage('Le message doit contenir au moins 20 caracteres.'),
  ],
  ctrl.create
);

router.put('/:id/status', auth, authorize('admin', 'commercial'), [body('status').isIn(['open', 'in_progress', 'resolved']).withMessage('Le statut est invalide.')], ctrl.updateStatus);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

module.exports = router;
