-- F1 Rank 2026 — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ===== PROFILES TABLE =====
-- Extends Supabase auth.users with app-specific profile data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  favorite_team TEXT DEFAULT '',
  favorite_driver TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== RANKINGS TABLE =====
CREATE TABLE IF NOT EXISTS rankings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id INTEGER NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 10),
  driver_id INTEGER NOT NULL,
  race_type TEXT NOT NULL DEFAULT 'race' CHECK (race_type IN ('race', 'sprint')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, race_id, position, race_type)
);

-- FK to profiles for PostgREST join support
ALTER TABLE rankings
  ADD CONSTRAINT rankings_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rankings_user_race ON rankings(user_id, race_id);
CREATE INDEX IF NOT EXISTS idx_rankings_race ON rankings(race_id);
CREATE INDEX IF NOT EXISTS idx_rankings_race_type ON rankings(race_id, race_type);

-- ===== ACTUAL RESULTS TABLE =====
CREATE TABLE IF NOT EXISTS actual_results (
  id BIGSERIAL PRIMARY KEY,
  race_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  race_type TEXT NOT NULL DEFAULT 'race' CHECK (race_type IN ('race', 'sprint')),
  UNIQUE(race_id, position, race_type)
);

CREATE INDEX IF NOT EXISTS idx_actual_results_race ON actual_results(race_id);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_results ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update their own
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Rankings: anyone can read, authenticated users can insert/update/delete their own
CREATE POLICY "Rankings are publicly readable"
  ON rankings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own rankings"
  ON rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rankings"
  ON rankings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rankings"
  ON rankings FOR DELETE
  USING (auth.uid() = user_id);

-- Actual results: anyone can read, anyone authenticated can insert (casual app)
CREATE POLICY "Actual results are publicly readable"
  ON actual_results FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert actual results"
  ON actual_results FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update actual results"
  ON actual_results FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete actual results"
  ON actual_results FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== FUNCTION: Handle new user signup =====
-- Automatically creates a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
