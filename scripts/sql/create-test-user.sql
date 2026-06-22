-- ============================================================
-- Create a test user manually.
-- Triggers will auto-seed pipeline + search profile.
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

INSERT INTO users (email, name)
VALUES ('test@jobhunter.local', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- Verify: should see pipeline + search profile seeded automatically
SELECT u.email, p.id AS pipeline_id, sp.name AS profile_name
FROM users u
LEFT JOIN pipelines p ON p.user_id = u.id
LEFT JOIN search_profiles sp ON sp.user_id = u.id
WHERE u.email = 'test@jobhunter.local';
