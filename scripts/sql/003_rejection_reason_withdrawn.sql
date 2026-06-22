-- ============================================================
-- Add "Withdrawn by candidate" to rejection_reason allowed values.
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

-- Drop existing constraint if any
ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_rejection_reason_check;

-- Add new constraint with the additional value
ALTER TABLE applications
  ADD CONSTRAINT applications_rejection_reason_check
  CHECK (
    rejection_reason IS NULL
    OR rejection_reason IN (
      'Found another candidate earlier',
      'Decided to move with another candidate',
      'Country location',
      'Requirement mismatch',
      'Job no longer open',
      'No explanation provided',
      'Withdrawn by candidate',
      'Other'
    )
  );

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'applications_rejection_reason_check';
