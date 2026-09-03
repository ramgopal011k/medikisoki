import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db, { initDb } from './db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
initDb();

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Block 1 Endpoints

app.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Strict check for the demo user
  if (email !== 'doctor@medikiosk.com' || password !== 'demo1234') {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email);
  if (!doctor) {
    return res.status(500).json({ error: 'Doctor not found in database' });
  }

  res.json({
    token: uuidv4(), // mock session
    user: doctor
  });
});

app.get('/hospitals', (req: Request, res: Response) => {
  const hospitals = db.prepare('SELECT * FROM hospitals').all();
  res.json({ data: hospitals });
});

app.post('/sessions', (req: Request, res: Response) => {
  const { hospital_id, patient_name, dummy_aadhaar, language, chief_complaint } = req.body;
  if (!hospital_id || !dummy_aadhaar || !language || !chief_complaint) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const session_id = uuidv4();
  const session_token = uuidv4();

  const newSession = {
    session_id,
    hospital_id,
    patient_name: patient_name || 'Anonymous Patient',
    dummy_aadhaar,
    language,
    chief_complaint,
    session_token
  };

  db.prepare(`
    INSERT INTO sessions (session_id, hospital_id, patient_name, dummy_aadhaar, language, chief_complaint, session_token)
    VALUES (@session_id, @hospital_id, @patient_name, @dummy_aadhaar, @language, @chief_complaint, @session_token)
  `).run(newSession);

  res.json({ data: newSession });
});

