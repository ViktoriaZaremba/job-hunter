-- ============================================================
-- Add followup_dismissed_at to applications.
-- When set, suppresses the "follow up" alert for this card
-- until last_contact_date changes (new activity resets it).
-- Run in Supabase Studio → SQL Editor.
-- ============================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS followup_dismissed_at timestamptz;
