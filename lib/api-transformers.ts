import { Application } from "@/types";

/**
 * Transform database snake_case to TypeScript camelCase.
 *
 * Legacy stage columns (current_stage, resume_status, etc.) were dropped
 * in Phase 7 cleanup; this mapper only knows about the new model.
 */
export function dbToApplication(dbApp: any): Application {
  return {
    id: dbApp.id,
    userId: dbApp.user_id,

    // Basic info
    companyName: dbApp.company_name,
    position: dbApp.position,
    url: dbApp.url,

    // Pipeline state (single source of truth)
    stageStatuses: dbApp.stage_statuses ?? {},
    currentStageId: dbApp.current_stage_id ?? null,
    rejectedAtStageId: dbApp.rejected_at_stage_id ?? null,

    // Rejection details
    rejectionReason: dbApp.rejection_reason ?? undefined,
    rejectionComment: dbApp.rejection_comment ?? undefined,

    // Contact
    hrName: dbApp.hr_name ?? undefined,
    communicationChannel: dbApp.communication_channel ?? undefined,
    contactDetails: dbApp.contact_details ?? undefined,

    // Compensation
    salary: dbApp.salary ?? undefined,
    conditions: dbApp.conditions ?? undefined,

    // Notes
    notes: dbApp.notes ?? undefined,

    // Dates
    lastContactDate: dbApp.last_contact_date ?? undefined,

    // Follow-up
    followupDismissedAt: dbApp.followup_dismissed_at ?? undefined,

    createdAt: dbApp.created_at,
    updatedAt: dbApp.updated_at,
  };
}

/**
 * Transform TypeScript camelCase to database snake_case.
 * Only writes fields that are explicitly set on the input object.
 */
export function applicationToDb(app: Partial<Application>): any {
  const dbApp: any = {};

  if (app.userId !== undefined) dbApp.user_id = app.userId;
  if (app.companyName !== undefined) dbApp.company_name = app.companyName;
  if (app.position !== undefined) dbApp.position = app.position;
  if (app.url !== undefined) dbApp.url = app.url;

  if (app.stageStatuses !== undefined) dbApp.stage_statuses = app.stageStatuses;
  if (app.currentStageId !== undefined)
    dbApp.current_stage_id = app.currentStageId;
  if (app.rejectedAtStageId !== undefined)
    dbApp.rejected_at_stage_id = app.rejectedAtStageId;

  if (app.rejectionReason !== undefined)
    dbApp.rejection_reason = app.rejectionReason;
  if (app.rejectionComment !== undefined)
    dbApp.rejection_comment = app.rejectionComment;

  if (app.hrName !== undefined) dbApp.hr_name = app.hrName;
  if (app.communicationChannel !== undefined)
    dbApp.communication_channel = app.communicationChannel;
  if (app.contactDetails !== undefined)
    dbApp.contact_details = app.contactDetails;

  if (app.salary !== undefined) dbApp.salary = app.salary;
  if (app.conditions !== undefined) dbApp.conditions = app.conditions;
  if (app.notes !== undefined) dbApp.notes = app.notes;

  if (app.lastContactDate !== undefined)
    dbApp.last_contact_date = app.lastContactDate;
  if (app.followupDismissedAt !== undefined)
    dbApp.followup_dismissed_at = app.followupDismissedAt;

  return dbApp;
}
