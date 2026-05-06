const db = require('../config/db');

async function findActiveSubscription(userId) {
  const [rows] = await db.query(
    `SELECT *
     FROM subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND start_date <= CURDATE()
       AND end_date >= CURDATE()
     ORDER BY end_date DESC, id DESC
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function requireActiveSubscription(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return next();
  }

  const subscription = await findActiveSubscription(req.user.id);
  if (!subscription) {
    return res.status(403).json({
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'An active subscription is required to access courses and events.',
    });
  }

  req.activeSubscription = subscription;
  return next();
}

module.exports = { findActiveSubscription, requireActiveSubscription };