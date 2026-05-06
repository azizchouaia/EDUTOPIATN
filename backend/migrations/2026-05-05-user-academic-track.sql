ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school_cycle ENUM('college','lycee') NULL AFTER year_of_study,
  ADD COLUMN IF NOT EXISTS grade_code VARCHAR(20) NULL AFTER school_cycle,
  ADD COLUMN IF NOT EXISTS section_code VARCHAR(20) NULL AFTER grade_code;