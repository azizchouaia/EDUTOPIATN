const router  = require('express').Router();
const { body } = require('express-validator');
const multer   = require('multer');
const ctrl     = require('../controllers/aiController');
const auth     = require('../middleware/auth');
const authorize = require('../middleware/roles');
const rateLimit = require('express-rate-limit');

// 30 messages per 10 minutes per student
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de messages. Attends quelques minutes avant de continuer.' },
});

// Memory storage — process in RAM, never write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non supporté. Utilise une image (JPG, PNG, WEBP) ou un PDF.'));
  },
});

router.post('/math-chat',
  auth,
  aiLimiter,
  upload.single('file'),   // optional — skipped when Content-Type is application/json
  [
    body('message').trim().isLength({ min: 0, max: 5000 }),
    body('conversation_id').optional().isInt({ min: 1 }),
  ],
  ctrl.chat
);

router.get('/math-chat/conversations', auth, ctrl.getConversations);
router.get('/math-chat/conversations/:id/messages', auth, ctrl.getMessages);
router.post('/math-chat/feedback', auth, [
  body('message_id').isInt({ min: 1 }),
  body('rating').isIn(['up', 'down']),
], ctrl.feedback);
router.delete('/math-chat/conversations/:id', auth, ctrl.deleteConversation);
router.get('/admin/usage', auth, authorize('admin'), ctrl.adminUsage);

module.exports = router;
