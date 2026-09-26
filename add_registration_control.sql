-- ═══════════════════════════════════════════════════════════
-- TRIVIDHYA'26 — Registration Control & Closure Schema Update
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_closed_games BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_closed_events BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_closed_combos BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_close_time TIMESTAMPTZ;
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_message TEXT;
ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS reg_settings JSONB;
