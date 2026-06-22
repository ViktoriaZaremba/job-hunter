import { Application, Pipeline, StageDef, StageStatuses } from "@/types";

/**
 * Helper functions for the Pipeline Board.
 *
 * After Phase 5 the "single source of truth" is `application.stageStatuses`.
 * Canonical board position is on the server (currentStageId, rejectedAtStageId).
 */

/* ============================================================
 * Date helpers
 * ============================================================ */

export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function getBusinessDaysSinceContact(lastContactDate?: string): number {
  if (!lastContactDate) return 0;
  return calculateBusinessDays(new Date(lastContactDate), new Date());
}

/* ============================================================
 * Pipeline lookups
 * ============================================================ */

export function findStageById(
  pipeline: Pipeline,
  stageId: string | null | undefined
): StageDef | undefined {
  if (!stageId) return undefined;
  return pipeline.stages.find((s) => s.id === stageId);
}

export function findStageByName(
  pipeline: Pipeline,
  name: string
): StageDef | undefined {
  return pipeline.stages.find((s) => s.name === name);
}

export function findRejectionAggregator(pipeline: Pipeline): StageDef | undefined {
  return pipeline.stages.find(
    (s) => s.type === "aggregator" && s.aggregatorOf === "rejection"
  );
}

/* ============================================================
 * Card grouping
 * ============================================================ */

/**
 * Cards in (normalStage, substatus). Substatus may be null for empty-substatus
 * stages (To-do).
 */
export function getCardsForCell(
  applications: Application[],
  stageId: string,
  substatus: string | null
): Application[] {
  return applications.filter(
    (app) =>
      app.currentStageId === stageId &&
      (app.stageStatuses?.[stageId] ?? null) === substatus
  );
}

/**
 * Cards in (aggregatorStage, sourceStage). The aggregator subgroups by where
 * rejection happened — so we filter by rejectedAtStageId.
 */
export function getCardsForAggregatorCell(
  applications: Application[],
  aggregatorStageId: string,
  sourceStageId: string
): Application[] {
  return applications.filter(
    (app) =>
      app.currentStageId === aggregatorStageId &&
      app.rejectedAtStageId === sourceStageId
  );
}

/**
 * Cards currently in a stage (regardless of substatus).
 */
export function getCardsInStage(
  applications: Application[],
  stageId: string
): Application[] {
  return applications.filter((app) => app.currentStageId === stageId);
}

/* ============================================================
 * Visual helpers
 * ============================================================ */

/**
 * Subtle colored dot used in column headers. Matches stage by name.
 */
export function getStageColor(stage: StageDef | string): string {
  const name = typeof stage === "string" ? stage : stage.name;
  const colors: Record<string, string> = {
    "To-do": "bg-text-muted",
    Resume: "bg-ink-300",
    "HR Interview": "bg-teal-400",
    "Technical Interview": "bg-sand-400",
    "Final Interview": "bg-ink",
    Rejected: "bg-clay",
    Offer: "bg-teal",
  };
  return colors[name] ?? "bg-text-muted";
}

/**
 * Soft pill colors per substatus.
 */
export function getStatusBadgeColor(status: string | null | undefined): string {
  if (!status) return "bg-muted text-text-secondary";
  const colors: Record<string, string> = {
    "Not Started": "bg-muted text-text-secondary",
    "Scheduled / Sent": "bg-ink-50 text-ink-600",
    Waiting: "bg-sand-50 text-sand-600",
    Passed: "bg-teal-50 text-teal-600",
    Rejected: "bg-clay-50 text-clay-500",
    Pending: "bg-ink-50 text-ink-600",
    Accepted: "bg-teal-50 text-teal-600",
    Declined: "bg-clay-50 text-clay-500",
  };
  return colors[status] ?? "bg-muted text-text-secondary";
}

/* ============================================================
 * Canonical label (delegates to resolver to keep behavior consistent)
 * ============================================================ */

export {
  getCanonicalLabel,
} from "./pipeline-resolver";

/* ============================================================
 * Validation helpers
 * ============================================================ */

export function isRejectionComplete(application: Partial<Application>): boolean {
  return !!(application.rejectedAtStageId && application.rejectionReason);
}
