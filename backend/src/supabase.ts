import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const defaultUrl = 'https://ttjjhazurqydtksemdkk.supabase.co';
const defaultServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ampoYXp1cnF5ZHRrc2VtZGtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM4NDM1OCwiZXhwIjoyMTAzOTYwMzU4fQ.KnIzCzDseGy9Nkc2G-fr1fZuAteDd2v2YlMzz3BJyyA';

const supabaseUrl = process.env.SUPABASE_URL || defaultUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultServiceKey;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: Supabase credentials are not fully set in .env. Some API endpoints will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
