-- ============================================================
-- Khlayel AI Math Agent — DB Migration
-- Run: mysql -u root -p edutopiav2 < migrations/2026-07-11-khlayel-ai.sql
-- ============================================================

-- ── 1. AI Conversations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED    NOT NULL,
  mode         ENUM('tutor','corrector','resume','exercice') NOT NULL DEFAULT 'tutor',
  title        VARCHAR(255)    DEFAULT NULL,   -- auto-generated from first message
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_aicon_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. AI Messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED    NOT NULL,
  role            ENUM('user','assistant') NOT NULL,
  content         TEXT            NOT NULL,
  -- structured extras returned by the AI (graph spec, hint level, etc.)
  graph_spec      JSON            DEFAULT NULL,
  hint_level      TINYINT UNSIGNED DEFAULT NULL,  -- 1-5, set on assistant messages
  tokens_used     INT UNSIGNED    DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aimsg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Hint State (server-side, per student + exercise) ──────
-- Stores current hint level per (student, exercise identifier)
-- exercise_key is a normalized hash of the exercise statement
CREATE TABLE IF NOT EXISTS ai_hint_state (
  id              INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED    NOT NULL,
  exercise_key    VARCHAR(64)     NOT NULL,   -- SHA256 of normalized statement
  sub_question    VARCHAR(20)     NOT NULL DEFAULT 'main',  -- '1a', '1b', '2', etc.
  current_level   TINYINT UNSIGNED NOT NULL DEFAULT 1,      -- 1-5
  attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  reached_l5      TINYINT(1)      NOT NULL DEFAULT 0,
  started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hint_state (user_id, exercise_key, sub_question),
  CONSTRAINT fk_hint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Curriculum Table ──────────────────────────────────────
-- Encodes the Tunisian programmes officiels per level + section
CREATE TABLE IF NOT EXISTS curriculum (
  id                INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  level             ENUM('1s','2sc','2t','2eg','2l','3m','3sc','3t','3eg','3info','4m','4sc','4t','4eg','4info') NOT NULL,
  chapter_order     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  chapter_name      VARCHAR(255)    NOT NULL,
  notions           JSON            NOT NULL,   -- array of notion strings
  prerequisites     JSON            DEFAULT NULL,  -- chapter_ids that must come first
  hors_programme    JSON            DEFAULT NULL,  -- notions NOT in this level/section
  trimester         TINYINT UNSIGNED DEFAULT NULL, -- 1, 2, or 3
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Misconception Taxonomy ────────────────────────────────
-- Controlled vocabulary of common student mistakes per chapter
CREATE TABLE IF NOT EXISTS misconception_taxonomy (
  id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  curriculum_id       INT UNSIGNED    NOT NULL,
  code                VARCHAR(60)     NOT NULL,   -- e.g. SIGN_ERROR_DERIVATIVE
  description         TEXT            NOT NULL,
  detection_pattern   TEXT            DEFAULT NULL,  -- hint for Mem0 extraction
  remediation_hint    TEXT            DEFAULT NULL,  -- what to tell the student
  UNIQUE KEY uq_misconception (curriculum_id, code),
  CONSTRAINT fk_misc_curriculum FOREIGN KEY (curriculum_id) REFERENCES curriculum(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. BAC Exercises cache ───────────────────────────────────
-- Stores ingested bac exercises from scraped PDFs
CREATE TABLE IF NOT EXISTS bac_exercises (
  id                INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  source_url        VARCHAR(500)    NOT NULL,
  source_label      VARCHAR(200)    NOT NULL,  -- e.g. "Bac Sciences 2023 - Session principale"
  year              SMALLINT UNSIGNED NOT NULL,
  session           ENUM('principale','controle') NOT NULL,
  section           VARCHAR(30)     NOT NULL,  -- 'math','sciences_ex','sciences_tech', etc.
  exercise_number   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  statement_text    LONGTEXT        NOT NULL,
  correction_text   LONGTEXT        DEFAULT NULL,
  notions_tags      JSON            DEFAULT NULL,  -- extracted topic tags
  difficulty        TINYINT UNSIGNED DEFAULT NULL,  -- 1-5
  is_verified       TINYINT(1)      NOT NULL DEFAULT 0,  -- SymPy verified
  embedding_id      VARCHAR(100)    DEFAULT NULL,  -- vector DB reference
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bac_year_section (year, section),
  INDEX idx_bac_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. Seed basic 3ème Sciences curriculum ───────────────────
-- This is the v1 target section. Expand other sections later.
INSERT INTO curriculum (level, chapter_order, chapter_name, notions, trimester) VALUES
('3sc', 1, 'Suites numériques',
  '["suites arithmétiques","suites géométriques","limite d\'une suite","suite monotone","raisonnement par récurrence"]',
  1),
('3sc', 2, 'Fonctions — Généralités et limites',
  '["limite finie en un point","limite infinie","limite à l\'infini","opérations sur les limites","limites trigonométriques","asymptotes"]',
  1),
('3sc', 3, 'Continuité et dérivabilité',
  '["continuité en un point","continuité sur un intervalle","théorème des valeurs intermédiaires","dérivabilité","dérivée d\'une somme produit quotient","dérivée composée","tableau de variation"]',
  1),
('3sc', 4, 'Fonctions logarithme et exponentielle',
  '["logarithme népérien","propriétés de ln","dérivée de ln","fonction exponentielle","propriétés de exp","dérivée de exp","équations et inéquations"]',
  2),
('3sc', 5, 'Fonctions trigonométriques',
  '["cosinus sinus tangente","formules d\'addition","dérivées des fonctions trigonométriques","équations trigonométriques"]',
  2),
('3sc', 6, 'Calcul intégral',
  '["primitive","intégrale définie","propriétés de l\'intégrale","intégration par parties","calcul d\'aire"]',
  2),
('3sc', 7, 'Nombres complexes',
  '["forme algébrique","module et argument","forme trigonométrique","forme exponentielle","interprétation géométrique","résolution d\'équations dans ℂ"]',
  3),
('3sc', 8, 'Probabilités',
  '["probabilité conditionnelle","indépendance","loi binomiale","espérance","variance","écart type"]',
  3),
('3sc', 9, 'Géométrie dans l\'espace',
  '["droites et plans","parallélisme","perpendicularité","produit scalaire dans l\'espace","représentation paramétrique"]',
  3);

-- Seed a few common misconceptions for chapter 3 (Continuité/Dérivabilité)
INSERT INTO misconception_taxonomy (curriculum_id, code, description, detection_pattern, remediation_hint)
SELECT id, 'FORGOT_DOMAINE_DEF',
  'Oubli de préciser le domaine de définition avant d\'étudier les variations',
  'étudier les variations sans mentionner Df',
  'Commence toujours par déterminer Df avant tout tableau de variation.'
FROM curriculum WHERE level='3sc' AND chapter_name LIKE '%Continuité%' LIMIT 1;

INSERT INTO misconception_taxonomy (curriculum_id, code, description, detection_pattern, remediation_hint)
SELECT id, 'SIGN_ERROR_DERIVATIVE',
  'Erreur de signe lors du calcul de la dérivée (quotient ou composée)',
  'signe inversé dans f\'',
  'Pour un quotient (u/v)\' = (u\'v - uv\') / v². Vérifie le signe de chaque terme.'
FROM curriculum WHERE level='3sc' AND chapter_name LIKE '%Continuité%' LIMIT 1;

INSERT INTO misconception_taxonomy (curriculum_id, code, description, detection_pattern, remediation_hint)
SELECT id, 'WRONG_CNS_CS',
  'Confusion entre condition nécessaire et condition suffisante',
  'confond CN et CS',
  'CN = si P alors Q. CS = si Q alors P. CNS = les deux en même temps.'
FROM curriculum WHERE level='3sc' AND chapter_name LIKE '%Continuité%' LIMIT 1;
