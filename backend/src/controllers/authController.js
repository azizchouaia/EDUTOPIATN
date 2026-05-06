const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../config/db');
const { normalizeAcademicFields } = require('../utils/academic');
const { handleValidationErrors } = require('../utils/validation');
const { sendPasswordResetEmail } = require('../utils/mailer');

const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_CODE_TTL_MINUTES || 15);
const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = Number(process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS || 60);
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Si cette adresse e-mail existe, un code de reinitialisation a ete envoye.';

function buildResetExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function shouldThrottleResetRequest(lastRequestedAt) {
  if (!lastRequestedAt) return false;

  const lastRequest = new Date(lastRequestedAt);
  if (Number.isNaN(lastRequest.getTime())) return false;

  return Date.now() - lastRequest.getTime() < PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000;
}

// POST /api/auth/register
async function register(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { first_name, last_name, age, email, password, role, college } = req.body;
  const academicFields = normalizeAcademicFields(req.body);

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) return res.status(409).json({ message: 'Cette adresse e-mail est deja utilisee.' });

  const password_hash = await bcrypt.hash(password, 10);
  const safeRole = ['student', 'teacher', 'parent'].includes(role) ? role : 'student';

  const [result] = await db.query(
    `INSERT INTO users (
      first_name,
      last_name,
      age,
      email,
      password_hash,
      role,
      college,
      year_of_study,
      school_cycle,
      grade_code,
      section_code
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );

  const token = jwt.sign(
    { id: result.insertId, role: safeRole },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return res.status(201).json({ message: 'Compte cree.', token });
}

// POST /api/auth/login
async function login(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { email, password } = req.body;

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const user   = rows[0];

  if (!user) return res.status(401).json({ message: 'Identifiants invalides.' });
  if (!user.is_active) return res.status(403).json({ message: 'Ce compte est desactive.' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Identifiants invalides.' });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password_hash: _, ...safeUser } = user;
  return res.json({ token, user: safeUser });
}

// POST /api/auth/request-password-reset
async function requestPasswordReset(req, res) {
  if (handleValidationErrors(req, res)) return;

  const email = String(req.body.email || '').trim().toLowerCase();
  const [rows] = await db.query(
    'SELECT id, first_name, email, is_active, password_reset_requested_at FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];

  if (!user || !user.is_active) {
    return res.json({ message: PASSWORD_RESET_SUCCESS_MESSAGE });
  }

  if (shouldThrottleResetRequest(user.password_reset_requested_at)) {
    return res.json({ message: PASSWORD_RESET_SUCCESS_MESSAGE });
  }

  const resetCode = generateResetCode();
  const passwordResetCodeHash = await bcrypt.hash(resetCode, 10);
  const passwordResetExpiresAt = buildResetExpiryDate();

  await db.query(
    `UPDATE users
        SET password_reset_code_hash = ?,
            password_reset_expires_at = ?,
            password_reset_requested_at = NOW()
      WHERE id = ?`,
    [passwordResetCodeHash, passwordResetExpiresAt, user.id]
  );

  await sendPasswordResetEmail({
    to: user.email,
    firstName: user.first_name,
    code: resetCode,
    expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
  });

  return res.json({ message: PASSWORD_RESET_SUCCESS_MESSAGE });
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  if (handleValidationErrors(req, res)) return;

  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const password = req.body.password;

  const [rows] = await db.query(
    'SELECT id, password_reset_code_hash, password_reset_expires_at FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];

  if (!user || !user.password_reset_code_hash || !user.password_reset_expires_at) {
    return res.status(400).json({ message: 'Le code de reinitialisation est invalide ou expire.' });
  }

  const expiresAt = new Date(user.password_reset_expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await db.query(
      `UPDATE users
          SET password_reset_code_hash = NULL,
              password_reset_expires_at = NULL,
              password_reset_requested_at = NULL
        WHERE id = ?`,
      [user.id]
    );
    return res.status(400).json({ message: 'Le code de reinitialisation est invalide ou expire.' });
  }

  const isCodeValid = await bcrypt.compare(code, user.password_reset_code_hash);
  if (!isCodeValid) {
    return res.status(400).json({ message: 'Le code de reinitialisation est invalide ou expire.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.query(
    `UPDATE users
        SET password_hash = ?,
            password_reset_code_hash = NULL,
            password_reset_expires_at = NULL,
            password_reset_requested_at = NULL
      WHERE id = ?`,
    [passwordHash, user.id]
  );

  return res.json({ message: 'Mot de passe reinitialise avec succes.' });
}

// GET /api/auth/me
async function me(req, res) {
  const [rows] = await db.query(
    'SELECT id, first_name, last_name, age, email, role, college, year_of_study, school_cycle, grade_code, section_code, avatar_url, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(rows[0]);
}

module.exports = { register, login, requestPasswordReset, resetPassword, me };
