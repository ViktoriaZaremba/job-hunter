-- ============================================================
-- Fix companies visibility model.
--
-- Problem: we assigned all companies to vika241020, so other users
-- can't see them in scraper (scope=scraper checks user_id IS NULL).
--
-- Solution: add is_global flag. Global companies are visible to everyone
-- in the scraper, but only to their creator on the Companies page.
--
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

-- 1) Add is_global column
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- 2) Mark all existing companies (owned by vika241020) as global
UPDATE companies
SET is_global = true
WHERE user_id = 'b0e31c9b-28a7-4a1c-9a76-060ed98110bf';

-- 3) Verify
SELECT is_global, user_id IS NOT NULL AS has_owner, COUNT(*)
FROM companies
GROUP BY is_global, has_owner;
-- Expected: is_global=true, has_owner=true, count = all existing
