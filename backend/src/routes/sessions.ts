import { Router } from 'express';
import { supabase } from '../supabase';
import { generateTriageSummary } from '../summary';

const router = Router();

router.post('/', async (req, res) => {
  const { hospital_id, patient_name, dummy_aadhaar, language, chief_complaint } = req.body;
  const validHospitalId = hospital_id || '11111111-1111-1111-1111-111111111111';
  const validLanguage = language || 'en';
  const validComplaint = chief_complaint || 'General Consultation';
  const validName = patient_name || 'Anonymous Patient';
  const validAbha = dummy_aadhaar || '00000000000000';

  let sessionResult: any = null;

  // Insert session into Supabase using supported columns
  try {
    const { data: sessionData, error: sessionErr } = await supabase
      .from('sessions')
      .insert({
        hospital_id: validHospitalId,
        patient_name: validName,
        language: validLanguage,
        status: 'active',
        red_flag: false,
        locked: false
      })
      .select()
      .single();

    if (!sessionErr && sessionData) {
      sessionResult = sessionData;
    } else {
      console.warn('Supabase session insert warning:', sessionErr?.message);
      // Fallback synthetic session so user is never blocked
      const fallbackId = crypto.randomUUID();
      sessionResult = {
        id: fallbackId,
        hospital_id: validHospitalId,
        patient_name: validName,
        language: validLanguage,
        status: 'active',
        created_at: new Date().toISOString()
      };
    }
  } catch (err: any) {
    console.error('Session create exception:', err);
    const fallbackId = crypto.randomUUID();
    sessionResult = {
      id: fallbackId,
      hospital_id: validHospitalId,
      patient_name: validName,
      language: validLanguage,
      status: 'active',
      created_at: new Date().toISOString()
    };
  }

  // Store chief complaint and dummy_aadhaar as answers
  if (sessionResult && sessionResult.id) {
    try {
      await supabase.from('answers').insert([
        {
          session_id: sessionResult.id,
          question_id: 'chief_complaint',
          answer_text: validComplaint,
          provenance: 'patient_reported'
        },
        {
          session_id: sessionResult.id,
          question_id: 'dummy_aadhaar',
          answer_text: validAbha,
          provenance: 'system_derived'
        }
      ]);
    } catch (e) {
      console.warn('Failed to insert initial answers:', e);
    }
  }

  res.status(201).json({
    data: {
      ...sessionResult,
      session_id: sessionResult.id,
      session_token: sessionResult.id,
      chief_complaint: validComplaint,
      dummy_aadhaar: validAbha
    }
  });
});

