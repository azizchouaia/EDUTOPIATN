ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_code_hash VARCHAR(255) NULL AFTER password_hash,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at DATETIME NULL AFTER password_reset_code_hash,
  ADD COLUMN IF NOT EXISTS password_reset_requested_at DATETIME NULL AFTER password_reset_expires_at;