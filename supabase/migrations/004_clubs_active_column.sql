-- Add active flag to clubs table
-- Existing clubs default to true (they're all live)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
