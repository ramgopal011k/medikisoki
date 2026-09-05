# BACKEND SCHEMA FIX REPORT

## Changes Implemented

1. **`backend/src/redflags.ts`**
   - Removed Gemini dependencies (`@google/generative-ai`) and semantic evaluation.
   - Re-wrote `evaluateAnswer` to query the `answers` table.
   - Updated the red flag trigger to update `sessions.red_flag = true` instead of inserting into the legacy `red_flags` table.
   - Realtime broadcast is natively handled by the `schema-db-changes` subscription on the `sessions` table.

2. **`backend/src/summary.ts`**
   - Re-wrote `generateTriageSummary` to only fetch from `sessions` and `answers` tables.
   - Dynamically constructs the summary into a JSON structure (`chief_complaint`, `hpi`, `past_history`) grouping by `provenance` and `question_id`.
   - Upserts into the `summaries` table using its `content` JSONB column instead of the legacy `summary_fields` table.

3. **`backend/src/routes/answers.ts`**
   - Switched the insertion target from `history_facts` to `answers`.
   - Retained the `patient_reported` provenance default, mapping directly to the new 4-table schema.

4. **`backend/src/routes/sessions.ts`**
   - Refactored to map strictly to the new schema definition (uses `id` instead of `session_token` for primary key lookups).
   - Inserted the `chief_complaint` as the first entry into the `answers` table automatically upon session creation.
   - Updated `PATCH /sessions/:id` to strictly update the `sessions` table by `id`.

## Verification Status
- The backend is now fully aligned with the strict **4-table schema** (`hospitals`, `sessions`, `answers`, `summaries`).
- Legacy tables (`history_facts`, `red_flags`, `medical_history`, `ayush_assessments`, `ocr_extractions`, `summary_fields`) have been completely purged from the codebase logic.
