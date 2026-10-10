'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Declare types for Web Speech API to satisfy TypeScript without extra npm packages
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechToTextOptions {
  onTranscriptChange?: (text: string) => void;
  language?: string;
}

export function getBcp47Tag(code?: string): string {
  if (!code) return 'en-IN';
  const map: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    es: 'es-ES',
    mr: 'mr-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
  };
  return map[code] || code;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isListeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const timer = window.setTimeout(() => setIsSupported(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Android Bug Fix: Continuous mode causes cumulative duplication.
      // We turn it off for Android and auto-restart in onend instead.
      recognition.continuous = !isAndroid;
      recognition.interimResults = true;
      recognition.lang = getBcp47Tag(options.language);

      let localTranscript = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentIter = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentIter += event.results[i][0].transcript;
        }
        
        // Combine with our persistent localTranscript for this session
        const full = (localTranscript + ' ' + currentIter).trim();
        setTranscript(full);
        if (options.onTranscriptChange) {
          options.onTranscriptChange(full);
        }
        
        // If this result is final, bake it into our localTranscript so we don't lose it on restart
        if (event.results[event.results.length - 1]?.isFinal) {
           localTranscript = full;
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListeningRef.current && isAndroid) {
          // Auto-restart to simulate continuous mode without the duplication bug
          try { recognition.start(); } catch (e) {}
        } else {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Could not start microphone access.');
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [options]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

/**
 * Utility function to speak text using browser Text-to-Speech (speechSynthesis)
 */
export function speakText(text: string, options: { lang?: string; onEnd?: () => void } = {}): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return () => {};
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  if (!text || !text.trim()) return () => {};

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getBcp47Tag(options.lang);
  utterance.rate = 0.95; // Slightly slower for clarity

  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

/**
 * Hook for managing Text-to-Speech playback state
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, lang = 'en') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setIsSpeaking(true);
    speakText(text, {
      lang,
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, speak, stop };
}

