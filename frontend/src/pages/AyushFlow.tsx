import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MandalaBackground } from '../components/MandalaBackground';
import { QuestionCard } from '../components/QuestionCard';
import { Volume2, VolumeX, Mic, Flower2 } from 'lucide-react';
import { useAsr } from '@/hooks/useAsr';
import { useAudio } from '@/hooks/useAudio';
import { get, set } from 'idb-keyval';
import { API_URL } from '@/lib/api';

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

type AyushStep = 'prakriti' | 'vikriti' | 'agni' | 'koshtha' | 'ahara_vihara' | 'sattva';

const steps: AyushStep[] = ['prakriti', 'vikriti', 'agni', 'koshtha', 'ahara_vihara', 'sattva'];

const stepContent: Record<AyushStep, { en: string; hi: string; title: string; options: { id: string; en: string; hi: string }[] }> = {
  prakriti: {
    title: '1. Prakriti Pariksha (Body Constitution)',
    en: 'How would you describe your natural physical constitution (Prakriti)?',
    hi: 'आप अपनी प्राकृतिक शारीरिक प्रकृति का वर्णन कैसे करेंगे?',
    options: [
      { id: 'vata', en: 'Vata (Light, thin, active, sensitive to cold)', hi: 'वात (हल्का, पतला, फुर्तीला, ठंड के प्रति संवेदनशील)' },
      { id: 'pitta', en: 'Pitta (Medium build, sharp appetite, sensitive to heat)', hi: 'पित्त (मध्यम शरीर, तीव्र भूख, गर्मी के प्रति संवेदनशील)' },
      { id: 'kapha', en: 'Kapha (Broad build, calm, slow digestion, heavy)', hi: 'कफ (मजबूत/भारी शरीर, शांत, धीमी पाचन)' },
      { id: 'dwandvaja', en: 'Mixed Dosha (Combination of two doshas)', hi: 'द्वंद्वज (दो प्रकृतियों का मिश्रण)' }
    ]
  },
  vikriti: {
    title: '2. Vikriti Pariksha (Current Dosha Imbalance)',
    en: 'What is your primary ongoing discomfort or health concern?',
    hi: 'वर्तमान में आपकी मुख्य स्वास्थ्य असुविधा क्या है?',
    options: [
      { id: 'digestive', en: 'Digestive Issues (Gas, acidity, bloating)', hi: 'पाचन समस्याएं (गैस, एसिडिटी, भारीपन)' },
      { id: 'joint', en: 'Joint & Body Pain (Stiffness, muscle aches)', hi: 'जोड़ों व शरीर का दर्द (जकड़न, वात शूल)' },
      { id: 'skin', en: 'Skin & Heat Issues (Rashes, inflammation)', hi: 'त्वचा विकार व पित्त प्रकोप (दाने, जलन)' },
      { id: 'fatigue', en: 'Fatigue & Lethargy (Low energy, heaviness)', hi: 'थकान व सुस्ती (ऊर्जा की कमी, कफ भारीपन)' },
      { id: 'sleep', en: 'Sleep & Stress Disturbances', hi: 'नींद न आना व मानसिक तनाव' }
    ]
  },
  agni: {
    title: '3. Agni Pariksha (Digestive Fire & Metabolism)',
    en: 'How is your digestion and appetite pattern (Agni)?',
    hi: 'आपकी पाचन शक्ति और भूख (अग्नि) कैसी है?',
    options: [
      { id: 'regular', en: 'Sama Agni (Balanced, consistent hunger, smooth digestion)', hi: 'सम अग्नि (संतुलित भूख और सुचारू पाचन)' },
      { id: 'intense', en: 'Tikshna Agni (Intense hunger, burning sensation, quick hunger)', hi: 'तीक्ष्ण अग्नि (अत्यधिक भूख, जलन, एसिडिटी)' },
      { id: 'sluggish', en: 'Manda Agni (Slow digestion, heaviness after small meals)', hi: 'मंद अग्नि (धीमी पाचन, थोड़े भोजन से भी भारीपन)' },
      { id: 'irregular', en: 'Visham Agni (Unpredictable, sometimes high, sometimes absent)', hi: 'विषम अग्नि (अनियमित भूख, कभी ज्यादा कभी बिल्कुल नहीं)' }
    ]
  },
  koshtha: {
    title: '4. Koshtha Pariksha (Bowel Nature & Elimination)',
    en: 'How are your regular bowel movements and elimination (Koshtha)?',
    hi: 'आपकी आंतों की गति और पेट साफ होने की स्थिति (कोष्ठ) कैसी है?',
    options: [
      { id: 'regular', en: 'Madhyama Koshtha (Regular, comfortable, 1-2 times daily)', hi: 'मध्यम कोष्ठ (नियमित, सहज, प्रतिदिन 1-2 बार)' },
      { id: 'hard', en: 'Krura Koshtha (Hard, dry stools, constipation tendency)', hi: 'क्रूर कोष्ठ (कब्ज, सूखा मल, कठिनाई)' },
      { id: 'soft', en: 'Mridu Koshtha (Loose, frequent, sensitive to milk/fruits)', hi: 'मृदु कोष्ठ (नरम/ढीला मल, दूध या फल से तुरंत असर)' }
    ]
  },
  ahara_vihara: {
    title: '5. Ahara & Vihara (Dietary Habits & Lifestyle Routine)',
    en: 'How would you describe your daily diet and routine habits?',
    hi: 'आपका दैनिक आहार और दिनचर्या (आहार-विहार) कैसी है?',
    options: [
      { id: 'regular', en: 'Sattvic & Regular (Timely fresh meals, active lifestyle)', hi: 'नियमित व सात्विक (समय पर ताजा भोजन, सक्रिय दिनचर्या)' },
      { id: 'irregular', en: 'Irregular (Untimely eating, sedentary, late nights)', hi: 'अनियमित (बेवक्त खाना, गतिहीन दिनचर्या, देर रात तक जागना)' },
      { id: 'spicy_processed', en: 'Spicy / Processed Diet (Heavy, fried, oily foods)', hi: 'तीखा / तला-भुना आहार (गरिष्ठ, तैलीय भोजन)' }
    ]
  },
  sattva: {
    title: '6. Sattva Pariksha (Mental Resilience & Stress Tolerance)',
    en: 'How do you cope with psychological stress, anxiety, or pain?',
    hi: 'आप मानसिक तनाव, चिंता या दर्द को कैसे सहन करते हैं (सत्व)?',
    options: [
      { id: 'strong', en: 'Pravara Sattva (Calm, highly resilient, patient under stress)', hi: 'प्रवर सत्व (शांत, अत्यंत धैर्यवान और सहनशील)' },
      { id: 'moderate', en: 'Madhyama Sattva (Moderate tolerance, manage with reassurance)', hi: 'मध्यम सत्व (सामान्य सहनशीलता, समझाने पर नियंत्रण)' },
      { id: 'weak', en: 'Avara Sattva (Easily overwhelmed, anxious, low pain tolerance)', hi: 'अवर सत्व (जल्दी घबरा जाने वाले, कम सहनशक्ति)' }
    ]
  }
};

