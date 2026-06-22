/**
 * Скрипт для імпорту даних з CSV файлу в Supabase
 * 
 * Використання:
 * 1. Встановіть: npm install csv-parser
 * 2. Налаштуйте .env.local
 * 3. Запустіть: npx tsx scripts/import-csv.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Мапінг статусів з CSV
const statusMapping: { [key: string]: string } = {
  'Відмова': 'Відмова',
  'Надіслала': 'Надіслала',
  'Зацікавило': 'Зацікавило',
  'відповіді не було і не буде': 'відповіді не було і не буде',
};

async function importCSV(csvPath: string, userEmail: string) {
  // Отримуємо або створюємо користувача
  let { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email: userEmail,
        name: userEmail.split('@')[0],
      })
      .select('id')
      .single();
    user = newUser;
  }

  if (!user) {
    console.error('Не вдалося створити користувача');
    return;
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isFirstLine = true;
  let importedCount = 0;

  for await (const line of rl) {
    // Пропускаємо заголовок
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    // Парсимо CSV (проста версія, може не працювати з комами в значеннях)
    const parts = line.split(',');
    
    if (parts.length < 2) continue;

    const companyName = parts[0]?.trim();
    const position = parts[1]?.trim();
    const url = parts[2]?.trim();
    const appliedDate = parts[3]?.trim();
    const resumeStatus = parts[4]?.trim();
    const aiScreening = parts[5]?.trim();
    const hrInterview = parts[6]?.trim();
    const testTask = parts[7]?.trim();
    const technicalInterview = parts[8]?.trim();
    const finalInterview = parts[9]?.trim();
    const rejectionReason = parts[10]?.trim();
    const comments = parts[11]?.trim();
    const conditions = parts[12]?.trim();
    const communicationChannel = parts[13]?.trim();
    const hrContacts = parts[14]?.trim();

    if (!companyName || !position) continue;

    // Визначаємо статус
    let status = 'Надіслала';
    if (resumeStatus && statusMapping[resumeStatus]) {
      status = statusMapping[resumeStatus];
    }

    try {
      const { error } = await supabase.from('applications').insert({
        user_id: user.id,
        company_name: companyName,
        position: position,
        url: url || null,
        applied_date: appliedDate || null,
        status: status,
        resume_status: resumeStatus || null,
        ai_screening: aiScreening || null,
        hr_interview: hrInterview || null,
        test_task: testTask || null,
        technical_interview: technicalInterview || null,
        final_interview: finalInterview || null,
        rejection_reason: rejectionReason || null,
        comments: comments || null,
        conditions: conditions || null,
        communication_channel: communicationChannel || null,
        hr_contacts: hrContacts || null,
      });

      if (!error) {
        importedCount++;
        console.log(`✓ Імпортовано: ${companyName} - ${position}`);
      } else {
        console.error(`✗ Помилка: ${companyName} - ${error.message}`);
      }
    } catch (err) {
      console.error(`✗ Помилка при імпорті: ${err}`);
    }
  }

  console.log(`\n✅ Імпортовано ${importedCount} заявок`);
}

// Використання
const csvPath = process.argv[2] || '../Пошук роботи 2026 - Sheet1.csv';
const userEmail = process.argv[3] || 'your-email@gmail.com';

console.log(`Імпорт з: ${csvPath}`);
console.log(`Користувач: ${userEmail}\n`);

importCSV(csvPath, userEmail)
  .then(() => console.log('Імпорт завершено'))
  .catch(err => console.error('Помилка:', err));
