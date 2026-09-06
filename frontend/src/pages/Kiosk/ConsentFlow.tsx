import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { HeartPulse, Thermometer, Brain, Activity, Wind, CircleHelp, MapPin, Building2, Flower2, Mic, Check } from 'lucide-react';
import { MandalaBackground } from '../../components/MandalaBackground';
import { LeafStepIndicator } from '../../components/LeafStepIndicator';
import { AudioExplanationButton } from '../../components/AudioExplanationButton';
import { QuestionCard } from '../../components/QuestionCard';
import { useAsr } from '@/hooks/useAsr';
import { API_URL } from '@/lib/api';

type Step = 'language' | 'hospital' | 'identity' | 'consent' | 'complaint' | 'success';

export default function ConsentFlow() {
  const { hospitalId: urlHospitalId } = useParams();
  const [step, setStep] = useState<Step>('language');
  const [language, setLanguage] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalId, setHospitalId] = useState(urlHospitalId || '');
  const [abhaId, setAbhaId] = useState('');
  const [complaint, setComplaint] = useState('Chest pain');
  const [ayushMode, setAyushMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  const { isListening, transcript, startListening, stopListening } = useAsr();

  useEffect(() => {
    localStorage.removeItem('patient_session');
    localStorage.removeItem('session_id');
    localStorage.removeItem('chief_complaint');
  }, []);

  // Process ASR voice input based on current step
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();

    if (step === 'language') {
      if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('hind')) {
        handleLanguageSelect('hi');
      } else if (lower.includes('english') || lower.includes('अंग्रेजी') || lower.includes('eng')) {
        handleLanguageSelect('en');
      }
    } else if (step === 'hospital') {
      if (hospitals.length > 0) {
        // match hospital name or first hospital
        const match = hospitals.find(h => lower.includes(h.hospital_name.toLowerCase()) || lower.includes(h.location.toLowerCase()));
        if (match) {
          handleHospitalSelect(match.hospital_id);
        } else if (lower.includes('one') || lower.includes('first') || lower.includes('पहला')) {
          handleHospitalSelect(hospitals[0].hospital_id);
        }
      }
    } else if (step === 'identity') {
      // Extract digits from spoken text
      const digits = transcript.replace(/\D/g, '');
      if (digits.length > 0) {
        setAbhaId(prev => (prev + digits).slice(0, 14));
      }
    } else if (step === 'consent') {
      if (lower.includes('agree') || lower.includes('yes') || lower.includes('हाँ') || lower.includes('सहमत') || lower.includes('ok') || lower.includes('continue')) {
        window.speechSynthesis?.cancel();
        setStep('complaint');
      }
    } else if (step === 'complaint') {
      if (lower.includes('chest') || lower.includes('छाती')) setComplaint('Chest pain');
      else if (lower.includes('fever') || lower.includes('बुखार')) setComplaint('Fever');
      else if (lower.includes('stomach') || lower.includes('abdomen') || lower.includes('abdominal') || lower.includes('पेट')) setComplaint('Abdominal pain');
      else if (lower.includes('head') || lower.includes('headache') || lower.includes('सिर')) setComplaint('Headache');
      else if (lower.includes('back') || lower.includes('पीठ')) setComplaint('Back pain');
      else if (lower.includes('cough') || lower.includes('खांसी')) setComplaint('Cough');
      else if (lower.includes('other') || lower.includes('अन्य')) setComplaint('Other');
    }
  }, [transcript, step, hospitals]);

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('patient_language', lang);
    if (urlHospitalId) {
      // If we already have a hospital ID from the URL, skip the hospital selection step
      setStep('identity');
    } else {
      fetch(`${API_URL}/api/hospitals`)
        .then(res => res.json())
        .then(data => {
          setHospitals(data.data || []);
          setStep('hospital');
        })
        .catch(console.error);
    }
  };

  const handleHospitalSelect = (hId: string) => {
    setHospitalId(hId);
    setStep('identity');
  };

  const playAudioConsent = () => {
    const text = language === 'hi' 
      ? 'क्या आप अपना डेटा साझा करने के लिए सहमत हैं?' 
      : 'Do you consent to share your data for clinical assessment?';
    
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startSession = async () => {
    setIsStarting(true);
    const validHospitalId = hospitalId || '11111111-1111-1111-1111-111111111111';
    const validComplaint = complaint || 'Chest pain';
    const validLang = language || 'en';
    const validAbha = abhaId || '00000000000000';

    const complaintMap: Record<string, string> = {
      'Chest pain': 'chest_pain',
      'Fever': 'fever',
      'Abdominal pain': 'stomach_ache',
      'Headache': 'headache',
      'Back pain': 'back_pain',
      'Cough': 'cough',
      'Other': 'other'
    };
    const chiefKey = complaintMap[validComplaint] || validComplaint.toLowerCase().replace(/\s+/g, '_');

    try {
      const res = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: validHospitalId,
          patient_name: validAbha !== '00000000000000' ? `Patient ••${validAbha.slice(-4)}` : 'Patient',
          dummy_aadhaar: validAbha,
          language: validLang,
          chief_complaint: validComplaint
        })
      });
      const data = await res.json();
      const sessionToken = data.data?.session_token || data.data?.id || crypto.randomUUID();

      localStorage.setItem('patient_session', sessionToken);
      localStorage.setItem('session_id', sessionToken);
      localStorage.setItem('patient_complaint', validComplaint);
      localStorage.setItem('chief_complaint', chiefKey);
      localStorage.setItem('patient_language', validLang);
      localStorage.setItem('ayush_mode', ayushMode.toString());
      
      setStep('success');
      setTimeout(() => {
        if (ayushMode) {
          navigate('/ayush-assessment');
        } else {
          navigate('/interview');
        }
      }, 400);
    } catch (err) {
      console.warn('Network issue starting session, using local session:', err);
      const fallbackToken = crypto.randomUUID();
      localStorage.setItem('patient_session', fallbackToken);
      localStorage.setItem('session_id', fallbackToken);
      localStorage.setItem('patient_complaint', validComplaint);
      localStorage.setItem('chief_complaint', chiefKey);
      localStorage.setItem('patient_language', validLang);
      localStorage.setItem('ayush_mode', ayushMode.toString());
      
      setStep('success');
      setTimeout(() => {
        if (ayushMode) {
          navigate('/ayush-assessment');
        } else {
          navigate('/interview');
        }
      }, 400);
    } finally {
      setIsStarting(false);
    }
  };

  // Reusable Voice ASR Bar Component for each slide
  const VoiceActionBar = ({ hint }: { hint: string }) => (
    <div className="flex flex-col items-center mt-6 pt-4 border-t border-warmgray/60 w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (isListening ? stopListening() : startListening({ lang: language === 'hi' ? 'hi-IN' : 'en-IN' }))}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            isListening 
              ? 'bg-danger text-white animate-pulse scale-110' 
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
          title="Speak your response"
        >
          <Mic className="w-5 h-5" />
        </button>
        <div className="text-left">
          <p className="text-xs font-semibold text-charcoal">{isListening ? 'Listening...' : 'Voice Input (ASR)'}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      {transcript && (
        <p className="mt-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          "{transcript}"
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      
      <div className="w-full max-w-[768px] z-10 flex flex-col gap-6">
        
        {step !== 'language' && step !== 'success' && (
           <div className="w-full flex justify-center pb-2">
              <LeafStepIndicator total={4} current={['language', 'hospital', 'identity', 'consent', 'complaint'].indexOf(step) - 1} />
           </div>
        )}

      {step === 'language' && (
        <div className="w-full text-center flex flex-col items-center">
          <QuestionCard className="w-full max-w-2xl py-10 flex flex-col items-center">
            <div className="mb-2">
              <h1 className="font-display text-4xl lg:text-5xl text-charcoal mb-2">Choose your language</h1>
              <h2 className="font-hindi text-3xl lg:text-4xl text-muted">अपनी भाषा चुनें</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-8 w-full px-8">
              <Button className="w-full sm:w-64 h-[72px] rounded-[12px] text-2xl font-body bg-primary hover:bg-primary/90 text-white focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" onClick={() => handleLanguageSelect('en')}>English</Button>
              <Button className="w-full sm:w-64 h-[72px] rounded-[12px] text-3xl font-hindi bg-white text-charcoal border-2 border-warmgray hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" onClick={() => handleLanguageSelect('hi')}>हिंदी</Button>
            </div>
            <VoiceActionBar hint='Say "English" or "Hindi"' />
          </QuestionCard>
          <div className="mt-4">
             <p className="text-muted font-body text-sm">Need help? Please ask the front desk staff.</p>
          </div>
        </div>
      )}

      {step === 'hospital' && (
        <div className="w-full text-center flex flex-col items-center">
           <div className="mb-6">
             <h1 className="font-display text-3xl text-charcoal">Where are you today?</h1>
           </div>
          <div className="w-full max-w-2xl flex flex-col gap-4">
            {hospitals.map(h => {
              const isAyush = h.hospital_type.toLowerCase().includes('ayush') || h.hospital_type.toLowerCase().includes('ayurvedic');
              return (
                <button 
                  key={h.hospital_id} 
                  className={`w-full min-h-[76px] p-4 flex items-center justify-between bg-white rounded-[16px] border-2 transition-all duration-300 shadow-xs hover:shadow-md ${isAyush ? 'border-terracotta hover:bg-terracotta/5' : 'border-warmgray hover:border-primary/30'}`}
                  onClick={() => handleHospitalSelect(h.hospital_id)}
                >
                  <div className="flex items-center gap-4 text-left">
                     <div className={`p-3 rounded-full ${isAyush ? 'bg-terracotta/10 text-terracotta' : 'bg-primary/10 text-primary'}`}>
                        <Building2 className="w-6 h-6" />
                     </div>
                     <div>
                       <div className="font-body text-lg font-semibold text-charcoal">{h.hospital_name}</div>
                       <div className="flex items-center gap-1 text-muted text-sm mt-0.5">
                          <MapPin className="w-3.5 h-3.5" /> {h.location}
                       </div>
                     </div>
                  </div>
                  {isAyush && (
                    <span className="text-xs font-body font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">AYUSH</span>
                  )}
                </button>
              );
            })}
            <VoiceActionBar hint='Say hospital name or "First hospital"' />
          </div>
        </div>
      )}

      {step === 'identity' && (
        <QuestionCard className="w-full max-w-2xl mx-auto text-center">
          <div className="mb-4">
             <h1 className="font-display text-3xl text-charcoal mb-1">
                {language === 'hi' ? 'अपना आभा (ABHA) आईडी दर्ज करें' : 'Enter your ABHA ID'}
             </h1>
             <p className="text-sm text-muted">14-digit Ayushman Bharat Health Account</p>
          </div>
          <div className="space-y-4 mt-6">
            <input 
              type="text" 
              placeholder="91 1234 5678 9012"
              className="w-full text-center text-3xl tracking-[0.2em] p-5 min-h-[64px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary font-body"
              value={abhaId}
              onChange={e => setAbhaId(e.target.value.replace(/\D/g, '').slice(0, 14))}
            />
            <Button 
              className="w-full min-h-[58px] text-lg rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body" 
              disabled={abhaId.length < 14}
              onClick={() => setStep('consent')}
            >
              {language === 'hi' ? 'जारी रखें' : 'Continue'}
            </Button>
            <VoiceActionBar hint='Speak 14 digits or say your ABHA ID' />
          </div>
        </QuestionCard>
      )}

      {step === 'consent' && (
        <QuestionCard className="w-full max-w-2xl mx-auto flex flex-col items-center">
           <AudioExplanationButton 
             onClick={playAudioConsent} 
             isSpeaking={isPlaying} 
             className="mb-6"
           />
           
           <div className="w-full space-y-4">
              <div className="flex items-start gap-4 p-4 border-b border-warmgray bg-white rounded-xl border">
                 <input type="checkbox" className="w-6 h-6 mt-1 accent-primary border-warmgray rounded shrink-0" defaultChecked />
                 <div className="text-left">
                   <div className="font-body text-base font-semibold text-charcoal">
                     {language === 'hi' ? 'मैं अपनी जानकारी साझा करने के लिए सहमत हूँ' : 'I agree to share my information'}
                   </div>
                   <div className="text-muted text-sm mt-0.5 font-body">
                     {language === 'hi' ? 'आपके डेटा का उपयोग केवल आपके इलाज के लिए किया जाएगा।' : 'Your data will only be used for your treatment.'}
                   </div>
                 </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-warmgray">
                 <input type="checkbox" className="w-6 h-6 mt-1 accent-primary border-warmgray rounded shrink-0" defaultChecked />
                 <div className="text-left">
                   <div className="font-body text-base font-semibold text-charcoal">
                     {language === 'hi' ? 'आवाज़ रिकॉर्डिंग' : 'Voice Recording'}
                   </div>
                   <div className="text-muted text-sm mt-0.5 font-body">
                     {language === 'hi' ? 'हम बातचीत रिकॉर्ड करेंगे।' : 'We will record conversation.'}
                   </div>
                 </div>
              </div>
           </div>
           
           <Button 
             className="w-full min-h-[58px] text-lg rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body mt-6" 
             onClick={() => {
                window.speechSynthesis.cancel();
                setStep('complaint');
             }}
           >
             {language === 'hi' ? 'मैं समझता/समझती हूँ और सहमत हूँ' : 'I understand and agree'}
           </Button>
           <VoiceActionBar hint='Say "I agree" or "हाँ / सहमत हूँ"' />
        </QuestionCard>
      )}

      {step === 'complaint' && (
        <div className="w-full max-w-[850px] text-center">
           <div className="mb-6">
             <h1 className="font-display text-3xl lg:text-4xl text-charcoal mb-1">
               {language === 'hi' ? 'आज आपको क्या परेशानी है?' : 'What brings you here today?'}
             </h1>
           </div>
          
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 lg:gap-4 mt-6">
              {[
                { id: 'chest_pain', en: 'Chest pain', hi: 'छाती में दर्द', icon: HeartPulse, color: 'text-danger', bg: 'bg-danger/10' },
                { id: 'fever', en: 'Fever', hi: 'बुखार', icon: Thermometer, color: 'text-turmeric', bg: 'bg-turmeric/10' },
                { id: 'abdominal_pain', en: 'Abdominal pain', hi: 'पेट में दर्द', icon: Activity, color: 'text-muted', bg: 'bg-muted/10' },
                { id: 'headache', en: 'Headache', hi: 'सिरदर्द', icon: Brain, color: 'text-lavender', bg: 'bg-lavender/10' },
                { id: 'back_pain', en: 'Back pain', hi: 'पीठ में दर्द', icon: Activity, color: 'text-terracotta', bg: 'bg-terracotta/10' },
                { id: 'cough', en: 'Cough', hi: 'खांसी', icon: Wind, color: 'text-success', bg: 'bg-success/10' },
                { id: 'other', en: 'Other', hi: 'अन्य', icon: CircleHelp, color: 'text-charcoal', bg: 'bg-charcoal/10' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setComplaint(c.en)}
                  className={`min-h-[90px] flex flex-col items-center justify-center p-4 bg-white rounded-[16px] border-2 transition-all duration-300 ${complaint === c.en ? 'border-primary bg-primary/5 shadow-sm' : 'border-warmgray hover:border-primary/40'}`}
                >
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 ${c.bg} ${c.color}`}>
                    <c.icon className="w-6 h-6" />
                  </div>
                  <span className="font-body font-semibold text-charcoal text-base">{language === 'hi' ? c.hi : c.en}</span>
                </button>
              ))}
           </div>
           
           <div className="mt-6 max-w-sm mx-auto">
             <button
                onClick={() => setAyushMode(!ayushMode)}
                className={`w-full p-3.5 rounded-[12px] border-2 flex items-center justify-between transition-all duration-300 ${ayushMode ? 'bg-terracotta/10 border-terracotta text-terracotta' : 'bg-white border-warmgray text-muted hover:border-terracotta/50'}`}
             >
                <div className="flex items-center gap-3">
                   <Flower2 className={`w-5 h-5 ${ayushMode ? 'text-terracotta' : 'text-muted'}`} />
                   <div className="text-left">
                     <div className={`font-body font-semibold text-base ${ayushMode ? 'text-terracotta' : 'text-charcoal'}`}>
                       {language === 'hi' ? 'आयुष मोड' : 'AYUSH Assessment'}
                     </div>
                     <div className="text-xs font-body opacity-80">
                        {language === 'hi' ? 'पारंपरिक चिकित्सा मूल्यांकन' : 'Traditional medicine evaluation'}
                     </div>
                   </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${ayushMode ? 'border-terracotta bg-terracotta' : 'border-warmgray'}`}>
                   {ayushMode && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
             </button>
           </div>
           
           <div className="mt-6 flex justify-center">
              <Button 
                className="w-full max-w-sm min-h-[58px] text-lg rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2 disabled:opacity-50" 
                disabled={isStarting}
                onClick={startSession}
              >
                {isStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'hi' ? 'शुरू हो रहा है...' : 'Starting...'}
                  </span>
                ) : (
                  language === 'hi' ? 'शुरू करें' : 'Start'
                )}
              </Button>
            </div>

            <VoiceActionBar hint='Say "Chest pain", "Fever", "Cough", or "Headache"' />
        </div>
      )}

      {step === 'success' && (
        <div className="w-full text-center flex flex-col items-center">
          <QuestionCard className="w-full max-w-2xl py-12 flex flex-col items-center">
            <div className="mb-6 p-4 bg-success/10 text-success rounded-full">
               <HeartPulse className="w-14 h-14" />
            </div>
            <h1 className="font-display text-4xl text-charcoal mb-2">
               {language === 'hi' ? 'तैयार!' : 'Ready!'}
            </h1>
            <p className="font-body text-lg text-muted">
               {language === 'hi' ? 'आपका साक्षात्कार जल्द ही शुरू होगा...' : 'Your clinical interview will begin shortly...'}
            </p>
          </QuestionCard>
        </div>
      )}

      </div>
    </div>
  );
}
