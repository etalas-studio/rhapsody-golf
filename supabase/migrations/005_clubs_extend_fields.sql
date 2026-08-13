-- Extend clubs table: contact info + course info + tee interval
-- Option A: 1 club = 1 course for MVP

-- Contact info
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- Course info
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS facilities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS established_in INTEGER;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS number_of_holes INTEGER NOT NULL DEFAULT 18;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS par INTEGER NOT NULL DEFAULT 72;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS length_yards INTEGER;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS course_rating NUMERIC;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS slope_rating NUMERIC;

-- Tee time config
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS tee_interval_minutes INTEGER NOT NULL DEFAULT 10;

-- Make previously required fields nullable (superadmin creates club with name only)
ALTER TABLE clubs ALTER COLUMN location DROP NOT NULL;
ALTER TABLE clubs ALTER COLUMN region DROP NOT NULL;
ALTER TABLE clubs ALTER COLUMN description DROP NOT NULL;
ALTER TABLE clubs ALTER COLUMN theme_color SET DEFAULT '#0e3b2e';
ALTER TABLE clubs ALTER COLUMN app_type SET DEFAULT 'ClubBranded';
ALTER TABLE clubs ALTER COLUMN starting_price SET DEFAULT 0;
ALTER TABLE clubs ALTER COLUMN cart_policy SET DEFAULT 'optional';
ALTER TABLE clubs ALTER COLUMN caddie_policy SET DEFAULT 'optional';
