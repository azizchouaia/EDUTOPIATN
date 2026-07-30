/**
 * In-app notifications (bell menu). Reminders are generated lazily on fetch
 * (no cron needed): when the student loads their notifications, we check for
 * a subscription expiring within 7 days and insert a one-time reminder.
 */

const db = require('../config/db');

// Insert a notification, ignoring duplicates via the (user_id, dedupe_key) unique key.
async function createNotification({ userId, type, title, body = null, link = null, dedupeKey = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, link, dedupe_key)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE id = id`,
      [userId, type, title, body, link, dedupeKey]
    );
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err; // table not migrated yet
  }
}

// Lazily generate the "subscription expires in ≤7 days" reminder for a student.
async function ensureSubscriptionReminders(userId) {
  const [[sub]] = await db.query(
    `SELECT id, end_date, plan
     FROM subscriptions
     WHERE user_id = ? AND status = 'active'
       AND start_date <= CURDATE() AND end_date >= CURDATE()
     ORDER BY end_date DESC LIMIT 1`,
    [userId]
  ).catch(() => [[]]);
  if (!sub) return;

  const end = new Date(sub.end_date);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 7 || daysLeft < 0) return;

  // Dedupe per subscription end date so the reminder is created only once.
  const dedupeKey = `sub_expiry:${sub.id}:${end.toISOString().slice(0, 10)}`;
  await createNotification({
    userId,
    type: 'sub_expiry',
    title: 'Ton abonnement expire bientôt',
    body: daysLeft <= 0
      ? 'Ton abonnement expire aujourd\'hui. Renouvelle pour garder l\'accès aux cours et à Khlayel.'
      : `Ton abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Renouvelle pour ne pas perdre l\'accès.`,
    link: '/subscriptions',
    dedupeKey,
  });
}

// GET /api/notifications
async function list(req, res) {
  try {
    if (req.user.role === 'student') await ensureSubscriptionReminders(req.user.id);
    const [rows] = await db.query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    const unread = rows.filter(r => !r.is_read).length;
    res.json({ notifications: rows, unread });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json({ notifications: [], unread: 0 });
    throw err;
  }
}

// POST /api/notifications/read   { id? }  — mark one (or all) as read
async function markRead(req, res) {
  const { id } = req.body;
  if (id) {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, req.user.id]);
  } else {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [req.user.id]);
  }
  res.json({ ok: true });
}

module.exports = { list, markRead, createNotification, ensureSubscriptionReminders };
