-- ==============================================================================
-- Migration: Add Missing Columns to MediKiosk 'sessions' Table
-- ==============================================================================
--
-- Instructions to run in Supabase:
-- 1. Log in to your Supabase Dashboard (https://app.supabase.com).
-- 2. Select your MediKiosk project.
-- 3. In the left sidebar, click on "SQL Editor".
-- 4. Click "+ New query" (or open an empty query tab).
-- 5. Copy and paste the SQL statements below into the editor.
-- 6. Click the green "Run" button (or press Ctrl+Enter / Cmd+Enter).
-- 7. Verify success in Table Editor -> "sessions" table (columns 'dummy_aadhaar' & 'chief_complaint').
--
-- ==============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dummy_aadhaar TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
