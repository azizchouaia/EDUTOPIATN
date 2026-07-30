-- In-app notifications (bell menu). Reminders only — no email for these.
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(40) NOT NULL,          -- e.g. 'sub_expiry'
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(400) NULL,
  link       VARCHAR(160) NULL,             -- in-app route to open on click
  dedupe_key VARCHAR(120) NULL,             -- prevents duplicate reminders
  is_read    TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read),
  UNIQUE KEY uq_notif_dedupe (user_id, dedupe_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
