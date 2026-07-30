-- Track failed activation-code attempts to allow lockout after repeated wrong guesses.
ALTER TABLE subscriptions
  ADD COLUMN activation_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER activation_code_expires_at;
