import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { InterviewQuestion as QuestionType } from '../../../.agent/types/interview-tree';
import { QuestionCard } from './QuestionCard';
import { LeafStepIndicator } from './LeafStepIndicator';
import { VoiceButton } from './VoiceButton';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
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
  const [micDenied, setMicDenied] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  // Fix 1: Track voice availability via state, not ref access during render.
  // Initialize lazily to avoid setState in the effect.
  const [voiceAvailable] = useState(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Fix 2: Use a ref to hold the pending voice match so we don't setState in an effect
  const pendingMatchRef = useRef<{ value: string; label: string } | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicDenied(true);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  // Fix 2: Process voice transcript match via a callback, not an effect with setState
  const processTranscriptMatch = useCallback(() => {
    if (!transcript || !question.options || question.type !== 'single_choice') return;

    const lowerTranscript = transcript.toLowerCase().trim();
    const match = question.options.find(opt =>
      lowerTranscript.includes(opt.label.toLowerCase()) ||
      (opt.label_hi && lowerTranscript.includes(opt.label_hi.toLowerCase()))
    );

    if (match) {
      pendingMatchRef.current = { value: match.value, label: match.label };
    }
  }, [transcript, question]);

  // When listening stops, check for a match and fire onAnswer
  useEffect(() => {
    if (!isListening && transcript) {
      processTranscriptMatch();
      if (pendingMatchRef.current) {
        const { value, label } = pendingMatchRef.current;
        pendingMatchRef.current = null;
        // Defer the state update + callback to next microtask to avoid cascading render
        queueMicrotask(() => {
          setTranscript('');
          onAnswer(value, label);
        });
      }
    }
  }, [isListening, transcript, processTranscriptMatch, onAnswer]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch {
        // Speech recognition already started or unavailable
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

        {/* Fix 1: Use voiceAvailable state instead of recognitionRef.current in render */}
        {!micDenied && voiceAvailable && (question.type === 'single_choice' || question.type === 'multi_choice') && (
          <div className="mt-10 flex flex-col items-center">
            <p className="text-muted text-sm font-body mb-4">
              {language === 'hi' ? 'एक विकल्प चुनें या अपना उत्तर बोलें' : 'Tap an option or speak your answer'}
            </p>
            <VoiceButton
              isSpeaking={isListening}
              onClick={toggleListen}
            />
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
