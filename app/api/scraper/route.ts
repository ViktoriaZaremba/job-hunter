import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { evaluateJob } from "@/lib/search-filter";
import {
  getProfileForScrape,
  touchLastUsed,
} from "@/lib/search-profiles-store";
import { SearchProfile } from "@/types";
import {
  CompanyPagesSource,
  DouSource,
  JobCandidate,
  SourceProgressEvent,
} from "@/lib/sources";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const {
    companyIds = [],
    profileId,
    sources = { companyPages: true, dou: false, djinni: false },
  } = body;

  // Resolve user
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve profile
  let profile: SearchProfile;
  try {
    profile = await getProfileForScrape(user.id, profileId);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const activeSources: string[] = [];
        if (sources.companyPages && companyIds.length > 0) activeSources.push("company");
        if (sources.dou) activeSources.push("dou");

        sendEvent({
          type: "start",
          sources: activeSources,
          profile: { id: profile.id, name: profile.name },
        });

        let totalFound = 0;
        let companyJobsFound = 0;
        let douJobsFound = 0;
        let aiFallbackUsed = 0;

        // ========== Company Pages ==========
        if (sources.companyPages && companyIds.length > 0) {
          const source = new CompanyPagesSource();

          const candidates = await source.search(
            profile,
            { companyIds },
            (event: SourceProgressEvent) => {
              if (event.type === "progress") {
                sendEvent({
                  type: "progress",
                  source: "company",
                  companyName: event.companyName,
                  current: event.current,
                  total: event.total,
                  status: event.mode === "ai" ? "AI analysis" : "searching",
                });
                if (event.mode === "ai") aiFallbackUsed++;
              } else if (event.type === "warning") {
                sendEvent({
                  type: "warning",
                  source: "company",
                  message: event.message,
                });
              }
            }
          );

          // Filter + save
          for (const cand of candidates) {
            const saved = await filterAndSave(cand, profile, sendEvent);
            if (saved) {
              companyJobsFound++;
              totalFound++;
              sendEvent({
                type: "job_found",
                source: "company",
                job: {
                  companyName: cand.companyName,
                  title: cand.title,
                  url: cand.url,
                },
                totalFound,
              });
            }
          }
        }

        // ========== DOU ==========
        if (sources.dou) {
          const source = new DouSource();

          let douCandidates: JobCandidate[] = [];
          try {
            douCandidates = await source.search(
              profile,
              {},
              (event: SourceProgressEvent) => {
                sendEvent({
                  type: "progress",
                  source: "dou",
                  current: event.current,
                  total: event.total,
                  status: event.message || "scanning",
                });
              }
            );
          } catch (e: any) {
            sendEvent({
              type: "warning",
              source: "dou",
              message: `Failed to fetch DOU: ${e.message}`,
            });
          }

          // Filter + save
          for (const cand of douCandidates) {
            const saved = await filterAndSave(cand, profile, sendEvent);
            if (saved) {
              douJobsFound++;
              totalFound++;
              sendEvent({
                type: "job_found",
                source: "dou",
                job: {
                  companyName: cand.companyName,
                  title: cand.title,
                  url: cand.url,
                },
                totalFound,
              });
            }
          }
        }

        // ========== Stamp lastUsedAt ==========
        await touchLastUsed(profile.id).catch(() => {});

        sendEvent({
          type: "complete",
          found: totalFound,
          companyJobs: companyJobsFound,
          douJobs: douJobsFound,
          aiFallbackUsed,
        });

        controller.close();
      } catch (error: any) {
        sendEvent({ type: "error", error: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Run evaluateJob on a candidate, UPSERT if it passes.
 * Returns true if the job was saved.
 */
async function filterAndSave(
  cand: JobCandidate,
  profile: SearchProfile,
  _sendEvent: (data: any) => void
): Promise<boolean> {
  const result = evaluateJob(
    { title: cand.title, description: cand.description },
    profile
  );
  if (!result.keep) return false;

  const isRelevant = result.matchedKeywords.length > 0;

  const { error } = await supabase.from("jobs").upsert(
    {
      company_name: cand.companyName || "",
      title: cand.title,
      url: cand.url,
      description: cand.description ?? "",
      experience: "",
      is_relevant: isRelevant,
      matched_keywords: result.matchedKeywords,
      source: cand.source,
    },
    { onConflict: "url", ignoreDuplicates: false }
  );

  return !error;
}
