import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProvenanceBadge } from '@/components/ProvenanceBadge';
import { ArrowLeft, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

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
  verified: number; // sqlite boolean
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

export default function TriageSummary() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [facts, setFacts] = useState<HistoryFact[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingFactId, setVerifyingFactId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const [triageRes, historyRes] = await Promise.all([
          fetch(`http://localhost:3001/sessions/${sessionId}/triage`),
          fetch(`http://localhost:3001/medical-history/${sessionId}`)
        ]);
        const triageData = await triageRes.json();
        const historyData = await historyRes.json();

        if (!ignore) {
          setSession(triageData.session);
          setFacts(triageData.facts || []);
          setRedFlags(triageData.redFlags || []);
          setMedicalHistory(historyData.items || []);
        }
      } catch (err) {
        console.error('Failed to load triage summary:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => { ignore = true; };
  }, [sessionId]);

  const handleVerifyFact = async (factId: string) => {
    setVerifyingFactId(factId);
    try {
      const res = await fetch(`http://localhost:3001/history-facts/${factId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true, corrected_value: undefined }) // just mark as verified
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

  if (isLoading) {
    return <div className="min-h-screen bg-sand flex items-center justify-center font-body text-xl">Loading...</div>;
  }

  if (!session) {
    return <div className="min-h-screen bg-sand flex items-center justify-center font-body text-xl">Session not found.</div>;
  }

  return (
    <div className="min-h-screen bg-sand font-body pb-12">
      {/* Header */}
      <header className="bg-white border-b border-warmgray px-6 py-4 flex items-center sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" className="mr-4 text-charcoal hover:bg-warmgray/50" onClick={() => navigate('/doctor')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-display text-charcoal">Triage Summary</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-8 mt-4 space-y-6">
        {/* Red Flags Banner */}
        {redFlags.length > 0 && (
          <div className="bg-danger/10 border-l-4 border-danger p-6 rounded-r-xl flex flex-col sm:flex-row gap-4 items-start shadow-sm">
            <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <h2 className="text-xl font-display text-danger mb-2">Immediate Attention Required</h2>
              <ul className="list-disc list-inside text-danger/80 space-y-1">
                {redFlags.map(rf => (
                  <li key={rf.flag_id} className="font-body text-sm font-medium">Flag Triggered: {rf.rule_id}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Patient Profile */}
        <div className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
             <h2 className="text-3xl font-display text-charcoal">{session.patient_name}</h2>
             <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full font-body">
               {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
             <div>
               <p className="text-sm text-muted mb-1">Aadhaar (Masked)</p>
               <p className="font-semibold text-charcoal text-lg">xxxx-xxxx-{session.dummy_aadhaar.slice(-4)}</p>
             </div>
             <div>
               <p className="text-sm text-muted mb-1">Chief Complaint</p>
               <p className="font-semibold text-charcoal text-lg">{session.chief_complaint}</p>
             </div>
             <div>
               <p className="text-sm text-muted mb-1">Preferred Language</p>
               <p className="font-semibold text-charcoal text-lg">{session.language === 'hi' ? 'Hindi' : 'English'}</p>
             </div>
             <div>
               <p className="text-sm text-muted mb-1">Status</p>
               <p className="font-semibold text-success flex items-center gap-1 text-lg">
                 <ShieldCheck className="w-5 h-5" /> Pending Triage
               </p>
             </div>
          </div>
        </div>

        {/* Interview Timeline */}
        <div className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-display text-charcoal mb-6 border-b border-warmgray pb-4">Clinical Interview Facts</h2>
          
          {facts.length === 0 ? (
            <p className="text-muted italic">No facts recorded for this session.</p>
          ) : (
            <div className="space-y-6">
              {facts.map((fact) => (
                <div key={fact.fact_id} className="relative pl-6 sm:pl-8 border-l-2 border-warmgray/50 pb-2 last:border-transparent">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-2" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted mb-1 font-medium">{fact.question_text}</p>
                      <p className="text-lg text-charcoal font-semibold">{fact.answer_value}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 self-start">
                      <ProvenanceBadge type={fact.provenance} />
                      
                      {fact.verified === 1 ? (
                         <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                           <Check className="w-3.5 h-3.5" /> Verified
                         </span>
                      ) : (
                         <Button 
                           variant="outline" 
                           size="sm" 
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
        </div>

        {/* Medical History */}
        {medicalHistory.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-warmgray p-6 sm:p-8 shadow-sm">
            <h2 className="text-2xl font-display text-charcoal mb-6 border-b border-warmgray pb-4">Past Medical History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {medicalHistory.map(item => (
                <div key={item.item_id}>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">{item.category}</h3>
                  <div className="bg-sand/30 p-4 rounded-xl border border-warmgray/50">
                    <p className="text-charcoal font-medium whitespace-pre-wrap">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
