import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseAsrOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onEnd?: () => void;
}

export function useAsr() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'error' | 'unsupported'>(() => {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      ? 'idle'
      : 'unsupported';
  });
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultCallbackRef = useRef<((text: string) => void) | undefined>(undefined);
  const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
    setStatus(prev => (prev === 'listening' ? 'idle' : prev));
  }, []);

  const startListening = useCallback((options?: UseAsrOptions) => {
    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      setStatus('unsupported');
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setError(null);
    setTranscript('');
    onResultCallbackRef.current = options?.onResult;
    onEndCallbackRef.current = options?.onEnd;

    try {
      const recognition = new SpeechRecognition();
      const patientLang = localStorage.getItem('patient_language') || 'en';
      const requestedLang = options?.lang || (patientLang === 'hi' ? 'hi-IN' : 'en-IN');
      
      recognition.lang = requestedLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('listening');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        setTranscript(text);

        if (finalTranscript && onResultCallbackRef.current) {
          onResultCallbackRef.current(finalTranscript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('ASR error:', e.error);
        setError(e.error || 'Microphone error');
        setStatus('error');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatus(prev => (prev === 'listening' ? 'idle' : prev));
        if (onEndCallbackRef.current) {
          onEndCallbackRef.current();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start ASR:', err);
      setError(err.message || 'Failed to start microphone');
      setStatus('error');
      setIsListening(false);
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    status,
    error,
    startListening,
    stopListening,
    setTranscript
  };
}
