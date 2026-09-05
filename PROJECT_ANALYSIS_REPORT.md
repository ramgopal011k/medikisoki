# PROJECT ANALYSIS REPORT

**Auditor**: Senior Software Auditor  
**Date**: September 4, 2026  
**Project**: MediKiosk – AI-Powered Clinical History Software Platform  
**Organization**: All India Institute of Ayurveda, Ministry of Ayush (Problem Statement 4)

---

## 1. Executive Summary

- **Project Name**: MediKiosk
- **Goal**: AI-powered patient-facing clinical history intake kiosk for Indian public hospital OPDs, including AYUSH (Ayurveda). Captures structured history via voice + touch, digitizes documents via OCR, generates physician-ready summaries, and integrates with ABDM/ABHA.
- **Overall Status**: 🟡 Yellow (Caution) — Core demo flows work. Multiple structural defects, security issues, and schema mismatches exist that would be caught by judges who inspect code or deviate from the happy path.
- **Demo/Launch Readiness**: **Demo: Yes (with caveats) | Production: No**
- **Confidence Level**: **Medium** — Happy-path works; edge-cases, off-script paths, and code inspection reveal significant issues.

---

## 2. Requirements Coverage

| Category | Requirements (from Problem Statement) | Implemented | Missing / Partial | Notes |
|----------|---------------------------------------|-------------|--------------------|-------|
| **Clinical History Capture** | Chief complaint, HPI, past history, drug/allergy, family/personal, ROS | ✅ 5/6 | ⚠️ ROS is implied but not a distinct module | Follow-up questions exist per complaint but are linear arrays, not true adaptive trees |
| **AYUSH Dashavidha Pariksha** | All 10 dimensions | ✅ 10/10 | — | `AyushFlow.tsx` covers Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara-Vihara, Agni, Koshtha |
| **Multimodal Input – Touch** | Tap-to-answer on every screen | ✅ | — | 64px min touch targets, kiosk-optimized |
| **Multimodal Input – Voice (ASR)** | Voice capture in Indian languages | ⚠️ Partial | Sarvam ASR endpoint exists but frontend uses `webkitSpeechRecognition` (browser-native) | Newly added mic button on `ChiefComplaint.tsx`; `InterviewQuestion.tsx` has a separate `VoiceButton` wired to Sarvam. Two parallel, unintegrated voice implementations. |
| **Multimodal Input – Document (OCR)** | Real Tesseract.js on real uploads | ⚠️ Partial | Tesseract.js runs on frontend; `/ocr-vision` backend returns **hardcoded mock text**, not real OCR | See §5 Critical Error #1 |
| **Language & Accessibility** | Multilingual (Hindi, English), audio prompts, high-contrast, large-text | ⚠️ Partial | Hindi hardcoded in AYUSH flow; no centralized i18n JSON file; audio prompts exist but use browser `speechSynthesis` (not Sarvam unless API key set) | Missing: sign-language avatar (stretch goal, acceptable) |
| **Document Digitisation** | Printed + handwritten OCR, chronological org, abnormal value highlighting, drug interactions | ⚠️ Partial | `clinicalAnalysis.ts` does drug-interaction + abnormal-lab detection, but only on manually-submitted text, not automatically on OCR output | Handwritten OCR: Tesseract is inadequate; Sarvam OCR endpoint exists but untested |
| **Summary Generation** | Structured, physician-ready, editable, bilingual | ⚠️ Partial | `TriageSummary.tsx` attempts 9-section display but relies on endpoints like `/sessions/:id/triage` and `/history-facts/:id` that **don't exist** in the backend routes | See §5 Critical Error #2 |
| **Integration – ABHA ID** | ABHA ID entry | ⚠️ Partial | Frontend collects it; `dummy_aadhaar` column is in code but **not in the `sessions` table** in `survival_migration.sql` | Data is lost — see §5 Critical Error #3 |
| **Integration – FHIR** | FHIR-shaped JSON export | ✅ | — | `fhir.ts` generates a valid FHIR R4 Bundle with Patient, Encounter, Observations |
| **Red-Flag Detection** | Deterministic emergency alerting | ✅ | — | 5 rules in `redflags.ts`; correctly locks screen; Gemini semantic fallback exists |
| **Privacy & Consent** | Consent-first, session termination, DPDP 2023 | ✅ | — | `ConsentFlow.tsx` clears session on mount; idle timeout (2 min) clears data |
| **Patient Journey** | Identify → Converse → Scan → Summarize → Consult | ⚠️ Partial | Steps 1-3 work; Step 4 (Summary) has broken endpoints; Step 5 (Consult/Doctor) partially works |
| **Doctor Dashboard** | 9-section separated view, edit/verify, red-flag acknowledge | ⚠️ Partial | Dashboard shows session list + red-flag badge. Triage detail view attempts 9 sections but data-fetching endpoints are missing. |

