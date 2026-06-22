"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Application, Pipeline } from "@/types";
import {
  computeKpis,
  computeFunnel,
  rejectionsByStage,
  rejectionsByReason,
  totalRejections,
  averageResponseTime,
  averageProcessDuration,
  fmtPct,
  fmtDays,
  KpiCounts,
  FunnelStep,
  BreakdownItem,
  TimeMetric,
} from "@/lib/analytics";
import { InfoTooltip, TooltipBody } from "@/components/ui/InfoTooltip";
import { ArrowDown, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const [appsRes, pipeRes] = await Promise.all([
          fetch("/api/applications"),
          fetch("/api/pipeline"),
        ]);
        if (cancelled) return;
        if (appsRes.ok) setApplications(await appsRes.json());
        if (pipeRes.ok) setPipeline(await pipeRes.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (status === "loading" || loading || !pipeline) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  const kpis = computeKpis(applications, pipeline);
  const funnel = computeFunnel(applications, pipeline);
  const byStage = rejectionsByStage(applications, pipeline);
  const byReason = rejectionsByReason(applications, pipeline);
  const rejectionsTotal = totalRejections(applications, pipeline);
  const responseTime = averageResponseTime(applications, pipeline);
  const processDuration = averageProcessDuration(applications, pipeline);

  const empty = applications.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-h1">Analytics</h1>
        <p className="text-text-secondary mt-1">
          Every number is computed in your browser. Hover any value to see how.
        </p>
      </div>

      {empty ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <KpiSection kpis={kpis} />
          <FunnelSection funnel={funnel} />
          <TimingSection response={responseTime} duration={processDuration} />
          <RejectionsSection
            byStage={byStage}
            byReason={byReason}
            total={rejectionsTotal}
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * KPI cards
 * ============================================================ */

function KpiSection({ kpis }: { kpis: KpiCounts }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard
        label="Applications"
        value={kpis.total}
        tooltip={
          <TooltipBody
            title="Applications"
            description="Total number of submitted applications."
            formula="Count(all applications)"
            result={`${kpis.total} application${kpis.total === 1 ? "" : "s"}`}
          />
        }
      />
      <KpiCard
        label="HR Interviews"
        value={kpis.reachedHR}
        tooltip={
          <TooltipBody
            title="HR Interviews"
            description="Applications whose canonical stage is HR Interview or beyond, or that were rejected at HR or later."
            formula="Count(currentStage.order >= HR.order OR rejectedAtStage.order >= HR.order)"
            result={`${kpis.reachedHR} application${kpis.reachedHR === 1 ? "" : "s"}`}
          />
        }
      />
      <KpiCard
        label="Technical Interviews"
        value={kpis.reachedTech}
        tooltip={
          <TooltipBody
            title="Technical Interviews"
            description="Applications whose canonical stage is Technical Interview or beyond, or that were rejected at Technical or later."
            formula="Count(currentStage.order >= Technical.order OR rejectedAtStage.order >= Technical.order)"
            result={`${kpis.reachedTech} application${kpis.reachedTech === 1 ? "" : "s"}`}
          />
        }
      />
      <KpiCard
        label="Offers"
        value={kpis.offers}
        accent="teal"
        tooltip={
          <TooltipBody
            title="Offers"
            description="Applications whose canonical stage is Offer."
            formula="Count(currentStage = Offer)"
            result={`${kpis.offers} offer${kpis.offers === 1 ? "" : "s"}`}
          />
        }
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  tooltip,
  accent,
}: {
  label: string;
  value: number;
  tooltip: React.ReactNode;
  accent?: "teal";
}) {
  const valueColor = accent === "teal" ? "text-teal-600" : "text-text-primary";
  return (
    <InfoTooltip content={tooltip}>
      <div className="card p-5 w-full cursor-help">
        <p className={`text-[28px] font-semibold tracking-tight ${valueColor}`}>
          {value}
        </p>
        <p className="text-[12px] font-medium text-text-secondary uppercase tracking-wider mt-1">
          {label}
        </p>
      </div>
    </InfoTooltip>
  );
}

/* ============================================================
 * Conversion funnel
 * ============================================================ */

function FunnelSection({ funnel }: { funnel: FunnelStep[] }) {
  return (
    <Section title="Conversion funnel" icon={<BarChart3 size={14} />}>
      <div className="space-y-3">
        {funnel.map((step, i) => (
          <div key={step.label}>
            {i > 0 && step.fromPrevious && (
              <div className="flex items-center justify-center my-1">
                <InfoTooltip
                  content={
                    <TooltipBody
                      title={`${step.fromPrevious.fromLabel} → ${step.label}`}
                      description={`How many ${step.fromPrevious.fromLabel.toLowerCase()} progressed to ${step.label.toLowerCase()}.`}
                      formula={`${step.label} ÷ ${step.fromPrevious.fromLabel} × 100`}
                      values={[
                        { label: step.label, value: step.fromPrevious.numerator },
                        {
                          label: step.fromPrevious.fromLabel,
                          value: step.fromPrevious.denominator,
                        },
                      ]}
                      result={fmtPct(step.fromPrevious.pct)}
                    />
                  }
                >
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary cursor-help">
                    <ArrowDown size={12} />
                    {fmtPct(step.fromPrevious.pct)}
                  </span>
                </InfoTooltip>
              </div>
            )}

            <FunnelRow step={step} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function FunnelRow({ step }: { step: FunnelStep }) {
  return (
    <InfoTooltip
      content={
        <TooltipBody
          title={step.label}
          description={`Number of applications that reached ${step.label.toLowerCase()}.`}
          values={[{ label: "Count", value: step.count }]}
        />
      }
    >
      <div className="card p-4 w-full flex items-center justify-between gap-4 cursor-help">
        <span className="text-[14px] font-medium text-text-primary">
          {step.label}
        </span>
        <span className="text-[18px] font-semibold text-text-primary tabular-nums">
          {step.count}
        </span>
      </div>
    </InfoTooltip>
  );
}

/* ============================================================
 * Timing metrics
 * ============================================================ */

function TimingSection({
  response,
  duration,
}: {
  response: TimeMetric;
  duration: TimeMetric;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <TimeCard
        label="Average response time"
        value={fmtDays(response.averageDays)}
        tooltip={
          <TooltipBody
            title="Average response time"
            description={[
              "Average time between when an application was added and when it received its first response.",
              "First response means the canonical stage progressed to HR Interview (or beyond) or the application was rejected.",
              "Note: per-stage timestamps are not yet stored, so this metric uses created_at → updated_at as a proxy.",
            ].join("\n\n")}
            formula="Average(updated_at − created_at) for responded apps"
            values={[
              { label: "Eligible applications", value: response.basedOn },
            ]}
            result={fmtDays(response.averageDays)}
          />
        }
      />
      <TimeCard
        label="Average process duration"
        value={fmtDays(duration.averageDays)}
        tooltip={
          <TooltipBody
            title="Average process duration"
            description={[
              "Average time between when an application was added and when its process closed.",
              "Closure means the canonical stage is Rejected, or Offer with substatus Accepted / Declined.",
              "Note: per-stage timestamps are not yet stored, so this metric uses created_at → updated_at as a proxy.",
            ].join("\n\n")}
            formula="Average(updated_at − created_at) for closed apps"
            values={[
              { label: "Closed applications", value: duration.basedOn },
            ]}
            result={fmtDays(duration.averageDays)}
          />
        }
      />
    </div>
  );
}

function TimeCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip: React.ReactNode;
}) {
  return (
    <InfoTooltip content={tooltip}>
      <div className="card p-5 w-full cursor-help">
        <p className="text-[12px] font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-2 text-[28px] font-semibold tracking-tight text-text-primary">
          {value}
        </p>
      </div>
    </InfoTooltip>
  );
}

/* ============================================================
 * Rejections section
 * ============================================================ */

function RejectionsSection({
  byStage,
  byReason,
  total,
}: {
  byStage: BreakdownItem[];
  byReason: BreakdownItem[];
  total: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Section title="Rejections by stage">
        {total === 0 ? (
          <p className="text-[13px] text-text-muted">No rejections yet.</p>
        ) : (
          <BreakdownChart
            items={byStage}
            total={total}
            buildTooltip={(item) => (
              <TooltipBody
                title={item.label}
                description={`Applications rejected during ${item.label} stage.`}
                formula={`${item.label} rejections ÷ Total rejections × 100`}
                values={[
                  { label: "Rejections at stage", value: item.count },
                  { label: "Total rejections", value: total },
                ]}
                result={`${item.count} rejection${item.count === 1 ? "" : "s"} · ${fmtPct(item.pct)}`}
              />
            )}
          />
        )}
      </Section>

      <Section title="Rejections by reason">
        {total === 0 ? (
          <p className="text-[13px] text-text-muted">No rejections yet.</p>
        ) : (
          <BreakdownChart
            items={byReason.filter((b) => b.count > 0)}
            total={total}
            buildTooltip={(item) => (
              <TooltipBody
                title={item.label}
                description={`Applications with rejection_reason = ${item.label}.`}
                formula={`Rejections with this reason ÷ Total rejections × 100`}
                values={[
                  { label: "With this reason", value: item.count },
                  { label: "Total rejections", value: total },
                ]}
                result={`${item.count} rejection${item.count === 1 ? "" : "s"} · ${fmtPct(item.pct)}`}
              />
            )}
          />
        )}
      </Section>
    </div>
  );
}

function BreakdownChart({
  items,
  total,
  buildTooltip,
}: {
  items: BreakdownItem[];
  total: number;
  buildTooltip: (item: BreakdownItem) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-text-muted">No data.</p>;
  }
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <InfoTooltip content={buildTooltip(item)}>
            <div className="w-full cursor-help">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-[13px] text-text-primary truncate">
                  {item.label}
                </span>
                <span className="text-[12px] text-text-muted tabular-nums">
                  {item.count} · {fmtPct(item.pct)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-2 rounded-full bg-clay-300"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          </InfoTooltip>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
 * Layout helpers
 * ============================================================ */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-muted mb-5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <BarChart3 className="text-text-muted" size={28} />
      </div>
      <h3 className="text-h2">Nothing to chart yet</h3>
      <p className="text-text-secondary mt-2 max-w-md">
        Add a few applications and analytics will compute conversion, timing,
        and rejection breakdowns from your data.
      </p>
    </div>
  );
}
