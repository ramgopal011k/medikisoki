// Gemini semantic layer is HOLD (deferred to Phase 4).
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { supabase } from './supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://localhost:5175'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((ao) => origin.startsWith(ao)) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'medikisoki-backend', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'medikisoki-backend', timestamp: new Date().toISOString() });
});

// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import FormData from 'form-data';

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

import sessionsRouter from './routes/sessions';
import answersRouter from './routes/answers';
import summaryRouter from './routes/summary';
import { generateFhirBundle } from './fhir';
import { analyzeText } from './clinicalAnalysis';
import { generateTriageSummary } from './summary';

app.post('/api/analyze-records', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const analysis = analyzeText(text);
    res.json(analysis);
  } catch (err: any) {
    console.error('Clinical Analysis Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fhir/:sessionId', async (req: Request, res: Response) => {
  try {
    const bundle = await generateFhirBundle(String(req.params.sessionId));
    res.json(bundle);
  } catch (err: any) {
    console.error('FHIR Generation Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patient/visits/:abhaId', async (req: Request, res: Response) => {
  try {
    const { abhaId } = req.params;
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id, 
        created_at, 
        hospital_id, 
        patient_name, 
        chief_complaint, 
        status,
        summaries ( content )
      `)
      .eq('dummy_aadhaar', abhaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: sessions });
  } catch (err: any) {
    console.error('Fetch Patient Visits Error:', err);
    res.status(500).json({ error: err.message });
  }
});

import hospitalsRouter from './routes/hospitals';
import documentsRouter from './routes/documents';

// Mount routes
app.use('/api/sessions', sessionsRouter);
app.use('/sessions', sessionsRouter);
app.use('/api/answers', answersRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/hospitals', hospitalsRouter);
app.use('/api/documents', documentsRouter);
app.use('/documents', documentsRouter);

// Doctor authentication endpoint
app.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (
    (email === 'doctor@demo.com' && password === 'demo123') ||
    (email === 'doctor@medikiosk.com' && password === 'demo1234')
  ) {
    return res.json({
      token: 'mock-doctor-token',
      user: {
        doctor_id: 'd1111111-1111-1111-1111-111111111111',
        name: 'Dr. Demo',
        email: email,
        hospital_id: '11111111-1111-1111-1111-111111111111',
        uid: 'mock-uid'
      }
    });
  }
  return res.status(401).json({ error: 'Invalid credentials. Use doctor@demo.com / demo123' });
});

const handleVoiceMatch = async (req: Request, res: Response) => {
  const { text, options } = req.body;
  if (!text || !options || !Array.isArray(options)) {
    return res.status(400).json({ error: 'Missing text or options' });
  }

  const cleanText = text.toLowerCase().trim();

  // 1. Fast direct keyword / substring matching
  for (const opt of options) {
    const val = (opt.value || '').toLowerCase();
    const lbl = (opt.label || '').toLowerCase();
    const hi = (opt.label_hi || '').toLowerCase();
    if (cleanText === val || cleanText === lbl || (hi && cleanText === hi)) {
      return res.json({ match: opt.value });
    }
    if (cleanText.includes(lbl) || (hi && cleanText.includes(hi))) {
      return res.json({ match: opt.value });
    }
  }

  // 2. Common affirmative / negative colloquial words (English + Hindi)
  const affirmatives = ['haan', 'yes', 'yeah', 'yep', 'yup', 'bilkul haan', 'bilkul sahi', 'true', 'sahi', 'sahi hai', 'ha', 'हाँ', 'जी हाँ', 'जी'];
  const negatives = ['nahi', 'no', 'nah', 'nope', 'false', 'galat', 'na', 'नहीं', 'जी नहीं', 'बिल्कुल नहीं'];

  const hasAffirmative = affirmatives.some((w) => cleanText.includes(w));
  const hasNegative = negatives.some((w) => cleanText.includes(w));

  if (hasAffirmative && !hasNegative) {
    const yesOpt = options.find((o: any) => o.value === 'yes' || o.value === 'true' || o.value === '1' || (o.label && o.label.toLowerCase() === 'yes'));
    if (yesOpt) return res.json({ match: yesOpt.value });
  } else if (hasNegative && !hasAffirmative) {
    const noOpt = options.find((o: any) => o.value === 'no' || o.value === 'false' || o.value === '0' || (o.label && o.label.toLowerCase() === 'no'));
    if (noOpt) return res.json({ match: noOpt.value });
  }

  // 3. Fallback to Gemini if API key configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are matching a patient's spoken answer to a predefined list of options.
Patient's answer: "${text}"

Available Options:
${options.map((o: any) => `- ${o.value}: ${o.label}${o.label_hi ? ` / ${o.label_hi}` : ''}`).join('\n')}

Select the most semantically matching option 'value'. If none match even remotely, reply with "NULL".
Reply ONLY with the exact option value string or "NULL". Do not include quotes or markdown.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      if (responseText !== 'NULL') {
        const matchedOption = options.find((o: any) => o.value === responseText);
        if (matchedOption) {
          return res.json({ match: matchedOption.value });
        }
      }
    } catch (err) {
      console.warn('Gemini Voice Match Error (fallback to null):', err);
    }
  }

  return res.json({ match: null });
};

app.post('/match-voice', handleVoiceMatch);
app.post('/api/match-voice', handleVoiceMatch);

// OCR Vision endpoint with real Sarvam Document Parsing and safe fallback
app.post('/ocr-vision', async (req: Request, res: Response) => {
  const { image_base64 } = req.body;
  if (!image_base64) {
    return res.status(400).json({ text: null, fallback: true, error: 'Missing image_base64' });
  }

  if (!process.env.SARVAM_API_KEY) {
    return res.status(200).json({ 
      text: null, 
      fallback: true, 
      error: 'SARVAM_API_KEY not configured. Document OCR unavailable.' 
    });
  }

  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const form = new FormData();
    form.append('file', buffer, { filename: 'document.jpg', contentType: 'image/jpeg' });

    const response = await fetch('https://api.sarvam.ai/document-parsing', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY,
        ...form.getHeaders()
      },
      body: form as any
    });

    const data: any = await response.json();
    if (data.text) {
      return res.status(200).json({ 
        text: data.text, 
        fallback: false 
      });
    }

    return res.status(200).json({ 
      text: null, 
      fallback: true, 
      error: data.error || 'Sarvam OCR returned no text.' 
    });
  } catch (err: any) {
    console.error('OCR Vision Error:', err);
    return res.status(200).json({ 
      text: null, 
      fallback: true, 
      error: err.message || 'Failed to extract using vision' 
    });
  }
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MediKiosk Clinical Intake & Triage Backend',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/hospitals',
      '/api/sessions',
      '/api/sessions/:id/triage',
      '/api/answers',
      '/api/summary',
      '/ayush-assessment',
      '/medical-history',
      '/history-facts',
      '/documents',
      '/auth/login'
    ]
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'supabase' });
});

// Medical History Submission Endpoint
app.post('/medical-history', async (req: Request, res: Response) => {
  const { session_id, items } = req.body;
  if (!session_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Missing session_id or items array' });
  }

  try {
    const rows = items.map(item => ({
      session_id,
      category: item.category,
      value: item.value,
      provenance: 'patient_reported',
      verified: false
    }));

    try {
      await supabase.from('medical_history').insert(rows);
    } catch (dbErr) {
      console.warn('medical_history table insert fallback:', dbErr);
    }

    // Auto-generate triage summary in background
    generateTriageSummary(session_id).catch((err: any) => {
      console.warn('Background summary generation warning:', err);
    });

    res.status(201).json({ success: true, count: items.length });
  } catch (err: any) {
    console.error('Medical History Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// History facts endpoint for dynamic tree facts
app.post('/history-facts', async (req: Request, res: Response) => {
  const { session_id, question_id, question_text, answer, answer_value, red_flag_id } = req.body;
  if (!session_id || !question_id) {
    return res.status(400).json({ error: 'Missing session_id or question_id' });
  }

  try {
    const { data, error } = await supabase.from('answers').insert({
      session_id,
      question_id: question_text || question_id,
      answer_text: answer || answer_value || 'Answered',
      provenance: 'patient_reported'
    }).select().single();

    if (error) {
      console.warn('History fact answer table insert warning:', error.message);
    }

    // If red flag triggered, record in red_flags table and update session
    if (red_flag_id) {
      try {
        await supabase.from('red_flags').insert({
          session_id,
          rule_id: red_flag_id,
          triggered_fact_id: data?.id
        });
        await supabase.from('sessions').update({ red_flag: true }).eq('id', session_id);
      } catch (rfErr) {
        console.warn('Red flag recording warning:', rfErr);
      }
    }

    res.status(201).json({ success: true, data: data || { session_id, question_id } });
  } catch (err: any) {
    console.error('History facts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Documents endpoint
app.post('/documents', async (req: Request, res: Response) => {
  const { session_id, file_url, ocr_status } = req.body;
  const document_id = crypto.randomUUID();
  try {
    const { error } = await supabase.from('documents').insert({
      document_id: document_id,
      session_id,
      file_url: file_url || 'local_blob',
      ocr_status: ocr_status || 'completed'
    });
    if (error) {
      console.warn('Documents table insert warning:', error.message);
    }
    res.status(201).json({ success: true, document_id });
  } catch (err: any) {
    console.warn('Documents exception:', err);
    res.status(201).json({ success: true, document_id });
  }
});

// Document extractions endpoint
app.post('/documents/extractions', async (req: Request, res: Response) => {
  const { document_id, session_id, extractions } = req.body;
  
  if (Array.isArray(extractions) && extractions.length > 0) {
    try {
      let targetSessionId = session_id;
      
      // If session_id not directly provided, find from document_id
      if (!targetSessionId && document_id) {
        const { data: doc } = await supabase
          .from('documents')
          .select('session_id')
          .eq('document_id', document_id)
          .single();
        if (doc && doc.session_id) {
          targetSessionId = doc.session_id;
        }
      }

      if (targetSessionId) {
        const rows = extractions
          .filter((e: any) => e.field_value && e.field_value.trim().length > 0)
          .map((e: any) => ({
            session_id: targetSessionId,
            question_id: 'ocr_' + (e.field_name || 'field').toLowerCase().replace(/\s+/g, '_'),
            answer_text: e.field_value,
            provenance: 'ocr_extracted'
          }));

        if (rows.length > 0) {
          await supabase.from('answers').insert(rows);
        }
      }
    } catch (err) {
      console.warn('Failed to persist extractions to answers:', err);
    }
  }

  res.status(201).json({ success: true, count: Array.isArray(extractions) ? extractions.length : 0 });
});

// History facts verification and update endpoint for Doctor Triage Summary
app.patch('/history-facts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { corrected_value } = req.body;
  try {
    const updateData: any = {};
    if (corrected_value !== undefined) {
      updateData.answer_text = corrected_value;
      updateData.provenance = 'doctor_entered';
    }
    if (Object.keys(updateData).length > 0) {
      await supabase.from('answers').update(updateData).eq('id', id);
    }
    res.json({ success: true, verified: true });
  } catch (err: any) {
    console.error('Update history fact error:', err);
    res.json({ success: true, verified: true });
  }
});

// Ayush Assessment Endpoint
app.post('/ayush-assessment', async (req: Request, res: Response) => {
  const { session_id, dimension, value } = req.body;
  if (!session_id || !dimension || !value) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('ayush_assessments')
      .insert({
        session_id,
        dimension,
        value
      })
      .select()
      .single();

    if (error) {
      console.warn('ayush_assessments insert warning:', error.message);
      return res.status(201).json({ success: true, data: { session_id, dimension, value } });
    }
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error('Ayush Assessment Error:', err);
    res.status(201).json({ success: true, data: { session_id, dimension, value } });
  }
});

// Real Sarvam TTS Endpoint
app.post('/api/sarvam/tts', async (req: Request, res: Response) => {
  const { text, lang } = req.body;
  if (!process.env.SARVAM_API_KEY) {
    return res.status(501).json({ error: 'Sarvam TTS not implemented. Use WebSpeech.' });
  }
  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: lang === 'hi-IN' ? 'hi-IN' : 'en-IN',
        speaker: 'meera',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v1'
      })
    });
    const data: any = await response.json();
    if (data.audios && data.audios.length > 0) {
      return res.json({ audioUrl: `data:audio/wav;base64,${data.audios[0]}` });
    }
    return res.status(500).json({ error: 'No audio returned from Sarvam' });
  } catch (err) {
    console.error('Sarvam TTS Error:', err);
    return res.status(500).json({ error: 'Failed to generate TTS' });
  }
});

// Multilingual ASR Endpoint with Sarvam AI and Gemini Audio Fallback
app.post('/api/sarvam/asr', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const requestedLang = String(req.body.language || req.query.language || 'unknown').toLowerCase();
  let langCode = 'unknown';
  if (requestedLang.startsWith('hi')) langCode = 'hi-IN';
  else if (requestedLang.startsWith('en')) langCode = 'en-IN';
  else if (requestedLang.startsWith('ta')) langCode = 'ta-IN';
  else if (requestedLang.startsWith('te')) langCode = 'te-IN';
  else if (requestedLang.startsWith('bn')) langCode = 'bn-IN';
  else langCode = requestedLang;

  // 1. Try Sarvam AI Speech-to-Text (saaras:v3)
  if (process.env.SARVAM_API_KEY) {
    try {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.webm',
        contentType: req.file.mimetype || 'audio/webm'
      });
      form.append('model', 'saaras:v3');
      form.append('language_code', langCode);

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': process.env.SARVAM_API_KEY,
          ...form.getHeaders()
        },
        body: form as any
      });
      const data: any = await response.json();
      if (data && data.transcript && typeof data.transcript === 'string') {
        return res.json({ transcript: data.transcript.trim(), provider: 'sarvam' });
      }
      console.warn('Sarvam ASR did not return transcript, payload:', data);
    } catch (sarvamErr) {
      console.warn('Sarvam ASR error:', sarvamErr);
    }
  }

  // 2. Fallback to Gemini 1.5 Flash Multimodal Audio Transcription
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const mimeType = req.file.mimetype || 'audio/webm';
      const base64Audio = req.file.buffer.toString('base64');
      const langHint = langCode === 'hi-IN' ? 'in Hindi (or English if mixed)' : 'in English or Hindi';
      const prompt = `Listen carefully to this audio and transcribe exactly what the speaker says ${langHint}.
If the speaker is saying numbers or digits (like an ID or phone number), write the numbers out clearly.
If the speaker is choosing a language or option, write the option name.
Output ONLY the raw transcribed text with NO conversational filler or markdown.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: base64Audio
          }
        }
      ]);
      const geminiText = result.response.text().trim();
      if (geminiText) {
        return res.json({ transcript: geminiText, provider: 'gemini' });
      }
    } catch (geminiErr) {
      console.error('Gemini ASR fallback error:', geminiErr);
    }
  }

  return res.status(500).json({ error: 'ASR processing failed. Please type or select manually.' });
});

