/**
 * Migration: legacy stage columns → new stage_statuses JSONB model.
 *
 *   npm run migrate:state-model                         # dry-run all users
 *   npm run migrate:state-model -- --user EMAIL         # dry-run one user
 *   npm run migrate:state-model:apply                   # write changes
 *   npm run migrate:state-model:apply -- --user EMAIL   # write for one user
 *   npm run migrate:state-model -- --id <uuid>          # single application
 *
 * Idempotent: if an application already has non-empty stage_statuses,
 * it is skipped unless --force is passed.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { applyOperation, ValidationError } from "../lib/pipeline-resolver";
import { Pipeline, StageDef, StageStatuses } from "../types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");
const userArg = args.includes("--user") ? args[args.indexOf("--user") + 1] : undefined;
const idArg = args.includes("--id") ? args[args.indexOf("--id") + 1] : undefined;

// Stage names in legacy → name in pipeline_stages
const LEGACY_STAGE_NAMES = {
  resume: "Resume",
  hr: "HR Interview",
  tech: "Technical Interview",
  final: "Final Interview",
  rejected: "Rejected",
  offer: "Offer",
  todo: "To-do",
};

interface LegacyApp {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  current_stage: string | null;
  current_stage_status: string | null;
  resume_status: string | null;
  hr_interview_status: string | null;
  technical_interview_status: string | null;
  final_interview_status: string | null;
  offer_status: string | null;
  rejected_stage: string | null;
  stage_statuses: any;
  current_stage_id: string | null;
  rejected_at_stage_id: string | null;
}

async function fetchPipeline(userId: string): Promise<Pipeline> {
  const { data: pipeline, error: pErr } = await sb
    .from("pipelines")
    .select("id, user_id")
    .eq("user_id", userId)
    .single();
  if (pErr || !pipeline) throw new Error(`No pipeline for user ${userId}`);

  const { data: stages, error: sErr } = await sb
    .from("pipeline_stages")
    .select("id, name, order_idx, type, aggregator_of")
    .eq("pipeline_id", pipeline.id)
    .order("order_idx");
  if (sErr) throw sErr;

  const { data: subs, error: ssErr } = await sb
    .from("pipeline_substatuses")
    .select("id, stage_id, name, order_idx, closes_process")
    .in("stage_id", stages!.map((s) => s.id))
    .order("order_idx");
  if (ssErr) throw ssErr;

  const stageDefs: StageDef[] = stages!.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order_idx,
    type: s.type as "normal" | "aggregator",
    aggregatorOf: (s.aggregator_of ?? undefined) as "rejection" | undefined,
    substatuses: (subs ?? [])
      .filter((ss) => ss.stage_id === s.id)
      .map((ss) => ({
        id: ss.id,
        name: ss.name,
        order: ss.order_idx,
        closesProcess: ss.closes_process,
      })),
  }));

  return { id: pipeline.id, userId: pipeline.user_id, stages: stageDefs };
}

function findStageByName(pipeline: Pipeline, name: string): StageDef | undefined {
  return pipeline.stages.find((s) => s.name === name);
}

/**
 * Translate legacy fields → raw stage_statuses map.
 * "Not Started" / null / "" → null.
 */
function buildRawStageStatuses(app: LegacyApp, pipeline: Pipeline): StageStatuses {
  const raw: StageStatuses = {};

  const norm = (v: string | null): string | null =>
    !v || v === "Not Started" ? null : v;

  const setIf = (legacyName: string, value: string | null) => {
    const stage = findStageByName(pipeline, legacyName);
    if (!stage) return;
    raw[stage.id] = norm(value);
  };

  setIf(LEGACY_STAGE_NAMES.resume, app.resume_status);
  setIf(LEGACY_STAGE_NAMES.hr, app.hr_interview_status);
  setIf(LEGACY_STAGE_NAMES.tech, app.technical_interview_status);
  setIf(LEGACY_STAGE_NAMES.final, app.final_interview_status);

  // Offer: prefer offer_status, fallback to current_stage_status if current_stage = Offer
  if (app.offer_status) {
    setIf(LEGACY_STAGE_NAMES.offer, app.offer_status);
  } else if (app.current_stage === "Offer" && app.current_stage_status) {
    setIf(LEGACY_STAGE_NAMES.offer, app.current_stage_status);
  }

  // Rejected: if current_stage = Rejected and rejected_stage set, override that stage to "Rejected"
  if (app.current_stage === "Rejected" && app.rejected_stage) {
    const stage = findStageByName(pipeline, app.rejected_stage);
    if (stage) raw[stage.id] = "Rejected";
  }

  return raw;
}

