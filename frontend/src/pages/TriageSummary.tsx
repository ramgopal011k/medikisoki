import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { ArrowLeft, Check, AlertTriangle, ShieldCheck, Edit2, Save, X, ChevronDown, ChevronUp, Sparkles, BrainCircuit, Calendar, ExternalLink } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Session {
  session_id: string;
  patient_name: string;
  dummy_aadhaar: string;
  language: string;
  chief_complaint: string;
  created_at: string;
}

interface HistoryFact {
  fact_id: string;
  question_text: string;
  answer_value: string;
  provenance: 'patient_reported' | 'doctor_entered' | 'system_derived' | 'ocr_extracted';
  verified: number;
}

interface RedFlag {
  flag_id: string;
  rule_id: string;
  created_at: string;
}

interface MedicalHistoryItem {
  item_id: string;
  category: string;
  value: string;
}

interface AyushAssessment {
  assessment_id: string;
  dimension: string;
  value: string;
}

interface Document {
  document_id: string;
  file_url: string;
  ocr_status?: string;
}

interface ExtractedField {
  extraction_id: string;
  field_name: string;
  field_value: string;
  document_id?: string;
}

interface Summary {
  summary_id: string;
  generated_text: string;
}

interface PastVisit {
  session_id: string;
  date: string;
  status: string;
  chief_complaint: string;
  documents: any[];
  doctor_notes: any;
}

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon, badge }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="bg-white rounded-2xl border-2 border-warmgray overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-6 bg-white hover:bg-sand/30 transition-colors text-left focus:outline-none"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-5 h-5 ${title === 'Red Flags' && badge !== 'None' ? 'text-danger' : 'text-muted'}`} />}
          <h2 className={`text-lg font-bold uppercase tracking-wider ${title === 'Red Flags' && badge !== 'None' ? 'text-danger' : 'text-muted'}`}>
            {title}
          </h2>
          {badge && (
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              badge === 'No data' || badge === 'None' 
                ? 'bg-warmgray/50 text-muted' 
                : title === 'Red Flags' 
                  ? 'bg-danger/10 text-danger' 
                  : 'bg-primary/10 text-primary'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-muted">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-warmgray bg-white">
          {children}
        </div>
      )}
    </section>
  );
}

export default function TriageSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [facts, setFacts] = useState<HistoryFact[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);
  const [ayushAssessments, setAyushAssessments] = useState<AyushAssessment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [extractions, setExtractions] = useState<ExtractedField[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([]);
  const [clinicalAlerts, setClinicalAlerts] = useState<any>(null);
  const [reconciliationConflicts, setReconciliationConflicts] = useState<{field: string, documentValue: string, patientValue: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [verifyingFactId, setVerifyingFactId] = useState<string | null>(null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const triageRes = await fetch(`${API_URL}/sessions/${sessionId}/triage`);
        const triageData = await triageRes.json();

        if (!ignore && triageData.session) {
          setSession(triageData.session);
          setFacts(triageData.facts || []);
          setRedFlags(triageData.redFlags || []);
          setMedicalHistory(triageData.medicalHistory || []);
          setAyushAssessments(triageData.ayushAssessments || []);
          setDocuments(triageData.documents || []);
          setExtractions(triageData.extractions || []);
          setSummaries(triageData.summaries || []);

          // Run clinical analysis on combined text
          const combinedText = [
            triageData.session.chief_complaint,
            ...(triageData.facts || []).map((f: any) => f.answer_value),
            ...(triageData.medicalHistory || []).map((m: any) => m.value),
            ...(triageData.extractions || []).map((e: any) => e.field_value)
          ].join(' ');

          try {
            const analysisRes = await fetch(`${API_URL}/api/analyze-records`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: combinedText })
            });
            const analysisData = await analysisRes.json();
            setClinicalAlerts(analysisData);
          } catch (e) {
            console.error('Failed to analyze records', e);
          }
          
          try {
            const historyRes = await fetch(`${API_URL}/sessions/${sessionId}/history`);
            const historyData = await historyRes.json();
            if (!ignore && historyData.data) {
              setPastVisits(historyData.data);
            }
          } catch (e) {
            console.error('Failed to load past visits', e);
          }

          // Reconciliation logic
          if (!ignore) {
            const conflicts: { field: string, documentValue: string, patientValue: string }[] = [];
            
            (triageData.extractions || []).forEach((ext: any) => {
              const fieldLower = ext.field_name.toLowerCase();
              if (fieldLower.includes('patient') || fieldLower.includes('name')) return; // skip name
              
              // Check medical history
              const medMatch = (triageData.medicalHistory || []).find((m: any) => 
                m.category.toLowerCase().includes(fieldLower) || fieldLower.includes(m.category.toLowerCase())
              );
              
              if (medMatch && medMatch.value && ext.field_value && medMatch.value.toLowerCase().trim() !== ext.field_value.toLowerCase().trim()) {
                // simple heuristic for mismatch
                if (!medMatch.value.toLowerCase().includes(ext.field_value.toLowerCase()) && !ext.field_value.toLowerCase().includes(medMatch.value.toLowerCase())) {
                  conflicts.push({
                    field: ext.field_name,
                    documentValue: ext.field_value,
                    patientValue: medMatch.value
                  });
                }
              }
            });
            setReconciliationConflicts(conflicts);
          }
        }
      } catch (err) {
        console.error('Failed to load triage summary:', err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    loadData();
    return () => { ignore = true; };
  }, [sessionId]);

  const handleVerifyFact = async (factId: string) => {
    setVerifyingFactId(factId);
    try {
      const res = await fetch(`${API_URL}/history-facts/${factId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true })
      });
      if (res.ok) {
        setFacts(prev => prev.map(f => f.fact_id === factId ? { ...f, verified: 1 } : f));
      }
    } catch (err) {
      console.error('Failed to verify fact', err);
    } finally {
      setVerifyingFactId(null);
    }
  };

  const handleSaveFact = async (factId: string) => {
    try {
      const res = await fetch(`${API_URL}/history-facts/${factId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true, corrected_value: editValue })
      });
      if (res.ok) {
        setFacts(prev => prev.map(f => f.fact_id === factId ? { ...f, answer_value: editValue, verified: 1, provenance: 'doctor_entered' } : f));
      }
    } catch (err) {
      console.error('Failed to save fact', err);
    } finally {
      setEditingFactId(null);
    }
  };

  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = async () => {
    if (!sessionId) return;
    setIsSavingNotes(true);
    try {
      const doctorInfo = JSON.parse(localStorage.getItem('doctor_info') || '{}');
      await fetch(`${API_URL}/api/sessions/${sessionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorInfo.doctor_id, notes: doctorNotes })
      });
      setNotesSaved(true);
      setTimeout(() => {
        setNotesSaved(false);
        navigate('/doctor');
      }, 1500);
    } catch (e) {
      console.error('Failed to save doctor notes:', e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAcknowledgeRedFlags = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ red_flag: false })
      });
      if (res.ok) {
        setSession(prev => prev ? { ...prev, red_flag: false } : null);
        setRedFlags([]);
      }
    } catch (err) {
      console.error('Failed to acknowledge red flags', err);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-sand flex items-center justify-center font-body text-xl">Loading triage summary...</div>;
  if (!session) return <div className="min-h-screen bg-sand flex items-center justify-center font-body text-xl">Session not found.</div>;

  return (
    <div className="min-h-screen bg-sand font-body pb-12">
      <header className="bg-white border-b border-warmgray px-6 py-4 flex items-center sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" className="mr-4 text-charcoal hover:bg-warmgray/50" onClick={() => navigate('/doctor')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-display text-charcoal">Triage Summary</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-8 mt-4 space-y-6">
        
        {/* SECTION 1: Patient Information (Always Visible) */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
             <h3 className="text-3xl font-display text-charcoal">{session.patient_name}</h3>
             <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full font-body">
               {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div><p className="text-sm text-muted mb-1">Aadhaar / ABHA</p><p className="font-semibold text-charcoal text-lg">xxxx-xxxx-{session.dummy_aadhaar ? session.dummy_aadhaar.slice(-4) : '0000'}</p></div>
             <div><p className="text-sm text-muted mb-1">Preferred Language</p><p className="font-semibold text-charcoal text-lg">{session.language === 'hi' ? 'Hindi' : 'English'}</p></div>
             <div><p className="text-sm text-muted mb-1">Status</p><p className="font-semibold text-success flex items-center gap-1 text-lg"><ShieldCheck className="w-5 h-5" /> Pending Triage</p></div>
          </div>
        </section>

        {/* SECTION: AI Triage Summary (Always Visible) */}
        {(summaries.length > 0 || clinicalAlerts) && (
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-6 opacity-[0.07] pointer-events-none">
              <BrainCircuit className="w-48 h-48 text-blue-700" />
            </div>
            <h2 className="text-xl font-bold text-blue-900 uppercase tracking-wider mb-4 border-b border-blue-200/50 pb-2 flex items-center gap-2 relative z-10">
              <Sparkles className="w-5 h-5 text-blue-600"/> AI Triage Summary
            </h2>
            <div className="space-y-4 relative z-10">
              {summaries.length > 0 ? (
                summaries.map(sum => {
                  let parsed: any = null;
                  let completenessObj = null;
                  try {
                    if (typeof (sum as any).content === 'object' && (sum as any).content !== null) {
                      parsed = (sum as any).content;
                      if (parsed.completeness) completenessObj = parsed.completeness;
                    }
                  } catch (_e) {}

                  return (
                    <div key={sum.summary_id} className="space-y-4">
                      {parsed ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-1 md:col-span-2">
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Chief Complaint</h4>
                            <p className="text-blue-950">{parsed.chief_complaint || 'N/A'}</p>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <h4 className="text-sm font-bold text-blue-900 uppercase">History of Present Illness (HPI)</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.hpi || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Past Medical History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.pmh || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Past Surgical History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.psh || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Drug History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.drug_history || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Allergy History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.allergy_history || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Family History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.family_history || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Personal History</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.personal_history || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <h4 className="text-sm font-bold text-blue-900 uppercase">Review of Systems</h4>
                            <ul className="list-disc pl-5 text-blue-950">
                              {(parsed.ros || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <p className="text-base sm:text-lg text-blue-950 font-medium leading-relaxed whitespace-pre-wrap">
                          {sum.generated_text}
                        </p>
                      )}
                      
                      {completenessObj && (
                        <div className="mt-4 bg-white/60 p-4 rounded-xl border border-blue-200">
                           <div className="flex justify-between items-center mb-2">
                             <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">Data Completeness Score</p>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${completenessObj.score >= 80 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                               {completenessObj.score}%
                             </span>
                           </div>
                           <div className="w-full bg-blue-100 rounded-full h-2 mb-3">
                             <div className={`h-2 rounded-full ${completenessObj.score >= 80 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${completenessObj.score}%` }}></div>
                           </div>
                           {completenessObj.missing_fields && completenessObj.missing_fields.length > 0 && (
                             <div>
                               <p className="text-xs text-blue-800 font-semibold mb-1">Missing Information:</p>
                               <div className="flex flex-wrap gap-2">
                                 {completenessObj.missing_fields.map((mf: string, i: number) => (
                                   <span key={i} className="text-xs bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded">{mf}</span>
                                 ))}
                               </div>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-base sm:text-lg text-blue-950 font-medium leading-relaxed italic">
                  Patient presented with chief complaint of {session.chief_complaint}. Clinical analysis is ready for review.
                </p>
              )}
              
              {clinicalAlerts?.analysis?.triage_level && (
                <div className="mt-6 p-4 bg-white/70 rounded-xl border border-blue-200 backdrop-blur-sm">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Suggested Triage Level</p>
                  <p className="text-lg text-blue-950 font-semibold">{clinicalAlerts.analysis.triage_level}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: Current Complaint & Interview */}
        <CollapsibleSection 
          title="Current Complaint & Interview" 
          defaultOpen={true}
        >
          <div className="mb-6">
             <p className="text-sm text-muted mb-1">Chief Complaint</p>
             <p className="font-semibold text-charcoal text-xl">{session.chief_complaint}</p>
          </div>
          
          {facts.length === 0 ? (
            <p className="text-muted italic">No additional facts recorded for this session.</p>
          ) : (
            <div className="space-y-6">
              {facts.map((fact) => (
                <div key={fact.fact_id} className="relative pl-6 sm:pl-8 border-l-2 border-warmgray/50 pb-2 last:border-transparent">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-2" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted mb-1 font-medium">{fact.question_text}</p>
                      
                      {editingFactId === fact.fact_id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="text" 
                            className="flex-1 border border-primary rounded-md px-3 py-1 text-charcoal font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                          <Button size="sm" onClick={() => handleSaveFact(fact.fact_id)} className="bg-primary text-white hover:bg-primary/90 h-8"><Save className="w-4 h-4 mr-1"/> Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingFactId(null)} className="h-8"><X className="w-4 h-4"/></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <p className="text-lg text-charcoal font-semibold">{fact.answer_value}</p>
                          <button onClick={() => { setEditingFactId(fact.fact_id); setEditValue(fact.answer_value); }} className="text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 self-start mt-1 sm:mt-0">
                      <ProvenanceBadge type={fact.provenance} />
                      
                      {fact.verified === 1 ? (
                         <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                           <Check className="w-3.5 h-3.5" /> Verified
                         </span>
                      ) : (
                         <Button 
                           variant="outline" size="sm" 
                           className="h-7 text-xs border-primary/20 text-primary hover:bg-primary/10"
                           onClick={() => handleVerifyFact(fact.fact_id)}
                           disabled={verifyingFactId === fact.fact_id}
                         >
                           {verifyingFactId === fact.fact_id ? 'Verifying...' : 'Verify'}
                         </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: Medical History */}
        <CollapsibleSection 
          title="Medical History" 
          badge={medicalHistory.length === 0 ? "No data" : `${medicalHistory.length} items`}
        >
          {medicalHistory.length === 0 ? (
            <p className="text-muted italic">No history provided.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {medicalHistory.map(item => (
                <div key={item.item_id}>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">{item.category}</h3>
                  <div className="bg-sand/30 p-4 rounded-xl border border-warmgray/50">
                    <p className="text-charcoal font-medium whitespace-pre-wrap">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: AYUSH Assessment */}
        <CollapsibleSection 
          title="AYUSH Assessment" 
          badge={ayushAssessments.length === 0 ? "No data" : "Available"}
        >
          {ayushAssessments.length === 0 ? (
            <p className="text-muted italic">No AYUSH assessment recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ayushAssessments.map(item => (
                <div key={item.assessment_id} className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{item.dimension}</p>
                  <p className="text-charcoal font-medium capitalize">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: Medical Timeline */}
        <CollapsibleSection 
          title="Medical Timeline" 
          badge={documents.length === 0 ? "No data" : `${documents.length} files`}
        >
          {documents.length === 0 ? (
            <p className="text-muted italic">No documents uploaded.</p>
          ) : (
            <div className="relative border-l-2 border-primary/20 ml-4 sm:ml-6 pl-6 sm:pl-8 py-2 space-y-8">
              {(() => {
                const docsWithDates = documents.map(doc => {
                  const dDate = extractions.find(e => (e.document_id === doc.document_id || (doc as any).id === e.document_id) && e.field_name === 'document_date');
                  return { ...doc, extractedDate: dDate ? dDate.field_value : null };
                });
                
                const sortedDocs = docsWithDates.sort((a, b) => {
                  if (a.extractedDate && b.extractedDate) return new Date(a.extractedDate).getTime() - new Date(b.extractedDate).getTime();
                  if (a.extractedDate) return -1;
                  if (b.extractedDate) return 1;
                  return 0;
                });

                return sortedDocs.map((doc, idx) => (
                  <div key={doc.document_id || idx} className="relative">
                    <div className="absolute w-4 h-4 bg-primary rounded-full -left-[35px] sm:-left-[41px] top-1 border-4 border-white shadow-sm" />
                    
                    <div className="bg-sand/30 border border-warmgray rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-bold text-charcoal">
                          {doc.extractedDate ? (
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary"/> {doc.extractedDate}</span>
                          ) : (
                            <span className="text-muted italic">Date unknown</span>
                          )}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          doc.ocr_status === 'completed' ? 'bg-success/10 text-success' : 'bg-warmgray text-muted'
                        }`}>
                          {doc.ocr_status || 'Processed'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-warmgray rounded-lg flex items-center justify-center shadow-sm">
                          📄
                        </div>
                        <div>
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                            View Document <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: OCR-Extracted Information */}
        <CollapsibleSection 
          title="OCR-Extracted Information" 
          badge={extractions.length === 0 ? "No data" : `${extractions.length} fields`}
        >
          {reconciliationConflicts.length > 0 && (
            <div className="mb-6 bg-terracotta/10 border border-terracotta/20 rounded-xl p-4">
              <h3 className="text-terracotta font-bold flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                Patient-Document Reconciliation Conflicts
              </h3>
              <p className="text-sm text-terracotta/90 mb-3">
                The following information extracted from the patient's documents conflicts with their reported medical history:
              </p>
              <div className="space-y-3">
                {reconciliationConflicts.map((conflict, idx) => (
                  <div key={idx} className="bg-white/60 p-3 rounded-lg border border-terracotta/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-terracotta uppercase tracking-wider mb-1">{conflict.field}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-charcoal">Document:</span>
                        <span className="text-sm text-charcoal/80 line-clamp-1">{conflict.documentValue}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-charcoal">Patient:</span>
                        <span className="text-sm text-charcoal/80 line-clamp-1">{conflict.patientValue}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-terracotta border-terracotta/30 hover:bg-terracotta/5 whitespace-nowrap">
                      Resolve Conflict
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {extractions.length === 0 ? (
            <p className="text-muted italic">No data extracted from documents.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractions.map(ext => (
                <div key={ext.extraction_id} className={`bg-sand/50 p-4 rounded-xl border transition-all ${ext.confidence < 0.7 ? 'border-warning shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'border-warmgray'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">{ext.field_name}</p>
                    {ext.confidence < 0.7 && (
                      <span className="text-[10px] bg-warning/20 text-warning-foreground border border-warning/30 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Confidence
                      </span>
                    )}
                  </div>
                  <p className="text-charcoal font-medium">{ext.field_value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: Red Flags */}
        <CollapsibleSection 
          title="Red Flags" 
          icon={AlertTriangle}
          badge={redFlags.length === 0 ? "None" : `${redFlags.length} flags`}
        >
          {redFlags.length === 0 ? (
            <p className="text-muted italic">No red flags triggered or they have been acknowledged.</p>
          ) : (
            <div>
              <ul className="list-disc list-inside text-danger space-y-2 mb-4">
                {redFlags.map(rf => (
                  <li key={rf.flag_id} className="font-body text-sm font-medium">Rule Match: {rf.rule_id} (at {new Date(rf.created_at).toLocaleTimeString()})</li>
                ))}
              </ul>
              <Button onClick={handleAcknowledgeRedFlags} className="bg-danger text-white hover:bg-danger/90">
                Acknowledge and Clear Flags
              </Button>
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: Past Medical Records */}
        <CollapsibleSection 
          title="Past Medical Records" 
          badge={pastVisits.length === 0 ? "None" : `${pastVisits.length} visits`}
        >
          {pastVisits.length === 0 ? (
            <p className="text-muted italic">No past medical records found for this patient.</p>
          ) : (
            <div className="space-y-4">
              {pastVisits.map(visit => (
                <div key={visit.session_id} className="bg-sand p-4 rounded-xl border border-warmgray">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-charcoal">{new Date(visit.date).toLocaleDateString()} {new Date(visit.date).toLocaleTimeString()}</p>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-warmgray uppercase">{visit.status}</span>
                  </div>
                  <p className="text-sm text-charcoal mb-2"><span className="font-semibold">Chief Complaint:</span> {visit.chief_complaint}</p>
                  
                  {visit.doctor_notes && (
                    <div className="bg-white p-3 rounded border border-warmgray mt-2">
                      <p className="text-xs font-semibold text-muted mb-1">Doctor's Notes:</p>
                      <p className="text-sm whitespace-pre-wrap">{visit.doctor_notes}</p>
                    </div>
                  )}

                  {visit.documents && visit.documents.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted mb-1">Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {visit.documents.map(doc => (
                          <a key={doc.document_id || doc.id} href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs bg-forest text-white px-2 py-1 rounded hover:bg-forest/90">
                            View Document
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* SECTION: Doctor Notes and Verification (Always Visible) */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">Doctor Notes and Verification</h2>
          <textarea 
            className="w-full min-h-[120px] p-4 border border-warmgray rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-charcoal"
            placeholder="Add any additional clinical notes here..."
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
          ></textarea>
          <div className="flex items-center justify-between mt-4">
            {notesSaved && (
              <span className="text-success text-sm font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Notes Saved & Verified!
              </span>
            )}
            <div className="ml-auto">
              <Button 
                className="bg-primary text-white hover:bg-primary/90" 
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes & Verify'}
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
