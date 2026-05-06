ALTER TABLE events
  ADD COLUMN delivery_type ENUM('google_meet','video') NOT NULL DEFAULT 'google_meet' AFTER category,
  ADD COLUMN access_url VARCHAR(500) NULL AFTER delivery_type;

UPDATE events
SET delivery_type = 'google_meet'
WHERE delivery_type IS NULL;