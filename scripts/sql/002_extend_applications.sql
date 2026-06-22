-- ============================================================
-- Phase 2: Extend applications with new stage-state columns
-- ============================================================
-- Adds:
--   stage_statuses        jsonb  — single source of truth
--   current_stage_id      uuid   — denormalized, server-computed
--   rejected_at_stage_id  uuid   — denormalized
-- Plus a backup of legacy stage columns into applications_legacy_backup.
--
-- Run this in Supabase Studio → SQL Editor after 001_create_pipeline_config.sql.
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1) Backup legacy stage columns (snapshot, do NOT drop yet) ---
CREATE TABLE IF NOT EXISTS applications_legacy_backup AS
  SELECT
    id,
    user_id,
    current_stage,
    current_stage_status,
    resume_status,
    hr_interview_status,
    technical_interview_status,
    final_interview_status,
    offer_status,
    rejected_stage,
    status,
    applied_date,
    comments,
    now() AS backed_up_at
  FROM applications
  WHERE 1=0;  -- create empty with same shape on first run

-- Insert any rows that aren't already backed up.
-- (id is unique per application, so we use it as the dedup key.)
INSERT INTO applications_legacy_backup (
  id, user_id,
  current_stage, current_stage_status,
  resume_status, hr_interview_status, technical_interview_status, final_interview_status,
  offer_status, rejected_stage,
  status, applied_date, comments,
  backed_up_at
)
SELECT
  a.id, a.user_id,
  a.current_stage, a.current_stage_status,
  a.resume_status, a.hr_interview_status, a.technical_interview_status, a.final_interview_status,
  a.offer_status, a.rejected_stage,
  a.status, a.applied_date, a.comments,
  now()
FROM applications a
LEFT JOIN applications_legacy_backup b ON b.id = a.id
WHERE b.id IS NULL;

-- Useful index on backup for lookups during verification
CREATE INDEX IF NOT EXISTS idx_applications_legacy_backup_id
  ON applications_legacy_backup(id);


-- 2) Add new columns ------------------------------------------
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS stage_statuses        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_stage_id      uuid,
  ADD COLUMN IF NOT EXISTS rejected_at_stage_id  uuid;

-- FK constraints — added separately so we can re-run idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_current_stage_id_fkey'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_current_stage_id_fkey
      FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_rejected_at_stage_id_fkey'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_rejected_at_stage_id_fkey
      FOREIGN KEY (rejected_at_stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Indexes ---------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_current_stage_id
  ON applications(current_stage_id);

CREATE INDEX IF NOT EXISTS idx_applications_rejected_at_stage_id
  ON applications(rejected_at_stage_id);

CREATE INDEX IF NOT EXISTS idx_applications_stage_statuses
  ON applications USING gin (stage_statuses);

-- 4) Verification ---------------------------------------------
SELECT
  (SELECT COUNT(*) FROM applications)                AS applications_total,
  (SELECT COUNT(*) FROM applications_legacy_backup)  AS backed_up_total,
  (SELECT COUNT(*) FROM applications WHERE stage_statuses = '{}'::jsonb) AS not_yet_migrated;

-- Expected: applications_total = backed_up_total = 39, not_yet_migrated = 39
