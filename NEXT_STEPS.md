# 🎯 Наступні кроки - Що робити далі

## ✅ Етап 1: Підготовка (30 хвилин)

### 1. Встановіть Node.js
```bash
# Перевірте чи вже встановлений
node --version

# Якщо немає - встановіть
brew install node
```

### 2. Встановіть залежності
```bash
cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker
npm install
```

Це може зайняти 5-10 хвилин. Після завершення ви побачите:
```
added 428 packages
```

---

## 🔐 Етап 2: Налаштування Google OAuth (15 хвилин)

### Крок за кроком:

1. **Відкрийте Google Cloud Console**
   - Перейдіть: https://console.cloud.google.com/

2. **Створіть новий проект**
   - Натисніть "Select a project" → "New Project"
   - Назва: "Job Hunter"
   - Натисніть "Create"

3. **Налаштуйте OAuth consent screen**
   - Sidebar → "APIs & Services" → "OAuth consent screen"
   - User Type: "External"
   - App name: "Job Hunter"
   - User support email: ваш email
   - Developer contact: ваш email
   - Натисніть "Save and Continue"
   - Scopes: Skip (натисніть "Save and Continue")
   - Test users: додайте ваш Gmail
   - Натисніть "Save and Continue"

4. **Створіть OAuth Client**
   - Sidebar → "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Job Hunter Web"
   - Authorized redirect URIs:
     - Натисніть "Add URI"
     - Додайте: `http://localhost:3000/api/auth/callback/google`
   - Натисніть "Create"

5. **Збережіть credentials**
   - Скопіюйте "Client ID"
   - Скопіюйте "Client Secret"

---

## 🗄 Етап 3: Налаштування Supabase (15 хвилин)

### Крок за кроком:

1. **Створіть акаунт**
   - Перейдіть: https://supabase.com/
   - Sign up (можна через GitHub)

2. **Створіть проект**
   - Натисніть "New Project"
   - Name: "job-hunter"
   - Database Password: (збережіть в надійному місці!)
   - Region: оберіть найближчий (Europe West)
   - Натисніть "Create new project"
   - Зачекайте 2-3 хвилини поки проект створюється

3. **Створіть таблиці**
   - Sidebar → "SQL Editor"
   - Натисніть "New query"
   - Скопіюйте SQL з файлу `lib/supabase.ts` (рядки 9-73)
   - Або скопіюйте звідси:

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

   - Натисніть "Run" (або Cmd+Enter)
   - Має з'явитись "Success. No rows returned"

4. **Перевірте таблиці**
   - Sidebar → "Table Editor"
   - Маєте бачити 4 таблиці: users, companies, jobs, applications

5. **Отримайте API credentials**
   - Sidebar → "Settings" → "API"
   - Скопіюйте:
     - Project URL
     - anon public key
     - service_role key (клікніть на око щоб показати)

---

## ⚙️ Етап 4: Конфігурація проекту (5 хвилин)

### Створіть .env.local

```bash
cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker

# Створіть файл
cat > .env.local << 'EOF'
# Google OAuth
GOOGLE_CLIENT_ID=тут_ваш_google_client_id
GOOGLE_CLIENT_SECRET=тут_ваш_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=тут_згенерований_секрет

# Supabase
NEXT_PUBLIC_SUPABASE_URL=тут_ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=тут_ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=тут_ваш_service_role_key
EOF
```

### Згенеруйте NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Скопіюйте результат та вставте в .env.local

### Відредагуйте .env.local

```bash
nano .env.local
```

Вставте всі ваші значення:
- Google Client ID та Secret з Google Cloud Console
- Згенерований NEXTAUTH_SECRET
- Supabase URL та keys

Збережіть: Ctrl+X → Y → Enter

---

## 🚀 Етап 5: Запуск! (2 хвилини)

```bash
npm run dev
```

Відкрийте браузер: http://localhost:3000

### Що маєте побачити:
✅ Красива landing page з синьо-фіолетовим градієнтом
✅ Кнопка "Увійти через Google"
✅ Три картки з описом функцій

### Тестування:
1. Натисніть "Увійти через Google"
2. Оберіть ваш Google акаунт
3. Дозвольте доступ
4. Маєте потрапити на Dashboard
5. Натисніть "Додати заявку"
6. Заповніть форму
7. Картка з'явиться на дошці!

---

## 📊 Етап 6: Імпорт компаній (5 хвилин)

### Автоматичний імпорт 294 компаній

