import * as cheerio from 'cheerio';

// Тестуємо на прикладі однієї компанії
const TEST_URL = 'https://www.grammarly.com/jobs';

const JOB_KEYWORDS = [
  "project manager",
  "delivery manager",
  "scrum master",
  "product manager",
  "pm",
];

async function testScraper() {
  console.log(`🔍 Тестування скрапінгу: ${TEST_URL}\n`);

  try {
    const response = await fetch(TEST_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`❌ Помилка: HTTP ${response.status}`);
      return;
    }

    const html = await response.text();
    console.log(`✅ Сторінка завантажена, розмір: ${html.length} bytes\n`);

    const $ = cheerio.load(html);

    // Спробуємо знайти всі посилання
    console.log('📋 Шукаємо посилання з ключовими словами:\n');

    const allLinks = $('a').toArray();
    console.log(`Всього посилань на сторінці: ${allLinks.length}\n`);

    let foundCount = 0;

    // Пошук по різних селекторах
    const selectors = [
      'a[href*="job"]',
      'a[href*="vacanc"]',
      'a[href*="career"]',
      'a[href*="position"]',
      'a[href*="opening"]',
      'a.job',
      'a.position',
      '[class*="job"]',
      '[class*="position"]',
    ];

    for (const selector of selectors) {
      const elements = $(selector).toArray();
      if (elements.length > 0) {
        console.log(`\n🎯 Знайдено ${elements.length} елементів за селектором: ${selector}`);
        
        elements.slice(0, 5).forEach((el) => {
          const $el = $(el);
          const text = $el.text().trim().substring(0, 100);
          const href = $el.attr('href');
          console.log(`  - "${text}" → ${href}`);
        });
      }
    }

    // Шукаємо по ключовим словам
    console.log('\n\n🔎 Пошук вакансій з ключовими словами:\n');

    for (const link of allLinks) {
      const $link = $(link);
      const text = $link.text().trim().toLowerCase();
      const href = $link.attr('href');

      if (!text || !href) continue;

      // Перевірка на ключові слова
      const hasKeyword = JOB_KEYWORDS.some(keyword => 
        text.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        foundCount++;
        console.log(`✅ #${foundCount}: "${$link.text().trim()}"`);
        console.log(`   URL: ${href}`);
        console.log('');
      }
    }

    console.log(`\n📊 Підсумок: знайдено ${foundCount} потенційних вакансій`);

    // Виведемо структуру сторінки
    console.log('\n\n🏗️  Структура сторінки (основні контейнери):\n');
    
    const containers = [
      'main',
      '[role="main"]',
      '.jobs',
      '.careers',
      '.positions',
      '#jobs',
      '#careers',
      '[class*="job-list"]',
      '[class*="career"]',
      '[id*="job"]',
    ];

    for (const container of containers) {
      const found = $(container);
      if (found.length > 0) {
        console.log(`  ✓ ${container}: ${found.length} елементів`);
      }
    }

    // Збережемо HTML для аналізу
    const fs = await import('fs');
    const path = await import('path');
    const outputPath = path.join(process.cwd(), 'test-scraper-output.html');
    fs.writeFileSync(outputPath, html);
    console.log(`\n💾 HTML збережено в: ${outputPath}`);

  } catch (error) {
    console.error('❌ Помилка:', error);
  }
}

testScraper();