interface MigrationPlan {
  appId: string;
  company: string;
  position: string;
  before: {
    current_stage: string | null;
    current_stage_status: string | null;
    resume: string | null;
    hr: string | null;
    tech: string | null;
    final: string | null;
    offer: string | null;
    rejected_stage: string | null;
  };
  after: {
    stage_statuses_named: Record<string, string | null>;
    current_stage_name: string;
    rejected_at_stage_name: string | null;
  };
  payload: {
    stage_statuses: StageStatuses;
    current_stage_id: string;
    rejected_at_stage_id: string | null;
  };
  conflicts: string[];
  skipped?: string;
}

function planMigration(app: LegacyApp, pipeline: Pipeline): MigrationPlan {
  const conflicts: string[] = [];

  // Skip if already migrated
  const already = app.stage_statuses && Object.keys(app.stage_statuses).length > 0;
  const skipped = already && !FORCE
    ? "Already has non-empty stage_statuses (use --force to overwrite)"
    : undefined;

  const raw = buildRawStageStatuses(app, pipeline);

  let result;
  try {
    result = applyOperation(
      { stageStatuses: {} },
      { op: "set_stage_statuses", stageStatuses: raw },
      pipeline
    );
  } catch (e: any) {
    if (e instanceof ValidationError) {
      conflicts.push(`Validation: ${e.message}`);
    }
    throw e;
  }

  // Detect conflict: the legacy current_stage doesn't match the new canonical stage
  const newStage = pipeline.stages.find((s) => s.id === result.currentStageId)!;
  if (app.current_stage && app.current_stage !== newStage.name) {
    conflicts.push(
      `legacy current_stage="${app.current_stage}" vs computed="${newStage.name}"`
    );
  }

  // Build pretty named map for display
  const stageStatusesNamed: Record<string, string | null> = {};
  for (const stage of pipeline.stages.filter((s) => s.type === "normal")) {
    if (result.stageStatuses[stage.id] != null) {
      stageStatusesNamed[stage.name] = result.stageStatuses[stage.id];
    }
  }

  const rejectedAtStage = result.rejectedAtStageId
    ? pipeline.stages.find((s) => s.id === result.rejectedAtStageId)!
    : null;

  return {
    appId: app.id,
    company: app.company_name,
    position: app.position,
    before: {
      current_stage: app.current_stage,
      current_stage_status: app.current_stage_status,
      resume: app.resume_status,
      hr: app.hr_interview_status,
      tech: app.technical_interview_status,
      final: app.final_interview_status,
      offer: app.offer_status,
      rejected_stage: app.rejected_stage,
    },
    after: {
      stage_statuses_named: stageStatusesNamed,
      current_stage_name: newStage.name,
      rejected_at_stage_name: rejectedAtStage?.name ?? null,
    },
    payload: {
      stage_statuses: result.stageStatuses,
      current_stage_id: result.currentStageId,
      rejected_at_stage_id: result.rejectedAtStageId,
    },
    conflicts,
    skipped,
  };
}

async function applyPlan(plan: MigrationPlan): Promise<void> {
  const { error } = await sb
    .from("applications")
    .update({
      stage_statuses: plan.payload.stage_statuses,
      current_stage_id: plan.payload.current_stage_id,
      rejected_at_stage_id: plan.payload.rejected_at_stage_id,
    })
    .eq("id", plan.appId);
  if (error) throw error;
}

