import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import treeData from '../../data/01_HARDCODED_TREE.json';
import { supabase } from '../../lib/supabase';
import { useAudio } from '../../hooks/useAudio';
import { MandalaBackground } from '../../components/MandalaBackground';
import { API_URL } from '@/lib/api';

export default function FollowUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { speak, isPlaying } = useAudio();

  useEffect(() => {
    const loadQuestions = async () => {
      const complaint = localStorage.getItem('chief_complaint') || 'default';
      const sessionId = localStorage.getItem('patient_session');
      
      if (complaint === 'other') {
        try {
          // Fetch previous answers to give context to Gemini
          const prevRes = await fetch(`${API_URL}/api/answers?session_id=${sessionId}`);
          const prevData = await prevRes.json();
          
          const res = await fetch(`${API_URL}/api/gemini/off-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, previous_answers: prevData.data || [] })
          });
          const data = await res.json();
          setQuestions([data]);
        } catch (err) {
          console.error('Failed to load off-script question, falling back', err);
          setQuestions((treeData as any)['default']);
        }
      } else {
        const activeTree = (treeData as any)[complaint] || (treeData as any)['default'];
        setQuestions(activeTree);
      }
    };
    loadQuestions();
  }, []);

  const handleAnswer = async (answer: string) => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('session_id') || localStorage.getItem('patient_session');
      if (sessionId && questions[currentStep]) {
        // Send to backend so it triggers the red-flag engine
        await fetch(`${API_URL}/api/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            question_id: questions[currentStep].id,
            answer_text: answer
          })
        });

        // Check if red-flag got triggered
        const { data: session } = await supabase
          .from('sessions')
          .select('red_flag, locked')
          .eq('id', sessionId)
          .single();

        if (session && (session.red_flag || session.locked)) {
          navigate('/red-flag-alert');
          return;
        }
      }
      
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
        setTranscript('');
      } else {
        navigate('/upload');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Microphone is not supported in this browser. Please select an option.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = localStorage.getItem('patient_language') === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      
      // Attempt to match with options
      if (q && q.options) {
        const matched = q.options.find((opt: string) => 
          text.toLowerCase().includes(opt.toLowerCase()) || 
          opt.toLowerCase().includes(text.toLowerCase())
        );
        if (matched) {
          handleAnswer(matched);
          return;
        }
      }
      // If not exact match, submit transcript directly
      if (text.trim()) {
        handleAnswer(text.trim());
      }
    };
    
    recognition.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  if (!questions || questions.length === 0) return <div>No questions available.</div>;
  
  const q = questions[currentStep];

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 relative overflow-hidden font-body text-charcoal">
      <MandalaBackground />
      <div className="w-full max-w-3xl z-10 flex flex-col items-center">
        
        {/* Step indicator */}
        <div className="w-full flex items-center justify-between mb-4 px-2">
          <span className="text-sm font-semibold text-muted tracking-wider uppercase">
            Question {currentStep + 1} of {questions.length}
          </span>
          <div className="flex gap-1.5">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 bg-primary'
                    : idx < currentStep
                    ? 'w-4 bg-primary/40'
                    : 'w-2 bg-warmgray/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Question Card matching screenshot */}
        <div className="w-full bg-[#f7f4ed] rounded-[28px] sm:rounded-[32px] border border-[#e7e1d7] shadow-sm p-8 sm:p-10 md:p-12 flex flex-col">
          
          {/* Header with Title and Circular Audio Button */}
          <div className="flex justify-between items-start mb-8 sm:mb-10 w-full gap-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1f2937] leading-tight text-left">
              {q.text}
            </h1>
            <button 
              onClick={() => speak(q.text)}
              className="w-12 h-12 rounded-full bg-[#e3ded6] hover:bg-[#d8d2c8] text-[#4b5563] hover:text-[#1f2937] flex items-center justify-center transition-colors shadow-xs shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30"
              title="Listen to question"
            >
              {isPlaying ? (
                <VolumeX className="w-6 h-6 animate-pulse" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xl font-body text-muted">Saving answer...</p>
            </div>
          ) : (
            <>
              {/* 2-Column Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full mb-8">
                {q.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="w-full min-h-[76px] sm:min-h-[84px] py-5 px-6 rounded-[18px] sm:rounded-[20px] text-lg sm:text-xl font-medium text-[#1f2937] bg-white border border-[#e5e0d8] shadow-xs hover:shadow-md hover:border-[#cbd5e1] hover:bg-[#faf8f5] active:scale-[0.99] transition-all flex items-center justify-center text-center cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30"
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Voice input option */}
              <div className="w-full flex flex-col items-center border-t border-[#e5e0d8] pt-6">
                <p className="text-sm font-medium text-muted mb-3">Or speak your answer:</p>
                <button
                  onClick={startListening}
                  disabled={isListening}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 animate-pulse scale-110'
                      : 'bg-[#8c7355] hover:bg-[#786146]'
                  }`}
                  title="Speak your answer"
                >
                  <Mic className="w-6 h-6" />
                </button>
                {transcript && (
                  <p className="mt-3 text-primary font-semibold italic text-base">
                    "{transcript}"
                  </p>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
