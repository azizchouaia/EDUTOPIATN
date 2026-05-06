const router    = require('express').Router();
const { body }  = require('express-validator');
const ctrl      = require('../controllers/marketController');
const auth      = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { isHttpUrl } = require('../utils/validation');

const productCreateValidators = [
  body('name').trim().isLength({ min: 3 }).withMessage('Le nom du produit doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('price').isFloat({ min: 0 }).withMessage('Le prix doit etre superieur ou egal a 0.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('tag').optional().isIn(['none', 'bestseller', 'new', 'limited', 'promo']).withMessage('Le tag est invalide.'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Le stock doit etre superieur ou egal a 0.'),
  body('image_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image est invalide.');
    return true;
  }),
];

const productUpdateValidators = [
  body('name').optional().trim().isLength({ min: 3 }).withMessage('Le nom du produit doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Le prix doit etre superieur ou egal a 0.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('tag').optional().isIn(['none', 'bestseller', 'new', 'limited', 'promo']).withMessage('Le tag est invalide.'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Le stock doit etre superieur ou egal a 0.'),
  body('image_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image est invalide.');
    return true;
  }),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

const promoCreateValidators = [
  body('code').trim().isLength({ min: 3 }).withMessage('Le code promo doit contenir au moins 3 caracteres.'),
  body('discount_percent').isInt({ min: 1, max: 100 }).withMessage('La reduction doit etre comprise entre 1 et 100.'),
  body('product_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage('Le produit associe est invalide.'),
  body('max_uses').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Le nombre maximum d\'utilisations doit etre superieur ou egal a 1.'),
  body('expires_at').optional({ values: 'falsy' }).isISO8601().withMessage('La date d\'expiration est invalide.'),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

const promoUpdateValidators = [
  body('code').optional().trim().isLength({ min: 3 }).withMessage('Le code promo doit contenir au moins 3 caracteres.'),
  body('discount_percent').optional().isInt({ min: 1, max: 100 }).withMessage('La reduction doit etre comprise entre 1 et 100.'),
  body('product_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }).withMessage('Le produit associe est invalide.'),
  body('max_uses').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Le nombre maximum d\'utilisations doit etre superieur ou egal a 1.'),
  body('expires_at').optional({ values: 'falsy' }).isISO8601().withMessage('La date d\'expiration est invalide.'),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

router.get('/products',         auth, ctrl.getProducts);
router.get('/orders',           auth, ctrl.getMyOrders);
router.get('/orders/all',       auth, authorize('admin'), ctrl.getAllOrders);
router.put('/orders/:id/status', auth, authorize('admin'), [body('status').isIn(['pending', 'paid', 'cancelled', 'refunded']).withMessage('Le statut de commande est invalide.')], ctrl.updateOrderStatus);
router.get('/promo-codes',      auth, authorize('admin'), ctrl.getPromoCodes);
router.post('/validate-promo',  auth, ctrl.validatePromo);

router.post('/products',
  auth, authorize('admin'),
  productCreateValidators,
  ctrl.createProduct
);
router.put('/products/:id', auth, authorize('admin'), productUpdateValidators, ctrl.updateProduct);
router.delete('/products/:id', auth, authorize('admin'), ctrl.removeProduct);

router.post('/promo-codes',
  auth, authorize('admin'),
  promoCreateValidators,
  ctrl.createPromoCode
);
router.put('/promo-codes/:id', auth, authorize('admin'), promoUpdateValidators, ctrl.updatePromoCode);
router.delete('/promo-codes/:id', auth, authorize('admin'), ctrl.removePromoCode);

router.post('/orders',
  auth,
  [
    body('items').isArray({ min: 1 }).withMessage('Ajoutez au moins un article a la commande.'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('Chaque article doit contenir un produit valide.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('La quantite de chaque article doit etre superieure ou egale a 1.'),
    body('payment_method').isIn(['cash_on_delivery', 'card', 'bank_transfer']).withMessage('Le mode de paiement est invalide.'),
    body('delivery.full_name').trim().isLength({ min: 3 }).withMessage('Le nom complet de livraison est obligatoire.'),
    body('delivery.phone').trim().matches(/^\+?[0-9 ]{8,15}$/).withMessage('Le numero de telephone est invalide.'),
    body('delivery.address').trim().isLength({ min: 8 }).withMessage('L\'adresse de livraison doit contenir au moins 8 caracteres.'),
    body('delivery.city').trim().isLength({ min: 2 }).withMessage('La ville de livraison est obligatoire.'),
    body('delivery.postal_code').optional({ nullable: true, values: 'falsy' }).trim().matches(/^[0-9A-Za-z -]{4,10}$/).withMessage('Le code postal est invalide.'),
    body('delivery.notes').optional({ nullable: true }).trim(),
    body('promo_code').optional({ nullable: true }).trim(),
  ],
  ctrl.createOrder
);

module.exports = router;
