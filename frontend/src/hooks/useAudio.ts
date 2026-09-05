import { useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/api';

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, lang: string = 'en-US') => {
    // 1. Try Sarvam TTS First
    try {
      const response = await fetch(`${API_URL}/api/sarvam/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          // Play the Sarvam audio
          const audio = new Audio(data.audioUrl);
          audioRef.current = audio;
          setIsPlaying(true);
          audio.onended = () => setIsPlaying(false);
          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('Sarvam TTS failed, falling back to WebSpeech', err);
    }

    // 2. Fallback to WebSpeech
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop any currently playing audio
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, isPlaying };
}
