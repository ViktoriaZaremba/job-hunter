import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  resolveCanonicalPosition,
  applyOperation,
  applyOperations,
} from "../lib/pipeline-resolver";
import type { Pipeline, StageDef, StageStatuses } from "../types";

config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Integration test for drag-and-drop logic.
 *
 * Uses the real pipeline from DB + resolver functions.
 * Verifies that PATCH operations produce correct state transitions.
 *
 * Run: npx playwright test tests/drag-and-drop.spec.ts
 */

let pipeline: Pipeline;
let stages: StageDef[];
let testAppId: string;

function findStage(name: string): StageDef {
  return stages.find((s) => s.name === name)!;
}

test.beforeAll(async () => {
  // Fetch real pipeline for vika241020
  const userId = "b0e31c9b-28a7-4a1c-9a76-060ed98110bf";

  const { data: pipeRow } = await sb
    .from("pipelines")
    .select("id")
    .eq("user_id", userId)
    .single();

  const { data: stageRows } = await sb
    .from("pipeline_stages")
    .select("id, name, order_idx, type, aggregator_of")
    .eq("pipeline_id", pipeRow!.id)
    .order("order_idx");

  const { data: subRows } = await sb
    .from("pipeline_substatuses")
    .select("id, stage_id, name, order_idx, closes_process")
    .in("stage_id", stageRows!.map((s) => s.id))
    .order("order_idx");

  stages = stageRows!.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order_idx,
    type: s.type as "normal" | "aggregator",
    aggregatorOf: s.aggregator_of as "rejection" | undefined,
    substatuses: (subRows ?? [])
      .filter((ss) => ss.stage_id === s.id)
      .map((ss) => ({
        id: ss.id,
        name: ss.name,
        order: ss.order_idx,
        closesProcess: ss.closes_process,
      })),
  }));

  pipeline = { id: pipeRow!.id, userId, stages };

  // Pick a test application
  const { data: apps } = await sb
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  testAppId = apps![0].id;
});

