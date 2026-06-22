export interface Company {
  id: string;
  name: string;
  careersUrl: string;
  createdAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  url: string;
  description?: string;
  experience?: string;
  scrapedAt: string;
  isRelevant: boolean;
  matchedKeywords?: string[];
}

// ==========================================
// SEARCH PROFILES
// ==========================================

export interface SearchProfile {
  id: string;
  userId: string;
  name: string;
  targetKeywords: string[];
  preferredKeywords: string[];
  excludedKeywords: string[];
  isDefault: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

// ==========================================
// PIPELINE CONFIG
// ==========================================

export type StageType = "normal" | "aggregator";

export interface SubstatusDef {
  id: string;
  name: string;
  order: number;
  closesProcess: boolean;
}

export interface StageDef {
  id: string;
  name: string;
  order: number;
  type: StageType;
  aggregatorOf?: "rejection";
  substatuses: SubstatusDef[];
}

export interface Pipeline {
  id: string;
  userId: string;
  stages: StageDef[];
}

/**
 * Map from stage_id to substatus name (or null).
 * Aggregator stages are NOT keyed here — they are derived from normal
 * stages with "Rejected".
 */
export type StageStatuses = Record<string, string | null>;

// ==========================================
// SUPPORTING DOMAINS
// ==========================================

export type RejectionReason =
  | "Found another candidate earlier"
  | "Decided to move with another candidate"
  | "Country location"
  | "Requirement mismatch"
  | "Job no longer open"
  | "No explanation provided"
  | "Withdrawn by candidate"
  | "Other";

export type CommunicationChannel =
  | "Email"
  | "Telegram"
  | "LinkedIn"
  | "WhatsApp"
  | "Other";

export interface ActivityLogEntry {
  id: string;
  applicationId: string;
  timestamp: string;
  event: string;
  details?: string;
}

// ==========================================
// APPLICATION (single source of truth: stageStatuses)
// ==========================================

export interface Application {
  id: string;
  userId: string;

  // Basic info
  companyName: string;
  position: string;
  url?: string;

  // Pipeline state
  stageStatuses: StageStatuses;
  currentStageId: string | null;
  rejectedAtStageId: string | null;

  // Rejection details
  rejectionReason?: RejectionReason;
  rejectionComment?: string;

  // Contacts
  hrName?: string;
  communicationChannel?: CommunicationChannel;
  contactDetails?: string;

  // Compensation
  salary?: string;
  conditions?: string;

  // Notes
  notes?: string;

  // Dates
  lastContactDate?: string;
  businessDaysSinceContact?: number;

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// USER
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
}

export interface JobSearchCriteria {
  keywords: string[];
  experienceYears: number[];
}
