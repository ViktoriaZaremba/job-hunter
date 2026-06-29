"use client";

import Link from "next/link";
import { Application, Pipeline, StageDef } from "@/types";
import {
  getBusinessDaysSinceContact,
  findStageByName,
  findRejectionAggregator,
} from "@/lib/pipeline-helpers";
import { AlertTriangle, AlertOctagon, Calendar, Mail, Hourglass } from "lucide-react";

/* ============================================================
 * Derivations
 * ============================================================ */

interface Aggregates {
  total: number;
  hrCount: number;
  techCount: number;
  offerCount: number;
  warning7: Application[];
  critical14: Application[];
  upcoming: Application[];
}

/**
 * "Reached" a stage = the canonical position is on this stage (or beyond),
 * or the card was rejected at that stage or beyond.
 */
function reachedStage(
  app: Application,
  stage: StageDef,
  pipeline: Pipeline
): boolean {
  // Case 1: card is currently in a normal stage with order >= stage.order
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  if (cur && cur.type === "normal" && cur.order >= stage.order) return true;
  // Case 2: card is in aggregator with rejected_at_stage of order >= stage.order
  if (cur && cur.type === "aggregator" && app.rejectedAtStageId) {
    const rej = pipeline.stages.find((s) => s.id === app.rejectedAtStageId);
    if (rej && rej.order >= stage.order) return true;
  }
  return false;
}

function isClosed(app: Application, pipeline: Pipeline): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  if (!cur) return false;
  if (cur.type === "aggregator") return true; // Rejected = closed
  // Offer with closesProcess substatus also = closed
  const sub = app.stageStatuses?.[cur.id];
  if (cur.name === "Offer" && sub) {
    const def = cur.substatuses.find((s) => s.name === sub);
    if (def?.closesProcess) return true;
  }
  return false;
}

function isInterviewStage(app: Application, pipeline: Pipeline): boolean {
  const cur = pipeline.stages.find((s) => s.id === app.currentStageId);
  if (!cur || cur.type !== "normal") return false;
  return ["HR Interview", "Technical Interview", "Final Interview"].includes(
    cur.name
  );
}

function aggregate(applications: Application[], pipeline: Pipeline): Aggregates {
  const hr = findStageByName(pipeline, "HR Interview");
  const tech = findStageByName(pipeline, "Technical Interview");
  const offer = findStageByName(pipeline, "Offer");

  let hrCount = 0;
  let techCount = 0;
  let offerCount = 0;
  const warning7: Application[] = [];
  const critical14: Application[] = [];
  const upcoming: Application[] = [];

  for (const app of applications) {
    if (hr && reachedStage(app, hr, pipeline)) hrCount++;
    if (tech && reachedStage(app, tech, pipeline)) techCount++;
    if (offer && app.currentStageId === offer.id) offerCount++;

    if (!isClosed(app, pipeline)) {
      const days = app.lastContactDate
        ? getBusinessDaysSinceContact(app.lastContactDate)
        : 0;

      // Check if followup was dismissed (and not reset by new contact)
      const isDismissed = app.followupDismissedAt && app.lastContactDate &&
        new Date(app.followupDismissedAt) >= new Date(app.lastContactDate);

      if (!isDismissed) {
        if (days > 14) critical14.push(app);
        else if (days > 7) warning7.push(app);
      }

      // Upcoming = currently in interview stage with substatus "Scheduled / Sent"
      if (isInterviewStage(app, pipeline)) {
        const sub = app.stageStatuses?.[app.currentStageId!];
        if (sub === "Scheduled / Sent") upcoming.push(app);
      }
    }
  }

  return {
    total: applications.length,
    hrCount,
    techCount,
    offerCount,
    warning7,
    critical14,
    upcoming,
  };
}

/* ============================================================
 * Public component
 * ============================================================ */

interface BoardWidgetsProps {
  applications: Application[];
  pipeline: Pipeline;
  onCardClick: (app: Application) => void;
  onDismissFollowup?: (appId: string) => void;
}

export function BoardWidgets({
  applications,
  pipeline,
  onCardClick,
  onDismissFollowup,
}: BoardWidgetsProps) {
  const agg = aggregate(applications, pipeline);
  const hasAlerts = agg.warning7.length > 0 || agg.critical14.length > 0;
  const hasFocus =
    agg.upcoming.length > 0 ||
    agg.warning7.length > 0 ||
    agg.critical14.length > 0;

  return (
    <div className="space-y-5 mb-8">
      <QuickStats agg={agg} pipeline={pipeline} />
      {hasAlerts && <Alerts agg={agg} onCardClick={onCardClick} onDismissFollowup={onDismissFollowup} />}
      {hasFocus && <TodaysFocus agg={agg} pipeline={pipeline} onCardClick={onCardClick} />}
    </div>
  );
}

/* ============================================================
 * Quick Stats
 * ============================================================ */

function QuickStats({ agg, pipeline }: { agg: Aggregates; pipeline: Pipeline }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Applications" value={agg.total} />
      <StatCard label="HR Interviews" value={agg.hrCount} />
      <StatCard label="Technical Interviews" value={agg.techCount} />
      <StatCard label="Offers" value={agg.offerCount} accent="teal" />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "teal";
}) {
  const valueColor = accent === "teal" ? "text-teal-600" : "text-text-primary";
  return (
    <Link
      href="/dashboard/analytics"
      className="card p-5 hover:border-ink/20 transition group block"
    >
      <p className={`text-[28px] font-semibold tracking-tight ${valueColor}`}>
        {value}
      </p>
      <p className="text-[12px] font-medium text-text-secondary uppercase tracking-wider mt-1 group-hover:text-text-primary transition">
        {label}
      </p>
    </Link>
  );
}

