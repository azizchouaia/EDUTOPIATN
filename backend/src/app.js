require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/auth');
const courseRoutes      = require('./routes/courses');
const eventRoutes       = require('./routes/events');
const marketRoutes      = require('./routes/market');
const parentRoutes      = require('./routes/parent');
const reclamationRoutes = require('./routes/reclamations');
const subscriptionRoutes = require('./routes/subscriptions');
const teamRoutes        = require('./routes/team');
const userRoutes        = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/courses',     courseRoutes);
app.use('/api/events',      eventRoutes);
app.use('/api/market',      marketRoutes);
app.use('/api/parent',      parentRoutes);
app.use('/api/reclamations',reclamationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/team',        teamRoutes);
app.use('/api/users',       userRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Edutopia backend running on http://localhost:${PORT}`);
});
