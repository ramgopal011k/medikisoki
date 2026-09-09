-- Update schema to include new patient fields in the sessions table

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS age TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS dummy_aadhaar TEXT,
ADD COLUMN IF NOT EXISTS patient_type TEXT DEFAULT 'existing';
