# Деплой Job Hunter

## 🚀 Vercel (Рекомендовано)

Vercel - найпростіший спосіб задеплоїти Next.js додаток.

### Крок 1: Підготовка

1. Створіть Git репозиторій:
```bash
cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker
git init
git add .
git commit -m "Initial commit"
```

2. Завантажте на GitHub:
```bash
# Створіть репозиторій на github.com
git remote add origin https://github.com/your-username/job-tracker.git
git branch -M main
git push -u origin main
```

### Крок 2: Деплой на Vercel

1. Зайдіть на [vercel.com](https://vercel.com)
2. Увійдіть через GitHub
3. Клікніть "New Project"
4. Оберіть ваш репозиторій job-tracker
5. Налаштування залишіть за замовчуванням
6. Додайте Environment Variables:

```
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_secret
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=ваш_secret
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
```

7. Клікніть "Deploy"

### Крок 3: Оновіть Google OAuth

1. Перейдіть в Google Cloud Console
2. Додайте до Authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`

### Оновлення додатку

```bash
git add .
git commit -m "Update feature"
git push
```

Vercel автоматично задеплоїть нову версію.

---

## 🌐 Netlify

### Крок 1: Підготовка

Переконайтесь що код на GitHub (як в інструкції вище).

### Крок 2: Деплой

1. Зайдіть на [netlify.com](https://netlify.com)
2. "New site from Git"
3. Оберіть GitHub та ваш репозиторій
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Додайте Environment Variables (як для Vercel)
7. Deploy

### Налаштування

Створіть `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🚂 Railway

### Крок 1: Деплой

1. Зайдіть на [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Оберіть репозиторій
4. Railway автоматично визначить Next.js

### Крок 2: Environment Variables

Додайте всі змінні як в Vercel.

### Крок 3: Налаштування домену

Railway автоматично надасть домен типу `your-app.up.railway.app`

---

## 🎨 Додаткові налаштування

### Custom Domain

**Vercel:**
1. Project Settings → Domains
2. Додайте ваш домен
3. Налаштуйте DNS записи

**Netlify:**
1. Site Settings → Domain Management
2. Add custom domain
3. Налаштуйте DNS

### HTTPS

Всі платформи автоматично надають безкоштовний SSL сертифікат.

### Cron Jobs (Автоматичний парсинг)

#### Vercel Cron
Створіть `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/scraper/cron",
    "schedule": "0 9 * * *"
  }]
}
```

Створіть endpoint `app/api/scraper/cron/route.ts`:
```typescript
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Викликаємо парсер
  // ... логіка парсингу

  return NextResponse.json({ success: true });
}
```

#### Зовнішні Cron сервіси

Використайте [cron-job.org](https://cron-job.org) або [EasyCron](https://www.easycron.com):
1. Створіть scheduled job
2. URL: `https://your-app.vercel.app/api/scraper`
3. Method: POST
4. Schedule: Щодня о 9:00

---

## 🔐 Безпека Production

### Environment Variables
- ✅ Ніколи не комітьте `.env.local`
- ✅ Використовуйте різні секрети для dev і production
- ✅ Регулярно оновлюйте NEXTAUTH_SECRET

### Supabase
Налаштуйте Row Level Security (RLS):

```sql
-- Enable RLS on tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Користувач може бачити тільки свої заявки
CREATE POLICY "Users can view own applications" 
ON applications FOR SELECT 
USING (auth.uid() = user_id);

-- Користувач може створювати свої заявки
CREATE POLICY "Users can insert own applications" 
ON applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### Rate Limiting

Додайте rate limiting для API:
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## 📊 Моніторинг

### Vercel Analytics
Безкоштовно включено для всіх проектів.

### Sentry (Error Tracking)
```bash
npm install @sentry/nextjs
```

### LogRocket (Session Replay)
```bash
npm install logrocket
```

---

## 🔄 CI/CD

### GitHub Actions

Створіть `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - run: npm run lint
```

---

## 💡 Поради

1. **Preview Deployments**: Vercel/Netlify автоматично створюють preview для кожного PR
2. **Environment-specific configs**: Використовуйте різні Supabase проекти для dev/prod
3. **Database backups**: Supabase автоматично робить бекапи
4. **Monitoring**: Налаштуйте alerts в Vercel Dashboard

---

## 🆘 Troubleshooting

### Build fails
- Перевірте Node.js версію (має бути 18+)
- Перевірте чи всі environment variables встановлені
- Перевірте логи білду в платформі

### OAuth не працює
- Перевірте redirect URIs в Google Console
- Перевірте NEXTAUTH_URL (має бути production URL)
- Перевірте NEXTAUTH_SECRET

### Database connection fails
- Перевірте Supabase URL та keys
- Перевірте чи таблиці створені
- Перевірте Supabase status page

---

Готово! Ваш додаток в production 🎉
