# 🏥 MediKiosk – AI-Powered Clinical History & Triage Platform

> **Smart Multilingual Kiosk for Hospital OPDs with Dual Allopathy & AYUSH (Dashavidha Pariksha) Support**  
> *Developed for All India Institute of Ayurveda & Ministry of Ayush (Problem Statement 4)*

---

## 📌 Project Overview

**MediKiosk** is a state-of-the-art, offline-resilient, multimodal clinical triage kiosk designed for Indian healthcare settings. It empowers OPD patients to self-record structured clinical histories using touch, voice (Hindi/English ASR), or physical document OCR scanning before seeing a physician.

The system dynamically analyzes complaints, surfaces red-flag emergencies in real-time to clinicians, and records holistic 10-dimension AYUSH *Dashavidha Pariksha* assessments alongside standard Allopathic interviews.

---

## 🏗️ Architecture & Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                       PATIENT KIOSK                         │
│  - Multilingual UI (EN / HI)                                │
│  - Speech-to-Text (Sarvam ASR + WebSpeech API)             │
│  - Text-to-Speech (Sarvam TTS + WebSpeech Synthesis)        │
│  - Prescription OCR (Sarvam Document API + Tesseract.js)   │
│  - Offline-first IndexedDB Queue (idb-keyval)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (VITE_API_URL)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   MEDIKIOSK BACKEND API                     │
│  - Express.js + TypeScript Server (Port 3001)               │
│  - Session Management & Triage Summarizer                   │
│  - Realtime Red-Flag Detection Engine                       │
│  - HL7 / FHIR Bundle Generation                             │
│  - AI Off-Script Routing (Google Gemini 1.5 Flash)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Client & Realtime
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE POSTGRESQL                     │
│  - `sessions` (Patient sessions, status, red flags)         │
│  - `answers` (Patient facts, provenance, verification)      │
│  - `ayush_assessments` (Dashavidha Pariksha 10 dimensions)  │
│  - `summaries` (Generated clinical summaries)               │
│  - Realtime WebSocket publication on `sessions`             │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Realtime sync & Triage View
┌──────────────────────────────┴──────────────────────────────┐
│                    DOCTOR TRIAGE DASHBOARD                  │
│  - Live Realtime OPD Queue with Red-Flag Alerts             │
│  - Full Provenance Badges (Patient/Doctor/OCR/System)       │
│  - Inline Fact Verification & Clinical Note Editor          │
│  - Instant FHIR R4 Bundle Export                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS + Lucide Icons + Custom Ayurvedic Sand Theme
- **Audio & Multimodal**: Sarvam AI API, Web Speech API (`SpeechRecognition`, `speechSynthesis`)
- **OCR Engine**: Sarvam Document Parsing API + Tesseract.js fallback
- **Offline Storage**: IndexedDB via `idb-keyval`
- **Realtime**: `@supabase/supabase-js` Realtime WebSocket subscriptions

### **Backend**
- **Runtime**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL with Realtime CDC)
- **AI / LLM Integration**: Google Generative AI (`@google/generative-ai`), Sarvam AI
- **Healthcare Standards**: FHIR R4 JSON Bundle Generator

---

## ⚙️ Environment Variables

### **Backend (`backend/.env`)**
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
# OR SUPABASE_ANON_KEY=your-supabase-anon-key

# AI & Voice Provider Keys (Optional with built-in fallbacks)
SARVAM_API_KEY=your-sarvam-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### **Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Database Migrations in Supabase
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run `survival_migration.sql` to initialize the core schema:
   - Tables: `hospitals`, `sessions`, `answers`, `summaries`.
   - Realtime publication enabled for `sessions`.
3. Run `add_missing_columns.sql` to ensure all columns exist:
   ```sql
   ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dummy_aadhaar TEXT;
   ALTER TABLE sessions ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
   ```

### 3. Start Development Servers

**Start Backend:**
```bash
cd backend
npm run dev
# Server running at http://localhost:3001
```

**Start Frontend:**
```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

---

## 🔑 Demo Credentials & Test Flows

### **1. Doctor Dashboard**
- **URL**: `http://localhost:5173/doctor/login`
- **Email**: `doctor@demo.com`
- **Password**: `demo123`
- *(Alternatively, click "Dev Bypass Login" in development mode).*

### **2. Patient Kiosk Journey**
1. **Language & Hospital**: Visit `http://localhost:5173/consent`, choose **English** or **Hindi**, select Hospital.
2. **ABHA / Aadhaar ID**: Enter 14-digit ABHA or skip to generate anonymous record.
3. **Chief Complaint**: Select or speak a complaint (e.g., Chest Pain, Fever, Cough, Stomach Pain).
4. **Adaptive Follow-Up / AYUSH**: Complete adaptive questions or 10-dimension Dashavidha Pariksha.
5. **Document OCR**: Upload prescription image for instant OCR extraction.
6. **Live Doctor Queue**: Watch the session appear instantly on `http://localhost:5173/doctor/dashboard` via Supabase Realtime!

### **3. Patient Health Portal**
- **URL**: `http://localhost:5173/patient/login`
- **Lookup**: Enter the patient's ABHA ID to view visit history and download FHIR R4 bundles.

---

## 🛡️ Key Features & Differentiators

- **Dual Clinical Paradigms**: Complete support for Allopathic triage and AYUSH *Dashavidha Pariksha* (Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara-Vihara, Agni, Koshtha).
- **Zero-Latency Realtime Updates**: Doctor dashboard receives instant patient triage submissions without manual polling.
- **Auditable Data Provenance**: Every clinical fact is tagged with `patient_reported`, `doctor_entered`, `system_derived`, or `ocr_extracted`.
- **Interoperability**: One-click export to FHIR R4 Bundle format for ABDM (Ayushman Bharat Digital Mission) compliance.
- **Fail-Safe Offline Operation**: Automatic queueing in IndexedDB with background resynchronization upon network restoration.
