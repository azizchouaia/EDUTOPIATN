const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body } = require('express-validator');
const ctrl = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

const receiptsDir = path.join(__dirname, '..', '..', 'uploads', 'subscription-receipts');
fs.mkdirSync(receiptsDir, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, receiptsDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase();
    cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Dual check: extension AND MIME type must both match to prevent spoofing.
    const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i;
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedExtensions.test(file.originalname) && allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Seuls les recus JPG, PNG, WEBP ou PDF sont autorises.'));
  },
});

const checkoutValidators = [
  body('plan').isIn(['basic', 'premium', 'enterprise']).withMessage('Le forfait est invalide.'),
  body('billing_cycle').isIn(['1_month', '3_months', '1_year']).withMessage('Le cycle de facturation est invalide.'),
  body('payment_method').optional().isIn(['bank_transfer']).withMessage('Seul le virement bancaire est accepte.'),
];

const createSubscriptionValidators = [
  body('user_id').isInt({ min: 1 }).withMessage('L\'utilisateur est invalide.'),
  body('plan').isIn(['basic', 'premium', 'enterprise']).withMessage('Le forfait est invalide.'),
  body('billing_cycle').optional().isIn(['1_month', '3_months', '1_year']).withMessage('Le cycle de facturation est invalide.'),
  body('price_paid').optional().isFloat({ min: 0 }).withMessage('Le montant paye doit etre superieur ou egal a 0.'),
  body('payment_method').optional().isIn(['bank_transfer']).withMessage('Le mode de paiement est invalide.'),
  body('status').optional().isIn(['pending_receipt', 'pending_approval', 'pending_code', 'active', 'expired', 'cancelled']).withMessage('Le statut est invalide.'),
  body('start_date').isISO8601().withMessage('La date de debut est invalide.'),
  body('end_date').isISO8601().withMessage('La date de fin est invalide.').bail().custom((value, { req }) => {
    if (req.body.start_date && new Date(value) < new Date(req.body.start_date)) {
      throw new Error('La date de fin doit etre posterieure a la date de debut.');
    }
    return true;
  }),
];

const updateSubscriptionValidators = [
  body('user_id').optional().isInt({ min: 1 }).withMessage('L\'utilisateur est invalide.'),
  body('plan').optional().isIn(['basic', 'premium', 'enterprise']).withMessage('Le forfait est invalide.'),
  body('billing_cycle').optional().isIn(['1_month', '3_months', '1_year']).withMessage('Le cycle de facturation est invalide.'),
  body('price_paid').optional().isFloat({ min: 0 }).withMessage('Le montant paye doit etre superieur ou egal a 0.'),
  body('payment_method').optional().isIn(['bank_transfer']).withMessage('Le mode de paiement est invalide.'),
  body('status').optional().isIn(['pending_receipt', 'pending_approval', 'pending_code', 'active', 'expired', 'cancelled']).withMessage('Le statut est invalide.'),
  body('start_date').optional().isISO8601().withMessage('La date de debut est invalide.'),
  body('end_date').optional().isISO8601().withMessage('La date de fin est invalide.'),
];

router.get('/plans', ctrl.getPlans);
router.get('/', auth, ctrl.getAll);
router.get('/access-status', auth, ctrl.getAccessStatus);

router.post('/checkout',
  auth,
  checkoutValidators,
  ctrl.checkout
);

router.post('/activate-code',
  auth,
  [body('code').trim().notEmpty().withMessage('Le code d\'activation est obligatoire.')],
  ctrl.activateCode
);

router.post('/:id/receipt',
  auth,
  authorize('student'),
  (req, res, next) => {
    uploadReceipt.single('receipt')(req, res, (error) => {
      if (error) {
        return res.status(400).json({ message: error.message || 'Le televersement du recu a echoue.' });
      }
      return next();
    });
  },
  ctrl.uploadReceipt
);

router.post('/:id/approve-bank-transfer',
  auth,
  authorize('admin'),
  ctrl.approveBankTransfer
);

router.post('/:id/cancel', auth, ctrl.cancelPending);

router.post('/:id/regenerate-code', auth, authorize('admin'), ctrl.regenerateCode);

router.post('/',
  auth,
  authorize('admin'),
  createSubscriptionValidators,
  ctrl.create
);

router.put('/:id', auth, authorize('admin'), updateSubscriptionValidators, ctrl.update);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

module.exports = router;