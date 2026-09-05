import { supabase } from './supabase';

export async function generateTriageSummary(sessionId: string) {
  // Fetch session data
  const { data: sessionData, error: sessionErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !sessionData) throw new Error('Session not found');

  // Fetch all answers for this session
  const { data: answersData } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  const answers = answersData || [];

  // Fetch medical history
  let medicalHistory: any[] = [];
  try {
    const { data: mhData } = await supabase
      .from('medical_history')
      .select('*')
      .eq('session_id', sessionId);
    if (mhData) medicalHistory = mhData;
  } catch (e) {
    console.warn('Could not fetch medical history for summary:', e);
  }

  // Fetch AYUSH assessments
  let ayushData: any[] = [];
  try {
    const { data: ayData } = await supabase
      .from('ayush_assessments')
      .select('*')
      .eq('session_id', sessionId);
    if (ayData) ayushData = ayData;
  } catch (e) {
    console.warn('Could not fetch AYUSH assessments for summary:', e);
  }

  // Group answers by question_id or provenance to build the summary
  const chiefComplaint = answers.find(a => a.question_id === 'chief_complaint')?.answer_text || sessionData.chief_complaint || 'General Consultation';
  
  const hpi = answers
    .filter(a => a.provenance === 'patient_reported' && a.question_id !== 'chief_complaint' && a.question_id !== 'dummy_aadhaar')
    .map(a => `${a.question_id.replace(/^q_/, 'Question ')}: ${a.answer_text}`);

  const pastHistory = [
    ...medicalHistory.map(m => `${m.category}: ${m.value}`),
    ...answers
      .filter(a => a.provenance === 'ocr_extracted' || a.provenance === 'doctor_entered')
      .map(a => `${a.question_id.replace(/^ocr_/, 'Scanned ')}: ${a.answer_text}`)
  ];

  const ayushSummary = ayushData.map(ay => `${ay.dimension}: ${ay.value}`);

  const narrative = [
    `Patient presented with chief complaint of ${chiefComplaint}.`,
    hpi.length > 0 ? `HPI details: ${hpi.join('; ')}.` : '',
    pastHistory.length > 0 ? `Past Medical History / Extracted Records: ${pastHistory.join('; ')}.` : '',
    ayushSummary.length > 0 ? `AYUSH Assessment: ${ayushSummary.join('; ')}.` : ''
  ].filter(Boolean).join('\n\n');

  const summaryContent = {
    chief_complaint: chiefComplaint,
    hpi: hpi.length > 0 ? hpi : ['None reported'],
    past_history: pastHistory.length > 0 ? pastHistory : ['None reported'],
    ayush_assessment: ayushSummary.length > 0 ? ayushSummary : ['None recorded'],
    narrative: narrative
  };

  try {
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing && existing.id) {
      await supabase
        .from('summaries')
        .update({ 
          content: summaryContent,
          doctor_verified: false
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('summaries')
        .insert({ 
          session_id: sessionId,
          content: summaryContent,
          doctor_verified: false
        });
    }

    return { summary: summaryContent };
  } catch (error) {
    console.error('Summary Generation Error:', error);
    return { summary: summaryContent };
  }
}

