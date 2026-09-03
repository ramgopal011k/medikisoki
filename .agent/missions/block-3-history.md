# Block 3: Medical History Module

## Scope
- Medical history form (Allergies, Medications, Conditions, Surgeries)
- Offline queue sync
- Validations

## Owned Paths
- `frontend/src/pages/MedicalHistoryFlow.tsx`
- `backend/src/index.ts` (POST/GET medical-history)

## Exit Criteria
- 4-category history collected
- Syncs to SQLite DB with correct category enums
- Offline fallback works
