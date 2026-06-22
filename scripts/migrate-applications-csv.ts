import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migrate applications from a Ukrainian Google-Sheets-style CSV
 * into the new pipeline schema for a specific user.
 *
 * Usage:
 *   tsx scripts/migrate-applications-csv.ts                    # dry-run
 *   tsx scripts/migrate-applications-csv.ts --apply            # actually insert
 */

const TARGET_USER_EMAIL = "vika241020@gmail.com";
const CSV_PATH =
  "/Users/viktoriazaremba/Desktop/job_hunter/Пошук роботи 2026 - Sheet1.csv";

const APPLY = process.argv.includes("--apply");

/* ---------- Types ---------- */

type StageStatus =
  | "Not Started"
  | "Scheduled / Sent"
  | "Waiting"
  | "Passed"
  | "Rejected";

type PipelineStage =
  | "To-do"
  | "Resume"
  | "HR Interview"
  | "Technical Interview"
  | "Final Interview"
  | "Rejected"
  | "Offer";

type RejectionReason =
  | "Found another candidate earlier"
  | "Decided to move with another candidate"
  | "Country location"
  | "Requirement mismatch"
  | "Job no longer open"
  | "No explanation provided"
  | "Other";

type CommunicationChannel =
  | "Email"
  | "Telegram"
  | "LinkedIn"
  | "WhatsApp"
  | "Other";

interface MigratedApp {
  user_id: string;
  company_name: string;
  position: string;
  url: string | null;

  current_stage: PipelineStage;
  current_stage_status: StageStatus | null;

  resume_status: StageStatus;
  hr_interview_status: StageStatus;
  technical_interview_status: StageStatus;
  final_interview_status: StageStatus;

  rejected_stage?: PipelineStage | null;
  rejection_reason?: RejectionReason | null;
  rejection_comment?: string | null;

  hr_name?: string | null;
  communication_channel?: CommunicationChannel | null;
  contact_details?: string | null;

  salary?: string | null;
  conditions?: string | null;
  notes?: string | null;

  last_contact_date?: string | null;

  // Legacy columns (still NOT NULL in current schema)
  status: string;
  applied_date?: string | null;
  comments?: string | null;
}

/* ---------- CSV parser (handles quoted fields with newlines) ---------- */

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
        continue;
      }
      cell += ch;
      i++;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/* ---------- Mapping helpers ---------- */

function mapStageStatus(value: string | undefined): StageStatus {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "Not Started";
  if (v === "немає") return "Not Started";
  if (v === "надіслала") return "Scheduled / Sent";
  if (v === "засетаплений" || v === "засетаплена") return "Scheduled / Sent";
  if (v === "зацікавило") return "Passed";
  if (v === "пройшла") return "Passed";
  if (v === "відмова") return "Rejected";
  if (v === "відповіді не було і не буде") return "Rejected";
  // Unknown — treat as Not Started; we'll preserve the original elsewhere
  return "Not Started";
}

function mapReason(value: string | undefined): {
  reason: RejectionReason | null;
  fallbackText: string | null;
} {
  const original = (value || "").trim();
  if (!original) return { reason: null, fallbackText: null };
  const lower = original.toLowerCase();

  if (lower === "не пояснили") return { reason: "No explanation provided", fallbackText: null };
  if (lower === "знайшли іншого кандидата раніше")
    return { reason: "Found another candidate earlier", fallbackText: null };
  if (lower === "вирішили рухатись з іншим кандидатом")
    return { reason: "Decided to move with another candidate", fallbackText: null };
  if (lower === "країна перебування")
    return { reason: "Country location", fallbackText: null };
  if (lower === "невідповідність конкретної вимоги")
    return { reason: "Requirement mismatch", fallbackText: null };
  if (lower === "job no longer open")
    return { reason: "Job no longer open", fallbackText: null };

  return { reason: "Other", fallbackText: original };
}

function mapChannel(value: string | undefined): CommunicationChannel | null {
  const v = (value || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "email") return "Email";
  if (v === "linkedin") return "LinkedIn";
  if (v === "telegram") return "Telegram";
  if (v === "whatsapp") return "WhatsApp";
  return "Other";
}

