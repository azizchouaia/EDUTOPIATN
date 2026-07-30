-- Konnect online payment integration
-- Run this migration before deploying the Konnect payment feature.

-- 1. Add pending_payment to the status ENUM so rows created during
--    Konnect payment initiation (before the webhook fires) have a valid status.
ALTER TABLE subscriptions
  MODIFY COLUMN status ENUM(
    'pending_payment',
    'pending_receipt',
    'pending_approval',
    'pending_code',
    'active',
    'expired',
    'cancelled'
  ) NOT NULL DEFAULT 'pending_code';

-- 2. Store the Konnect paymentRef so the webhook handler can look up
--    the subscription when Konnect calls back.
ALTER TABLE subscriptions
  ADD COLUMN konnect_payment_ref VARCHAR(100) DEFAULT NULL
  AFTER payment_method;
