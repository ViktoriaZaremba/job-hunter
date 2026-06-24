-- ============================================================
-- Add 'source' column to jobs table for multi-source scraping.
-- Values: 'company', 'dou', 'djinni' (future).
-- Existing rows default to 'company'.
-- Run in Supabase Studio → SQL Editor. Idempotent.
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'company';

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

-- Verify
SELECT source, COUNT(*) AS cnt
FROM jobs
GROUP BY source;
-- Expected: all existing rows have source='company'
