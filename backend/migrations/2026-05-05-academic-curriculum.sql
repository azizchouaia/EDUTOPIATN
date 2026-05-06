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
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_track_subject_chapter (track_subject_id, slug),
  CONSTRAINT fk_chapter_track_subject FOREIGN KEY (track_subject_id) REFERENCES track_subjects(id) ON DELETE CASCADE
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