ALTER TABLE subscriptions
  MODIFY COLUMN status ENUM('pending_receipt','pending_approval','pending_code','active','expired','cancelled') NOT NULL DEFAULT 'pending_code',
  ADD COLUMN bank_receipt_path VARCHAR(500) DEFAULT NULL AFTER status,
  ADD COLUMN bank_receipt_original_name VARCHAR(255) DEFAULT NULL AFTER bank_receipt_path,
  ADD COLUMN receipt_uploaded_at DATETIME DEFAULT NULL AFTER bank_receipt_original_name,
  ADD COLUMN approved_by INT UNSIGNED DEFAULT NULL AFTER activation_code_expires_at,
  ADD COLUMN approved_at DATETIME DEFAULT NULL AFTER approved_by;