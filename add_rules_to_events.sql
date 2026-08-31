-- Add rules_text and terms_checkbox_label to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS rules_text TEXT,
ADD COLUMN IF NOT EXISTS terms_checkbox_label TEXT;
