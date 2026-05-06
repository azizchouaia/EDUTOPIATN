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