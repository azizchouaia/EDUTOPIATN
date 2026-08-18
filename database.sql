-- =============================================================
--  Edutopia Academy — Database Schema
--  Database: edutopiav2
--  Run this file once to create all tables
-- =============================================================

CREATE DATABASE IF NOT EXISTS edutopiav2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edutopiav2;

-- -------------------------------------------------------------
-- 1. USERS
--    Roles: admin | teacher | student | parent
--    Year of study follows the Tunisian education system:
--      Middle school : 7ème, 8ème, 9ème
--      High school   : 1ère secondaire, 2ème secondaire,
--                      3ème secondaire, 4ème secondaire (Bac)
--      University    : Licence 1, Licence 2, Licence 3,
--                      Master 1, Master 2, Doctorat
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  age           TINYINT UNSIGNED,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_reset_code_hash VARCHAR(255),
  password_reset_expires_at DATETIME,
  password_reset_requested_at DATETIME,
  role          ENUM('admin','teacher','student','parent','commercial') NOT NULL DEFAULT 'student',
  college       VARCHAR(200)                              COMMENT 'Name of the school / university',
  year_of_study VARCHAR(60)                               COMMENT 'Tunisian system: 7ème / 1ère secondaire / Licence 1 …',
  school_cycle  ENUM('college','lycee')                   COMMENT 'Structured school cycle used for curriculum filtering',
  grade_code    VARCHAR(20)                               COMMENT 'Structured class code: 7eme / 1ere / bac ...',
  section_code  VARCHAR(20)                               COMMENT 'Section for lycee tracks: math / science / info ...',
  avatar_url    VARCHAR(500),
  user_code     VARCHAR(20)  NULL DEFAULT NULL UNIQUE,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_student_links (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id     INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  relation_type ENUM('parent','mother','father','guardian') NOT NULL DEFAULT 'parent',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  CONSTRAINT fk_parent_student_links_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_links_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. COURSES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200)    NOT NULL,
  description    TEXT,
  teacher_id     INT UNSIGNED    NOT NULL,
  category       VARCHAR(100),
  price          DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
  duration_hours DECIMAL(5, 1)   DEFAULT 0,
  lessons_count  SMALLINT UNSIGNED DEFAULT 0,
  cover_image    VARCHAR(500),
  is_published   TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_chapters (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id     INT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) NOT NULL,
  description   TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_chapter_slug (course_id, slug),
  CONSTRAINT fk_course_chapters_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_resources (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapter_id       INT UNSIGNED NOT NULL,
  resource_type    ENUM('pdf_lesson','video_lesson','exercise_sheet','correction_sheet','extra_resource') NOT NULL DEFAULT 'extra_resource',
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  file_url         VARCHAR(500),
  external_url     VARCHAR(500),
  duration_minutes SMALLINT UNSIGNED DEFAULT NULL,
  display_order    INT NOT NULL DEFAULT 0,
  is_published     TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_resources_chapter FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2B. ACADEMIC CURRICULUM
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_tracks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_cycle  ENUM('college','lycee') NOT NULL,
  grade_code    VARCHAR(20) NOT NULL,
  section_code  VARCHAR(20) DEFAULT NULL,
  slug          VARCHAR(80) NOT NULL UNIQUE,
  title         VARCHAR(120) NOT NULL,
  description   TEXT,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  icon        VARCHAR(60),
  color       VARCHAR(30),
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS track_subjects (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  academic_track_id INT UNSIGNED NOT NULL,
  subject_id        INT UNSIGNED NOT NULL,
  description       TEXT,
  cover_image       VARCHAR(500),
  display_order     INT NOT NULL DEFAULT 0,
  is_published      TINYINT(1) NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_track_subject (academic_track_id, subject_id),
  CONSTRAINT fk_track_subject_track FOREIGN KEY (academic_track_id) REFERENCES academic_tracks(id) ON DELETE CASCADE,
  CONSTRAINT fk_track_subject_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chapters (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  track_subject_id INT UNSIGNED NOT NULL,
  title            VARCHAR(200) NOT NULL,
  slug             VARCHAR(200) NOT NULL,
  description      TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  is_published     TINYINT(1) NOT NULL DEFAULT 1,
  created_by       INT UNSIGNED NULL DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_track_subject_chapter (track_subject_id, slug),
  CONSTRAINT fk_chapter_track_subject FOREIGN KEY (track_subject_id) REFERENCES track_subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ch_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chapter_resources (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapter_id       INT UNSIGNED NOT NULL,
  resource_type    ENUM('pdf_lesson','video_lesson','exercise_sheet','correction_sheet','extra_resource') NOT NULL DEFAULT 'extra_resource',
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  file_url         VARCHAR(500),
  external_url     VARCHAR(500),
  duration_minutes SMALLINT UNSIGNED DEFAULT NULL,
  display_order    INT NOT NULL DEFAULT 0,
  is_published     TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resource_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO academic_tracks (
  school_cycle,
  grade_code,
  section_code,
  slug,
  title,
  description,
  is_active,
  display_order
) VALUES
  ('college', '7eme', NULL, 'college-7eme', '7eme', 'College 7eme curriculum', 1, 10),
  ('college', '8eme', NULL, 'college-8eme', '8eme', 'College 8eme curriculum', 1, 20),
  ('college', '9eme', NULL, 'college-9eme', '9eme', 'College 9eme curriculum', 1, 30),
  ('lycee', '1ere', NULL, 'lycee-1ere', '1ere lycee', 'Lycee 1ere curriculum', 1, 40),
  ('lycee', '2eme', 'science', 'lycee-2eme-science', '2eme science', 'Lycee 2eme section science', 1, 50),
  ('lycee', '2eme', 'math', 'lycee-2eme-math', '2eme math', 'Lycee 2eme section math', 1, 60),
  ('lycee', '2eme', 'technique', 'lycee-2eme-technique', '2eme technique', 'Lycee 2eme section technique', 1, 70),
  ('lycee', '2eme', 'info', 'lycee-2eme-info', '2eme info', 'Lycee 2eme section info', 1, 80),
  ('lycee', '2eme', 'eco', 'lycee-2eme-eco', '2eme eco', 'Lycee 2eme section eco', 1, 90),
  ('lycee', '3eme', 'science', 'lycee-3eme-science', '3eme science', 'Lycee 3eme section science', 1, 100),
  ('lycee', '3eme', 'math', 'lycee-3eme-math', '3eme math', 'Lycee 3eme section math', 1, 110),
  ('lycee', '3eme', 'technique', 'lycee-3eme-technique', '3eme technique', 'Lycee 3eme section technique', 1, 120),
  ('lycee', '3eme', 'info', 'lycee-3eme-info', '3eme info', 'Lycee 3eme section info', 1, 130),
  ('lycee', '3eme', 'eco', 'lycee-3eme-eco', '3eme eco', 'Lycee 3eme section eco', 1, 140),
  ('lycee', 'bac', 'science', 'lycee-bac-science', 'Bac science', 'Lycee bac section science', 1, 150),
  ('lycee', 'bac', 'math', 'lycee-bac-math', 'Bac math', 'Lycee bac section math', 1, 160),
  ('lycee', 'bac', 'technique', 'lycee-bac-technique', 'Bac technique', 'Lycee bac section technique', 1, 170),
  ('lycee', 'bac', 'info', 'lycee-bac-info', 'Bac info', 'Lycee bac section info', 1, 180),
  ('lycee', 'bac', 'eco', 'lycee-bac-eco', 'Bac eco', 'Lycee bac section eco', 1, 190)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  is_active = VALUES(is_active),
  display_order = VALUES(display_order);

-- -------------------------------------------------------------
-- 3. STUDENT RESOURCE PROGRESS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_resource_progress (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id  INT UNSIGNED NOT NULL,
  resource_id INT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_resource (student_id, resource_id),
  CONSTRAINT fk_srp_student  FOREIGN KEY (student_id)  REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_srp_resource FOREIGN KEY (resource_id) REFERENCES chapter_resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. ENROLLMENTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id   INT UNSIGNED    NOT NULL,
  course_id    INT UNSIGNED    NOT NULL,
  progress     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Percentage 0-100',
  completed    TINYINT(1)      NOT NULL DEFAULT 0,
  enrolled_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollment (student_id, course_id),
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_course  FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. EVENTS (live sessions / webinars)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200)   NOT NULL,
  description  TEXT,
  host_id      INT UNSIGNED   NOT NULL,
  category     VARCHAR(100),
  delivery_type ENUM('google_meet','video') NOT NULL DEFAULT 'google_meet',
  access_url   VARCHAR(500),
  event_date   DATETIME       NOT NULL,
  seats_total  SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  seats_taken  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_cancelled TINYINT(1)     NOT NULL DEFAULT 0,
  is_free      TINYINT(1)     NOT NULL DEFAULT 1,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. EVENT REGISTRATIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_registrations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  event_id        INT UNSIGNED NOT NULL,
  registered_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_reg (user_id, event_id),
  CONSTRAINT fk_ereg_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ereg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 6. PRODUCTS (marketplace)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)   NOT NULL,
  description TEXT,
  price       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  category    VARCHAR(100),
  tag         ENUM('none','bestseller','new','limited','promo') NOT NULL DEFAULT 'none',
  stock       INT UNSIGNED   NOT NULL DEFAULT 0,
  image_url   VARCHAR(500),
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. PROMO CODES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(50)    NOT NULL UNIQUE,
  discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0–100',
  product_id       INT UNSIGNED   DEFAULT NULL,
  max_uses         INT UNSIGNED   DEFAULT NULL COMMENT 'NULL = unlimited',
  used_count       INT UNSIGNED   NOT NULL DEFAULT 0,
  expires_at       DATETIME       DEFAULT NULL,
  is_active        TINYINT(1)     NOT NULL DEFAULT 1,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. ORDERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED   NOT NULL,
  promo_code_id INT UNSIGNED   DEFAULT NULL,
  total_amount  DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('cash_on_delivery','card','bank_transfer') NOT NULL DEFAULT 'cash_on_delivery',
  delivery_full_name VARCHAR(120) DEFAULT NULL,
  delivery_phone VARCHAR(40) DEFAULT NULL,
  delivery_address VARCHAR(255) DEFAULT NULL,
  delivery_city VARCHAR(120) DEFAULT NULL,
  delivery_postal_code VARCHAR(30) DEFAULT NULL,
  delivery_notes TEXT,
  status        ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_orders_promo FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. ORDER ITEMS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED   NOT NULL,
  product_id INT UNSIGNED   NOT NULL,
  quantity   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 10. SUBSCRIPTIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  plan       ENUM('basic','premium','enterprise') NOT NULL DEFAULT 'basic',
  billing_cycle ENUM('1_month','3_months','1_year') NOT NULL DEFAULT '1_month',
  price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payment_method ENUM('online','bank_transfer') NOT NULL DEFAULT 'online',
  konnect_payment_ref VARCHAR(100) DEFAULT NULL,
  status     ENUM('pending_payment','pending_receipt','pending_approval','pending_code','active','expired','cancelled') NOT NULL DEFAULT 'pending_code',
  bank_receipt_path VARCHAR(500) DEFAULT NULL,
  bank_receipt_original_name VARCHAR(255) DEFAULT NULL,
  receipt_uploaded_at DATETIME DEFAULT NULL,
  activation_code_hash VARCHAR(255) DEFAULT NULL,
  activation_code_preview VARCHAR(32) DEFAULT NULL,
  activation_code_expires_at DATETIME DEFAULT NULL,
  activation_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  approved_by INT UNSIGNED DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  activated_at DATETIME DEFAULT NULL,
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 11. SUBSCRIPTION PLANS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug             ENUM('basic','premium','enterprise') NOT NULL UNIQUE,
  title            VARCHAR(255) NOT NULL,
  title_arabic     VARCHAR(255) DEFAULT NULL,
  description      TEXT,
  features_json    JSON NOT NULL,
  features_arabic_json JSON DEFAULT NULL,
  monthly_price    DECIMAL(10, 2) NOT NULL,
  quarterly_price  DECIMAL(10, 2) NOT NULL,
  yearly_price     DECIMAL(10, 2) NOT NULL,
  is_popular       TINYINT(1) NOT NULL DEFAULT 0,
  is_recommended   TINYINT(1) NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  display_order    INT NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO subscription_plans (
  slug,
  title,
  title_arabic,
  description,
  features_json,
  features_arabic_json,
  monthly_price,
  quarterly_price,
  yearly_price,
  is_popular,
  is_recommended,
  is_active,
  display_order
) VALUES
  (
    'basic',
    'Basic',
    'الأساسي',
    'A light plan for learners who want the essentials.',
    JSON_ARRAY('Access to 50+ courses', 'Basic quizzes', 'Email support'),
    JSON_ARRAY('الوصول إلى أكثر من 50 دورة', 'اختبارات أساسية', 'دعم عبر البريد الإلكتروني'),
    9.00,
    24.00,
    84.00,
    0,
    1,
    1,
    1
  ),
  (
    'premium',
    'Premium',
    'بريميوم',
    'The main plan for active students who want the full learning experience.',
    JSON_ARRAY('Unlimited courses', 'All tests + corrections', 'Live sessions', 'Priority support'),
    JSON_ARRAY('دورات غير محدودة', 'كل الاختبارات مع التصحيح', 'جلسات مباشرة', 'دعم ذو أولوية'),
    29.00,
    78.00,
    290.00,
    1,
    1,
    1,
    2
  ),
  (
    'enterprise',
    'Pro Annual',
    'احترافي سنوي',
    'High-touch support, mentoring, and premium benefits for committed learners.',
    JSON_ARRAY('Everything in Premium', 'Mentor 1-on-1', 'Certificates', 'Exclusive market discounts'),
    JSON_ARRAY('كل ما في بريميوم', 'مرافقة فردية', 'شهادات', 'خصومات حصرية على المتجر'),
    49.00,
    132.00,
    490.00,
    0,
    0,
    1,
    3
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  title_arabic = VALUES(title_arabic),
  description = VALUES(description),
  features_json = VALUES(features_json),
  features_arabic_json = VALUES(features_arabic_json),
  monthly_price = VALUES(monthly_price),
  quarterly_price = VALUES(quarterly_price),
  yearly_price = VALUES(yearly_price),
  is_popular = VALUES(is_popular),
  is_recommended = VALUES(is_recommended),
  is_active = VALUES(is_active),
  display_order = VALUES(display_order);

-- -------------------------------------------------------------
-- 12. TEAM MEMBERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(120) NOT NULL,
  bio           TEXT,
  initials      VARCHAR(10),
  gradient_from VARCHAR(60) NOT NULL DEFAULT 'from-bordeaux',
  gradient_to   VARCHAR(60) NOT NULL DEFAULT 'to-bordeaux-deep',
  linkedin_url  VARCHAR(500),
  github_url    VARCHAR(500),
  email         VARCHAR(150),
  display_order INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 13. RECLAMATIONS (support tickets)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reclamations (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  subject    VARCHAR(200) NOT NULL,
  category   VARCHAR(100),
  message    TEXT         NOT NULL,
  status     ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 14. TEACHER SUBJECT ASSIGNMENTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id       INT UNSIGNED NOT NULL,
  track_subject_id INT UNSIGNED NOT NULL,
  assigned_by      INT UNSIGNED NOT NULL,
  assigned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_teacher_subject (teacher_id),
  CONSTRAINT fk_tsa_teacher FOREIGN KEY (teacher_id)       REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_tsa_ts      FOREIGN KEY (track_subject_id) REFERENCES track_subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tsa_admin   FOREIGN KEY (assigned_by)      REFERENCES users(id)          ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 15. KHLAYEL AI
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  mode       ENUM('tutor','corrector','resume','exercice') NOT NULL DEFAULT 'tutor',
  title      VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_aicon_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  role            ENUM('user','assistant') NOT NULL,
  content         TEXT NOT NULL,
  graph_spec      JSON DEFAULT NULL,
  feedback        ENUM('up','down') NULL DEFAULT NULL,
  model           VARCHAR(64) NULL DEFAULT NULL,
  prompt_tokens   INT NULL DEFAULT NULL,
  completion_tokens INT NULL DEFAULT NULL,
  hint_level      TINYINT UNSIGNED DEFAULT NULL,
  tokens_used     INT UNSIGNED DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aimsg_conv FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_hint_state (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  exercise_key  VARCHAR(64) NOT NULL,
  sub_question  VARCHAR(20) NOT NULL DEFAULT 'main',
  current_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  reached_l5    TINYINT(1) NOT NULL DEFAULT 0,
  started_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hint_state (user_id, exercise_key, sub_question),
  CONSTRAINT fk_hint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS curriculum (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  level         ENUM('1s','2sc','2t','2eg','2l','3m','3sc','3t','3eg','3info','4m','4sc','4t','4eg','4info') NOT NULL,
  chapter_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  chapter_name  VARCHAR(255) NOT NULL,
  notions       JSON NOT NULL,
  prerequisites JSON DEFAULT NULL,
  hors_programme JSON DEFAULT NULL,
  trimester     TINYINT UNSIGNED DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS misconception_taxonomy (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  curriculum_id     INT UNSIGNED NOT NULL,
  code              VARCHAR(60) NOT NULL,
  description       TEXT NOT NULL,
  detection_pattern TEXT DEFAULT NULL,
  remediation_hint  TEXT DEFAULT NULL,
  UNIQUE KEY uq_misconception (curriculum_id, code),
  CONSTRAINT fk_misc_curriculum FOREIGN KEY (curriculum_id) REFERENCES curriculum(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bac_exercises (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_url      VARCHAR(500) NOT NULL,
  source_label    VARCHAR(200) NOT NULL,
  year            SMALLINT UNSIGNED NOT NULL,
  session         ENUM('principale','controle') NOT NULL,
  section         VARCHAR(30) NOT NULL,
  exercise_number TINYINT UNSIGNED NOT NULL DEFAULT 1,
  statement_text  LONGTEXT NOT NULL,
  correction_text LONGTEXT DEFAULT NULL,
  notions_tags    JSON DEFAULT NULL,
  difficulty      TINYINT UNSIGNED DEFAULT NULL,
  is_verified     TINYINT(1) NOT NULL DEFAULT 0,
  embedding_id    VARCHAR(100) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bac_year_section (year, section),
  INDEX idx_bac_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 16. CHAPTER QUIZZES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id    INT NOT NULL,
  question      TEXT NOT NULL,
  options       JSON NOT NULL,
  correct_index TINYINT NOT NULL,
  explanation   TEXT NULL,
  is_active     TINYINT NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quiz_questions_chapter (chapter_id),
  CONSTRAINT fk_quiz_questions_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  chapter_id INT NOT NULL,
  score      INT NOT NULL,
  total      INT NOT NULL,
  passed     TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quiz_attempts_user_chapter (user_id, chapter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 17. NOTIFICATIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(400) NULL,
  link       VARCHAR(160) NULL,
  dedupe_key VARCHAR(120) NULL,
  is_read    TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read),
  UNIQUE KEY uq_notif_dedupe (user_id, dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  Default admin account
--  Password: Admin@1234  (bcrypt hash — change after first login)
-- =============================================================
INSERT INTO users (first_name, last_name, age, email, password_hash, role, college, year_of_study)
VALUES (
  'Super', 'Admin', NULL,
  'admin@edutopia.tn',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhuG',
  'admin', NULL, NULL
);
