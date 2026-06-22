-- Fix: activity_log has RLS enabled with no policies → anon key gets 0 rows.
-- Auth is enforced at API layer. Disable RLS.

ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT relname, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'activity_log';
-- Expected: rls_enabled = false
