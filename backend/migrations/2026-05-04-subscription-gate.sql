ALTER TABLE subscriptions
  MODIFY COLUMN status ENUM('pending_code','active','expired','cancelled') NOT NULL DEFAULT 'pending_code',
  ADD COLUMN payment_method ENUM('online','bank_transfer') NOT NULL DEFAULT 'online' AFTER price_paid,
  ADD COLUMN activation_code_hash VARCHAR(255) DEFAULT NULL AFTER status,
  ADD COLUMN activation_code_preview VARCHAR(32) DEFAULT NULL AFTER activation_code_hash,
  ADD COLUMN activation_code_expires_at DATETIME DEFAULT NULL AFTER activation_code_preview,
  ADD COLUMN activated_at DATETIME DEFAULT NULL AFTER activation_code_expires_at;