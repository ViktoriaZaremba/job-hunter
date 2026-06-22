import { SearchProfile } from "@/types";

/**
 * Filter engine — evaluates a candidate vacancy against a search profile.
 *
 *   Step 1 — Target:    title must contain at least one target keyword
 *   Step 2 — Exclude:   title or description must NOT contain any excluded
 *   Step 3 — Preferred: collect preferred matches found in title or description
 *
 * Matching is **case-insensitive whole-word** (boundaries are non-alphanumeric
 * characters). This prevents false positives like "PM" matching inside
 * "develo**pm**ent" or "AI" matching inside "Ukr**ai**ne".
 */

export interface FilterResult {
  keep: boolean;
  matchedKeywords: string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word, case-insensitive match. Keyword must be flanked by non-
 * alphanumeric characters (or start/end of string). Underscore is treated
 * as a non-letter so "REMOTE_ANY" matches keyword "Remote".
 */
export function keywordMatches(text: string, keyword: string): boolean {
  const k = keyword.trim();
  if (!k) return false;
  const escaped = escapeRegex(k);
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9])${escaped}($|[^A-Za-z0-9])`,
    "i"
  );
  return pattern.test(text);
}

export function evaluateJob(
  job: { title: string; description?: string },
  profile: SearchProfile
): FilterResult {
  const title = job.title ?? "";
  const fullText = `${title} ${job.description ?? ""}`;

  // Step 1 — target on title
  const matchesTarget = profile.targetKeywords.some((k) =>
    keywordMatches(title, k)
  );
  if (!matchesTarget) return { keep: false, matchedKeywords: [] };

  // Step 2 — exclude (title or description)
  const hasExcluded = profile.excludedKeywords.some((k) =>
    keywordMatches(fullText, k)
  );
  if (hasExcluded) return { keep: false, matchedKeywords: [] };

  // Step 3 — preferred (collect, not required)
  const matched = profile.preferredKeywords.filter((k) =>
    keywordMatches(fullText, k)
  );

  return { keep: true, matchedKeywords: matched };
}

/**
 * Convenience: filter and annotate an array of candidates.
 * Returns only kept jobs, each annotated with `matchedKeywords`.
 */
export function filterJobs<T extends { title: string; description?: string }>(
  jobs: T[],
  profile: SearchProfile
): (T & { matchedKeywords: string[] })[] {
  const out: (T & { matchedKeywords: string[] })[] = [];
  for (const job of jobs) {
    const result = evaluateJob(job, profile);
    if (result.keep) {
      out.push({ ...job, matchedKeywords: result.matchedKeywords });
    }
  }
  return out;
}
