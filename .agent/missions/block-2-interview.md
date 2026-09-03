# Block 2: Adaptive Interview Engine

## Scope
- Dynamic symptom branching based on chief complaint
- Voice + Touch input modes
- Offline sync queue for `history_facts`

## Owned Paths
- `frontend/src/pages/InterviewFlow.tsx`
- `frontend/src/components/QuestionCard.tsx`
- `.agent/types/interview-tree.ts`
- `backend/src/index.ts` (POST/GET history-facts)

## Exit Criteria
- Branching logic works for at least Fever and Chest Pain
- Voice input is captured
- Facts stored in DB with correct provenance (`patient_reported`)
