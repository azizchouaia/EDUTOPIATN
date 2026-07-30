const router = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const auth     = require('../middleware/auth');
const { ALL_GRADES, SECTION_CODES, SECTION_REQUIRED_GRADES } = require('../utils/academic');

const registerValidators = [
  body('first_name').trim().isLength({ min: 2 }).withMessage('Le prenom doit contenir au moins 2 caracteres.'),
  body('last_name').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caracteres.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caracteres.'),
  body('role').optional().isIn(['student', 'teacher', 'parent']).withMessage('Le role est invalide.'),
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

const loginValidators = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('password').notEmpty().withMessage('Le mot de passe est obligatoire.'),
];

const requestPasswordResetValidators = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
];

const resetPasswordValidators = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Le code doit contenir 6 chiffres.').isNumeric().withMessage('Le code doit contenir 6 chiffres.'),
  body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caracteres.'),
];

router.post('/register',
  registerValidators,
  ctrl.register
);

router.post('/login',
  loginValidators,
  ctrl.login
);

router.post('/request-password-reset',
  requestPasswordResetValidators,
  ctrl.requestPasswordReset
);

router.post('/reset-password',
  resetPasswordValidators,
  ctrl.resetPassword
);

router.get('/me', auth, ctrl.me);

router.post('/google', ctrl.googleAuth);

module.exports = router;
