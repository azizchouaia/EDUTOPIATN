const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const auth   = require('../middleware/auth');

// ── Image upload ────────────────────────────────────────────────────────────
const imgDir = path.join(__dirname, '..', '..', 'uploads', 'images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, imgDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowedExtensions.test(file.originalname) && allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Seules les images sont autorisées (jpg, png, webp, gif, avif).'));
  },
});

// POST /api/uploads/image → { image_url }
router.post('/image', auth, imageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier recu.' });
  res.json({ image_url: `/uploads/images/${req.file.filename}` });
});

module.exports = router;

