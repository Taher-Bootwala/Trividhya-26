-- Add game fields to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS in_game_id TEXT,
ADD COLUMN IF NOT EXISTS in_game_uid TEXT;

-- Add game fields for the team leader to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS leader_in_game_id TEXT,
ADD COLUMN IF NOT EXISTS leader_in_game_uid TEXT;
