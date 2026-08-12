-- User code: unique readable identifier sent by email on registration
-- Format: STU-EDU-00001 (student), PAR-EDU-00001 (parent), TCH-EDU-00001 (teacher), ADM-EDU-00001 (admin)
ALTER TABLE users
  ADD COLUMN user_code VARCHAR(20) NULL DEFAULT NULL UNIQUE AFTER phone;
