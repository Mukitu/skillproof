
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, Briefcase, Building2,
  Calendar, CheckCircle2, Clock, ExternalLink, GraduationCap, Lightbulb, Loader2,
  MapPin, RefreshCcw, Sparkles, Star, Target, Wallet, X, Send, Award, Wrench,
  ListChecks, ShieldAlert, Hourglass, History,
} from 'lucide-react';
import {
  applyToJob, getJobById, isValidApplyUrl, listMyApplications, listSavedJobIds, toggleSavedJob,
} from '../../services/jobs';
import { useRealtimeRefresh } from '../../services/realtime';
import { getCurrentUser } from '../../services/auth';
import {
  getMatchForJob,
  runJobMatching,
  runJobMatchingWithSummary,
  MATCH_LABEL_META,
  matchStars,
  findMissingSkillRoadmaps,
  getFilterProjection,
  getCurrentProfileHash,
  type VerifiedSkillsProjection,
} from '../../services/jobMatch';
import { AnimatedBar } from '../../components/ui/AnimatedBar';
import { ImproveMatchDrawer } from './ImproveMatchDrawer';
import type { Job, JobApplication, JobMatchResult } from '../../types/database';

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

export const JobDetailPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [cover, setCover] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [match, setMatch] = useState<JobMatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  // The API returns 422 with code=AI_PROFILE_INCOMPLETE when the user has
  // no skills/education/experience yet. We render a friendly "complete your
  // profile" empty state instead of a red error banner, and stop
  // auto-firing the matcher until the user actually fills out their
  // profile (so we don't flood the API with 422s on every page mount).
  const [profileIncomplete, setProfileIncomplete] = useState<boolean>(false);
  const [currentProfileHash, setCurrentProfileHash] = useState<string>('');
  const [improveOpen, setImproveOpen] = useState(false);
  const [projection, setProjection] = useState<VerifiedSkillsProjection>({
    verifiedSkills: [],
    passedVerificationTitles: [],
    completedRoadmapTitles: [],
    activeRoadmapTitles: [],
  });

  const reloadMatch = useCallback(async () => {
    if (!jobId) return;
    try {
      const m = await getMatchForJob(jobId);
      setMatch(m);
    } catch (e: any) {
      
    }
  }, [jobId]);

  const reload = useCallback(async () => {
    if (!jobId) return;
    try {
      setError(null);
      const [j, s, a, m, proj] = await Promise.all([
        getJobById(jobId),
        listSavedJobIds(),
        listMyApplications(),
        getMatchForJob(jobId),
        getFilterProjection().catch(() => ({
          verifiedSkills: [],
          passedVerificationTitles: [],
          completedRoadmapTitles: [],
          activeRoadmapTitles: [],
        } as VerifiedSkillsProjection)),
      ]);
      setJob(j);
      setSaved(s);
      setApplied(a.map((x: JobApplication) => x.job_id));
      setMatch(m);
      setProjection(proj);
    } catch (e: any) {
      setError(e?.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    // Reset the "profile incomplete" lock on every navigation/jobsId
    // change — the user might have completed their profile in the
    // interim, and we want the auto-trigger to retry on the new job.
    setProfileIncomplete(false);
    void reload();
  }, [reload]);

  // Compute the live profile hash so we can flag stale match rows.
  // (Match row's profile_hash is captured at scoring time — when the user
  //  updates skills/education/etc., this hash diverges and we surface a
  //  "profile changed — re-run match" banner instead of showing stale numbers.)
  const refreshProfileHash = useCallback(async () => {
    try {
      const h = await getCurrentProfileHash();
      setCurrentProfileHash(h || '');
    } catch {
      // Non-fatal — without a hash we simply won't show the stale banner.
    }
  }, []);
  useEffect(() => {
    void refreshProfileHash();
  }, [refreshProfileHash]);

  const matchIsStale = useMemo(() => {
    if (!match) return false;
    if (!currentProfileHash) return false;
    if (!match.profile_hash) return false;
    return match.profile_hash !== currentProfileHash;
  }, [match, currentProfileHash]);

  
  
  useRealtimeRefresh(['jobs', 'company_jobs', 'company_job_skills'], reload);

  // Look up our auth.uid so we can scope the job_match_results subscription
  // to just our own rows. Without the filter the channel would fire for every
  // user's match row, which causes load() thrash and visible flicker.
  const [matchFilterUserId, setMatchFilterUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!cancelled && u?.id) setMatchFilterUserId(u.id);
      } catch {
        // Non-fatal — fall back to unfiltered refresh.
      }
    })();
    return () => { cancelled = true; };
  }, []);
  useRealtimeRefresh(
    'job_match_results',
    reloadMatch,
    matchFilterUserId ? { job_match_results: `user_id=eq.${matchFilterUserId}` } : undefined,
  );

  // When the user edits their own skills/educations/experiences, the
  // previously-locked "profile incomplete" state should unblock so the
  // auto-trigger can fire again. Subscribing here keeps the page live
  // without re-mounting it.
  // We intentionally do NOT pass per-table filters here — the relevant
  // tables (user_skills / educations / experiences) are keyed by
  // profiles.id (not auth.uid()), and threading the right id-resolution
  // through this hook is fragile. A no-filter subscription is fine: the
  // callback only flips the local "profile incomplete" flag, which is
  // idempotent and safe to call repeatedly.
  useRealtimeRefresh(
    ['user_skills', 'educations', 'experiences'],
    () => {
      setProfileIncomplete((prev) => (prev ? false : prev));
      void refreshProfileHash();
    },
  );


  // NOTE: createJobMatchAutoRefresh was previously wired in here too, but
  // it duplicated subscriptions on `job_match_results` and a handful of
  // other tables, causing the page to fire `reloadMatch()` twice per event
  // (and on every user_skills change anywhere on the site, because the
  // hook wasn't filtered by user_id). The single filtered subscription
  // above is sufficient for this page.

  // In-flight guard: prevents concurrent rerunMatchForThisJob calls from
  // racing the same job. Also clears the "match !== null" auto-gen condition
  // once a request is in flight so the auto-gen useEffect doesn't fire
  // again if a stale render goes through.
  const inflightMatchRef = useRef(false);
  const rerunMatchForThisJob = useCallback(async () => {
    if (!jobId) return;
    if (inflightMatchRef.current) return; // already running; skip
    inflightMatchRef.current = true;
    setMatchLoading(true);
    setMatchError(null);
    setProfileIncomplete(false);
    try {
      // Pass jobId into both the API call AND the post-run reload check so
      // we never stay stuck on "Scoring…" if the backend returns 200 with
      // an empty match array for this specific job (e.g. pre-filter still
      // dropped it before the SQL pin fix landed, or rate-limited fallback
      // produced no row). Surface the error immediately instead of
      // waiting forever for the realtime subscription.
      const summary = await runJobMatchingWithSummary({ jobIds: [jobId] });
      await reloadMatch();
      // If we asked for a specific jobId and the API didn't return a row
      // for it, the UI would otherwise stay on "Scoring…" with no
      // visible error. Force a clear, retryable error state instead.
      // Source-agnostic match-row check: the matcher is unified, so we
      // only need to confirm the requested jobId is present in the
      // returned matches array. The `job_source` discriminator is
      // diagnostic only and never affects matching logic — so a row
      // with job_id === jobId is valid regardless of source.
      const hasRowForThisJob = summary.matches.some((m) => {
        if (!m) return false;
        if (m.job_id === jobId) return true;
        // Back-compat for legacy rows that pre-date the polymorphic
        // job_source column (those rows were all 'admin').
        if (m.job_id === `company_job_${jobId}`) return true;
        return false;
      });
      if (!hasRowForThisJob && summary.matches.length === 0) {
        setMatchError(
          summary.rateLimited
            ? 'AI সার্ভিস এই মুহূর্তে ব্যস্ত। কিছুক্ষণ পরে আবার Re-run match চাপুন।'
            : 'এই job-এর জন্য এখনও score তৈরি হয়নি। Re-run match চেপে আবার চেষ্টা করুন।'
        );
      }
      // Recompute the live hash so the "stale" banner clears after a rerun.
      void refreshProfileHash();
    } catch (e: any) {
      // 422 with code=AI_PROFILE_INCOMPLETE is the expected, recoverable
      // path when the user has not yet filled out their AI profile (no
      // skills/education/experience). Render a friendly empty state and
      // stop telling the user "AI matching failed" — the failure is
      // "you haven't built a profile yet", not a system error.
      if (e?.code === 'AI_PROFILE_INCOMPLETE' || e?.status === 422) {
        setProfileIncomplete(true);
        setMatchError(null);
      } else {
        setMatchError(e?.message || 'AI matching is currently unavailable.');
      }
    } finally {
      setMatchLoading(false);
      inflightMatchRef.current = false;
    }
  }, [jobId, job?.source, reloadMatch, refreshProfileHash]);

  // Auto-generate the match score on mount whenever it's missing for this
  // job (covers every category/sub-category — Job Portal scoring and this
  // page share the same backend so the user always sees a real number).
  // IMPORTANT: skip the auto-trigger when the user's AI profile is
  // incomplete — otherwise we'd flood the API with 422s on every page
  // mount and show a red error banner until they fill out the profile.
  // The user can still hit "Re-run match" manually after completing the
  // profile (and the realtime refresh hook on the profile tables will
  // flip `profileIncomplete` back to false so the auto-trigger resumes).
  useEffect(() => {
    if (!jobId) return;
    if (match !== null) return;
    if (matchLoading) return;
    if (profileIncomplete) return;

    const t = window.setTimeout(() => {
      void rerunMatchForThisJob();
    }, 600);
    return () => window.clearTimeout(t);
  }, [jobId, match, matchLoading, profileIncomplete, rerunMatchForThisJob]);

  const isSaved = useMemo(() => (job ? saved.includes(job.id) : false), [saved, job]);
  const isApplied = useMemo(() => (job ? applied.includes(job.id) : false), [applied, job]);

  const validApply = useMemo(() => isValidApplyUrl(job?.application_url), [job?.application_url]);
  const applyLabel = useMemo(() => {
    const src = job?.source?.toString().trim();
    if (src && src.toLowerCase() !== 'other') return `Apply on ${src}`;
    return 'Apply on company site';
  }, [job?.source]);

  const daysToDeadline = useMemo(() => daysUntil(job?.deadline), [job?.deadline]);
  const deadlinePassed = daysToDeadline != null && daysToDeadline < 0;
  const isClosed = job?.status !== 'Active' || deadlinePassed;

  const handleExternalApply = () => {
    if (!job || !validApply) return;
    
    
    
    try {
      window.open(job.application_url!, '_blank', 'noopener,noreferrer');
    } catch {
      
    }
    void applyToJob(job.id).then(() => {
      setApplied((p) => (p.includes(job.id) ? p : [...p, job.id]));
      flashToast('Application recorded. Opening external site…');
    }).catch(() => {
      
      flashToast('Opening external site…');
    });
  };

  const handleInternalApply = async () => {
    if (!job) return;
    setSubmitting(true);
    try {
      await applyToJob(job.id, cover.trim() || undefined);
      setApplied((p) => (p.includes(job.id) ? p : [...p, job.id]));
      setCover('');
      setCoverOpen(false);
      flashToast('Application submitted on SkillProof.');
    } catch (e: any) {
      setError(e?.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSave = async () => {
    if (!job) return;
    try {
      const nowSaved = await toggleSavedJob(job.id);
      setSaved((p) => (nowSaved ? [...p, job.id] : p.filter((x) => x !== job.id)));
    } catch (e: any) {
      setError(e?.message || 'Could not update bookmark.');
    }
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        <Sparkles className="mx-auto mb-2 h-5 w-5 animate-pulse text-amber-500" />
        Loading job details from the SkillProof database…
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link
          to="/dashboard/jobs"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
        >
          <ArrowLeft size={12} /> Back to Job Portal
        </Link>
        <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 shadow-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="font-bold text-rose-700">Job unavailable</p>
            <p className="mt-1 text-sm text-rose-700">{error ?? 'This job posting is no longer active.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/dashboard/jobs')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E31B23] hover:underline"
        >
          <ArrowLeft size={12} /> Back to Job Portal
        </button>
        <button
          onClick={handleToggleSave}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            isSaved
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isSaved ? <BookmarkCheck size={14} className="text-amber-600" /> : <Bookmark size={14} />}
          {isSaved ? 'Saved' : 'Save job'}
        </button>
      </div>

      {}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start gap-3 sm:gap-5">
          {job.company_logo ? (
            <img
              src={job.company_logo}
              alt={job.company_name}
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-2xl font-black text-white shadow-sm sm:h-20 sm:w-20 sm:text-3xl">
              {initials(job.company_name)}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider ${
                  isClosed
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isClosed ? <X size={11} /> : <CheckCircle2 size={11} />}
                {isClosed ? (deadlinePassed ? 'Closed · Deadline passed' : 'Closed') : 'Active'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">
                <Briefcase size={11} /> {job.job_type}
              </span>
              {job.workplace && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                  <Building2 size={11} /> {job.workplace}
                </span>
              )}
            </div>
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{job.title}</h1>
            <p className="break-words text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{job.company_name}</span>
              {' · '}
              <span className="inline-flex items-center gap-1 align-middle"><MapPin size={11} /> {job.location || '—'}</span>
              {job.salary_range && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1 align-middle"><Wallet size={11} /> {job.salary_range}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaItem
            icon={<Calendar size={14} className="text-rose-600" />}
            label="Apply deadline"
            value={
              job.deadline
                ? formatDate(job.deadline)
                : 'Open until filled'
            }
            extra={
              job.deadline
                ? deadlinePassed
                  ? 'Deadline passed'
                  : daysToDeadline === 0
                    ? 'Closes today'
                    : `${daysToDeadline}d left`
                : null
            }
            tone={deadlinePassed ? 'rose' : daysToDeadline != null && daysToDeadline <= 7 ? 'amber' : 'default'}
          />
          <MetaItem
            icon={<Target size={14} className="text-amber-600" />}
            label="Experience"
            value={job.experience_level ?? 'Not specified'}
          />
          <MetaItem
            icon={<GraduationCap size={14} className="text-indigo-600" />}
            label="Education"
            value={job.education ?? 'Not specified'}
          />
          <MetaItem
            icon={<Building2 size={14} className="text-cyan-600" />}
            label="Workplace"
            value={job.workplace ?? 'Not specified'}
          />
        </dl>
      </section>

      {}
      <MatchScoreCard
        match={match}
        loading={matchLoading}
        error={matchError}
        profileIncomplete={profileIncomplete}
        onRerun={rerunMatchForThisJob}
        onImprove={() => setImproveOpen(true)}
        projection={projection}
        isStale={matchIsStale}
      />

      {}
      <section className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ready to apply?</p>
            <p className="mt-0.5 text-sm text-slate-700">
              {validApply
                ? `Opens the original application page on ${job.source ?? 'the company site'}.`
                : isApplied
                  ? 'You have already applied to this job.'
                  : 'Use either method below.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {validApply ? (
              <button
                onClick={handleExternalApply}
                disabled={isClosed}
                title={isClosed ? 'This job is closed.' : job.application_url!}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink size={15} />
                {applyLabel}
              </button>
            ) : (
              <span
                role="status"
                aria-disabled="true"
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-500"
              >
                <ShieldAlert size={15} className="text-slate-400" />
                Application link unavailable.
              </span>
            )}
            <button
              onClick={() => setCoverOpen(true)}
              disabled={isApplied || isClosed}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              {isApplied ? 'Applied on SkillProof' : 'Apply on SkillProof'}
            </button>
          </div>
        </div>
      </section>

      {}
      {job.description && (
        <Section title="About the role" icon={<Briefcase size={14} />}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
        </Section>
      )}

      {}
      {job.responsibilities.length > 0 && (
        <Section title="Responsibilities" icon={<ListChecks size={14} />}>
          <ul className="space-y-2 text-sm text-slate-700">
            {job.responsibilities.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {}
      {job.requirements.length > 0 && (
        <Section title="Requirements" icon={<ShieldAlert size={14} />}>
          <ul className="space-y-2 text-sm text-slate-700">
            {job.requirements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {}
      {job.required_skills.length > 0 && (
        <Section title="Skills required" icon={<Wrench size={14} />}>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {}
      {job.benefits.length > 0 && (
        <Section title="Benefits" icon={<Award size={14} />}>
          <ul className="space-y-2 text-sm text-slate-700">
            {job.benefits.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-cyan-500" />
                <span className="min-w-0 flex-1 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <p>
          Posted on {formatDate(job.created_at)}
          {job.source && (
            <> · via <strong className="text-slate-700">{job.source}</strong></>
          )}
          {' · '}
          ID <code className="font-mono text-slate-700">{job.id}</code>
        </p>
      </div>

      {}
      {coverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Apply on SkillProof</p>
                <h3 className="break-words text-base font-bold text-slate-900 sm:text-lg">{job.title}</h3>
                <p className="break-words text-xs text-slate-500">{job.company_name}</p>
              </div>
              <button
                onClick={() => setCoverOpen(false)}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Cover letter (optional)
              <textarea
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Why are you a great fit for this role?"
              />
            </label>
            <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setCoverOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInternalApply}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
              >
                <Send size={14} />
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-xl">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}

      {}
      {improveOpen && job && (
        <ImproveMatchDrawer
          job={job}
          match={match}
          onClose={() => setImproveOpen(false)}
        />
      )}
    </div>
  );
};



function MetaItem({
  icon, label, value, extra, tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  extra?: string | null;
  tone?: 'default' | 'amber' | 'rose';
}) {
  const toneClass =
    tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-500';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </p>
      <p className={`mt-1 text-sm font-bold text-slate-900 break-words`}>{value}</p>
      {extra && <p className={`mt-0.5 break-words text-[10px] font-semibold ${toneClass}`}>{extra}</p>}
    </div>
  );
}

function Section({
  title, icon, children,
}: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-[#E31B23]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}



function clampScore(n: any): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

const MatchScoreCard: React.FC<{
  match: JobMatchResult | null;
  loading: boolean;
  error: string | null;
  profileIncomplete?: boolean;
  onRerun: () => void;
  onImprove: () => void;
  projection?: VerifiedSkillsProjection;
  isStale?: boolean;
}> = ({ match, loading, error, profileIncomplete, onRerun, onImprove, projection, isStale }) => {
  const overall = match ? clampScore(match.overall_match) : null;
  const meta = match ? (MATCH_LABEL_META[match.label] ?? MATCH_LABEL_META.need_more) : null;
  const isLow = overall != null && overall < 70;
  const isRecommended = overall != null && overall >= 80;
  const missingSkills: string[] = Array.isArray(match?.missing_skills_required)
    ? (match!.missing_skills_required as string[])
    : Array.isArray(match?.missing_skills_json)
      ? (match!.missing_skills_json as string[])
      : [];
  const matchingSkills: string[] = Array.isArray(match?.matching_skills_json)
    ? (match!.matching_skills_json as string[])
    : [];
  const skillGaps = Array.isArray(match?.skill_gaps_json) ? match!.skill_gaps_json : [];
  const recommendedRoadmaps = match && projection
    ? findMissingSkillRoadmaps(missingSkills, projection).slice(0, 6)
    : [];

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-rose-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              SkillProof AI Match Score
            </h2>
            <p className="text-[11px] text-slate-500">
              Powered by SkillProof AI · refreshed whenever your profile changes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRerun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {loading
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCcw size={12} />}
          {loading ? 'Scoring…' : 'Re-run match'}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Loading skeleton — first render or rerun in flight */}
      {loading && !match && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white/70 p-3 text-xs text-indigo-700">
            <Hourglass size={14} className="animate-pulse" />
            <span>
              Reading your profile and comparing it against this job's
              requirements. This usually takes 5–15 seconds.
            </span>
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2.5 w-full animate-pulse rounded-full bg-slate-200/70" />
            ))}
          </div>
        </div>
      )}

      {/* Stale match — a score exists but profile / job changed since */}
      {!loading && match && isStale && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <History size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Your profile has changed since this score was generated.</p>
            <p className="mt-0.5">
              Click <strong>Re-run match</strong> to refresh the score with your latest
              skills, education, and experience.
            </p>
          </div>
        </div>
      )}

      {/* Profile incomplete — the API returned 422 because the user has not
          yet added any skill / education / experience. Render an amber,
          non-error empty state with a clear CTA so the page stops showing
          a red "AI matching failed" banner. The user can also re-run
          manually after they finish filling out the profile. */}
      {!loading && profileIncomplete && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">AI Profile পূরণ করুন — match score এখানে দেখা যাবে।</p>
            <p className="mt-0.5">
              স্কিল, শিক্ষা ও অভিজ্ঞতা যোগ করলে SkillProof AI এই job-এর সাথে আপনার
              রিয়েল-টাইম ম্যাচ স্কোর এখানে দেখাবে।{' '}
              <a
                href="/dashboard/profile?tab=profile"
                className="font-bold underline decoration-amber-400 underline-offset-2 hover:opacity-90"
              >
                Profile পূরণ করুন →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* No match yet — clear empty state with a primary CTA */}
      {!match && !loading && !error && (
        <div className="mt-4 rounded-xl border border-dashed border-indigo-300 bg-white/70 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">
            No match score yet for this job
          </p>
          <p className="mt-1 text-xs text-slate-600">
            SkillProof AI compares your verified skills, education, and experience
            against this job's requirements and returns a real score (never a
            placeholder). Click <strong>Re-run match</strong> to generate one — it
            takes 5–15 seconds.
          </p>
          <button
            type="button"
            onClick={onRerun}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
          >
            <Sparkles size={12} />
            Generate match score
          </button>
        </div>
      )}

      {match && meta && overall != null && (
        <div className="mt-4 space-y-4">
          {/* Recommended / Not Recommended header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-extrabold ring-1 ${meta.chip} ${meta.ring}`}>
              <Sparkles size={14} />
              {overall}% · {meta.label}
            </div>
            {isRecommended ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={11} /> Recommended for you
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                <ShieldAlert size={11} /> Not recommended
              </span>
            )}
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: matchStars(meta.stars).total }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < matchStars(meta.stars).filled ? 'fill-current' : 'opacity-30'}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-500">
              Updated {new Date(match.updated_at).toLocaleString()}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatedBar
              value={match.overall_match}
              label="Overall match"
              hint="Weighted blend of skills, experience and education"
            />
            <AnimatedBar
              value={match.skill_match}
              label="Skill match"
              hint="Required skills you already demonstrate"
            />
            <AnimatedBar
              value={match.experience_match}
              label="Experience match"
              hint="Years + role-level alignment"
            />
            <AnimatedBar
              value={match.education_match}
              label="Education match"
              hint="Degree / institution fit"
            />
          </div>

          {/* AI Explanation — what you match on + what's missing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              AI Explanation
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  You match because
                </p>
                <p className="break-words text-[12px] leading-relaxed text-slate-800">
                  {match.why_match || match.ai_reason || 'No positive match notes yet.'}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  You're missing
                </p>
                <p className="break-words text-[12px] leading-relaxed text-slate-800">
                  {match.prerequisites_text
                    || (missingSkills.length > 0
                        ? `Learning ${missingSkills.slice(0, 4).join(', ')}${missingSkills.length > 4 ? ` (+${missingSkills.length - 4} more)` : ''} can increase your match score.`
                        : match.ai_reason
                          ? match.ai_reason
                          : 'No major gaps detected.')}
                </p>
              </div>
            </div>
            {(match.ai_reason_bn || match.ai_reason) && (
              <p className="mt-2 break-words rounded-xl bg-slate-50 p-2.5 text-[12px] leading-relaxed text-slate-700">
                <span className="mr-1 font-bold">বাংলা:</span>
                {match.ai_reason_bn || match.ai_reason}
              </p>
            )}
          </div>

          {/* Skill Gap — explicit missing-skills pill row */}
          {missingSkills.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Skill Gap — learn these next
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"
                  >
                    ✕ {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matching skills — what the candidate already demonstrates */}
          {(matchingSkills.length > 0 || skillGaps.length > 0) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                You match on these skills
              </p>
              {matchingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {matchingSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-slate-600">
                  No direct skill matches yet — add skills to your profile to
                  improve your score.
                </p>
              )}
            </div>
          )}

          {/* Recommended Roadmaps — single-click to start learning */}
          {recommendedRoadmaps.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Recommended Roadmaps
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedRoadmaps.map((r) => (
                  <Link
                    key={r.title}
                    to="/dashboard/roadmap"
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <Target size={12} /> {r.title}
                    <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                      for {r.matchedSkill}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(match.recommendations_json ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recommendations
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {match.recommendations_json.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isLow && (
            <button
              type="button"
              onClick={onImprove}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95"
            >
              <Lightbulb size={13} />
              Improve Your Match · View Learning Plan
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default JobDetailPage;