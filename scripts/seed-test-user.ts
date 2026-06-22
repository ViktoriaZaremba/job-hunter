/**
 * Seed test data for z.viktoriia30@gmail.com
 * Creates realistic-looking applications across all pipeline stages.
 *
 * Usage: npx tsx scripts/seed-test-user.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const EMAIL = "z.viktoriia30@gmail.com";

interface AppSeed {
  company: string;
  position: string;
  url: string;
  stageStatuses: Record<string, string | null>; // stage name → substatus
  rejectionReason?: string;
  rejectionComment?: string;
  hrName?: string;
  communicationChannel?: string;
  contactDetails?: string;
  salary?: string;
  conditions?: string;
  notes?: string;
  lastContactDate?: string;
}

const APPS: AppSeed[] = [
  // === To-do (all null) ===
  {
    company: "Spotify",
    position: "Senior Project Manager",
    url: "https://jobs.lever.co/spotify/pm-senior",
    stageStatuses: {},
    notes: "Found on LinkedIn, looks interesting",
  },
  {
    company: "Notion",
    position: "Technical Program Manager",
    url: "https://notion.so/careers/tpm",
    stageStatuses: {},
  },
  {
    company: "Figma",
    position: "Engineering Program Manager",
    url: "https://figma.com/careers/epm",
    stageStatuses: {},
    notes: "Referral from Sarah",
  },

  // === Resume / Scheduled ===
  {
    company: "Stripe",
    position: "Program Manager, Payments",
    url: "https://stripe.com/jobs/pm-payments",
    stageStatuses: { Resume: "Scheduled / Sent" },
    lastContactDate: "2026-06-15",
  },
  {
    company: "Vercel",
    position: "Senior Project Manager",
    url: "https://vercel.com/careers/sr-pm",
    stageStatuses: { Resume: "Scheduled / Sent" },
    lastContactDate: "2026-06-17",
  },

  // === Resume / Waiting ===
  {
    company: "Linear",
    position: "Delivery Manager",
    url: "https://linear.app/careers/dm",
    stageStatuses: { Resume: "Waiting" },
    lastContactDate: "2026-06-10",
    notes: "Applied via their website",
  },
  {
    company: "Intercom",
    position: "Technical Project Manager",
    url: "https://intercom.com/careers/tpm",
    stageStatuses: { Resume: "Waiting" },
    lastContactDate: "2026-06-08",
  },

  // === Resume / Passed ===
  {
    company: "Datadog",
    position: "Senior PM, Observability",
    url: "https://datadog.com/careers/sr-pm",
    stageStatuses: { Resume: "Passed" },
    lastContactDate: "2026-06-16",
  },

  // === HR Interview / Scheduled ===
  {
    company: "GitLab",
    position: "Senior Project Manager, AI",
    url: "https://gitlab.com/jobs/pm-ai",
    stageStatuses: { Resume: "Passed", "HR Interview": "Scheduled / Sent" },
    hrName: "Maria Gonzalez",
    communicationChannel: "Email",
    contactDetails: "maria.g@gitlab.com",
    lastContactDate: "2026-06-17",
    notes: "HR call scheduled for June 20th, 14:00 CET",
  },
  {
    company: "Canva",
    position: "Program Manager, Growth",
    url: "https://canva.com/careers/pm-growth",
    stageStatuses: { Resume: "Passed", "HR Interview": "Scheduled / Sent" },
    hrName: "James Lee",
    communicationChannel: "LinkedIn",
    lastContactDate: "2026-06-18",
  },

  // === HR Interview / Waiting ===
  {
    company: "Wise",
    position: "Delivery Manager, Platform",
    url: "https://wise.com/careers/dm-platform",
    stageStatuses: { Resume: "Passed", "HR Interview": "Waiting" },
    hrName: "Anna Petrov",
    communicationChannel: "Email",
    contactDetails: "anna.p@wise.com",
    lastContactDate: "2026-06-12",
    notes: "HR went well, waiting for feedback",
  },

  // === HR / Passed ===
  {
    company: "MongoDB",
    position: "Technical Program Manager",
    url: "https://mongodb.com/careers/tpm",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed" },
    hrName: "Lisa Chen",
    communicationChannel: "Email",
    contactDetails: "lisa.chen@mongodb.com",
    salary: "$140k–$170k",
    lastContactDate: "2026-06-16",
  },

  // === Technical Interview / Scheduled ===
  {
    company: "Grammarly",
    position: "Senior PM, AI Platform",
    url: "https://grammarly.com/careers/sr-pm-ai",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed", "Technical Interview": "Scheduled / Sent" },
    hrName: "Olena Koval",
    communicationChannel: "Telegram",
    contactDetails: "@olena_hr",
    salary: "$130k–$160k",
    conditions: "Remote, flexible hours, health insurance",
    lastContactDate: "2026-06-18",
    notes: "Tech interview with Engineering Director on June 23rd",
  },

  // === Technical Interview / Waiting ===
  {
    company: "Revolut",
    position: "Project Manager, Crypto",
    url: "https://revolut.com/careers/pm-crypto",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed", "Technical Interview": "Waiting" },
    hrName: "Mark Davis",
    communicationChannel: "Email",
    salary: "£90k–£110k + equity",
    lastContactDate: "2026-06-14",
    notes: "Case study submitted, waiting for result",
  },

  // === Final Interview / Scheduled ===
  {
    company: "Atlassian",
    position: "Senior Program Manager, Jira",
    url: "https://atlassian.com/careers/spm-jira",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed", "Technical Interview": "Passed", "Final Interview": "Scheduled / Sent" },
    hrName: "Sophie Williams",
    communicationChannel: "Email",
    contactDetails: "sophie.w@atlassian.com",
    salary: "AUD $180k–$210k",
    conditions: "Remote (APAC hours), RSUs, learning budget",
    lastContactDate: "2026-06-18",
    notes: "Final panel with VP Engineering + CPO. June 24th, 10:00 AEST",
  },

  // === Offer / Pending ===
  {
    company: "Shopify",
    position: "Senior Delivery Manager",
    url: "https://shopify.com/careers/sr-dm",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed", "Technical Interview": "Passed", "Final Interview": "Passed", Offer: "Pending" },
    hrName: "Michael Brown",
    communicationChannel: "Email",
    contactDetails: "michael.b@shopify.com",
    salary: "CAD $165k + equity",
    conditions: "Fully remote, unlimited PTO, home office budget $3k",
    lastContactDate: "2026-06-18",
    notes: "Offer received! Reviewing terms. Deadline to respond: June 25th",
  },

  // === Rejected at Resume ===
  {
    company: "Apple",
    position: "Program Manager, Services",
    url: "https://apple.com/careers/pm-services",
    stageStatuses: { Resume: "Rejected" },
    rejectionReason: "No explanation provided",
    lastContactDate: "2026-06-05",
  },
  {
    company: "Meta",
    position: "Technical Program Manager",
    url: "https://meta.com/careers/tpm",
    stageStatuses: { Resume: "Rejected" },
    rejectionReason: "Country location",
    rejectionComment: "Position requires US residency",
    lastContactDate: "2026-06-03",
  },
  {
    company: "Netflix",
    position: "Senior PM, Content Platform",
    url: "https://netflix.com/careers/sr-pm",
    stageStatuses: { Resume: "Rejected" },
    rejectionReason: "Requirement mismatch",
    rejectionComment: "Looking for 10+ years specifically in media",
    lastContactDate: "2026-06-07",
  },

  // === Rejected at HR ===
  {
    company: "Airbnb",
    position: "Project Manager, Trust & Safety",
    url: "https://airbnb.com/careers/pm-trust",
    stageStatuses: { Resume: "Passed", "HR Interview": "Rejected" },
    rejectionReason: "Found another candidate earlier",
    hrName: "Rachel Kim",
    lastContactDate: "2026-06-09",
  },
  {
    company: "Uber",
    position: "Technical PM, Rides",
    url: "https://uber.com/careers/tpm-rides",
    stageStatuses: { Resume: "Passed", "HR Interview": "Rejected" },
    rejectionReason: "Decided to move with another candidate",
    lastContactDate: "2026-06-11",
  },

  // === Rejected at Technical ===
  {
    company: "Bolt",
    position: "Delivery Manager",
    url: "https://bolt.eu/careers/dm",
    stageStatuses: { Resume: "Passed", "HR Interview": "Passed", "Technical Interview": "Rejected" },
    rejectionReason: "Requirement mismatch",
    rejectionComment: "Expected stronger system design answers",
    hrName: "Kati Mets",
    communicationChannel: "Email",
    lastContactDate: "2026-06-13",
  },

  // === Withdrawn by candidate ===
  {
    company: "Oracle",
    position: "Program Manager",
    url: "https://oracle.com/careers/pm",
    stageStatuses: { Resume: "Passed", "HR Interview": "Rejected" },
    rejectionReason: "Withdrawn by candidate",
    rejectionComment: "Decided not to proceed — too corporate culture",
    lastContactDate: "2026-06-06",
  },
];

async function main() {
  // 1) Find or verify user
  let { data: user } = await sb.from("users").select("id").eq("email", EMAIL).single();
  if (!user) {
    console.log(`User ${EMAIL} not found — creating...`);
    const { data: newUser, error } = await sb
      .from("users")
      .insert({ email: EMAIL, name: "Viktoriia Z" })
      .select("id")
      .single();
    if (error) throw error;
    user = newUser;
    console.log(`  Created user ${user!.id}`);
  } else {
    console.log(`User found: ${user.id}`);
  }

  // 2) Get pipeline
  const { data: pipeline } = await sb
    .from("pipelines")
    .select("id")
    .eq("user_id", user!.id)
    .single();
  if (!pipeline) throw new Error("No pipeline for user");

  const { data: stages } = await sb
    .from("pipeline_stages")
    .select("id, name, order_idx, type")
    .eq("pipeline_id", pipeline.id)
    .order("order_idx");
  if (!stages || stages.length === 0) throw new Error("No stages");

  const stageByName = Object.fromEntries(stages.map((s) => [s.name, s]));
  const rejectedStage = stages.find((s) => s.type === "aggregator");
  const todoStage = stages.find((s) => s.name === "To-do");

  // 3) Delete existing applications for this user (fresh seed)
  const { count: existing } = await sb
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);
  if ((existing ?? 0) > 0) {
    console.log(`  Deleting ${existing} existing applications...`);
    await sb.from("applications").delete().eq("user_id", user!.id);
  }

  // 4) Insert apps
  console.log(`\nInserting ${APPS.length} applications...`);
  for (const app of APPS) {
    // Build stage_statuses with real stage IDs
    const stageStatusesDb: Record<string, string | null> = {};
    for (const [stageName, substatus] of Object.entries(app.stageStatuses)) {
      const stage = stageByName[stageName];
      if (stage) stageStatusesDb[stage.id] = substatus;
    }

    // Resolve canonical position
    let currentStageId: string;
    let rejectedAtStageId: string | null = null;

    // Check if any stage has "Rejected"
    const rejectedEntry = Object.entries(stageStatusesDb).find(
      ([, v]) => v === "Rejected"
    );
    if (rejectedEntry && rejectedStage) {
      currentStageId = rejectedStage.id;
      rejectedAtStageId = rejectedEntry[0];
    } else {
      // Advanced wins: highest-order with non-null
      const setStages = stages
        .filter((s) => s.type === "normal" && stageStatusesDb[s.id] != null)
        .sort((a, b) => b.order_idx - a.order_idx);
      if (setStages.length > 0) {
        currentStageId = setStages[0].id;
      } else {
        currentStageId = todoStage!.id;
      }
    }

    const today = new Date().toISOString().split("T")[0];

    const { error } = await sb.from("applications").insert({
      user_id: user!.id,
      company_name: app.company,
      position: app.position,
      url: app.url,
      stage_statuses: stageStatusesDb,
      current_stage_id: currentStageId,
      rejected_at_stage_id: rejectedAtStageId,
      rejection_reason: app.rejectionReason ?? null,
      rejection_comment: app.rejectionComment ?? null,
      hr_name: app.hrName ?? null,
      communication_channel: app.communicationChannel ?? null,
      contact_details: app.contactDetails ?? null,
      salary: app.salary ?? null,
      conditions: app.conditions ?? null,
      notes: app.notes ?? null,
      last_contact_date: app.lastContactDate ?? today,
    });

    if (error) {
      console.error(`  ✗ ${app.company}: ${error.message}`);
    } else {
      console.log(`  ✓ ${app.company} — ${app.position}`);
    }
  }

  // 5) Summary
  const { count: total } = await sb
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);
  console.log(`\nDone! ${total} applications for ${EMAIL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
