"use client";

import {
  Application,
  Pipeline,
  StageDef,
  StageStatuses,
  RejectionReason,
  CommunicationChannel,
} from "@/types";
import { X, ExternalLink, Edit2, Save, XCircle, Trash2 } from "lucide-react";
import {
  getBusinessDaysSinceContact,
  getStatusBadgeColor,
  getCanonicalLabel,
  findRejectionAggregator,
} from "@/lib/pipeline-helpers";
import { useState, useEffect, useMemo } from "react";

interface ApplicationModalProps {
  application: Application;
  pipeline: Pipeline;
  onClose: () => void;
  onUpdate: (id: string, payload: any) => void;
  onDelete?: (id: string) => void;
}

export function ApplicationModalFull({
  application,
  pipeline,
  onClose,
  onUpdate,
  onDelete,
}: ApplicationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<StageStatuses>(
    application.stageStatuses ?? {}
  );
  const [fields, setFields] = useState<Partial<Application>>({
    companyName: application.companyName,
    position: application.position,
    url: application.url,
    rejectionReason: application.rejectionReason,
    rejectionComment: application.rejectionComment,
    hrName: application.hrName,
    communicationChannel: application.communicationChannel,
    contactDetails: application.contactDetails,
    salary: application.salary,
    conditions: application.conditions,
    notes: application.notes,
    lastContactDate: application.lastContactDate,
  });
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset when application changes
  useEffect(() => {
    setStageStatuses(application.stageStatuses ?? {});
    setFields({
      companyName: application.companyName,
      position: application.position,
      url: application.url,
      rejectionReason: application.rejectionReason,
      rejectionComment: application.rejectionComment,
      hrName: application.hrName,
      communicationChannel: application.communicationChannel,
      contactDetails: application.contactDetails,
      salary: application.salary,
      conditions: application.conditions,
      notes: application.notes,
      lastContactDate: application.lastContactDate,
    });
    loadActivityLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.id]);

  const daysSinceContact = application.lastContactDate
    ? getBusinessDaysSinceContact(application.lastContactDate)
    : 0;

  const canonicalLabel = useMemo(
    () =>
      getCanonicalLabel(
        application.stageStatuses ?? {},
        application.currentStageId ?? null,
        application.rejectedAtStageId ?? null,
        pipeline
      ),
    [application, pipeline]
  );

  const currentStage = pipeline.stages.find(
    (s) => s.id === application.currentStageId
  );
  const isInAggregator = currentStage?.type === "aggregator";

  // Stages shown in Pipeline section: normal stages with substatuses
  const pipelineSectionStages = pipeline.stages
    .filter((s) => s.type === "normal" && s.substatuses.length > 0)
    .filter((s) => s.name !== "Offer")
    .sort((a, b) => a.order - b.order);

  const loadActivityLog = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/activity`);
      if (res.ok) setActivityLog(await res.json());
    } catch (error) {
      console.error("Error loading activity log:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSave = () => {
    // Send a combined op-style PATCH:
    //   1) set_stage_statuses with the form's per-stage map (server normalizes)
    //   2) patch_fields with the rest (rejectionReason, hrName, etc.)
    onUpdate(application.id, {
      ops: [
        { op: "set_stage_statuses", stageStatuses },
        { op: "patch_fields", fields },
      ],
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setStageStatuses(application.stageStatuses ?? {});
    setFields({
      companyName: application.companyName,
      position: application.position,
      url: application.url,
      rejectionReason: application.rejectionReason,
      rejectionComment: application.rejectionComment,
      hrName: application.hrName,
      communicationChannel: application.communicationChannel,
      contactDetails: application.contactDetails,
      salary: application.salary,
      conditions: application.conditions,
      notes: application.notes,
      lastContactDate: application.lastContactDate,
    });
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-start justify-center z-50 p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-canvas rounded-3xl shadow-modal w-full max-w-[960px] my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-line px-8 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              {canonicalLabel}
            </p>
            <h2 className="text-h2 text-text-primary truncate mt-0.5">
              {application.companyName}
            </h2>
            <p className="text-[14px] text-text-secondary truncate">
              {application.position}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="btn-secondary">
                  <XCircle size={16} />
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary">
                  <Save size={16} />
                  Save
                </button>
              </>
            ) : (
              <>
                {onDelete &&
                  (confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-text-secondary hidden sm:inline">
                        Delete this application?
                      </span>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onDelete(application.id);
                          onClose();
                        }}
                        className="btn-danger"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="btn-ghost text-text-muted hover:text-clay-500"
                      title="Delete application"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  ))}
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="btn-ghost h-10 w-10 p-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          {/* Section 1 — Overview */}
          <Section title="Overview">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Company">
                {isEditing ? (
                  <input
                    className="input"
                    value={fields.companyName ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, companyName: e.target.value })
                    }
                  />
                ) : (
                  <Text>{application.companyName}</Text>
                )}
              </Field>

              <Field label="Position">
                {isEditing ? (
                  <input
                    className="input"
                    value={fields.position ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, position: e.target.value })
                    }
                  />
                ) : (
                  <Text>{application.position}</Text>
                )}
              </Field>

              <Field label="Vacancy URL" className="col-span-2">
                {isEditing ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    className="input"
                    value={fields.url ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, url: e.target.value })
                    }
                  />
                ) : application.url ? (
                  <a
                    href={application.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] text-ink hover:text-ink-700 underline-offset-4 hover:underline"
                  >
                    {application.url}
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <Empty />
                )}
              </Field>

              <Field label="Current Status" className="col-span-2">
                <span
                  className={`pill ${getStatusBadgeColor(
                    application.rejectedAtStageId
                      ? "Rejected"
                      : application.stageStatuses?.[
                          application.currentStageId ?? ""
                        ] ?? null
                  )}`}
                >
                  {canonicalLabel}
                </span>
              </Field>

              <Field label="Last Contact">
                {isEditing ? (
                  <input
                    type="date"
                    className="input"
                    value={fields.lastContactDate ?? ""}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        lastContactDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  <Text>{application.lastContactDate || "—"}</Text>
                )}
              </Field>

              <Field label="Days Since Contact">
                <Text>
                  {daysSinceContact > 0
                    ? `${daysSinceContact} business days`
                    : "—"}
                </Text>
              </Field>
            </div>
          </Section>

          {/* Section 2 — Pipeline (per-stage statuses) */}
          <Section title="Pipeline">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${pipelineSectionStages.length}, minmax(0, 1fr))`,
              }}
            >
              {pipelineSectionStages.map((stage) => (
                <PipelineStageCell
                  key={stage.id}
                  stage={stage}
                  status={
                    isEditing
                      ? stageStatuses[stage.id] ?? null
                      : application.stageStatuses?.[stage.id] ?? null
                  }
                  isEditing={isEditing}
                  onChange={(value) =>
                    setStageStatuses({ ...stageStatuses, [stage.id]: value })
                  }
                />
              ))}
            </div>
          </Section>

          {/* Section 3 — Rejection */}
          {(isInAggregator || isEditing) && (
            <Section title="Rejection">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Rejected at stage">
                  <Text>
                    {pipeline.stages.find(
                      (s) => s.id === application.rejectedAtStageId
                    )?.name ?? "—"}
                  </Text>
                </Field>

                <Field label="Rejection Reason" required={isInAggregator}>
                  {isEditing ? (
                    <select
                      className="input"
                      value={fields.rejectionReason ?? ""}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          rejectionReason: e.target.value as RejectionReason,
                        })
                      }
                    >
                      <option value="">Select reason</option>
                      <option value="Found another candidate earlier">
                        Found another candidate earlier
                      </option>
                      <option value="Decided to move with another candidate">
                        Decided to move with another candidate
                      </option>
                      <option value="Country location">Country location</option>
                      <option value="Requirement mismatch">Requirement mismatch</option>
                      <option value="Job no longer open">Job no longer open</option>
                      <option value="No explanation provided">
                        No explanation provided
                      </option>
                      <option value="Withdrawn by candidate">
                        Withdrawn by candidate
                      </option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <Text>{application.rejectionReason || "—"}</Text>
                  )}
                </Field>

                <Field label="Comment" className="col-span-2">
                  {isEditing ? (
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Additional details about rejection..."
                      value={fields.rejectionComment ?? ""}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          rejectionComment: e.target.value,
                        })
                      }
                    />
                  ) : application.rejectionComment ? (
                    <p className="text-[14px] text-text-primary whitespace-pre-wrap">
                      {application.rejectionComment}
                    </p>
                  ) : (
                    <Empty>No comment</Empty>
                  )}
                </Field>
              </div>
            </Section>
          )}

          {/* Section 4 — Contacts */}
          <Section title="Contacts">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="HR Name">
                {isEditing ? (
                  <input
                    className="input"
                    placeholder="e.g., Anna Ivanova"
                    value={fields.hrName ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, hrName: e.target.value })
                    }
                  />
                ) : (
                  <Text>{application.hrName || "—"}</Text>
                )}
              </Field>

              <Field label="Channel">
                {isEditing ? (
                  <select
                    className="input"
                    value={fields.communicationChannel ?? ""}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        communicationChannel: e.target
                          .value as CommunicationChannel,
                      })
                    }
                  >
                    <option value="">Select channel</option>
                    <option value="Email">Email</option>
                    <option value="Telegram">Telegram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <Text>{application.communicationChannel || "—"}</Text>
                )}
              </Field>

              <Field label="Contact details" className="col-span-2">
                {isEditing ? (
                  <input
                    className="input"
                    placeholder="@annahr, anna@example.com"
                    value={fields.contactDetails ?? ""}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        contactDetails: e.target.value,
                      })
                    }
                  />
                ) : (
                  <Text>{application.contactDetails || "—"}</Text>
                )}
              </Field>
            </div>
          </Section>

          {/* Section 5 — Compensation */}
          <Section title="Compensation">
            <div className="grid grid-cols-1 gap-y-5">
              <Field label="Salary">
                {isEditing ? (
                  <input
                    className="input"
                    placeholder="e.g., €80k–90k, $7000 gross"
                    value={fields.salary ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, salary: e.target.value })
                    }
                  />
                ) : (
                  <Text>{application.salary || "—"}</Text>
                )}
              </Field>

              <Field label="Conditions">
                {isEditing ? (
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Remote, Health insurance, 28 vacation days..."
                    value={fields.conditions ?? ""}
                    onChange={(e) =>
                      setFields({ ...fields, conditions: e.target.value })
                    }
                  />
                ) : application.conditions ? (
                  <p className="text-[14px] text-text-primary whitespace-pre-wrap">
                    {application.conditions}
                  </p>
                ) : (
                  <Empty>No conditions specified</Empty>
                )}
              </Field>
            </div>
          </Section>

          {/* Section 6 — Notes */}
          <Section title="Notes">
            {isEditing ? (
              <textarea
                className="input"
                rows={5}
                placeholder="Your personal notes about this application..."
                value={fields.notes ?? ""}
                onChange={(e) =>
                  setFields({ ...fields, notes: e.target.value })
                }
              />
            ) : application.notes ? (
              <p className="text-[14px] text-text-primary whitespace-pre-wrap leading-relaxed">
                {application.notes}
              </p>
            ) : (
              <Empty>No notes yet</Empty>
            )}
          </Section>

          {/* Section 7 — Activity log */}
          <Section title="Activity">
            {loadingActivity ? (
              <div className="text-[13px] text-text-muted py-2">
                Loading activity…
              </div>
            ) : activityLog.length > 0 ? (
              <ol className="relative space-y-4">
                {activityLog.map((activity, idx) => (
                  <li key={activity.id} className="flex gap-4">
                    <div className="relative shrink-0 w-3 flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full bg-ink mt-1.5" />
                      {idx < activityLog.length - 1 && (
                        <span className="flex-1 w-px bg-line mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-[12px] text-text-muted">
                        {new Date(activity.timestamp).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </p>
                      <p className="text-[14px] font-medium text-text-primary mt-0.5">
                        {activity.event}
                      </p>
                      {activity.details && (
                        <p className="text-[13px] text-text-secondary mt-0.5">
                          {activity.details}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No activity yet</Empty>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ----- Helpers ----- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-muted mb-5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
          {label}
          {required && <span className="text-clay ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function Text({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] text-text-primary">{children}</p>;
}

function Empty({ children = "—" }: { children?: React.ReactNode }) {
  return <p className="text-[14px] text-text-muted">{children}</p>;
}

/**
 * Pipeline stage cell — shows current substatus + lets user edit it.
 *
 * Edit dropdown options:
 *   "Not Started" → null
 *   each stage substatus
 *   "Rejected" — promotes to aggregator
 */
function PipelineStageCell({
  stage,
  status,
  isEditing,
  onChange,
}: {
  stage: StageDef;
  status: string | null;
  isEditing: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-line p-3.5 bg-surface">
      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-2">
        {stage.name}
      </p>
      {isEditing ? (
        <select
          className="input h-9 py-1 text-[13px]"
          value={status ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.value)
          }
        >
          <option value="">Not Started</option>
          {stage.substatuses.map((sub) => (
            <option key={sub.id} value={sub.name}>
              {sub.name}
            </option>
          ))}
          <option value="Rejected">Rejected</option>
        </select>
      ) : (
        <span className={`pill ${getStatusBadgeColor(status)}`}>
          {status ?? "Not Started"}
        </span>
      )}
    </div>
  );
}
