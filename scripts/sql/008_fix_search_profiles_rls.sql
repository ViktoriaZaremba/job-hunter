-- ============================================================
-- Fix: ensure RLS is disabled on search_profiles.
-- Anon-key client (used by API routes after NextAuth check)
-- was getting 0 rows because Supabase enabled RLS on the new table.
-- ============================================================

ALTER TABLE search_profiles DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT relname, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'search_profiles';
-- Expected: rls_enabled = false
