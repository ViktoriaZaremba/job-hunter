# 🗺 Навігація по проекту Job Hunter

## 📍 Ви тут: `/job-tracker/`

---

## 🎯 Залежно від вашої мети:

### 🚀 Я хочу швидко запустити проект
**→ Читайте в такому порядку:**
1. `START_HERE.md` - загальний огляд
2. `NEXT_STEPS.md` - покрокова інструкція
3. Почніть налаштування!

**Час: 1 година**

---

### 📖 Я хочу зрозуміти що це
**→ Читайте:**
1. `START_HERE.md` - що це таке
2. `PROJECT_SUMMARY.md` - що створено
3. `ARCHITECTURE.md` - як працює

**Час: 20 хвилин**

---

### 🔧 У мене проблема
**→ Шукайте рішення:**
1. `TROUBLESHOOTING.md` - список проблем і рішень
2. `COMMANDS.md` - корисні команди
3. Google або ChatGPT з описом помилки

**Час: 5-30 хвилин**

---

### 📚 Я хочу повну документацію
**→ Читайте:**
1. `README.md` - повна документація
2. `ARCHITECTURE.md` - архітектура
3. `DEPLOYMENT.md` - деплой
4. Код в папках `app/`, `components/`, `lib/`

**Час: 1-2 години**

---

### 🎨 Я хочу додати features
**→ Дивіться:**
1. `ROADMAP.md` - список ідей
2. `ARCHITECTURE.md` - розуміння структури
3. `README.md` - технічні деталі

**Потім:**
- Створюйте компоненти в `components/`
- Додавайте API в `app/api/`
- Оновлюйте типи в `types/`

---

### 🚢 Я хочу викласти в інтернет
**→ Слідуйте:**
1. `DEPLOYMENT.md` - повна інструкція
2. Оберіть платформу (Vercel рекомендовано)
3. Налаштуйте environment variables

**Час: 30 хвилин**

---

### 💡 Я хочу імпортувати свої дані
**→ Використайте:**
1. `npm run import:companies` - імпорт компаній
2. `npm run import:csv` - імпорт заявок
3. Або додавайте через UI

**Час: 5-10 хвилин**

---

## 📁 Структура файлів документації

```
📚 Документація
├── START_HERE.md          ← Перша точка входу (почніть тут!)
├── NEXT_STEPS.md          ← Покрокова інструкція setup
├── QUICK_START.md         ← Стисла версія
├── README.md              ← Повна документація
├── TROUBLESHOOTING.md     ← Вирішення проблем
├── COMMANDS.md            ← Швидка довідка команд
├── ARCHITECTURE.md        ← Як працює додаток
├── PROJECT_SUMMARY.md     ← Що було створено
├── ROADMAP.md             ← План розвитку
└── DEPLOYMENT.md          ← Інструкції деплою
```

---

## 📁 Структура коду

```
💻 Код додатку
├── app/                   ← Next.js App Router
│   ├── api/              ← Backend API endpoints
│   │   ├── auth/         ← Google OAuth
│   │   ├── applications/ ← CRUD заявок
│   │   ├── companies/    ← CRUD компаній
│   │   ├── jobs/         ← Вакансії
│   │   └── scraper/      ← Парсер
│   │
│   ├── dashboard/        ← Головний UI
│   │   ├── page.tsx      ← Kanban трекер
│   │   ├── jobs/         ← Список вакансій
│   │   └── companies/    ← Управління компаніями
│   │
│   ├── auth/             ← Сторінка входу
│   ├── layout.tsx        ← Root layout
│   ├── page.tsx          ← Landing page
│   └── globals.css       ← Стилі
│
├── components/           ← React компоненти
│   ├── kanban/          ← Kanban дошка
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── ApplicationCard.tsx
│   └── ui/              ← UI компоненти (майбутнє)
│
├── lib/                 ← Утиліти
│   ├── auth.ts          ← NextAuth конфігурація
│   └── supabase.ts      ← Supabase клієнт + SQL
│
├── types/               ← TypeScript типи
│   ├── index.ts         ← Основні типи
│   └── next-auth.d.ts   ← NextAuth типи
│
├── scripts/             ← Допоміжні скрипти
│   ├── import-companies.ts
│   └── import-csv.ts
│
├── data/                ← Дані для імпорту
│   └── companies-list.json
│
└── public/              ← Статичні файли
```

---

## 🎓 Маршрути навчання

### Маршрут 1: "Мені потрібно запустити зараз!"
**Час: 1 година**

1. Встановіть Node.js
2. `npm install`
3. Налаштуйте Google OAuth (15 хв)
4. Налаштуйте Supabase (15 хв)
5. Створіть `.env.local`
6. `npm run dev`
7. Відкрийте http://localhost:3000
8. Готово! 🎉

**Файли: NEXT_STEPS.md**

---

### Маршрут 2: "Я розробник, хочу розібратись"
**Час: 2-3 години**

1. Прочитайте PROJECT_SUMMARY.md
2. Вивчіть ARCHITECTURE.md
3. Перегляньте код в app/
4. Прочитайте ROADMAP.md
5. Спробуйте додати feature

**Файли: ARCHITECTURE.md, ROADMAP.md, README.md**

---

### Маршрут 3: "Я просто хочу використовувати"
**Час: 1.5 години**

1. Запустіть (Маршрут 1)
2. Імпортуйте дані
3. Додайте компанії
4. Запустіть парсинг
5. Почніть відстежувати заявки

**Файли: NEXT_STEPS.md, QUICK_START.md**

---

### Маршрут 4: "Хочу викласти в продакшн"
**Час: 1 година після налаштування**

1. Завершіть локальне налаштування
2. Створіть Git репозиторій
3. Завантажте на GitHub
4. Зареєструйтесь на Vercel
5. Підключіть репозиторій
6. Додайте environment variables
7. Deploy!

