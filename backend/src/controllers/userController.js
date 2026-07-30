const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { normalizeAcademicFields } = require('../utils/academic');
const { handleValidationErrors } = require('../utils/validation');

// POST /api/users  (admin only)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { first_name, last_name, age, email, password, role, college, avatar_url, is_active } = req.body;
  const academicFields = normalizeAcademicFields(req.body);
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) return res.status(409).json({ message: 'Cette adresse e-mail est deja utilisee.' });

  const password_hash = await bcrypt.hash(password, 10);
  const safeRole = ['admin', 'teacher', 'student', 'parent'].includes(role) ? role : 'student';

  const [result] = await db.query(
    `INSERT INTO users
      (first_name, last_name, age, email, password_hash, role, college, year_of_study, school_cycle, grade_code, section_code, avatar_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      first_name,
      last_name,
      age || null,
      email,
      password_hash,
      safeRole,
      college || null,
      academicFields.year_of_study,
      academicFields.school_cycle,
      academicFields.grade_code,
      academicFields.section_code,
      avatar_url || null,
      is_active === undefined ? 1 : is_active,
    ]
  );

  res.status(201).json({ message: 'Utilisateur cree.', id: result.insertId });
}

// GET /api/users  (admin only)
async function getAll(req, res) {
  const [rows] = await db.query(
    'SELECT id, first_name, last_name, age, email, phone, role, college, year_of_study, school_cycle, grade_code, section_code, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
}

// GET /api/users/:id  (admin or self)
async function getOne(req, res) {
  const id = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'Acces refuse.' });
  }
  const [rows] = await db.query(
    'SELECT id, first_name, last_name, age, email, phone, role, college, year_of_study, school_cycle, grade_code, section_code, avatar_url, is_active, created_at FROM users WHERE id = ?',
    [id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  res.json(rows[0]);
}

// PUT /api/users/:id  (admin or self — cannot change role unless admin)
async function update(req, res) {
  if (handleValidationErrors(req, res)) return;

  const id = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'Acces refuse.' });
  }

  const [currentRows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  const currentUser = currentRows[0];
  if (!currentUser) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  if (req.body.email !== undefined) {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [req.body.email, id]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Cette adresse e-mail est deja utilisee.' });
    }
  }

  const allowed = ['first_name', 'last_name', 'age', 'email', 'phone', 'college', 'avatar_url'];
  if (req.user.role === 'admin') allowed.push('role', 'is_active');

  const updates = [];
  const params  = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  const academicRequested = ['school_cycle', 'grade_code', 'section_code', 'year_of_study'].some(
    (field) => req.body[field] !== undefined
  );

  if (academicRequested) {
    const academicFields = normalizeAcademicFields({ ...currentUser, ...req.body });
    for (const [field, value] of Object.entries(academicFields)) {
      updates.push(`${field} = ?`);
      params.push(value);
    }
  }

  if (req.body.password) {
    updates.push('password_hash = ?');
    params.push(await bcrypt.hash(req.body.password, 10));
  }

  if (updates.length === 0) return res.status(400).json({ message: 'Aucune modification a enregistrer.' });

  params.push(id);
  await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Profil mis a jour.' });
}

// DELETE /api/users/:id  (admin only)
async function remove(req, res) {
  const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  res.json({ message: 'Utilisateur supprime.' });
}

// GET /api/users/parent-links  (admin only)
async function getParentLinks(req, res) {
  const [rows] = await db.query(
    `SELECT
       l.id,
       l.parent_id,
       l.student_id,
       l.relation_type,
       l.is_active,
       l.created_at,
       p.first_name AS parent_first_name,
       p.last_name AS parent_last_name,
       p.email AS parent_email,
       s.first_name AS student_first_name,
       s.last_name AS student_last_name,
       s.email AS student_email,
       s.grade_code,
       s.section_code,
       s.school_cycle
     FROM parent_student_links l
     JOIN users p ON p.id = l.parent_id
     JOIN users s ON s.id = l.student_id
     ORDER BY l.created_at DESC, p.last_name ASC, s.last_name ASC`
  );

  res.json(rows);
}

// POST /api/users/parent-links  (admin only)
async function createParentLink(req, res) {
  if (handleValidationErrors(req, res)) return;

  const parentId = Number(req.body.parent_id);
  const studentId = Number(req.body.student_id);
  const relationType = req.body.relation_type || 'parent';

  if (parentId === studentId) {
    return res.status(400).json({ message: 'Un parent ne peut pas etre lie a lui-meme.' });
  }

  const [users] = await db.query(
    'SELECT id, role FROM users WHERE id IN (?, ?)',
    [parentId, studentId]
  );

  const parentUser = users.find((user) => Number(user.id) === parentId);
  const studentUser = users.find((user) => Number(user.id) === studentId);

  if (!parentUser || parentUser.role !== 'parent') {
    return res.status(400).json({ message: 'Le compte parent choisi est invalide.' });
  }

  if (!studentUser || studentUser.role !== 'student') {
    return res.status(400).json({ message: 'L\'eleve choisi est invalide.' });
  }

  const [existing] = await db.query(
    'SELECT id FROM parent_student_links WHERE parent_id = ? AND student_id = ?',
    [parentId, studentId]
  );

  if (existing.length > 0) {
    return res.status(409).json({ message: 'Ce lien parent-enfant existe deja.' });
  }

  const [result] = await db.query(
    `INSERT INTO parent_student_links (parent_id, student_id, relation_type)
     VALUES (?, ?, ?)`,
    [parentId, studentId, relationType]
  );

  res.status(201).json({ message: 'Lien parent-enfant cree.', id: result.insertId });
}

// DELETE /api/users/parent-links/:id  (admin only)
async function removeParentLink(req, res) {
  const [result] = await db.query('DELETE FROM parent_student_links WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Lien parent-enfant introuvable.' });
  }

  res.json({ message: 'Lien parent-enfant supprime.' });
}

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
  getParentLinks,
  createParentLink,
  removeParentLink,
};
