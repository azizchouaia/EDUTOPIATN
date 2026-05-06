const db = require('../config/db');
const { handleValidationErrors } = require('../utils/validation');

function normalizeEventRow(row) {
  return {
    ...row,
    is_registered: Boolean(row.is_registered),
  };
}

// GET /api/events
async function getAll(req, res) {
  const { category, search } = req.query;
  const ownOnly = req.user && req.query.mine === 'true' && (req.user.role === 'teacher' || req.user.role === 'admin');
  const includeAll = req.user?.role === 'admin' && req.query.include_all === 'true';
  let sql = `
    SELECT e.*, u.first_name, u.last_name,
           ${req.user ? 'CASE WHEN er.id IS NULL THEN 0 ELSE 1 END' : '0'} AS is_registered
    FROM events e
    JOIN users u ON u.id = e.host_id
    ${req.user ? 'LEFT JOIN event_registrations er ON er.event_id = e.id AND er.user_id = ?' : ''}
    WHERE 1 = 1
  `;
  const params = req.user ? [req.user.id] : [];

  if (ownOnly) {
    sql += ' AND e.host_id = ?';
    params.push(req.user.id);
  } else if (!includeAll) {
    sql += ' AND e.is_cancelled = 0';
  }

  if (category) { sql += ' AND e.category = ?'; params.push(category); }
  if (search) {
    sql += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.category LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY e.event_date ASC';
  const [rows] = await db.query(sql, params);
  res.json(rows.map(normalizeEventRow));
}

// GET /api/events/:id
async function getOne(req, res) {
  const params = req.user ? [req.user.id, req.params.id] : [req.params.id];
  const [rows] = await db.query(
    `SELECT e.*, u.first_name, u.last_name, u.avatar_url,
            ${req.user ? 'CASE WHEN er.id IS NULL THEN 0 ELSE 1 END' : '0'} AS is_registered
     FROM events e
     JOIN users u ON u.id = e.host_id
     ${req.user ? 'LEFT JOIN event_registrations er ON er.event_id = e.id AND er.user_id = ?' : ''}
     WHERE e.id = ?`,
    params
  );
  if (!rows[0]) return res.status(404).json({ message: 'Evenement introuvable.' });
  res.json(normalizeEventRow(rows[0]));
}

// POST /api/events  (teacher or admin)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { title, description, category, delivery_type, access_url, event_date, seats_total } = req.body;
  const normalizedSeats = delivery_type === 'video' ? 0 : Number(seats_total || 50);
  const [result] = await db.query(
    `INSERT INTO events (title, description, host_id, category, delivery_type, access_url, event_date, seats_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, req.user.id, category || null, delivery_type, access_url, event_date, normalizedSeats]
  );
  res.status(201).json({ message: 'Evenement cree.', id: result.insertId });
}

// PUT /api/events/:id  (host or admin)
async function update(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
  const event = rows[0];
  if (!event) return res.status(404).json({ message: 'Evenement introuvable.' });

  if (req.user.role !== 'admin' && event.host_id !== req.user.id) {
    return res.status(403).json({ message: 'Acces refuse.' });
  }

  const fields = ['title', 'description', 'category', 'delivery_type', 'access_url', 'event_date', 'seats_total', 'is_cancelled'];
  const updates = [];
  const params  = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  });

  if (req.body.delivery_type === 'video') {
    updates.push('seats_total = 0');
    updates.push('seats_taken = 0');
  }

  if (updates.length === 0) return res.status(400).json({ message: 'Aucune modification a enregistrer.' });

  if (req.body.delivery_type === 'video') {
    await db.query('DELETE FROM event_registrations WHERE event_id = ?', [req.params.id]);
  }

  params.push(req.params.id);
  await db.query(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Evenement mis a jour.' });
}

// DELETE /api/events/:id  (host or admin)
async function remove(req, res) {
  const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
  const event = rows[0];
  if (!event) return res.status(404).json({ message: 'Evenement introuvable.' });

  if (req.user.role !== 'admin' && event.host_id !== req.user.id) {
    return res.status(403).json({ message: 'Acces refuse.' });
  }

  await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
  res.json({ message: 'Evenement supprime.' });
}

// POST /api/events/:id/register  (any authenticated user)
async function registerForEvent(req, res) {
  const eventId = req.params.id;
  const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
  const event  = rows[0];
  if (!event) return res.status(404).json({ message: 'Evenement introuvable.' });
  if (event.delivery_type !== 'google_meet') {
    return res.status(400).json({ message: 'Les videos gratuites ne necessitent pas d\'inscription.' });
  }
  if (event.is_cancelled) return res.status(400).json({ message: 'Cet evenement est annule.' });
  if (event.seats_taken >= event.seats_total) return res.status(400).json({ message: 'Aucune place disponible.' });

  const [existing] = await db.query(
    'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ?',
    [req.user.id, eventId]
  );
  if (existing.length > 0) return res.status(409).json({ message: 'Vous etes deja inscrit a cet evenement.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)', [req.user.id, eventId]);
    await conn.query('UPDATE events SET seats_taken = seats_taken + 1 WHERE id = ?', [eventId]);
    await conn.commit();
    res.status(201).json({ message: 'Inscription enregistree.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// DELETE /api/events/:id/register  (cancel registration)
async function cancelRegistration(req, res) {
  const eventId = req.params.id;
  const [existing] = await db.query(
    'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ?',
    [req.user.id, eventId]
  );
  if (!existing[0]) return res.status(404).json({ message: 'Inscription introuvable.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?', [req.user.id, eventId]);
    await conn.query('UPDATE events SET seats_taken = GREATEST(seats_taken - 1, 0) WHERE id = ?', [eventId]);
    await conn.commit();
    res.json({ message: 'Inscription annulee.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getAll, getOne, create, update, remove, registerForEvent, cancelRegistration };
