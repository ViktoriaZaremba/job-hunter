# Troubleshooting Guide - Вирішення проблем

## 🚨 Типові проблеми та рішення

### 1. Проблеми з встановленням

#### ❌ "npx: command not found"
**Причина**: Node.js не встановлений

**Рішення**:
```bash
# macOS
brew install node

# Перевірка
node --version
npm --version
```

#### ❌ "npm install" виводить помилки
**Причина**: Конфлікти версій або зіпсований cache

**Рішення**:
```bash
# Очистка
rm -rf node_modules package-lock.json
npm cache clean --force

# Повторна установка
npm install
```

#### ❌ "Module not found" після npm install
**Причина**: Incomplete installation

**Рішення**:
```bash
# Переустановка конкретного пакету
npm install [package-name] --force

# Або повна переустановка
rm -rf node_modules
npm install
```

---

### 2. Проблеми з запуском

#### ❌ "npm run dev" не запускається
**Причина**: Port 3000 зайнятий

**Рішення**:
```bash
# Знайти процес на порті 3000
lsof -ti:3000

# Вбити процес
kill -9 $(lsof -ti:3000)

# Або запустити на іншому порті
PORT=3001 npm run dev
```

#### ❌ "Error: Cannot find module 'next'"
**Причина**: Dependencies не встановлені

**Рішення**:
```bash
npm install
```

#### ❌ Білий екран при відкритті localhost:3000
**Причина**: JavaScript помилки

**Рішення**:
1. Відкрийте Developer Tools (F12)
2. Перевірте Console на помилки
3. Перевірте термінал на server-side помилки

---

### 3. Проблеми з авторизацією

#### ❌ "Error: Google OAuth not configured"
**Причина**: Відсутні або неправильні GOOGLE_CLIENT_ID/SECRET

**Рішення**:
1. Перевірте `.env.local`:
```bash
cat .env.local | grep GOOGLE
```

2. Перевірте Google Cloud Console:
   - Переконайтесь що OAuth Client створений
   - Перевірте Authorized redirect URIs
   - Має бути: `http://localhost:3000/api/auth/callback/google`

3. Перезапустіть сервер після зміни .env:
```bash
# Ctrl+C для зупинки
npm run dev
```

#### ❌ "Callback URL mismatch"
**Причина**: URL не співпадає з налаштуваннями в Google

**Рішення**:
1. Google Cloud Console → APIs & Services → Credentials
2. Натисніть на ваш OAuth Client
3. Додайте правильний URL до Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

#### ❌ "Error: NEXTAUTH_SECRET not set"
**Причина**: Відсутній NEXTAUTH_SECRET

**Рішення**:
```bash
# Згенеруйте секрет
openssl rand -base64 32

# Додайте в .env.local
echo "NEXTAUTH_SECRET=your_generated_secret" >> .env.local
```

#### ❌ Після успішного входу редірект не працює
**Причина**: Неправильний NEXTAUTH_URL

**Рішення**:
```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000  # Development
# або
NEXTAUTH_URL=https://your-domain.com  # Production
```

---

### 4. Проблеми з базою даних

#### ❌ "Error: Invalid Supabase credentials"
**Причина**: Неправильні ключі Supabase

