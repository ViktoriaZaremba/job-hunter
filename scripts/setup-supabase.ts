import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Завантаження змінних середовища
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Налаштування Supabase з SERVICE_ROLE ключем для адміністративних операцій
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabase() {
  try {
    console.log('🔧 Налаштування Supabase...\n');
    
    // Перевірка підключення
    console.log('1️⃣ Перевірка підключення до Supabase...');
    const { data: companies, error: testError } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Помилка підключення:', testError);
      process.exit(1);
    }
    console.log('✅ Підключення успішне\n');
    
    console.log('2️⃣ Відключення Row Level Security...');
    console.log('⚠️  ВАЖЛИВО: Потрібно виконати наступні SQL команди в Supabase SQL Editor:');
    console.log('\n--- КОПІЮЙТЕ ЦЕЙ SQL КОД ---\n');
    
    const sqlCommands = `
-- Відключити RLS для таблиць (для розробки)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- Або створити політики доступу (для продакшну)
-- Політика для users: користувач може керувати своїми даними
CREATE POLICY "Users can manage own data" ON users
  FOR ALL
  USING (auth.uid()::text = id::text);

-- Політика для applications: користувач може керувати своїми заявками
CREATE POLICY "Users can manage own applications" ON applications
  FOR ALL
  USING (auth.uid()::text = user_id::text);

-- Політика для companies: всі можуть читати
CREATE POLICY "Anyone can read companies" ON companies
  FOR SELECT
  USING (true);

-- Політика для jobs: всі можуть читати
CREATE POLICY "Anyone can read jobs" ON jobs
  FOR SELECT
  USING (true);
`;
    
    console.log(sqlCommands);
    console.log('\n--- КІНЕЦЬ SQL КОДУ ---\n');
    
    console.log('📝 Інструкція:');
    console.log('1. Відкрийте https://supabase.com/dashboard/project/wvaussgtznhyouawknbc/sql/new');
    console.log('2. Скопіюйте SQL код вище');
    console.log('3. Вставте в SQL Editor');
    console.log('4. Натисніть "Run" або RUN');
    console.log('5. Поверніться сюди і запустіть додаток знову\n');
    
    console.log('✅ Налаштування завершено!');
    console.log('💡 Після виконання SQL команд, спробуйте додати заявку знову');
    
  } catch (error) {
    console.error('💥 Критична помилка:', error);
    process.exit(1);
  }
}

// Запуск
setupSupabase();