/**
 * Convert "DD/MM/YYYY" → "YYYY-MM-DD". Returns null if invalid.
 */
function parseDate(value: string | undefined): string | null {
  const v = (value || "").trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/**
 * Pick the "highest" status between two same-stage signals.
 * Priority:  Rejected > Passed > Scheduled / Sent > Not Started.
 * If both have meaningful values, the override wins regardless of priority,
 * because the override (HR-співбесіда for HR stage; Технічна співбесіда for
 * Technical stage) reflects the more recent signal in the pipeline.
 */
function combineStatuses(
  base: StageStatus,
  override: StageStatus
): StageStatus {
  if (override !== "Not Started") return override;
  return base;
}

/**
 * If the position field has an embedded URL on a new line, split it out.
 */
function splitPositionAndExtraUrl(positionRaw: string): {
  position: string;
  extractedUrl: string | null;
} {
  const lines = positionRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { position: positionRaw.trim(), extractedUrl: null };
  }
  // First line is the position, look for a URL in subsequent lines
  const position = lines[0];
  const urlLine = lines.find((l) => /^https?:\/\//i.test(l));
  return { position, extractedUrl: urlLine || null };
}

/**
 * If url field has multiple URLs (newline-separated), take first.
 */
function pickFirstUrl(urlRaw: string): string | null {
  const v = urlRaw.trim();
  if (!v) return null;
  const lines = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines[0] || null;
}

/* ---------- Row → Application ---------- */

interface CsvRow {
  company: string;
  position: string;
  url: string;
  date: string;
  resume: string;
  aiScreen: string;
  hr: string;
  testTask: string;
  technical: string;
  final: string;
  reason: string;
  comment: string;
  conditions: string;
  channel: string;
  contacts: string;
}

function transform(row: CsvRow, userId: string): MigratedApp | null {
  // Skip empty rows
  if (!row.company.trim() && !row.position.trim() && !row.resume.trim()) {
    return null;
  }

  const { position: positionClean, extractedUrl } = splitPositionAndExtraUrl(
    row.position
  );
  const positionFinal = positionClean || "(не вказано)";
  const url = pickFirstUrl(row.url) || extractedUrl;

  // Per-stage statuses
  const resumeBase = mapStageStatus(row.resume);
  // "Зацікавило" on Resume always means resume = Passed (per user direction)
  const resumeStatus: StageStatus =
    row.resume.trim().toLowerCase() === "зацікавило" ? "Passed" : resumeBase;

  const hrBase = mapStageStatus(row.aiScreen);
  const hrOverride = mapStageStatus(row.hr);
  const hrStatus = combineStatuses(hrBase, hrOverride);

  const techBase = mapStageStatus(row.testTask);
  const techOverride = mapStageStatus(row.technical);
  const techStatus = combineStatuses(techBase, techOverride);

  const finalStatus = mapStageStatus(row.final);

  // Special case: "відповіді не було і не буде" on Resume
  // → treat as Rejected at Resume with reason "No explanation provided"
  const noResponse = row.resume.trim().toLowerCase() === "відповіді не було і не буде";

  // Determine current stage by walking from the latest stage backwards.
  let currentStage: PipelineStage;
  let currentStageStatus: StageStatus | null;
  let rejectedStage: PipelineStage | null = null;

  // Adjusted resume status when noResponse: it should be Rejected at Resume
  let rs = resumeStatus;
  if (noResponse) rs = "Rejected";

  if (finalStatus !== "Not Started") {
    if (finalStatus === "Rejected") {
      currentStage = "Rejected";
      currentStageStatus = "Rejected";
      rejectedStage = "Final Interview";
    } else {
      currentStage = "Final Interview";
      currentStageStatus = finalStatus;
    }
  } else if (techStatus !== "Not Started") {
    if (techStatus === "Rejected") {
      currentStage = "Rejected";
      currentStageStatus = "Rejected";
      rejectedStage = "Technical Interview";
    } else {
      currentStage = "Technical Interview";
      currentStageStatus = techStatus;
    }
  } else if (hrStatus !== "Not Started") {
    if (hrStatus === "Rejected") {
      currentStage = "Rejected";
      currentStageStatus = "Rejected";
      rejectedStage = "HR Interview";
    } else {
      currentStage = "HR Interview";
      currentStageStatus = hrStatus;
    }
  } else if (rs !== "Not Started") {
    if (rs === "Rejected") {
      currentStage = "Rejected";
      currentStageStatus = "Rejected";
      rejectedStage = "Resume";
    } else {
      currentStage = "Resume";
      currentStageStatus = rs;
    }
  } else {
    currentStage = "To-do";
    currentStageStatus = null;
  }

  // Once we know the current stage, mark all earlier stages as Passed
  // (except for the one that triggered Rejection — leave as is).
  let resumeFinal: StageStatus = rs;
  let hrFinal: StageStatus = hrStatus;
  let techFinal: StageStatus = techStatus;
  let finalFinal: StageStatus = finalStatus;

  // If rejected at Final → tech/hr/resume must be Passed
  if (rejectedStage === "Final Interview") {
    techFinal = techFinal === "Not Started" ? "Passed" : techFinal;
    hrFinal = hrFinal === "Not Started" ? "Passed" : hrFinal;
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }
  if (rejectedStage === "Technical Interview") {
    hrFinal = hrFinal === "Not Started" ? "Passed" : hrFinal;
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }
  if (rejectedStage === "HR Interview") {
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }
  // For non-rejection forward progress
  if (currentStage === "Final Interview") {
    techFinal = techFinal === "Not Started" ? "Passed" : techFinal;
    hrFinal = hrFinal === "Not Started" ? "Passed" : hrFinal;
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }
  if (currentStage === "Technical Interview") {
    hrFinal = hrFinal === "Not Started" ? "Passed" : hrFinal;
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }
  if (currentStage === "HR Interview") {
    resumeFinal = resumeFinal === "Not Started" ? "Passed" : resumeFinal;
  }

  // Rejection reason
  let rejectionReason: RejectionReason | null = null;
  let rejectionComment: string | null = null;

  if (currentStage === "Rejected") {
    if (noResponse && rejectedStage === "Resume") {
      rejectionReason = "No explanation provided";
    } else {
      const mapped = mapReason(row.reason);
      if (mapped.reason) {
        rejectionReason = mapped.reason;
        if (mapped.fallbackText) {
          rejectionComment = mapped.fallbackText;
        }
      } else {
        // Rejected with no reason text → assume "No explanation provided"
        rejectionReason = "No explanation provided";
      }
    }
  }

  // Notes vs rejection_comment: 'Комент' goes to notes; if rejection_comment
  // already has the original-other text, append the comment after a divider.
  const commentText = row.comment.trim();
  let notes: string | null = null;
  if (commentText) {
    if (currentStage === "Rejected" && rejectionComment) {
      // Combine: rejection-text + comment
      rejectionComment = `${rejectionComment}\n\n${commentText}`;
    } else if (currentStage === "Rejected" && !rejectionComment) {
      // Comment can act as rejection comment when there's no enum-overflow text
      rejectionComment = commentText;
    } else {
      notes = commentText;
    }
  }

  return {
    user_id: userId,
    company_name: row.company.trim() || "(не вказано)",
    position: positionFinal,
    url: url || null,
    current_stage: currentStage,
    current_stage_status: currentStageStatus,
    resume_status: resumeFinal,
    hr_interview_status: hrFinal,
    technical_interview_status: techFinal,
    final_interview_status: finalFinal,
    rejected_stage: rejectedStage,
    rejection_reason: rejectionReason,
    rejection_comment: rejectionComment,
    hr_name: null,
    communication_channel: mapChannel(row.channel),
    contact_details: row.contacts.trim() || null,
    salary: null,
    conditions: row.conditions.trim() || null,
    notes,
    last_contact_date: parseDate(row.date),

    // Legacy fields — keep schema NOT NULL constraints happy.
    // Map current_stage back to a legacy enum:
    //   Rejected → 'Відмова'
    //   any progress past Resume → 'Зацікавило'
    //   else → 'Надіслала'
    status:
      currentStage === "Rejected"
        ? "Відмова"
        : currentStage === "HR Interview" ||
          currentStage === "Technical Interview" ||
          currentStage === "Final Interview" ||
          currentStage === "Offer" ||
          (currentStage === "Resume" && resumeFinal === "Passed")
        ? "Зацікавило"
        : "Надіслала",
    applied_date: parseDate(row.date) || new Date().toISOString().split("T")[0],
    comments: notes || rejectionComment || null,
  };
}

/* ---------- Main ---------- */

async function findUserId(email: string): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();
  if (error || !data) {
    throw new Error(
      `User ${email} not found in users table: ${error?.message || "no rows"}`
    );
  }
  return data.id;
}

