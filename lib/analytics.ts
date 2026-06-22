import {
  Application,
  Pipeline,
  RejectionReason,
  StageDef,
} from "@/types";
import { findStageByName } from "@/lib/pipeline-helpers";

/* ============================================================
 * Stage progression helpers (new model)
 * ============================================================ */

function isRejected(app: Application, pipeline: Pipeline): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  return cur?.type === "aggregator";
}

function isOffer(app: Application, pipeline: Pipeline): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  return cur?.name === "Offer";
}

function isClosed(app: Application, pipeline: Pipeline): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  if (!cur) return false;
  if (cur.type === "aggregator") return true;
  // closesProcess substatus (e.g. Offer / Accepted, Offer / Declined)
  const sub = app.stageStatuses?.[cur.id];
  if (sub) {
    const def = cur.substatuses.find((s) => s.name === sub);
    if (def?.closesProcess) return true;
  }
  return false;
}

/**
 * "Reached" a stage = current canonical stage has order >= target.order,
 * OR rejected_at_stage has order >= target.order.
 */
function reachedStage(
  app: Application,
  stage: StageDef,
  pipeline: Pipeline
): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  if (cur && cur.type === "normal" && cur.order >= stage.order) return true;
  if (cur && cur.type === "aggregator" && app.rejectedAtStageId) {
    const rej = pipeline.stages.find((s) => s.id === app.rejectedAtStageId);
    if (rej && rej.order >= stage.order) return true;
  }
  return false;
}

/* ============================================================
 * KPI counts
 * ============================================================ */

export interface KpiCounts {
  total: number;
  reachedHR: number;
  reachedTech: number;
  reachedFinal: number;
  offers: number;
  rejected: number;
  active: number;
}

export function computeKpis(
  applications: Application[],
  pipeline: Pipeline
): KpiCounts {
  const hr = findStageByName(pipeline, "HR Interview");
  const tech = findStageByName(pipeline, "Technical Interview");
  const final = findStageByName(pipeline, "Final Interview");

  let reachedHR = 0;
  let reachedTech = 0;
  let reachedFinal = 0;
  let offers = 0;
  let rejected = 0;

  for (const app of applications) {
    if (hr && reachedStage(app, hr, pipeline)) reachedHR++;
    if (tech && reachedStage(app, tech, pipeline)) reachedTech++;
    if (final && reachedStage(app, final, pipeline)) reachedFinal++;
    if (isOffer(app, pipeline)) offers++;
    if (isRejected(app, pipeline)) rejected++;
  }

  const closed = offers + rejected;
  return {
    total: applications.length,
    reachedHR,
    reachedTech,
    reachedFinal,
    offers,
    rejected,
    active: applications.length - closed,
  };
}

/* ============================================================
 * Funnel
 * ============================================================ */

export interface FunnelStep {
  label: string;
  count: number;
  fromPrevious?: {
    numerator: number;
    denominator: number;
    pct: number;
    fromLabel: string;
  };
}

export function computeFunnel(
  applications: Application[],
  pipeline: Pipeline
): FunnelStep[] {
  const k = computeKpis(applications, pipeline);
  const steps: { label: string; count: number }[] = [
    { label: "Applications", count: k.total },
    { label: "HR Interviews", count: k.reachedHR },
    { label: "Technical Interviews", count: k.reachedTech },
    { label: "Final Interviews", count: k.reachedFinal },
    { label: "Offers", count: k.offers },
  ];

  return steps.map((step, i) => {
    if (i === 0) return { ...step };
    const prev = steps[i - 1];
    const pct = prev.count > 0 ? (step.count / prev.count) * 100 : 0;
    return {
      ...step,
      fromPrevious: {
        numerator: step.count,
        denominator: prev.count,
        pct,
        fromLabel: prev.label,
      },
    };
  });
}

/* ============================================================
 * Rejections breakdown
 * ============================================================ */

export interface BreakdownItem {
  label: string;
  count: number;
  pct: number;
}

export function rejectionsByStage(
  applications: Application[],
  pipeline: Pipeline
): BreakdownItem[] {
  const stages = pipeline.stages
    .filter(
      (s) =>
        s.type === "normal" &&
        s.substatuses.length > 0 &&
        s.name !== "Offer"
    )
    .sort((a, b) => a.order - b.order);

  const rejected = applications.filter((a) => isRejected(a, pipeline));
  const total = rejected.length;

  return stages.map((stage) => {
    const count = rejected.filter((a) => a.rejectedAtStageId === stage.id).length;
    const pct = total > 0 ? (count / total) * 100 : 0;
    return { label: stage.name, count, pct };
  });
}

const REJECTION_REASONS: RejectionReason[] = [
  "Found another candidate earlier",
  "Decided to move with another candidate",
  "Country location",
  "Requirement mismatch",
  "Job no longer open",
  "No explanation provided",
  "Withdrawn by candidate",
  "Other",
];

export function rejectionsByReason(
  applications: Application[],
  pipeline: Pipeline
): BreakdownItem[] {
  const rejected = applications.filter((a) => isRejected(a, pipeline));
  const total = rejected.length;
  return REJECTION_REASONS.map((reason) => {
    const count = rejected.filter((a) => a.rejectionReason === reason).length;
    const pct = total > 0 ? (count / total) * 100 : 0;
    return { label: reason, count, pct };
  });
}

export function totalRejections(
  applications: Application[],
  pipeline: Pipeline
): number {
  return applications.filter((a) => isRejected(a, pipeline)).length;
}

/* ============================================================
 * Time-based metrics
 * ============================================================
 *
 * We don't yet store per-stage timestamps, so these metrics use
 * createdAt → updatedAt as an approximation.
 */

const MS_DAY = 1000 * 60 * 60 * 24;

function diffDays(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return null;
  return Math.max(0, (db - da) / MS_DAY);
}

export interface TimeMetric {
  averageDays: number | null;
  basedOn: number;
}

/**
 * Average response time: avg createdAt → updatedAt for applications that
 * either reached HR Interview (or beyond) OR were rejected.
 */
export function averageResponseTime(
  applications: Application[],
  pipeline: Pipeline
): TimeMetric {
  const hr = findStageByName(pipeline, "HR Interview");
  const eligible = applications.filter((a) => {
    if (isRejected(a, pipeline)) return true;
    if (hr && reachedStage(a, hr, pipeline)) return true;
    return false;
  });

  const samples: number[] = [];
  for (const app of eligible) {
    const d = diffDays(app.createdAt, app.updatedAt);
    if (d !== null) samples.push(d);
  }
  if (samples.length === 0) return { averageDays: null, basedOn: 0 };
  const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
  return { averageDays: avg, basedOn: samples.length };
}

/**
 * Average process duration: avg createdAt → updatedAt for applications whose
 * process is closed (rejected or offer with closesProcess substatus).
 */
export function averageProcessDuration(
  applications: Application[],
  pipeline: Pipeline
): TimeMetric {
  const closed = applications.filter((a) => isClosed(a, pipeline));
  const samples: number[] = [];
  for (const app of closed) {
    const d = diffDays(app.createdAt, app.updatedAt);
    if (d !== null) samples.push(d);
  }
  if (samples.length === 0) return { averageDays: null, basedOn: 0 };
  const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
  return { averageDays: avg, basedOn: samples.length };
}

/* ============================================================
 * Formatting helpers
 * ============================================================ */

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtDays(n: number | null, digits = 1): string {
  if (n === null) return "—";
  return `${n.toFixed(digits)} day${n === 1 ? "" : "s"}`;
}