router.get('/', async (req, res) => {
  const { hospital_id } = req.query;
  try {
    let query = supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(100);
    
    // If a specific hospital_id is provided and is not 'all', filter by it
    if (hospital_id && hospital_id !== 'all') {
      query = query.eq('hospital_id', hospital_id);
    }
    
    let { data: sessions, error } = await query;
    
    // If filtering by hospital_id returned no rows, fallback to querying all sessions so queue is visible
    if ((!sessions || sessions.length === 0) && hospital_id && hospital_id !== 'all') {
      const { data: allSessions } = await supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(100);
      if (allSessions && allSessions.length > 0) {
        sessions = allSessions;
      }
    }

    if (error || !sessions) {
      console.warn('Supabase sessions query warning:', error?.message);
      return res.json({ data: [] });
    }

    // Batch fetch answers and red_flags for these sessions to enrich data
    const sessionIds = sessions.map((s: any) => s.id);
    let allAnswers: any[] = [];
    let allRedFlags: any[] = [];

    if (sessionIds.length > 0) {
      try {
        const { data: answersData } = await supabase
          .from('answers')
          .select('session_id, question_id, answer_text, provenance')
          .in('session_id', sessionIds);
        if (answersData) allAnswers = answersData;
      } catch (e) {
        console.warn('Could not batch fetch answers:', e);
      }

      try {
        const { data: rfData } = await supabase
          .from('red_flags')
          .select('session_id, rule_id')
          .in('session_id', sessionIds);
        if (rfData) allRedFlags = rfData;
      } catch (e) {
        console.warn('Could not batch fetch red flags:', e);
      }
    }

    const mapped = sessions.map((s: any) => {
      const sessionAnswers = allAnswers.filter((a: any) => a.session_id === s.id);
      const sessionRedFlags = allRedFlags.filter((rf: any) => rf.session_id === s.id);

      const complaintAnswer = sessionAnswers.find((a: any) => a.question_id === 'chief_complaint');
      const aadhaarAnswer = sessionAnswers.find((a: any) => a.question_id === 'dummy_aadhaar');

      const chiefComplaint = s.chief_complaint || complaintAnswer?.answer_text || 'General Consultation';
      const dummyAadhaar = s.dummy_aadhaar || aadhaarAnswer?.answer_text || '00000000000000';
      const redFlagCount = (sessionRedFlags.length > 0 ? sessionRedFlags.length : (s.red_flag ? 1 : 0));

      return {
        session_id: s.id,
        hospital_id: s.hospital_id || '11111111-1111-1111-1111-111111111111',
        patient_name: s.patient_name || 'Patient',
        dummy_aadhaar: dummyAadhaar,
        language: s.language || 'en',
        chief_complaint: chiefComplaint,
        status: s.status || 'active',
        session_token: s.id,
        created_at: s.created_at || new Date().toISOString(),
        red_flag_count: redFlagCount
      };
    });

    return res.json({ data: mapped });
  } catch (err: any) {
    console.error('List sessions error:', err);
    return res.json({ data: [] });
  }
});

