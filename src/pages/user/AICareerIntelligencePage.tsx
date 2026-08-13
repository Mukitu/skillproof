/**
 * AICareerIntelligencePage — /dashboard/skillproof-ml
 *
 * Renders the "Your Career Intelligence" hero with the three big scores
 * (Employability, Hiring Probability, Career Readiness), the new CI sections
 * (career_summary, top_strengths, skill_gaps, career_matches,
 * market_readiness, improvement_plan, ai_summary), Top Features,
 * Why-This-Score breakdown, Gap Cards and an Action Checklist.
 *
 * Pipeline (no Python / no ML service in production):
 *   - Backend loads the user's REAL SkillProof data from Supabase
 *     (profiles, user_skills, coding_submissions, interview_sessions,
 *      skill_passports, course_certificates, career_roadmap_progress).
 *   - The PHP AI Gateway runs a pure-PHP deterministic Career
 *     Intelligence engine over that data and returns the actual
 *     prediction (no shell-out, no Python, no subprocess).
 *   - The new `/api/ai-career-intelligence` endpoint always returns 200
 *     with rich analysis sections (either from Groq AI or a deterministic
 *     fallback). The page fetches BOTH endpoints in parallel.
 *
 * NOTE: the URL path and component file name stay "/dashboard/skillproof-ml"
 * and "AICareerIntelligencePage" for backward-compatibility with existing
 * navigation links and bookmarks.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '../../services/realtime';
import {
  AlertTriangle, ArrowRight, Loader2, RefreshCw, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppErrorBoundary } from '../../components/error/AppErrorBoundary';
import { WhyThisScorePanel } from '../../components/career/WhyThisScorePanel';
import { GapCardsPanel } from '../../components/career/GapCardsPanel';
import { TopFeaturesPanel } from '../../components/career/TopFeaturesPanel';
import { ActionChecklist } from '../../components/career/ActionChecklist';
import { ModelTechnicalDetails } from '../../components/career/ModelTechnicalDetails';
import { CenterSpinner } from '../../components/career/CenterSpinner';
import {
  CIAISummary,
  CICareerMatches,
  CIFallbackBanner,
  CIHero,
  CIImprovementPlan,
  CIMarketReadiness,
  CISkillGaps,
  CITopStrengths,
} from '../../components/career/CISections';
import { CI_LABELS, pick } from '../../data/ciLabels';
import {
  predictV2,
  type V2PredictSuccess,
} from '../../services/v2Prediction';
import {
  fetchCareerIntelligence,
  type CIResponse,
} from '../../services/careerIntelligence';


const AICareerIntelligencePageInner: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const t = useCallback(
    (en: string, bnText: string) => (bn ? bnText : en),
    [bn],
  );

  const [v2, setV2] = useState<V2PredictSuccess | null>(null);
  const [ci, setCi] = useState<CIResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(user?.user_id));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [v2Error, setV2Error] = useState<string | null>(null);
  const [ciError, setCiError] = useState<string | null>(null);

  const load = useCallback(async (force = false): Promise<void> => {
    // NEVER throw — always convert to inline error state.
    try {
      const [v2Res, ciRes] = await Promise.allSettled([
        predictV2(force),
        fetchCareerIntelligence(force),
      ]);

      if (v2Res.status === 'fulfilled') {
        setV2(v2Res.value);
        setV2Error(null);
      } else {
        const err: any = v2Res.reason;
        setV2Error(
          err?.bn ||
            err?.message ||
            'ক্যারিয়ার ইন্টেলিজেন্স প্রেডিকশন তৈরি করতে পারছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
        );
      }

      if (ciRes.status === 'fulfilled') {
        setCi(ciRes.value);
        setCiError(null);
      } else {
        const err: any = ciRes.reason;
        setCiError(
          err?.bn ||
            err?.message ||
            'ক্যারিয়ার ইন্টেলিজেন্স বিভাগ লোড করা যাচ্ছে না।',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) {
      setLoading(false);
      return;
    }
    void load(false);
  }, [user?.user_id, load]);

  // Auto-refresh CI when the candidate edits their profile / skills /
  // assessments / roadmap / certifications / interview results. Each table
  // change triggers `load(true)` so the deterministic engine recomputes.
  useRealtimeRefresh(
    [
      'profiles',
      'user_skills',
      'experiences',
      'educations',
      'course_certificates',
      'career_roadmap_progress',
      'career_roadmap_enrollment',
      'skill_verification_submissions',
      'interview_sessions',
      'ai_career_reports',
      'career_ai_reports',
    ],
    () => void load(true),
  );

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  if (!user?.user_id) {
    return (
      <EmptyState
        title={t('Sign in to view Your Career Intelligence', 'আপনার ক্যারিয়ার ইন্টেলিজেন্স দেখতে সাইন ইন করুন')}
        sub={t('You must be signed in to see your career report.', 'ক্যারিয়ার রিপোর্ট দেখতে সাইন ইন করতে হবে।')}
      />
    );
  }

  if (loading) {
    return (
      <CenterSpinner
        label={t('Loading Your Career Intelligence…', 'আপনার ক্যারিয়ার ইন্টেলিজেন্স লোড হচ্ছে…')}
      />
    );
  }

  // ALWAYS render the page chrome — never the giant unavailable hero.
  const hasData = v2 !== null || ci !== null;
  const showInlineError = !hasData && (v2Error !== null || ciError !== null);

  const prediction = v2?.prediction ?? null;
  const counts = v2?.counts ?? null;
  const topFeatures = v2?.top_features ?? [];
  const coldStart = v2?.cold_start ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        bn={bn}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
      />

      {showInlineError && (
        <InlineErrorBanner
          bn={bn}
          message={
            v2Error ?? ciError ?? pick(bn, CI_LABELS.inlineError)
          }
          onRetry={() => void onRefresh()}
        />
      )}

      {/* CI sections (rich content from /api/ai-career-intelligence) */}
      {ci && (
        <>
          <CIFallbackBanner visible={ci.degraded && !ci.cached} bn={bn} />
          <CIHero
            sections={ci.sections}
            baseline={ci.baseline}
            degraded={ci.degraded}
            bn={bn}
          />
          {ci.sections.top_strengths.length > 0 && (
            <CITopStrengths items={ci.sections.top_strengths} bn={bn} />
          )}
          {ci.sections.skill_gaps.length > 0 && (
            <CISkillGaps items={ci.sections.skill_gaps} bn={bn} />
          )}
          {ci.sections.career_matches.length > 0 && (
            <CICareerMatches items={ci.sections.career_matches} bn={bn} />
          )}
          {ci.sections.market_readiness && (
            <CIMarketReadiness item={ci.sections.market_readiness} bn={bn} />
          )}
          <CIImprovementPlan plan={ci.sections.improvement_plan} bn={bn} />
          {ci.sections.ai_summary && (
            <CIAISummary text={ci.sections.ai_summary} bn={bn} />
          )}
        </>
      )}

      {/* v2 baseline panels (from /api/ai-center/v2/predict-v2) */}
      {v2 && (
        <>
          {v2Error && (
            <InlineErrorBanner
              bn={bn}
              message={v2Error}
              onRetry={() => void onRefresh()}
            />
          )}

          {coldStart && (
            <ColdStartBanner bn={bn} />
          )}

          <GapCardsPanel counts={counts} bn={bn} />

          {prediction && topFeatures.length > 0 && (
            <TopFeaturesPanel
              features={topFeatures.slice(0, 5)}
              language={bn ? 'bn' : 'en'}
            />
          )}

          {prediction && (
            <WhyThisScorePanel
              language={bn ? 'bn' : 'en'}
              topFeatures={topFeatures}
              counts={counts}
              candidate={null}
            />
          )}

          <ActionChecklist counts={counts} bn={bn} />

          {prediction && (
            <ModelTechnicalDetails
              language={bn ? 'bn' : 'en'}
              regressor={v2?.selected_regressor}
              classifier={v2?.selected_classifier}
              modelVersion={v2?.model_version}
              coldStart={coldStart}
            />
          )}
        </>
      )}

      {/* If neither endpoint produced data, surface a soft empty state — but
          never the giant unavailable hero. */}
      {!hasData && (
        <EmptyState
          title={t('No prediction yet', 'এখনো কোনো প্রেডিকশন নেই')}
          sub={t(
            'Tap "Refresh" to generate your first prediction.',
            '"রিফ্রেশ করুন" চেপে প্রথম প্রেডিকশন তৈরি করুন।',
          )}
        />
      )}
    </div>
  );
};


