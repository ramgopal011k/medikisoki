### Phase 2 Audit Findings (Swasthya Design System)

- **AudioExplanationButton**: Initially used `VoiceButton` directly; explicitly created `AudioExplanationButton.tsx` (64px) for the consent screen.
- **Chief Complaint Icons**: Re-sized from 64px to exactly 72px width/height.
- **Focus Rings**: Added `focus:ring-2 focus:ring-warmgray focus:ring-offset-2` to inputs and buttons across the flows.
- **Doctor Login**: Adjusted inputs to exactly 64px height.
- **Doctor Dashboard**: Adjusted logout button to exactly 64px height.
- **Session Privacy Reset**: Explicitly added `localStorage.removeItem('patient_session')` and `localStorage.removeItem('patient_complaint')` to the `App.tsx` timeout before reloading the page.

### Block 1 Fixes (Start Button & Patients)
- **Start Button Fixed**: The start button in ConsentFlow did not correctly insert the `chief_complaint` to the backend. The backend `sessions` table was recreated to include `chief_complaint`. The `POST /sessions` endpoint was updated to accept it.
- **Success Screen Added**: Created a `success` step ("Ready! Your clinical interview will begin shortly...") upon successful session creation instead of a basic `alert()`.
- **Doctor Dashboard Updated**: Added `GET /sessions` to the backend. Modified `DoctorDashboard.tsx` to fetch patients assigned to the logged-in doctor's hospital and display them correctly, showing the patient's Aadhaar and Complaint.

### Phase 1 Code Review & Skill Application
- **Skills Discovered**: `improve`, `improve-codebase-architecture`, `thermo-nuclear-code-quality-review`.
- **Finding (ConsentFlow)**: Identified massive spaghetti inline branching (`step === 'language'`, etc.) within a single 270+ line file. 
- **Finding (Architecture)**: Lack of separated routing/controllers in `backend/src/index.ts`.
- **Decision**: Logged architectural debt. Will prioritize extracting `ConsentFlow` steps into a discrete `StepCoordinator` and separate component files during the Block 2 (Adaptive Interview Engine) implementation, as Block 2 requires dynamic routing anyway.

### Block 3 Fixes
- **Offline Queue**: Added `idb-keyval` queue to `MedicalHistoryFlow.tsx` mimicking `InterviewFlow.tsx` to save history items offline if internet drops and flush on reconnect.
- **Linter Strictness**: Cleaned up 6 `set-state-in-effect` and `no-unused-vars` warnings across `TriageSummary.tsx`, `MedicalHistoryFlow.tsx`, and `InterviewFlow.tsx` by using internal async init functions inside `useEffect` and proper initialization.
- **Endpoint Validation**: Added 400 bad request validation to `POST /medical-history` (validating `session_id` and `category` enums) to prevent backend SQLite Foreign Key and NOT NULL 500 errors.
- **Unit Tests**: Created `medical-history.test.ts` to assert that invalid medical history posts return 400, valid ones return 201, and that fetching works (37 total tests pass now).

### Pre-Block 5 Stabilization Fixes
- **Other Chief Complaint Fallback**: Created `other.ts` tree and mapped 'Other' to it, fixing white-screen crash.
- **OCR Error Handling**: Modified `DocumentUploadFlow.tsx` to handle upload failures with Skip/Retry buttons instead of trapping the user.
- **Real-Time Dashboard**: Added a 5-second `setInterval` polling mechanism to `DoctorDashboard.tsx` with a "Live" visual indicator to prevent stale data.
- **9-Way Summary & Fact Verification**: Rewrote `TriageSummary.tsx` to support the 9 required distinct sections, and added inline editing of facts (`PATCH` endpoint on backend).
- **Voice Input Robustness**: Updated `VoiceButton.tsx` to reflect error and unsupported states. Updated `InterviewQuestion.tsx` to gracefully degrade to text/touch inputs and display appropriate warnings instead of hiding the voice area completely.
- **OCR Regex Tuning**: Updated heuristic extraction in `DocumentUploadFlow.tsx` to catch more real-world lab metrics and abbreviations.

### Block 5 Merge Conflict Resolution
- **Backend Supabase Migration**: Validated that `better-sqlite3` and `src/db.ts` were correctly deleted. Ensured all routes in `backend/src/index.ts` use `@supabase/supabase-js`.
- **Template-Based Summaries**: Removed the `@google/generative-ai` LLM prose integration from `backend/src/summary.ts` and replaced it with a purely string-interpolation-based template, saving as `system_derived`.
- **Batched Endpoints Restored**: Re-implemented `POST /ocr-extractions` and `POST /medical-history` to accept batched arrays to support the local frontend fixes that passed them in bulk.
- **Supabase Realtime Subscriptions**: Removed local `setInterval` polling in favor of cleaner native Supabase Realtime subscriptions in `DoctorDashboard.tsx` (for session list) and `InterviewFlow.tsx` (for red flags).
- **Mocked Tests**: Updated frontend integration tests to use `vi.stubGlobal('fetch', ...)` to mock the new Supabase-backed API responses so that tests can successfully run without `.env` credentials in non-production environments. All 48 tests pass.

### Final Polish 5 Fixes
- **Fix 1 (Sarvam OCR)**: Modified `DocumentUploadFlow.tsx` to read the image as base64 and hit the backend `/ocr-vision` endpoint first, using Tesseract.js only as a fallback if the backend OCR fails.
- **Fix 2 (Reconciliation Engine)**: Added logic to `TriageSummary.tsx` to compare OCR extractions against medical history and patient facts, displaying any conflicts visually in the UI for the doctor to resolve.
- **Fix 3 (AYUSH Completeness)**: Added 6 missing Dashavidha Pariksha dimensions (Sara, Samhanana, Pramana, Satmya, Vyayama Shakti, Vaya) to `AyushFlow.tsx` completing the 12-dimension set.
- **Fix 4 (Completeness Engine)**: Added completeness scoring and missing-field detection to `backend/src/summary.ts` which assigns scores based on Chief Complaint, HPI, Medical History, Allergies, and AYUSH Assessment completion, then rendered this dynamically in `TriageSummary.tsx`.
- **Fix 5 (Red-Flag Acknowledge)**: Added a "Acknowledge and Clear Flags" button to the Red Flags section of `TriageSummary.tsx` that calls `PATCH /sessions/:id` to clear the flag status.
