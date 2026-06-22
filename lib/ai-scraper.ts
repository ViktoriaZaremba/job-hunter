import { chromium } from "playwright";
import OpenAI from "openai";
import { SearchProfile } from "@/types";

interface ScrapedJob {
  title: string;
  url: string;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * AI fallback scraper. Uses GPT to identify job listings on a careers page,
 * guided by the user's search profile. The post-extract filter (evaluateJob)
 * is the source of truth — this prompt just helps focus the AI on candidates.
 */
export async function scrapeCompanyWithAI(
  companyName: string,
  careersUrl: string,
  profile: SearchProfile
): Promise<ScrapedJob[]> {
  console.log(`🤖 AI scraping ${companyName} (profile: ${profile.name})`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });
    const page = await context.newPage();
    await page.goto(careersUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    const pageText = await page.evaluate(() => document.body.innerText);
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
      return anchors
        .map((a) => ({ text: a.innerText.trim(), href: a.href }))
        .filter((link) => link.text && link.href);
    });
    await browser.close();

    console.log(`  📄 Page text length: ${pageText.length} chars`);
    console.log(`  🔗 Found ${links.length} links`);

    const targetList = profile.targetKeywords.map((k) => `- ${k}`).join("\n");
    const excludeList =
      profile.excludedKeywords.length > 0
        ? profile.excludedKeywords.map((k) => `- ${k}`).join("\n")
        : "(none)";

    const prompt = `You are a job scraper. Analyze this careers page content and extract job listings that match these criteria.

INCLUDE jobs whose title contains any of:
${targetList}

EXCLUDE jobs whose title or description contains any of:
${excludeList}

Page text (first 4000 chars):
${pageText.substring(0, 4000)}

Links on page:
${JSON.stringify(links.slice(0, 50), null, 2)}

Return ONLY a JSON object with key "jobs" mapping to an array:
{ "jobs": [ { "title": "...", "url": "..." } ] }

Rules:
1. Only include jobs whose TITLE contains at least one INCLUDE keyword (case-insensitive, partial OK).
2. Exclude any job containing an EXCLUDE keyword.
3. URLs must be complete (not relative paths).
4. If no relevant jobs found, return { "jobs": [] }.
5. Return ONLY valid JSON. No commentary.`;

    const openai = getOpenAIClient();
    console.log(`  🧠 Asking GPT-4o-mini to analyze...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.log("  ❌ No response from GPT");
      return [];
    }

    try {
      const parsed = JSON.parse(response);
      const jobs = Array.isArray(parsed) ? parsed : parsed.jobs ?? [];
      console.log(`  ✅ AI returned ${jobs.length} jobs`);
      return jobs;
    } catch {
      console.log("  ❌ Failed to parse GPT response");
      return [];
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}
