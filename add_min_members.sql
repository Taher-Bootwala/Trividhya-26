-- ═══════════════════════════════════════════════════════════
-- TRIVIDHYA'26 — Add min_members column to events table
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS min_members INTEGER DEFAULT 1;
