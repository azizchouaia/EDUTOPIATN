require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env')
});

console.log('ENV FILE:', require('path').join(__dirname, '..', '.env'));
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);process.env.ANTHROPIC_DISABLE_TELEMETRY = '1'; // suppress SDK telemetry noise
require('express-async-errors'); // patches Express 4 so rejected promises in async route handlers reach the error middleware
const path = require('path');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const compression = require('compression');
const { apiLimiter, authLimiter, activationLimiter } = require('./middleware/rateLimit');

const authRoutes        = require('./routes/auth');
const aiRoutes          = require('./routes/ai');
const courseRoutes      = require('./routes/courses');
const eventRoutes       = require('./routes/events');
const marketRoutes      = require('./routes/market');
const parentRoutes      = require('./routes/parent');
const reclamationRoutes = require('./routes/reclamations');
const subscriptionRoutes = require('./routes/subscriptions');
const teamRoutes        = require('./routes/team');
const userRoutes        = require('./routes/users');
const uploadRoutes      = require('./routes/uploads');
const notificationRoutes = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS origin whitelist ───────────────────────────────────
// Set ALLOWED_ORIGINS in .env as a comma-separated list of allowed origins.
// In development it defaults to localhost:5173 (Vite). In production you MUST
// set this to your actual frontend domain(s) — leaving it unset will block all
// cross-origin requests.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no Origin header (same-origin, curl, Postman in dev).
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
};

// ── Middleware ──────────────────────────────────────────────
// crossOriginResourcePolicy is relaxed because /uploads (images, avatars, PDFs,
// videos) is served from this API but rendered on a different origin (the frontend).
app.use(compression()); // gzip all text responses — cuts bandwidth 60-80%
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-src": ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
    },
  },
}));
app.use(cors(corsOptions));
app.use(express.json());

// helmet's default Content-Security-Policy ("frame-ancestors 'self'") and
// X-Frame-Options ("SAMEORIGIN") block uploaded files (PDF lessons, videos) from
// being embedded in an <iframe> on the frontend's origin — the in-app resource
// viewer shows "ERR_BLOCKED_BY_RESPONSE" without this. Relax just those two
// headers for /uploads; the rest of the API keeps helmet's full defaults.
app.use('/uploads', (_req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api', apiLimiter); // baseline rate limit for the whole API

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth/login',  authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/request-password-reset', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/subscriptions/activate-code', activationLimiter);

app.use('/api/commercial',  require('./routes/commercial'));
app.use('/api/auth',        authRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/events',      eventRoutes);
app.use('/api/market',      marketRoutes);
app.use('/api/parent',      parentRoutes);
app.use('/api/reclamations',reclamationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/team',        teamRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/uploads',     uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Serve the built frontend (single-image deploy) ──────────
// In the Docker image, the frontend's `dist/` is copied to
// /app/frontend/dist — two levels up from this file (backend/src/app.js).
// If ../../frontend/dist doesn't exist (e.g. local dev without a build),
// this just silently serves nothing and falls through to the 404 handler.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist', 'client');
app.use(express.static(frontendDist));

// SPA fallback: any GET that isn't /api/* or /uploads/* returns index.html
// so client-side routing (TanStack Router) can take over.
app.get(/^(?!\/api|\/uploads).*/, (_req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(); // no build present (e.g. local dev) — fall through to 404
  });
});

// ── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

// ── Process-level safety net ──────────────────────────────
// express-async-errors covers rejections inside request handlers, but stray
// rejections from background code (timers, fire-and-forget calls) would still
// crash the process by default. Log them instead of taking the whole server
// down — a logged error is recoverable, an unannounced restart under load isn't.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

app.listen(PORT, () => {
  console.log(`Edutopia backend running on http://localhost:${PORT}`);
});
