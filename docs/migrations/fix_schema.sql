-- ==============================================================================
-- MediKiosk: COMPLETE SCHEMA FIX
-- Run this in Supabase SQL Editor to fix all column/table errors.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ==============================================================================

-- -------------------------------------------------------
-- 1. FIX sessions TABLE — add all missing columns
-- -------------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS dummy_aadhaar   TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS chief_complaint  TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS age              INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS gender           TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS patient_type     TEXT DEFAULT 'existing';

-- -------------------------------------------------------
-- 2. FIX answers TABLE — add verified column if missing
-- -------------------------------------------------------
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------
-- 3. FIX summaries TABLE — add finalized column if missing
-- -------------------------------------------------------
ALTER TABLE public.summaries ADD COLUMN IF NOT EXISTS finalized BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------
-- 4. CREATE medical_history TABLE (if missing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    category     TEXT NOT NULL,
    value        TEXT,
    provenance   TEXT DEFAULT 'patient_reported',
    verified     BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. CREATE ayush_assessments TABLE (if missing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ayush_assessments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    dimension    TEXT NOT NULL,
    value        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. CREATE documents TABLE (if missing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    document_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    file_url     TEXT,
    ocr_status   TEXT DEFAULT 'pending',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 7. CREATE red_flags TABLE (if missing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.red_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    rule_id             TEXT NOT NULL,
    triggered_fact_id   UUID REFERENCES public.answers(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 8. CREATE consent_logs TABLE (if missing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL,
    consent_status  VARCHAR(50) NOT NULL DEFAULT 'granted',
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- 9. SEED default hospital (safe upsert)
-- -------------------------------------------------------
INSERT INTO public.hospitals (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Government Hospital')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 10. ROW LEVEL SECURITY — open policies for dev/demo
-- -------------------------------------------------------
ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on sessions"            ON public.sessions;
CREATE POLICY "Allow all on sessions"                    ON public.sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.answers           ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on answers"             ON public.answers;
CREATE POLICY "Allow all on answers"                     ON public.answers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.summaries         ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on summaries"           ON public.summaries;
CREATE POLICY "Allow all on summaries"                   ON public.summaries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.medical_history   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on medical_history"     ON public.medical_history;
CREATE POLICY "Allow all on medical_history"             ON public.medical_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.ayush_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ayush_assessments"   ON public.ayush_assessments;
CREATE POLICY "Allow all on ayush_assessments"           ON public.ayush_assessments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on documents"           ON public.documents;
CREATE POLICY "Allow all on documents"                   ON public.documents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.red_flags         ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on red_flags"           ON public.red_flags;
CREATE POLICY "Allow all on red_flags"                   ON public.red_flags FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.consent_logs      ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on consent_logs"        ON public.consent_logs;
CREATE POLICY "Allow all on consent_logs"                ON public.consent_logs FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- 11. Enable Realtime on sessions
-- -------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position;