**Файли: DEPLOYMENT.md**

---

## 🔍 Пошук по темам

### Authentication / Авторизація
- `lib/auth.ts` - конфігурація
- `app/api/auth/[...nextauth]/route.ts` - endpoint
- `app/auth/signin/page.tsx` - UI
- **Документація:** README.md (розділ Authentication)

### Database / База даних
- `lib/supabase.ts` - клієнт + SQL
- `app/api/*/route.ts` - queries
- **Документація:** ARCHITECTURE.md (розділ Database)

### Kanban Board / Дошка
- `components/kanban/` - всі компоненти
- `app/dashboard/page.tsx` - використання
- **Документація:** PROJECT_SUMMARY.md

### Scraper / Парсер
- `app/api/scraper/route.ts` - логіка
- **Документація:** README.md (розділ Scraper)
- **Налаштування:** TROUBLESHOOTING.md (розділ 5)

### Deployment / Деплой
- **Документація:** DEPLOYMENT.md
- `vercel.json` - конфігурація (створити)
- `.env.local.example` - приклад змінних

### Types / Типи
- `types/index.ts` - основні типи
- `types/next-auth.d.ts` - NextAuth
- **Документація:** ARCHITECTURE.md

---

## 💡 Швидкі посилання

### Я хочу...

**...запустити проект** → `NEXT_STEPS.md`

**...виправити помилку** → `TROUBLESHOOTING.md`

**...додати feature** → `ROADMAP.md` + `ARCHITECTURE.md`

**...зрозуміти код** → `ARCHITECTURE.md`

**...викласти онлайн** → `DEPLOYMENT.md`

**...знайти команду** → `COMMANDS.md`

**...побачити весь огляд** → `PROJECT_SUMMARY.md`

**...імпортувати дані** → `COMMANDS.md` (розділ Імпорт)

---

## 🎯 Чеклісти

### ✅ Перед запуском
- [ ] Node.js встановлений
- [ ] Залежності встановлені (`npm install`)
- [ ] Google OAuth налаштований
- [ ] Supabase проект створений
- [ ] `.env.local` створений і заповнений
- [ ] Таблиці створені в Supabase

**Готові? → `npm run dev`**

---

### ✅ Перед деплоєм
- [ ] Локально все працює
- [ ] Git репозиторій створений
- [ ] Production env vars підготовлені
- [ ] Код на GitHub
- [ ] Production OAuth redirect додано
- [ ] Supabase production ready

**Готові? → Читайте `DEPLOYMENT.md`**

---

### ✅ Перед додаванням features
- [ ] Розумію архітектуру
- [ ] Прочитав ROADMAP.md
- [ ] Створив branch в Git
- [ ] Маю план реалізації
- [ ] Знаю які файли змінювати

**Готові? → Кодьте! 💻**

---

## 📞 Контекстна допомога

### Помилка при запуску?
→ `TROUBLESHOOTING.md` розділ 2

### Помилка авторизації?
→ `TROUBLESHOOTING.md` розділ 3

### Помилка бази даних?
→ `TROUBLESHOOTING.md` розділ 4

### Парсер не працює?
→ `TROUBLESHOOTING.md` розділ 5

### Не знаю команду?
→ `COMMANDS.md`

### Не розумію як працює?
→ `ARCHITECTURE.md`

---

## 🎨 Файли за призначенням

### 📖 Для читання (Documentation)
- START_HERE.md
- README.md
- PROJECT_SUMMARY.md
- ARCHITECTURE.md

### 🛠 Для роботи (How-to guides)
- NEXT_STEPS.md
- QUICK_START.md
- DEPLOYMENT.md
- COMMANDS.md

### 🆘 Для допомоги (Troubleshooting)
- TROUBLESHOOTING.md
- COMMANDS.md (Emergency)

### 💡 Для ідей (Planning)
- ROADMAP.md
- PROJECT_SUMMARY.md

---

## 🗺 Карта залежностей документів

```
START_HERE.md
    ↓
    ├─→ NEXT_STEPS.md (setup)
    │       ↓
    │       ├─→ QUICK_START.md (stislo)
    │       └─→ TROUBLESHOOTING.md (problemy)
    │
    ├─→ PROJECT_SUMMARY.md (shcho stvoreno)
    │       ↓
    │       └─→ ARCHITECTURE.md (yak pratsyuye)
    │
    ├─→ README.md (povne opys)
    │       ↓
    │       ├─→ ARCHITECTURE.md
    │       ├─→ DEPLOYMENT.md
    │       └─→ ROADMAP.md
    │
    └─→ COMMANDS.md (dovidka)
```

---

## 🎯 Рекомендований шлях

### День 1: Setup
1. START_HERE.md
2. NEXT_STEPS.md
3. Налаштування
4. Перший запуск ✅

### День 2: Exploration
1. PROJECT_SUMMARY.md
2. Імпорт даних
3. Тестування функцій
4. Налаштування парсера

### День 3: Deep Dive
1. ARCHITECTURE.md
2. Читання коду
3. Планування features
4. ROADMAP.md

### День 4: Production
1. DEPLOYMENT.md
2. Git setup
3. Vercel deploy
4. Testing production

---

## 🚀 Швидкий старт (TL;DR)

```bash
# 1. Увійти в проект
cd job-tracker

# 2. Встановити
npm install

# 3. Налаштувати (читай NEXT_STEPS.md)
# - Google OAuth
# - Supabase
# - .env.local

# 4. Запустити
npm run dev

# 5. Відкрити
open http://localhost:3000
```

---

**Щасливого використання! 🎉**

Якщо загубились - завжди повертайтесь до **START_HERE.md**
