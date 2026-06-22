-- ==========================================
-- Pipeline Board Migration WITH DATA PRESERVATION
-- ==========================================
-- This script migrates existing applications to new structure

-- Step 1: Add new columns to existing table
ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'To-do',
  ADD COLUMN IF NOT EXISTS current_stage_status TEXT,
  ADD COLUMN IF NOT EXISTS resume_status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS hr_interview_status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS technical_interview_status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS final_interview_status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS offer_status TEXT,
  ADD COLUMN IF NOT EXISTS rejected_stage TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS hr_name TEXT,
  ADD COLUMN IF NOT EXISTS communication_channel TEXT,
  ADD COLUMN IF NOT EXISTS contact_details TEXT,
  ADD COLUMN IF NOT EXISTS salary TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS business_days_since_contact INTEGER;

-- Step 2: Migrate existing data to new fields
UPDATE applications SET
  notes = COALESCE(comments, ''),
  current_stage = 'To-do',
  resume_status = 'Not Started',
  hr_interview_status = 'Not Started',
  technical_interview_status = 'Not Started',
  final_interview_status = 'Not Started',
  last_contact_date = COALESCE(applied_date::date, CURRENT_DATE)
WHERE current_stage IS NULL;

-- Step 3: Drop old columns (optional - comment out if you want to keep them)
-- ALTER TABLE applications DROP COLUMN IF EXISTS status;
-- ALTER TABLE applications DROP COLUMN IF EXISTS applied_date;
-- ALTER TABLE applications DROP COLUMN IF EXISTS resume_status_old;
-- ALTER TABLE applications DROP COLUMN IF EXISTS ai_screening;
-- ALTER TABLE applications DROP COLUMN IF EXISTS hr_interview;
-- ALTER TABLE applications DROP COLUMN IF EXISTS test_task;
-- ALTER TABLE applications DROP COLUMN IF EXISTS technical_interview;
-- ALTER TABLE applications DROP COLUMN IF EXISTS final_interview;
-- ALTER TABLE applications DROP COLUMN IF EXISTS comments;
-- ALTER TABLE applications DROP COLUMN IF EXISTS hr_contacts;

-- Step 4: Add constraints
ALTER TABLE applications 
  DROP CONSTRAINT IF EXISTS applications_current_stage_check;

ALTER TABLE applications 
  ADD CONSTRAINT applications_current_stage_check 
  CHECK (current_stage IN ('To-do', 'Resume', 'HR Interview', 'Technical Interview', 'Final Interview', 'Rejected', 'Offer'));

ALTER TABLE applications 
  DROP CONSTRAINT IF EXISTS applications_resume_status_check;

ALTER TABLE applications 
  ADD CONSTRAINT applications_resume_status_check 
  CHECK (resume_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected'));

ALTER TABLE applications 
  DROP CONSTRAINT IF EXISTS applications_hr_interview_status_check;

ALTER TABLE applications 
  ADD CONSTRAINT applications_hr_interview_status_check 
  CHECK (hr_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected'));

ALTER TABLE applications 
  DROP CONSTRAINT IF EXISTS applications_technical_interview_status_check;

ALTER TABLE applications 
  ADD CONSTRAINT applications_technical_interview_status_check 
  CHECK (technical_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected'));

ALTER TABLE applications 
  DROP CONSTRAINT IF EXISTS applications_final_interview_status_check;

ALTER TABLE applications 
  ADD CONSTRAINT applications_final_interview_status_check 
  CHECK (final_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected'));

-- Step 5: Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_current_stage ON applications(current_stage);
CREATE INDEX IF NOT EXISTS idx_activity_log_application_id ON activity_log(application_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp DESC);

-- Step 7: Create initial activity log entries for existing applications
INSERT INTO activity_log (application_id, event, details, timestamp)
SELECT 
  id,
  'Application created',
  'Migrated from old schema',
  created_at
FROM applications
WHERE NOT EXISTS (
  SELECT 1 FROM activity_log WHERE activity_log.application_id = applications.id
);

-- Done!
SELECT 'Migration completed successfully!' as status;
