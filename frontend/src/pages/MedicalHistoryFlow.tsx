import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, set } from 'idb-keyval';
import { MandalaBackground } from '../components/MandalaBackground';
import { QuestionCard } from '../components/QuestionCard';
import { LeafStepIndicator } from '../components/LeafStepIndicator';
import { Button } from '../components/ui/button';
import { Volume2, VolumeX, Mic, ShieldCheck } from 'lucide-react';
import { useAsr } from '@/hooks/useAsr';
import { useAudio } from '@/hooks/useAudio';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api';

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
  // Lazily initialize session
  const [session] = useState<SessionState | null>(() => {
    const sessionId = localStorage.getItem('patient_session') || localStorage.getItem('session_id');
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

  const { speak, isPlaying } = useAudio();
  const { isListening, transcript, startListening, stopListening } = useAsr();

  const flushOfflineQueue = useCallback(async () => {
    const queue: OfflineMedicalHistory[] | undefined = await get(OFFLINE_MH_QUEUE_KEY);
    if (!queue || queue.length === 0) return;

    await Promise.resolve();
    setIsSyncing(true);
    const remainingQueue: OfflineMedicalHistory[] = [];

    for (const item of queue) {
      try {
        const res = await fetch(`${API_URL}/medical-history`, {
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

  // Voice recognition handling for each step
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();

    if (step === 0) {
      // Allergies
      const allergyOptions = ['Penicillin', 'Sulfa drugs', 'Peanuts', 'Dust/Pollen', 'None', 'Other'];
      if (lower.includes('no') || lower.includes('none') || lower.includes('कोई नहीं') || lower.includes('नही')) {
        setAllergies(['None']);
      } else {
        allergyOptions.forEach(item => {
          if (lower.includes(item.toLowerCase().split('/')[0].split(' ')[0])) {
            toggleSelection(item, allergies, setAllergies);
          }
        });
      }
    } else if (step === 1) {
      // Medications - dictate text
      setMedications(prev => (prev ? prev + ', ' + transcript : transcript));
    } else if (step === 2) {
      // Conditions
      const condOptions = ['Diabetes', 'Hypertension (High BP)', 'Asthma', 'Thyroid', 'Heart Disease', 'None', 'Other'];
      if (lower.includes('no') || lower.includes('none') || lower.includes('कोई नहीं') || lower.includes('नही')) {
        setConditions(['None']);
      } else if (lower.includes('sugar') || lower.includes('मधुमेह') || lower.includes('diabetes')) {
        toggleSelection('Diabetes', conditions, setConditions);
      } else if (lower.includes('bp') || lower.includes('pressure') || lower.includes('hypertension')) {
        toggleSelection('Hypertension (High BP)', conditions, setConditions);
      } else if (lower.includes('asthma') || lower.includes('दमा')) {
        toggleSelection('Asthma', conditions, setConditions);
      } else if (lower.includes('heart') || lower.includes('दिल')) {
        toggleSelection('Heart Disease', conditions, setConditions);
      } else if (lower.includes('thyroid')) {
        toggleSelection('Thyroid', conditions, setConditions);
      }
    } else if (step === 3) {
      // Surgeries - dictate text
      setSurgeries(prev => (prev ? prev + ', ' + transcript : transcript));
    }
  }, [transcript, step]);

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
      const res = await fetch(`${API_URL}/medical-history`, {
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
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
        <MandalaBackground />
        <QuestionCard className="w-full max-w-2xl text-center z-10 p-12">
          <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="font-display text-4xl text-charcoal mb-3">
            {session?.language === 'hi' ? 'पंजीकरण पूरा हुआ' : 'Check-In Complete'}
          </h1>
          <p className="font-body text-lg text-muted mb-8">
            {session?.language === 'hi'
              ? 'आपका संपूर्ण डेटा डॉक्टर के डैशबोर्ड पर भेज दिया गया है।'
              : 'Your health history has been synced to the triage desk. The doctor will see you shortly.'}
          </p>
          <Button
            onClick={() => navigate('/submitted')}
            className="w-full min-h-[58px] text-lg rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body"
          >
            {session?.language === 'hi' ? 'रसीद देखें' : 'View Check-In Token'}
          </Button>
          {isSyncing && (
             <p className="text-primary text-sm font-body animate-pulse mt-4">Syncing offline data...</p>
          )}
        </QuestionCard>
      </div>
    );
  }

  const getStepTitle = () => {
    switch (step) {
      case 0: return session?.language === 'hi' ? 'क्या आपको कोई एलर्जी है?' : 'Do you have any allergies?';
      case 1: return session?.language === 'hi' ? 'क्या आप कोई दवा ले रहे हैं?' : 'Are you currently taking any medications?';
      case 2: return session?.language === 'hi' ? 'क्या आपको पहले कोई बीमारी हुई है?' : 'Do you have any past medical conditions?';
      case 3: return session?.language === 'hi' ? 'क्या आपकी कभी कोई सर्जरी हुई है?' : 'Have you had any past surgeries?';
      default: return '';
    }
  };

  const getStepHint = () => {
    switch (step) {
      case 0: return 'Say "None" or speak allergy names';
      case 1: return 'Speak your medication names';
      case 2: return 'Say "Diabetes", "Blood Pressure", "Asthma", or "None"';
      case 3: return 'Speak surgery details or "None"';
      default: return '';
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-3.5 mt-4">
            <div className="w-full flex justify-end mb-2">
               <button 
                 onClick={() => navigate('/records-upload')}
                 className="text-primary hover:text-primary/80 font-body text-xs font-semibold underline underline-offset-4"
               >
                 {session?.language === 'hi' ? 'पुराने रिकॉर्ड अपलोड करें' : 'Upload Past Records (OCR)'}
               </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {['Penicillin', 'Sulfa drugs', 'Peanuts', 'Dust/Pollen', 'None', 'Other'].map(item => (
                <button
                  key={item}
                  onClick={() => toggleSelection(item, allergies, setAllergies)}
                  className={cn(
                    "min-h-[58px] px-4 py-3 flex items-center justify-center text-center",
                    "bg-white border-2 rounded-xl transition-all duration-300 font-body text-base font-semibold",
                    allergies.includes(item)
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-warmgray text-charcoal hover:border-primary/40 hover:bg-sand/30"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            {allergies.includes('Other') && (
              <input
                type="text"
                value={otherAllergy}
                onChange={e => setOtherAllergy(e.target.value)}
                placeholder={session?.language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                className="w-full text-center text-base p-3.5 mt-1 border-2 border-primary/40 rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-muted text-xs -mt-1 font-body">
              {session?.language === 'hi' ? '(यदि नहीं, तो खाली छोड़ दें या बोलें)' : '(Speak or type medication names, or leave blank if none)'}
            </p>
            <textarea
              value={medications}
              onChange={e => setMedications(e.target.value)}
              placeholder={session?.language === 'hi' ? 'दवाओं के नाम टाइप करें या बोलें...' : 'Speak or type medication names...'}
              className="w-full text-base p-4 min-h-[110px] border-2 border-warmgray rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {['Diabetes', 'Hypertension (High BP)', 'Asthma', 'Thyroid', 'Heart Disease', 'None', 'Other'].map(item => (
                <button
                  key={item}
                  onClick={() => toggleSelection(item, conditions, setConditions)}
                  className={cn(
                    "min-h-[58px] px-4 py-3 flex items-center justify-center text-center",
                    "bg-white border-2 rounded-xl transition-all duration-300 font-body text-base font-semibold",
                    conditions.includes(item)
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-warmgray text-charcoal hover:border-primary/40 hover:bg-sand/30"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            {conditions.includes('Other') && (
              <input
                type="text"
                value={otherCondition}
                onChange={e => setOtherCondition(e.target.value)}
                placeholder={session?.language === 'hi' ? 'कृपया निर्दिष्ट करें...' : 'Please specify...'}
                className="w-full text-center text-base p-3.5 mt-1 border-2 border-primary/40 rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-muted text-xs -mt-1 font-body">
              {session?.language === 'hi' ? '(यदि नहीं, तो खाली छोड़ दें या बोलें)' : '(Speak or type past surgeries, or leave blank if none)'}
            </p>
            <textarea
              value={surgeries}
              onChange={e => setSurgeries(e.target.value)}
              placeholder={session?.language === 'hi' ? 'सर्जरी का विवरण बोलें या लिखें...' : 'Speak or type surgery details...'}
              className="w-full text-base p-4 min-h-[110px] border-2 border-warmgray rounded-xl bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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
    return false;
  };

  const stepTitle = getStepTitle();

  return (
    <div className="min-h-screen bg-sand flex flex-col pt-10 p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      
      <div className="w-full max-w-[768px] mx-auto flex flex-col gap-5 z-10">
        <div className="w-full flex justify-center pb-1">
           <LeafStepIndicator total={4} current={step} />
        </div>

        <div className="w-full bg-[#f7f4ed] rounded-[28px] border border-warmgray shadow-xs p-6 sm:p-10 flex flex-col">
          
          {/* Header with Title and Speaker */}
          <div className="flex justify-between items-start mb-2 gap-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal leading-tight">
              {stepTitle}
            </h2>
            <button
              onClick={() => speak(stepTitle, session?.language === 'hi' ? 'hi-IN' : 'en-US')}
              className="w-11 h-11 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors shrink-0"
              title="Listen to question"
            >
              {isPlaying ? <VolumeX className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {renderStep()}

          {/* Voice ASR Input Bar */}
          <div className="flex flex-col items-center mt-6 pt-4 border-t border-warmgray/60 w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (isListening ? stopListening() : startListening({ lang: session?.language === 'hi' ? 'hi-IN' : 'en-IN' }))}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isListening 
                    ? 'bg-danger text-white animate-pulse scale-110' 
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                title="Speak your answer"
              >
                <Mic className="w-5 h-5" />
              </button>
              <div className="text-left">
                <p className="text-xs font-semibold text-charcoal">{isListening ? 'Listening...' : 'Voice Input (ASR)'}</p>
                <p className="text-xs text-muted">{getStepHint()}</p>
              </div>
            </div>
            {transcript && (
              <p className="mt-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                "{transcript}"
              </p>
            )}
          </div>
          
          <Button
            onClick={handleNext}
            disabled={isNextDisabled() || isSubmitting}
            className="mt-6 w-full min-h-[58px] text-lg rounded-[12px] bg-primary text-white font-body focus:outline-none focus:ring-2 focus:ring-primary hover:bg-primary/90 transition-colors shadow-xs"
          >
            {isSubmitting 
              ? (session?.language === 'hi' ? 'सहेज रहा है...' : 'Saving...') 
              : step === 3 
                ? (session?.language === 'hi' ? 'समाप्त करें' : 'Finish & Submit') 
                : (session?.language === 'hi' ? 'जारी रखें' : 'Continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
