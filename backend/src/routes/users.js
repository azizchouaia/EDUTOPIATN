const router    = require('express').Router();
const { body }  = require('express-validator');
const ctrl      = require('../controllers/userController');
const auth      = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { isHttpUrl } = require('../utils/validation');
const { ALL_GRADES, SECTION_CODES, SECTION_REQUIRED_GRADES } = require('../utils/academic');

const createUserValidators = [
	body('first_name').trim().isLength({ min: 2 }).withMessage('Le prenom doit contenir au moins 2 caracteres.'),
	body('last_name').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caracteres.'),
	body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
	body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caracteres.'),
	body('role').optional().isIn(['admin', 'teacher', 'student', 'parent']).withMessage('Le role est invalide.'),
	body('avatar_url').optional({ values: 'falsy' }).custom((value) => {
		if (!isHttpUrl(value)) throw new Error('L\'URL de l\'avatar est invalide.');
		return true;
	}),
	body('grade_code').custom((value, { req }) => {
		if (req.body.role === 'student' && !value) {
			throw new Error('La classe est obligatoire.');
		}
		if (value && !ALL_GRADES.includes(value)) {
			throw new Error('La classe est invalide.');
		}
		return true;
	}),
	body('section_code').custom((value, { req }) => {
		if (value && !SECTION_CODES.includes(value)) {
			throw new Error('La section est invalide.');
		}
		if (SECTION_REQUIRED_GRADES.has(req.body.grade_code) && !value) {
			throw new Error('La section est obligatoire pour cette classe.');
		}
		return true;
	}),
];

const updateUserValidators = [
	body('first_name').optional().trim().isLength({ min: 2 }).withMessage('Le prenom doit contenir au moins 2 caracteres.'),
	body('last_name').optional().trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caracteres.'),
	body('email').optional().trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
	body('password').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caracteres.'),
	body('role').optional().isIn(['admin', 'teacher', 'student', 'parent']).withMessage('Le role est invalide.'),
	body('avatar_url').optional({ values: 'falsy' }).custom((value) => {
		if (!isHttpUrl(value)) throw new Error('L\'URL de l\'avatar est invalide.');
		return true;
	}),
	body('grade_code').optional({ values: 'falsy' }).isIn(ALL_GRADES).withMessage('La classe est invalide.'),
	body('section_code').optional({ values: 'falsy' }).isIn(SECTION_CODES).withMessage('La section est invalide.'),
	body('section_code').custom((value, { req }) => {
		if (SECTION_REQUIRED_GRADES.has(req.body.grade_code) && !value) {
			throw new Error('La section est obligatoire pour cette classe.');
		}
		return true;
	}),
];

const createParentLinkValidators = [
	body('parent_id').isInt({ min: 1 }).withMessage('Le parent choisi est invalide.'),
	body('student_id').isInt({ min: 1 }).withMessage('L\'eleve choisi est invalide.'),
	body('relation_type').optional().isIn(['parent', 'mother', 'father', 'guardian']).withMessage('Le type de relation est invalide.'),
];

router.post('/',
	auth,
	authorize('admin'),
	createUserValidators,
	ctrl.create
);
router.get('/parent-links', auth, authorize('admin'), ctrl.getParentLinks);
router.post('/parent-links', auth, authorize('admin'), createParentLinkValidators, ctrl.createParentLink);
router.delete('/parent-links/:id', auth, authorize('admin'), ctrl.removeParentLink);
router.get('/',    auth, authorize('admin'), ctrl.getAll);
router.get('/:id', auth, ctrl.getOne);
router.put('/:id', auth, updateUserValidators, ctrl.update);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

module.exports = router;
