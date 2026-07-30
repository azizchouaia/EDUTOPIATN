-- Migration: teacher_subject_assignments
-- Date: 2026-06-15

-- 1. Table d'assignation teacher <-> matière (track_subject)
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id       INT UNSIGNED NOT NULL,
  track_subject_id INT UNSIGNED NOT NULL,
  assigned_by      INT UNSIGNED NOT NULL,
  assigned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_teacher_subject (teacher_id),        -- une seule matière par teacher
  CONSTRAINT fk_tsa_teacher  FOREIGN KEY (teacher_id)       REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT fk_tsa_ts      FOREIGN KEY (track_subject_id) REFERENCES track_subjects(id)  ON DELETE CASCADE,
  CONSTRAINT fk_tsa_admin    FOREIGN KEY (assigned_by)      REFERENCES users(id)           ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Colonne created_by sur chapters (NULL = créé par admin)
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS created_by INT UNSIGNED NULL DEFAULT NULL,
  ADD CONSTRAINT fk_ch_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
