ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','teacher','student','parent') NOT NULL DEFAULT 'student';

CREATE TABLE IF NOT EXISTS parent_student_links (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  relation_type ENUM('parent','mother','father','guardian') NOT NULL DEFAULT 'parent',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  CONSTRAINT fk_parent_student_links_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_links_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);