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

  const getCategoryList = (categoryName: string, keywords: string[]) => {
    return [
      ...medicalHistory
        .filter(m => m.category.toLowerCase() === categoryName.toLowerCase() || keywords.some(k => m.category.toLowerCase().includes(k)))
        .map(m => m.value),
      ...answers
        .filter(a => (a.provenance === 'ocr_extracted' || a.provenance === 'doctor_entered' || a.provenance === 'patient_reported') && keywords.some(k => a.question_id.toLowerCase().includes(k)))
        .map(a => `${a.question_id.replace(/^ocr_/, '')}: ${a.answer_text}`)
    ];
  };

  const pmh = getCategoryList('Past Medical History', ['medical', 'disease', 'condition', 'hypertension', 'diabetes']);
  const psh = getCategoryList('Past Surgical History', ['surg', 'operation']);
  const drugHistory = getCategoryList('Drug History', ['drug', 'medication', 'pill']);
  const allergyHistory = getCategoryList('Allergy History', ['allerg']);
  const familyHistory = getCategoryList('Family History', ['family']);
  const personalHistory = getCategoryList('Personal History', ['personal', 'smoking', 'alcohol', 'diet']);
  const ros = getCategoryList('Review of Systems', ['ros', 'system']);

  const ayushSummary = ayushData.map(ay => `${ay.dimension}: ${ay.value}`);

  const narrative = [
    `Patient presented with chief complaint of ${chiefComplaint}.`,
    hpi.length > 0 ? `HPI details: ${hpi.join('; ')}.` : '',
    pmh.length > 0 ? `PMH: ${pmh.join('; ')}.` : '',
    psh.length > 0 ? `PSH: ${psh.join('; ')}.` : '',
    ayushSummary.length > 0 ? `AYUSH Assessment: ${ayushSummary.join('; ')}.` : ''
  ].filter(Boolean).join('\n\n');

  // Smart Missing-Information Detection/Completeness Engine
  const completeness = {
    score: 0,
    missing_fields: [] as string[]
  };
  
  if (chiefComplaint && chiefComplaint !== 'General Consultation') completeness.score += 20;
  else completeness.missing_fields.push('Chief Complaint');

  if (hpi.length > 0) completeness.score += 20;
  else completeness.missing_fields.push('History of Present Illness (HPI)');

  if (pmh.length > 0 || psh.length > 0) completeness.score += 20;
  else completeness.missing_fields.push('Medical/Surgical History');

  const hasAllergies = allergyHistory.length > 0;
  if (hasAllergies) completeness.score += 20;
  else completeness.missing_fields.push('Allergies');

  if (ayushData.length >= 6) completeness.score += 20;
  else completeness.missing_fields.push(`AYUSH Assessment (${ayushData.length}/12 dimensions)`);

  const summaryContent = {
    chief_complaint: chiefComplaint,
    hpi: hpi.length > 0 ? hpi : ['None reported'],
    pmh: pmh.length > 0 ? pmh : ['None reported'],
    psh: psh.length > 0 ? psh : ['None reported'],
    drug_history: drugHistory.length > 0 ? drugHistory : ['None reported'],
    allergy_history: allergyHistory.length > 0 ? allergyHistory : ['None reported'],
    family_history: familyHistory.length > 0 ? familyHistory : ['None reported'],
    personal_history: personalHistory.length > 0 ? personalHistory : ['None reported'],
    ros: ros.length > 0 ? ros : ['None reported'],
    ayush_assessment: ayushSummary.length > 0 ? ayushSummary : ['None recorded'],
    narrative: narrative,
    completeness: completeness
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

