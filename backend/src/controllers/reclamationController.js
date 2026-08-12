const db = require('../config/db');
const { handleValidationErrors } = require('../utils/validation');

// POST /api/reclamations  (any authenticated user)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { subject, category, message } = req.body;
  const [result] = await db.query(
    'INSERT INTO reclamations (user_id, subject, category, message) VALUES (?, ?, ?, ?)',
    [req.user.id, subject, category || null, message]
  );
  res.status(201).json({ message: 'Reclamation envoyee.', id: result.insertId });
}

// GET /api/reclamations  (user sees own; admin sees all)
async function getAll(req, res) {
  let rows;
  if (req.user.role === 'admin' || req.user.role === 'commercial') {
    [rows] = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.email
       FROM reclamations r
       JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    );
  } else {
    [rows] = await db.query(
      'SELECT * FROM reclamations WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
  }
  res.json(rows);
}

// PUT /api/reclamations/:id/status  (admin only)
async function updateStatus(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { status } = req.body;
  const allowed = ['open', 'in_progress', 'resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Statut invalide.' });

  const [result] = await db.query(
    'UPDATE reclamations SET status = ? WHERE id = ?',
    [status, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Reclamation introuvable.' });
  res.json({ message: 'Statut mis a jour.' });
}

// DELETE /api/reclamations/:id  (admin only)
async function remove(req, res) {
  const [result] = await db.query('DELETE FROM reclamations WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Reclamation introuvable.' });
  res.json({ message: 'Reclamation supprimee.' });
}

module.exports = { create, getAll, updateStatus, remove };
