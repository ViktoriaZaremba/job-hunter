-- ============================================================
-- Phase 1: Pipeline configuration tables
-- ============================================================
-- Creates pipelines, pipeline_stages, pipeline_substatuses;
-- adds a seed_default_pipeline() function and trigger; seeds
-- the default pipeline for every existing user.
--
-- Run this in Supabase Studio → SQL Editor.
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1) Tables -----------------------------------------------------
CREATE TABLE IF NOT EXISTS pipelines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name            text NOT NULL,
  order_idx       int  NOT NULL,
  type            text NOT NULL CHECK (type IN ('normal','aggregator')),
  aggregator_of   text CHECK (aggregator_of IN ('rejection')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, order_idx)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id
  ON pipeline_stages(pipeline_id);

CREATE TABLE IF NOT EXISTS pipeline_substatuses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id        uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  name            text NOT NULL,
  order_idx       int  NOT NULL,
  closes_process  boolean NOT NULL DEFAULT false,
  UNIQUE (stage_id, order_idx)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_substatuses_stage_id
  ON pipeline_substatuses(stage_id);

-- 2) seed_default_pipeline(user_id) -----------------------------
-- Creates a pipeline + stages + substatuses for a given user.
-- Returns the pipeline id. No-op if pipeline already exists.

CREATE OR REPLACE FUNCTION seed_default_pipeline(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_pipeline_id uuid;
  v_todo_id     uuid;
  v_resume_id   uuid;
  v_hr_id       uuid;
  v_tech_id     uuid;
  v_final_id    uuid;
  v_rejected_id uuid;
  v_offer_id    uuid;
  v_default_substatuses text[] := ARRAY['Not Started','Scheduled / Sent','Waiting','Passed'];
  v_name text;
  v_idx  int;
BEGIN
  -- Skip if pipeline already exists
  SELECT id INTO v_pipeline_id FROM pipelines WHERE user_id = p_user_id;
  IF v_pipeline_id IS NOT NULL THEN
    RETURN v_pipeline_id;
  END IF;

  INSERT INTO pipelines (user_id) VALUES (p_user_id)
  RETURNING id INTO v_pipeline_id;

  -- Stages (order matters)
  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'To-do', 0, 'normal')
    RETURNING id INTO v_todo_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'Resume', 1, 'normal')
    RETURNING id INTO v_resume_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'HR Interview', 2, 'normal')
    RETURNING id INTO v_hr_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'Technical Interview', 3, 'normal')
    RETURNING id INTO v_tech_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'Final Interview', 4, 'normal')
    RETURNING id INTO v_final_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type, aggregator_of)
    VALUES (v_pipeline_id, 'Rejected', 5, 'aggregator', 'rejection')
    RETURNING id INTO v_rejected_id;

  INSERT INTO pipeline_stages (pipeline_id, name, order_idx, type)
    VALUES (v_pipeline_id, 'Offer', 6, 'normal')
    RETURNING id INTO v_offer_id;

  -- Substatuses for Resume / HR / Technical / Final
  FOREACH v_name IN ARRAY v_default_substatuses LOOP
    v_idx := array_position(v_default_substatuses, v_name) - 1;
    INSERT INTO pipeline_substatuses (stage_id, name, order_idx, closes_process)
      VALUES (v_resume_id, v_name, v_idx, false);
    INSERT INTO pipeline_substatuses (stage_id, name, order_idx, closes_process)
      VALUES (v_hr_id, v_name, v_idx, false);
    INSERT INTO pipeline_substatuses (stage_id, name, order_idx, closes_process)
      VALUES (v_tech_id, v_name, v_idx, false);
    INSERT INTO pipeline_substatuses (stage_id, name, order_idx, closes_process)
      VALUES (v_final_id, v_name, v_idx, false);
  END LOOP;

  -- Substatuses for Offer
  INSERT INTO pipeline_substatuses (stage_id, name, order_idx, closes_process) VALUES
    (v_offer_id, 'Pending',  0, false),
    (v_offer_id, 'Accepted', 1, true),
    (v_offer_id, 'Declined', 2, true);

  -- To-do has no substatuses (flat column)
  -- Rejected (aggregator) has no own substatuses

  RETURN v_pipeline_id;
END;
$$;

-- 3) Trigger: auto-seed pipeline for new users -----------------
CREATE OR REPLACE FUNCTION trg_seed_pipeline_on_user_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM seed_default_pipeline(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_seed_pipeline ON users;
CREATE TRIGGER users_seed_pipeline
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trg_seed_pipeline_on_user_insert();

-- 4) Seed pipelines for existing users -------------------------
DO $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT id FROM users LOOP
    PERFORM seed_default_pipeline(u.id);
  END LOOP;
END $$;

-- 5) Verification ----------------------------------------------
SELECT
  p.id            AS pipeline_id,
  u.email         AS user_email,
  COUNT(DISTINCT ps.id)  AS stage_count,
  COUNT(pss.id)          AS substatus_count
FROM pipelines p
JOIN users u ON u.id = p.user_id
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
LEFT JOIN pipeline_substatuses pss ON pss.stage_id = ps.id
GROUP BY p.id, u.email;

-- Expected: 1 row per user, 7 stages, 19 substatuses (4*4 + 3 offer)
