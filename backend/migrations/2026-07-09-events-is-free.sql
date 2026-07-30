-- Add is_free flag to events
-- is_free = 1 (default): any logged-in user can participate
-- is_free = 0: only users with an active subscription can participate

ALTER TABLE events
  ADD COLUMN is_free TINYINT(1) NOT NULL DEFAULT 1 AFTER is_cancelled;
