-- ============================================================
-- Convert domain (text) → domains (text[]) for multi-select.
-- Run in Supabase Studio → SQL Editor. Idempotent.
-- ============================================================

-- 1) Add domains array column
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}';

-- 2) Migrate existing domain values into the array
UPDATE companies
SET domains = ARRAY[domain]
WHERE domain IS NOT NULL AND domain != '' AND domains = '{}';

-- 3) Drop old domain column
ALTER TABLE companies
  DROP COLUMN IF EXISTS domain;

-- 4) Verify
SELECT name, domains, company_type
FROM companies
WHERE array_length(domains, 1) > 0
LIMIT 10;