function previewLine(app: MigratedApp): string {
  const parts = [
    app.company_name,
    "·",
    app.position,
    "→",
    app.current_stage,
    app.current_stage_status ? `(${app.current_stage_status})` : "",
    app.rejected_stage ? `[rejected at ${app.rejected_stage}]` : "",
    app.rejection_reason ? `· ${app.rejection_reason}` : "",
    app.last_contact_date ? `· ${app.last_contact_date}` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

async function main() {
  console.log(
    `\n📂 Reading CSV from: ${CSV_PATH}\n👤 Target user: ${TARGET_USER_EMAIL}\n${
      APPLY ? "⚠️  APPLY MODE — records will be inserted" : "🧪 DRY RUN — no DB writes"
    }\n`
  );

  const userId = await findUserId(TARGET_USER_EMAIL);
  console.log(`✅ Found user_id: ${userId}\n`);

  const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(fileContent);

  if (rows.length < 2) {
    console.error("CSV looks empty");
    process.exit(1);
  }

  const header = rows[0];
  console.log(`Header (${header.length} cols): ${header.join(" | ")}\n`);

  const apps: MigratedApp[] = [];
  const skipped: { rowIndex: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 0 || (r.length === 1 && !r[0].trim())) continue;

    const row: CsvRow = {
      company: r[0] ?? "",
      position: r[1] ?? "",
      url: r[2] ?? "",
      date: r[3] ?? "",
      resume: r[4] ?? "",
      aiScreen: r[5] ?? "",
      hr: r[6] ?? "",
      testTask: r[7] ?? "",
      technical: r[8] ?? "",
      final: r[9] ?? "",
      reason: r[10] ?? "",
      comment: r[11] ?? "",
      conditions: r[12] ?? "",
      channel: r[13] ?? "",
      contacts: r[14] ?? "",
    };

    const app = transform(row, userId);
    if (!app) {
      skipped.push({ rowIndex: i, reason: "empty row" });
      continue;
    }
    apps.push(app);
  }

  console.log(`Parsed ${apps.length} applications, skipped ${skipped.length}\n`);
  console.log("─".repeat(80));
  apps.forEach((a, idx) => console.log(`${(idx + 1).toString().padStart(2, " ")}.  ${previewLine(a)}`));
  console.log("─".repeat(80));

  // Distribution by current stage
  const dist: Record<string, number> = {};
  apps.forEach((a) => {
    dist[a.current_stage] = (dist[a.current_stage] || 0) + 1;
  });
  console.log("\nDistribution by current stage:");
  Object.entries(dist).forEach(([k, v]) => console.log(`  ${k.padEnd(22)} ${v}`));

  // Sample full payload for manual inspection
  if (apps.length > 0) {
    console.log("\n--- Sample payload (first row) ---");
    console.log(JSON.stringify(apps[0], null, 2));
  }

  if (!APPLY) {
    console.log(
      "\n🧪 Dry run complete. Re-run with --apply to insert into Supabase."
    );
    return;
  }

  // Insert in batches
  console.log(`\n🚀 Inserting ${apps.length} applications...`);
  const batchSize = 25;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < apps.length; i += batchSize) {
    const batch = apps.slice(i, i + batchSize);
    const { error } = await supabase.from("applications").insert(batch as any);
    if (error) {
      console.error(
        `❌ Batch ${i / batchSize + 1} failed: ${error.message}`
      );
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(
        `✓ Batch ${i / batchSize + 1}: ${batch.length} inserted (total ${inserted})`
      );
    }
  }

  console.log(
    `\n📈 Done. Inserted: ${inserted}, failed: ${failed}, skipped: ${skipped.length}.`
  );
}

main().catch((err) => {
  console.error("💥", err);
  process.exit(1);
});