app.get('/sessions', async (req, res) => {
  const { hospital_id } = req.query;
  try {
    const stmt = db.prepare(`
      SELECT s.*, 
             (SELECT COUNT(*) FROM red_flags rf WHERE rf.session_id = s.session_id) as red_flag_count
      FROM sessions s
      WHERE s.hospital_id = ? 
      ORDER BY red_flag_count DESC, s.created_at DESC
    `);
    const sessions = stmt.all(hospital_id);
    res.json({ data: sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.post('/history-facts', async (req, res) => {
  const { session_id, complaint, question_id, question_text, answer, answer_value, red_flag_id } = req.body;
  try {
    const fact_id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO history_facts (fact_id, session_id, complaint, question_id, question_text, answer, answer_value, red_flag_id, provenance, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'patient_reported', 0)
    `);
    stmt.run(fact_id, session_id, complaint, question_id, question_text, answer, answer_value, red_flag_id || null);
    res.json({
      fact_id,
      provenance: 'patient_reported',
      verified: false,
      red_flag_id: red_flag_id || null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save history fact' });
  }
});

app.get('/history-facts', async (req, res) => {
  const { session_id } = req.query;
  try {
    const stmt = db.prepare('SELECT * FROM history_facts WHERE session_id = ? ORDER BY created_at ASC');
    const facts = stmt.all(session_id);
    res.json({ facts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history facts' });
  }
});

app.get('/sessions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ data: session });
});

// Block 3 Endpoints

app.get('/sessions/:id/triage', (req, res) => {
  const { id } = req.params;
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const facts = db.prepare('SELECT * FROM history_facts WHERE session_id = ? ORDER BY created_at ASC').all(id);
    const redFlags = db.prepare('SELECT * FROM red_flags WHERE session_id = ? ORDER BY created_at DESC').all(id);
    res.json({ session, facts, redFlags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch triage data' });
  }
});

app.post('/red-flags', (req, res) => {
  const { session_id, rule_id, triggered_fact_id } = req.body;
  try {
    const flag_id = randomUUID();
    db.prepare(`
      INSERT INTO red_flags (flag_id, session_id, rule_id, triggered_fact_id)
      VALUES (?, ?, ?, ?)
    `).run(flag_id, session_id, rule_id, triggered_fact_id || null);
    res.json({ flag_id, session_id, rule_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save red flag' });
  }
});

app.patch('/history-facts/:id', (req, res) => {
  const { id } = req.params;
  const { verified, corrected_value } = req.body;
  try {
    let updateFields = [];
    let params: any[] = [];
    if (verified !== undefined) {
      updateFields.push('verified = ?');
      params.push(verified ? 1 : 0);
    }
    if (corrected_value !== undefined) {
      updateFields.push('answer_value = ?');
      params.push(corrected_value);
      updateFields.push("provenance = 'doctor_entered'");
    }
    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    params.push(id);
    db.prepare(`UPDATE history_facts SET ${updateFields.join(', ')} WHERE fact_id = ?`).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fact' });
  }
});

app.post('/medical-history', (req, res) => {
  const { session_id, items } = req.body; 
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Missing or invalid items array' });
  }

  const validCategories = ['Allergies', 'Medications', 'Conditions', 'Surgeries'];

  for (const item of items) {
    if (!item.category) {
      return res.status(400).json({ error: 'Missing category in item' });
    }
    if (!validCategories.includes(item.category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO medical_history (item_id, session_id, category, value, provenance, verified)
      VALUES (?, ?, ?, ?, 'patient_reported', 0)
    `);
    const saved = [];
    db.transaction(() => {
      for (const item of items) {
        if (!item.value) continue;
        const item_id = randomUUID();
        insertStmt.run(item_id, session_id, item.category, item.value);
        saved.push({ item_id, category: item.category, value: item.value });
      }
    })();
    // send back the count as expected by the test
    res.status(201).json({ success: true, inserted: saved.length, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save medical history' });
  }
});

app.get('/medical-history/:session_id', (req, res) => {
  const { session_id } = req.params;
  try {
    const items = db.prepare('SELECT * FROM medical_history WHERE session_id = ?').all(session_id);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medical history' });
  }
});

// Block 4 Endpoints

app.post('/ayush-assessment', (req, res) => {
  const { session_id, dimension, value } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  if (!dimension) {
    return res.status(400).json({ error: 'Missing dimension' });
  }
  
  const validDimensions = ['prakriti', 'vikriti', 'agni', 'koshtha', 'ahara_vihara'];
  if (!validDimensions.includes(dimension)) {
    return res.status(400).json({ error: 'Invalid dimension' });
  }

  try {
    const assessment_id = randomUUID();
    db.prepare(`
      INSERT INTO ayush_assessments (assessment_id, session_id, dimension, value, provenance)
      VALUES (?, ?, ?, ?, 'patient_reported')
    `).run(assessment_id, session_id, dimension, value || null);
    
    res.status(201).json({ success: true, assessment_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save AYUSH assessment' });
  }
});

app.get('/ayush-assessment', (req, res) => {
  const { session_id } = req.query;
  
  try {
    const items = db.prepare('SELECT * FROM ayush_assessments WHERE session_id = ?').all(session_id);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AYUSH assessments' });
  }
});

app.post('/documents', (req, res) => {
  const { session_id, file_url, ocr_status } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const document_id = randomUUID();
    db.prepare(`
      INSERT INTO documents (document_id, session_id, file_url, upload_status, ocr_status)
      VALUES (?, ?, ?, 'completed', ?)
    `).run(document_id, session_id, file_url || '', ocr_status || 'pending');
    
    res.status(201).json({ success: true, document_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save document record' });
  }
});

app.post('/ocr-extractions', (req, res) => {
  const { document_id, extractions } = req.body;
  if (!document_id || !extractions || !Array.isArray(extractions)) {
    return res.status(400).json({ error: 'Missing document_id or valid extractions array' });
  }

  try {
    const insertStmt = db.prepare(`
      INSERT INTO ocr_extractions (extraction_id, document_id, raw_text, field_name, field_value, confidence, provenance, verified)
      VALUES (?, ?, ?, ?, ?, ?, 'ocr_extracted', 1)
    `);
    const saved = [];
    db.transaction(() => {
      for (const item of extractions) {
        if (!item.field_value) continue;
        const extraction_id = randomUUID();
        insertStmt.run(extraction_id, document_id, item.raw_text || '', item.field_name, item.field_value, item.confidence || 1.0);
        saved.push({ extraction_id, field_name: item.field_name, field_value: item.field_value });
      }
    })();
    res.status(201).json({ success: true, inserted: saved.length, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save OCR extractions' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
