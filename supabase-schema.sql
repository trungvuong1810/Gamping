-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR CAMPING APP
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Users / Accounts Table
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy login lookup
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- 2. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  host_id TEXT NOT NULL,
  host_email TEXT NOT NULL,
  host_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT NOT NULL,
  park_details JSONB,
  password TEXT,
  password_expires_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_host_id ON trips(host_id);

-- 3. Trip Members
CREATE TABLE IF NOT EXISTS trip_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);

-- 4. Campsite Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site_label TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_trip ON groups(trip_id);

-- 5. Group Memberships
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  email TEXT,
  name TEXT
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- 6. Equipment Checklist Items
CREATE TABLE IF NOT EXISTS equipment_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needed',
  assigned_to JSONB,
  notes TEXT,
  essential BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_trip ON equipment_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_equipment_group ON equipment_items(group_id);

-- 7. Collaborative Food & Meal Items
CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  meal_time TEXT NOT NULL,
  meal_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  ingredients_or_items TEXT,
  day_label TEXT,
  suggested_by JSONB,
  preparers JSONB DEFAULT '[]'::jsonb,
  ingredient_bringers JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_trip ON food_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_food_group ON food_items(group_id);

-- 8. 1-Click Trip Invitations
CREATE TABLE IF NOT EXISTS trip_invitations (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invite_link TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON trip_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON trip_invitations(recipient_email);

-- Enable Row Level Security (RLS) or public access policy as needed
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Allow anon service key access for the backend application
CREATE POLICY "Allow backend access to app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to trip_members" ON trip_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to equipment_items" ON equipment_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to food_items" ON food_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow backend access to trip_invitations" ON trip_invitations FOR ALL USING (true) WITH CHECK (true);
