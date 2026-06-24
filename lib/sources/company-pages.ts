import * as cheerio from "cheerio";
import { SearchProfile } from "@/types";
import { keywordMatches } from "@/lib/search-filter";
import { scrapeCompanyWithAI } from "@/lib/ai-scraper";
import { supabase } from "@/lib/supabase";
import { JobCandidate, JobSource, SourceOptions, SourceProgressEvent } from "./types";

/**
 * CompanyPagesSource — scrapes career pages of user-selected companies.
 * Uses standard HTML parser (cheerio) first, AI fallback if nothing found.
 */
export class CompanyPagesSource implements JobSource {
  name = "company";

  async search(
    profile: SearchProfile,
    options: SourceOptions,
    onProgress: (event: SourceProgressEvent) => void
  ): Promise<JobCandidate[]> {
    const companyIds = options.companyIds ?? [];
    if (companyIds.length === 0) return [];

    const { data: companies } = await supabase
      .from("companies")
      .select("*")
      .in("id", companyIds);

    if (!companies || companies.length === 0) return [];

    const allCandidates: JobCandidate[] = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];

      onProgress({
        type: "progress",
        source: "company",
        companyName: company.name,
        current: i + 1,
        total: companies.length,
        mode: "standard",
      });

      // Standard parser
      let candidates = await this.scrapeStandard(company, profile);

      // AI fallback if standard yielded nothing
      if (candidates.length === 0 && process.env.OPENAI_API_KEY) {
        onProgress({
          type: "progress",
          source: "company",
          companyName: company.name,
          current: i + 1,
          total: companies.length,
          mode: "ai",
        });

        try {
          const aiResults = await scrapeCompanyWithAI(
            company.name,
            company.careers_url,
            profile
          );
          candidates = aiResults.map((r) => ({
            title: r.title,
            url: r.url,
            companyName: company.name,
            source: "company" as const,
          }));
        } catch (e: any) {
          onProgress({
            type: "warning",
            source: "company",
            message: `AI fallback failed for ${company.name}: ${e.message}`,
          });
        }
      }

      // Normalize URLs
      for (const cand of candidates) {
        if (cand.url && !cand.url.startsWith("http")) {
          try {
            const baseUrl = new URL(company.careers_url);
            if (cand.url.startsWith("/")) {
              cand.url = `${baseUrl.protocol}//${baseUrl.host}${cand.url}`;
            }
          } catch {
            cand.url = company.careers_url;
          }
        }
        cand.companyName = company.name;
      }

      allCandidates.push(...candidates);
    }

    return allCandidates;
  }

  private async scrapeStandard(
    company: any,
    profile: SearchProfile
  ): Promise<JobCandidate[]> {
    const jobs: JobCandidate[] = [];
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

        const hasTarget = profile.targetKeywords.some((k) =>
          keywordMatches(text, k)
        );
        if (!hasTarget) continue;

        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          continue;
        }

        let fullUrl = href;
        if (href.startsWith("/")) {
          try {
            const baseUrl = new URL(company.careers_url);
            fullUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
          } catch {
            continue;
          }
        }

        if (jobs.some((j) => j.url === fullUrl || j.title === text)) continue;
        jobs.push({ title: text, url: fullUrl, companyName: company.name, source: "company" });
      }
    } catch {
      /* swallow network errors */
    }
    return jobs;
  }
}
