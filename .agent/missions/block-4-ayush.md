# Block 4 (Part A): AYUSH Mode

## Scope
- AYUSH toggle in Consent Flow
- 5-screen AYUSH assessment (Prakriti, Vikriti, etc.)
- SQLite persistence (`ayush_assessments`)

## Owned Paths
- `frontend/src/pages/AyushFlow.tsx`
- `backend/src/index.ts` (POST/GET ayush-assessment)

## Exit Criteria
- Toggle appears for practitioners
- All 5 dimensions captured
- Persisted to DB with `patient_reported` provenance
