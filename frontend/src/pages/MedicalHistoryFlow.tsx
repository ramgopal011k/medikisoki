import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, set } from 'idb-keyval';
import { MandalaBackground } from '../components/MandalaBackground';
import { QuestionCard } from '../components/QuestionCard';
import { LeafStepIndicator } from '../components/LeafStepIndicator';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';

interface SessionState {
  id: string;
  language: string;
}

interface OfflineMedicalHistory {
  session_id: string;
  items: { category: string; value: string; }[];
}

const OFFLINE_MH_QUEUE_KEY = 'medikiosk_offline_medical_history';

export default function MedicalHistoryFlow() {
  const navigate = useNavigate();
  // Lazily initialize session to avoid setState in effect
  const [session] = useState<SessionState | null>(() => {
    const sessionId = localStorage.getItem('patient_session');
    const lang = localStorage.getItem('patient_language') || 'en';
    if (!sessionId) return null;
    return { id: sessionId, language: lang };
  });
  
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [allergies, setAllergies] = useState<string[]>([]);
  const [otherAllergy, setOtherAllergy] = useState('');
  const [medications, setMedications] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [surgeries, setSurgeries] = useState('');

  const flushOfflineQueue = useCallback(async () => {
    const queue: OfflineMedicalHistory[] | undefined = await get(OFFLINE_MH_QUEUE_KEY);
    if (!queue || queue.length === 0) return;

    // Await a microtask to avoid synchronous setState-in-effect warning
    await Promise.resolve();
    setIsSyncing(true);
    const remainingQueue: OfflineMedicalHistory[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('http://localhost:3001/medical-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error('Sync failed');
      } catch {
        remainingQueue.push(item);
      }
    }

    await set(OFFLINE_MH_QUEUE_KEY, remainingQueue);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    if (!session) {
      navigate('/consent');
      return;
    }

    const init = async () => {
      await flushOfflineQueue();
    };
    init();

    const handleOnline = () => { flushOfflineQueue(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session, navigate, flushOfflineQueue]);

  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (item === 'None') {
      setList(['None']);
      return;
    }
    
    let newList = list.filter(i => i !== 'None');
    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
    } else {
      newList.push(item);
    }
    setList(newList);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitHistory();
    }
  };

  const submitHistory = async () => {
    if (!session) return;
    setIsSubmitting(true);
    
    let finalAllergies = allergies.filter(a => a !== 'Other').join(', ');
    if (allergies.includes('Other') && otherAllergy) {
      finalAllergies += (finalAllergies ? ', ' : '') + otherAllergy;
    }

    let finalConditions = conditions.filter(c => c !== 'Other').join(', ');
    if (conditions.includes('Other') && otherCondition) {
      finalConditions += (finalConditions ? ', ' : '') + otherCondition;
    }

    const items = [
      { category: 'Allergies', value: finalAllergies || 'None reported' },
      { category: 'Medications', value: medications || 'None reported' },
      { category: 'Conditions', value: finalConditions || 'None reported' },
      { category: 'Surgeries', value: surgeries || 'None reported' }
    ];

    const payload = { session_id: session.id, items };

    try {
      if (!navigator.onLine) throw new Error('Offline');
      const res = await fetch('http://localhost:3001/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      const queue: OfflineMedicalHistory[] = (await get(OFFLINE_MH_QUEUE_KEY)) || [];
      queue.push(payload);
      await set(OFFLINE_MH_QUEUE_KEY, queue);
    } finally {
      setIsSubmitting(false);
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <MandalaBackground />
        <QuestionCard className="w-full max-w-2xl text-center z-10 p-12">
          <h1 className="font-display text-4xl text-charcoal mb-4">
            {session?.language === 'hi' ? 'धन्यवाद' : 'Thank You'}
          </h1>
          <p className="font-body text-xl text-muted mb-8">
            {session?.language === 'hi'
              ? 'आपका पंजीकरण पूरा हो गया है। डॉक्टर जल्द ही आपको देखेंगे।'
              : 'Your registration is completely finished. The doctor will see you shortly.'}
          </p>
          {isSyncing && (
             <p className="text-primary text-sm font-body animate-pulse mt-4">Syncing offline data...</p>
          )}
        </QuestionCard>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-4 mt-6">
            <div className="w-full flex justify-end mb-4">
               <button 
                 onClick={() => navigate('/records-upload')}
                 className="text-primary hover:text-primary/80 font-body text-sm font-semibold underline underline-offset-4"
               >
                 {session?.language === 'hi' ? 'पुराने रिकॉर्ड अपलोड करें' : 'Upload Past Records (OCR)'}
               </button>
            </div>
            <h2 className="font-display text-3xl text-charcoal mb-4">
              {session?.language === 'hi' ? 'क्या आपको कोई एलर्जी है?' : 'Do you have any allergies?'}
            </h2>
            {['Penicillin', 'Sulfa drugs', 'Peanuts', 'Dust/Pollen', 'None', 'Other'].map(item => (
              <button
                key={item}
                onClick={() => toggleSelection(item, allergies, setAllergies)}
                className={cn(
                  "w-full min-h-[64px] px-6 py-4 flex items-center justify-center text-center",
                  "bg-white border-2 rounded-xl transition-all duration-300 font-body text-xl",
                  allergies.includes(item)
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-warmgray text-charcoal hover:border-primary/40 hover:bg-white/50"
                )}
              >
                {item}
              </button>
            ))}
            {allergies.includes('Other') && (
              <input
                type="text"
                value={otherAllergy}
                onChange={e => setOtherAllergy(e.target.value)}
                placeholder={session?.language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                className="w-full text-center text-xl p-4 mt-2 border-2 border-primary/40 rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4 mt-6">
            <h2 className="font-display text-3xl text-charcoal mb-4">
              {session?.language === 'hi' ? 'क्या आप कोई दवा ले रहे हैं?' : 'Are you currently taking any medications?'}
            </h2>
            <p className="text-muted text-sm -mt-2 mb-2 font-body">
              {session?.language === 'hi' ? '(यदि नहीं, तो खाली छोड़ दें)' : '(Leave blank if none)'}
            </p>
            <textarea
              value={medications}
              onChange={e => setMedications(e.target.value)}
              placeholder={session?.language === 'hi' ? 'दवाओं के नाम टाइप करें...' : 'Type medication names...'}
              className="w-full text-xl p-4 min-h-[120px] border-2 border-warmgray rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4 mt-6">
            <h2 className="font-display text-3xl text-charcoal mb-4">
              {session?.language === 'hi' ? 'क्या आपको पहले कोई बीमारी हुई है?' : 'Do you have any past medical conditions?'}
            </h2>
            {['Diabetes', 'Hypertension (High BP)', 'Asthma', 'Thyroid', 'Heart Disease', 'None', 'Other'].map(item => (
              <button
                key={item}
                onClick={() => toggleSelection(item, conditions, setConditions)}
                className={cn(
                  "w-full min-h-[64px] px-6 py-4 flex items-center justify-center text-center",
                  "bg-white border-2 rounded-xl transition-all duration-300 font-body text-xl",
                  conditions.includes(item)
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-warmgray text-charcoal hover:border-primary/40 hover:bg-white/50"
                )}
              >
                {item}
              </button>
            ))}
            {conditions.includes('Other') && (
              <input
                type="text"
                value={otherCondition}
                onChange={e => setOtherCondition(e.target.value)}
                placeholder={session?.language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                className="w-full text-center text-xl p-4 mt-2 border-2 border-primary/40 rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-4 mt-6">
            <h2 className="font-display text-3xl text-charcoal mb-4">
              {session?.language === 'hi' ? 'क्या आपकी कभी कोई सर्जरी हुई है?' : 'Have you had any past surgeries?'}
            </h2>
            <p className="text-muted text-sm -mt-2 mb-2 font-body">
              {session?.language === 'hi' ? '(यदि नहीं, तो खाली छोड़ दें)' : '(Leave blank if none)'}
            </p>
            <textarea
              value={surgeries}
              onChange={e => setSurgeries(e.target.value)}
              placeholder={session?.language === 'hi' ? 'सर्जरी का विवरण...' : 'Type surgery details...'}
              className="w-full text-xl p-4 min-h-[120px] border-2 border-warmgray rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (step === 0) return allergies.length === 0;
    if (step === 2) return conditions.length === 0;
    return false; // Text fields are optional
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col pt-12 p-6 relative overflow-hidden">
      <MandalaBackground />
      
      <div className="w-full max-w-[768px] mx-auto flex flex-col gap-6 z-10">
        <div className="w-full flex justify-center pb-2">
           <LeafStepIndicator total={4} current={step} />
        </div>

        <QuestionCard className="w-full text-center flex flex-col pt-8 pb-10 px-6 sm:px-10">
          {renderStep()}
          
          <Button
            onClick={handleNext}
            disabled={isNextDisabled() || isSubmitting}
            className="mt-8 w-full min-h-[64px] text-xl rounded-[12px] bg-primary text-white font-body focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:bg-primary/90 transition-colors"
          >
            {isSubmitting 
              ? (session?.language === 'hi' ? 'सहेज रहा है...' : 'Saving...') 
              : step === 3 
                ? (session?.language === 'hi' ? 'समाप्त करें' : 'Finish') 
                : (session?.language === 'hi' ? 'जारी रखें' : 'Continue')}
          </Button>
        </QuestionCard>
      </div>
    </div>
  );
}