function fmtBefore(b: MigrationPlan["before"]): string {
  const parts = [
    `current_stage=${b.current_stage ?? "null"}`,
    b.current_stage_status ? `current_status=${b.current_stage_status}` : null,
    b.resume && b.resume !== "Not Started" ? `resume=${b.resume}` : null,
    b.hr && b.hr !== "Not Started" ? `hr=${b.hr}` : null,
    b.tech && b.tech !== "Not Started" ? `tech=${b.tech}` : null,
    b.final && b.final !== "Not Started" ? `final=${b.final}` : null,
    b.offer ? `offer=${b.offer}` : null,
    b.rejected_stage ? `rejected_at=${b.rejected_stage}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

function fmtAfter(a: MigrationPlan["after"]): string {
  const sub = Object.entries(a.stage_statuses_named)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  const canon = a.rejected_at_stage_name
    ? `${a.current_stage_name} (at ${a.rejected_at_stage_name})`
    : a.current_stage_name;
  return `[${sub || "all null"}] → ${canon}`;
}

async function main() {
  // Resolve user filter
  let userIds: string[] = [];
  if (userArg) {
    const { data, error } = await sb
      .from("users")
      .select("id, email")
      .eq("email", userArg)
      .single();
    if (error || !data) {
      console.error(`User not found: ${userArg}`);
      process.exit(1);
    }
    userIds = [data.id];
    console.log(`Filtering by user: ${userArg} (${data.id})`);
  } else {
    const { data } = await sb.from("users").select("id, email");
    userIds = (data ?? []).map((u) => u.id);
  }

  const summary = { total: 0, applied: 0, skipped: 0, conflicts: 0, errors: 0 };

  for (const userId of userIds) {
    const pipeline = await fetchPipeline(userId);

    // Fetch applications
    let q = sb
      .from("applications")
      .select(
        "id, user_id, company_name, position, current_stage, current_stage_status, resume_status, hr_interview_status, technical_interview_status, final_interview_status, offer_status, rejected_stage, stage_statuses, current_stage_id, rejected_at_stage_id"
      )
      .eq("user_id", userId)
      .order("created_at");

    if (idArg) q = q.eq("id", idArg);

    const { data: apps, error } = await q;
    if (error) throw error;

    console.log(
      `\n=== User ${userId}: ${apps!.length} application(s) ${
        APPLY ? "[APPLY]" : "[DRY-RUN]"
      } ===`
    );

    for (const app of apps!) {
      summary.total++;
      try {
        const plan = planMigration(app as LegacyApp, pipeline);

        if (plan.skipped) {
          summary.skipped++;
          console.log(`  - ${plan.company} / ${plan.position}: SKIP (${plan.skipped})`);
          continue;
        }

        const flag = plan.conflicts.length > 0 ? " ⚠" : "";
        console.log(`\n  ${plan.company} — ${plan.position}${flag}`);
        console.log(`    BEFORE: ${fmtBefore(plan.before)}`);
        console.log(`    AFTER:  ${fmtAfter(plan.after)}`);
        if (plan.conflicts.length > 0) {
          summary.conflicts++;
          for (const c of plan.conflicts) console.log(`    CONFLICT: ${c}`);
        }

        if (APPLY) {
          await applyPlan(plan);
          summary.applied++;
        }
      } catch (e: any) {
        summary.errors++;
        console.error(`  ! ${app.company_name}: ERROR ${e.message}`);
      }
    }
  }

  console.log(
    `\nSummary: ${summary.total} total, ${summary.applied} applied, ${summary.skipped} skipped, ${summary.conflicts} conflicts, ${summary.errors} errors`
  );
  if (!APPLY) {
    console.log("\n(Dry-run only. Re-run with --apply to write changes.)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
