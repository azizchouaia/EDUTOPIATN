const rateLimit = require('express-rate-limit');

// Baseline limiter applied to the whole /api surface — generous, just there to
// stop a single client from hammering the server hard enough to cost money
// or burn out the DB pool.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requetes. Veuillez reessayer plus tard.' },
});

// Stricter limiter for auth endpoints (login/register/password-reset) — these
// are the most attractive brute-force targets.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Veuillez reessayer plus tard.' },
});

// Even stricter limiter for activation-code guessing, on top of the
// per-subscription attempt lockout enforced in subscriptionController.
const activationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives d\'activation. Veuillez reessayer plus tard.' },
});

// Checkout limiter — prevents a single IP from flooding orders.
// 10 orders per 10 minutes is generous for legitimate use.
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de commandes. Veuillez reessayer dans quelques minutes.' },
});

module.exports = { apiLimiter, authLimiter, activationLimiter, checkoutLimiter };
