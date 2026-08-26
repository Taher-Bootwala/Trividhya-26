-- ═══════════════════════════════════════════════════════════
-- TRIVIDHYA'26 — Fix Registration Payment Status Check Constraint
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1) Drop old restrictive constraint
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

-- 2) Add updated constraint allowing 'pending', 'paid', 'cancelled', and 'deleted'
ALTER TABLE registrations ADD CONSTRAINT registrations_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'deleted'));
