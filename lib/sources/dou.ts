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
    // Parse DOU title format: "Position в Company, City" → use only position part
    const initialFiltered = allItems.filter((item) => {
      const parsed = this.parseDouTitle(item.title);
      return profile.targetKeywords.some((k) => keywordMatches(parsed.position, k));
    });

    // Check excluded on title (position part only)
    const afterExclude = initialFiltered.filter((item) => {
      const parsed = this.parseDouTitle(item.title);
      return !profile.excludedKeywords.some((k) => keywordMatches(parsed.position, k));
    });

    onProgress({
      type: "progress",
      source: "dou",
      message: `${afterExclude.length} match target keywords after initial filter`,
      current: 0,
      total: afterExclude.length,
    });

    // Step 3 & 4: No page fetching — DOU blocks automated requests.
    // Use RSS data only (title parsed into position + company, RSS description).
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

      const parsed = this.parseDouTitle(item.title);

      candidates.push({
        title: parsed.position,
        url: item.link,
        description: item.description || "",
        companyName: parsed.company,
        source: "dou",
      });
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

  /**
   * Parse DOU RSS title format:
   *   "Position в Company, City, Remote"
   *   "Position в Company"
   * Returns { position, company }
   */
  private parseDouTitle(title: string): { position: string; company: string } {
    // Match: everything before " в " = position, everything after until comma = company
    const match = title.match(/^(.+?)\s+в\s+(.+?)(?:,\s*.+)?$/u);
    if (match) {
      return { position: match[1].trim(), company: match[2].trim() };
    }
    // Fallback: whole title is position, no company
    return { position: title.trim(), company: "" };
  }
}