Готовий список з 294 українських IT компаній вже підготовлений!

```bash
npm run import:companies
```

Скрипт автоматично:
- ✅ Додає всі компанії з careers сторінками
- ⊘ Пропускає вже існуючі компанії
- 📊 Показує статистику імпорту

### Що включено:
- **SaaS** (70): MacPaw, Preply, Ajax Systems, Readdle...
- **AI** (60): Grammarly, Reface, Competera, YouScan...
- **GameDev** (40): Plarium, GSC Game World, Room 8 Studio...
- **MarTech** (35): Reply.io, Netpeak, SE Ranking, MGID...
- **Crypto/Web3** (25): WhiteBIT, Everstake, Matter Labs...
- **FinTech** (15): monobank, Portmone, Solidgate...
- **DevTools** (20): GitLab, Railsware, Mailtrap...
- **Security** (10): UnderDefense, Hacken, SOC Prime...
- І багато інших!

Детальна інформація: `/FINAL_SUMMARY.md`

### Імпорт CSV з існуючими заявками (опціонально)

Якщо у вас вже є CSV файл з заявками:

```bash
npm run import:csv "/Users/viktoriazaremba/Desktop/job_hunter/Пошук роботи 2026 - Sheet1.csv" "ваш-email@gmail.com"
```

Замініть `ваш-email@gmail.com` на email яким ви входили.

---

## 🎨 Етап 7: Перший парсинг (5 хвилин)

1. Перейдіть на сторінку "Компанії"
2. Переконайтесь що компанії є (або додайте вручну)
3. Натисніть "Запустити парсинг"
4. Зачекайте (може зайняти 1-2 хвилини)
5. Побачите notification: "Знайдено X нових вакансій"
6. Перейдіть на "Вакансії"
7. Побачите список знайдених вакансій!

---

## ✨ Вітаємо! Ви готові! 🎉

### Що ви можете робити зараз:

✅ **Трекати заявки**
- Додавати нові заявки
- Переміщувати між статусами (Drag & Drop)
- Редагувати деталі
- Видаляти застарілі

✅ **Знаходити вакансії**
- Додавати компанії для моніторингу
- Запускати автоматичний парсинг
- Фільтрувати за релевантністю
- Переходити на сайт вакансії

✅ **Аналізувати прогрес**
- Бачити статистику (скільки заявок в кожному статусі)
- Відстежувати етапи співбесід
- Зберігати коментарі та контакти

---

## 🎯 Рекомендовані наступні кроки

### Сьогодні
1. ✅ Додайте 3-5 заявок щоб протестувати систему
2. ✅ Запустіть парсинг для 5-10 компаній
3. ✅ Попрацюйте з Kanban дошкою

### Цього тижня
1. Імпортуйте всі існуючі дані
2. Додайте всі компанії що вас цікавлять
3. Налаштуйте щоденний парсинг

### Наступні 2 тижні
1. Прочитайте ROADMAP.md
2. Оберіть features які хочете додати
3. Можливо задеплоїти на Vercel (DEPLOYMENT.md)

---

## 📚 Корисні файли

- **README.md** - Повна документація
- **QUICK_START.md** - Швидкий старт
- **TROUBLESHOOTING.md** - Якщо щось не працює
- **ARCHITECTURE.md** - Як працює додаток
- **DEPLOYMENT.md** - Як задеплоїти
- **ROADMAP.md** - Що можна додати

---

## 🆘 Потрібна допомога?

### Якщо щось не працює:
1. Прочитайте TROUBLESHOOTING.md
2. Перевірте консоль браузера (F12)
3. Перевірте термінал де запущений сервер
4. Перезапустіть сервер (Ctrl+C і знову npm run dev)

### Типові помилки:
- **OAuth не працює** → Перевірте redirect URI в Google Console
- **База даних помилка** → Перевірте чи таблиці створені
- **Парсер нічого не знаходить** → Це нормально, потрібно налаштовувати під кожен сайт

---

## 🎉 Ви зробили це!

Тепер у вас є повноцінний додаток для пошуку роботи який:
- Автоматично знаходить вакансії
- Допомагає організувати процес
- Зберігає всю інформацію в одному місці

**Успіхів у пошуку роботи! Ви знайдете чудову пропозицію! 💼✨🚀**

---

## 📈 Поділіться результатами!

Якщо додаток допоміг вам знайти роботу - буду радий дізнатись! 😊

---

**P.S.** Не забудьте зробити backup .env.local в надійне місце (але не в Git!)
