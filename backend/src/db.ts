import Database from 'better-sqlite3';
import path from 'path';

// Connect to a local SQLite database file
const dbPath = path.resolve(__dirname, '../../medikiosk.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospitals (
      hospital_id TEXT PRIMARY KEY,
      hospital_name TEXT NOT NULL,
      location TEXT,
      hospital_type TEXT
    );

    CREATE TABLE IF NOT EXISTS doctors (
      doctor_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      hospital_id TEXT,
      uid TEXT,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      hospital_id TEXT,
      patient_name TEXT,
      dummy_aadhaar TEXT,
      language TEXT,
      chief_complaint TEXT,
      session_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
    );

    CREATE TABLE IF NOT EXISTS history_facts (
      fact_id TEXT PRIMARY KEY,
      session_id TEXT,
      complaint TEXT,
      question_id TEXT,
      question_text TEXT,
      answer TEXT,
      answer_value TEXT,
      red_flag_id TEXT,
      provenance TEXT,
      verified BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS medical_history (
      item_id TEXT PRIMARY KEY,
      session_id TEXT,
      category TEXT,
      value TEXT,
      provenance TEXT,
      verified BOOLEAN,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS ayush_assessments (
      assessment_id TEXT PRIMARY KEY,
      session_id TEXT,
      dimension TEXT,
      value TEXT,
      provenance TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      document_id TEXT PRIMARY KEY,
      session_id TEXT,
      file_url TEXT,
      upload_status TEXT,
      ocr_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS ocr_extractions (
      extraction_id TEXT PRIMARY KEY,
      document_id TEXT,
      raw_text TEXT,
      field_name TEXT,
      field_value TEXT,
      confidence REAL,
      corrected_value TEXT,
      provenance TEXT,
      verified BOOLEAN,
      FOREIGN KEY (document_id) REFERENCES documents(document_id)
    );

    CREATE TABLE IF NOT EXISTS red_flags (
      flag_id TEXT PRIMARY KEY,
      session_id TEXT,
      rule_id TEXT,
      triggered_fact_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_by TEXT,
      acknowledged_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS summaries (
      summary_id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finalized BOOLEAN,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS summary_fields (
      field_id TEXT PRIMARY KEY,
      summary_id TEXT,
      section TEXT,
      label TEXT,
      value TEXT,
      provenance TEXT,
      verified BOOLEAN,
      edited_by TEXT,
      FOREIGN KEY (summary_id) REFERENCES summaries(summary_id)
    );
  `);

  try {
    db.exec(`ALTER TABLE history_facts ADD COLUMN red_flag_id TEXT`);
  } catch (err) {
    // Column might already exist, ignore
  }

  // Seed demo hospitals if they don't exist
  const insertHospital = db.prepare(`
    INSERT INTO hospitals (hospital_id, hospital_name, location, hospital_type)
    VALUES (@hospital_id, @hospital_name, @location, @hospital_type)
    ON CONFLICT(hospital_id) DO NOTHING
  `);

  const demoHospitals = [
    { hospital_id: 'H001', hospital_name: 'Govt. General Hospital, Sector 12', location: 'Chandigarh', hospital_type: 'Government General Hospital' },
    { hospital_id: 'H002', hospital_name: 'Community Health Centre, Rajpura', location: 'Punjab', hospital_type: 'Community Health Centre' },
    { hospital_id: 'H003', hospital_name: 'Central AYUSH Hospital', location: 'New Delhi', hospital_type: 'AYUSH Hospital' },
    { hospital_id: 'H004', hospital_name: 'State Ayurvedic Hospital', location: 'Jaipur', hospital_type: 'Ayurvedic Hospital' },
    { hospital_id: 'H005', hospital_name: 'District Allopathy Hospital', location: 'Lucknow', hospital_type: 'Government Allopathy Hospital' }
  ];

  for (const h of demoHospitals) {
    insertHospital.run(h);
  }

  // Seed demo doctor if doesn't exist
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (doctor_id, name, email, hospital_id, uid)
    VALUES (@doctor_id, @name, @email, @hospital_id, @uid)
    ON CONFLICT(doctor_id) DO NOTHING
  `);

  insertDoctor.run({
    doctor_id: 'DOC-001',
    name: 'Demo Doctor',
    email: 'doctor@medikiosk.com',
    hospital_id: 'H001',
    uid: 'mock-supabase-uid-1234'
  });
}

export default db;
