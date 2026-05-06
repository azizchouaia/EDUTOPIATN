const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/teamController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { isHttpUrl } = require('../utils/validation');

const createTeamValidators = [
  body('name').trim().isLength({ min: 2 }).withMessage('Le nom est obligatoire.'),
  body('role').trim().isLength({ min: 2 }).withMessage('Le role est obligatoire.'),
  body('initials').optional({ values: 'falsy' }).trim().isLength({ max: 4 }).withMessage('Les initiales doivent contenir au maximum 4 caracteres.'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('linkedin_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL LinkedIn est invalide.');
    return true;
  }),
  body('github_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL GitHub est invalide.');
    return true;
  }),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('gradient_from').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Le gradient de depart est obligatoire.'),
  body('gradient_to').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Le gradient d\'arrivee est obligatoire.'),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La biographie doit contenir au moins 10 caracteres.'),
];

const updateTeamValidators = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Le nom est obligatoire.'),
  body('role').optional().trim().isLength({ min: 2 }).withMessage('Le role est obligatoire.'),
  body('initials').optional({ values: 'falsy' }).trim().isLength({ max: 4 }).withMessage('Les initiales doivent contenir au maximum 4 caracteres.'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('linkedin_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL LinkedIn est invalide.');
    return true;
  }),
  body('github_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL GitHub est invalide.');
    return true;
  }),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La biographie doit contenir au moins 10 caracteres.'),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

router.get('/', ctrl.getAll);
router.get('/all', auth, authorize('admin'), ctrl.getAllAdmin);

router.post('/',
  auth,
  authorize('admin'),
  createTeamValidators,
  ctrl.create
);

router.put('/:id', auth, authorize('admin'), updateTeamValidators, ctrl.update);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

module.exports = router;