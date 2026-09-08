# MEDIKIOSK TECH STACK REPORT

## 1. Executive Summary
- **Frontend**: React 19, Vite 8, Tailwind CSS 3.4, TypeScript 6.0
- **Backend**: Express 5.2, Node.js (v22), TypeScript 7.0
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Google Gemini 1.5 Flash, Sarvam AI (ASR, TTS, Document Parsing)
- **Deployment**: Vercel (Frontend), Railway (Backend), Supabase (Managed DB)
- **Local Models**: ❌ MISSING ENTIRELY (Medra 4B / Ollama are not present in the codebase)

## 2. Frontend Stack
| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 19.2.8 | UI Component Library |
| Build Tool | Vite | 8.2.2 | Dev Server & Bundler |
| Language | TypeScript | 6.0.2 | Static Typing |
| Routing | React Router DOM | 7.18.3 | Client-side Navigation |
| Styling | Tailwind CSS | 3.4.19 | Utility-first CSS |
| UI Components | Lucide React | 1.39.0 | Iconography |
| Database Client| @supabase/supabase-js | 2.114.0 | Realtime DB & Auth Client |
| State/Storage | idb-keyval | 6.3.0 | IndexedDB Wrapper |
| OCR Fallback | tesseract.js | 7.0.0 | Client-side OCR Fallback |

## 3. Backend Stack
| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | Express | 5.2.1 | API Web Server |
| Language | TypeScript | 7.0.2 | Static Typing |
| Runtime Environment| tsx | 4.23.13 | TypeScript Execution |
| Database Client| @supabase/supabase-js | 2.114.0 | Server-side DB & Admin Client |
| AI Integration | @google/generative-ai | 0.24.1 | Gemini API Client |
| File Handling | multer | 2.3.0 | Multipart form-data parsing |

## 4. Database Schema
Based on `survival_migration.sql`, the schema exactly follows the 4-table plan:

| Table | Columns | Purpose |
|-------|---------|---------|
| `hospitals` | `id`, `name`, `created_at` | Stores hospital details |
| `sessions` | `id`, `hospital_id`, `patient_name`, `language`, `red_flag`, `locked`, `status`, `created_at` | Core patient triage sessions |
| `answers` | `id`, `session_id`, `question_id`, `answer_text`, `provenance`, `created_at` | Individual answers to triage questions |
| `summaries` | `id`, `session_id`, `content`, `doctor_verified`, `created_at` | Final triage summaries (JSON) for doctor review |

## 5. AI/ML Services
| Service | Type | Status | Integration Point |
|---------|------|--------|-------------------|
| Sarvam ASR | Cloud | ✅ | `backend/src/index.ts` (`/api/sarvam/asr`) |
| Sarvam TTS | Cloud | ✅ | `backend/src/index.ts` (`/api/sarvam/tts`) |
| Sarvam Vision | Cloud | ✅ | `backend/src/index.ts` (`/api/sarvam/ocr`, `/ocr-vision`) |
| Gemini 1.5 Flash | Cloud | ✅ | `backend/src/index.ts` (`/api/gemini/off-script`, `/api/gemini/red-flag`, `/match-voice`) |
| Medra 4B (Local) | Local | ❌ | **MISSING** (`/api/llm/followup` does not exist) |

## 6. Local Models Audit
| Model | Format | Status | Deployment | RAM | Fallback |
|-------|--------|--------|------------|-----|----------|
| Medra 4B | GGUF Q4 | ❌ Missing | Not Configured | N/A | N/A |

### Medra 4B Integration Details
- **Status**: **NOT INTEGRATED**
- **Model**: `mradermacher/Medra4b-i1-GGUF` (Missing)
- **Size**: N/A
- **Format**: N/A
- **Deployment**: Ollama is **NOT** configured on Railway (`railway.json` only contains standard Node 22 build config).
- **Use Cases**:
  - Off‑script follow‑ups ("Other" complaints) -> Currently handled by Gemini.
  - AYUSH remaining 5 dimensions -> Currently no LLM logic found for this.
- **Service File**: `backend/src/services/medra.service.ts` is **MISSING**.
- **Endpoint**: `/api/llm/followup` is **MISSING**.

## 7. Deployment Stack
| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | `vercel.json` |
| Backend | Railway | `railway.json` (NIXPACKS_NODE_VERSION: 22) |
| Database | Supabase | Managed |
| Ollama | Railway | ❌ Missing Config |

## 8. Environment Variables
| Variable | Purpose | Status | Location |
|----------|---------|--------|----------|
| `VITE_SUPABASE_URL` | Frontend Database URL | ✅ | `frontend/.env` |
| `VITE_SUPABASE_ANON_KEY` | Frontend Anon Key | ✅ | `frontend/.env` |
| `SUPABASE_URL` | Backend Database URL | ✅ | `backend/.env` |
| `SUPABASE_ANON_KEY` | Backend Anon Key | ✅ | `backend/.env` |
| `SUPABASE_SERVICE_ROLE_KEY`| Backend Admin Key | ✅ | `backend/.env` |
| `GEMINI_API_KEY` | Gemini LLM | ✅ | `backend/.env` |
| `SARVAM_API_KEY` | Voice/OCR | ✅ | `backend/.env` |
| `OLLAMA_URL` | Local LLM Endpoint | ❌ | MISSING |

## 9. Comparison vs Planned Stack
| Planned | Actual | Gap |
|---------|--------|-----|
| React / Vite / Tailwind | React / Vite / Tailwind | No Gap |
| Node / Express | Node / Express | No Gap |
| Supabase (4 tables) | Supabase (4 tables) | No Gap |
| Sarvam API | Sarvam API | No Gap |
| Gemini 1.5 Flash | Gemini 1.5 Flash | No Gap |
| **Local Models (Medra 4B)** | **None** | **CRITICAL GAP**: No local models are integrated. Ollama is missing. |
| Railway deployment (Backend + Ollama) | Railway deployment (Backend only) | **CRITICAL GAP**: Ollama is not configured in Railway. |

## 10. Recommendations
1. **Implement Local LLM**: The most significant missing piece is the Medra 4B local model integration via Ollama. You need to:
   - Configure Ollama to run on Railway alongside the backend (or in a separate container).
   - Create `backend/src/services/medra.service.ts` to connect to the Ollama URL.
   - Implement the `/api/llm/followup` endpoint.
   - Update the frontend to fallback to Medra 4B for "Other" complaints and AYUSH questions.
2. **Refactor Routes**: Currently, all route logic (Gemini, Sarvam, Documents, History, AYUSH) is bundled into a massive `backend/src/index.ts` file. It's recommended to extract these into proper controller files within the `backend/src/routes/` directory.
3. **Environment Security**: The `.env` files containing live Supabase, Sarvam, and Gemini keys are currently committed to the directory structure. Make sure they are correctly added to `.gitignore` to prevent secret leakage.
