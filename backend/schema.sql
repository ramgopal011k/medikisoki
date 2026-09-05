-- Supabase Schema for MediKiosk

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_name TEXT NOT NULL,
    location TEXT NOT NULL,
    hospital_type TEXT NOT NULL
);

-- 2. doctors
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hospital_id UUID REFERENCES hospitals(hospital_id),
    uid TEXT UNIQUE
);

-- 3. sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(hospital_id),
    patient_name TEXT NOT NULL,
    dummy_aadhaar TEXT NOT NULL,
    language TEXT NOT NULL,
    chief_complaint TEXT NOT NULL,
    session_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. history_facts
CREATE TABLE IF NOT EXISTS history_facts (
    fact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    complaint TEXT,
    question_id TEXT,
    question_text TEXT,
    answer TEXT,
    answer_value TEXT,
    red_flag_id TEXT,
    provenance TEXT CHECK (provenance IN ('patient_reported', 'doctor_entered', 'system_derived', 'ocr_extracted')),
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. medical_history
CREATE TABLE IF NOT EXISTS medical_history (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    provenance TEXT CHECK (provenance IN ('patient_reported', 'doctor_entered', 'system_derived', 'ocr_extracted')),
    verified BOOLEAN DEFAULT false
);

-- 6. ayush_assessments
CREATE TABLE IF NOT EXISTS ayush_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    value TEXT NOT NULL,
    provenance TEXT CHECK (provenance IN ('patient_reported', 'doctor_entered', 'system_derived', 'ocr_extracted'))
);

-- 7. documents
CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    upload_status TEXT DEFAULT 'pending',
    ocr_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ocr_extractions
CREATE TABLE IF NOT EXISTS ocr_extractions (
    extraction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    raw_text TEXT,
    field_name TEXT NOT NULL,
    field_value TEXT,
    confidence NUMERIC,
    corrected_value TEXT,
    provenance TEXT CHECK (provenance IN ('patient_reported', 'doctor_entered', 'system_derived', 'ocr_extracted')),
    verified BOOLEAN DEFAULT false
);

-- 9. red_flags
CREATE TABLE IF NOT EXISTS red_flags (
    flag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    triggered_fact_id UUID REFERENCES history_facts(fact_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by UUID REFERENCES doctors(doctor_id),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- 10. summaries
CREATE TABLE IF NOT EXISTS summaries (
    summary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE REFERENCES sessions(session_id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized BOOLEAN DEFAULT false
);

-- 11. summary_fields
CREATE TABLE IF NOT EXISTS summary_fields (
    field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary_id UUID REFERENCES summaries(summary_id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT,
    provenance TEXT CHECK (provenance IN ('patient_reported', 'doctor_entered', 'system_derived', 'ocr_extracted')),
    verified BOOLEAN DEFAULT false,
    edited_by UUID REFERENCES doctors(doctor_id)
);

-- REALTIME CONFIGURATION
-- Enable replication for specific tables to allow Supabase Realtime to work
BEGIN;
  -- Remove the supabase_realtime publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create it again with the necessary tables
  CREATE PUBLICATION supabase_realtime FOR TABLE sessions, history_facts, red_flags;
COMMIT;

-- SEED DATA
INSERT INTO hospitals (hospital_id, hospital_name, location, hospital_type)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'City General Hospital', 'New Delhi', 'Public'),
  ('22222222-2222-2222-2222-222222222222', 'Rural Health Clinic', 'Bihar', 'Primary')
ON CONFLICT (hospital_id) DO NOTHING;

INSERT INTO doctors (doctor_id, name, email, hospital_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Dr. Smith', 'doctor@medikiosk.com', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (email) DO NOTHING;


