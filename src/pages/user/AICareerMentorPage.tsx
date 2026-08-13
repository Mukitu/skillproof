
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock,
  FileText,
  History,
  Hourglass,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  canStartInterview,
  cancelInterviewSession,
  completeInterviewSession,
  evaluateInterviewFinal,
  formatCountdown,
  generateInterviewQuestion,
  getInterviewSessionDetail,
  gradeInterviewAnswer,
  INTERVIEW_DURATION_SECONDS,
  listMyInterviewHistory,
  loadInterviewCategories,
  loadInterviewSubCategories,
  recordInterviewAnswer,
  recordInterviewQuestion,
  secondsRemaining,
  startInterviewSession,
  startInterviewWithQuestion,
  subscribeInterviewAnswers,
  subscribeInterviewQuestions,
  subscribeMyInterviewSessions,
  type GenerateQuestionResult,
  type InterviewHistoryRow,
} from '../../services/interview';
import {
  useRealtimeRefresh,
} from '../../services/realtime';
import type {
  Category,
  InterviewDifficulty,
  InterviewQuestion,
  InterviewSession,
  SubCategory,
} from '../../types/database';





import type { AnswerRecord, SessionState } from '../../components/interview/roomTypes';
export type { AnswerRecord, SessionState };

type Phase = 'config' | 'active' | 'completed' | 'viewing_history';

















interface FeaturePreview {
  icon: React.ReactNode;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
}

const FEATURE_PREVIEWS: FeaturePreview[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
    titleEn: 'Human-like AI Interviewer',
    titleBn: 'মানুষের মতো AI ইন্টারভিউয়ার',
    bodyEn: 'Speak naturally with an AI that thinks and responds like a real interviewer.',
    bodyBn: 'একজন AI-এর সাথে কথা বলুন যে একজন আসল ইন্টারভিউয়ারের মতো চিন্তা করে ও উত্তর দেয়।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path strokeLinecap="round" d="M22 8l-6 4 6 4V8z" />
      </svg>
    ),
    titleEn: 'Real Interview Experience',
    titleBn: 'আসল ইন্টারভিউয়ের অভিজ্ঞতা',
    bodyEn: 'Practice with the same pressure and structure as a real job interview.',
    bodyBn: 'আসল চাকরির ইন্টারভিউয়ের মতো একই চাপ ও কাঠামোতে প্র্যাকটিস করুন।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    titleEn: 'Voice Conversation',
    titleBn: 'ভয়েস কথোপকথন',
    bodyEn: 'Speak your answers out loud — just like in a real interview room.',
    bodyBn: 'আসল ইন্টারভিউ রুমের মতো আপনার উত্তরগুলো জোরে জোরে বলুন।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    ),
    titleEn: 'CV-based Personalised Questions',
    titleBn: 'CV-ভিত্তিক ব্যক্তিগতকরণ প্রশ্ন',
    bodyEn: 'Questions generated from your actual CV, skills, and career goals.',
    bodyBn: 'আপনার আসল CV, দক্ষতা ও ক্যারিয়ার লক্ষ্যের উপর ভিত্তি করে তৈরি প্রশ্ন।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-4 4 4 6-6" />
      </svg>
    ),
    titleEn: 'AI Performance Analysis',
    titleBn: 'AI পারফরম্যান্স বিশ্লেষণ',
    bodyEn: 'Get deep insights into your communication, technical depth, and confidence.',
    bodyBn: 'আপনার যোগাযোগ, প্রযুক্তিগত দক্ষতা ও আত্মবিশ্বাসের গভীর বিশ্লেষণ পান।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    titleEn: 'Instant Interview Score',
    titleBn: 'তাৎক্ষণিক ইন্টারভিউ স্কোর',
    bodyEn: 'See your score the moment you finish — no waiting, no guesswork.',
    bodyBn: 'শেষ হওয়ার সাথে সাথে আপনার স্কোর দেখুন — কোনো অপেক্ষা নেই।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
      </svg>
    ),
    titleEn: 'Interview History',
    titleBn: 'ইন্টারভিউ ইতিহাস',
    bodyEn: 'Every practice session is saved so you can track progress over time.',
    bodyBn: 'সব প্র্যাকটিস সেশন সংরক্ষিত থাকে যাতে আপনি সময়ের সাথে অগ্রগতি দেখতে পারেন।',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18M19 17v3M5 17c0-2 1-3 3-3s3 1 3 3M11 17v4M11 11c0-2 1-3 3-3s3 1 3 3v6M17 8V4l3 4h-3z" />
      </svg>
    ),
    titleEn: 'Skill Improvement Suggestions',
    titleBn: 'দক্ষতা উন্নতির পরামর্শ',
    bodyEn: 'Personalised recommendations to help you close skill gaps fast.',
    bodyBn: 'দক্ষতার ঘাটতি দ্রুত পূরণ করতে ব্যক্তিগতকৃত পরামর্শ।',
  },
];

