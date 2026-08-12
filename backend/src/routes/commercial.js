const router   = require('express').Router();
const db       = require('../config/db');
const auth     = require('../middleware/auth');
const authorize = require('../middleware/roles');

// GET /api/commercial/stats
router.get('/stats', auth, authorize('admin', 'commercial'), async (_req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*)                             FROM orders)                                     AS total_orders,
        (SELECT COUNT(*)                             FROM orders WHERE status = 'paid')               AS paid_orders,
        (SELECT COUNT(*)                             FROM orders WHERE status = 'pending')            AS pending_orders,
        (SELECT COUNT(*)                             FROM orders WHERE status = 'cancelled')          AS cancelled_orders,
        (SELECT COALESCE(SUM(total_amount), 0)       FROM orders WHERE status = 'paid')               AS total_revenue,
        (SELECT COUNT(*)                             FROM subscriptions WHERE status = 'active')      AS active_subscriptions,
        (SELECT COUNT(*)                             FROM subscriptions WHERE status = 'pending_approval') AS pending_approvals,
        (SELECT COUNT(*)                             FROM reclamations  WHERE status = 'open')        AS open_reclamations,
        (SELECT COUNT(*)                             FROM reclamations  WHERE status = 'in_progress') AS inprogress_reclamations,
        (SELECT COUNT(*)                             FROM products WHERE is_active = 1)               AS active_products,
        (SELECT COUNT(*)                             FROM promo_codes WHERE is_active = 1)            AS active_promo_codes
    `);
    res.json(stats);
  } catch (err) {
    console.error('commercial/stats error:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques.' });
  }
});

module.exports = router;