/* ============================================================
 * Alerts
 * ============================================================ */

function Alerts({
  agg,
  onCardClick,
  onDismissFollowup,
}: {
  agg: Aggregates;
  onCardClick: (app: Application) => void;
  onDismissFollowup?: (appId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {agg.warning7.length > 0 && (
        <AlertCard
          tone="warning"
          icon={<AlertTriangle size={16} />}
          title={`${agg.warning7.length} application${
            agg.warning7.length !== 1 ? "s" : ""
          } need follow-up`}
          subtitle="No response for 7+ business days"
          apps={agg.warning7}
          onCardClick={onCardClick}
          onDismiss={onDismissFollowup}
        />
      )}
      {agg.critical14.length > 0 && (
        <AlertCard
          tone="critical"
          icon={<AlertOctagon size={16} />}
          title={`${agg.critical14.length} stale application${
            agg.critical14.length !== 1 ? "s" : ""
          }`}
          subtitle="No response for 14+ business days"
          apps={agg.critical14}
          onCardClick={onCardClick}
          onDismiss={onDismissFollowup}
        />
      )}
    </div>
  );
}

function AlertCard({
  tone,
  icon,
  title,
  subtitle,
  apps,
  onCardClick,
  onDismiss,
}: {
  tone: "warning" | "critical";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  apps: Application[];
  onCardClick: (app: Application) => void;
  onDismiss?: (appId: string) => void;
}) {
  const toneStyles =
    tone === "warning"
      ? {
          card: "border-sand-200 bg-sand-50",
          icon: "text-sand-600 bg-sand-100",
          title: "text-sand-700",
          chip: "bg-surface text-sand-700 border-sand-200 hover:border-sand-300",
        }
      : {
          card: "border-clay-100 bg-clay-50",
          icon: "text-clay-500 bg-clay-100",
          title: "text-clay-600",
          chip: "bg-surface text-clay-500 border-clay-100 hover:border-clay-200",
        };

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles.card}`}>
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${toneStyles.icon}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[14px] font-semibold ${toneStyles.title}`}>
            {title}
          </p>
          <p className="text-[12px] text-text-secondary mt-0.5">{subtitle}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {apps.slice(0, 6).map((app) => (
              <div key={app.id} className="inline-flex items-center gap-0.5">
                <button
                  onClick={() => onCardClick(app)}
                  className={`pill border ${toneStyles.chip} transition cursor-pointer`}
                >
                  {app.companyName}
                </button>
                {onDismiss && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(app.id);
                    }}
                    className="text-[10px] text-text-muted hover:text-text-secondary px-1 py-0.5 rounded hover:bg-muted transition"
                    title="No contact available — dismiss"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {apps.length > 6 && (
              <span className="pill bg-surface text-text-muted border border-line">
                +{apps.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Today's Focus
 * ============================================================ */

function TodaysFocus({
  agg,
  pipeline,
  onCardClick,
}: {
  agg: Aggregates;
  pipeline: Pipeline;
  onCardClick: (app: Application) => void;
}) {
  const stageName = (id: string | null | undefined) =>
    pipeline.stages.find((s) => s.id === id)?.name ?? "";

  const items: FocusItem[] = [
    ...agg.upcoming.map<FocusItem>((app) => ({
      kind: "interview",
      app,
      label: `${stageName(app.currentStageId)} with ${app.companyName}`,
      meta: "Scheduled",
    })),
    ...agg.warning7.map<FocusItem>((app) => ({
      kind: "follow-up",
      app,
      label: `Follow up with ${app.companyName}`,
      meta: app.lastContactDate
        ? `${getBusinessDaysSinceContact(app.lastContactDate)} business days`
        : "",
    })),
    ...agg.critical14.map<FocusItem>((app) => ({
      kind: "stale",
      app,
      label: `Waiting on ${app.companyName}`,
      meta: app.lastContactDate
        ? `${getBusinessDaysSinceContact(app.lastContactDate)} business days`
        : "",
    })),
  ];

  if (items.length === 0) return null;

  return (
    <div className="card p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-text-muted mb-3">
        Today&apos;s focus
      </p>
      <ul className="divide-y divide-line">
        {items.slice(0, 6).map((item, idx) => (
          <FocusRow
            key={`${item.kind}-${item.app.id}-${idx}`}
            item={item}
            onCardClick={onCardClick}
          />
        ))}
      </ul>
      {items.length > 6 && (
        <p className="text-[12px] text-text-muted mt-3">
          +{items.length - 6} more on the board below
        </p>
      )}
    </div>
  );
}

interface FocusItem {
  kind: "interview" | "follow-up" | "stale";
  app: Application;
  label: string;
  meta: string;
}

function FocusRow({
  item,
  onCardClick,
}: {
  item: FocusItem;
  onCardClick: (app: Application) => void;
}) {
  const iconMap = {
    interview: <Calendar size={14} className="text-ink" />,
    "follow-up": <Mail size={14} className="text-sand-600" />,
    stale: <Hourglass size={14} className="text-clay-500" />,
  };

  return (
    <li>
      <button
        onClick={() => onCardClick(item.app)}
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/50 -mx-2 px-2 rounded-lg transition"
      >
        <span className="shrink-0">{iconMap[item.kind]}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] text-text-primary truncate">
            {item.label}
          </span>
          {item.meta && (
            <span className="block text-[12px] text-text-muted">
              {item.meta}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[12px] text-text-muted">
          {item.app.position}
        </span>
      </button>
    </li>
  );
}
