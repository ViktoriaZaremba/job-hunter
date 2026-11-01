import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Public (anon) client — safe to use in the browser.
 * With RLS enabled this client can only access rows allowed by policies.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side admin client — bypasses RLS entirely.
 * ONLY import this in API routes / server components, NEVER in client code.
 * Uses SUPABASE_SERVICE_ROLE_KEY which must stay secret.
 */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// SQL для створення таблиць в Supabase
export const createTablesSQL = `
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
`;
