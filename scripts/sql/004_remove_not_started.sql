-- ============================================================
-- Remove "Not Started" substatus from Resume / HR / Technical / Final
-- and re-index remaining substatuses (Scheduled / Sent → 0, Waiting → 1, Passed → 2).
--
-- "Not Started" in the new model is represented by stage_statuses[X] = null,
-- so the explicit subgroup is redundant.
--
-- Run in Supabase Studio → SQL Editor.
-- Idempotent.
-- ============================================================

-- 1) Delete Not Started rows for the four normal interview stages
DELETE FROM pipeline_substatuses ss
USING pipeline_stages s
WHERE ss.stage_id = s.id
  AND ss.name = 'Not Started'
  AND s.name IN ('Resume', 'HR Interview', 'Technical Interview', 'Final Interview');

-- 2) Re-index remaining substatuses by current name order:
--    Scheduled / Sent → 0, Waiting → 1, Passed → 2
UPDATE pipeline_substatuses ss
SET order_idx = CASE ss.name
  WHEN 'Scheduled / Sent' THEN 0
  WHEN 'Waiting'           THEN 1
  WHEN 'Passed'            THEN 2
  ELSE ss.order_idx
END
FROM pipeline_stages s
WHERE ss.stage_id = s.id
  AND s.name IN ('Resume', 'HR Interview', 'Technical Interview', 'Final Interview');

-- 3) Verify: each of those stages should have exactly 3 substatuses
SELECT s.name AS stage, ss.name AS substatus, ss.order_idx
FROM pipeline_stages s
JOIN pipeline_substatuses ss ON ss.stage_id = s.id
WHERE s.name IN ('Resume', 'HR Interview', 'Technical Interview', 'Final Interview')
ORDER BY s.order_idx, ss.order_idx;
