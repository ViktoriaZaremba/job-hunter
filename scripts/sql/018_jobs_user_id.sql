-- ============================================================
-- Add user_id to jobs table so scraped vacancies are isolated
-- per user. Existing rows (if any) will have user_id = NULL
-- and should be cleaned up or backfilled manually.
-- Run in Supabase Studio → SQL Editor. Idempotent.
-- ============================================================

-- 1) Add user_id column (nullable first so existing rows don't break)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- 2) Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- 3) Remove existing rows that have no user_id (they are shared/orphaned)
DELETE FROM jobs WHERE user_id IS NULL;

-- 4) Now make user_id NOT NULL
ALTER TABLE jobs
  ALTER COLUMN user_id SET NOT NULL;

-- 5) The url uniqueness should be per-user, not global.
--    Drop the old global unique constraint on url (if it exists) and
--    replace with a per-user one.
DO $$
BEGIN
  -- Drop old unique index/constraint on url if present
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'jobs' AND indexname = 'jobs_url_key'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_url_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'jobs' AND indexname = 'idx_jobs_url'
  ) THEN
    DROP INDEX idx_jobs_url;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_user_url
  ON jobs(user_id, url);

-- 6) Verification
SELECT COUNT(*) AS total_jobs, COUNT(DISTINCT user_id) AS distinct_users
FROM jobs;
