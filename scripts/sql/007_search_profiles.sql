-- ============================================================
-- Custom Search Profiles
-- ============================================================
-- Adds search_profiles table, matched_keywords on jobs, and seeds
-- a default profile for every existing user. Auto-seed trigger for
-- new users included.
--
-- Run in Supabase Studio → SQL Editor. Idempotent.
-- ============================================================

-- 1) Tables ----------------------------------------------------
CREATE TABLE IF NOT EXISTS search_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  target_keywords     text[] NOT NULL,
  preferred_keywords  text[] NOT NULL DEFAULT '{}',
  excluded_keywords   text[] NOT NULL DEFAULT '{}',
  is_default          boolean NOT NULL DEFAULT false,
  last_used_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Only one default profile per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_profiles_default_per_user
  ON search_profiles(user_id) WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_search_profiles_user_id
  ON search_profiles(user_id);

-- RLS: disabled (auth enforced at API layer, like pipelines)
ALTER TABLE search_profiles DISABLE ROW LEVEL SECURITY;

-- 2) Add matched_keywords to jobs -----------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS matched_keywords text[];


-- 3) Seed function --------------------------------------------
CREATE OR REPLACE FUNCTION seed_default_search_profile(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Skip if user already has any profile
  SELECT id INTO v_id
  FROM search_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO search_profiles (
    user_id, name, target_keywords, preferred_keywords, excluded_keywords, is_default
  ) VALUES (
    p_user_id,
    'Project Manager',
    ARRAY[
      'Project Manager',
      'Delivery Manager',
      'Scrum Master',
      'Program Manager',
      'Project Lead',
      'PM'
    ],
    ARRAY[
      'Remote',
      'AI',
      'GenAI',
      'Healthcare',
      'SaaS',
      '3+ years'
    ],
    ARRAY[
      'Junior',
      'Product',
      'Intern',
      'On-site'
    ],
    true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- 4) Trigger: auto-seed on user insert ------------------------
CREATE OR REPLACE FUNCTION trg_seed_search_profile_on_user_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM seed_default_search_profile(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_seed_search_profile ON users;
CREATE TRIGGER users_seed_search_profile
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trg_seed_search_profile_on_user_insert();


-- 5) Backfill for existing users ------------------------------
DO $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT id FROM users LOOP
    PERFORM seed_default_search_profile(u.id);
  END LOOP;
END $$;


-- 6) Verification ---------------------------------------------
SELECT
  u.email,
  sp.name,
  array_length(sp.target_keywords, 1)    AS target_count,
  array_length(sp.preferred_keywords, 1) AS preferred_count,
  array_length(sp.excluded_keywords, 1)  AS excluded_count,
  sp.is_default
FROM search_profiles sp
JOIN users u ON u.id = sp.user_id
ORDER BY u.email, sp.name;

-- Expected: 1 row per existing user with name='Project Manager',
-- target_count=6, preferred_count=6, excluded_count=4, is_default=true.
