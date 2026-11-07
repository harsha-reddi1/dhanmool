import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Clean Web Speech API hook with active Microphone Permission management.
 * Compatible with Android WebViews (Capacitor), iOS WKWebView, Chrome, Safari, and Edge.
 */
export function useSpeechRecognition({ onResult, onError, lang = 'en-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(Boolean(SpeechRecognition));

    // Check existing permission state if supported by browser/environment
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' })
        .then((status) => {
          setPermissionStatus(status.state);
          status.onchange = () => setPermissionStatus(status.state);
        })
        .catch(() => {
          // Ignore unsupported query in older environments
        });
    }
  }, []);

  /**
   * Explicitly requests microphone permission via getUserMedia.
   * On mobile devices and WebViews, this triggers the OS permission prompt.
   */
  const requestMicrophonePermission = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop and release all audio tracks so SpeechRecognition can access mic
        stream.getTracks().forEach((track) => track.stop());
        setPermissionStatus('granted');
        return true;
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionStatus('denied');
          if (onError) {
            onError('Microphone permission denied. Please allow microphone access in your browser or device settings.');
          }
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          if (onError) {
            onError('No microphone device was detected on your system.');
          }
        } else {
          if (onError) {
            onError(`Could not access microphone: ${err.message || 'Permission required'}`);
          }
        }
        return false;
      }
    }
    return true;
  }, [onError]);

  const startListening = useCallback(async () => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      if (onError) {
        onError('Voice speech input is not supported in this browser. Please type your query.');
      }
      return;
    }

    // Ensure microphone permission is granted before starting recognition
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

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
        setPermissionStatus('granted');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0]?.transcript || '')
          .join('');
        const isFinal = Boolean(event.results[0]?.isFinal);
        if (onResult) {
          onResult(transcript, isFinal);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionStatus('denied');
          if (onError) {
            onError('Microphone permission was denied. Please allow microphone access in your app settings.');
          }
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          if (onError) {
            onError(`Speech recognition error: ${event.error}`);
          }
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
  }, [lang, onResult, onError, requestMicrophonePermission]);

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
    permissionStatus,
    requestMicrophonePermission,
    startListening,
    stopListening,
    toggleListening,
  };
}