test.describe("Drag-and-drop operations (integration)", () => {
  test("1. Move to Resume / Scheduled", async () => {
    const resume = findStage("Resume");
    const result = applyOperation(
      { stageStatuses: {} },
      { op: "set_stage_status", stageId: resume.id, substatus: "Scheduled / Sent" },
      pipeline
    );

    expect(result.currentStageId).toBe(resume.id);
    expect(result.stageStatuses[resume.id]).toBe("Scheduled / Sent");
    expect(result.rejectedAtStageId).toBeNull();
  });

  test("2. Move to HR / Waiting — forward clears Tech, Final, Offer", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");
    const tech = findStage("Technical Interview");
    const final = findStage("Final Interview");

    const result = applyOperation(
      { stageStatuses: { [resume.id]: "Passed", [hr.id]: "Passed", [tech.id]: "Waiting" } },
      { op: "set_stage_status", stageId: hr.id, substatus: "Waiting" },
      pipeline
    );

    expect(result.currentStageId).toBe(hr.id);
    expect(result.stageStatuses[hr.id]).toBe("Waiting");
    expect(result.stageStatuses[tech.id]).toBeNull();
    expect(result.stageStatuses[final.id]).toBeNull();
  });

  test("3. Move to Rejected at HR", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");
    const rejected = stages.find((s) => s.type === "aggregator")!;

    const result = applyOperation(
      { stageStatuses: { [resume.id]: "Passed", [hr.id]: "Waiting" } },
      { op: "move_to_aggregator", aggregatorStageId: rejected.id, sourceStageId: hr.id },
      pipeline
    );

    expect(result.currentStageId).toBe(rejected.id);
    expect(result.rejectedAtStageId).toBe(hr.id);
    expect(result.stageStatuses[hr.id]).toBe("Rejected");
  });

  test("4. Move back from Rejected to Resume / Passed", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");

    const result = applyOperation(
      { stageStatuses: { [resume.id]: "Passed", [hr.id]: "Rejected" } },
      { op: "set_stage_status", stageId: resume.id, substatus: "Passed" },
      pipeline
    );

    expect(result.currentStageId).toBe(resume.id);
    expect(result.rejectedAtStageId).toBeNull();
    expect(result.stageStatuses[resume.id]).toBe("Passed");
    expect(result.stageStatuses[hr.id]).toBeNull(); // forward cleared
  });

  test("5. Move to To-do — clears everything", async () => {
    const todo = findStage("To-do");
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");

    const result = applyOperation(
      { stageStatuses: { [resume.id]: "Passed", [hr.id]: "Scheduled / Sent" } },
      { op: "set_stage_status", stageId: todo.id, substatus: null },
      pipeline
    );

    expect(result.currentStageId).toBe(todo.id);
    for (const stage of stages.filter((s) => s.type === "normal" && s.substatuses.length > 0)) {
      expect(result.stageStatuses[stage.id]).toBeNull();
    }
  });

  test("6. Multiple rejections — latest by order wins", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");
    const tech = findStage("Technical Interview");
    const rejected = stages.find((s) => s.type === "aggregator")!;

    const pos = resolveCanonicalPosition(
      { [resume.id]: "Rejected", [hr.id]: "Passed", [tech.id]: "Rejected" },
      pipeline
    );

    expect(pos.currentStageId).toBe(rejected.id);
    expect(pos.rejectedAtStageId).toBe(tech.id); // tech.order > resume.order
  });

  test("7. HR=Passed, Tech=null → canonical = HR", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");
    const tech = findStage("Technical Interview");

    const pos = resolveCanonicalPosition(
      { [resume.id]: "Passed", [hr.id]: "Passed", [tech.id]: null },
      pipeline
    );

    expect(pos.currentStageId).toBe(hr.id);
    expect(pos.rejectedAtStageId).toBeNull();
  });

  test("8. HR=Passed, Tech=Scheduled → canonical = Tech", async () => {
    const resume = findStage("Resume");
    const hr = findStage("HR Interview");
    const tech = findStage("Technical Interview");

    const pos = resolveCanonicalPosition(
      { [resume.id]: "Passed", [hr.id]: "Passed", [tech.id]: "Scheduled / Sent" },
      pipeline
    );

    expect(pos.currentStageId).toBe(tech.id);
  });

  test("9. Invalid substatus throws ValidationError", async () => {
    const resume = findStage("Resume");

    expect(() =>
      applyOperation(
        { stageStatuses: {} },
        { op: "set_stage_status", stageId: resume.id, substatus: "BogusStatus" },
        pipeline
      )
    ).toThrow();
  });

  test("10. Invalid stageId throws ValidationError", async () => {
    expect(() =>
      applyOperation(
        { stageStatuses: {} },
        { op: "set_stage_status", stageId: "00000000-0000-0000-0000-000000000000", substatus: "Waiting" },
        pipeline
      )
    ).toThrow();
  });

  test("11. DB write + read roundtrip", async () => {
    const resume = findStage("Resume");
    const result = applyOperation(
      { stageStatuses: {} },
      { op: "set_stage_status", stageId: resume.id, substatus: "Scheduled / Sent" },
      pipeline
    );

    // Write to real DB
    const { error: writeErr } = await sb
      .from("applications")
      .update({
        stage_statuses: result.stageStatuses,
        current_stage_id: result.currentStageId,
        rejected_at_stage_id: result.rejectedAtStageId,
      })
      .eq("id", testAppId);
    expect(writeErr).toBeNull();

    // Read back
    const { data: app } = await sb
      .from("applications")
      .select("stage_statuses, current_stage_id, rejected_at_stage_id")
      .eq("id", testAppId)
      .single();

    expect(app!.current_stage_id).toBe(resume.id);
    expect(app!.stage_statuses[resume.id]).toBe("Scheduled / Sent");
    expect(app!.rejected_at_stage_id).toBeNull();
  });
});
