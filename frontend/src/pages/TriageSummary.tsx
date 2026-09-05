import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { ArrowLeft, Check, AlertTriangle, ShieldCheck, Edit2, Save, X } from 'lucide-react';
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
}

interface Summary {
  summary_id: string;
  generated_text: string;
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
  const [clinicalAlerts, setClinicalAlerts] = useState<any>(null);
  
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
      await fetch(`${API_URL}/api/summary/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, notes: doctorNotes })
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save doctor notes:', e);
    } finally {
      setIsSavingNotes(false);
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
        
        {/* SECTION 1: Patient Information */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">1. Patient Information</h2>
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

        {/* SECTION 2: Current Complaint and Adaptive Interview */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">2. Current Complaint & Interview</h2>
          <div className="mb-6">
             <p className="text-sm text-muted mb-1">Chief Complaint</p>
             <p className="font-semibold text-charcoal text-xl">{session.chief_complaint}</p>
          </div>
          
          {facts.length === 0 ? (
            <p className="text-muted italic">No facts recorded for this session.</p>
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
        </section>

        {/* SECTION 3: Medical History Provided by Patient */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">3. Medical History Provided by Patient</h2>
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
        </section>

        {/* SECTION 4: AYUSH Assessment */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">4. AYUSH Assessment</h2>
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
        </section>

        {/* SECTION 5: Medical Documents */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">5. Medical Documents</h2>
          {documents.length === 0 ? (
            <p className="text-muted italic">No documents uploaded.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {documents.map(doc => (
                <div key={doc.document_id} className="p-4 border border-warmgray rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-warmgray/50 rounded-lg flex items-center justify-center">📄</div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">Medical Record Document</p>
                    <span className="text-xs text-muted">Status: {doc.ocr_status || 'Processed'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 6: OCR-Extracted Information */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">6. OCR-Extracted Information</h2>
          {extractions.length === 0 ? (
            <p className="text-muted italic">No data extracted from documents.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extractions.map(ext => (
                <div key={ext.extraction_id} className="bg-sand/50 p-4 rounded-xl border border-warmgray">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{ext.field_name}</p>
                  <p className="text-charcoal font-medium">{ext.field_value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 7: System-Derived Information */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">7. System-Derived Information</h2>
          {summaries.length === 0 ? (
            <p className="text-muted italic">No automated summaries available.</p>
          ) : (
            <div className="space-y-4">
              {summaries.map(sum => (
                <div key={sum.summary_id} className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{sum.generated_text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 8: Red Flags */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-danger uppercase tracking-wider mb-4 border-b border-danger/20 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/> 8. Red Flags
          </h2>
          {redFlags.length === 0 ? (
            <p className="text-muted italic">No red flags triggered.</p>
          ) : (
            <ul className="list-disc list-inside text-danger space-y-2">
              {redFlags.map(rf => (
                <li key={rf.flag_id} className="font-body text-sm font-medium">Rule Match: {rf.rule_id} (at {new Date(rf.created_at).toLocaleTimeString()})</li>
              ))}
            </ul>
          )}
        </section>

        {/* SECTION 9: Doctor Notes and Verification */}
        <section className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-muted uppercase tracking-wider mb-4 border-b border-warmgray pb-2">9. Doctor Notes and Verification</h2>
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
