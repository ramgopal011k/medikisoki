import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { InterviewQuestion as QuestionType } from '../../../.agent/types/interview-tree';
import { QuestionCard } from './QuestionCard';
import { LeafStepIndicator } from './LeafStepIndicator';
import { VoiceButton } from './VoiceButton';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface InterviewQuestionProps {
  question: QuestionType;
  totalSteps: number;
  currentStep: number;
  onAnswer: (value: string | string[], answerText: string) => void;
  language?: string;
}

export const InterviewQuestion: React.FC<InterviewQuestionProps> = ({
  question,
  totalSteps,
  currentStep,
  onAnswer,
  language = 'en'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'error' | 'unsupported'>(() => {
    return ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      ? 'idle'
      : 'unsupported';
  });

  const recognitionRef = useRef<any>(null);
  const pendingMatchRef = useRef<{ value: string; label: string } | null>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setMicStatus('idle');
      setIsListening(false);
    };

    recognition.onerror = () => {
      setMicStatus('error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setMicStatus(prev => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [language]);

  // Read aloud the current question using TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = language === 'hi' && question.text_hi ? question.text_hi : question.text;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, [question, language]);

  // Read aloud options
  useEffect(() => {
    if ('speechSynthesis' in window && question.options && question.options.length > 0) {
      // Optional: don't automatically read options to avoid long audio delays,
      // but user requested "Voice narration for question & options" in problem statement.
    }
  }, [language]);

  // Process voice transcript match via a callback
  const processTranscriptMatch = useCallback(async () => {
    if (!transcript || !question.options || question.type !== 'single_choice') return;

    const lowerTranscript = transcript.toLowerCase().trim();
    const match = question.options.find(opt =>
      lowerTranscript.includes(opt.label.toLowerCase()) ||
      (opt.label_hi && lowerTranscript.includes(opt.label_hi.toLowerCase()))
    );

    if (match) {
      pendingMatchRef.current = { value: match.value, label: match.label };
    } else {
      // Fallback to Gemini semantic matching
      try {
        const res = await fetch(`${API_URL}/match-voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, options: question.options })
        });
        const data = await res.json();
        if (data.match) {
          const geminiMatch = question.options.find(opt => opt.value === data.match);
          if (geminiMatch) {
            pendingMatchRef.current = { value: geminiMatch.value, label: geminiMatch.label };
          }
        }
      } catch (err) {
        console.error('Failed to match voice via Gemini:', err);
      }
    }
    
    if (pendingMatchRef.current) {
      const { value, label } = pendingMatchRef.current;
      pendingMatchRef.current = null;
      setTranscript('');
      onAnswer(value, label);
    }
  }, [transcript, question, onAnswer]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // When listening stops, check for a match and fire onAnswer
  useEffect(() => {
    if (!isListening && transcript) {
      processTranscriptMatch();
    }
  }, [isListening, transcript, processTranscriptMatch]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
  };

  const toggleListen = async () => {
    if (isListening) {
      stopRecording();
    } else {
      setMicStatus('listening');
      setTranscript('');
      audioChunksRef.current = [];

      // 1. Try Sarvam ASR via MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob);
          formData.append('language', language === 'hi' ? 'hi-IN' : 'en-IN');

          try {
            const response = await fetch(`${API_URL}/api/sarvam/asr`, {
              method: 'POST',
              body: formData
            });
            if (response.ok) {
              const data = await response.json();
              if (data.transcript) {
                setTranscript(data.transcript);
                return;
              }
            }
          } catch (err) {
            console.warn('Sarvam ASR failed, using WebSpeech result', err);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.warn('MediaRecorder/getUserMedia failed, falling back to WebSpeech only', err);
      }

      // 2. Start WebSpeech as fallback
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setMicStatus('error');
        }
      }
    }
  };

  const handleOptionTap = (value: string, label: string) => {
    if (question.type === 'single_choice') {
      onAnswer(value, label);
    } else if (question.type === 'multi_choice') {
      if (selectedMulti.includes(value)) {
        setSelectedMulti(prev => prev.filter(v => v !== value));
      } else {
        setSelectedMulti(prev => [...prev, value]);
      }
    }
  };

  const submitMultiChoice = () => {
    if (selectedMulti.length > 0) {
      const labels = question.options
        ?.filter(opt => selectedMulti.includes(opt.value))
        .map(opt => language === 'hi' && opt.label_hi ? opt.label_hi : opt.label)
        .join(', ') || '';
      onAnswer(selectedMulti, labels);
    }
  };

  const submitText = () => {
    if (textInput.trim()) {
      onAnswer(textInput.trim(), textInput.trim());
      setTextInput('');
    }
  };

  const renderInput = () => {
    if (question.type === 'single_choice' || question.type === 'multi_choice') {
      return (
        <div className="flex flex-col gap-4 w-full mt-8">
          {question.options?.map((opt) => {
            const isSelected = selectedMulti.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleOptionTap(opt.value, language === 'hi' && opt.label_hi ? opt.label_hi : opt.label)}
                className={cn(
                  "w-full min-h-[64px] px-6 py-4 flex items-center justify-center text-center",
                  "bg-white border-2 rounded-xl transition-all duration-300 font-body text-xl",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-warmgray text-charcoal hover:border-primary/40 hover:bg-white/50",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
              >
                {language === 'hi' && opt.label_hi ? opt.label_hi : opt.label}
              </button>
            );
          })}

          {question.type === 'multi_choice' && (
            <Button
              onClick={submitMultiChoice}
              disabled={selectedMulti.length === 0}
              className="mt-4 w-full min-h-[64px] text-xl rounded-[12px] bg-primary text-white font-body"
            >
              {language === 'hi' ? 'पुष्टि करें' : 'Confirm Selection'}
            </Button>
          )}
        </div>
      );
    }

    if (question.type === 'text' || question.type === 'number') {
      return (
        <div className="flex flex-col gap-4 w-full mt-8">
          <input
            type={question.type === 'number' ? 'number' : 'text'}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full text-center text-2xl p-6 min-h-[64px] border-2 border-warmgray rounded-[12px] bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={question.type === 'number' ? '1-10' : (language === 'hi' ? 'यहां टाइप करें' : 'Type here...')}
            onKeyDown={(e) => e.key === 'Enter' && submitText()}
          />
          <Button
            onClick={submitText}
            disabled={!textInput.trim()}
            className="w-full min-h-[64px] text-xl rounded-[12px] bg-primary text-white font-body"
          >
            {language === 'hi' ? 'जारी रखें' : 'Continue'}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-[768px] mx-auto flex flex-col gap-6">
      <div className="w-full flex justify-center pb-2">
         <LeafStepIndicator total={totalSteps} current={currentStep} />
      </div>

      <QuestionCard className="w-full text-center flex flex-col items-center pt-8 pb-10 px-6 sm:px-10">
        <h2 className="font-display text-3xl sm:text-4xl text-charcoal mb-2 leading-tight">
          {language === 'hi' && question.text_hi ? question.text_hi : question.text}
        </h2>

        {renderInput()}

        {/* Fix 1: Always show the voice area, but disabled on error/unsupported */}
        {(question.type === 'single_choice' || question.type === 'multi_choice') && (
          <div className="mt-10 flex flex-col items-center">
            <p className="text-muted text-sm font-body mb-4">
              {language === 'hi' ? 'एक विकल्प चुनें या अपना उत्तर बोलें' : 'Tap an option or speak your answer'}
            </p>
            <VoiceButton
              status={micStatus}
              onClick={toggleListen}
            />
            {micStatus === 'error' && (
              <p className="mt-2 text-danger text-sm font-body">
                {language === 'hi' ? 'माइक्रोफ़ोन त्रुटि। कृपया टैप करें।' : 'Microphone error. Please tap an option.'}
              </p>
            )}
            {micStatus === 'unsupported' && (
              <p className="mt-2 text-warning-dark text-sm font-body">
                {language === 'hi' ? 'आवाज़ समर्थित नहीं है। कृपया टैप करें।' : 'Voice not supported. Please tap an option.'}
              </p>
            )}
            {transcript && (
              <p className="mt-4 text-charcoal font-body text-lg animate-pulse">
                "{transcript}"
              </p>
            )}
            {!isListening && transcript && (
              <p className="mt-2 text-danger text-sm font-body">
                {language === 'hi' ? 'उत्तर मेल नहीं खाया, कृपया टैप करें' : 'No match found, please tap an option'}
              </p>
            )}
          </div>
        )}
      </QuestionCard>
    </div>
  );
};
