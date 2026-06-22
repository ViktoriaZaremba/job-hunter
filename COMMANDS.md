# 📝 Швидка довідка команд

## 🚀 Основні команди

### Встановлення та запуск
```bash
# Встановити залежності
npm install

# Запустити development сервер
npm run dev

# Створити production build
npm run build

# Запустити production сервер
npm start

# Перевірити код (ESLint)
npm run lint
```

---

## 📊 Імпорт даних

### Імпортувати компанії
```bash
npm run import:companies
```

### Імпортувати заявки з CSV
```bash
npm run import:csv "шлях/до/файлу.csv" "ваш-email@gmail.com"

# Приклад:
npm run import:csv "/Users/viktoriazaremba/Desktop/job_hunter/Пошук роботи 2026 - Sheet1.csv" "viktoria@gmail.com"
```

---

## 🔧 Налаштування

### Створити .env.local
```bash
cat > .env.local << 'EOF'
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EOF
```

### Згенерувати NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### Відкрити .env.local для редагування
```bash
nano .env.local
# або
code .env.local
# або
open .env.local
```

---

## 🐛 Debugging

### Перевірити версії
```bash
node --version
npm --version
```

### Перевірити змінні оточення
```bash
cat .env.local
```

### Очистити та переустановити
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Знайти процес на порті 3000
```bash
lsof -ti:3000
```

### Вбити процес на порті 3000
```bash
kill -9 $(lsof -ti:3000)
```

### Запустити на іншому порті
```bash
PORT=3001 npm run dev
```

---

## 📦 Git команди

### Ініціалізувати репозиторій
```bash
git init
git add .
git commit -m "Initial commit"
```

### Підключити до GitHub
```bash
git remote add origin https://github.com/username/job-tracker.git
git branch -M main
git push -u origin main
```

### Оновити код
```bash
git add .
git commit -m "Update feature"
git push
```

---

## 🚀 Деплой команди

### Vercel CLI
```bash
# Встановити Vercel CLI
npm i -g vercel

# Увійти
vercel login

# Деплой
vercel

# Деплой в production
vercel --prod
```

### Netlify CLI
```bash
# Встановити Netlify CLI
npm i -g netlify-cli

# Увійти
netlify login

# Деплой
netlify deploy

# Деплой в production
netlify deploy --prod
```

---

## 🗄 Database команди

### Supabase SQL (виконати в Supabase Dashboard)

#### Створити таблиці
```sql
-- Скопіювати SQL з lib/supabase.ts
```

#### Перевірити таблиці
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

#### Перевірити користувачів
```sql
SELECT * FROM users;
```

#### Перевірити заявки
```sql
SELECT * FROM applications 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Видалити всі дані (ОБЕРЕЖНО!)
```sql
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE users CASCADE;
```

#### Створити тестового користувача
```sql
INSERT INTO users (email, name) 
VALUES ('test@example.com', 'Test User');
```

---

## 🔍 Перевірка статусу

### Перевірити чи сервер працює
```bash
curl http://localhost:3000
```

### Перевірити API endpoint
```bash
curl http://localhost:3000/api/jobs
```

### Перевірити чи порт зайнятий
```bash
lsof -i :3000
```

---

## 📱 Відкрити в браузері

```bash
# macOS
open http://localhost:3000

# Linux
xdg-open http://localhost:3000
```

---

## 🧹 Очистка

### Видалити build артефакти
```bash
rm -rf .next
rm -rf out
```

### Видалити node_modules
```bash
rm -rf node_modules
```

### Повна очистка
```bash
rm -rf .next out node_modules package-lock.json
npm install
```

---

## 📊 Аналітика проекту

### Порахувати файли
```bash
find . -name "*.ts" -o -name "*.tsx" | wc -l
```

### Порахувати рядки коду
```bash
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l
```

### Показати структуру проекту
```bash
tree -L 2 -I 'node_modules'
```

---

## 🎨 Корисні alias (додайте в ~/.zshrc)

```bash
# Додати в ~/.zshrc або ~/.bashrc
alias jt-dev="cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker && npm run dev"
alias jt-build="cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker && npm run build"
alias jt-logs="cd /Users/viktoriazaremba/Desktop/job_hunter/job-tracker && tail -f .next/trace"

# Застосувати зміни
source ~/.zshrc
```

---

## 🔐 Безпека

### Перевірити чи .env в .gitignore
```bash
grep -q "^\.env$" .gitignore && echo "✅ Safe" || echo "❌ Add .env to .gitignore"
```

### Видалити .env з git history (якщо випадково закомітили)
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📦 Оновлення залежностей

### Перевірити застарілі пакети
```bash
npm outdated
```

### Оновити всі пакети
```bash
npm update
```

### Оновити конкретний пакет
```bash
npm install next@latest
```

### Інтерактивне оновлення
```bash
npx npm-check-updates -u
npm install
```

---

## 🧪 Тестування (якщо додасте тести в майбутньому)

```bash
# Встановити Jest
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Запустити тести
npm test

# Тести з покриттям
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 📝 Документація

### Згенерувати TypeScript docs
```bash
npm install --save-dev typedoc
npx typedoc --out docs src
```

---

## 🎯 Швидкі перевірки

```bash
# Все працює?
node --version && npm --version && echo "✅ Node OK"

# Залежності встановлені?
[ -d "node_modules" ] && echo "✅ Dependencies OK" || echo "❌ Run npm install"

# .env.local існує?
[ -f ".env.local" ] && echo "✅ .env.local OK" || echo "❌ Create .env.local"

# Сервер запущений?
curl -s http://localhost:3000 > /dev/null && echo "✅ Server OK" || echo "❌ Server not running"
```

---

## 💡 Корисні поради

### Працювати в кількох терміналах:
```bash
# Термінал 1: Dev сервер
npm run dev

# Термінал 2: Команди, git, тощо
git status
npm run import:companies

# Термінал 3: Логи (якщо потрібно)
tail -f .next/trace
```

### Автоматичний restart при зміні .env:
```bash
# Встановити nodemon
npm install --save-dev nodemon

# Створити nodemon.json
{
  "watch": [".env.local"],
  "exec": "npm run dev"
}
```

---

## 🆘 Emergency команди

### Якщо все зламалось:
```bash
# 1. Зупинити всі Node процеси
killall node

# 2. Очистити все
rm -rf .next out node_modules package-lock.json

# 3. Переустановити
npm install

# 4. Запустити
npm run dev
```

### Якщо база даних зламалась:
```sql
-- В Supabase SQL Editor
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Потім запустити CREATE знову з lib/supabase.ts
```

---

**Збережіть цей файл для швидкого доступу! 📌**
