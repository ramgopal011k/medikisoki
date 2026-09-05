# MEDIKIOSK FEATURE INVENTORY – BY PHASE

**Summary:**
- **Total Features Evaluated:** 29
- **Implemented (✅):** 14
- **Partial/Buggy (⚠️):** 7
- **Missing (❌):** 8
- **Deferred/Cut (⏸️):** 3 (counted in missing/deferred)

---

## Phase 0 – Infrastructure & Schema
| Feature | Status | Evidence / File |
|---------|--------|----------------|
| 4‑table schema | ⚠️ | `survival_migration.sql` (Good), but `backend/schema.sql` still has 11 tables |
| Migration script | ✅ | `survival_migration.sql` |
| Env files | ✅ | `backend/.env`, `frontend/.env` |
| SQLite removal & 11-table legacy | ⚠️ | SQLite code removed, but `@types/better-sqlite3` and 11-table schema remain |

## Phase 1 – Core Patient Interview
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Language select | ✅ | `frontend/src/pages/Kiosk/ConsentFlow.tsx` |
| Consent screen | ✅ | `ConsentFlow.tsx` & `AudioExplanationButton.tsx` |
| Chief Complaint | ✅ | `ChiefComplaint.tsx` |
| Follow‑up tree | ✅ | `frontend/src/data/01_HARDCODED_TREE.json` |
| Dynamic rendering | ✅ | `FollowUp.tsx` |
| Answer saving | ✅ | `FollowUp.tsx` (saves to `answers` table) |

## Phase 2 – Red‑Flag Engine & Realtime
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Rule evaluation | ⚠️ | `backend/src/redflags.ts` (Evaluates against old `history_facts` table) |
| Red‑flag update | ❌ | `redflags.ts` writes to `red_flags` instead of `sessions.red_flag` |
| Realtime broadcast | ✅ | Supabase channel configured in `DoctorDashboard.tsx` |
| Locked message | ❌ | No UI text or state found for patient lock screen |
| Dashboard alert | ✅ | `DoctorDashboard.tsx` (Receives updates) |

## Phase 3 – Document Digitisation (OCR)
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Tesseract.js | ✅ | `DocumentUploadFlow.tsx` |
| Manual fallback | ✅ | `DocumentUploadFlow.tsx` (correction step) |
| Provenance save | ⚠️ | Types exist (`ocr_extracted`), but not explicitly saved by `DocumentUploadFlow.tsx` |
| Consent checkbox | ❌ | Not present in UI |

## Phase 4 – Summary & Doctor Dashboard
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Summary assembly | ⚠️ | `backend/src/summary.ts` (Relies on 11-table schema instead of `answers`) |
| Realtime update | ✅ | `DoctorDashboard.tsx` subscription |
| Doctor edit | ✅ | `TriageSummary.tsx` (edit state exists) |
| Patient submitted screen | ❌ | Missing (redirects to undefined `/summary` for patients) |

## Phase 5 – Accessibility & Polish
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Audio "Listen" | ✅ | `useAudio` hook used in screens |
| High‑contrast | ✅ | Toggle found in `App.tsx` |
| Large‑text | ❌ | Not implemented |
| Error boundaries | ⚠️ | Loading states exist, but React Error Boundaries missing |
| Deployment files | ✅ | `vercel.json`, `railway.json`, `SURVIVAL_DEPLOY.md` |

## Deferred / Stretch (Not in MVP)
| Feature | Status | Evidence / File |
|---------|--------|----------|
| Bhashini adapter | ❌ | Not found |
| Medra 4B | ❌ | Not found |
| 10 AYUSH | ⚠️ | `AyushFlow.tsx` has 5 live steps, but no placeholders for the other 5 |
| Patient dashboard | ⏸️ | Intentionally cut |
| FHIR live push | ⏸️ | Mock/Cut |
| Drug interactions | ⏸️ | Cut |
