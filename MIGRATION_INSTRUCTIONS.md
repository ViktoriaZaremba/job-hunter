# 🚀 Database Migration Instructions

## What This Does

This migration will:
- ✅ **Keep all your existing applications**
- ✅ Add new columns for Pipeline Board features
- ✅ Migrate old data to new structure
- ✅ Create activity_log table
- ✅ All applications will appear in "To-do" column initially

---

## Step-by-Step Instructions

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase**
   - Go to https://supabase.com
   - Open your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration Script**
   - Open file: `scripts/migrate-with-data.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)

4. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" button (or Cmd+Enter)
   - Wait for success message

5. **Verify**
   - Should see: "Migration completed successfully!"
   - Check "Table Editor" → applications → should have new columns

---

## After Migration

### What Changes

**Old columns (preserved but not used):**
- `status` (старий статус)
- `comments` (перенесено в `notes`)
- `applied_date` (перенесено в `last_contact_date`)

**New columns (active):**
- `current_stage` = 'To-do' (for all)
- `resume_status` = 'Not Started'
- `hr_interview_status` = 'Not Started'
- `technical_interview_status` = 'Not Started'
- `final_interview_status` = 'Not Started'
- `notes` (copied from old `comments`)
- `last_contact_date` (copied from `applied_date`)

### What You'll See

1. **All applications in "To-do" column**
   - You can drag them to correct stages
   
2. **Modal works fully**
   - Click card → opens modal
   - Edit button → works
   - All 7 sections visible

3. **Drag-and-drop works**
   - Between columns
   - Between status groups
   - Auto-transitions when "Passed"

---

## Troubleshooting

### Error: "column already exists"
**Solution:** Some columns already added, it's OK - script uses IF NOT EXISTS

### Error: "permission denied"
**Solution:** Make sure you're logged in as project owner in Supabase

### Can't find SQL Editor
**Solution:** Look for "⚡ SQL Editor" or "Database" → "SQL Editor"

### Migration ran but nothing changed
**Solution:** 
1. Refresh Supabase page
2. Refresh your app (http://localhost:3000)
3. Check Table Editor → applications → columns list

---

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- This will NOT delete data, just remove new columns
ALTER TABLE applications 
  DROP COLUMN IF EXISTS current_stage,
  DROP COLUMN IF EXISTS current_stage_status,
  DROP COLUMN IF EXISTS resume_status,
  DROP COLUMN IF EXISTS hr_interview_status,
  DROP COLUMN IF EXISTS technical_interview_status,
  DROP COLUMN IF EXISTS final_interview_status,
  DROP COLUMN IF EXISTS offer_status,
  DROP COLUMN IF EXISTS rejected_stage,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS rejection_comment,
  DROP COLUMN IF EXISTS hr_name,
  DROP COLUMN IF EXISTS communication_channel,
  DROP COLUMN IF EXISTS contact_details,
  DROP COLUMN IF EXISTS salary,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS last_contact_date,
  DROP COLUMN IF EXISTS business_days_since_contact;

DROP TABLE IF EXISTS activity_log;
```

---

## Testing After Migration

1. **Refresh app** → http://localhost:3000/dashboard
2. **Check:** All applications visible in To-do column ✅
3. **Click card** → Modal opens ✅
4. **Click Edit** → Can edit fields ✅
5. **Drag card** → Moves to new column ✅
6. **Create new** → Add Application works ✅

---

## Need Help?

If migration fails or you see errors:
1. Copy the error message
2. Check which step failed
3. Can run individual steps separately

**Ready to migrate?** Just follow Option 1 above! 🚀
