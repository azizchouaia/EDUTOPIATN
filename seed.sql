-- =============================================================
--  Edutopia — Seed Data for Local Development
--  Run AFTER database.sql + all migrations.
--
--  Usage:
--    mysql -u root -p edutopiav2 < backend/seed.sql
--
--  What this creates:
--    - 1 admin     admin@edutopia.tn      / Admin@1234
--    - 1 teacher   teacher@edutopia.tn    / Test@1234
--    - 1 student   student@edutopia.tn    / Test@1234
--    - 1 parent    parent@edutopia.tn     / Test@1234
--    - 1 commercial commercial@edutopia.tn / Test@1234
--    - 2 products in the marketplace
--    - 1 promo code: EDUTOPIA10 (10%)
--    - 1 subscription plan active for the student
--    - 1 event (live session)
-- =============================================================

USE edutopiav2;

-- ── 1. USERS ─────────────────────────────────────────────────
-- Passwords are bcrypt hashes. Plain text shown in comments.
-- Hash for "Admin@1234"  → already in database.sql (skip if exists)
-- Hash for "Test@1234"   → $2a$10$Y9k1WNFQJhBg2W6qfW4q4.QFZ1k0yWnRhBMSZwZ5mDkGm.GKW7mHe

INSERT INTO users
  (first_name, last_name, email, password_hash, role, phone, year_of_study, school_cycle, grade_code, section_code)
VALUES
  -- admin (may already exist from database.sql — IGNORE handles it)
  ('Super', 'Admin', 'admin@edutopia.tn',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhuG',
   'admin', '+216 90 000 001', NULL, NULL, NULL, NULL),

  -- teacher
  ('Ahmed', 'Ben Salah', 'teacher@edutopia.tn',
   '$2a$10$Y9k1WNFQJhBg2W6qfW4q4.QFZ1k0yWnRhBMSZwZ5mDkGm.GKW7mHe',
   'teacher', '+216 90 000 002', NULL, NULL, NULL, NULL),

  -- student (bac math)
  ('Yasmine', 'Trabelsi', 'student@edutopia.tn',
   '$2a$10$Y9k1WNFQJhBg2W6qfW4q4.QFZ1k0yWnRhBMSZwZ5mDkGm.GKW7mHe',
   'student', '+216 90 000 003', 'Bac math', 'lycee', 'bac', 'math'),

  -- parent
  ('Karim', 'Trabelsi', 'parent@edutopia.tn',
   '$2a$10$Y9k1WNFQJhBg2W6qfW4q4.QFZ1k0yWnRhBMSZwZ5mDkGm.GKW7mHe',
   'parent', '+216 90 000 004', NULL, NULL, NULL, NULL),

  -- commercial
  ('Sana', 'Mansour', 'commercial@edutopia.tn',
   '$2a$10$Y9k1WNFQJhBg2W6qfW4q4.QFZ1k0yWnRhBMSZwZ5mDkGm.GKW7mHe',
   'commercial', '+216 90 000 005', NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- Update role column to include 'commercial' if using old schema
-- (safe to run even if the ENUM already includes it)
ALTER TABLE users MODIFY COLUMN role ENUM('admin','teacher','student','parent','commercial') NOT NULL DEFAULT 'student';

-- ── 2. PARENT → STUDENT LINK ──────────────────────────────────
INSERT INTO parent_student_links (parent_id, student_id, relation_type)
SELECT
  (SELECT id FROM users WHERE email = 'parent@edutopia.tn'),
  (SELECT id FROM users WHERE email = 'student@edutopia.tn'),
  'parent'
ON DUPLICATE KEY UPDATE is_active = 1;

-- ── 3. PRODUCTS ───────────────────────────────────────────────
INSERT INTO products (name, description, price, category, tag, stock, is_active)
VALUES
  ('Pack Bac Math 2025',
   'Recueil complet d\'exercices corrigés — toutes les épreuves du bac maths depuis 2015.',
   29.90, 'Livres scolaires', 'bestseller', 50, 1),

  ('Agenda scolaire Edutopia 2025-2026',
   'Agenda personnalisé avec planning hebdomadaire, espace révisions et calendrier bac.',
   12.50, 'Papeterie', 'new', 100, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ── 4. PROMO CODE ─────────────────────────────────────────────
INSERT INTO promo_codes (code, discount_percent, max_uses, is_active)
VALUES ('EDUTOPIA10', 10, 100, 1)
ON DUPLICATE KEY UPDATE discount_percent = 10;

-- ── 5. SUBSCRIPTION (student — active) ───────────────────────
INSERT INTO subscriptions
  (user_id, plan, billing_cycle, price_paid, payment_method, status,
   start_date, end_date)
SELECT
  id, 'premium', '1_month', 29.00, 'online', 'active',
  CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY)
FROM users WHERE email = 'student@edutopia.tn'
ON DUPLICATE KEY UPDATE status = 'active';

-- ── 6. EVENT ──────────────────────────────────────────────────
INSERT INTO events
  (title, description, host_id, category, delivery_type, access_url,
   event_date, seats_total, seats_taken, is_cancelled)
SELECT
  'Correction Bac Math — Session Principale 2025',
  'Correction complète et détaillée de l\'épreuve de maths du bac session principale 2025. Toutes les sections couvertes.',
  id,
  'Mathématiques',
  'google_meet',
  'https://meet.google.com/xxx-xxxx-xxx',
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  200, 0, 0
FROM users WHERE email = 'teacher@edutopia.tn'
LIMIT 1;

-- ── 7. TEAM MEMBER ────────────────────────────────────────────
INSERT INTO team_members
  (name, role, bio, initials, gradient_from, gradient_to, display_order, is_active)
VALUES
  ('Équipe Edutopia', 'Fondateurs',
   'Plateforme e-learning tunisienne dédiée aux lycéens et collégiens.',
   'ED', 'from-bordeaux', 'to-bordeaux-deep', 1, 1)
ON DUPLICATE KEY UPDATE is_active = 1;

-- =============================================================
--  Done. Test accounts:
--    admin@edutopia.tn      password: Admin@1234
--    teacher@edutopia.tn    password: Test@1234
--    student@edutopia.tn    password: Test@1234
--    parent@edutopia.tn     password: Test@1234
--    commercial@edutopia.tn password: Test@1234
-- =============================================================
