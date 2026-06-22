import { supabase } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Run database migration for Pipeline Board
 * 
 * This script:
 * 1. Reads the SQL migration file
 * 2. Executes it in Supabase
 * 3. Reports success/failure
 * 
 * Usage: npx tsx scripts/run-migration.ts
 */

async function runMigration() {
  console.log('🚀 Starting Pipeline Board migration...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrate-to-pipeline.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL migration file loaded');
    console.log('📊 Executing migration...\n');

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('  - applications_legacy: Old table renamed (data preserved)');
    console.log('  - applications: New table created');
    console.log('  - activity_log: New table created');
    console.log('  - Indexes: Created');
    console.log('  - Triggers: Created');
    console.log('  - RLS: Enabled (policies commented out for dev)\n');
    
    console.log('⚠️  Note: Old data in applications_legacy table');
    console.log('   Run data migration script separately if needed.\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();
