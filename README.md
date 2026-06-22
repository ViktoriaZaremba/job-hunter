# Job Hunter - Трекер пошуку роботи

Веб-додаток для автоматизації пошуку роботи з функціями парсингу вакансій та Kanban трекера заявок.

## 🚀 Функціонал

### 1. Авторизація через Google
- Безпечний вхід через Google OAuth
- Персональний простір для кожного користувача

### 2. Автопарсер вакансій
- Автоматичний збір вакансій з сайтів компаній
- Фільтрація за ключовими словами: Project Manager, Delivery Manager, Scrum Master
- Перевірка досвіду: 3, 4, 5+ років
- Щоденне оновлення вакансій

### 3. Kanban трекер заявок
- Візуалізація статусу заявок у стилі Jira/Trello
- Колонки: Надіслала, Зацікавило, Відмова, Без відповіді
- Drag & Drop переміщення карток
- Детальна інформація про кожну заявку:
  - Етапи співбесід (AI прескринінг, HR, тестове, технічна, фінальна)
  - Коментарі та причини відмови
  - Контакти HR
  - Канали комунікації

## 📋 Технології

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js з Google OAuth
- **Web Scraping**: Cheerio
- **UI**: Lucide React Icons

## 🛠 Встановлення

### Передумови
- Node.js 18+ та npm/yarn
- Google Cloud Console акаунт (для OAuth)
- Supabase акаунт

### Крок 1: Клонування та встановлення залежностей

```bash
cd job-tracker
npm install
```

### Крок 2: Налаштування Google OAuth

1. Відкрийте [Google Cloud Console](https://console.cloud.google.com/)
2. Створіть новий проект або оберіть існуючий
3. Перейдіть до "APIs & Services" → "Credentials"
4. Натисніть "Create Credentials" → "OAuth 2.0 Client ID"
5. Оберіть "Web application"
6. Додайте Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - (пізніше додайте production URL)
7. Скопіюйте Client ID та Client Secret

### Крок 3: Налаштування Supabase

1. Створіть акаунт на [Supabase](https://supabase.com/)
2. Створіть новий проект
3. Перейдіть до SQL Editor
4. Виконайте наступний SQL для створення таблиць:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  careers_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  experience TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_relevant BOOLEAN DEFAULT true
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  url TEXT,
  applied_date DATE,
  status TEXT NOT NULL,
  
  resume_status TEXT,
  ai_screening TEXT,
  hr_interview TEXT,
  test_task TEXT,
  technical_interview TEXT,
  final_interview TEXT,
  
  rejection_reason TEXT,
  comments TEXT,
  conditions TEXT,
  communication_channel TEXT,
  hr_contacts TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);
```

5. Скопіюйте Project URL та API Keys з Settings → API

### Крок 4: Налаштування змінних оточення

Створіть файл `.env.local` в корені проекту:

```bash
cp .env.local.example .env.local
```

Заповніть змінні:

```env
# Google OAuth
GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ваш_секретний_ключ

# Supabase
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_supabase_service_role_key
```

Згенеруйте NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Крок 5: Запуск додатку

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) в браузері.

## 📖 Використання

### 1. Додавання компаній для моніторингу

1. Перейдіть на сторінку "Компанії"
2. Натисніть "Додати компанію"
3. Введіть назву компанії та URL карʼєрної сторінки
4. Натисніть "Запустити парсинг" для збору вакансій

### 2. Перегляд вакансій

1. Перейдіть на сторінку "Вакансії"
2. Використовуйте фільтри для пошуку релевантних вакансій
3. Клікніть на вакансію для переходу на оригінальну сторінку

### 3. Управління заявками

1. На головній сторінці натисніть "Додати заявку"
2. Заповніть інформацію про компанію та посаду
3. Переміщуйте картки між колонками (Drag & Drop)
4. Редагуйте деталі заявки, клікнувши на іконку редагування

## 🔧 Налаштування парсера

Базовий парсер використовує загальні селектори. Для кращих результатів:

1. Відкрийте `app/api/scraper/route.ts`
2. Додайте специфічні селектори для кожної компанії
3. Налаштуйте логіку парсингу під структуру конкретних сайтів

Приклад кастомного парсера для конкретної компанії:

```typescript
// В функції scrapeCompanyJobs додайте перевірку
if (company.name === "N-ix") {
  // Специфічна логіка для N-ix
  const jobs = $('.vacancy-item').map((i, el) => {
    const title = $(el).find('.vacancy-title').text();
    const url = $(el).find('a').attr('href');
    return { title, url };
  }).get();
}
```

## 🚀 Деплой

### Vercel (рекомендовано)

1. Встановіть Vercel CLI:
```bash
npm i -g vercel
```

2. Деплой:
```bash
vercel
```

3. Додайте змінні оточення в Vercel Dashboard

### Інші платформи

Додаток можна задеплоїти на будь-якій платформі що підтримує Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 📝 Імпорт компаній

### Автоматичний імпорт 294 компаній

Готовий список з 294 українських IT компаній доступний в файлі `/data/maximum-companies-list.json`

Для імпорту всіх компаній в базу даних:

```bash
npm run import:companies
```

Скрипт автоматично:
- ✅ Додає всі компанії з careers сторінками
- ⊘ Пропускає вже існуючі компанії
- 📊 Показує статистику імпорту

### Список включає:
- **SaaS** (70 компаній): MacPaw, Preply, Ajax Systems, Readdle...
- **AI** (60 компаній): Grammarly, Reface, Competera, YouScan...
- **GameDev** (40 компаній): Plarium, GSC Game World, Room 8 Studio...
- **MarTech** (35 компаній): Reply.io, Netpeak, SE Ranking, MGID...
- **Crypto/Web3** (25 компаній): WhiteBIT, Everstake, Matter Labs...
- **FinTech** (15 компаній): monobank, Portmone, Solidgate...
- І багато інших категорій!

Детальна інформація про включені та виключені компанії: `/FINAL_SUMMARY.md`

## 🤝 Розширення функціоналу

### Майбутні покращення:
- [ ] Email нотифікації про нові вакансії
- [ ] Статистика та аналітика пошуку
- [ ] Експорт даних в Excel/PDF
- [ ] Мобільна версія (PWA)
- [ ] Інтеграція з календарем для співбесід
- [ ] AI-асистент для підготовки до співбесід

## 📄 Ліцензія

Для особистого використання.

## 🐛 Проблеми та підтримка

Якщо виникають проблеми:
1. Перевірте чи всі змінні оточення налаштовані
2. Перевірте чи таблиці створені в Supabase
3. Перевірте консоль браузера на помилки
4. Перевірте логи сервера в терміналі

## 👤 Автор

Вікторія Заремба

---

**Успіхів у пошуку роботи! 🎯**
