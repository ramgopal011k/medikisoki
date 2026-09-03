import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

import { HeartPulse, Thermometer, Brain, Activity, Wind, CircleHelp, MapPin, Building2, Flower2 } from 'lucide-react';
import { MandalaBackground } from '../components/MandalaBackground';
import { LeafStepIndicator } from '../components/LeafStepIndicator';
import { AudioExplanationButton } from '../components/AudioExplanationButton';
import { QuestionCard } from '../components/QuestionCard';

type Step = 'language' | 'hospital' | 'identity' | 'consent' | 'complaint' | 'success';

export default function ConsentFlow() {
  const [step, setStep] = useState<Step>('language');
  const [language, setLanguage] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [complaint, setComplaint] = useState('');
  const [ayushMode, setAyushMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    fetch('http://localhost:3001/hospitals')
      .then(res => res.json())
      .then(data => {
        setHospitals(data.data || []);
        setStep('hospital');
      })
      .catch(console.error);
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
    try {
      const res = await fetch('http://localhost:3001/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          patient_name: 'Dummy Patient',
          dummy_aadhaar: aadhaar,
          language: language,
          chief_complaint: complaint
        })
      });
      const data = await res.json();
      if (data.data?.session_token) {
        localStorage.setItem('patient_session', data.data.session_token);
        localStorage.setItem('patient_complaint', complaint);
        localStorage.setItem('patient_language', language);
        localStorage.setItem('ayush_mode', ayushMode.toString());
        setStep('success');
        setTimeout(() => navigate('/interview'), 2000);
      } else {
        alert(data.error || 'Failed to start session');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      
      <div className="w-full max-w-[768px] z-10 flex flex-col gap-8">
        
        {step !== 'language' && (
           <div className="w-full flex justify-center pb-4">
              <LeafStepIndicator total={4} current={['language', 'hospital', 'identity', 'consent', 'complaint'].indexOf(step) - 1} />
           </div>
        )}

      {step === 'language' && (
        <div className="w-full text-center flex flex-col items-center">
          <QuestionCard className="w-full max-w-2xl py-12 flex flex-col items-center">
            <div className="mb-4">
              <h1 className="font-display text-4xl lg:text-5xl text-charcoal mb-2">Choose your language</h1>
              <h2 className="font-hindi text-3xl lg:text-4xl text-muted">अपनी भाषा चुनें</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12 w-full px-8">
              <Button className="w-full sm:w-64 h-[80px] rounded-[12px] text-2xl font-body bg-primary focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" onClick={() => handleLanguageSelect('en')}>English</Button>
              <Button className="w-full sm:w-64 h-[80px] rounded-[12px] text-3xl font-hindi bg-white text-charcoal border-2 border-warmgray focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" onClick={() => handleLanguageSelect('hi')}>हिंदी</Button>
            </div>
          </QuestionCard>
          <div className="mt-8">
             <p className="text-muted font-body text-[16px]">Need help? Please ask the front desk staff.</p>
          </div>
        </div>
      )}

      {step === 'hospital' && (
        <div className="w-full text-center flex flex-col items-center">
           <div className="mb-8">
             <h1 className="font-display text-3xl text-charcoal">Where are you today?</h1>
           </div>
          <div className="w-full max-w-2xl flex flex-col gap-4">
            {hospitals.map(h => {
              const isAyush = h.hospital_type.toLowerCase().includes('ayush') || h.hospital_type.toLowerCase().includes('ayurvedic');
              return (
                <button 
                  key={h.hospital_id} 
                  className={`w-full min-h-[80px] p-4 flex items-center justify-between bg-sand rounded-[16px] border-2 transition-all duration-300 shadow-sm hover:shadow-md ${isAyush ? 'border-terracotta hover:bg-terracotta/5' : 'border-warmgray hover:border-primary/30'}`}
                  onClick={() => handleHospitalSelect(h.hospital_id)}
                >
                  <div className="flex items-center gap-4 text-left">
                     <div className={`p-3 rounded-full ${isAyush ? 'bg-terracotta/10 text-terracotta' : 'bg-primary/10 text-primary'}`}>
                        <Building2 className="w-6 h-6" />
                     </div>
                     <div>
                       <div className="font-body text-xl font-semibold text-charcoal">{h.hospital_name}</div>
                       <div className="flex items-center gap-1 text-muted text-base mt-1">
                          <MapPin className="w-4 h-4" /> {h.location}
                       </div>
                     </div>
                  </div>
                  {isAyush && (
                    <span className="text-sm font-body font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">AYUSH</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'identity' && (
        <QuestionCard className="w-full max-w-2xl mx-auto text-center">
          <div className="mb-6">
             <h1 className="font-display text-3xl text-charcoal mb-2">
                {language === 'hi' ? 'अपना आधार दर्ज करें' : 'Enter your Aadhaar'}
             </h1>
          </div>
          <div className="space-y-6 mt-8">
            <input 
              type="text" 
              placeholder="1234 5678 9012"
              className="w-full text-center text-3xl tracking-[0.2em] p-6 min-h-[64px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2 font-body"
              value={aadhaar}
              onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
            />
            <Button 
              className="w-full min-h-[64px] text-xl rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body" 
              disabled={aadhaar.length < 12}
              onClick={() => setStep('consent')}
            >
              {language === 'hi' ? 'जारी रखें' : 'Continue'}
            </Button>
          </div>
        </QuestionCard>
      )}

      {step === 'consent' && (
        <QuestionCard className="w-full max-w-2xl mx-auto flex flex-col items-center">
           <AudioExplanationButton 
             onClick={playAudioConsent} 
             isSpeaking={isPlaying} 
             className="mb-8"
           />
           
           <div className="w-full space-y-6">
              <div className="flex items-start gap-4 p-4 border-b border-warmgray">
                 <input type="checkbox" className="w-7 h-7 mt-1 accent-primary border-warmgray rounded flex-shrink-0" defaultChecked />
                 <div className="text-left">
                   <div className="font-body text-lg font-semibold text-charcoal">
                     {language === 'hi' ? 'मैं अपनी जानकारी साझा करने के लिए सहमत हूँ' : 'I agree to share my information'}
                   </div>
                   <div className="text-muted text-base mt-1 font-body">
                     {language === 'hi' ? 'आपके डेटा का उपयोग केवल आपके इलाज के लिए किया जाएगा।' : 'Your data will only be used for your treatment.'}
                   </div>
                 </div>
              </div>
              <div className="flex items-start gap-4 p-4">
                 <input type="checkbox" className="w-7 h-7 mt-1 accent-primary border-warmgray rounded flex-shrink-0" defaultChecked />
                 <div className="text-left">
                   <div className="font-body text-lg font-semibold text-charcoal">
                     {language === 'hi' ? 'आवाज़ रिकॉर्डिंग' : 'Voice Recording'}
                   </div>
                   <div className="text-muted text-base mt-1 font-body">
                     {language === 'hi' ? 'हम बातचीत रिकॉर्ड करेंगे।' : 'We will record conversation.'}
                   </div>
                 </div>
              </div>
           </div>
           
           <Button 
             className="w-full min-h-[64px] text-xl rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body mt-8" 
             onClick={() => {
                window.speechSynthesis.cancel();
                setStep('complaint');
             }}
           >
             {language === 'hi' ? 'मैं समझता/समझती हूँ और सहमत हूँ' : 'I understand and agree'}
           </Button>
        </QuestionCard>
      )}

      {step === 'complaint' && (
        <div className="w-full max-w-[900px] text-center">
           <div className="mb-8">
             <h1 className="font-display text-3xl lg:text-4xl text-charcoal mb-2">
               {language === 'hi' ? 'आज आपको क्या परेशानी है?' : 'What brings you here today?'}
             </h1>
           </div>
          
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mt-8">
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
                  className={`min-h-[100px] flex flex-col items-center justify-center p-6 bg-sand rounded-[16px] border-2 transition-all duration-300 ${complaint === c.en ? 'border-primary bg-primary/5 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2' : 'border-warmgray hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2'}`}
                >
                  <div className={`w-[72px] h-[72px] flex items-center justify-center rounded-full mb-4 ${c.bg} ${c.color}`}>
                    <c.icon className="w-8 h-8" />
                  </div>
                  <span className="font-body font-semibold text-charcoal text-lg">{language === 'hi' ? c.hi : c.en}</span>
                </button>
              ))}
           </div>
           
           <div className="mt-8 max-w-sm mx-auto">
             <button
                onClick={() => setAyushMode(!ayushMode)}
                className={`w-full p-4 rounded-[12px] border-2 flex items-center justify-between transition-all duration-300 ${ayushMode ? 'bg-terracotta/10 border-terracotta text-terracotta' : 'bg-sand border-warmgray text-muted hover:border-terracotta/50'}`}
             >
                <div className="flex items-center gap-3">
                   <Flower2 className={`w-6 h-6 ${ayushMode ? 'text-terracotta' : 'text-muted'}`} />
                   <div className="text-left">
                     <div className={`font-body font-semibold text-lg ${ayushMode ? 'text-terracotta' : 'text-charcoal'}`}>
                       {language === 'hi' ? 'आयुष मोड' : 'AYUSH Assessment'}
                     </div>
                     <div className="text-sm font-body opacity-80">
                        {language === 'hi' ? 'पारंपरिक चिकित्सा मूल्यांकन' : 'Traditional medicine evaluation'}
                     </div>
                   </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ayushMode ? 'border-terracotta bg-terracotta' : 'border-warmgray'}`}>
                   {ayushMode && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                </div>
             </button>
           </div>
           
           <div className="mt-8 flex justify-center">
             <Button 
               className="w-full max-w-sm min-h-[64px] text-xl rounded-[12px] bg-primary hover:bg-primary/90 text-white font-body focus:outline-none focus:ring-2 focus:ring-warmgray focus:ring-offset-2" 
               disabled={!complaint}
               onClick={startSession}
             >
               {language === 'hi' ? 'शुरू करें' : 'Start'}
             </Button>
           </div>
        </div>
      )}

      {step === 'success' && (
        <div className="w-full text-center flex flex-col items-center">
          <QuestionCard className="w-full max-w-2xl py-12 flex flex-col items-center">
            <div className="mb-8 p-4 bg-success/10 text-success rounded-full">
               <HeartPulse className="w-16 h-16" />
            </div>
            <h1 className="font-display text-4xl lg:text-5xl text-charcoal mb-4">
               {language === 'hi' ? 'तैयार!' : 'Ready!'}
            </h1>
            <p className="font-body text-xl text-muted">
               {language === 'hi' ? 'आपका साक्षात्कार जल्द ही शुरू होगा...' : 'Your clinical interview will begin shortly...'}
            </p>
          </QuestionCard>
        </div>
      )}

      </div>
    </div>
  );
}
