const db = require('../config/db');
const { handleValidationErrors } = require('../utils/validation');
const { getCache, setCache, invalidateCache } = require('../utils/cache');

const CACHE_KEY_TEAM = 'team:public';

// GET /api/team
async function getAll(_req, res) {
  const cached = getCache(CACHE_KEY_TEAM);
  if (cached) return res.json(cached);

  const [rows] = await db.query(
    `SELECT *
     FROM team_members
     WHERE is_active = 1
     ORDER BY display_order ASC, created_at ASC`
  );
  setCache(CACHE_KEY_TEAM, rows, 120); // 2-minute TTL
  res.json(rows);
}

// GET /api/team/all  (admin only)
async function getAllAdmin(_req, res) {
  const [rows] = await db.query(
    `SELECT *
     FROM team_members
     ORDER BY display_order ASC, created_at ASC`
  );
  res.json(rows);
}

// POST /api/team  (admin only)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { name, role, bio, initials, gradient_from, gradient_to, linkedin_url, github_url, email, display_order, is_active } = req.body;
  const [result] = await db.query(
    `INSERT INTO team_members
      (name, role, bio, initials, gradient_from, gradient_to, linkedin_url, github_url, email, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      role,
      bio || null,
      initials || null,
      gradient_from || 'from-bordeaux',
      gradient_to || 'to-bordeaux-deep',
      linkedin_url || null,
      github_url || null,
      email || null,
      display_order || 0,
      is_active === undefined ? 1 : is_active,
    ]
  );
  invalidateCache(CACHE_KEY_TEAM);
  res.status(201).json({ message: 'Membre de l\'equipe cree.', id: result.insertId });
}

// PUT /api/team/:id  (admin only)
async function update(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Membre de l\'equipe introuvable.' });

  const fields = ['name', 'role', 'bio', 'initials', 'gradient_from', 'gradient_to', 'linkedin_url', 'github_url', 'email', 'display_order', 'is_active'];
  const updates = [];
  const params = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'Aucune modification a enregistrer.' });

  params.push(req.params.id);
  await db.query(`UPDATE team_members SET ${updates.join(', ')} WHERE id = ?`, params);
  invalidateCache(CACHE_KEY_TEAM);
  res.json({ message: 'Membre de l\'equipe mis a jour.' });
}

// DELETE /api/team/:id  (admin only)
async function remove(req, res) {
  const [result] = await db.query('DELETE FROM team_members WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Membre de l\'equipe introuvable.' });
  invalidateCache(CACHE_KEY_TEAM);
  res.json({ message: 'Membre de l\'equipe supprime.' });
}

module.exports = { getAll, getAllAdmin, create, update, remove };