const InterviewComingSoon: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [notifyHint, setNotifyHint] = React.useState<string | null>(null);
  const notifyTimerRef = React.useRef<number | null>(null);

  const handleNotifyClick = React.useCallback(() => {
    if (notifyTimerRef.current != null) {
      window.clearTimeout(notifyTimerRef.current);
    }
    setNotifyHint(
      isBn
        ? 'এই ফিচারটি বর্তমানে উন্নয়নাধীন। এটি একটি ভবিষ্যৎ আপডেটে উপলব্ধ হবে।'
        : 'This feature is currently under development. It will be available in a future update.',
    );
    notifyTimerRef.current = window.setTimeout(() => {
      setNotifyHint(null);
      notifyTimerRef.current = null;
    }, 4500);
  }, [isBn]);

  React.useEffect(() => {
    return () => {
      if (notifyTimerRef.current != null) {
        window.clearTimeout(notifyTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-white via-orange-50/40 to-white text-slate-800"
      data-testid="interview-coming-soon"
    >
      {}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-200/40 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {}
        <div className="coming-soon-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 shadow-sm">
          <span
            aria-hidden
            className="relative inline-flex h-2 w-2"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          {isBn ? 'শীঘ্রই আসছে' : 'Coming Soon'}
        </div>

        {}
        <div className="coming-soon-fade-in relative mb-8 flex h-44 w-full max-w-md items-center justify-center sm:h-56">
          <svg
            viewBox="0 0 320 200"
            className="h-full w-full"
            role="img"
            aria-label={isBn ? 'AI ইন্টারভিউ সিমুলেটর আইলাস্ট্রেশন' : 'AI Interview Simulator illustration'}
          >
            <defs>
              <linearGradient id="cs-mic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="cs-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff7ed" />
                <stop offset="100%" stopColor="#ffedd5" />
              </linearGradient>
            </defs>
            {}
            <rect x="20" y="20" width="280" height="160" rx="24" fill="url(#cs-bg)" />
            {}
            <rect
              x="138"
              y="48"
              width="44"
              height="78"
              rx="22"
              fill="url(#cs-mic)"
              className="coming-soon-mic-bob"
            />
            {}
            <rect x="155" y="126" width="10" height="22" rx="4" fill="#ea580c" />
            {}
            <rect x="130" y="148" width="60" height="10" rx="5" fill="#c2410c" />
            {}
            <path
              d="M 90 90 Q 110 90 116 100"
              stroke="#fb923c"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="coming-soon-wave-left"
            />
            <path
              d="M 76 92 Q 104 92 110 102"
              stroke="#fdba74"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="coming-soon-wave-left coming-soon-wave-left--delayed"
            />
            <path
              d="M 230 90 Q 210 90 204 100"
              stroke="#fb923c"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="coming-soon-wave-right"
            />
            <path
              d="M 244 92 Q 216 92 210 102"
              stroke="#fdba74"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="coming-soon-wave-right coming-soon-wave-right--delayed"
            />
            {}
            <g fill="#f97316" className="coming-soon-spark">
              <circle cx="60" cy="46" r="2.5" />
              <circle cx="262" cy="52" r="2" />
              <circle cx="252" cy="150" r="2.5" />
            </g>
          </svg>
        </div>

        {}
        <h1 className="coming-soon-fade-in text-center text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
          {isBn ? (
            <>
              SkillProof AI <span className="text-orange-500">ইন্টারভিউ সিমুলেটর</span>
            </>
          ) : (
            <>
              SkillProof AI <span className="text-orange-500">Interview Simulator</span>
            </>
          )}
        </h1>
        <p className="coming-soon-fade-in mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-slate-600 sm:text-lg">
          {isBn
            ? 'আমরা তৈরি করছি বাংলাদেশের প্রথম AI-চালিত রিয়েল-টাইম ইন্টারভিউ সিমুলেটর। শীঘ্রই আপনি SkillProof AI-এর সাথে বাস্তবসম্মত ইন্টারভিউ প্র্যাকটিস করতে, তাৎক্ষণিক ফিডব্যাক পেতে, আত্মবিশ্বাস বাড়াতে এবং আসল চাকরির ইন্টারভিউয়ের জন্য প্রস্তুত হতে পারবেন।'
            : 'We are building Bangladesh’s first AI-powered real-time interview simulator. Soon you’ll be able to practice realistic interviews with SkillProof AI, receive instant feedback, improve your confidence, and prepare for real job interviews.'}
        </p>

        {}
        <div className="coming-soon-fade-in mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {isBn ? 'স্ট্যাটাস: উন্নয়নাধীন' : 'Status: Under Development'}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            {isBn ? 'প্রত্যাশিত মুক্তি: শীঘ্রই' : 'Expected Release: Coming Soon'}
          </div>
        </div>

        {}
        <div className="coming-soon-fade-in mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleNotifyClick}
            disabled
            aria-disabled="true"
            data-testid="interview-coming-soon-notify"
            className="group inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-3 text-sm font-bold text-white opacity-90 shadow-lg shadow-orange-500/20 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {isBn ? 'প্রাপ্যতার খবর দাও' : 'Notify Me When Available'}
          </button>
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-[1.25rem] text-xs font-semibold transition-opacity duration-300 ${
              notifyHint ? 'text-orange-600 opacity-100' : 'opacity-0'
            }`}
            data-testid="interview-coming-soon-notify-hint"
          >
            {notifyHint ?? '\u00A0'}
          </p>
        </div>

        {}
        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FEATURE_PREVIEWS.map((f, idx) => (
            <div
              key={f.titleEn}
              className="coming-soon-card group relative flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {isBn ? f.titleBn : f.titleEn}
              </h3>
              <p className="text-xs leading-relaxed text-slate-500">
                {isBn ? f.bodyBn : f.bodyEn}
              </p>
              <span
                aria-hidden
                className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                {isBn ? 'শীঘ্রই' : 'Soon'}
              </span>
            </div>
          ))}
        </div>

        {}
        <p className="coming-soon-fade-in mt-12 max-w-2xl text-center text-[11px] leading-relaxed text-slate-400">
          {isBn
            ? 'SkillProof AI ইন্টারভিউ সিমুলেটরের সমস্ত ব্যাকএন্ড যুক্তি, ডাটাবেস টেবিল এবং API সম্পূর্ণ সুরক্ষিত আছে। এটি শুধুমাত্র একটি সাময়িক UI স্থগিতাদেশ।'
            : 'All backend logic, database tables, and APIs for the SkillProof AI Interview Simulator remain fully intact. This is only a temporary UI hold.'}
        </p>
      </div>
    </div>
  );
};





const DIFFICULTY_RING: Record<InterviewDifficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Hard: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const DIFFICULTY_PLAN: InterviewDifficulty[] = [
  'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard', 'Hard', 'Hard',
  'Hard', 'Hard', 'Hard', 'Hard',
];

function planDifficulty(questionIndex: number): InterviewDifficulty {
  if (questionIndex < 1) return 'Easy';
  return DIFFICULTY_PLAN[Math.min(questionIndex - 1, DIFFICULTY_PLAN.length - 1)];
}


function isResumableSessionStatus(s: InterviewSession['status'] | string | null | undefined): boolean {
  return s === 'pending' || s === 'preparing' || s === 'active' || s === 'in_progress';
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function statusLabel(s: InterviewSession['status']): { label: string; tone: string } {
  switch (s) {
    case 'pending':
    case 'preparing':
    case 'active':
    case 'in_progress':
      return { label: 'In Progress', tone: 'bg-blue-50 text-blue-700 ring-blue-200' };
    case 'completed':
      return { label: 'Completed', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    case 'expired':
      return { label: 'Expired', tone: 'bg-amber-50 text-amber-700 ring-amber-200' };
    case 'abandoned':
      return { label: 'Abandoned', tone: 'bg-slate-50 text-slate-600 ring-slate-200' };
    case 'failed':
      return { label: 'Failed', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'bg-slate-50 text-slate-600 ring-slate-200' };
  }
}

function personalizationLabel(p: GenerateQuestionResult['personalization'] | null | undefined): {
  en: string;
  bn: string;
  tone: string;
} {
  const src = p?.context_source ?? 'category_only';
  if (src === 'full_profile') {
    return {
      en: 'Personalized · profile + CV + verifications + roadmaps',
      bn: 'ব্যক্তিগতকরণ · প্রোফাইল + সিভি + ভেরিফিকেশন + রোডম্যাপ',
      tone: 'text-emerald-700',
    };
  }
  if (src === 'partial_profile') {
    return {
      en: 'Partially personalized (some context available)',
      bn: 'আংশিক ব্যক্তিগতকরণ',
      tone: 'text-amber-700',
    };
  }
  return {
    en: 'Category-only (no CV yet — interview will be generic)',
    bn: 'শুধু ক্যাটাগরি (সিভি নেই)',
    tone: 'text-slate-500',
  };
}





const DifficultyPill: React.FC<{ difficulty: InterviewDifficulty }> = ({ difficulty }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1',
      DIFFICULTY_RING[difficulty],
    )}
  >
    {difficulty}
  </span>
);





const ConfigurationPane: React.FC<{
  categories: Category[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  subCategories: SubCategory[];
  selectedSubCategoryId: string | null;
  setSelectedSubCategoryId: (id: string | null) => void;
  canStart: boolean;
  canStartReason: string;
  canStartMessage: { en: string; bn: string } | null;
  canStartActiveSessionId: string | null;
  loading: boolean;
  language: string;
  onStart: () => void;
  onResume: () => void;
  onGoHistory: () => void;
  historyCount: number;
}> = ({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  subCategories,
  selectedSubCategoryId,
  setSelectedSubCategoryId,
  canStart,
  canStartReason,
  canStartMessage,
  canStartActiveSessionId,
  loading,
  language,
  onStart,
  onResume,
  onGoHistory,
  historyCount,
}) => {
  const isBn = language === 'bn';

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  return (
    <div className="relative overflow-hidden mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
        }}
      />
      <div className="relative pt-1 flex items-center gap-2">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow"
          style={{
            background:
              'linear-gradient(135deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        >
          <Bot size={20} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isBn ? 'SkillProof AI ইন্টারভিউ সিমুলেটর' : 'SkillProof AI Interview Simulator'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {isBn
              ? '৩ মিনিটের ব্যক্তিগতকরণ মক ইন্টারভিউ · প্রতিদিন ১টি'
              : '3-minute personalized mock interview · 1 per day'}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            {isBn ? 'মেইন ক্যাটাগরি' : 'Main Category'}
            <span className="ml-1 text-rose-600">*</span>
          </span>
          <select
            value={selectedCategoryId ?? ''}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value || null);
              setSelectedSubCategoryId(null);
            }}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">
              {isBn ? '— একটি ক্যাটাগরি বেছে নাও —' : '— Select a category —'}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700">
            {isBn ? 'সাব ক্যাটাগরি (ঐচ্ছিক)' : 'Sub Category (optional)'}
          </span>
          <select
            value={selectedSubCategoryId ?? ''}
            onChange={(e) => setSelectedSubCategoryId(e.target.value || null)}
            disabled={!selectedCategoryId || subCategories.length === 0}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {subCategories.length === 0
                ? isBn
                  ? '— কোনো সাব ক্যাটাগরি নেই —'
                  : '— No sub-categories —'
                : isBn
                  ? '— একটি সাব ক্যাটাগরি বেছে নাও —'
                  : '— Select a sub-category —'}
            </option>
            {subCategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {selectedCategory && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-[11px] text-indigo-800">
            <p className="flex items-center gap-1 font-bold">
              <Sparkles size={11} />
              {isBn ? 'প্রশ্নগুলো ব্যক্তিগতকরণ করা হবে' : 'Questions will be personalized'}
            </p>
            <p className="mt-1">
              {isBn
                ? 'SkillProof AI তোমার আপলোড করা সিভি, AI ক্যারিয়ার প্রোফাইল, কমপ্লিটেড ভেরিফিকেশন, রোডম্যাপ এবং স্কিল পাসপোর্টের উপর ভিত্তি করে প্রশ্ন তৈরি করবে — যদি সেগুলো থাকে। না থাকলে শুধু ক্যাটাগরির উপর ভিত্তি করবে।'
                : 'SkillProof AI will base its questions on your uploaded CV, AI Career Profile, completed verifications, completed roadmaps, and any Skill Passport — when those exist. Otherwise it falls back to the category.'}
            </p>
          </div>
        )}
      </div>

      {canStartMessage && (
        <div
          className={cn(
            'rounded-xl border p-3 text-[11px]',
            canStart
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800',
          )}
        >
          <p className="flex items-center gap-1 font-bold">
            {canStart ? <CheckCircle2 size={11} /> : <Hourglass size={11} />}
            {isBn ? (canStart ? 'প্রস্তুত' : 'অপেক্ষা') : canStart ? 'Ready' : 'Locked'}
          </p>
          <p className="mt-1">{isBn ? canStartMessage.bn : canStartMessage.en}</p>
          {canStartReason === 'daily_limit' && (
            <p className="mt-1 text-[10px] opacity-70">
              {isBn
                ? 'প্রতি ২৪ ঘন্টায় ১টি ইন্টারভিউ — এই বিধি Supabase-এ enforce করা হয়।'
                : 'One interview every 24 hours — enforced from Supabase.'}
            </p>
          )}
          {canStartReason === 'active_session_exists' && canStartActiveSessionId && (
            <button
              type="button"
              onClick={onResume}
              disabled={loading}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
              {isBn ? 'আগের ইন্টারভিউ চালিয়ে যাও' : 'Resume previous interview'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !canStart || !selectedCategoryId}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-extrabold text-white shadow disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          {loading
            ? isBn ? 'শুরু হচ্ছে…' : 'Starting…'
            : isBn
              ? 'ইন্টারভিউ শুরু করো'
              : 'Start Interview'}
        </button>
        <button
          type="button"
          onClick={onGoHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <History size={13} />
          {isBn ? 'আমার ইন্টারভিউ ইতিহাস' : 'My Interview History'}
          {historyCount > 0 && (
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {historyCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};










import PremiumInterviewRoom from '../../components/interview/PremiumInterviewRoom';

const ActiveInterviewPane: React.FC<{
  state: SessionState;
  remainingSeconds: number;
  language: string;
  loadingQuestion: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (answerText: string) => Promise<void>;
  onAbandon: () => Promise<void>;
  
  
  
  inputValue?: string;
  setInputValue?: (s: string) => void;
  voiceSupported?: boolean;
  voiceListening?: boolean;
  voiceTranscript?: string;
  setVoiceTranscript?: (s: string) => void;
  onToggleVoice?: () => void;
}> = (props) => {
  return (
    <PremiumInterviewRoom
      state={props.state}
      remainingSeconds={props.remainingSeconds}
      language={(props.language === 'bn' ? 'bn' : 'en') as 'bn' | 'en'}
      loadingQuestion={props.loadingQuestion}
      submitting={props.submitting}
      error={props.error}
      onSubmit={props.onSubmit}
      onAbandon={props.onAbandon}
    />
  );
};





const CompletedPane: React.FC<{
  session: InterviewSession;
  answers: AnswerRecord[];
  questions: InterviewQuestion[];
  language: string;
  onNew: () => void;
  onHistory: () => void;
}> = ({ session, answers, questions, language, onNew, onHistory }) => {
  const isBn = language === 'bn';
  const feedback = (session.feedback ?? {}) as Record<string, any>;
  const summary: string = typeof feedback.summary === 'string' ? feedback.summary : '';
  const strengths: string[] = Array.isArray(feedback.strengths) ? feedback.strengths : [];
  const weaknesses: string[] = Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [];
  const recommendations: string[] = Array.isArray(feedback.recommendations) ? feedback.recommendations : [];
  const nextSteps: string[] = Array.isArray(feedback.next_steps) ? feedback.next_steps : [];

  
  
  const axes = (feedback.axes && typeof feedback.axes === 'object'
    ? feedback.axes
    : {
        communication: session.communication_score ?? null,
        technical: session.technical_score ?? null,
        problem_solving: session.problem_solving_score ?? null,
        confidence: session.confidence_score ?? null,
        grammar: session.grammar_score ?? null,
      }) as Record<string, number | null>;
  const hasAxes =
    typeof axes.communication === 'number' ||
    typeof axes.technical === 'number' ||
    typeof axes.problem_solving === 'number' ||
    typeof axes.confidence === 'number' ||
    typeof axes.grammar === 'number';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
        <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
          <CheckCircle2 size={14} />
          {isBn ? 'ইন্টারভিউ সম্পন্ন' : 'Interview completed'}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
          {isBn ? 'তোমার স্কোর' : 'Your score'}
          <span className="ml-3 inline-flex items-baseline gap-1 font-mono text-emerald-700">
            {session.score ?? 0}
            <span className="text-base text-slate-500">/100</span>
          </span>
        </h2>
        <p className="mt-1 text-[11px] text-slate-600">
          {session.category_name}
          {session.sub_category_name ? ` · ${session.sub_category_name}` : ''} ·{' '}
          {session.interview_duration}s · {formatDateTime(session.ended_at ?? session.updated_at)}
        </p>
        {summary && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-800">
            <p className="font-bold text-emerald-800">
              {isBn ? 'সারসংক্ষেপ' : 'Summary'}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
        {hasAxes && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {[
              { k: 'communication', label: isBn ? 'যোগাযোগ' : 'Communication' },
              { k: 'technical', label: isBn ? 'প্রযুক্তিগত' : 'Technical' },
              { k: 'problem_solving', label: isBn ? 'সমস্যা সমাধান' : 'Problem Solving' },
              { k: 'confidence', label: isBn ? 'আত্মবিশ্বাস' : 'Confidence' },
              { k: 'grammar', label: isBn ? 'ব্যাকরণ' : 'Grammar' },
            ].map(({ k, label }) => {
              const v = axes[k];
              if (typeof v !== 'number') return null;
              return (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold text-slate-700 ring-1 ring-emerald-200"
                  title={k === 'confidence' ? (isBn ? 'উত্তরের গুণমানের উপর ভিত্তি করে (ক্যামেরা নয়)' : 'Based on answer quality (not camera)') : undefined}
                >
                  {label} <span className="font-mono text-emerald-700">{v}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FeedbackCard
          title={isBn ? 'শক্তি' : 'Strengths'}
          tone="emerald"
          items={strengths}
          emptyText={isBn ? 'কোনো শক্তি পাওয়া যায়নি' : 'No strengths highlighted'}
        />
        <FeedbackCard
          title={isBn ? 'উন্নতির জায়গা' : 'Areas to improve'}
          tone="rose"
          items={weaknesses}
          emptyText={isBn ? 'কোনো দুর্বলতা পাওয়া যায়নি' : 'No weaknesses flagged'}
        />
        <FeedbackCard
          title={isBn ? 'প্রস্তাবনা' : 'Recommendations'}
          tone="indigo"
          items={recommendations}
          emptyText={isBn ? 'কোনো প্রস্তাবনা নেই' : 'No recommendations yet'}
        />
        <FeedbackCard
          title={isBn ? 'পরবর্তী পদক্ষেপ' : 'Next steps'}
          tone="amber"
          items={nextSteps}
          emptyText={isBn ? 'কোনো পদক্ষেপ নেই' : 'No next steps yet'}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          {isBn ? 'প্রশ্ন ও উত্তর' : 'Questions & answers'}
        </p>
        <ol className="mt-2 space-y-2">
          {questions.map((q, i) => {
            const a = answers.find((x) => x.questionId === q.id) ?? null;
            return (
              <li key={q.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500">
                  <DifficultyPill difficulty={q.difficulty} />
                  {isBn ? `প্রশ্ন ${q.question_index}` : `Question ${q.question_index}`}
                  {a?.score != null && (
                    <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">
                      <Star size={10} /> {a.score}/100
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{q.question_text}</p>
                {a ? (
                  <p className="mt-1 rounded-md bg-white p-2 text-[12px] text-slate-700 ring-1 ring-slate-200">
                    {a.answerText}
                  </p>
                ) : (
                  <p className="mt-1 italic text-slate-400 text-[11px]">
                    {isBn ? '(উত্তর দেওয়া হয়নি)' : '(no answer)'}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/dashboard/mentor/report/${session.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-extrabold text-white shadow"
        >
          <FileText size={14} />
          {isBn ? 'সম্পূর্ণ রিপোর্ট দেখো' : 'View full report'}
        </Link>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-extrabold text-white shadow"
        >
          <RefreshCw size={14} />
          {isBn ? 'আরেকটি ইন্টারভিউ' : 'New interview'}
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <History size={13} />
          {isBn ? 'ইতিহাস দেখো' : 'View history'}
        </button>
      </div>
    </div>
  );
};

const FeedbackCard: React.FC<{
  title: string;
  tone: 'emerald' | 'rose' | 'indigo' | 'amber';
  items: string[];
  emptyText: string;
}> = ({ title, tone, items, emptyText }) => {
  const toneClass: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div className={cn('rounded-2xl border p-3 shadow-sm', toneClass[tone])}>
      <p className="text-[10px] font-extrabold uppercase tracking-wider">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] italic opacity-70">{emptyText}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px]">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
};





const HistoryPane: React.FC<{
  rows: InterviewHistoryRow[];
  loading: boolean;
  language: string;
  onRefresh: () => void;
  onNew: () => void;
}> = ({ rows, loading, language, onRefresh, onNew }) => {
  const isBn = language === 'bn';
  return (
    <div className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {isBn ? 'আমার ইন্টারভিউ ইতিহাস' : 'My Interview History'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {isBn
              ? 'প্রতিটি ইন্টারভিউ সুপাবেসে সংরক্ষিত থাকে।'
              : 'Every interview is saved to Supabase.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={11} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-[11px] font-extrabold text-white shadow"
          >
            <PlayCircle size={11} />
            {isBn ? 'নতুন ইন্টারভিউ' : 'New Interview'}
          </button>
        </div>
      </div>

      {loading && rows.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">
          <Loader2 size={14} className="mx-auto animate-spin" />
          <p className="mt-2">{isBn ? 'লোড হচ্ছে…' : 'Loading…'}</p>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-500">
          <FileText size={28} className="mx-auto text-slate-400" />
          <p className="mt-2 font-semibold">
            {isBn
              ? 'এখনও কোনো ইন্টারভিউ নেই। আজকের ইন্টারভিউ শুরু করো!'
              : 'No interviews yet. Start one today!'}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">{isBn ? 'তারিখ' : 'Date'}</th>
                <th className="px-3 py-2">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                <th className="px-3 py-2">{isBn ? 'সাব ক্যাটাগরি' : 'Sub-category'}</th>
                <th className="px-3 py-2">{isBn ? 'সময়কাল' : 'Duration'}</th>
                <th className="px-3 py-2">{isBn ? 'অবস্থা' : 'Status'}</th>
                <th className="px-3 py-2">{isBn ? 'স্কোর' : 'Score'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const sl = statusLabel(r.status);
                const fb = (r.feedback ?? {}) as Record<string, any>;
                const fbSummary = typeof fb.summary === 'string' ? fb.summary : null;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="bg-white">
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {formatDateTime(r.started_at)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.category_name}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.sub_category_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {Math.floor(r.interview_duration / 60)}m {r.interview_duration % 60}s
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ring-1',
                            sl.tone,
                          )}
                        >
                          {sl.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.score != null ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <Star size={11} /> {r.score}/100
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    {fbSummary && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={6} className="px-3 pb-3 pt-1 text-[11px] text-slate-600">
                          <p className="font-bold text-slate-700">
                            {isBn ? 'AI ফিডব্যাক' : 'AI Feedback'}
                          </p>
                          <p className="mt-1 line-clamp-3">{fbSummary}</p>
                          {Array.isArray(fb.strengths) && fb.strengths.length > 0 && (
                            <p className="mt-1 text-emerald-700">
                              ✓ {fb.strengths.slice(0, 3).join(' · ')}
                            </p>
                          )}
                          {Array.isArray(fb.weaknesses) && fb.weaknesses.length > 0 && (
                            <p className="mt-0.5 text-rose-700">
                              ✗ {fb.weaknesses.slice(0, 3).join(' · ')}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};





const LockedBanner: React.FC<{
  nextAvailableAt: string | null;
  language: string;
  remainingSeconds: number;
}> = ({ nextAvailableAt, language, remainingSeconds }) => {
  const isBn = language === 'bn';
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
      <p className="flex items-center gap-1 font-extrabold">
        <Clock size={11} />
        {isBn ? 'পরবর্তী ইন্টারভিউ' : 'Next interview available in'}
      </p>
      <p className="mt-1 font-mono text-lg font-extrabold tabular-nums">
        {formatCountdown(remainingSeconds)}
      </p>
      {nextAvailableAt && (
        <p className="mt-1 text-[10px] opacity-70">
          {isBn ? 'নির্ধারিত সময়:' : 'Scheduled:'} {formatDateTime(nextAvailableAt)}
        </p>
      )}
    </div>
  );
};





export const AICareerMentorPage: React.FC = () => {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  return <InterviewComingSoon />;
};


















const _LegacyImplementationPlaceholder: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isBn = language === 'bn';

  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  
  const [canStartResult, setCanStartResult] = useState<{
    can_start: boolean;
    next_available_at: string | null;
    reason: string;
    active_session_id: string | null;
  } | null>(null);

  
  const [phase, setPhase] = useState<Phase>('config');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(INTERVIEW_DURATION_SECONDS);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, setEnding] = useState(false);

  
  const [inputValue, setInputValue] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  
  const [history, setHistory] = useState<InterviewHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  
  
  
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await loadInterviewCategories();
        if (!cancelled) setCategories(cats);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load categories.');
      }
      try {
        const cs = await canStartInterview();
        if (!cancelled) setCanStartResult(cs);
      } catch {
        
      }
    })();
    return () => { cancelled = true; };
  }, []);

  
  
  
  
  
  
  
  
  
  
  useEffect(() => {
    let cancelled = false;
    const cs = canStartResult;
    if (!cs || cs.reason !== 'active_session_exists' || !cs.active_session_id) return;
    void (async () => {
      try {
        const detail = await getInterviewSessionDetail(cs.active_session_id!);
        if (cancelled) return;
        if (!detail.questions || detail.questions.length === 0) {
          
          await cancelInterviewSession({
            sessionId: cs.active_session_id!,
            reason: 'cancelled_pre_question',
          });
          setCanStartResult(await canStartInterview());
        }
        
      } catch (e: any) {
        
        
        
        console.warn('[interview] recovery probe failed (silent)');
      }
    })();
    return () => { cancelled = true; };
  }, [canStartResult?.active_session_id, canStartResult?.reason]);

  
  useRealtimeRefresh('categories', () => {
    void (async () => {
      try {
        setCategories(await loadInterviewCategories());
      } catch {
        
      }
    })();
  });
  useRealtimeRefresh('sub_categories', () => {
    if (selectedCategoryId) {
      void (async () => {
        try {
          setSubCategories(await loadInterviewSubCategories(selectedCategoryId));
        } catch {
          
        }
      })();
    }
  });

  
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubCategories([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const subs = await loadInterviewSubCategories(selectedCategoryId);
        if (!cancelled) setSubCategories(subs);
      } catch {
        if (!cancelled) setSubCategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCategoryId]);

  
  
  
  useEffect(() => {
    const unsub = subscribeMyInterviewSessions(() => {
      void (async () => {
        try {
          setCanStartResult(await canStartInterview());
        } catch {
          
        }
      })();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeInterviewQuestions(() => {  });
    const unsubAns = subscribeInterviewAnswers(() => {  });
    return () => { unsub(); unsubAns(); };
  }, []);

  
  
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);
    const rec = new SR();
    rec.lang = isBn ? 'bn-BD' : 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      let txt = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        txt += ev.results[i][0].transcript;
      }
      setVoiceTranscript(txt.trim());
    };
    rec.onend = () => setVoiceListening(false);
    rec.onerror = () => setVoiceListening(false);
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {  }
      recognitionRef.current = null;
    };
  }, [isBn]);

  const toggleVoice = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (voiceListening) {
      try { rec.stop(); } catch {  }
      setVoiceListening(false);
    } else {
      setVoiceTranscript('');
      try {
        rec.start();
        setVoiceListening(true);
      } catch {
        setVoiceListening(false);
      }
    }
  };

  
  
  
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listMyInterviewHistory(50));
    } catch (e: any) {
      console.warn('[interview] history load failed:', e?.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useRealtimeRefresh('interview_sessions', () => {
    void loadHistory();
  });

  
  
  
  useEffect(() => {
    if (phase !== 'active' || !sessionState?.session) return;
    const session = sessionState.session;
    const tickFn = () => {
      const r = secondsRemaining(session);
      setRemainingSeconds(r);
      if (r === 0) {
        
        void autoComplete('timer');
      }
    };
    tickFn();
    const id = window.setInterval(tickFn, 500);
    return () => window.clearInterval(id);
    
  }, [phase, sessionState?.session?.id]);

  
  
  
  
  
  
  
  
  
  
  
  
  const sessionStateRef = useRef(sessionState);
  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePageHide = () => {
      const ss = sessionStateRef.current;
      if (!ss?.session) return;
      if (!isResumableSessionStatus(ss.session.status)) return;
      
      const hasQuestions = ss.questions.length > 0;
      if (hasQuestions) return; 
      
      
      
      try {
        void cancelInterviewSession({
          sessionId: ss.session.id,
          reason: 'cancelled_browser_event',
        });
      } catch {  }
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, []);

  const autoCompleteRef = useRef<((reason: 'timer' | 'user_submitted' | 'manual_abandon') => Promise<void>) | null>(null);

  const autoComplete = useCallback(
    async (reason: 'timer' | 'user_submitted' | 'manual_abandon') => {
      if (!sessionState?.session) return;
      if (!isResumableSessionStatus(sessionState.session.status)) return;
      if (autoCompleteRef.current && reason === 'timer' && autoCompleteRef.current !== autoComplete) {
        return;
      }
      autoCompleteRef.current = autoComplete;
      setEnding(true);
      try {
        const answers = sessionState.answers;
        const finalScore = answers.length
          ? Math.round(answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / answers.length)
          : 0;
        const completed = await completeInterviewSession({
          sessionId: sessionState.session.id,
          score: finalScore,
          feedback: sessionState.session.feedback ?? {},
          reason,
        });
        setSessionState((prev) => prev ? { ...prev, session: completed } : prev);
        setPhase('completed');
      } catch (e: any) {
        setError(e?.message || 'Could not finalize the interview.');
      } finally {
        setEnding(false);
      }
    },
    [sessionState?.session?.id, sessionState?.answers],
  );

  
  
  
  const generateNext = useCallback(
    async (currentState: SessionState, plannedIndex: number): Promise<InterviewQuestion | null> => {
      const plannedDiff = planDifficulty(plannedIndex);
      const previousQuestions = currentState.questions.map((q) => q.question_text);
      const previousAnswers = currentState.questions.map((q) => {
        const a = currentState.answers.find((x) => x.questionId === q.id);
        return a?.answerText ?? '';
      });
      setLoadingQuestion(true);
      const generateNextRetried = false; 
      const sleepLocal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      try {
        const generated = await generateInterviewQuestion({
          sessionId: currentState.session.id,
          categoryName: currentState.session.category_name,
          subCategoryName: currentState.session.sub_category_name,
          difficulty: plannedDiff,
          questionIndex: plannedIndex,
          previousQuestions,
          previousAnswers,
          locale: isBn ? 'bn' : 'en',
        });
        const stored = await recordInterviewQuestion({
          sessionId: currentState.session.id,
          questionIndex: plannedIndex,
          difficulty: generated.difficulty,
          questionText: generated.question_text,
          hint: generated.hint,
          generationMs: generated.generation_ms,
        });
        
        (stored as any).personalization = generated.personalization;
        if (generated.source) (stored as any).source = generated.source;
        return stored;
      } catch (e: any) {
        
        
        
        
        if (!generateNextRetried) {
          await sleepLocal(900);
          try {
            const generated = await generateInterviewQuestion({
              sessionId: currentState.session.id,
              categoryName: currentState.session.category_name,
              subCategoryName: currentState.session.sub_category_name,
              difficulty: plannedDiff,
              questionIndex: plannedIndex,
              previousQuestions,
              previousAnswers,
              locale: isBn ? 'bn' : 'en',
            });
            const stored = await recordInterviewQuestion({
              sessionId: currentState.session.id,
              questionIndex: plannedIndex,
              difficulty: generated.difficulty,
              questionText: generated.question_text,
              hint: generated.hint,
              generationMs: generated.generation_ms,
            });
            (stored as any).personalization = generated.personalization;
            if (generated.source) (stored as any).source = generated.source;
            return stored;
          } catch (e2: any) {
            
          }
        }
        setError(
          e?.message || (
            isBn
              ? 'SkillProof AI প্রশ্ন প্রস্তুত করছে। একটু পরে আবার চেষ্টা করো।'
              : 'SkillProof AI is preparing your next question. Please try again in a moment.'
          ),
        );
        return null;
      } finally {
        setLoadingQuestion(false);
      }
    },
    [isBn],
  );

  
  
  
  const onStart = async () => {
    if (!selectedCategoryId) {
      setError(isBn ? 'একটি ক্যাটাগরি বেছে নাও।' : 'Select a category first.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      
      
      
      const started = await startInterviewWithQuestion({
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
        difficulty: 'Easy',
        locale: isBn ? 'bn' : 'en',
      });
      const { session, question } = started;
      setSessionState({ session, questions: [question], answers: [] });
      setRemainingSeconds(INTERVIEW_DURATION_SECONDS);
      setPhase('active');
      
      void (async () => {
        try { setCanStartResult(await canStartInterview()); } catch {  }
      })();
    } catch (e: any) {
      
      
      
      setPhase('config');
      setSessionState(null);
      setError(e?.message || (isBn ? 'শুরু করা যায়নি।' : 'Could not start.'));
      void (async () => {
        try { setCanStartResult(await canStartInterview()); } catch {  }
      })();
    } finally {
      setStarting(false);
    }
  };

  
  
  
  const onSubmitAnswer = async (answerText: string) => {
    if (!sessionState) return;
    if (!answerText.trim()) {
      setError(isBn ? 'উত্তর লেখো বা ভয়েস ব্যবহার করো।' : 'Please provide an answer.');
      return;
    }
    const currentQ = sessionState.questions[sessionState.questions.length - 1];
    if (!currentQ) {
      setError(isBn ? 'কোনো সক্রিয় প্রশ্ন নেই।' : 'No active question.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const startedAt = performance.now();
    try {
      
      const grading = await gradeInterviewAnswer({
        sessionId: sessionState.session.id,
        questionId: currentQ.id,
        questionText: currentQ.question_text,
        answerText,
        categoryName: sessionState.session.category_name,
        subCategoryName: sessionState.session.sub_category_name,
        locale: isBn ? 'bn' : 'en',
      });
      
      await recordInterviewAnswer({
        questionId: currentQ.id,
        answerText,
        responseMs: Math.round(performance.now() - startedAt),
        score: grading.score,
      });
      
      const newAnswer: AnswerRecord = {
        questionId: currentQ.id,
        questionIndex: currentQ.question_index,
        questionText: currentQ.question_text,
        difficulty: currentQ.difficulty,
        answerText,
        score: grading.score,
        feedback: grading.feedback,
        responseMs: Math.round(performance.now() - startedAt),
      };
      const updated: SessionState = {
        ...sessionState,
        answers: [...sessionState.answers, newAnswer],
      };
      setSessionState(updated);
      setInputValue('');
      setVoiceTranscript('');

      
      const remainingMs = secondsRemaining(updated.session);
      const nextIndex = updated.questions.length + 1;
      
      if (remainingMs < 5000 || nextIndex > 12) {
        await completeWithFinal(updated, grading.feedback);
      } else {
        const nextQ = await generateNext(updated, nextIndex);
        if (nextQ) {
          setSessionState((prev) =>
            prev ? { ...prev, questions: [...prev.questions, nextQ] } : prev,
          );
        } else {
          
          await completeWithFinal(updated, grading.feedback);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Could not submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  
  
  
  
  
  
  const completeWithFinal = useCallback(
    async (state: SessionState, lastFeedback: Record<string, any> | null) => {
      try {
        const evalResult = await evaluateInterviewFinal({
          sessionId: state.session.id,
          categoryName: state.session.category_name,
          subCategoryName: state.session.sub_category_name,
          answers: state.questions.map((q) => {
            const a = state.answers.find((x) => x.questionId === q.id);
            return {
              questionText: q.question_text,
              answerText: a?.answerText ?? '(no answer)',
              score: a?.score ?? 0,
            };
          }),
          locale: isBn ? 'bn' : 'en',
        });

        
        
        
        const merged: Record<string, any> = {
          summary: evalResult.summary,
          strengths: evalResult.strengths,
          weaknesses: evalResult.weaknesses,
          recommendations: evalResult.recommendations,
          next_steps: evalResult.recommendations, 
          career_advice: evalResult.career_advice,
          recommended_skills: evalResult.recommended_skills,
          recommended_roadmap: evalResult.recommended_roadmap,
          recommended_verification: evalResult.recommended_verification,
          axes: {
            communication: evalResult.communication,
            technical: evalResult.technical,
            problem_solving: evalResult.problem_solving,
            confidence: evalResult.confidence,
            grammar: evalResult.grammar,
          },
          evaluator_version: 'v1',
        };
        if (lastFeedback) {
          merged.last_answer_feedback = lastFeedback;
        }

        const completed = await completeInterviewSession({
          sessionId: state.session.id,
          score: evalResult.overall,
          feedback: merged,
          reason: 'user_submitted',
        });

        
        
        const enriched: InterviewSession = {
          ...completed,
          communication_score: evalResult.communication,
          technical_score: evalResult.technical,
          problem_solving_score: evalResult.problem_solving,
          confidence_score: evalResult.confidence,
          grammar_score: evalResult.grammar,
          evaluated_at: new Date().toISOString(),
        };

        setSessionState((prev) => (prev ? { ...prev, session: enriched } : prev));
        setPhase('completed');
      } catch (e: any) {
        
        const finalScore = state.answers.length
          ? Math.round(state.answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / state.answers.length)
          : 0;
        const completed = await completeInterviewSession({
          sessionId: state.session.id,
          score: finalScore,
          feedback: { error: 'final_grading_failed', detail: e?.message ?? '' },
          reason: 'user_submitted',
        });
        setSessionState((prev) => prev ? { ...prev, session: completed } : prev);
        setPhase('completed');
      } finally {
        void loadHistory();
      }
    },
    [isBn, loadHistory],
  );

  const onAbandon = async () => {
    if (!sessionState?.session) return;
    const ok = window.confirm(
      isBn
        ? 'সত্যিই কি ইন্টারভিউ ছেড়ে দিতে চাও?'
        : 'Are you sure you want to abandon this interview?',
    );
    if (!ok) return;
    await autoComplete('manual_abandon');
  };

  const onNewAfterComplete = () => {
    setSessionState(null);
    setPhase('config');
    setError(null);
    setInputValue('');
    setVoiceTranscript('');
    void (async () => {
      try { setCanStartResult(await canStartInterview()); } catch {  }
    })();
  };

  
  
  
  
  
  
  
  const onResume = async () => {
    const activeId = canStartResult?.active_session_id;
    if (!activeId) return;
    setStarting(true);
    setError(null);
    try {
      const detail = await getInterviewSessionDetail(activeId);
      if (!detail.session) {
        
        setCanStartResult(await canStartInterview());
        return;
      }
      if (!isResumableSessionStatus(detail.session.status)) {
        
        setCanStartResult(await canStartInterview());
        return;
      }
      if (!detail.questions || detail.questions.length === 0) {
        
        
        
        
        await cancelInterviewSession({
          sessionId: activeId,
          reason: 'cancelled_pre_question',
        });
        setCanStartResult(await canStartInterview());
        return;
      }
      const answers: AnswerRecord[] = detail.answers.map((a) => {
        const q = detail.questions.find((qq) => qq.id === a.question_id);
        return {
          questionId: a.question_id,
          questionIndex: q?.question_index ?? 0,
          questionText: q?.question_text ?? '',
          difficulty: (q?.difficulty ?? 'Easy') as any,
          answerText: a.answer_text,
          score: a.score ?? null,
          feedback: (a as any).feedback ?? null,
          responseMs: a.response_ms ?? 0,
        };
      });
      const remaining = secondsRemaining(detail.session);

      
      
      
      const sortedQuestions = [...detail.questions].sort(
        (a, b) => (a.question_index ?? 0) - (b.question_index ?? 0),
      );

      setSessionState({
        session: detail.session,
        questions: sortedQuestions,
        answers,
      });
      setRemainingSeconds(remaining);

      
      
      
      
      if (remaining <= 0) {
        try {
          await autoComplete('timer');
        } catch (e: any) {
          setError(
            isBn
              ? 'আগের ইন্টারভিউ শেষ হয়ে গেছে।'
              : 'Your previous interview has already timed out.',
          );
        }
        return;
      }

      
      
      
      
      const allAnswered = sortedQuestions.every((q) =>
        answers.some((a) => a.questionId === q.id),
      );
      if (allAnswered && sortedQuestions.length > 0) {
        try {
          await completeWithFinal(
            { session: detail.session, questions: sortedQuestions, answers },
            answers[answers.length - 1]?.feedback ?? null,
          );
        } catch (e: any) {
          setError(
            isBn
              ? 'ফলাফল গণনা করা যায়নি।'
              : 'Could not compute the final report.',
          );
        }
        return;
      }
      setPhase('active');
    } catch (e: any) {
      
      
      
      const msg = String(e?.message || '');
      const friendly =
        msg === 'interview_session_not_found'
          ? (isBn
              ? 'পুরোনো ইন্টারভিউটি আর পাওয়া যাচ্ছে না। নতুন করে শুরু করো।'
              : 'That previous interview is no longer available. Start a fresh one.')
          : msg === 'interview_session_forbidden'
            ? (isBn
                ? 'এই ইন্টারভিউতে প্রবেশের অনুমতি নেই।'
                : 'You don\u2019t have access to that interview.')
            : msg === 'interview_session_unavailable'
              ? (isBn
                  ? 'নেটওয়ার্ক সমস্যা। একটু পরে আবার চেষ্টা করো।'
                  : 'Network problem. Please try again in a moment.')
              : msg === 'interview_session_invalid_id'
                ? (isBn
                    ? 'এই ইন্টারভিউ আইডি অবৈধ।'
                    : 'That interview id is invalid.')
                : msg === 'interview_session_failed'
                  ? (isBn
                      ? 'সার্ভারে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।'
                      : 'Server hiccup. Please try again in a moment.')
                  : (isBn ? 'রিজিউম করা যায়নি।' : 'Could not resume.');
      setError(friendly);
    } finally {
      setStarting(false);
    }
  };

  const onShowHistory = async () => {
    setPhase('viewing_history');
    await loadHistory();
  };

  
  
  
  const lockRemaining = useMemo(() => {
    if (!canStartResult?.next_available_at) return 0;
    const ms = new Date(canStartResult.next_available_at).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  }, [canStartResult?.next_available_at, history.length]); 

  const canStartMessage = useMemo<{ en: string; bn: string } | null>(() => {
    if (!canStartResult) return null;
    if (canStartResult.reason === 'allowed') {
      return {
        en: 'You can start an interview right now.',
        bn: 'তুমি এখনই একটি ইন্টারভিউ শুরু করতে পারো।',
      };
    }
    if (canStartResult.reason === 'not_authenticated') {
      return { en: 'Please sign in to start an interview.', bn: 'সাইন ইন করো।' };
    }
    if (canStartResult.reason === 'active_session_exists') {
      return {
        en: 'You already have an interview in progress. Resume it below.',
        bn: 'একটি ইন্টারভিউ চলমান আছে।',
      };
    }
    if (canStartResult.reason === 'daily_limit') {
      return {
        en: 'You can only start one interview every 24 hours. See the countdown below.',
        bn: 'প্রতি ২৪ ঘন্টায় ১টি ইন্টারভিউ — কাউন্টডাউন দেখো।',
      };
    }
    return {
      en: 'Status unknown — try again in a moment.',
      bn: 'অবস্থা অজানা — আবার চেষ্টা করো।',
    };
  }, [canStartResult]);

  
  
  
  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
      {}
      <aside className="flex h-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
          >
            <ArrowLeft size={12} /> {isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
          </Link>
          <span className="text-[10px] text-slate-400">AI Interview v1</span>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-3 text-[11px] text-slate-700">
          <p className="flex items-center gap-1 font-extrabold text-indigo-700">
            <Bot size={11} /> {isBn ? 'কীভাবে কাজ করে' : 'How it works'}
          </p>
          <ul className="mt-1.5 space-y-1">
            <li className="flex items-start gap-1">
              <span className="mt-0.5 text-indigo-500">1.</span>
              <span>
                {isBn ? 'ক্যাটাগরি বেছে নাও' : 'Pick a category'}
              </span>
            </li>
            <li className="flex items-start gap-1">
              <span className="mt-0.5 text-indigo-500">2.</span>
              <span>
                {isBn ? '৩ মিনিটের মক ইন্টারভিউ' : '3-minute mock interview'}
              </span>
            </li>
            <li className="flex items-start gap-1">
              <span className="mt-0.5 text-indigo-500">3.</span>
              <span>
                {isBn ? 'AI তোমার সিভি + ক্যারিয়ার প্রোফাইল থেকে প্রশ্ন তৈরি করে' : 'AI uses your CV + profile'}
              </span>
            </li>
            <li className="flex items-start gap-1">
              <span className="mt-0.5 text-indigo-500">4.</span>
              <span>
                {isBn ? '২৪ ঘন্টায় ১টি' : '1 per day'}
              </span>
            </li>
          </ul>
        </div>

        {canStartResult && !canStartResult.can_start && lockRemaining > 0 && (
          <LockedBanner
            nextAvailableAt={canStartResult.next_available_at}
            language={language}
            remainingSeconds={lockRemaining}
          />
        )}

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
          <p className="font-extrabold text-slate-800">
            {isBn ? 'ব্যক্তিগতকরণ' : 'Personalisation'}
          </p>
          <p className="mt-1">
            {isBn
              ? 'SkillProof AI তোমার আপলোড করা ডেটা থেকেই প্রশ্ন তৈরি করে।'
              : 'SkillProof AI bases questions on your uploaded data.'}
          </p>
        </div>
      </aside>

      {}
      <section className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        {phase === 'config' && (
          <ConfigurationPane
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            subCategories={subCategories}
            selectedSubCategoryId={selectedSubCategoryId}
            setSelectedSubCategoryId={setSelectedSubCategoryId}
            canStart={!!canStartResult?.can_start}
            canStartReason={canStartResult?.reason ?? 'unknown'}
            canStartMessage={canStartMessage}
            canStartActiveSessionId={canStartResult?.active_session_id ?? null}
            loading={starting}
            language={language}
            onStart={onStart}
            onResume={() => void onResume()}
            onGoHistory={() => void onShowHistory()}
            historyCount={history.length}
          />
        )}

        {phase === 'active' && sessionState && remainingSeconds > 0 && (
          <ActiveInterviewPane
            state={sessionState}
            remainingSeconds={remainingSeconds}
            language={language}
            loadingQuestion={loadingQuestion}
            submitting={submitting}
            error={error}
            onSubmit={onSubmitAnswer}
            onAbandon={onAbandon}
            inputValue={inputValue}
            setInputValue={setInputValue}
            voiceSupported={voiceSupported}
            voiceListening={voiceListening}
            voiceTranscript={voiceTranscript}
            setVoiceTranscript={setVoiceTranscript}
            onToggleVoice={toggleVoice}
          />
        )}

        {phase === 'active' && sessionState && remainingSeconds === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
            <Lock size={28} className="mx-auto text-amber-500" />
            <p className="mt-2 text-sm font-extrabold text-amber-800">
              {isBn ? 'সময় শেষ!' : 'Time up!'}
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              {isBn ? 'ফলাফল গণনা করা হচ্ছে…' : 'Computing final report…'}
            </p>
          </div>
        )}

        {phase === 'completed' && sessionState && (
          <CompletedPane
            session={sessionState.session}
            questions={sessionState.questions}
            answers={sessionState.answers}
            language={language}
            onNew={onNewAfterComplete}
            onHistory={() => void onShowHistory()}
          />
        )}

        {phase === 'viewing_history' && (
          <HistoryPane
            rows={history}
            loading={historyLoading}
            language={language}
            onRefresh={() => void loadHistory()}
            onNew={onNewAfterComplete}
          />
        )}

        {error && phase === 'config' && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            <CircleAlert size={11} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AICareerMentorPage;
