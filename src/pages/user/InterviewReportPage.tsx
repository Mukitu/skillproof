
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  History,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getInterviewSessionDetail,
  type EvaluationResult,
} from '../../services/interview';
import type {
  InterviewQuestion,
  InterviewSession,
} from '../../types/database';
import {
  downloadInterviewReportPdf,
} from '../../services/interviewReportDownload';





interface LoadedReport {
  session: InterviewSession;
  questions: InterviewQuestion[];
}

const EMPTY_EVAL: EvaluationResult = {
  overall: 0,
  communication: 0,
  technical: 0,
  problem_solving: 0,
  confidence: 0,
  grammar: 0,
  summary: '',
  strengths: [],
  weaknesses: [],
  recommendations: [],
  career_advice: '',
  recommended_skills: [],
  recommended_roadmap: { title: '', reason: '' },
  recommended_verification: { title: '', reason: '' },
};

function deriveEvaluation(session: InterviewSession): EvaluationResult {
  const fb = (session.feedback ?? {}) as Record<string, any>;
  const ai = fb.ai_evaluation && typeof fb.ai_evaluation === 'object' ? fb.ai_evaluation : {};
  const axes = fb.axes && typeof fb.axes === 'object' ? fb.axes : {};
  const fallback = (k: keyof EvaluationResult, fallback: number) =>
    typeof axes[k] === 'number'
      ? (axes[k] as number)
      : typeof (session as any)[`${k}_score`] === 'number'
        ? (session as any)[`${k}_score`]
        : fallback;
  return {
    overall: session.score ?? (typeof ai.overall === 'number' ? ai.overall : 0),
    communication: fallback('communication', 0),
    technical: fallback('technical', 0),
    problem_solving: fallback('problem_solving', 0),
    confidence: fallback('confidence', 0),
    grammar: fallback('grammar', 0),
    summary: typeof fb.summary === 'string' ? fb.summary : '',
    strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
    weaknesses: Array.isArray(fb.weaknesses) ? fb.weaknesses : [],
    recommendations: Array.isArray(fb.recommendations) ? fb.recommendations : [],
    career_advice:
      typeof ai.career_advice === 'string'
        ? ai.career_advice
        : typeof fb.career_advice === 'string'
          ? fb.career_advice
          : '',
    recommended_skills: Array.isArray(ai.recommended_skills)
      ? ai.recommended_skills
      : Array.isArray(fb.recommended_skills)
        ? fb.recommended_skills
        : [],
    recommended_roadmap:
      ai.recommended_roadmap && typeof ai.recommended_roadmap === 'object'
        ? {
            title: String(ai.recommended_roadmap.title ?? ''),
            reason: String(ai.recommended_roadmap.reason ?? ''),
          }
        : fb.recommended_roadmap && typeof fb.recommended_roadmap === 'object'
          ? {
              title: String(fb.recommended_roadmap.title ?? ''),
              reason: String(fb.recommended_roadmap.reason ?? ''),
            }
          : EMPTY_EVAL.recommended_roadmap,
    recommended_verification:
      ai.recommended_verification && typeof ai.recommended_verification === 'object'
        ? {
            title: String(ai.recommended_verification.title ?? ''),
            reason: String(ai.recommended_verification.reason ?? ''),
          }
        : fb.recommended_verification && typeof fb.recommended_verification === 'object'
          ? {
              title: String(fb.recommended_verification.title ?? ''),
              reason: String(fb.recommended_verification.reason ?? ''),
            }
          : EMPTY_EVAL.recommended_verification,
  };
}

function getScoreTier(score: number): { color: string; bg: string; ring: string; label_en: string; label_bn: string } {
  if (score >= 70) {
    return { color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'stroke-emerald-500', label_en: 'Strong', label_bn: 'চমৎকার' };
  }
  if (score >= 40) {
    return { color: 'text-amber-700', bg: 'bg-amber-50', ring: 'stroke-amber-500', label_en: 'Developing', label_bn: 'উন্নতির পথে' };
  }
  return { color: 'text-rose-700', bg: 'bg-rose-50', ring: 'stroke-rose-500', label_en: 'Needs work', label_bn: 'আরও চেষ্টা দরকার' };
}

