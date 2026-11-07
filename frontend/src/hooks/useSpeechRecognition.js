import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Clean Web Speech API hook for voice-to-text input.
 * Compatible with Chrome, Edge, Safari, iOS WKWebView, and Android WebViews.
 */
export function useSpeechRecognition({ onResult, onError, lang = 'en-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(Boolean(SpeechRecognition));
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      if (onError) {
        onError('Voice speech input is not supported in this browser. Please type your query.');
      }
      return;
    }

    try {
      // Clean up previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(res => res[0]?.transcript || '')
          .join('');
        const isFinal = Boolean(event.results[0]?.isFinal);
        if (onResult) {
          onResult(transcript, isFinal);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          if (onError) onError('Microphone permission was denied. Please allow microphone access.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          if (onError) onError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
      if (onError) onError('Could not access microphone.');
    }
  }, [lang, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
