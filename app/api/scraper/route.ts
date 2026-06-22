import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import * as cheerio from "cheerio";
import { scrapeCompanyWithAI } from "@/lib/ai-scraper";
import { evaluateJob, keywordMatches } from "@/lib/search-filter";
import {
  getProfileForScrape,
  touchLastUsed,
} from "@/lib/search-profiles-store";
import { SearchProfile } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { companyIds, useAI = true, profileId } = body;

  if (!companyIds || companyIds.length === 0) {
    return new Response(JSON.stringify({ error: "No companies specified" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve current user → profile
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
        const { data: companies, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .in("id", companyIds);

        if (companiesError) throw companiesError;

        const totalCompanies = companies?.length || 0;
        let totalJobsFound = 0;
        let companiesProcessed = 0;
        let aiUsedCount = 0;

        sendEvent({
          type: "start",
          total: totalCompanies,
          profile: { id: profile.id, name: profile.name },
        });

        for (const company of companies || []) {
          try {
            sendEvent({
              type: "progress",
              current: companiesProcessed + 1,
              total: totalCompanies,
              companyName: company.name,
              status: "scraping",
            });

            // 1) Standard parser using profile's target keywords
            let candidates = await scrapeCompanyJobs(company, profile);

            // 2) AI fallback if standard returned nothing
            if (candidates.length === 0 && useAI && process.env.OPENAI_API_KEY) {
              sendEvent({
                type: "progress",
                current: companiesProcessed + 1,
                total: totalCompanies,
                companyName: company.name,
                status: "ai",
              });
              candidates = await scrapeCompanyWithAI(
                company.name,
                company.careers_url,
                profile
              );
              if (candidates.length > 0) aiUsedCount++;
            }

            // 3) Apply profile filter (post-extract). evaluateJob is the
            // source of truth for both standard and AI results.
            for (const cand of candidates) {
              const result = evaluateJob(cand, profile);
              if (!result.keep) continue;

              let fullUrl = cand.url;
              if (fullUrl && !fullUrl.startsWith("http")) {
                try {
                  const baseUrl = new URL(company.careers_url);
                  if (fullUrl.startsWith("/")) {
                    fullUrl = `${baseUrl.protocol}//${baseUrl.host}${fullUrl}`;
                  } else if (fullUrl.startsWith("#")) {
                    fullUrl = company.careers_url;
                  }
                } catch {
                  fullUrl = company.careers_url;
                }
              }

              const isRelevant = result.matchedKeywords.length > 0;

              const { error: insertError } = await supabase
                .from("jobs")
                .upsert(
                  {
                    company_id: company.id,
                    company_name: company.name,
                    title: cand.title,
                    url: fullUrl || company.careers_url,
                    description: cand.description ?? "",
                    experience: "",
                    is_relevant: isRelevant,
                    matched_keywords: result.matchedKeywords,
                  },
                  { onConflict: "url", ignoreDuplicates: false }
                );

              if (!insertError) {
                totalJobsFound++;
                sendEvent({
                  type: "job_found",
                  job: {
                    companyName: company.name,
                    title: cand.title,
                    url: fullUrl || company.careers_url,
                    matchedKeywords: result.matchedKeywords,
                    isRelevant,
                  },
                  totalFound: totalJobsFound,
                });
              }
            }

            companiesProcessed++;
            sendEvent({
              type: "company_complete",
              companyName: company.name,
              jobsFound: candidates.length,
              current: companiesProcessed,
              total: totalCompanies,
            });
          } catch (error: any) {
            sendEvent({
              type: "error",
              companyName: company.name,
              error: error.message,
            });
          }
        }

        // Stamp last_used_at on the profile
        await touchLastUsed(profile.id).catch(() => {});

        sendEvent({
          type: "complete",
          jobsFound: totalJobsFound,
          companiesScraped: companiesProcessed,
          aiUsed: aiUsedCount,
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
 * Standard scraper: walks all <a> on the careers page, picks the ones whose
 * link text matches a target keyword from the profile. Final filtering
 * (excluded / preferred) is applied later in evaluateJob.
 */
async function scrapeCompanyJobs(
  company: any,
  profile: SearchProfile
): Promise<{ title: string; url: string; description?: string }[]> {
  const jobs: { title: string; url: string }[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(company.careers_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return jobs;

    const html = await response.text();
    const $ = cheerio.load(html);
    const allLinks = $("a").toArray();

    for (const link of allLinks) {
      const $link = $(link);
      const text = $link.text().trim();
      const href = $link.attr("href");

      if (!text || !href) continue;

      // Whole-word target match (avoids "PM" matching inside "development")
      const hasTarget = profile.targetKeywords.some((k) =>
        keywordMatches(text, k)
      );
      if (!hasTarget) continue;

      let fullUrl = href;
      if (href.startsWith("/")) {
        try {
          const baseUrl = new URL(company.careers_url);
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
        } catch {
          continue;
        }
      } else if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        continue;
      }

      // Deduplicate
      if (jobs.some((j) => j.url === fullUrl || j.title === text)) continue;
      jobs.push({ title: text, url: fullUrl });
    }
  } catch {
    /* swallow */
  }
  return jobs;
}