**Totals**: 14 requirement categories examined. 4 fully implemented (✅), 9 partially (⚠️), 1 acceptable deferral (sign language).

---

## 3. Codebase Health

### Architecture: ⚠️ Caution
- **Good**: Clean separation between frontend (Vite+React+TS) and backend (Express+TS). Supabase as managed DB/Auth/Realtime.
- **Bad**: Two parallel patient flows exist — an older `InterviewFlow.tsx` importing from `.agent/types/interview-tree` and a newer `FollowUp.tsx` importing from `data/01_HARDCODED_TREE.json`. Both are routed in `App.tsx` but serve overlapping purposes. This is confusing and fragile.
- **Bad**: Backend has a leftover SQLite database (`medikiosk.db`, 535KB WAL file) alongside the Supabase integration. Dead code / migration artifact.

### Code Quality: ⚠️ Caution
- **Hardcoded URLs**: 29 instances of `http://localhost:3001` are scattered across the frontend. No `VITE_API_URL` env variable is used. **Deployment will break** unless every file is manually updated.
- **Duplicate route**: `app.post('/auth/login', ...)` is defined **twice** in `index.ts` (lines 92 and 161) with **different credentials** (`doctor@demo.com` / `demo123` vs `doctor@medikiosk.com` / `demo1234`). Express will always hit the first one; the second is dead code.
- **Mixed route patterns**: Some endpoints use `/api/` prefix (e.g., `/api/sessions`), others don't (e.g., `/ayush-assessment`, `/match-voice`, `/ocr-vision`). Inconsistent API surface.
- **TypeScript `any`**: Pervasive use of `any` types throughout (e.g., `event: any`, `data: any`, `err: any`).
- **No README**: Project root has no `README.md`.

### Error Handling: ⚠️ Caution
- Backend routes have try/catch with generic `err.message` responses — acceptable for a hackathon.
- Frontend has no global error boundary despite `App.tsx` referencing it conceptually. Unhandled promise rejections in `fetch` calls could crash the UI silently.
- Red-flag evaluation failure is caught and logged but not surfaced to the doctor dashboard.

### Testing: ❌ Missing
- Backend `test` script is `echo "Error: no test specified" && exit 1`.
- Frontend has `vitest` configured but only one test file found (`medical-history.test.ts`).
- No integration or E2E test suite exists in the codebase.
- All testing has been done via manual browser automation (Playwright MCP agent), not repeatable CI tests.

### Security: ❌ Critical Issues
- **Exposed Credentials**: `.env` files contain real Supabase keys and are committed to git (`.gitignore` lists `.env` but the `.gitignore` file itself is corrupted — lines 8-9 contain null bytes: `.\0e\0n\0v\0`). The keys are visible in the repo.
- **CORS `origin: '*'`**: The backend accepts requests from any origin. Acceptable for local dev; unacceptable for production.
- **Service Role Key on Backend**: Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). This is correct for a backend but the key must never leak.
- **Mock Auth**: Doctor login uses hardcoded credentials (`doctor@demo.com` / `demo123`), not Supabase Auth. Acceptable for demo, not production.
- **No Input Sanitization**: User-provided text is passed directly into Gemini prompts (prompt injection risk in `/match-voice`, `/api/gemini/off-script`, `/api/gemini/red-flag`).

### Performance: ✅ Acceptable
- For a kiosk serving one patient at a time, performance is not a concern.
- Tesseract.js runs client-side which is correct (no server bottleneck).
- Supabase handles DB queries efficiently for this scale.

---

## 4. Documentation Status

| Doc Type | Status | Notes |
|----------|--------|-------|
| README | ❌ Missing | No `README.md` in project root. Setup, usage, architecture are undocumented. |
| API Docs | ❌ Missing | No OpenAPI/Swagger spec. Endpoints are discoverable only by reading `index.ts`. |
| Deployment Guide | ⚠️ Partial | `vercel.json` and `railway.json` exist as stubs. No written deployment instructions. |
| User Guide | ❌ Missing | No guide for patients or doctors. |
| Architecture Doc | ⚠️ Partial | `.agent/types/schema.md` documents the intended schema (12 tables). The actual deployed schema (`survival_migration.sql`) has only 4 tables. Massive drift. |
| Existing Reports | ✅ Present | 15 markdown reports in the root (gap analysis, audit, fix reports). Thorough internal documentation of past debugging. |

