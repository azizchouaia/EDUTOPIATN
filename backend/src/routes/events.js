const router    = require('express').Router();
const { body }  = require('express-validator');
const ctrl      = require('../controllers/eventController');
const auth      = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorize = require('../middleware/roles');
const { isFutureDate, isHttpUrl } = require('../utils/validation');

const createEventValidators = [
  body('title').trim().isLength({ min: 4 }).withMessage('Le titre doit contenir au moins 4 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('delivery_type').isIn(['google_meet', 'video']).withMessage('Le type de session est invalide.'),
  body('access_url').trim().custom((value) => {
    if (!isHttpUrl(value)) throw new Error('Le lien de la session est invalide.');
    return true;
  }),
  body('event_date').isISO8601().withMessage('La date de la session est invalide.').bail().custom((value, { req }) => {
    if (req.body.delivery_type === 'google_meet' && !isFutureDate(value)) {
      throw new Error('La date du live Google Meet doit etre dans le futur.');
    }
    return true;
  }),
  // seats_total: 0 = unlimited live, positive = limited live, ignored for video
  body('seats_total').custom((value, { req }) => {
    if (req.body.delivery_type === 'video') return true;
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new Error('Le nombre de places doit etre 0 (illimite) ou un entier positif.');
    }
    return true;
  }),
  body('is_free').optional().custom((value) => {
    if (![0, 1, '0', '1', true, false].includes(value)) {
      throw new Error('La valeur is_free est invalide.');
    }
    return true;
  }),
];

const updateEventValidators = [
  body('title').optional().trim().isLength({ min: 4 }).withMessage('Le titre doit contenir au moins 4 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('delivery_type').optional().isIn(['google_meet', 'video']).withMessage('Le type de session est invalide.'),
  body('access_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('Le lien de la session est invalide.');
    return true;
  }),
  body('event_date').optional().isISO8601().withMessage('La date de la session est invalide.').bail().custom((value, { req }) => {
    if (req.body.delivery_type === 'google_meet' && !isFutureDate(value)) {
      throw new Error('La date du live Google Meet doit etre dans le futur.');
    }
    return true;
  }),
  body('seats_total').optional().custom((value, { req }) => {
    if ((req.body.delivery_type ?? 'google_meet') === 'video') return true;
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new Error('Le nombre de places doit etre 0 (illimite) ou un entier positif.');
    }
    return true;
  }),
  body('is_cancelled').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut d\'annulation est invalide.'),
  body('is_free').optional().custom((value) => {
    if (![0, 1, '0', '1', true, false].includes(value)) {
      throw new Error('La valeur is_free est invalide.');
    }
    return true;
  }),
];

router.get('/', optionalAuth, ctrl.getAll);
router.get('/:id', optionalAuth, ctrl.getOne);

router.post('/',
  auth, authorize('teacher','admin'),
  createEventValidators,
  ctrl.create
);

router.put('/:id', auth, authorize('teacher','admin'), updateEventValidators, ctrl.update);
router.delete('/:id', auth, authorize('teacher','admin'), ctrl.remove);

router.post('/:id/register', auth, ctrl.registerForEvent);
router.delete('/:id/register', auth, ctrl.cancelRegistration);

module.exports = router;