const PageHeader: React.FC<{
  bn: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ bn, refreshing, onRefresh }) => (
  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="p-5 sm:p-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-700">
            <Sparkles className="h-3 w-3" />
            <span>{pick(bn, CI_LABELS.heroTitle)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            {pick(bn, CI_LABELS.heroTitle)}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            {bn
              ? 'আপনার প্রকৃত SkillProof ডেটার ভিত্তিতে ব্যক্তিগত কর্মযোগ্যতা স্কোর — প্রোফাইল, দক্ষতা, মূল্যায়ন, AI ইন্টারভিউ ও রোডম্যাপ অগ্রগতি।'
              : 'Personal employability score based on your real SkillProof data — profile, skills, assessments, AI interview and roadmap progress.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {pick(bn, CI_LABELS.refresh)}
        </button>
      </header>
    </div>
  </section>
);


const InlineErrorBanner: React.FC<{
  bn: boolean;
  message: string;
  onRetry: () => void;
}> = ({ bn, message, onRetry }) => (
  <section
    role="alert"
    className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-bold">
        {bn ? 'ক্যারিয়ার ইন্টেলিজেন্স অনুপলব্ধ' : 'Career Intelligence unavailable'}
      </p>
      <p className="mt-1 break-words text-[12px] text-rose-900/90">{message}</p>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-rose-800 shadow-sm hover:bg-rose-100"
    >
      <RefreshCw size={12} />
      {pick(bn, CI_LABELS.refresh)}
    </button>
  </section>
);


const ColdStartBanner: React.FC<{ bn: boolean }> = ({ bn }) => (
  <section
    role="status"
    className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
    <div>
      <p className="text-[13px] font-bold">
        {bn ? 'প্রাথমিক prediction তৈরি করা হয়েছে' : 'Preliminary prediction generated'}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-amber-900/90">
        {bn
          ? 'আপনার profile data দিয়ে প্রাথমিক prediction তৈরি করা হয়েছে। Assessment ও AI Interview সম্পন্ন করলে আরও বেশি behavioral signal পাওয়া যাবে এবং prediction আরও নির্ভুল হবে।'
          : 'Your preliminary prediction was generated from profile data alone. Complete an assessment and an AI interview for richer behavioral signals and a more accurate prediction.'}
      </p>
      <p className="mt-2 text-[11px] text-amber-900/80">
        {pick(bn, CI_LABELS.coldStartHint)}
      </p>
    </div>
    <ArrowRight className="mt-0.5 hidden h-4 w-4 shrink-0 text-amber-700 sm:block" />
  </section>
);


const EmptyState: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
    <Sparkles className="mx-auto mb-2 h-7 w-7 text-amber-500" />
    <p className="text-base font-bold text-slate-900">{title}</p>
    <p className="mt-1 text-[12px] text-slate-500">{sub}</p>
  </section>
);


export const AICareerIntelligencePage: React.FC = () => (
  <AppErrorBoundary label="AI Career Intelligence">
    <AICareerIntelligencePageInner />
  </AppErrorBoundary>
);

export default AICareerIntelligencePage;