function CircularProgress({
  value,
  size = 144,
  strokeWidth = 12,
  color = 'stroke-emerald-500',
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safe / 100) * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={`fill-none transition-[stroke-dashoffset] duration-1000 ease-out ${color}`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800">
        <div className="font-mono text-3xl font-extrabold leading-none">{safe}</div>
        {label && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>}
      </div>
    </div>
  );
}

function AxisCard({
  label,
  value,
  icon: Icon,
  hint,
  isBn,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hint?: string;
  isBn: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const tier = getScoreTier(v);
  return (
    <div className={`rounded-2xl border border-slate-200 ${tier.bg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow ring-1 ring-slate-200">
            <Icon size={16} className={tier.color} />
          </div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">{label}</div>
        </div>
        <div className={`font-mono text-lg font-extrabold ${tier.color}`}>
          {v}
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-2 rounded-full ${tier.color.replace('text-', 'bg-')}`}
          style={{ width: `${v}%`, transition: 'width 1s ease-out' }}
        />
      </div>
      {hint && (
        <p className="mt-2 text-[10px] leading-tight text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function BulletSection({
  title,
  items,
  tone,
  emptyText,
}: {
  title: string;
  items: string[];
  tone: 'emerald' | 'rose' | 'indigo' | 'amber';
  emptyText: string;
}) {
  const toneClass: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass[tone]}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wider">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-[11px] italic opacity-70">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 pl-4 text-[12px]">
          {items.map((it, i) => (
            <li key={i} className="leading-snug">
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}





export const InterviewReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [data, setData] = useState<LoadedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!sessionId) {
        setError('Missing session id.');
        setLoading(false);
        return;
      }
      try {
        const detail = await getInterviewSessionDetail(sessionId);
        if (!cancelled) {
          setData({
            session: detail.session as InterviewSession,
            questions: detail.questions as InterviewQuestion[],
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Could not load the report.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const evaluation = useMemo<EvaluationResult>(() => {
    if (!data) return EMPTY_EVAL;
    return deriveEvaluation(data.session);
  }, [data]);

  const overall = Math.max(0, Math.min(100, Math.round(evaluation.overall || 0)));
  const overallTier = getScoreTier(overall);

  const onDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadInterviewReportPdf({
        session: {
          id: data.session.id,
          category_name: data.session.category_name,
          sub_category_name: data.session.sub_category_name,
          interview_duration: data.session.interview_duration,
          started_at: data.session.started_at,
          ended_at: data.session.ended_at,
          score: data.session.score,
        },
        evaluation,
        questions: data.questions.map((q) => ({
          id: q.id,
          question_index: q.question_index,
          difficulty: q.difficulty,
          question_text: q.question_text,
          answer: null,
        })),
        profile: null,
        language: isBn ? 'bn' : 'en',
      });
    } catch (e: any) {
      console.error('[report] PDF download failed:', e?.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm font-semibold">
            {isBn ? 'রিপোর্ট লোড হচ্ছে…' : 'Loading your report…'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <AlertCircle size={32} className="mx-auto text-rose-500" />
        <h2 className="mt-2 text-lg font-extrabold text-rose-800">
          {isBn ? 'রিপোর্ট লোড করা যায়নি' : 'Could not load report'}
        </h2>
        <p className="mt-1 text-[12px] text-rose-700">{error ?? '—'}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700"
          >
            <RefreshCw size={12} />
            {isBn ? 'আবার চেষ্টা করো' : 'Retry'}
          </button>
          <Link
            to="/dashboard/mentor"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <History size={12} />
            {isBn ? 'ইন্টারভিউ সিমুলেটর' : 'Interview Simulator'}
          </Link>
        </div>
      </div>
    );
  }

  const { session, questions } = data;
  const dateLabel = session.ended_at
    ? new Date(session.ended_at).toLocaleString()
    : new Date(session.started_at).toLocaleString();

  return (
    <div className="space-y-5 pb-10">
      {}
      <div
        className={`relative overflow-hidden rounded-3xl border ${overallTier.ring ? 'border-emerald-200' : 'border-slate-200'} ${overallTier.bg} p-4 shadow-sm sm:p-6`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="relative flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <CircularProgress
              value={overall}
              size={120}
              strokeWidth={11}
              color={overallTier.ring}
              label={isBn ? overallTier.label_bn : overallTier.label_en}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                <Sparkles size={12} className="text-indigo-500" />
                {isBn ? 'SkillProof AI ইন্টারভিউ রিপোর্ট' : 'SkillProof AI Interview Report'}
              </div>
              <h1 className="mt-1 break-words text-xl font-extrabold text-slate-900 sm:text-2xl">
                {isBn ? 'তোমার মূল্যায়ন' : 'Your Evaluation'}
              </h1>
              <p className="mt-1 break-words text-[12px] text-slate-600">
                <span className="font-semibold">{session.category_name}</span>
                {session.sub_category_name ? ` · ${session.sub_category_name}` : ''}
                {' · '}
                <span>{Math.floor(session.interview_duration / 60)}m {session.interview_duration % 60}s</span>
                {' · '}
                {dateLabel}
              </p>
              {evaluation.summary && (
                <p className="mt-2 max-w-xl whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">
                  {evaluation.summary}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isBn ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}
            </button>
            {}
            <Link
              to="/dashboard/mentor"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <History size={14} />
              {isBn ? 'ইতিহাস' : 'History'}
            </Link>
            <Link
              to="/dashboard/mentor"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RefreshCw size={14} />
              {isBn ? 'নতুন ইন্টারভিউ' : 'New interview'}
            </Link>
          </div>
        </div>
      </div>

      {}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
            <Target size={14} className="text-rose-500" />
            {isBn ? 'মূল্যায়ন অক্ষ' : 'Evaluation Axes'}
          </h2>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            {isBn ? '৫টি দক্ষতা মাত্রা' : '5 skill dimensions'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AxisCard
            label={isBn ? 'যোগাযোগ' : 'Communication'}
            value={evaluation.communication}
            icon={Sparkles}
            isBn={isBn}
            hint={isBn ? 'ধারণা প্রকাশের স্পষ্টতা' : 'Clarity of expression'}
          />
          <AxisCard
            label={isBn ? 'প্রযুক্তিগত জ্ঞান' : 'Technical Knowledge'}
            value={evaluation.technical}
            icon={GraduationCap}
            isBn={isBn}
            hint={isBn ? 'ডোমেইন দক্ষতা ও গভীরতা' : 'Domain expertise & depth'}
          />
          <AxisCard
            label={isBn ? 'সমস্যা সমাধান' : 'Problem Solving'}
            value={evaluation.problem_solving}
            icon={Lightbulb}
            isBn={isBn}
            hint={isBn ? 'যুক্তি ও বিশ্লেষণ' : 'Reasoning & analysis'}
          />
          <AxisCard
            label={isBn ? 'আত্মবিশ্বাস' : 'Confidence'}
            value={evaluation.confidence}
            icon={TrendingUp}
            isBn={isBn}
            hint={isBn ? 'কেবল উত্তরের গুণমানের উপর ভিত্তি করে (ক্যামেরা নয়)' : 'Based on answer quality only (not camera)'}
          />
          <AxisCard
            label={isBn ? 'ব্যাকরণ ও স্পষ্টতা' : 'Grammar & Clarity'}
            value={evaluation.grammar}
            icon={BookOpen}
            isBn={isBn}
            hint={isBn ? 'বাক্যের গঠন ও স্পষ্টতা' : 'Sentence structure & clarity'}
          />
        </div>
      </section>

      {}
      {evaluation.career_advice && (
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-4 shadow-sm sm:p-5">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
              <Award size={12} />
              {isBn ? 'ক্যারিয়ার পরামর্শ' : 'Career Advice from SkillProof AI'}
            </div>
            <p className="mt-2 break-words whitespace-pre-wrap text-[14px] font-medium leading-relaxed text-slate-800">
              {evaluation.career_advice}
            </p>
          </div>
        </section>
      )}

      {}
      <section className="grid gap-3 md:grid-cols-3">
        <BulletSection
          title={isBn ? 'শক্তি' : 'Strengths'}
          items={evaluation.strengths}
          tone="emerald"
          emptyText={isBn ? 'কোনো শক্তি পাওয়া যায়নি' : 'No strengths highlighted'}
        />
        <BulletSection
          title={isBn ? 'দুর্বলতা' : 'Weaknesses'}
          items={evaluation.weaknesses}
          tone="rose"
          emptyText={isBn ? 'কোনো দুর্বলতা পাওয়া যায়নি' : 'No weaknesses flagged'}
        />
        <BulletSection
          title={isBn ? 'উন্নতির পরামর্শ' : 'Areas to Improve'}
          items={evaluation.recommendations}
          tone="indigo"
          emptyText={isBn ? 'কোনো পরামর্শ নেই' : 'No recommendations yet'}
        />
      </section>

      {}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <Sparkles size={12} className="text-indigo-500" />
            {isBn ? 'প্রস্তাবিত স্কিল' : 'Recommended Skills'}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {evaluation.recommended_skills.length === 0 ? (
              <span className="text-[11px] italic text-slate-400">—</span>
            ) : (
              evaluation.recommended_skills.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <BookOpen size={12} className="text-violet-500" />
            {isBn ? 'প্রস্তাবিত রোডম্যাপ' : 'Recommended Roadmap'}
          </div>
          {evaluation.recommended_roadmap.title ? (
            <>
              <p className="mt-2 break-words text-sm font-extrabold text-slate-900">
                {evaluation.recommended_roadmap.title}
              </p>
              <p className="mt-1 break-words text-[12px] leading-relaxed text-slate-600">
                {evaluation.recommended_roadmap.reason}
              </p>
              <Link
                to="/dashboard/roadmap"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline whitespace-nowrap"
              >
                {isBn ? 'রোডম্যাপ দেখো →' : 'Browse roadmaps →'}
              </Link>
            </>
          ) : (
            <p className="mt-2 text-[11px] italic text-slate-400">—</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <Briefcase size={12} className="text-emerald-500" />
            {isBn ? 'প্রস্তাবিত ভেরিফিকেশন' : 'Recommended Verification'}
          </div>
          {evaluation.recommended_verification.title ? (
            <>
              <p className="mt-2 break-words text-sm font-extrabold text-slate-900">
                {evaluation.recommended_verification.title}
              </p>
              <p className="mt-1 break-words text-[12px] leading-relaxed text-slate-600">
                {evaluation.recommended_verification.reason}
              </p>
              <Link
                to="/dashboard/verify"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline whitespace-nowrap"
              >
                {isBn ? 'ভেরিফিকেশন দেখো →' : 'Browse verifications →'}
              </Link>
            </>
          ) : (
            <p className="mt-2 text-[11px] italic text-slate-400">—</p>
          )}
        </div>
      </section>

      {}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
          <FileText size={14} className="text-slate-500" />
          {isBn ? 'প্রশ্ন ও উত্তর' : 'Questions & Answers'}
        </div>
        {questions.length === 0 ? (
          <p className="text-[11px] italic text-slate-400">
            {isBn ? 'কোনো প্রশ্ন রেকর্ড হয়নি' : 'No questions recorded.'}
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold text-slate-500">
                  <span className="rounded-full bg-white px-1.5 py-0.5 ring-1 ring-slate-200 whitespace-nowrap">
                    {isBn ? `প্রশ্ন ${q.question_index}` : `Question ${q.question_index}`}
                  </span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] ring-1 ring-slate-200 text-slate-700 whitespace-nowrap">
                    {q.difficulty}
                  </span>
                  <CheckCircle2 size={11} className="ml-1 text-emerald-500" />
                </div>
                <p className="mt-1.5 break-words text-[13px] font-semibold text-slate-800">{q.question_text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

export default InterviewReportPage;