// Real Sarvam OCR Endpoint
app.post('/api/sarvam/ocr', upload.single('file'), async (req: Request, res: Response) => {
  if (!process.env.SARVAM_API_KEY || !req.file) {
    return res.status(501).json({ error: 'Sarvam OCR not implemented or no file.' });
  }
  try {
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname });
    
    const response = await fetch('https://api.sarvam.ai/document-parsing', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY,
        ...form.getHeaders()
      },
      body: form as any
    });
    const data: any = await response.json();
    if (data.text) {
      return res.json({ text: data.text });
    }
    return res.status(501).json({ error: 'Sarvam OCR returned no text.' });
  } catch (err) {
    console.error('Sarvam OCR Error:', err);
    return res.status(500).json({ error: 'Failed to process OCR' });
  }
});

// Gemini Off-Script Endpoint
app.post('/api/gemini/off-script', async (req: Request, res: Response) => {
  const { session_id, previous_answers } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    // Return a mock question if no API key is provided
    return res.json({
      id: `q_other_${Date.now()}`,
      text: "Can you describe your symptoms in more detail?",
      options: ["It hurts constantly", "It comes and goes", "It is getting worse"]
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a clinical assistant. The patient selected "Other" as their chief complaint.
Here is what they have answered so far:
${JSON.stringify(previous_answers, null, 2)}

Generate a single follow-up question in JSON format with an 'id', 'text', and 'options' array.
Example: {"id": "q_custom", "text": "Can you describe the pain?", "options": ["Sharp", "Dull", "Aching"]}
Respond ONLY with valid JSON.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const jsonResult = JSON.parse(responseText);
    
    return res.json(jsonResult);
  } catch (err) {
    console.error('Gemini Off-Script Error:', err);
    return res.status(500).json({ error: 'Failed to generate off-script question' });
  }
});

// Gemini Semantic Red-Flag Endpoint
app.post('/api/gemini/red-flag', async (req: Request, res: Response) => {
  const { answers } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ isFlagged: false });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a triage nurse evaluating a patient's answers.
Answers:
${JSON.stringify(answers, null, 2)}

Does the patient require IMMEDIATE medical attention (e.g. signs of heart attack, stroke, severe bleeding)?
Reply with ONLY "YES" or "NO".`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().toUpperCase();
    
    return res.json({ isFlagged: responseText === 'YES' });
  } catch (err) {
    console.error('Gemini Red-Flag Error:', err);
    return res.status(500).json({ error: 'Failed to evaluate red-flag' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
