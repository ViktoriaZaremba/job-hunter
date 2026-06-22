-- ============================================================
-- Disable RLS on pipeline config tables.
-- Auth is already enforced at the API layer (NextAuth session).
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_substatuses DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('pipelines', 'pipeline_stages', 'pipeline_substatuses');
