-- Drop existing tables (order matters for FK)
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

-- Create 4-table schema
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  patient_name TEXT,
  language TEXT DEFAULT 'English',
  red_flag BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_id TEXT,
  answer_text TEXT,
  provenance TEXT DEFAULT 'patient_reported',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  content JSONB,
  doctor_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo hospital
INSERT INTO hospitals (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Government Hospital')
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for sessions
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
