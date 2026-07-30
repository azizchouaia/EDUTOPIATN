-- Student resource progress tracking
-- Tracks which chapter_resources each student has marked as completed.

CREATE TABLE IF NOT EXISTS student_resource_progress (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id  INT UNSIGNED NOT NULL,
  resource_id INT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_resource (student_id, resource_id),
  CONSTRAINT fk_srp_student  FOREIGN KEY (student_id)  REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_srp_resource FOREIGN KEY (resource_id) REFERENCES chapter_resources(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
