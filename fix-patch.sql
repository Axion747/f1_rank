-- F1 Rank 2026 — Fix Patch (run these in order, one step at a time)
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ==========================================
-- STEP 1: Create the missing profile first
-- ==========================================
-- Run this FIRST, by itself:

INSERT INTO profiles (id, username, display_name)
VALUES (
  'c5a58d5c-2d0e-4afb-b8ea-0d1dc4aab661',
  'benson',
  'Benson'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STEP 2: Now add the FK constraint
-- ==========================================
-- Run this AFTER Step 1 succeeds:

ALTER TABLE rankings
  ADD CONSTRAINT rankings_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
