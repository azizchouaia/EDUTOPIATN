-- Chapter quizzes — gate the next chapter behind a passing score (7/10)

CREATE TABLE IF NOT EXISTS quiz_questions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id    INT NOT NULL,
  question      TEXT NOT NULL,
  options       JSON NOT NULL,            -- array of exactly 4 choice strings
  correct_index TINYINT NOT NULL,         -- 0..3
  explanation   TEXT NULL,
  is_active     TINYINT NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quiz_questions_chapter (chapter_id),
  CONSTRAINT fk_quiz_questions_chapter FOREIGN KEY (chapter_id)
    REFERENCES chapters(id) ON DELETE CASCADE
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
