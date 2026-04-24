"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing; Web Speech API types are not in lib.dom yet.
interface SpeechRecognitionAlternativeLite {
  transcript: string;
}
interface SpeechRecognitionResultLite {
  0: SpeechRecognitionAlternativeLite;
  isFinal: boolean;
}
interface SpeechRecognitionEventLite {
  results: ArrayLike<SpeechRecognitionResultLite>;
}
interface SpeechRecognitionLite {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLite) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLite;

function resolveSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechInputOptions {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

export function useSpeechInput({ onTranscript, lang = "en-US" }: UseSpeechInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLite | null>(null);

  useEffect(() => {
    setIsSupported(Boolean(resolveSpeechRecognitionCtor()));
  }, []);

  const start = useCallback(() => {
    const Ctor = resolveSpeechRecognitionCtor();
    if (!Ctor) {
      setIsSupported(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) onTranscript(finalText.trim(), true);
      else if (interimText) onTranscript(interimText.trim(), false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [lang, onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return { isListening, isSupported, start, stop };
}
