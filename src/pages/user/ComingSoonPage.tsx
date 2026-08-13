
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles, Wand2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AppErrorBoundary } from '../../components/error/AppErrorBoundary';

const ComingSoonPageInner: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl sm:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)' }}
        />
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-[#E31B23]/15 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
            <span>{t('Coming Soon', 'শীঘ্রই আসছে')}</span>
          </div>

          <div className="mt-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 shadow-lg">
            <Clock className="h-9 w-9 text-white" />
          </div>

          <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
              {t('This feature is on the way', 'এই ফিচারটি শীঘ্রই আসছে')}
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {t(
              'We are rebuilding this section to give you a smarter experience. The page is temporarily unavailable while we work on it.',
              'আমরা এই সেকশনটি আরও স্মার্ট করে গড়ে তুলছি। নতুন সংস্করণ তৈরির সময় এই পেজটি সাময়িকভাবে বন্ধ আছে।',
            )}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('Go back', 'ফিরে যান')}
            </button>
            <Link
              to="/dashboard/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-xs font-black text-white shadow hover:opacity-95"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {t('Open AI Profile', 'AI প্রোফাইল খুলুন')}
            </Link>
          </div>
        </div>
      </div>

      {}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/dashboard/profile"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#F97316] hover:shadow-md"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t('In the meantime', 'ইতিমধ্যে')}
          </p>
          <p className="mt-2 text-sm font-black text-slate-900">
            {t('Complete your AI Profile', 'আপনার AI প্রোফাইল পূরণ করুন')}
          </p>
          <p className="mt-1 text-[12px] text-slate-600">
            {t(
              'A stronger profile means better AI job matches and a richer Skill Passport.',
              'একটি শক্তিশালী প্রোফাইল আরও ভালো AI জব ম্যাচ এবং সমৃদ্ধ স্কিল পাসপোর্ট নিশ্চিত করে।',
            )}
          </p>
        </Link>
        <Link
          to="/dashboard/jobs"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#F97316] hover:shadow-md"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t('Already available', 'ইতিমধ্যে চালু আছে')}
          </p>
          <p className="mt-2 text-sm font-black text-slate-900">
            {t('Browse AI-matched jobs', 'AI-ম্যাচকৃত চাকরি দেখুন')}
          </p>
          <p className="mt-1 text-[12px] text-slate-600">
            {t(
              'Every job is ranked against the data you enter in your AI Profile.',
              'প্রতিটি চাকরি আপনার AI প্রোফাইলের তথ্যের ভিত্তিতে র‍্যাঙ্ক করা হয়।',
            )}
          </p>
        </Link>
      </div>
    </div>
  );
};

export const ComingSoonPage: React.FC = () => (
  <AppErrorBoundary label="Coming Soon">
    <ComingSoonPageInner />
  </AppErrorBoundary>
);

export default ComingSoonPage;