import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const POPUP_DISMISS_KEY = 'skillproof_popup_dismissed_v1';


export const WebsitePopup: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = window.localStorage.getItem(POPUP_DISMISS_KEY);
      if (dismissed) return;
    } catch {
      
    }
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(POPUP_DISMISS_KEY, String(Date.now()));
    } catch {
      
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="website-popup-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4 p-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E31B23]">
            <Sparkles className="h-3 w-3" />
            New
          </div>
          <h3
            id="website-popup-title"
            className="text-lg font-black text-slate-900"
          >
            Build your Skill Passport today
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Verify your real skills, follow structured roadmaps, and present a
            tamper-proof Skill Passport to employers worldwide.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/register"
              onClick={handleDismiss}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] px-4 py-2.5 text-center text-xs font-extrabold text-white shadow-md shadow-red-500/20 transition hover:opacity-95"
            >
              Get Started — Free
            </Link>
            <Link
              to="/how-it-works"
              onClick={handleDismiss}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsitePopup;
