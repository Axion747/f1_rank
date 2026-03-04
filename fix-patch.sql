-- F1 Rank 2026 — Patch: Fix missing profiles & add FK
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- STEP 1: Create missing profile for your existing account
-- (The app will also auto-create profiles on login now, but this ensures it's there)
INSERT INTO profiles (id, username, display_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1))
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- STEP 2: Add FK from rankings.user_id → profiles.id (enables PostgREST joins)
-- This is safe because Step 1 ensures all users with rankings have profiles
ALTER TABLE rankings
  ADD CONSTRAINT rankings_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- STEP 3 (RECOMMENDED): Disable email confirmation for easier signups
-- Go to: Supabase Dashboard > Authentication > Providers > Email
-- Toggle OFF "Confirm email" (or "Enable email confirmations")
-- This ensures signups work instantly without email verification
