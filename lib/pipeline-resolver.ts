/**
 * Pipeline state resolver — core algorithms for the new state model.
 *
 * Single source of truth: an application's `stage_statuses` JSONB field.
 * Everything else (currentStageId, rejectedAtStageId, board position) is
 * computed from it via these functions.
 *
 * See `.kiro/specs/pipeline-state-model/{requirements,design}.md`.
 */

import { Pipeline, StageDef, StageStatuses } from "@/types";

/* ============================================================
 * Operations
 * ============================================================ */

export type Operation =
  | { op: "set_stage_status"; stageId: string; substatus: string | null }
  | { op: "move_to_aggregator"; aggregatorStageId: string; sourceStageId: string }
  | { op: "set_stage_statuses"; stageStatuses: StageStatuses }
  | { op: "patch_fields"; fields: Record<string, any> };

export interface CanonicalPosition {
  currentStageId: string;
  rejectedAtStageId: string | null;
}

export interface ApplyResult {
  stageStatuses: StageStatuses;
  currentStageId: string;
  rejectedAtStageId: string | null;
  fieldUpdates: Record<string, any>;
}

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/* ============================================================
 * Algorithm: resolveCanonicalPosition
 * ============================================================
 *
 * Given a stageStatuses map and the user's pipeline, compute the
 * card's single canonical board position.
 *
 * Rules (in order):
 *   1. Rejection priority: if any normal stage has "Rejected", card lives
 *      in the rejection aggregator with rejected_at_stage = the latest
 *      (highest-order) such stage.
 *   2. Advanced wins: otherwise, card lives in the highest-order normal
 *      stage with a non-null substatus.
 *   3. Empty fallback: otherwise, card lives in To-do (the first normal
 *      stage with no substatuses), or the first normal stage at all.
 */
export function resolveCanonicalPosition(
  stageStatuses: StageStatuses,
  pipeline: Pipeline
): CanonicalPosition {
  const normalStages = pipeline.stages
    .filter((s) => s.type === "normal")
    .sort((a, b) => a.order - b.order);

  // 1. Rejection priority — latest by order
  const rejected = normalStages
    .filter((s) => stageStatuses[s.id] === "Rejected")
    .sort((a, b) => b.order - a.order);

  if (rejected.length > 0) {
    const aggregator = pipeline.stages.find(
      (s) => s.type === "aggregator" && s.aggregatorOf === "rejection"
    );
    if (!aggregator) {
      throw new Error(
        "Pipeline has rejected stage_statuses but no rejection aggregator"
      );
    }
    return { currentStageId: aggregator.id, rejectedAtStageId: rejected[0].id };
  }

  // 2. Advanced wins — highest order with non-null
  const advanced = normalStages
    .filter((s) => stageStatuses[s.id] != null && stageStatuses[s.id] !== "")
    .sort((a, b) => b.order - a.order);

  if (advanced.length > 0) {
    return { currentStageId: advanced[0].id, rejectedAtStageId: null };
  }

  // 3. Empty fallback — To-do (first normal with no substatuses) or first normal
  const todo = normalStages.find((s) => s.substatuses.length === 0);
  const fallback = todo ?? normalStages[0];
  if (!fallback) {
    throw new Error("Pipeline has no normal stages");
  }
  return { currentStageId: fallback.id, rejectedAtStageId: null };
}

/* ============================================================
 * Algorithm: applyForwardClearing
 * ============================================================
 *
 * Set every normal stage with order > pivot.order to null.
 * Pivots stages with order <= pivot.order are left untouched.
 */
export function applyForwardClearing(
  stageStatuses: StageStatuses,
  pivotStage: StageDef,
  pipeline: Pipeline
): StageStatuses {
  const result: StageStatuses = { ...stageStatuses };
  for (const stage of pipeline.stages) {
    if (stage.type === "normal" && stage.order > pivotStage.order) {
      result[stage.id] = null;
    }
  }
  return result;
}

/* ============================================================
 * Validation
 * ============================================================ */

function findStageOrThrow(pipeline: Pipeline, stageId: string): StageDef {
  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) {
    throw new ValidationError(`Stage ${stageId} not in pipeline`);
  }
  return stage;
}

function ensureNormalStage(stage: StageDef): void {
  if (stage.type !== "normal") {
    throw new ValidationError(
      `Stage "${stage.name}" is not a normal stage (type=${stage.type})`
    );
  }
}

function validateSubstatusValue(stage: StageDef, substatus: string | null): void {
  if (substatus === null) return; // null = clear / not started
  if (substatus === "Rejected") return; // always allowed; promotes to aggregator
  // Empty substatus list (e.g., To-do) accepts only null or "Rejected"
  if (stage.substatuses.length === 0) {
    throw new ValidationError(
      `Stage "${stage.name}" has no substatuses; only null or "Rejected" is allowed`
    );
  }
  const allowed = stage.substatuses.some((ss) => ss.name === substatus);
  if (!allowed) {
    throw new ValidationError(
      `Substatus "${substatus}" is not valid for stage "${stage.name}"`
    );
  }
}