---

## 5. Critical Errors

| # | Error | Severity | File(s) | Details |
|---|-------|----------|---------|---------|
| 1 | **`/ocr-vision` returns hardcoded mock** | 🔴 CRITICAL | [`index.ts:141-155`](file:///c:/game/pythoncoding/New%20folder/hackathon/backend/src/index.ts#L141-L155) | The endpoint returns `{ text: "Patient reports history of hypertension...", fallback: true }` regardless of input. Real OCR only runs via Tesseract.js on the frontend or Sarvam (requires API key). If a judge inspects the backend, this is a showstopper for "Real OCR" requirement. |
| 2 | **TriageSummary calls non-existent endpoints** | 🔴 CRITICAL | [`TriageSummary.tsx:82`](file:///c:/game/pythoncoding/New%20folder/hackathon/frontend/src/pages/TriageSummary.tsx#L82) | Calls `/sessions/:id/triage` — this route does not exist in the backend. The doctor detail view will fail with a network error when a doctor clicks "View Triage Summary". |
| 3 | **Schema mismatch: `dummy_aadhaar`, `chief_complaint` columns missing** | 🔴 CRITICAL | [`survival_migration.sql`](file:///c:/game/pythoncoding/New%20folder/hackathon/survival_migration.sql) vs [`sessions.ts:40`](file:///c:/game/pythoncoding/New%20folder/hackathon/backend/src/routes/sessions.ts#L40) | The `sessions` table in the migration has no `dummy_aadhaar` or `chief_complaint` columns, but the backend `SELECT` and frontend reference them. Supabase silently returns `null` for these columns, so patient ABHA IDs and chief complaints are **never persisted to the session row**. |
| 4 | **Duplicate `/auth/login` route** | 🟡 HIGH | [`index.ts:92`](file:///c:/game/pythoncoding/New%20folder/hackathon/backend/src/index.ts#L92) and [`index.ts:161`](file:///c:/game/pythoncoding/New%20folder/hackathon/backend/src/index.ts#L161) | Two definitions with different credentials. The second is unreachable dead code. Confusing but not breaking (the first one works for `doctor@demo.com`). |
| 5 | **29 hardcoded `localhost:3001` URLs** | 🟡 HIGH | All frontend files | Deployment to Vercel/Railway will fail unless every URL is replaced with an env variable. |
| 6 | **Follow-up questions are linear, not truly adaptive** | 🟡 HIGH | [`01_HARDCODED_TREE.json`](file:///c:/game/pythoncoding/New%20folder/hackathon/frontend/src/data/01_HARDCODED_TREE.json) | The "adaptive interview" is a flat array of questions per complaint. The same 3 questions are always asked in the same order regardless of answers. The problem statement explicitly requires "next question depends on previous answer." The alternative `InterviewFlow.tsx` imports from `.agent/types/interview-tree` which may have true branching, but it's unclear if that path is reachable from the current user flow. |
| 7 | **Corrupted `.gitignore`** | 🟡 MEDIUM | [`.gitignore:8-9`](file:///c:/game/pythoncoding/New%20folder/hackathon/.gitignore#L8-L9) | Contains null bytes (`\0`). May cause `.env` files to not be properly ignored on some git implementations. |
| 8 | **`ayush-assessment` endpoint inconsistency** | 🟡 MEDIUM | [`AyushFlow.tsx:143`](file:///c:/game/pythoncoding/New%20folder/hackathon/frontend/src/pages/AyushFlow.tsx#L143) vs [`index.ts:179`](file:///c:/game/pythoncoding/New%20folder/hackathon/backend/src/index.ts#L179) | Frontend calls `/ayush-assessment` (no `/api/` prefix) which hits the raw endpoint on `index.ts`, not a router. Works, but inconsistent with the rest of the API. |

---

## 6. Missing Elements

| Missing Item | Impact | Priority |
|--------------|--------|----------|
| **README.md** | Judges cannot understand setup/architecture | P1 |
| **`/sessions/:id/triage` backend endpoint** | Doctor cannot view patient triage detail | P1 |
| **`dummy_aadhaar` and `chief_complaint` columns in sessions table** | ABHA IDs and complaints not stored in session row | P1 |
| **Centralized `VITE_API_URL` env variable** | Deployment impossible without manual URL replacement in 29 files | P1 |
| **Automated test suite** | No regression protection; no CI evidence for judges | P2 |
| **Centralized i18n JSON files** | Hindi translations are scattered/hardcoded, not centralized | P2 |
| **`back_pain` complaint tree** | Problem statement specifies 6 complaints; only 5 are in the tree JSON (missing back pain) | P2 |
| **Global error boundary** | Unhandled errors crash the UI silently | P2 |
| **Patient dashboard login** | `PatientLogin.tsx` and `PatientDashboard.tsx` exist but unclear if they work with real data | P3 |

---

## 7. Risks & Constraints

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Judge clicks "View Triage Summary" → network error** | High | High | Implement `/sessions/:id/triage` endpoint immediately |
| **Judge inspects `/ocr-vision` → finds hardcoded mock** | High | High | Remove mock; use Tesseract server-side or Sarvam if key present |
| **Judge enters ABHA → value silently lost** | High | Medium | Add `dummy_aadhaar` column to sessions table migration |
| **Deploy to Vercel/Railway → all API calls fail** | High (if deploying) | Critical | Replace all hardcoded URLs with `import.meta.env.VITE_API_URL` |
| **Sarvam API key missing → ASR/TTS/OCR all return 501** | Medium | Medium | Endpoints already fail gracefully to WebSpeech/Tesseract fallbacks |
| **Gemini API key missing → off-script returns mock** | Low | Low | Mock response is reasonable for demo |
| **Linear questionnaire exposed as non-adaptive** | Medium | High | The current tree is a flat array. If a judge asks "does the next question change based on the answer?" the answer is no for the `FollowUp.tsx` path. |

---

## 8. Recommendations (Prioritized)

| Priority | Action | Time Estimate | Details |
|----------|--------|---------------|---------|
| **P1** | Add `/sessions/:id/triage` backend endpoint | 1 hour | Must aggregate answers, red_flags, ayush_assessments, and summaries for a session and return them as structured JSON for `TriageSummary.tsx` to consume. |
| **P1** | Add `dummy_aadhaar` and `chief_complaint` columns to `sessions` table | 15 min | Run `ALTER TABLE sessions ADD COLUMN dummy_aadhaar TEXT; ALTER TABLE sessions ADD COLUMN chief_complaint TEXT;` on Supabase, and update the `INSERT` in `sessions.ts` to include these fields. |
| **P1** | Remove duplicate `/auth/login` route | 5 min | Delete lines 161-176 in `index.ts`. |
| **P1** | Replace hardcoded mock in `/ocr-vision` | 30 min | Use Tesseract server-side (`tesseract.js` is already a dependency concept) or route through the existing Sarvam OCR endpoint with fallback. |
| **P1** | Create `README.md` | 30 min | Project overview, setup instructions, architecture diagram, demo credentials, tech stack. |
| **P2** | Centralize `localhost:3001` → `VITE_API_URL` | 1 hour | Create a `frontend/src/lib/api.ts` with `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'` and replace all 29 occurrences. |
| **P2** | Add `back_pain` complaint to `01_HARDCODED_TREE.json` | 15 min | Add tree matching the pattern of other complaints. |
| **P2** | Fix corrupted `.gitignore` | 5 min | Remove null-byte lines 8-9. |
| **P2** | Add global `ErrorBoundary` component | 30 min | Wrap `<AppRoutes />` in an error boundary that shows a calm fallback screen. |
| **P3** | Write 5-10 Vitest unit tests for red-flag rules | 1 hour | Deterministic logic should have deterministic tests. |
| **P3** | Clean up dead code (duplicate InterviewFlow, SQLite files) | 30 min | Remove `medikiosk.db*` files and clarify which interview flow is canonical. |
| **P4** | True adaptive branching in follow-up trees | 3 hours | Replace flat arrays with `next_question_map` keyed by answer value. |

---

## 9. Verdict

- **Demo Ready?**: **Conditionally Yes** — The happy-path works for patient registration, follow-up questions, AYUSH assessment, red-flag lockout, and the doctor dashboard session list. The application is visually polished and accessible.
- **Critical Blockers for Demo**:
  1. Doctor clicking "View Triage Summary" will fail (missing endpoint).
  2. ABHA ID entered by patient is silently lost (missing column).
  3. `/ocr-vision` returns hardcoded text (violates "Real OCR" requirement).
- **Time to Fix Blockers**: ~2-3 hours for P1 items.
- **Overall Confidence**: **Medium** — The surface-level demo is impressive, but judges who probe beyond the happy path or inspect code will find structural defects.
- **Next Steps**:
  1. Fix P1 items (triage endpoint, schema columns, mock OCR, duplicate route, README).
  2. Run a full end-to-end test covering the doctor triage detail view.
  3. Prepare a demo script that stays on the happy path and avoids edge cases.
  4. Before deployment: centralize API URL and rotate exposed Supabase keys.
