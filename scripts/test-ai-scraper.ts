import { scrapeCompanyWithAI } from '../lib/ai-scraper';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function test() {
  console.log('🚀 Testing AI Scraper\n');
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('❌ Please set OPENAI_API_KEY in .env.local');
    console.log('\n📝 Steps:');
    console.log('1. Go to https://platform.openai.com/api-keys');
    console.log('2. Create a new API key');
    console.log('3. Add it to .env.local: OPENAI_API_KEY=sk-...');
    return;
  }

  const testCompanies = [
    { name: 'Cloudfresh', url: 'https://cloudfresh.com/en/careers/' },
    // Add more if you want to test
  ];

  for (const company of testCompanies) {
    const jobs = await scrapeCompanyWithAI(company.name, company.url);
    
    console.log(`\n📊 Results for ${company.name}:`);
    if (jobs.length === 0) {
      console.log('  No jobs found');
    } else {
      jobs.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title}`);
        console.log(`     ${job.url}`);
      });
    }
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

test();
