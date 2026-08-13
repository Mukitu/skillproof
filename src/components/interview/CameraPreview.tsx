
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, RefreshCw, ShieldCheck, User } from 'lucide-react';

export interface CameraPreviewProps {
  
  active: boolean;
  
  className?: string;
  
  language: 'bn' | 'en';
}

type CameraState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'live'; stream: MediaStream }
  | { kind: 'denied' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

const CameraPreview: React.FC<CameraPreviewProps> = ({ active, className, language }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>({ kind: 'idle' });
  
  
  
  
  
  const stateRef = useRef<CameraState>({ kind: 'idle' });
  const isBn = language === 'bn';

  
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopStream = (stream: MediaStream | null | undefined) => {
    if (!stream) return;
    for (const t of stream.getTracks()) {
      try { t.stop(); } catch {  }
    }
  };

  
  
  
  const releaseCamera = () => {
    const s = stateRef.current;
    if (s.kind === 'live') {
      stopStream(s.stream);
    }
    stateRef.current = { kind: 'idle' };
  };

  const request = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const next: CameraState = { kind: 'unavailable' };
      setState(next);
      stateRef.current = next;
      return;
    }
    const reqState: CameraState = { kind: 'requesting' };
    setState(reqState);
    stateRef.current = reqState;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      const liveState: CameraState = { kind: 'live', stream };
      setState(liveState);
      stateRef.current = liveState;
    } catch (e: any) {
      const name = e?.name || '';
      let next: CameraState;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        next = { kind: 'denied' };
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        next = { kind: 'unavailable' };
      } else {
        next = { kind: 'error', message: e?.message || 'Camera unavailable.' };
      }
      setState(next);
      stateRef.current = next;
    }
  };

  
  useEffect(() => {
    if (state.kind === 'live' && videoRef.current) {
      const v = videoRef.current;
      v.srcObject = state.stream;
      v.muted = true;
      v.playsInline = true;
      v.autoplay = true;
      void v.play().catch(() => {
        
      });
    }
  }, [state.kind]);

  
  
  
  
  
  useEffect(() => {
    if (active) {
      void request();
    } else {
      releaseCamera();
      setState({ kind: 'idle' });
    }
    
    const onPageHide = () => releaseCamera();
    const onBeforeUnload = () => releaseCamera();
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        releaseCamera();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('beforeunload', onBeforeUnload);
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return () => {
      
      releaseCamera();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('beforeunload', onBeforeUnload);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
    
  }, [active]);

  

  const renderLive = () => (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)'  }}
      />
      {}
      <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-lg ring-1 ring-emerald-300/50 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-live-dot rounded-full bg-white" />
        {isBn ? 'লাইভ ক্যামেরা · লোকাল' : 'LIVE · LOCAL ONLY'}
      </div>
      {}
      <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1 text-[9px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
        <ShieldCheck size={10} className="text-emerald-300" />
        {isBn ? 'রেকর্ড নয়' : 'NOT RECORDED'}
      </div>
      {}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/85 via-slate-900/40 to-transparent p-3">
        <p className="text-[10px] font-medium leading-relaxed text-white/90">
          {isBn
            ? 'তোমার ক্যামেরা শুধুমাত্র একটি বাস্তবসম্মত ইন্টারভিউ পরিবেশ তৈরি করতে ব্যবহৃত হচ্ছে। কোনো ভিডিও রেকর্ড, বিশ্লেষণ বা সংরক্ষণ করা হয় না।'
            : 'Your camera is displayed locally to simulate a real interview. No video is recorded, analyzed or stored.'}
        </p>
      </div>
    </div>
  );

  const renderRequesting = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900/90 text-white">
      <Loader2 size={26} className="animate-spin text-white/80" />
      <p className="text-[11px] font-semibold opacity-80">
        {isBn ? 'ক্যামেরা চালু হচ্ছে…' : 'Starting camera…'}
      </p>
    </div>
  );

  const renderDenied = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/95 p-4 text-center text-white">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 ring-1 ring-rose-300/40">
        <CameraOff size={22} className="text-rose-300" />
      </div>
      <div>
        <p className="text-sm font-bold">
          {isBn ? 'ক্যামেরা অনুমতি প্রত্যাখ্যাত' : 'Camera permission denied'}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-white/70">
          {isBn
            ? 'তুমি ক্যামেরা ছাড়াই ইন্টারভিউ চালিয়ে যেতে পারো।'
            : 'You can continue the interview without a camera.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void request()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/20 hover:bg-white/20"
      >
        <RefreshCw size={11} />
        {isBn ? 'আবার চেষ্টা করো' : 'Try again'}
      </button>
      <p className="mt-1 text-[9px] text-white/50">
        {isBn ? 'কখনোই রেকর্ড হয় না।' : 'Never recorded.'}
      </p>
    </div>
  );

  const renderUnavailable = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/95 p-4 text-center text-white">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 ring-1 ring-white/10">
        <CameraOff size={22} className="text-white/70" />
      </div>
      <div>
        <p className="text-sm font-bold">
          {isBn ? 'কোনো ক্যামেরা পাওয়া যায়নি' : 'No camera available'}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-white/70">
          {isBn
            ? 'তুমি ক্যামেরা ছাড়াই ইন্টারভিউ চালিয়ে যেতে পারো।'
            : 'You can continue the interview without a camera.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void request()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/20 hover:bg-white/20"
      >
        <RefreshCw size={11} />
        {isBn ? 'আবার চেষ্টা করো' : 'Try again'}
      </button>
    </div>
  );

  const renderError = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900/95 p-4 text-center text-white">
      <CameraOff size={22} className="text-amber-300" />
      <p className="text-[11px] font-bold">
        {isBn ? 'ক্যামেরা শুরু করা যায়নি' : 'Could not start camera'}
      </p>
      <p className="text-[9px] text-white/60">{state.kind === 'error' ? state.message : ''}</p>
      <button
        type="button"
        onClick={() => void request()}
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/20 hover:bg-white/20"
      >
        <RefreshCw size={11} />
        {isBn ? 'আবার চেষ্টা করো' : 'Try again'}
      </button>
    </div>
  );

  const renderIdle = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-center text-white">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
        <User size={26} className="text-white/70" />
      </div>
      <p className="text-[11px] font-bold">
        {isBn ? 'তোমার প্রিভিউ' : 'Your preview'}
      </p>
      <p className="text-[10px] text-white/60">
        {isBn ? 'ক্যামেরা অনুমতি দিলে এখানে দেখা যাবে।' : 'Camera will appear here once allowed.'}
      </p>
      <button
        type="button"
        onClick={() => void request()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-[11px] font-extrabold text-white shadow hover:opacity-95"
      >
        <Camera size={11} />
        {isBn ? 'ক্যামেরা চালু করো' : 'Enable camera'}
      </button>
      <p className="mt-1 text-[9px] text-white/50">
        {isBn ? 'শুধুমাত্র ব্রাউজারে দেখানো হয় — কখনো সংরক্ষিত হয় না।' : 'Browser-only. Never saved.'}
      </p>
    </div>
  );

  let body: React.ReactNode;
  switch (state.kind) {
    case 'live': body = renderLive(); break;
    case 'requesting': body = renderRequesting(); break;
    case 'denied': body = renderDenied(); break;
    case 'unavailable': body = renderUnavailable(); break;
    case 'error': body = renderError(); break;
    default: body = renderIdle();
  }

  return <div className={className ?? 'h-full w-full'}>{body}</div>;
};

export default CameraPreview;