-- ==========================================
-- Pipeline Board Migration Script
-- ==========================================
-- This script updates the applications table to support the new pipeline board structure
-- Run this in Supabase SQL Editor

-- Step 1: Rename old table (backup)
ALTER TABLE applications RENAME TO applications_legacy;

-- Step 2: Create new applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  url TEXT,
  
  -- Current State
  current_stage TEXT NOT NULL DEFAULT 'To-do' 
    CHECK (current_stage IN ('To-do', 'Resume', 'HR Interview', 'Technical Interview', 'Final Interview', 'Rejected', 'Offer')),
  current_stage_status TEXT 
    CHECK (current_stage_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected')),
  
  -- Stage Statuses
  resume_status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (resume_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected')),
  hr_interview_status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (hr_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected')),
  technical_interview_status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (technical_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected')),
  final_interview_status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (final_interview_status IN ('Not Started', 'Scheduled / Sent', 'Waiting', 'Passed', 'Rejected')),
  
  -- Offer
  offer_status TEXT 
    CHECK (offer_status IN ('Pending', 'Accepted', 'Declined')),
  
  -- Rejection Info
  rejected_stage TEXT 
    CHECK (rejected_stage IN ('Resume', 'HR Interview', 'Technical Interview', 'Final Interview')),
  rejection_reason TEXT 
    CHECK (rejection_reason IN ('Found another candidate earlier', 'Decided to move with another candidate', 'Country location', 'Requirement mismatch', 'Job no longer open', 'No explanation provided', 'Other')),
  rejection_comment TEXT,
  
  -- Contact Info
  hr_name TEXT,
  communication_channel TEXT 
    CHECK (communication_channel IN ('Email', 'Telegram', 'LinkedIn', 'WhatsApp', 'Other')),
  contact_details TEXT,
  
  -- Compensation
  salary TEXT,
  conditions TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Dates
  last_contact_date DATE,
  business_days_since_contact INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create activity_log table
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_current_stage ON applications(current_stage);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_activity_log_application_id ON activity_log(application_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies (temporarily disabled for development)
-- You can enable these in production by uncommenting:

-- CREATE POLICY "Users can view own applications" ON applications
--   FOR SELECT USING (auth.uid() = user_id);
  
-- CREATE POLICY "Users can create own applications" ON applications
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
  
-- CREATE POLICY "Users can update own applications" ON applications
--   FOR UPDATE USING (auth.uid() = user_id);
  
-- CREATE POLICY "Users can delete own applications" ON applications
--   FOR DELETE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can view own activity logs" ON activity_log
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM applications 
--       WHERE applications.id = activity_log.application_id 
--       AND applications.user_id = auth.uid()
--     )
--   );

-- ==========================================
-- MIGRATION NOTES
-- ==========================================
-- 
-- This script creates new tables and renames the old one to applications_legacy
-- Old data is preserved and can be migrated using a separate migration script
-- 
-- To migrate existing data, you'll need to:
-- 1. Map old statuses to new pipeline stages
-- 2. Create activity log entries for existing applications
-- 3. Calculate business_days_since_contact if needed
-- 
-- For now, the old data remains in applications_legacy table
-- ==========================================