/* ============================================================
 * applyOperation — pure function: (state, op, pipeline) → newState
 * ============================================================ */

export function applyOperation(
  current: { stageStatuses: StageStatuses },
  op: Operation,
  pipeline: Pipeline
): ApplyResult {
  let next: StageStatuses = { ...current.stageStatuses };
  let fieldUpdates: Record<string, any> = {};

  switch (op.op) {
    case "set_stage_status": {
      const stage = findStageOrThrow(pipeline, op.stageId);
      ensureNormalStage(stage);
      validateSubstatusValue(stage, op.substatus);
      next[op.stageId] = op.substatus;
      next = applyForwardClearing(next, stage, pipeline);
      break;
    }

    case "move_to_aggregator": {
      const agg = findStageOrThrow(pipeline, op.aggregatorStageId);
      if (agg.type !== "aggregator") {
        throw new ValidationError(
          `Stage "${agg.name}" is not an aggregator (type=${agg.type})`
        );
      }
      const source = findStageOrThrow(pipeline, op.sourceStageId);
      ensureNormalStage(source);
      next[op.sourceStageId] = "Rejected";
      next = applyForwardClearing(next, source, pipeline);
      break;
    }

    case "set_stage_statuses": {
      // Validate + filter aggregator keys (they are not stored in stage_statuses)
      const filtered: StageStatuses = {};
      for (const [stageId, substatus] of Object.entries(op.stageStatuses)) {
        const stage = findStageOrThrow(pipeline, stageId);
        if (stage.type === "normal") {
          validateSubstatusValue(stage, substatus);
          filtered[stageId] = substatus;
        }
        // aggregator: silently skip — it never holds its own substatus
      }
      next = filtered;
      // Forward-clearing from the latest non-null normal stage,
      // so the final map is internally consistent.
      const lastSet = pipeline.stages
        .filter((s) => s.type === "normal" && next[s.id] != null)
        .sort((a, b) => b.order - a.order)[0];
      if (lastSet) {
        next = applyForwardClearing(next, lastSet, pipeline);
      }
      break;
    }

    case "patch_fields": {
      fieldUpdates = { ...op.fields };
      break;
    }
  }

  const canonical = resolveCanonicalPosition(next, pipeline);
  return {
    stageStatuses: next,
    currentStageId: canonical.currentStageId,
    rejectedAtStageId: canonical.rejectedAtStageId,
    fieldUpdates,
  };
}

/**
 * Apply a sequence of operations atomically (sequentially).
 */
export function applyOperations(
  current: { stageStatuses: StageStatuses },
  ops: Operation[],
  pipeline: Pipeline
): ApplyResult {
  let state: { stageStatuses: StageStatuses } = {
    stageStatuses: current.stageStatuses,
  };
  let allFields: Record<string, any> = {};
  let result: ApplyResult | null = null;

  for (const op of ops) {
    result = applyOperation(state, op, pipeline);
    state = { stageStatuses: result.stageStatuses };
    allFields = { ...allFields, ...result.fieldUpdates };
  }

  if (!result) {
    // Empty ops list — recompute canonical position from current state
    const canonical = resolveCanonicalPosition(current.stageStatuses, pipeline);
    return {
      stageStatuses: current.stageStatuses,
      currentStageId: canonical.currentStageId,
      rejectedAtStageId: canonical.rejectedAtStageId,
      fieldUpdates: {},
    };
  }

  return {
    stageStatuses: result.stageStatuses,
    currentStageId: result.currentStageId,
    rejectedAtStageId: result.rejectedAtStageId,
    fieldUpdates: allFields,
  };
}

/* ============================================================
 * UI label helpers (used by both server and client)
 * ============================================================ */

/**
 * Human-readable canonical label, e.g.:
 *   "HR Interview | Scheduled / Sent"
 *   "Rejected | at Resume"
 *   "To-do"
 */
export function getCanonicalLabel(
  stageStatuses: StageStatuses,
  currentStageId: string | null,
  rejectedAtStageId: string | null,
  pipeline: Pipeline
): string {
  if (!currentStageId) return "—";
  const stage = pipeline.stages.find((s) => s.id === currentStageId);
  if (!stage) return "—";

  if (stage.type === "aggregator" && rejectedAtStageId) {
    const source = pipeline.stages.find((s) => s.id === rejectedAtStageId);
    return `${stage.name} | at ${source?.name ?? "?"}`;
  }
  if (stage.substatuses.length === 0) {
    return stage.name; // e.g. To-do
  }
  const sub = stageStatuses[stage.id];
  return `${stage.name} | ${sub ?? "Not Started"}`;
}
