
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVoiceInputOptions {
  lang?: string;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  amplitude: number;
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  isSupported: boolean;
  error: string | null;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {  }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {  }
      analyserRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        try { t.stop(); } catch {  }
      }
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { void audioContextRef.current.close(); } catch {  }
    }
    audioContextRef.current = null;
    setAmplitude(0);
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {  }
    setIsListening(false);
    stopAudio();
  }, [stopAudio]);

  const start = useCallback(async () => {
    setError(null);

    
    const SR: any =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : null;
    if (!SR) {
      setIsSupported(false);
      setError('Speech recognition not supported on this browser.');
      return;
    }
    setIsSupported(true);

    if (!recognitionRef.current) {
      const rec = new SR();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev: any) => {
        let txt = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          txt += ev.results[i][0].transcript;
        }
        setTranscript(txt.trim());
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = (ev: any) => {
        setError(ev?.error || 'speech_error');
        setIsListening(false);
        stopAudio();
      };
      recognitionRef.current = rec;
    }

    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;
      src.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        
        setAmplitude(Math.min(1, rms * 3.2));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e: any) {
      
      
      setError(e?.message || 'Microphone unavailable.');
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
    } catch {
      setIsListening(false);
    }
  }, [lang, stopAudio]);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {  }
      stopAudio();
    };
  }, [stopAudio]);

  return { isListening, amplitude, transcript, start, stop, reset, isSupported, error };
}

export default useVoiceInput;