import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MandalaBackground } from '../components/MandalaBackground';
import { QuestionCard } from '../components/QuestionCard';
import { get, set } from 'idb-keyval';

const OFFLINE_QUEUE_KEY = 'medikiosk_offline_ayush';

interface SessionState {
  id: string;
  language: string;
}

interface AyushAssessment {
  session_id: string;
  dimension: string;
  value: string;
}

type AyushStep = 'prakriti' | 'vikriti' | 'agni' | 'koshtha' | 'ahara_vihara';

const steps: AyushStep[] = ['prakriti', 'vikriti', 'agni', 'koshtha', 'ahara_vihara'];

const stepContent = {
  prakriti: {
    en: 'How would you describe your body type?',
    hi: 'आप अपने शरीर के प्रकार का वर्णन कैसे करेंगे?',
    options: [
      { id: 'vata', en: 'Vata (thin, active)', hi: 'वात (पतला, सक्रिय)' },
      { id: 'pitta', en: 'Pitta (medium, intense)', hi: 'पित्त (मध्यम, तीव्र)' },
      { id: 'kapha', en: 'Kapha (heavy, calm)', hi: 'कफ (भारी, शांत)' }
    ]
  },
  vikriti: {
    en: 'What is your main health concern right now?',
    hi: 'अभी आपकी मुख्य स्वास्थ्य समस्या क्या है?',
    options: [
      { id: 'digestive', en: 'Digestive issues', hi: 'पाचन संबंधी समस्याएं' },
      { id: 'joint', en: 'Joint pain', hi: 'जोड़ों का दर्द' },
      { id: 'skin', en: 'Skin problems', hi: 'त्वचा की समस्याएं' },
      { id: 'fatigue', en: 'Fatigue', hi: 'थकान' },
      { id: 'other', en: 'Other', hi: 'अन्य' }
    ]
  },
  agni: {
    en: 'How is your digestion typically?',
    hi: 'आमतौर पर आपका पाचन कैसा रहता है?',
    options: [
      { id: 'strong', en: 'Strong', hi: 'मजबूत' },
      { id: 'moderate', en: 'Moderate', hi: 'मध्यम' },
      { id: 'weak', en: 'Weak', hi: 'कमज़ोर' }
    ]
  },
  koshtha: {
    en: 'How are your bowel movements usually?',
    hi: 'आपके मल त्याग की प्रवृत्ति कैसी है?',
    options: [
      { id: 'regular', en: 'Regular daily', hi: 'नियमित दैनिक' },
      { id: 'irregular', en: 'Irregular', hi: 'अनियमित' },
      { id: 'constipated', en: 'Constipated', hi: 'कब्ज' },
      { id: 'loose', en: 'Loose', hi: 'पतला' }
    ]
  },
  ahara_vihara: {
    en: 'How would you describe your daily routine?',
    hi: 'आप अपनी दिनचर्या का वर्णन कैसे करेंगे?',
    options: [
      { id: 'balanced', en: 'Balanced', hi: 'संतुलित' },
      { id: 'irregular', en: 'Irregular', hi: 'अनियमित' },
      { id: 'heavy', en: 'Heavy/fried', hi: 'भारी/तला हुआ' },
      { id: 'light', en: 'Light/active', hi: 'हल्का/सक्रिय' }
    ]
  }
};

export default function AyushFlow() {
  const navigate = useNavigate();
  const [session] = useState<SessionState | null>(() => {
    const sessionId = localStorage.getItem('patient_session');
    const lang = localStorage.getItem('patient_language') || 'en';
    if (!sessionId) return null;
    return { id: sessionId, language: lang };
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const flushOfflineQueue = useCallback(async () => {
    const queue: AyushAssessment[] | undefined = await get(OFFLINE_QUEUE_KEY);
    if (!queue || queue.length === 0) return;

    setIsSyncing(true);
    const remainingQueue: AyushAssessment[] = [];

    for (const assessment of queue) {
      try {
        const res = await fetch('http://localhost:3001/ayush-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessment)
        });
        if (!res.ok) throw new Error('Sync failed');
      } catch {
        remainingQueue.push(assessment);
      }
    }

    await set(OFFLINE_QUEUE_KEY, remainingQueue);
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

  const handleAnswer = async (value: string) => {
    if (!session) return;
    const dimension = steps[currentStepIndex];

    const payload: AyushAssessment = {
      session_id: session.id,
      dimension,
      value
    };

    try {
      if (!navigator.onLine) throw new Error('Offline');
      const res = await fetch('http://localhost:3001/ayush-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      const queue: AyushAssessment[] = (await get(OFFLINE_QUEUE_KEY)) || [];
      queue.push(payload);
      await set(OFFLINE_QUEUE_KEY, queue);
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (!session) return null;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <MandalaBackground />
        <QuestionCard className="w-full max-w-2xl text-center z-10 p-12 border-terracotta/30">
          <h1 className="font-display text-4xl text-terracotta mb-4">
            {session.language === 'hi' ? 'धन्यवाद' : 'Thank you'}
          </h1>
          <p className="font-body text-xl text-muted mb-8">
            {session.language === 'hi'
              ? 'आपका आयुष मूल्यांकन पूरा हो गया है।'
              : 'Your AYUSH assessment is complete.'}
          </p>
          <button
            onClick={() => navigate('/medical-history')}
            className="w-full min-h-[64px] text-xl rounded-[12px] bg-terracotta text-white font-body focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 hover:bg-terracotta/90 transition-colors"
          >
            {session.language === 'hi' ? 'जारी रखें' : 'Continue to Medical History'}
          </button>
          {isSyncing && (
             <p className="text-terracotta text-sm font-body animate-pulse mt-4">Syncing offline data...</p>
          )}
        </QuestionCard>
      </div>
    );
  }

  const currentStepId = steps[currentStepIndex];
  const content = stepContent[currentStepId];

  return (
    <div className="min-h-screen bg-sand flex flex-col pt-12 p-6 relative overflow-hidden">
      <MandalaBackground />
      <div className="z-10 w-full flex flex-col items-center">
        <QuestionCard className="w-full max-w-2xl border-terracotta/30">
          <div className="text-center mb-8">
             <div className="inline-block bg-terracotta/10 text-terracotta font-body px-4 py-1 rounded-full mb-4 font-bold tracking-wide">
                AYUSH ASSESSMENT
             </div>
             <h2 className="font-display text-3xl md:text-4xl text-charcoal mb-4">
               {session.language === 'hi' ? content.hi : content.en}
             </h2>
          </div>
          
          <div className="space-y-4">
            {content.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                className="w-full p-4 md:p-6 text-left rounded-[12px] border-2 border-warmgray bg-white hover:border-terracotta/50 hover:bg-terracotta/5 focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 transition-all duration-300"
              >
                <div className="font-body text-xl text-charcoal">
                  {session.language === 'hi' ? opt.hi : opt.en}
                </div>
              </button>
            ))}
          </div>
        </QuestionCard>
      </div>
      
      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-terracotta text-white px-4 py-2 rounded-full shadow-lg font-body text-sm animate-pulse z-50">
          Syncing offline data...
        </div>
      )}
    </div>
  );
}
