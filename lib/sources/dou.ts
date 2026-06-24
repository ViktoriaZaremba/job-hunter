import * as cheerio from "cheerio";
import { SearchProfile } from "@/types";
import { keywordMatches } from "@/lib/search-filter";
import { JobCandidate, JobSource, SourceOptions, SourceProgressEvent } from "./types";

const DOU_RSS_URL = "https://jobs.dou.ua/vacancies/feeds/";
const MAX_AGE_DAYS = 30;

/**
 * Known DOU categories. Target keywords from the profile are matched
 * against this list to request category-specific RSS feeds.
 * This way any profession (not just PM) gets focused results.
 */
const DOU_CATEGORIES = [
  ".NET", "AI/ML", "Analyst", "Android", "Architect", "Automotive",
  "Blockchain", "C/C++", "Data Engineer", "Data Science", "DBA",
  "Design", "DevOps", "Embedded", "Engineering Manager", "Erlang",
  "ERP/CRM", "Finance", "Flutter", "Front End", "Golang", "Hardware",
  "HR", "iOS/macOS", "Java", "Legal", "Marketing", "No-code", "Node.js",
  "Office Manager", "Other", "PHP", "Procurement", "Product Manager",
  "Project Manager", "Python", "QA", "React Native", "Ruby", "Rust",
  "Sales", "Salesforce", "SAP", "Scala", "Scrum Master", "Security",
  "SEO", "Support", "SysAdmin", "Technical Writer", "Unity",
  "Unreal Engine",
];

/**
 * Map target keywords to DOU categories.
 * A keyword matches a category if they share a case-insensitive substring match.
 * Returns deduplicated categories to query.
 */
function resolveDouCategories(targetKeywords: string[]): string[] {
  const matched = new Set<string>();
  for (const keyword of targetKeywords) {
    const kw = keyword.toLowerCase();
    for (const cat of DOU_CATEGORIES) {
      if (cat.toLowerCase().includes(kw) || kw.includes(cat.toLowerCase())) {
        matched.add(cat);
      }
    }
  }
  // If nothing matched, fall back to generic (no category filter = all)
  if (matched.size === 0) return [""];
  return [...matched];
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

/**
 * DouSource — fetches DOU RSS feed, filters by profile keywords,
 * then fetches individual vacancy pages for full description.
 * No Playwright. No AI. Pure cheerio.
 */
export class DouSource implements JobSource {
  name = "dou";

  async search(
    profile: SearchProfile,
    _options: SourceOptions,
    onProgress: (event: SourceProgressEvent) => void
  ): Promise<JobCandidate[]> {
    // Resolve which DOU categories to query from target keywords
    const categories = resolveDouCategories(profile.targetKeywords);

    onProgress({
      type: "progress",
      source: "dou",
      message: `Fetching DOU RSS (${categories.length} categor${categories.length === 1 ? "y" : "ies"}: ${categories.join(", ") || "all"})...`,
      current: 0,
      total: 0,
    });

    // Step 1: Fetch RSS for each category
    let allItems: RssItem[] = [];
    for (const category of categories) {
      try {
        const items = await this.fetchRss(category);
        allItems.push(...items);
      } catch (e: any) {
        onProgress({
          type: "warning",
          source: "dou",
          message: `Failed to fetch DOU RSS for category "${category}": ${e.message}`,
        });
      }
    }

    // Deduplicate by link
    const seen = new Set<string>();
    allItems = allItems.filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

    // Filter by date (last 30 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    allItems = allItems.filter((item) => {
      const d = new Date(item.pubDate);
      return !isNaN(d.getTime()) && d >= cutoff;
    });

    onProgress({
      type: "progress",
      source: "dou",
      message: `Found ${allItems.length} vacancies in last 30 days`,
      current: 0,
      total: allItems.length,
    });

    // Step 2: Initial filter on title (target keywords only)
    const initialFiltered = allItems.filter((item) =>
      profile.targetKeywords.some((k) => keywordMatches(item.title, k))
    );

    // Check excluded on title
    const afterExclude = initialFiltered.filter(
      (item) =>
        !profile.excludedKeywords.some((k) => keywordMatches(item.title, k))
    );

    onProgress({
      type: "progress",
      source: "dou",
      message: `${afterExclude.length} match target keywords after initial filter`,
      current: 0,
      total: afterExclude.length,
    });

    // Step 3 & 4: Fetch vacancy pages for full description
    const candidates: JobCandidate[] = [];

    for (let i = 0; i < afterExclude.length; i++) {
      const item = afterExclude[i];

      onProgress({
        type: "progress",
        source: "dou",
        current: i + 1,
        total: afterExclude.length,
        message: item.title,
      });

      let description = item.description || "";
      let companyName = "";

      try {
        const page = await this.fetchVacancyPage(item.link);
        if (page.description) description = page.description;
        if (page.companyName) companyName = page.companyName;
      } catch {
        // Use RSS description as fallback
      }

      // Full filtering with description will be done by evaluateJob in orchestrator
      candidates.push({
        title: item.title,
        url: item.link,
        description,
        companyName: companyName || this.extractCompanyFromTitle(item.title),
        source: "dou",
      });

      // Small delay to be polite to DOU
      if (i < afterExclude.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return candidates;
  }

  private async fetchRss(category: string = ""): Promise<RssItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const url = category
      ? `${DOU_RSS_URL}?category=${encodeURIComponent(category)}`
      : DOU_RSS_URL;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JobHunterBot/1.0)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`DOU RSS returned ${res.status} for category "${category}"`);

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: RssItem[] = [];

    $("item").each((_, el) => {
      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim() || $(el).find("guid").text().trim();
      const pubDate = $(el).find("pubDate").text().trim();
      const description = $(el).find("description").text().trim();

      if (title && link) {
        items.push({ title, link, pubDate, description });
      }
    });

    return items;
  }

  private async fetchVacancyPage(
    url: string
  ): Promise<{ description: string; companyName: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { description: "", companyName: "" };

    const html = await res.text();
    const $ = cheerio.load(html);

    // DOU vacancy page structure
    const description =
      $(".b-vacancy .vacancy-section .text").text().trim() ||
      $(".vacancy-description").text().trim() ||
      $(".b-typo").text().trim() ||
      "";

    const companyName =
      $(".b-vacancy .info .company").text().trim() ||
      $("a.company").text().trim() ||
      "";

    return {
      description: description.substring(0, 3000), // cap for memory
      companyName,
    };
  }

  /**
   * Fallback: extract company name from DOU title format "Position в Company"
   */
  private extractCompanyFromTitle(title: string): string {
    // DOU titles are often "Position в Company, City" or "Position в Company"
    const match = title.match(/ в (.+?)(?:,|$)/u);
    return match?.[1]?.trim() ?? "";
  }
}