**Рішення**:
1. Перейдіть на [supabase.com](https://supabase.com)
2. Оберіть ваш проект
3. Settings → API
4. Скопіюйте:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

#### ❌ "Error: relation 'applications' does not exist"
**Причина**: Таблиці не створені в Supabase

**Рішення**:
1. Supabase Dashboard → SQL Editor
2. Скопіюйте SQL з `lib/supabase.ts`
3. Натисніть "Run"
4. Перевірте Tables в sidebar

#### ❌ "Error: null value in column 'user_id' violates not-null constraint"
**Причина**: User не створений в БД

**Рішення**:
Користувач має автоматично створюватись при першому вході. Якщо ні:
```sql
-- В Supabase SQL Editor
INSERT INTO users (email, name) 
VALUES ('your-email@gmail.com', 'Your Name');
```

#### ❌ Дані не зберігаються
**Причина**: Можливо RLS (Row Level Security) блокує

**Рішення**:
```sql
-- Тимчасово вимкнути RLS для тестування
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

### 5. Проблеми з парсером

#### ❌ Парсер не знаходить вакансії
**Причина**: Селектори не підходять для конкретного сайту

**Рішення**:
1. Відкрийте сайт компанії
2. Inspect Element (F12)
3. Знайдіть структуру вакансій
4. Оновіть селектори в `app/api/scraper/route.ts`:

```typescript
// Приклад кастомного парсера
if (company.name === "N-ix") {
  const jobs = $('.job-card').map((i, el) => {
    const title = $(el).find('.job-title').text();
    const url = $(el).find('a').attr('href');
    return { title, url };
  }).get();
}
```

#### ❌ "Error: fetch failed" при парсингу
**Причина**: Сайт блокує запити або недоступний

**Рішення**:
1. Перевірте чи сайт доступний в браузері
2. Додайте User-Agent:
```typescript
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  },
});
```

3. Якщо сайт використовує JavaScript для рендерингу - потрібен Puppeteer:
```bash
npm install puppeteer
```

#### ❌ Парсер занадто повільний
**Причина**: Послідовна обробка сайтів

**Рішення**:
```typescript
// Паралельна обробка
await Promise.all(companies.map(company => scrapeCompany(company)));
```

---

### 6. Проблеми з UI

#### ❌ Drag & Drop не працює
**Причина**: Browser compatibility

**Рішення**:
- Використовуйте сучасний браузер (Chrome, Firefox, Safari)
- Перевірте console на JavaScript помилки

#### ❌ Стилі не застосовуються
**Причина**: Tailwind CSS не скомпільований

**Рішення**:
```bash
# Перезапустіть dev server
npm run dev
```

#### ❌ Картки заявок не оновлюються
**Причина**: State не синхронізується

**Рішення**:
1. Hard refresh: Cmd+Shift+R (Mac) або Ctrl+Shift+R (Windows)
2. Clear browser cache
3. Перевірте Network tab в DevTools

---

### 7. Проблеми з деплоєм

#### ❌ Vercel build fails
**Причина**: TypeScript помилки або відсутні env vars

**Рішення**:
1. Локально запустіть build:
```bash
npm run build
```

2. Виправте всі помилки
3. Перевірте Environment Variables в Vercel:
   - Project Settings → Environment Variables
   - Додайте всі змінні з `.env.local`

#### ❌ "502 Bad Gateway" після деплою
**Причина**: Server-side помилка

**Рішення**:
1. Vercel Dashboard → Project → Deployments
2. Клікніть на deployment → View Function Logs
3. Знайдіть помилку в логах

#### ❌ OAuth не працює на production
**Причина**: Redirect URL не налаштований

**Рішення**:
1. Google Cloud Console
2. Додайте production URL:
   - `https://your-app.vercel.app/api/auth/callback/google`
3. Оновіть NEXTAUTH_URL в Vercel env vars

---

### 8. Проблеми зі скриптами

#### ❌ "tsx: command not found" при import:companies
**Причина**: tsx не встановлений

**Рішення**:
```bash
npm install tsx --save-dev
```

#### ❌ Import скрипт не працює
**Причина**: Відсутні env змінні

**Рішення**:
```bash
# Переконайтесь що .env.local існує
cat .env.local

# Запустіть з правильним шляхом
npm run import:companies
```

---

## 🔍 Debugging Tips

### Перевірка environment variables
```bash
# В терміналі де запущений сервер
echo $NEXT_PUBLIC_SUPABASE_URL
# Має вивести ваш URL

# Або в коді додайте тимчасово:
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### Перевірка session
```typescript
// В компоненті
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session } = useSession();
  console.log('Session:', session);
  // ...
}
```

### Перевірка API calls
```typescript
// В DevTools → Network tab
// Фільтруйте XHR запити
// Перевірте:
// - Request URL
// - Request Headers
// - Response status
// - Response body
```

---

## 📞 Все ще не працює?

### Checklist перед запитом допомоги:

- [ ] Node.js версія 18+
- [ ] Всі залежності встановлені (`npm install`)
- [ ] `.env.local` існує і заповнений
- [ ] Google OAuth налаштований
- [ ] Supabase проект створений
- [ ] Таблиці створені в Supabase
- [ ] Сервер запущений без помилок
- [ ] Browser console без помилок
- [ ] Network requests успішні (200 status)

### Як зібрати інформацію для допомоги:

1. **Browser Console** (F12 → Console)
   - Screenshot помилок
   
2. **Server Terminal**
   - Скопіюйте error stack trace
   
3. **Network Tab** (F12 → Network)
   - Які requests failed?
   - Який status code?
   - Що в Response?

4. **Environment**
   - Node version: `node --version`
   - npm version: `npm --version`
   - OS: macOS version

---

**Більшість проблем вирішуються перезапуском сервера та перевіркою .env.local! 🔄**
