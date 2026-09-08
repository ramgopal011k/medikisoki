CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    consent_status VARCHAR(50) NOT NULL DEFAULT 'granted',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts to consent_logs" ON public.consent_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for doctors on consent_logs" ON public.consent_logs
FOR SELECT USING (true);
