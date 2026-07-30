-- Phone number on user accounts (collected at signup, reused at market checkout)
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL DEFAULT NULL AFTER email;
