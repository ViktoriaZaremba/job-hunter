-- ============================================================
-- Phase 7 cleanup: drop legacy stage columns from `applications`.
--
-- Old data is preserved in `applications_legacy_backup` (created in 002).
-- Run this AFTER Phase 4 migration is verified and Phase 5 frontend is
-- live. After this, `stage_statuses`, `current_stage_id`, and
-- `rejected_at_stage_id` are the only stage-state fields.
--
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

BEGIN;

-- 1) Drop CHECK constraints first (some target columns we're about to drop)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_stage_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_stage_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_hr_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_technical_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_final_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_offer_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_rejected_stage_check;

-- 2) Drop legacy stage columns
ALTER TABLE applications
  DROP COLUMN IF EXISTS current_stage,
  DROP COLUMN IF EXISTS current_stage_status,
  DROP COLUMN IF EXISTS resume_status,
  DROP COLUMN IF EXISTS hr_interview_status,
  DROP COLUMN IF EXISTS technical_interview_status,
  DROP COLUMN IF EXISTS final_interview_status,
  DROP COLUMN IF EXISTS offer_status,
  DROP COLUMN IF EXISTS rejected_stage;

-- 3) Drop legacy required columns inherited from the very first schema
ALTER TABLE applications
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS applied_date,
  DROP COLUMN IF EXISTS comments,
  DROP COLUMN IF EXISTS ai_screening,
  DROP COLUMN IF EXISTS hr_interview,
  DROP COLUMN IF EXISTS test_task,
  DROP COLUMN IF EXISTS technical_interview,
  DROP COLUMN IF EXISTS final_interview,
  DROP COLUMN IF EXISTS hr_contacts;

-- 4) Tighten new model fields
ALTER TABLE applications
  ALTER COLUMN stage_statuses SET NOT NULL,
  ALTER COLUMN current_stage_id SET NOT NULL;

-- 5) Drop business_days_since_contact (computed in code)
ALTER TABLE applications DROP COLUMN IF EXISTS business_days_since_contact;

COMMIT;

-- 6) Verify resulting schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'applications'
ORDER BY ordinal_position;
