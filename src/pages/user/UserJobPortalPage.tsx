
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Award, Bookmark, BookmarkCheck, Briefcase, Building2, Calendar,
  CheckCircle2, ChevronRight, Filter, Flame, Loader2, MapPin, RefreshCcw, Search, Sparkles,
  Star, Target, TrendingUp, Wallet, X,
} from 'lucide-react';
import {
  listMyApplications, listSavedJobIds, toggleSavedJob,
} from '../../services/jobs';
import { useRealtimeRefresh } from '../../services/realtime';
import {
  listActiveJobsWithMatches,
  runJobMatchingWithSummary,
  getJobMatchDashboard,
  getFilterProjection,
  isJobVerifiedMatch,
  isJobRoadmapRelevant,
  createJobMatchAutoRefresh,
  MATCH_LABEL_META,
  matchStars,
  deriveMatchStatus,
  type MatchRunStatus,
  type VerifiedSkillsProjection,
} from '../../services/jobMatch';
import { getMyProfileId } from '../../services/profile';
import { getCurrentUser } from '../../services/auth';
import { useLanguage } from '../../context/LanguageContext';
import type {
  JobMatchRow,
  JobMatchDashboard,
  JobMatchResult,
} from '../../types/database';





function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function initials(name: string): string {
  return (name ?? 'SP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function clampScore(n: any): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

type MatchTone = 'emerald' | 'teal' | 'amber' | 'orange' | 'rose' | 'slate';
function toneFor(score: number | null | undefined): MatchTone {
  if (score == null) return 'slate';
  if (score >= 90) return 'emerald';
  if (score >= 80) return 'teal';
  if (score >= 60) return 'amber';
  if (score >= 40) return 'orange';
  return 'rose';
}

const TONE_CLS: Record<MatchTone, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-100 text-teal-700 ring-teal-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200',
  rose: 'bg-rose-100 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};





const MatchChip: React.FC<{
  match: JobMatchResult | null;
}> = ({ match }) => {
  if (!match) {
    return (
      <span
        title="Match score not yet generated"
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200"
      >
        <Sparkles size={10} />
        No score yet
      </span>
    );
  }
  const score = clampScore(match.overall_match);
  const tone = toneFor(score);
  const meta = MATCH_LABEL_META[match.label] ?? MATCH_LABEL_META.need_more;
  return (
    <span
      title={`${meta.label} (${score}%)`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${TONE_CLS[tone]}`}
    >
      <Sparkles size={10} />
      {score}%
      <span className="hidden sm:inline">· {meta.label}</span>
    </span>
  );
};





const MatchInsights: React.FC<{
  dashboard: JobMatchDashboard | null;
  loading: boolean;
}> = ({ dashboard, loading }) => {
  if (loading && !dashboard) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }
  const d = dashboard ?? {
    top_match: null,
    average_match: 0,
    jobs_ready_to_apply: 0,
    need_more_skills: 0,
    recommended_today: 0,
    total_scored: 0,
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <InsightCard
        title="Top Matching Job"
        accent="emerald"
        icon={<Award size={16} />}
        main={
          d.top_match
            ? `${d.top_match.title}`
            : 'No scored jobs yet'
        }
        sub={
          d.top_match
            ? `${d.top_match.company} · ${d.top_match.overall_match}%`
            : 'Run matching to see your top fit'
        }
      />
      <InsightCard
        title="Average Match"
        accent="teal"
        icon={<TrendingUp size={16} />}
        main={d.total_scored > 0 ? `${d.average_match}%` : '—'}
        sub={
          d.total_scored > 0
            ? `Across ${d.total_scored} scored job${d.total_scored === 1 ? '' : 's'}`
            : 'No scored jobs yet'
        }
      />
      <InsightCard
        title="Jobs Ready To Apply"
        accent="amber"
        icon={<Target size={16} />}
        main={String(d.jobs_ready_to_apply)}
        sub="Match ≥ 60%"
      />
      <InsightCard
        title="Recommended Today"
        accent="violet"
        icon={<Star size={16} />}
        main={String(d.recommended_today)}
        sub="Match ≥ 80%"
      />
    </div>
  );
};

const INSIGHT_ACCENT: Record<string, string> = {
  emerald: 'from-emerald-400 to-emerald-600 text-emerald-700 bg-emerald-50 ring-emerald-100',
  teal: 'from-teal-400 to-cyan-500 text-teal-700 bg-teal-50 ring-teal-100',
  amber: 'from-amber-400 to-orange-500 text-amber-700 bg-amber-50 ring-amber-100',
  violet: 'from-violet-400 to-indigo-500 text-violet-700 bg-violet-50 ring-violet-100',
};

const InsightCard: React.FC<{
  title: string;
  main: string;
  sub: string;
  accent: 'emerald' | 'teal' | 'amber' | 'violet';
  icon: React.ReactNode;
}> = ({ title, main, sub, accent, icon }) => {
  const cls = INSIGHT_ACCENT[accent] ?? INSIGHT_ACCENT.teal;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">
          {title}
        </p>
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ${cls}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-black text-slate-900 break-words">{main}</p>
      <p className="text-[11px] text-slate-500 break-words">{sub}</p>
    </div>
  );
};





const ALL_TYPES = [
  'Full-time', 'Part-time', 'Remote', 'Contract', 'Internship',
] as const;

interface SmartFilterToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  jobType: string;
  setJobType: (v: string) => void;
  matchFloor: number;
  setMatchFloor: (n: number) => void;
  requireVerified: boolean;
  setRequireVerified: (v: boolean) => void;
  requireRoadmap: boolean;
  setRequireRoadmap: (v: boolean) => void;
  recommendedOnly: boolean;
  setRecommendedOnly: (v: boolean) => void;
  newOnly: boolean;
  setNewOnly: (v: boolean) => void;
  workplaceRemote: boolean;
  setWorkplaceRemote: (v: boolean) => void;
  hasProjection: boolean;
}

const SmartFilterToolbar: React.FC<SmartFilterToolbarProps> = ({
  search, setSearch, jobType, setJobType,
  matchFloor, setMatchFloor,
  requireVerified, setRequireVerified,
  requireRoadmap, setRequireRoadmap,
  recommendedOnly, setRecommendedOnly,
  newOnly, setNewOnly,
  workplaceRemote, setWorkplaceRemote,
  hasProjection,
}) => {
  const hasActiveFilter =
    matchFloor > 0 || recommendedOnly || newOnly || workplaceRemote
      || requireVerified || requireRoadmap;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, companies, skills, locations"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100"
        >
          <option value="all">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Filter size={12} /> Match:
        </span>
        <FilterChip
          active={recommendedOnly}
          onClick={() => setRecommendedOnly(!recommendedOnly)}
          label="Recommended Only"
        />
        <FilterChip
          active={matchFloor === 80}
          onClick={() => setMatchFloor(matchFloor === 80 ? 0 : 80)}
          label="80%+ Match"
        />
        <FilterChip
          active={matchFloor === 60}
          onClick={() => setMatchFloor(matchFloor === 60 ? 0 : 60)}
          label="60%+ Match"
        />
      </div>

      {}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Filter size={12} /> Type:
        </span>
        <FilterChip
          active={newOnly}
          onClick={() => setNewOnly(!newOnly)}
          label="🆕 New Jobs"
        />
        <FilterChip
          active={workplaceRemote}
          onClick={() => setWorkplaceRemote(!workplaceRemote)}
          label="Remote"
        />
        <FilterChip
          active={jobType === 'Internship'}
          onClick={() => setJobType(jobType === 'Internship' ? 'all' : 'Internship')}
          label="Internship"
        />
        <FilterChip
          active={jobType === 'Full-time'}
          onClick={() => setJobType(jobType === 'Full-time' ? 'all' : 'Full-time')}
          label="Full-time"
        />
      </div>

      {}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Filter size={12} /> Overlap:
        </span>
        <FilterChip
          active={requireVerified}
          onClick={() => setRequireVerified(!requireVerified)}
          label="Verified skill match"
          disabled={!hasProjection}
          hint={!hasProjection ? 'Add a passport or pass a verification to enable' : ''}
        />
        <FilterChip
          active={requireRoadmap}
          onClick={() => setRequireRoadmap(!requireRoadmap)}
          label="Relevant roadmap"
          disabled={!hasProjection}
          hint={!hasProjection ? 'Enroll in a roadmap to enable' : ''}
        />
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setMatchFloor(0);
              setRecommendedOnly(false);
              setNewOnly(false);
              setWorkplaceRemote(false);
              setRequireVerified(false);
              setRequireRoadmap(false);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            <X size={10} /> Clear all
          </button>
        )}
      </div>
    </div>
  );
};

const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  hint?: string;
}> = ({ active, onClick, label, disabled, hint }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={hint || label}
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition ${
      active
        ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white ring-transparent shadow-sm'
        : 'bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100'
    } ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-slate-50' : ''}`}
  >
    {active && <CheckCircle2 size={11} />} {label}
  </button>
);





// CuratedSection component removed — "Recommended For You" and "Growing
// Opportunity" sections were removed from the Job Portal UI per product
// feedback.






const JobCard: React.FC<{
  row: JobMatchRow;
  isSaved: boolean;
  isApplied: boolean;
  onToggleSave: () => void;
  
  compact?: boolean;
}> = ({ row, isSaved, isApplied, onToggleSave, compact }) => {
  const j = row.job;
  const m = row.match;
  const days = daysUntil(j.deadline);
  const deadlinePassed = days != null && days < 0;
  const score = m ? clampScore(m.overall_match) : null;
  const tone = toneFor(score);
  const meta = m ? (MATCH_LABEL_META[m.label] ?? MATCH_LABEL_META.need_more) : null;
  const stars = m ? matchStars(meta!.stars) : { filled: 0, total: 5 };
  const isRecommended = score != null && score >= 60;
  const missingCount = Array.isArray(m?.missing_skills_required)
    ? (m!.missing_skills_required as string[]).length
    : Array.isArray(m?.missing_skills_json)
      ? (m!.missing_skills_json as string[]).length
      : 0;
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        <Link to={`/dashboard/jobs/${j.id}`} className="flex shrink-0 items-start gap-4">
          {j.company_logo ? (
            <img
              src={j.company_logo}
              alt={j.company_name}
              className={`rounded-xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm ${compact ? 'h-10 w-10' : 'h-12 w-12 sm:h-14 sm:w-14'}`}
            />
          ) : (
            <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-600 font-black text-white shadow-sm ${compact ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-lg sm:h-14 sm:w-14 sm:text-xl'}`}>
              {initials(j.company_name)}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to={`/dashboard/jobs/${j.id}`} className="min-w-0 hover:underline">
              <h3 className={`break-words font-bold text-slate-900 ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>{j.title}</h3>
            </Link>
            <MatchChip match={m} />
          </div>
          <p className="mt-0.5 break-words text-sm text-slate-600">
            <span className="font-semibold">{j.company_name}</span>
          </p>

          {m && score != null && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1 ${TONE_CLS[tone]}`}>
                {Array.from({ length: stars.total }).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i < stars.filled ? 'fill-current' : 'opacity-30'}
                  />
                ))}
                {score}% · {meta!.label}
              </span>
              {isRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 size={10} /> Recommended
                </span>
              )}
              {missingCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700 ring-1 ring-slate-200">
                  Missing: {missingCount} skill{missingCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
              <Briefcase size={11} /> {j.job_type}
            </span>
            {j.workplace && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                <Building2 size={11} /> {j.workplace}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              <MapPin size={11} /> {j.location || '—'}
            </span>
            {j.salary_range && !compact && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <Wallet size={11} /> {j.salary_range}
              </span>
            )}
            {j.deadline && !compact && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  deadlinePassed
                    ? 'bg-rose-50 text-rose-700'
                    : days != null && days <= 7
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-50 text-slate-700'
                }`}
              >
                <Calendar size={11} />
                {deadlinePassed ? 'Closed' : `${formatDate(j.deadline)}${days != null ? ` (${days}d)` : ''}`}
              </span>
            )}
          </div>

          {!compact && j.required_skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {j.required_skills.slice(0, 6).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-100"
                >
                  {s}
                </span>
              ))}
              {j.required_skills.length > 6 && (
                <span className="text-[11px] text-slate-500">
                  +{j.required_skills.length - 6} more
                </span>
              )}
            </div>
          )}

          {}
          {!compact && m?.why_match && (
            <p className="mt-2 line-clamp-2 break-words text-[11px] leading-snug text-slate-500">
              <span className="font-bold text-slate-600">Why: </span>
              {m.why_match}
            </p>
          )}
        </div>
        <div className={`flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end ${compact ? 'mt-2' : ''}`}>
          <button
            onClick={onToggleSave}
            aria-label={isSaved ? 'Unsave' : 'Save'}
            className="shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100"
          >
            {isSaved ? <BookmarkCheck className="text-amber-600" size={18} /> : <Bookmark size={18} />}
          </button>
          <Link
            to={`/dashboard/jobs/${j.id}`}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 sm:w-auto whitespace-nowrap"
          >
            <span className="truncate">{isApplied ? 'View application' : 'View & apply'}</span>
            <ChevronRight size={12} className="shrink-0" />
          </Link>
        </div>
      </div>
    </article>
  );
};





export const UserJobPortalPage = () => {
  const { language } = useLanguage();
  const [rows, setRows] = useState<JobMatchRow[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string>('all');
  const [matchFloor, setMatchFloor] = useState<number>(0);
  const [requireVerified, setRequireVerified] = useState<boolean>(false);
  const [requireRoadmap, setRequireRoadmap] = useState<boolean>(false);
  const [recommendedOnly, setRecommendedOnly] = useState<boolean>(false);
  const [newOnly, setNewOnly] = useState<boolean>(false);
  const [workplaceRemote, setWorkplaceRemote] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [matching, setMatching] = useState<boolean>(false);
  const [matchRequested, setMatchRequested] = useState<boolean>(false);
  const [dashboard, setDashboard] = useState<JobMatchDashboard | null>(null);
  const [matchStatus, setMatchStatus] = useState<MatchRunStatus>('idle');
  const [projection, setProjection] = useState<VerifiedSkillsProjection>({
    verifiedSkills: [],
    passedVerificationTitles: [],
    completedRoadmapTitles: [],
    activeRoadmapTitles: [],
  });

  // Per-table realtime filters so we only get notified about our own rows.
  // Resolved lazily once we know the candidate profile id + auth.uid().
  // The hook falls back to unfiltered refresh if filters are undefined.
  const [realtimeFilters, setRealtimeFilters] = useState<Record<string, string> | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileId, user] = await Promise.all([
          getMyProfileId(),
          getCurrentUser(),
        ]);
        if (cancelled) return;
        const out: Record<string, string> = {};
        if (user?.id) out.job_match_results = `user_id=eq.${user.id}`;
        if (profileId) {
          out.job_applications = `user_id=eq.${profileId}`;
          out.saved_jobs       = `user_id=eq.${profileId}`;
        }
        setRealtimeFilters(Object.keys(out).length > 0 ? out : undefined);
      } catch {
        // Non-fatal — fall back to unfiltered.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    try {
      const [combined, s, a, proj] = await Promise.all([
        listActiveJobsWithMatches(),
        listSavedJobIds(),
        listMyApplications(),
        getFilterProjection(),
      ]);
      setRows(combined);
      setSaved(s);
      setApplied(a.map((x) => x.job_id));
      setProjection(proj);
      setDashboard(await getJobMatchDashboard(combined));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load jobs.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(
    [
      'jobs',
      'job_applications',
      'saved_jobs',
      'job_match_results',
      'company_jobs',
      'company_job_skills',
      'skill_verification_submissions',
      'user_skills',
    ],
    () => {
      void load();
    },
    // Scope per-user subscriptions so we don't receive every user's rows.
    // job_match_results.user_id = auth.uid(); the other tables reference
    // profiles.id, which we resolve lazily below.
    realtimeFilters,
  );

  
  
  useEffect(() => {
    let cancelled = false;
    const kickoff = async () => {
      const userId = await getMyProfileId();
      if (!userId) return;
      // Auto-run matching for ALL categories as soon as the user lands on
      // the Job Portal — covers the case where the Job list itself is empty
      // (e.g. role/category filters returning no rows) but matching across
      // categories can still produce results.
      if (cancelled || matching) return;
      setMatching(true);
      try {
        const summary = await runJobMatchingWithSummary({ silent: true });
        if (!cancelled) {
          setMatchStatus(
            deriveMatchStatus({
              cached: summary.cached,
              aiCalls: summary.aiCalls,
              rateLimited: summary.rateLimited,
              cacheReused: summary.cacheReused,
            }),
          );
        }
        await load();
      } catch (e: any) {

        setError(e?.message || 'AI job matching is currently unavailable.');
      } finally {
        if (!cancelled) setMatching(false);
      }
    };
    void kickoff();
    return () => { cancelled = true; };



  }, []);


  useEffect(() => {
    const unsub = createJobMatchAutoRefresh({
      cooldownMs: 45_000,
      autoRun: true,
      onChange: () => { void load(); },
    });
    return unsub;
  }, [load]);

  
  const rerun = useCallback(async () => {
    setMatchRequested(true);
    try {
      const summary = await runJobMatchingWithSummary({});
      setMatchStatus(
        deriveMatchStatus({
          cached: summary.cached,
          aiCalls: summary.aiCalls,
          rateLimited: summary.rateLimited,
          cacheReused: summary.cacheReused,
        }),
      );
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not re-run AI matching.');
    } finally {
      setMatchRequested(false);
    }
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter(({ job: j }) => {
      const matchesSearch = !q
        || j.title.toLowerCase().includes(q)
        || j.company_name.toLowerCase().includes(q)
        || (j.location ?? '').toLowerCase().includes(q)
        || (j.required_skills ?? []).some((s) => s.toLowerCase().includes(q));
      const matchesType = jobType === 'all' || j.job_type === jobType;
      const matchesRemote = !workplaceRemote
        || (j.workplace && /remote/i.test(j.workplace))
        || /remote/i.test(j.location ?? '')
        || /remote/i.test(j.title);
      return matchesSearch && matchesType && matchesRemote;
    });
    const withFilters = list.filter(({ job: j, match }) => {
      const score = clampScore(match?.overall_match);
      if (matchFloor > 0 && score < matchFloor) return false;
      if (recommendedOnly && score < 60) return false;
      if (newOnly) {
        const ageMs = Date.now() - new Date(j.created_at).getTime();
        if (ageMs > 14 * 24 * 60 * 60 * 1000) return false;
      }
      if (requireVerified && !isJobVerifiedMatch(j, projection)) return false;
      if (requireRoadmap && !isJobRoadmapRelevant(j, projection)) return false;
      return true;
    });
    
    return withFilters.sort((a, b) => {
      const sa = a.match ? clampScore(a.match.overall_match) : -1;
      const sb = b.match ? clampScore(b.match.overall_match) : -1;
      if (sa !== sb) return sb - sa;
      return new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime();
    });
  }, [rows, search, jobType, matchFloor, requireVerified, requireRoadmap,
      recommendedOnly, newOnly, workplaceRemote, projection]);

  
  
  
  const toggleSave = async (id: string) => {
    try {
      const nowSaved = await toggleSavedJob(id);
      setSaved((p) => (nowSaved ? [...p, id] : p.filter((x) => x !== id)));
    } catch (e: any) {
      setError(e?.message || 'Could not update bookmark.');
    }
  };

  const hasProjection =
    projection.verifiedSkills.length > 0 ||
    projection.passedVerificationTitles.length > 0 ||
    projection.completedRoadmapTitles.length > 0 ||
    projection.activeRoadmapTitles.length > 0;

  return (
    <div className="space-y-6">
      {matchStatus !== 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            matchStatus === 'ai-evaluating'
              ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
              : matchStatus === 'rate-limited'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {matchStatus === 'ai-evaluating' ? (
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : matchStatus === 'rate-limited' ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="leading-snug">
            {matchStatus === 'ai-evaluating' &&
              'SkillProof AI is re-evaluating your top matches now.'}
            {matchStatus === 'cache-reused' &&
              'Match scores served from SkillProof AI cache (no new AI call needed).'}
            {matchStatus === 'rate-limited' &&
              'AI service is busy — SkillProof is using local templates for this run. Numbers are still real; the prose will polish on the next re-run.'}
          </span>
        </div>
      )}
      <div className="relative overflow-hidden rounded-brand-lg border border-brand-border bg-white px-5 sm:px-6 py-5 shadow-brand-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
              <Sparkles className="w-3 h-3" /> AI Match Engine
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Job Portal</h1>
            <p className="mt-1 text-sm text-slate-500 break-words">
              Live job board from SkillProof Bangladesh — ranked by AI match.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void rerun()}
            disabled={matchRequested || matching}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
          >
            {matchRequested || matching
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCcw size={14} />}
            Re-run matching
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            to="/company-jobs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#E31B23] hover:text-[#E31B23] transition"
          >
            <Building2 size={12} />
            {language === 'bn' ? 'ভেরিফাইড কোম্পানির জব দেখুন' : 'Browse verified company jobs'}
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <MatchInsights dashboard={dashboard} loading={matching && !dashboard} />

      <SmartFilterToolbar
        search={search}
        setSearch={setSearch}
        jobType={jobType}
        setJobType={setJobType}
        matchFloor={matchFloor}
        setMatchFloor={setMatchFloor}
        requireVerified={requireVerified}
        setRequireVerified={setRequireVerified}
        requireRoadmap={requireRoadmap}
        setRequireRoadmap={setRequireRoadmap}
        recommendedOnly={recommendedOnly}
        setRecommendedOnly={setRecommendedOnly}
        newOnly={newOnly}
        setNewOnly={setNewOnly}
        workplaceRemote={workplaceRemote}
        setWorkplaceRemote={setWorkplaceRemote}
        hasProjection={hasProjection}
      />

      <div className="grid gap-4">
        <h2 className="px-1 text-sm font-black uppercase tracking-wider text-slate-700">
          {language === 'bn' ? 'সব চাকরি — AI ম্যাচ স্কোর অনুযায়ী' : 'All Jobs — ranked by AI match'}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {filtered.length}
          </span>
        </h2>
        {filtered.map((row) => (
          <JobCard
            key={row.job.id}
            row={row}
            isSaved={saved.includes(row.job.id)}
            isApplied={applied.includes(row.job.id)}
            onToggleSave={() => void toggleSave(row.job.id)}
          />
        ))}
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-amber-500" />
            No jobs match your filters. Try lowering the AI match threshold or clearing filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserJobPortalPage;