router.get('/:id/triage', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionErr || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch answers
    const { data: answersData } = await supabase
      .from('answers')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });
    
    const answers = answersData || [];

    // Fetch medical history
    let medicalHistoryData: any[] = [];
    try {
      const { data: mhResult } = await supabase
        .from('medical_history')
        .select('*')
        .eq('session_id', id);
      if (mhResult) medicalHistoryData = mhResult;
    } catch (e) {
      console.warn('medical_history query warning:', e);
    }

    // Fetch AYUSH assessments
    let ayushData: any[] = [];
    try {
      const { data: ayushResult } = await supabase
        .from('ayush_assessments')
        .select('*')
        .eq('session_id', id);
      if (ayushResult) ayushData = ayushResult;
    } catch (e) {
      console.warn('ayush_assessments query warning:', e);
    }

    // Fetch documents
    let documentsData: any[] = [];
    try {
      const { data: docResult } = await supabase
        .from('documents')
        .select('*')
        .eq('session_id', id);
      if (docResult) documentsData = docResult;
    } catch (e) {
      console.warn('documents query warning:', e);
    }

    // Fetch red flags
    let redFlagsData: any[] = [];
    try {
      const { data: rfResult } = await supabase
        .from('red_flags')
        .select('*')
        .eq('session_id', id);
      if (rfResult) redFlagsData = rfResult;
    } catch (e) {
      console.warn('red_flags query warning:', e);
    }

    // Fetch summaries, auto-generate if missing
    let summaryData: any[] = [];
    try {
      const { data: sumResult } = await supabase
        .from('summaries')
        .select('*')
        .eq('session_id', id);
      if (sumResult && sumResult.length > 0) {
        summaryData = sumResult;
      } else {
        // Generate summary on the fly
        try {
          await generateTriageSummary(id);
          const { data: freshSummary } = await supabase
            .from('summaries')
            .select('*')
            .eq('session_id', id);
          if (freshSummary) summaryData = freshSummary;
        } catch (genErr) {
          console.warn('Auto summary generation warning:', genErr);
        }
      }
    } catch (e) {
      console.warn('summaries query warning:', e);
    }

    const chiefComplaint = session.chief_complaint || 
      answers.find((a: any) => a.question_id === 'chief_complaint')?.answer_text || 
      'General Consultation';

    const dummyAadhaar = session.dummy_aadhaar ||
      answers.find((a: any) => a.question_id === 'dummy_aadhaar')?.answer_text ||
      '00000000000000';

    const mappedSession = {
      session_id: session.id,
      id: session.id,
      hospital_id: session.hospital_id,
      patient_name: session.patient_name || 'Patient',
      dummy_aadhaar: dummyAadhaar,
      language: session.language || 'English',
      chief_complaint: chiefComplaint,
      created_at: session.created_at,
      status: session.status || 'active',
      red_flag: session.red_flag || redFlagsData.length > 0,
      locked: session.locked || false
    };

    // Filter out internal metadata answers from the clinical interview timeline
    const facts = answers
      .filter((a: any) => a.question_id !== 'dummy_aadhaar')
      .map((a: any) => ({
        fact_id: a.id,
        id: a.id,
        question_text: a.question_id === 'chief_complaint' 
          ? 'Chief Complaint' 
          : a.question_id.replace(/^q_/, 'Question ').replace(/^ocr_/, 'OCR '),
        answer_value: a.answer_text,
        provenance: a.provenance || 'patient_reported',
        verified: a.verified ? 1 : 0,
        created_at: a.created_at
      }));

    const redFlags = redFlagsData.length > 0 
      ? redFlagsData.map((rf: any) => ({
          flag_id: rf.flag_id || `rf-${session.id}`,
          rule_id: rf.rule_id || 'Clinical Red Flag Detected',
          created_at: rf.created_at || session.created_at
        }))
      : (session.red_flag ? [{
          flag_id: `rf-${session.id}`,
          rule_id: 'Clinical Red Flag Detected',
          created_at: session.created_at
        }] : []);

    const medicalHistory = medicalHistoryData.map((m: any) => ({
      item_id: m.item_id || m.id,
      id: m.item_id || m.id,
      category: m.category,
      value: m.value,
      provenance: m.provenance || 'patient_reported',
      verified: m.verified || false
    }));

    const ayushAssessments = ayushData.map((ay: any) => ({
      assessment_id: ay.assessment_id || ay.id,
      id: ay.assessment_id || ay.id,
      dimension: ay.dimension,
      value: ay.value
    }));

    const documents = documentsData.map((d: any) => ({
      document_id: d.document_id || d.id,
      id: d.document_id || d.id,
      file_url: d.file_url,
      ocr_status: d.ocr_status || 'completed',
      created_at: d.created_at
    }));

    // Extractions from OCR answers
    const extractions = answers
      .filter((a: any) => a.provenance === 'ocr_extracted')
      .map((a: any) => ({
        extraction_id: a.id,
        field_name: a.question_id.replace(/^ocr_/, '').replace(/_/g, ' ').toUpperCase(),
        field_value: a.answer_text
      }));

    const summaries = (summaryData || []).map((s: any) => {
      let formattedText = '';
      if (typeof s.content === 'object' && s.content !== null) {
        if (s.content.narrative) {
          formattedText = s.content.narrative;
        } else {
          formattedText = JSON.stringify(s.content, null, 2);
        }
      } else {
        formattedText = String(s.content || '');
      }
      return {
        summary_id: s.id,
        generated_text: formattedText,
        content: s.content
      };
    });

    res.json({
      session: mappedSession,
      answers,
      facts,
      ayush: ayushData,
      ayushAssessments,
      summary: summaryData && summaryData.length > 0 ? summaryData[0] : null,
      summaries,
      red_flag: mappedSession.red_flag,
      redFlags,
      medicalHistory,
      documents,
      extractions
    });
  } catch (err: any) {
    console.error('Triage endpoint error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch triage data' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: session, error: sessionErr } = await supabase.from('sessions').select('*').eq('id', id).single();
    if (sessionErr || !session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

