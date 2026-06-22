# Архітектура Job Hunter

## 🏗 Загальна схема

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Next.js Frontend (React)                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  Landing   │  │ Dashboard  │  │   Jobs     │     │   │
│  │  │   Page     │  │  (Kanban)  │  │   List     │     │   │
│  │  └────────────┘  └────────────┘  └────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   API Routes                          │   │
│  │                                                       │   │
│  │  /api/auth/[...nextauth]  ←→  NextAuth.js           │   │
│  │  /api/applications         ←→  CRUD Applications    │   │
│  │  /api/companies            ←→  CRUD Companies       │   │
│  │  /api/jobs                 ←→  Get Jobs             │   │
│  │  /api/scraper              ←→  Web Scraper          │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │                    │                    │
            │ OAuth              │ Database           │ HTTP
            ▼                    ▼                    ▼
    ┌─────────────┐     ┌─────────────────┐   ┌──────────────┐
    │   Google    │     │    Supabase     │   │  Companies'  │
    │    OAuth    │     │  (PostgreSQL)   │   │   Websites   │
    └─────────────┘     └─────────────────┘   └──────────────┘
```

## 🗂 Структура даних

### Database Schema

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (UUID) PK    │
│ email           │
│ name            │
│ image           │
│ created_at      │
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│  applications   │
├─────────────────┤
│ id (UUID) PK    │
│ user_id FK      │────┐
│ company_name    │    │
│ position        │    │
│ url             │    │
│ applied_date    │    │
│ status          │    │
│ ai_screening    │    │
│ hr_interview    │    │
│ test_task       │    │
│ technical_int   │    │
│ final_interview │    │
│ rejection_reason│    │
│ comments        │    │
│ conditions      │    │
│ comm_channel    │    │
│ hr_contacts     │    │
│ created_at      │    │
│ updated_at      │    │
└─────────────────┘    │
                       │
┌─────────────────┐    │
│   companies     │    │
├─────────────────┤    │
│ id (UUID) PK    │    │
│ name            │    │
│ careers_url     │    │
│ created_at      │    │
└─────────────────┘    │
         │             │
         │ 1:N         │
         │             │
         ▼             │
┌─────────────────┐    │
│      jobs       │    │
├─────────────────┤    │
│ id (UUID) PK    │    │
│ company_id FK   │────┘
│ company_name    │
│ title           │
│ url             │
│ description     │
│ experience      │
│ scraped_at      │
│ is_relevant     │
└─────────────────┘
```

## 🔄 Data Flow

### 1. Авторизація
```
User clicks "Login"
      │
      ▼
NextAuth redirect to Google
      │
      ▼
User authorizes
      │
      ▼
Google redirects back with token
      │
      ▼
NextAuth creates session
      │
      ▼
User record created in DB
      │
      ▼
Redirect to Dashboard
```

### 2. Додавання заявки
```
User fills form
      │
      ▼
POST /api/applications
      │
      ▼
Validate session
      │
      ▼
Insert to DB
      │
      ▼
Return new application
      │
      ▼
Update UI (optimistic)
```

### 3. Парсинг вакансій
```
User clicks "Запустити парсинг"
      │
      ▼
POST /api/scraper
      │
      ▼
Fetch companies from DB
      │
      ▼
For each company:
  │
  ├─► Fetch careers page
  │
  ├─► Parse HTML (Cheerio)
  │
  ├─► Find job listings
  │
  ├─► Filter by keywords
  │
  ├─► Check experience requirements
  │
  └─► Save to jobs table
      │
      ▼
Return stats
      │
      ▼
Show notification
```

### 4. Kanban Drag & Drop
```
User drags card
      │
      ▼
onDragStart (set dragged item)
      │
      ▼
onDragOver (allow drop)
      │
      ▼
onDrop (update status)
      │
      ▼
PATCH /api/applications/[id]
      │
      ▼
Update DB
      │
      ▼
Optimistic UI update
```

## 🎨 Component Hierarchy

