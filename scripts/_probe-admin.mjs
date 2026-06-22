import { config } from 'dotenv';
config({ path: '.env.local' });
const { createClient } = await import('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('URL set:', !!url, 'Service key set:', !!serviceKey);
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await sb.from('applications').select('id, company_name, current_stage, current_stage_status, resume_status, hr_interview_status, technical_interview_status, final_interview_status, rejected_stage').limit(3);
console.log('SELECT applications:', error?.message || JSON.stringify(data, null, 2));

const r = await sb.rpc('exec_sql', { sql_query: 'select 1 as ping' });
console.log('exec_sql RPC:', r.error?.message || r.data);

// Inspect column listing
const cols = await sb.rpc('exec_sql', { sql_query: `select column_name, data_type, is_nullable from information_schema.columns where table_name = 'applications' order by ordinal_position` });
console.log('Columns:', cols.error?.message || cols.data);
