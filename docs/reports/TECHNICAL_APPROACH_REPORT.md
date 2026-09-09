# MEDIKIOSK – TECHNICAL APPROACH & ARCHITECTURE

## 1. Technical Approach

### 1.1 Frontend UI
The frontend is built as a Single Page Application (SPA) utilizing **React 19** with **TypeScript** for strict type safety. It leverages **Vite** as a blazing-fast build tool and development server. For styling, it embraces a utility-first approach with **Tailwind CSS**, supplemented by `class-variance-authority` and `clsx` for dynamic component states. UI iconography is provided by **Lucide React**. Client-side routing is handled by **React Router DOM v7**. The frontend is deployed globally via **Vercel**.

### 1.2 Backend API & Logic
The backend is a robust RESTful API built on **Node.js (v22)** and **Express 5.2**, written in **TypeScript**. It acts as the central orchestration layer, handling multipart form data (via `multer`) for document and audio uploads, and securely proxying requests to third-party AI services. It interfaces directly with the database using the Supabase client. The backend is containerized (using Nixpacks) and deployed on **Railway** (or Render, depending on target environment).

### 1.3 Database & Realtime
Data persistence is handled by **Supabase (Managed PostgreSQL)**. The database follows a clean 4-table relational schema: `hospitals`, `sessions`, `answers`, and `summaries`. Crucially, it leverages Supabase's Realtime capabilities on the `sessions` table, allowing the Doctor Dashboard to receive instantaneous updates as patients progress through the intake flow at the kiosk.

### 1.4 AI & Integration
The application orchestrates a hybrid AI approach:
- **Sarvam AI (Cloud)**: Handles Indian-language voice processing with Text-to-Speech (TTS) and Automatic Speech Recognition (ASR), alongside Vision OCR for medical document parsing.
- **Google Gemini 1.5 Flash (Cloud)**: Provides semantic routing and generative capabilities, specifically for processing "Other" chief complaints (off-script generation), semantic voice matching, and critical red-flag detection based on patient answers.
- **Medra 4B (Local/Planned)**: Intended as a local fallback LLM running via Ollama for privacy-first, off-grid capabilities, specifically targeting AYUSH dimensions and fallback semantic logic.

## 2. Implementation Process (Patient Journey)

### Step 1 – Identify
**What happens:** The patient approaches the kiosk, selects their preferred local language, and provides identification (e.g., ABHA ID) and consent. A new triage session is initialized.
**Technology:** React UI, Supabase DB (`sessions` table).

### Step 2 – Converse
**What happens:** An interactive, adaptive medical interview begins. The system asks structured questions (following the SOCRATES pain assessment framework). If a patient selects "Other", the system falls back to a generative AI follow-up. 
**Technology:** Sarvam TTS (reads questions), Sarvam ASR (listens to answers), Gemini 1.5 Flash (voice matching & off-script questions). Supabase DB (`answers` table).

### Step 3 – Scan
**What happens:** The patient is prompted to upload or scan past medical records, prescriptions, or lab reports. The system extracts relevant text and structured data.
**Technology:** React (camera/file upload UI), Express (`multer` parsing), Sarvam Document Parsing API (Vision OCR) with client-side Tesseract.js as a potential fallback.

### Step 4 – Summarize
**What happens:** All collected structured answers and OCR extractions are synthesized into a concise, clinical summary. The system also runs a semantic check for immediate emergency red-flags.
**Technology:** Backend logic (template assembly), Gemini 1.5 Flash (semantic red-flag detection), Supabase DB (`summaries` table).

### Step 5 – Consult
**What happens:** The finalized summary appears instantly on the Doctor's Dashboard. The doctor can review the timeline, edit facts, verify the summary, and call the patient in for a focused consultation.
**Technology:** Supabase Realtime subscriptions (WebSockets), React UI.

## 3. Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|                                                                                   |
|  +-------------------------+                       +---------------------------+  |
|  |     Patient Kiosk       |                       |    Doctor Dashboard       |  |
|  | (React / Vite / Vercel) |                       | (React / Vite / Vercel)   |  |
|  +-----------+-------------+                       +-------------+-------------+  |
|              | (HTTPS / REST)                                    | (WebSockets)|  |
+--------------|---------------------------------------------------|----------------+
               |                                                   |
               v                                                   v
+---------------------------------------------+      +---------------------------+
|               BACKEND TIER                  |      |      DATA TIER            |
|                                             |      |                           |
|  +---------------------------------------+  |      |  +---------------------+  |
|  |           Express API Server          +----------> |      Supabase       |  |
|  | (Node.js / TypeScript / Railway)      |  |      |  |    (PostgreSQL)     |  |
|  +--+-------------+-------------+--------+  |      |  +---------------------+  |
|     |             |             |           |      +---------------------------+
+-----|-------------|-------------|-----------+
      |             |             |
      v             v             v
+-----------+ +-----------+ +-----------+
| Sarvam AI | |  Gemini   | | Medra 4B  |
| (Voice /  | | 1.5 Flash | | (Ollama)  |
|   OCR)    | | (Routing) | | (Planned) |
+-----------+ +-----------+ +-----------+
              (CLOUD / LOCAL AI TIER)
```

## 4. Technologies Used

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, TypeScript 6 | Core UI Framework |
| **Frontend** | Vite 8, Tailwind CSS 3.4 | Build Tooling & Styling |
| **Frontend** | React Router DOM 7 | Client Routing |
| **Backend** | Node.js 22, Express 5.2 | REST API Server |
| **Backend** | Multer, Form-Data | File upload handling |
| **Database** | Supabase (PostgreSQL) | Persistence & Auth |
| **Database** | Supabase Realtime | Live Dashboard Updates |
| **AI (Cloud)** | Sarvam AI API | Indian language TTS, ASR, OCR |
| **AI (Cloud)** | Google Gemini 1.5 Flash | Semantic routing, Red-flag detection |
| **AI (Local)** | Ollama, Medra 4B GGUF | Privacy-first local LLM (Planned) |
| **Deployment**| Vercel | Frontend Global CDN |
| **Deployment**| Railway (or Render) | Backend Container Hosting |

## 5. Local Models Intent

**Medra 4B Integration & Adapter Design**
To ensure complete privacy and robust off-grid capabilities, the architecture includes a planned integration of **Medra 4B** (`mradermacher/Medra4b-i1-GGUF`), an approx. 4 billion parameter clinical LLM.

- **Adapter Design**: The backend will implement a standard LLM adapter pattern (e.g., `medra.service.ts`), exposing endpoints like `/api/llm/followup`. This service will connect to a local Ollama instance rather than a cloud provider.
- **Use Cases**: Medra 4B will act as a primary or fallback engine for processing "Other" clinical complaints, generating contextual off-script questions, and mapping complex traditional medicine (AYUSH) dimensions (Sara, Samhanana, etc.).
- **Deployment Plan**: The backend deployment environment (currently Railway) must be scaled to an instance with sufficient RAM (~8GB) to host the Ollama runtime and load the Q4 quantized GGUF model into memory alongside the Node server. If Railway proves insufficient for ML workloads, this component may be migrated to a Render instance with attached GPU capabilities or deployed on bare-metal edge devices within the hospital network.
