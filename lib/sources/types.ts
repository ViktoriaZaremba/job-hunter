import { SearchProfile } from "@/types";

/**
 * A candidate vacancy produced by any source before filtering.
 */
export interface JobCandidate {
  title: string;
  url: string;
  description?: string;
  companyName?: string;
  source: "company" | "dou" | "djinni";
}

/**
 * Progress event emitted by a source during scraping.
 */
export interface SourceProgressEvent {
  type: "progress" | "warning";
  source: string;
  message?: string;
  current?: number;
  total?: number;
  companyName?: string;
  mode?: string;
}

/**
 * Unified source interface. Each implementation searches for vacancies
 * from a specific platform and returns raw candidates.
 * Filtering (evaluateJob) is applied AFTER by the orchestrator.
 */
export interface JobSource {
  name: string;
  search(
    profile: SearchProfile,
    options: SourceOptions,
    onProgress: (event: SourceProgressEvent) => void
  ): Promise<JobCandidate[]>;
}

export interface SourceOptions {
  /** Company IDs — only used by CompanyPagesSource */
  companyIds?: string[];
}
