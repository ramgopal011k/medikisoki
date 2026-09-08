import { supabase } from './supabase';

export async function generateFhirBundle(sessionId: string) {
  // Fetch session data
  const { data: sessionData, error: sessionErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !sessionData) throw new Error('Session not found');

  // Fetch all answers for this session
  const { data: answersData, error: answersErr } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId);
  
  if (answersErr) throw answersErr;

  // Fetch Ayush assessments
  const { data: ayushData, error: ayushErr } = await supabase
    .from('ayush_assessments')
    .select('*')
    .eq('session_id', sessionId);
  
  if (ayushErr) throw ayushErr;

  const abhaId = sessionData.dummy_aadhaar || 'Unknown-ABHA';
  const patientId = `Patient-${sessionData.id}`;
  const encounterId = `Encounter-${sessionData.id}`;

  const bundle: any = {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    entry: []
  };

  // 1. Add Patient Resource
  bundle.entry.push({
    fullUrl: `urn:uuid:${patientId}`,
    resource: {
      resourceType: "Patient",
      id: patientId,
      identifier: [
        {
          type: {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR" }]
          },
          system: "https://ndhm.gov.in/abha",
          value: abhaId
        }
      ],
      name: [{ text: sessionData.patient_name || "Unknown Patient" }]
    }
  });

  // 2. Add Encounter Resource
  bundle.entry.push({
    fullUrl: `urn:uuid:${encounterId}`,
    resource: {
      resourceType: "Encounter",
      id: encounterId,
      status: "finished",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
        display: "ambulatory"
      },
      subject: { reference: `urn:uuid:${patientId}` },
      period: {
        start: sessionData.created_at
      }
    }
  });

  // 3. Add Chief Complaint as Observation
  const chiefComplaint = answersData.find((a: any) => a.question_id === 'chief_complaint')?.answer_text || sessionData.chief_complaint;
  if (chiefComplaint) {
    bundle.entry.push({
      fullUrl: `urn:uuid:Observation-CC-${sessionData.id}`,
      resource: {
        resourceType: "Observation",
        id: `Observation-CC-${sessionData.id}`,
        status: "final",
        category: [
          {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "exam", display: "Exam" }]
          }
        ],
        code: {
          coding: [{ system: "http://loinc.org", code: "8661-1", display: "Chief complaint" }]
        },
        subject: { reference: `urn:uuid:${patientId}` },
        encounter: { reference: `urn:uuid:${encounterId}` },
        valueString: chiefComplaint
      }
    });
  }

  // 4. Add AYUSH Dimensions as Observations
  ayushData.forEach((ayush: any) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:Observation-Ayush-${ayush.id}`,
      resource: {
        resourceType: "Observation",
        id: `Observation-Ayush-${ayush.id}`,
        status: "final",
        category: [
          {
            coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "exam", display: "Exam" }]
          }
        ],
        code: {
          text: `AYUSH Dimension: ${ayush.dimension}`
        },
        subject: { reference: `urn:uuid:${patientId}` },
        encounter: { reference: `urn:uuid:${encounterId}` },
        valueString: ayush.value
      }
    });
  });

  // 5. Add Consent Resource
  bundle.entry.push({
    fullUrl: `urn:uuid:Consent-${sessionData.id}`,
    resource: {
      resourceType: "Consent",
      id: `Consent-${sessionData.id}`,
      status: "active",
      category: [
        {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentcategorycodes", code: "patient-consent" }]
        }
      ],
      patient: { reference: `urn:uuid:${patientId}` },
      dateTime: sessionData.created_at,
      policyRule: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentpolicycodes", code: "abdm-consent" }]
      }
    }
  });

  // Log consent to consent_logs table
  try {
    await supabase.from('consent_logs').insert({
      session_id: sessionData.id,
      patient_id: patientId,
      consent_status: 'granted'
    });
  } catch (err) {
    console.warn('Failed to log consent:', err);
  }

  return bundle;
}
