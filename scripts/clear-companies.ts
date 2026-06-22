import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Завантаження змінних середовища
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Налаштування Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearCompanies() {
  try {
    console.log('🗑️  Очищення таблиці companies...');
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Видаляємо всі записи
    
    if (error) {
      console.error('❌ Помилка при очищенні:', error);
      process.exit(1);
    }
    
    console.log('✅ Таблицю companies успішно очищено!');
    
  } catch (error) {
    console.error('💥 Критична помилка:', error);
    process.exit(1);
  }
}

// Запуск
clearCompanies();
