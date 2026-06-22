import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Завантаження змінних середовища
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Налаштування Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Company {
  name: string;
  careersUrl: string;
}

async function importCompanies() {
  try {
    console.log('🚀 Початок імпорту компаній...');
    
    // Читаємо JSON файл
    const jsonPath = path.join(process.cwd(), 'data', 'maximum-companies-list.json');
    console.log(`📂 Читаємо файл: ${jsonPath}`);
    
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const companies: Company[] = JSON.parse(fileContent);
    
    console.log(`📊 Знайдено ${companies.length} компаній`);
    
    // Підготовка даних для вставки
    const companiesToInsert = companies
      .filter(company => company.name && company.careersUrl)
      .map(company => ({
        name: company.name,
        careers_url: company.careersUrl
      }));
    
    console.log(`✅ Підготовлено ${companiesToInsert.length} компаній для імпорту`);
    
    // Вставка даних порціями (batch insert)
    const batchSize = 50;
    let imported = 0;
    let skipped = 0;
    
    for (let i = 0; i < companiesToInsert.length; i += batchSize) {
      const batch = companiesToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('companies')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Помилка при імпорті batch ${i / batchSize + 1}:`, error.message);
        skipped += batch.length;
      } else {
        imported += batch.length;
        console.log(`✨ Імпортовано batch ${i / batchSize + 1} (${batch.length} компаній)`);
      }
    }
    
    console.log('\n📈 Результати імпорту:');
    console.log(`   ✅ Успішно імпортовано: ${imported} компаній`);
    console.log(`   ⚠️  Пропущено: ${skipped} компаній`);
    console.log('🎉 Імпорт завершено!');
    
  } catch (error) {
    console.error('💥 Критична помилка:', error);
    process.exit(1);
  }
}

// Запуск
importCompanies();
