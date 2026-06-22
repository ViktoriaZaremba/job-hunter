import * as cheerio from 'cheerio';

// Тестуємо Cloudfresh
const TEST_URL = 'https://cloudfresh.com/en/careers/#open-position-wrap';

const JOB_KEYWORDS = [
  "project manager",
  "delivery manager",
  "scrum master",
  "product manager",
  "program manager",
  "technical pm",
];

async function testCloudFresh() {
  console.log(`🔍 Testing: ${TEST_URL}\n`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(TEST_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}`);
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log(`✅ Page loaded, size: ${html.length} bytes\n`);

    // Search for "Project Manager" in the page
    const bodyText = $('body').text();
    const hasProjectManager = bodyText.toLowerCase().includes('project manager');
    
    console.log(`📋 Page contains "Project Manager": ${hasProjectManager ? '✅ YES' : '❌ NO'}\n`);

    // Look for job listings
    console.log('🔍 Looking for job-related elements:\n');

    const selectors = [
      '#open-position-wrap',
      '[class*="job"]',
      '[class*="position"]',
      '[class*="vacancy"]',
      '[class*="career"]',
      'a[href*="job"]',
      'a[href*="position"]',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`  ✓ Found ${elements.length} elements: ${selector}`);
        
        // Show first element content
        const firstEl = elements.first();
        const text = firstEl.text().trim().substring(0, 200);
        console.log(`    Text: ${text}...\n`);
      }
    }

    // Find all links
    console.log('🔗 All links on page:\n');
    const links = $('a').toArray();
    let pmCount = 0;
    
    for (const link of links) {
      const $link = $(link);
      const linkText = $link.text().trim();
      const href = $link.attr('href') || '';
      
      if (linkText.toLowerCase().includes('project') || 
          linkText.toLowerCase().includes('manager') ||
          href.toLowerCase().includes('project') ||
          href.toLowerCase().includes('manager')) {
        pmCount++;
        console.log(`  ${pmCount}. "${linkText}"`);
        console.log(`     href: ${href}`);
        console.log(`     parent: ${$link.parent().attr('class')}\n`);
        
        if (pmCount >= 5) break;
      }
    }

    if (pmCount === 0) {
      console.log('  ❌ No links with "project" or "manager" found\n');
    }

    // Save HTML for analysis
    const fs = await import('fs');
    const outputPath = '/Users/viktoriazaremba/Desktop/job_hunter/job-tracker/cloudfresh-test.html';
    fs.writeFileSync(outputPath, html);
    console.log(`💾 HTML saved to: ${outputPath}`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

testCloudFresh();
