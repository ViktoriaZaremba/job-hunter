# Швидкий старт Job Hunter

## 📦 Встановлення Node.js (якщо немає)

### macOS
```bash
# Через Homebrew (рекомендовано)
brew install node

# Або завантажте з офіційного сайту
# https://nodejs.org/
```

Перевірте встановлення:
```bash
node --version
npm --version
```

## 🚀 Запуск проекту

### 1. Встановіть залежності
```bash
cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker
npm install
```

### 2. Налаштуйте Google OAuth

**Швидкий спосіб:**
1. Перейдіть: https://console.cloud.google.com/
2. Створіть проект → APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client ID
4. Web application → Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Скопіюйте Client ID та Secret

### 3. Налаштуйте Supabase

**Швидкий спосіб:**
1. Зареєструйтесь: https://supabase.com/
2. New Project → Створіть проект
3. SQL Editor → Скопіюйте SQL з README.md
4. Settings → API → Скопіюйте URL та Keys

### 4. Створіть .env.local

```bash
# В папці job-tracker створіть файл .env.local
cat > .env.local << 'EOF'
# Google OAuth
GOOGLE_CLIENT_ID=ваш_client_id_сюди
GOOGLE_CLIENT_SECRET=ваш_secret_сюди

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=згенеруйте_випадковий_рядок

# Supabase
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
EOF
```

Згенеруйте секрет:
```bash
openssl rand -base64 32
```

### 5. Запустіть сервер

```bash
npm run dev
```

Відкрийте: http://localhost:3000

## ✅ Перевірка

- [ ] Сервер запустився без помилок
- [ ] Головна сторінка відкрилась
- [ ] Можете увійти через Google
- [ ] Відкривається Dashboard

## 🎯 Перші кроки після запуску

1. **Увійдіть через Google**
2. **Додайте першу компанію:**
   - Перейдіть: Компанії → Додати компанію
   - Приклад: N-ix, https://careers.n-ix.com/
3. **Запустіть парсинг:**
   - Натисніть "Запустити парсинг"
4. **Перегляньте вакансії:**
   - Перейдіть: Вакансії
5. **Додайте заявку:**
   - Dashboard → Додати заявку

## 🐛 Типові проблеми

### Помилка: "npx not found"
```bash
# Встановіть Node.js (див. вище)
```

### Помилка при npm install
```bash
# Очистіть кеш
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Помилка авторизації
- Перевірте GOOGLE_CLIENT_ID та SECRET
- Перевірте redirect URI в Google Console
- Перевірте NEXTAUTH_SECRET

### Помилка з'єднання з БД
- Перевірте SUPABASE_URL та ключі
- Перевірте чи виконали SQL в Supabase
- Перевірте інтернет з'єднання

## 📞 Потрібна допомога?

1. Перевірте консоль браузера (F12)
2. Перевірте термінал де запущений сервер
3. Перегляньте README.md для детальної інформації

## 🎨 Структура проекту

```
job-tracker/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── auth/              # Авторизація
│   ├── dashboard/         # Головний інтерфейс
│   └── page.tsx           # Головна сторінка
├── components/            # React компоненти
│   ├── kanban/           # Kanban дошка
│   └── ui/               # UI компоненти
├── lib/                   # Утиліти
├── types/                 # TypeScript типи
└── public/               # Статичні файли
```

Успіхів! 🚀
