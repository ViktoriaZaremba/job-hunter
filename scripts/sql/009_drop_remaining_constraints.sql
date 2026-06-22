-- ============================================================
-- Drop any remaining legacy CHECK constraints that block operations.
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

-- Drop all known legacy constraints that might still exist
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_rejection_reason_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_communication_channel_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_stage_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_stage_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_hr_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_technical_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_final_interview_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_offer_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_rejected_stage_check;

-- List remaining constraints for verification
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'applications'::regclass
  AND contype = 'c';
