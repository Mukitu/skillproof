
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisOptions {
  
  lang?: string;
}

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}


function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const all = window.speechSynthesis.getVoices();
  if (!all || all.length === 0) return null;
  const exact = all.find((v) => v.lang?.toLowerCase() === lang.toLowerCase());
  if (exact) return exact;
  const prefix = lang.split('-')[0].toLowerCase();
  const partial = all.find((v) => v.lang?.toLowerCase().startsWith(prefix));
  if (partial) return partial;
  return all[0] ?? null;
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisReturn {
  const { lang = 'en-US' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const tryPick = () => {
      const v = pickVoice(lang);
      if (v) voiceRef.current = v;
    };
    tryPick();
    
    window.speechSynthesis.onvoiceschanged = tryPick;
    return () => {
      try { window.speechSynthesis.onvoiceschanged = null; } catch {  }
      try { window.speechSynthesis.cancel(); } catch {  }
    };
  }, [lang]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    try { window.speechSynthesis.cancel(); } catch {  }
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      try {
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        
        window.speechSynthesis.speak(utterance);
        window.setTimeout(() => setIsSpeaking(false), 30000);
      } catch {
        setIsSpeaking(false);
      }
    },
    [isSupported, lang],
  );

  return { isSpeaking, isSupported, speak, cancel };
}

export default useSpeechSynthesis;