export default function AyushFlow() {
  const navigate = useNavigate();
  const [session] = useState<SessionState | null>(() => {
    const sessionId = localStorage.getItem('patient_session') || localStorage.getItem('session_id');
    const lang = localStorage.getItem('patient_language') || 'en';
    if (!sessionId) return null;
    return { id: sessionId, language: lang };
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { speak, isPlaying } = useAudio();
  const { isListening, transcript, startListening, stopListening } = useAsr();

  const flushOfflineQueue = useCallback(async () => {
    const queue: AyushAssessment[] | undefined = await get(OFFLINE_QUEUE_KEY);
    if (!queue || queue.length === 0) return;

    setIsSyncing(true);
    const remainingQueue: AyushAssessment[] = [];

    for (const assessment of queue) {
      try {
        const res = await fetch(`${API_URL}/ayush-assessment`, {
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

  const currentStepId = steps[currentStepIndex];
  const content = stepContent[currentStepId];

  // ASR Voice recognition matching
  useEffect(() => {
    if (!transcript || !content) return;
    const lower = transcript.toLowerCase();

    // Check if spoken text matches any option label or keyword
    for (const opt of content.options) {
      const optEn = opt.en.toLowerCase();
      const optHi = opt.hi.toLowerCase();
      const optId = opt.id.toLowerCase();

      if (
        lower.includes(optId) ||
        lower.includes(optEn.split(' ')[0]) ||
        lower.includes(optHi.split(' ')[0]) ||
        lower.includes(optEn)
      ) {
        handleAnswer(opt.id);
        break;
      }
    }
  }, [transcript, content]);

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
      const res = await fetch(`${API_URL}/ayush-assessment`, {
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
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
        <MandalaBackground />
        <QuestionCard className="w-full max-w-2xl text-center z-10 p-12 border-terracotta/30">
          <div className="w-16 h-16 bg-terracotta/10 text-terracotta rounded-full flex items-center justify-center mx-auto mb-6">
            <Flower2 className="w-8 h-8" />
          </div>
          <h1 className="font-display text-4xl text-terracotta mb-3">
            {session.language === 'hi' ? 'आयुष मूल्यांकन पूर्ण' : 'AYUSH Assessment Complete'}
          </h1>
          <p className="font-body text-lg text-muted mb-8">
            {session.language === 'hi'
              ? 'आपका 6-आयामी समग्र आयुष मूल्यांकन सफलतापूर्वक दर्ज कर लिया गया है।'
              : 'Your 6-dimension AYUSH holistic assessment has been recorded.'}
          </p>
          <button
            onClick={() => navigate('/records-upload')}
            className="w-full min-h-[58px] text-lg rounded-[12px] bg-terracotta text-white font-body focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 hover:bg-terracotta/90 transition-colors shadow-sm"
          >
            {session.language === 'hi' ? 'दस्तावेज़ अपलोड पर जारी रखें' : 'Continue to Document Upload'}
          </button>
          {isSyncing && (
            <p className="text-terracotta text-sm font-body animate-pulse mt-4">Syncing offline data...</p>
          )}
        </QuestionCard>
      </div>
    );
  }

  const questionText = session.language === 'hi' ? content.hi : content.en;

  return (
    <div className="min-h-screen bg-sand flex flex-col pt-10 p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      <div className="z-10 w-full flex flex-col items-center max-w-3xl mx-auto">
        
        {/* Step Indicator */}
        <div className="w-full flex items-center justify-between mb-4 px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
            AYUSH Dimension {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="text-xs font-medium text-muted">
            {content.title}
          </span>
        </div>

        {/* Question Card */}
        <div className="w-full bg-[#f7f4ed] rounded-[28px] border border-terracotta/30 shadow-xs p-6 sm:p-10 flex flex-col">
          
          {/* Header with Title and Speaker */}
          <div className="flex justify-between items-start mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal leading-tight">
              {questionText}
            </h2>
            <button
              onClick={() => speak(questionText, session.language === 'hi' ? 'hi-IN' : 'en-US')}
              className="w-11 h-11 rounded-full bg-terracotta/10 hover:bg-terracotta/20 text-terracotta flex items-center justify-center transition-colors shrink-0"
              title="Listen to question"
            >
              {isPlaying ? <VolumeX className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mb-6">
            {content.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.id)}
                className="w-full p-4 sm:p-5 text-left rounded-[16px] border-2 border-warmgray bg-white hover:border-terracotta hover:bg-terracotta/5 focus:outline-none focus:ring-2 focus:ring-terracotta transition-all shadow-xs"
              >
                <div className="font-body text-base sm:text-lg font-semibold text-charcoal">
                  {session.language === 'hi' ? opt.hi : opt.en}
                </div>
              </button>
            ))}
          </div>

          {/* Voice ASR Input Bar */}
          <div className="flex flex-col items-center pt-4 border-t border-warmgray/60 w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (isListening ? stopListening() : startListening({ lang: session.language === 'hi' ? 'hi-IN' : 'en-IN' }))}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isListening 
                    ? 'bg-danger text-white animate-pulse scale-110' 
                    : 'bg-terracotta text-white hover:bg-terracotta/90'
                }`}
                title="Speak your answer"
              >
                <Mic className="w-5 h-5" />
              </button>
              <div className="text-left">
                <p className="text-xs font-semibold text-charcoal">{isListening ? 'Listening...' : 'Voice Input (ASR)'}</p>
                <p className="text-xs text-muted">Speak your answer to select</p>
              </div>
            </div>
            {transcript && (
              <p className="mt-2 text-xs font-medium text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                "{transcript}"
              </p>
            )}
          </div>

        </div>
      </div>

      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-terracotta text-white px-4 py-2 rounded-full shadow-lg font-body text-sm animate-pulse z-50">
          Syncing offline data...
        </div>
      )}
    </div>
  );
}
