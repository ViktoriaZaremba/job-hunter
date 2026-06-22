/**
 * Скрипт для перевірки доступності careers посилань
 * 
 * Використання:
 * node scripts/check-links.js
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Читаємо CSV файл
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const companies = [];
  
  // Пропускаємо header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 2) {
      companies.push({
        name: parts[0] || 'Unknown',
        url: parts[1],
        type: parts[2] || 'Unknown'
      });
    }
  }
  
  return companies;
}

// Перевіряємо доступність URL
function checkURL(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        method: 'HEAD',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      };
      
      const req = protocol.request(url, options, (res) => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          redirected: res.statusCode >= 300 && res.statusCode < 400
        });
      });
      
      req.on('error', () => {
        resolve({ success: false, status: 0, error: true });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, status: 0, timeout: true });
      });
      
      req.end();
    } catch (error) {
      resolve({ success: false, status: 0, invalid: true });
    }
  });
}

// Затримка між запитами
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkAllLinks() {
  console.log('🔍 Перевірка посилань з CSV файлу...\n');
  
  const csvPath = '../../companies list.csv';
  const companies = readCSV(csvPath);
  
  console.log(`📊 Знайдено ${companies.length} компаній\n`);
  console.log('Початок перевірки (це може зайняти ~${Math.round(companies.length * 1.5 / 60)} хвилин)...\n');
  
  const results = {
    working: [],
    broken: [],
    timeout: [],
    invalid: [],
    redirected: []
  };
  
  let checked = 0;
  
  for (const company of companies) {
    checked++;
    
    if (checked % 10 === 0) {
      console.log(`⏳ Перевірено ${checked}/${companies.length}...`);
    }
    
    const result = await checkURL(company.url);
    
    if (result.success) {
      results.working.push(company);
      // console.log(`✅ ${company.name}`);
    } else if (result.redirected) {
      results.redirected.push(company);
      console.log(`🔄 ${company.name} - redirect`);
    } else if (result.timeout) {
      results.timeout.push(company);
      console.log(`⏱️  ${company.name} - timeout`);
    } else if (result.invalid) {
      results.invalid.push(company);
      console.log(`❌ ${company.name} - invalid URL`);
    } else {
      results.broken.push(company);
      console.log(`❌ ${company.name} - ${result.status || 'error'}`);
    }
    
    // Rate limiting - 1.5 секунди між запитами
    await sleep(1500);
  }
  
  // Виводимо підсумок
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТИ ПЕРЕВІРКИ');
  console.log('='.repeat(60) + '\n');
  
  console.log(`✅ Працюючі: ${results.working.length}`);
  console.log(`🔄 Redirects: ${results.redirected.length}`);
  console.log(`⏱️  Timeout: ${results.timeout.length}`);
  console.log(`❌ Зламані: ${results.broken.length}`);
  console.log(`❌ Невалідні URL: ${results.invalid.length}`);
  console.log(`\n📊 Всього: ${companies.length}`);
  
  // Зберігаємо результати
  const report = {
    checkedAt: new Date().toISOString(),
    total: companies.length,
    summary: {
      working: results.working.length,
      redirected: results.redirected.length,
      timeout: results.timeout.length,
      broken: results.broken.length,
      invalid: results.invalid.length
    },
    details: results
  };
  
  fs.writeFileSync(
    'links-check-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Звіт збережено в links-check-report.json');
  
  // Виводимо проблемні посилання
  if (results.broken.length > 0) {
    console.log('\n❌ ЗЛАМАНІ ПОСИЛАННЯ:');
    console.log('='.repeat(60));
    results.broken.forEach(company => {
      console.log(`${company.name} - ${company.url}`);
    });
  }
  
  if (results.timeout.length > 0) {
    console.log('\n⏱️  TIMEOUT (можливо працюють):');
    console.log('='.repeat(60));
    results.timeout.forEach(company => {
      console.log(`${company.name} - ${company.url}`);
    });
  }
  
  if (results.invalid.length > 0) {
    console.log('\n❌ НЕВАЛІДНІ URL:');
    console.log('='.repeat(60));
    results.invalid.forEach(company => {
      console.log(`${company.name} - ${company.url}`);
    });
  }
}

// Запуск
checkAllLinks().catch(console.error);