```
App Layout
│
├─ Landing Page (/)
│  ├─ Hero Section
│  ├─ Features Grid
│  └─ CTA Button
│
├─ Auth Page (/auth/signin)
│  └─ Google Sign In Button
│
└─ Dashboard Layout (/dashboard)
   │
   ├─ Header
   │  ├─ Navigation
   │  └─ User Menu
   │
   ├─ Stats Cards
   │  ├─ Total Applications
   │  ├─ Interested
   │  ├─ Sent
   │  └─ Rejected
   │
   └─ Main Content
      │
      ├─ Kanban Board (/)
      │  ├─ KanbanColumn x4
      │  │  └─ ApplicationCard[]
      │  │     ├─ Company Info
      │  │     ├─ Interview Stages
      │  │     └─ Actions (Edit/Delete)
      │  │
      │  └─ AddApplicationModal
      │
      ├─ Jobs List (/jobs)
      │  ├─ Filters
      │  └─ JobCard[]
      │
      └─ Companies (/companies)
         ├─ Add Company Button
         ├─ Scrape Button
         └─ CompaniesTable
```

## 🔐 Security Architecture

```
┌──────────────────────────────────────┐
│        Security Layers               │
├──────────────────────────────────────┤
│                                      │
│  1. NextAuth Session Management      │
│     • JWT tokens                     │
│     • HTTP-only cookies              │
│     • CSRF protection                │
│                                      │
│  2. API Route Protection             │
│     • getServerSession() check       │
│     • User validation                │
│                                      │
│  3. Database Security                │
│     • Row Level Security (optional)  │
│     • Foreign key constraints        │
│     • Input validation               │
│                                      │
│  4. Environment Variables            │
│     • Secrets not in code            │
│     • Server-side only keys          │
│                                      │
└──────────────────────────────────────┘
```

## 📡 API Endpoints

```
Authentication:
  GET  /api/auth/[...nextauth]  - NextAuth endpoints
  POST /api/auth/[...nextauth]  - OAuth callback

Applications (Protected):
  GET    /api/applications      - List user's applications
  POST   /api/applications      - Create application
  PATCH  /api/applications/[id] - Update application
  DELETE /api/applications/[id] - Delete application

Companies (Protected):
  GET    /api/companies         - List all companies
  POST   /api/companies         - Add company
  DELETE /api/companies/[id]    - Remove company

Jobs (Protected):
  GET    /api/jobs              - List scraped jobs

Scraper (Protected):
  POST   /api/scraper           - Run scraper for companies
```

## 🚀 Performance Considerations

### Frontend
- **React Server Components**: Де можливо
- **Code Splitting**: Автоматично через Next.js
- **Image Optimization**: Next.js Image component
- **Caching**: Browser cache + HTTP headers

### Backend
- **Database Indexes**: На user_id, status, scraped_at
- **Connection Pooling**: Supabase automatic
- **Rate Limiting**: Для scraper (1 req/sec)
- **Pagination**: Для великих списків (TODO)

### Scraper
- **Rate Limiting**: Затримка між запитами
- **Timeout Handling**: Для повільних сайтів
- **Error Recovery**: Try/catch для кожного сайту
- **Caching**: URL dedupe через UNIQUE constraint

## 🔧 Tech Stack Details

```
┌─────────────────────────────────────┐
│         Frontend Stack              │
├─────────────────────────────────────┤
│ Next.js 14        Framework         │
│ React 18          UI Library        │
│ TypeScript        Type Safety       │
│ Tailwind CSS      Styling           │
│ Lucide React      Icons             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         Backend Stack               │
├─────────────────────────────────────┤
│ Next.js API       API Routes        │
│ NextAuth.js       Authentication    │
│ Cheerio           Web Scraping      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         Data Stack                  │
├─────────────────────────────────────┤
│ Supabase          Database (PG)     │
│ PostgreSQL        RDBMS             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         DevOps Stack                │
├─────────────────────────────────────┤
│ Vercel/Netlify    Hosting           │
│ GitHub            Version Control   │
│ ESLint            Code Quality      │
└─────────────────────────────────────┘
```

## 📈 Scalability Path

### Phase 1: MVP (Current)
- Single user focus
- Basic scraping
- Manual parsing

### Phase 2: Multi-user
- User isolation
- Row Level Security
- Shared companies database

### Phase 3: Advanced
- Background jobs (Bull/BullMQ)
- Redis caching
- Webhooks for notifications
- Real-time updates (WebSockets)

### Phase 4: Enterprise
- Team workspaces
- Advanced analytics
- API for integrations
- Mobile apps

## 🧪 Testing Strategy (Future)

```
Unit Tests
  ├─ Utils functions
  └─ Data transformers

Integration Tests
  ├─ API endpoints
  └─ Database queries

E2E Tests
  ├─ User flows
  └─ Critical paths

Performance Tests
  └─ Scraper load
```

---

**Це архітектура для масштабування і розвитку додатку! 🚀**
