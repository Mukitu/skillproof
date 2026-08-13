import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Video,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  formatInterviewDateTime,
  formatRemainingDecisionTime,
  getCompanyContactByInterview,
  INTERVIEW_PLATFORM_LABELS,
  INTERVIEW_STATUS_LABELS,
  isInterviewJoinable,
  listUserInterviews,
  type CompanyContactResult,
  type InterviewStatus,
  type UserInterviewRow,
} from '../../services/interviews';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../services/auth';

type Section = 'upcoming' | 'completed' | 'cancelled';

function sectionOf(status: InterviewStatus): Section {
  // Upcoming: still actionable — scheduled, awaiting decision, candidate missed.
  if (status === 'scheduled' || status === 'decision_pending' || status === 'no_show') return 'upcoming';
  // Completed / decided — interview finished and a decision (or completed-only) state was reached.
  if (status === 'completed' || status === 'selected' || status === 'rejected' || status === 'closed') return 'completed';
  // Truly cancelled.
  return 'cancelled';
}

const STATUS_TONE: Record<InterviewStatus, string> = {
  scheduled:        'border-blue-200 bg-blue-50 text-blue-700',
  completed:        'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled:        'border-slate-200 bg-slate-50 text-slate-700',
  no_show:          'border-amber-200 bg-amber-50 text-amber-700',
  decision_pending: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  selected:         'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected:         'border-rose-200 bg-rose-50 text-rose-700',
  closed:           'border-slate-200 bg-slate-50 text-slate-700',
};

function initials(name: string): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || '?';
}

export const UserInterviewsPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  // `t` is stable across renders. Inline `(en,bn)=>…` would change identity
  // every render and re-trigger every useCallback/useEffect that lists it
  // in its dependency array, causing the "Maximum update depth exceeded"
  // loop. We close over `language` which only changes when the user
  // actually switches the language.
  const t = useCallback((en: string, bn: string) => (language === 'bn' ? bn : en), [language]);

  const [rows, setRows] = useState<UserInterviewRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('upcoming');
  // `now` is held in a ref so that the per-minute update does NOT cause
  // a re-render of the entire interview list (which would flicker every
  // card). Instead, we bump `joinableTick` only when the per-minute tick
  // crosses the 15-min-before-scheduled boundary — causing a re-render
  // exactly once per interview around the moment it becomes joinable.
  const nowRef = useRef<number>(Date.now());
  const [joinableTick, setJoinableTick] = useState<number>(0);
  const [candidateProfileId, setCandidateProfileId] = useState<string | null>(null);
  const [realtimeReady, setRealtimeReady] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // True for the very first load. Realtime-triggered refetches use
  // `silentRefetch = true` so the cards don't flicker to skeletons.
  const isInitialLoadRef = useRef<boolean>(true);
  // keep latest `load` in a ref so the realtime callback always invokes
  // the freshest closure without re-subscribing on every render.
  const loadRef = useRef<() => Promise<void>>(async () => {});
  // Latest rows, used by the now-tick effect to decide if it should fire
  // a re-render (only when a scheduled interview is within ±15 min).
  const rowsRef = useRef<UserInterviewRow[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // -------------------------------------------------------------------------
  // Contact reveal — keyed by interview_id (the natural key on the
  // Interview page). The candidate can tap "View Company Contact" on any
  // interview (scheduled, decision_pending, completed, selected, etc.)
  // to see the actual phone / email / website / address the company
  // provided when creating its profile — phone, email, website, address
  // are pulled straight from the public.companies row via
  // `fn_user_get_company_contact_for_interview`.
  // -------------------------------------------------------------------------
  // - `revealedIds`     : interview ids for which the candidate already
  //                       tapped "View Company Contact" and saw the details.
  //                       We keep this so re-renders don't auto-hide.
  // - `contactById`     : cached contact payload per interview id.
  // - `contactLoading`  : which interview id is currently loading.
  // - `contactError`    : per-interview-id error message (if any).
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [contactById, setContactById] = useState<Record<string, CompanyContactResult>>({});
  const [contactLoading, setContactLoading] = useState<string | null>(null);
  const [contactError, setContactError] = useState<Record<string, string>>({});

  const fetchContact = useCallback(async (interviewId: string) => {
    if (!interviewId) return;
    setContactLoading(interviewId);
    setContactError((prev) => {
      if (!(interviewId in prev)) return prev;
      const { [interviewId]: _drop, ...rest } = prev;
      return rest;
    });
    try {
      const result = await getCompanyContactByInterview(interviewId);
      setContactById((prev) => ({ ...prev, [interviewId]: result }));
      // Only mark as revealed if the backend actually disclosed the
      // contact details. Otherwise keep the button in its "View" state
      // so the user can retry / see the structured reason.
      if (result.revealed) {
        setRevealedIds((prev) => {
          if (prev.has(interviewId)) return prev;
          const next = new Set(prev);
          next.add(interviewId);
          return next;
        });
      } else {
        setContactError((prev) => ({
          ...prev,
          [interviewId]: result.reason ?? t(
            'Contact details are not available yet.',
            'যোগাযোগের তথ্য এখনও পাওয়া যায়নি।',
          ),
        }));
      }
    } catch (e: any) {
      setContactError((prev) => ({
        ...prev,
        [interviewId]: e?.message ?? t('Failed to load contact details', 'যোগাযোগের তথ্য লোড ব্যর্থ'),
      }));
    } finally {
      setContactLoading(null);
    }
  }, [t]);

  const hideContact = useCallback((interviewId: string) => {
    setRevealedIds((prev) => {
      if (!prev.has(interviewId)) return prev;
      const next = new Set(prev);
      next.delete(interviewId);
      return next;
    });
  }, []);

  const load = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { rows: data, total: c } = await listUserInterviews({
        status: null,
        offset: 0,
        limit: 100,
      });
      setRows(data);
      setTotal(c);
      setLastUpdated(Date.now());
      isInitialLoadRef.current = false;
    } catch (e: any) {
      setError(e?.message ?? t('Failed to load interviews', 'ইন্টারভিউ লোড ব্যর্থ'));
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadRef.current = load; }, [load]);

  // Local patch helper: applies a single interview row change to `rows`
  // without triggering a full re-fetch. Used by realtime handlers to
  // avoid the "refresh storm" where every UPDATE caused an RPC call
  // which re-rendered the component which re-subscribed to the channel.
  const realtimeFetchPendingRef = useRef<boolean>(false);
  const applyRealtimePatch = useCallback((action: 'insert' | 'update' | 'delete', payload: any) => {
    let needsRefetch = false;
    setRows((prev) => {
      if (action === 'insert') {
        const incoming = payload?.new;
        if (!incoming?.id) return prev;
        // Skip if already present (idempotent).
        if (prev.some((r) => r.interview_id === incoming.id)) return prev;
        // We don't have the joined fields yet — schedule one debounced refetch.
        needsRefetch = true;
        return prev;
      }
      if (action === 'delete') {
        const oldR = payload?.old ?? {};
        const id = oldR.id;
        if (!id) return prev;
        return prev.filter((r) => r.interview_id !== id);
      }
      // update: if our local row already matches the new state, do nothing.
      const newR = payload?.new ?? {};
      const oldR = payload?.old ?? {};
      const id = newR.id ?? oldR.id;
      if (!id) return prev;
      const idx = prev.findIndex((r) => r.interview_id === id);
      if (idx === -1) {
        // Unknown row → schedule one debounced refetch.
        needsRefetch = true;
        return prev;
      }
      // Optimistic local patch (status / scheduled_at / meeting_url / note).
      const merged = { ...prev[idx] };
      if (typeof newR.status === 'string') merged.interview_status = newR.status as any;
      if (typeof newR.scheduled_at === 'string') merged.scheduled_at = newR.scheduled_at;
      if (typeof newR.platform === 'string') merged.platform = newR.platform as any;
      if (typeof newR.meeting_url === 'string' || newR.meeting_url === null) {
        merged.meeting_url = newR.meeting_url;
      }
      if (typeof newR.note === 'string' || newR.note === null) merged.note = newR.note;
      const next = prev.slice();
      next[idx] = merged;
      return next;
    });
    if (needsRefetch && !realtimeFetchPendingRef.current) {
      realtimeFetchPendingRef.current = true;
      // Coalesce multiple realtime events into a single refetch.
      window.setTimeout(() => {
        realtimeFetchPendingRef.current = false;
        void loadRef.current();
      }, 600);
    }
  }, []);

  // Initial load + capture the candidate's profile.id so we can scope the
  // realtime subscription (public.company_interviews.candidate_id references
  // profiles.id, not auth.uid() directly).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (cancelled || !u) return;
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', u.id)
          .maybeSingle();
        if (cancelled) return;
        if (!pErr && profile?.id) {
          setCandidateProfileId(profile.id);
          setRealtimeReady(true);
        }
      } catch {
        // Non-fatal — page still works with manual refresh.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void load(false); }, [load]);

  // Single, stable, filtered realtime subscription on company_interviews.
  // We do NOT call `load()` on every realtime event — that caused the
  // "refresh storm" where each UPDATE re-fetched the page, which
  // re-rendered the component, which re-subscribed the channel, which
  // received the same event again.
  // Instead we APPLY the change locally (optimistic) and only fall back
  // to a silent refetch if the row wasn't in our local state (e.g. an
  // INSERT for a row we never loaded).
  // IMPORTANT: requires REPLICA IDENTITY FULL on company_interviews
  // (set by migration 20260812000003) so PostgreSQL emits a populated
  // payload.old record. Without that, payload.old = {} and our
  // before/after comparison is meaningless — and would always be "different"
  // causing a refresh storm.
  useEffect(() => {
    if (!realtimeReady || !candidateProfileId) return;
    const channelName = `user-interviews:${candidateProfileId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_interviews',
          filter: `candidate_id=eq.${candidateProfileId}`,
        },
        (payload: any) => applyRealtimePatch('insert', payload),
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_interviews',
          filter: `candidate_id=eq.${candidateProfileId}`,
        },
        (payload: any) => {
          // Skip events that didn't change any user-visible field. This
          // is what blocks the "refresh storm" — `updated_at` flipping on
          // every trigger should NOT cause a re-fetch.
          const oldR = payload?.old ?? {};
          const newR = payload?.new ?? {};
          const fieldsToWatch = ['status', 'scheduled_at', 'meeting_url', 'note', 'platform'];
          let changed = false;
          for (const f of fieldsToWatch) {
            if (oldR[f] !== newR[f]) {
              changed = true;
              break;
            }
          }
          if (!changed) return;
          applyRealtimePatch('update', payload);
        },
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'company_interviews',
          filter: `candidate_id=eq.${candidateProfileId}`,
        },
        (payload: any) => applyRealtimePatch('delete', payload),
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // channel may already be gone; safe to ignore
      }
    };
  }, [realtimeReady, candidateProfileId, applyRealtimePatch]);

  // Smart re-render ticker. We update `nowRef` every minute but ONLY
  // bump `joinableTick` when the per-minute check crosses the
  // 15-min-before-scheduled boundary for some row. This means the page
  // re-renders at most a handful of times per interview (entering the
  // window, leaving it) — never just because the clock ticked.
  useEffect(() => {
    const tick = () => {
      const nowMs = Date.now();
      nowRef.current = nowMs;
      let shouldRerender = false;
      for (const r of rowsRef.current) {
        if (r.interview_status !== 'scheduled') continue;
        const scheduled = Date.parse(r.scheduled_at);
        if (Number.isNaN(scheduled)) continue;
        // Within 15 minutes before OR up to 30 min after scheduled.
        const distMin = (scheduled - nowMs) / 60_000;
        if (distMin <= 15 && distMin > -30) {
          shouldRerender = true;
          break;
        }
      }
      if (shouldRerender) setJoinableTick((t) => t + 1);
    };
    tick();
    const tmo = window.setInterval(tick, 60_000);
    return () => window.clearInterval(tmo);
  }, []);

  const grouped = useMemo(() => {
    const out: Record<Section, UserInterviewRow[]> = {
      upcoming: [], completed: [], cancelled: [],
    };
    for (const r of rows) {
      out[sectionOf(r.interview_status)].push(r);
    }
    out.upcoming.sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
    out.completed.sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at));
    out.cancelled.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return out;
  }, [rows]);

  const sectionRows = grouped[section];

  const sectionMeta: Record<Section, { en: string; bn: string; icon: React.ComponentType<{ className?: string }> }> = {
    upcoming:  { en: 'Upcoming',          bn: 'আসন্ন',                icon: CalendarClock },
    completed: { en: 'Completed / Decisions', bn: 'সম্পন্ন / সিদ্ধান্ত', icon: CheckCircle2  },
    cancelled: { en: 'Cancelled',         bn: 'বাতিল',                icon: XCircle        },
  };

  const InterviewCard: React.FC<{ row: UserInterviewRow }> = React.memo(({ row }) => {
    const dt = formatInterviewDateTime(row.scheduled_at, row.timezone, language === 'bn' ? 'bn-BD' : 'en-US');
    const platform = INTERVIEW_PLATFORM_LABELS[row.platform] ?? INTERVIEW_PLATFORM_LABELS.google_meet;
    const status = INTERVIEW_STATUS_LABELS[row.interview_status] ?? INTERVIEW_STATUS_LABELS.scheduled;
    // `joinableTick` is intentionally read here (even if unused below) so
    // this card re-renders when the joinable window opens for it. The
    // tick only changes a few times per interview (around the moment it
    // becomes joinable) — never per minute.
    void joinableTick;
    const nowMs = nowRef.current;
    const joinable = isInterviewJoinable(row.interview_status, row.scheduled_at);
    const isMs = nowMs > Date.parse(row.scheduled_at) + 24 * 60 * 60 * 1000; // >24h past
    const decisionRemaining = row.decision_deadline
      ? Math.max(0, Math.floor((Date.parse(row.decision_deadline) - nowMs) / 1000))
      : null;

    // Build the meeting-link target. Clicking the whole card (or its primary
    // CTA) opens the meeting in a new tab when joinable.
    const meetingUrl = (row.meeting_url ?? '').trim();
    const safeScheme = /^https?:\/\//i.test(meetingUrl);
    const canJoin = joinable && safeScheme;

    const handleCardClick = (e: React.MouseEvent) => {
      // Ignore clicks on inner buttons/links so their handlers fire normally.
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) return;
      if (canJoin) {
        window.open(meetingUrl, '_blank', 'noreferrer');
      }
    };

    return (
      <div
        role={canJoin ? 'button' : undefined}
        tabIndex={canJoin ? 0 : -1}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (canJoin && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            window.open(meetingUrl, '_blank', 'noreferrer');
          }
        }}
        className={`group rounded-3xl border-2 bg-white p-5 sm:p-6 shadow-sm transition relative overflow-hidden ${
          canJoin
            ? 'border-[#E31B23]/40 hover:border-[#E31B23] hover:shadow-lg cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 cursor-default'
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400" />

        {/* HEADER: logo + name + job + status badge */}
        <div className="flex items-start gap-4">
          {row.company_logo_url ? (
            <img
              src={row.company_logo_url}
              alt={row.company_name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
              {initials(row.company_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-black text-slate-900 leading-tight">{row.company_name}</h3>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-extrabold ${STATUS_TONE[row.interview_status] ?? STATUS_TONE.scheduled}`}>
                {language === 'bn' ? status.bn : status.en}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-1.5 leading-snug">
              <Building2 className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="line-clamp-2">{row.job_title}</span>
              {row.company_mobile_verified && (
                <span title={t('Verified company', 'যাচাইকৃত কোম্পানি')}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.job_category_label && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {row.job_category_label}
                </span>
              )}
              {row.job_sub_category_label && (
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {row.job_sub_category_label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* DATE + TIME — big, prominent, the two things the user must not miss */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{t('Date', 'তারিখ')}</p>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-1">{dt.date}</p>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {t('Time', 'সময়')} <span className="text-[10px] font-bold normal-case text-slate-400">({row.timezone || 'Asia/Dhaka'})</span>
            </p>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-1">{dt.time}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
            <Video className="w-3.5 h-3.5" />
            {language === 'bn' ? platform.bn : platform.en}
          </span>
          {row.interview_status === 'scheduled' && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              joinable
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {joinable
                ? t('Ready to join', 'জয়েন করতে প্রস্তুত')
                : t('Meeting opens 15 min before', 'সভা ১৫ মিনিট আগে খুলবে')}
            </span>
          )}
        </div>

        {row.note && (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-bold text-slate-800">{t('Company note', 'কোম্পানির নোট')}: </span>
            {row.note}
          </p>
        )}

        {row.interview_status === 'decision_pending' && decisionRemaining != null && (
          <p className={`mt-3 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
            decisionRemaining <= 24 * 3600
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {(() => {
              const r = formatRemainingDecisionTime(decisionRemaining);
              return language === 'bn' ? r.bn : r.en;
            })()}
          </p>
        )}

        {/* CTA row */}
        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold">
            {t('Applied', 'আবেদিত')} · {new Date(row.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/messages?with=${encodeURIComponent(row.company_id)}&application=${encodeURIComponent(row.application_id)}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              title={t('Message company', 'কোম্পানিকে বার্তা পাঠান')}
            >
              <MessageSquare className="w-4 h-4" />
              {t('Message', 'বার্তা')}
            </button>
          {row.interview_status === 'scheduled' && (
            <a
              href={canJoin ? meetingUrl : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!canJoin}
              tabIndex={canJoin ? 0 : -1}
              onClick={(e) => {
                if (!canJoin) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                e.stopPropagation();
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-md transition ${
                canJoin
                  ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white hover:opacity-95 hover:shadow-lg cursor-pointer animate-pulse-once'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
              title={
                canJoin
                  ? meetingUrl
                  : !meetingUrl
                    ? t('Meeting link will be shared by the company', 'কোম্পানি মিটিং লিংক শীঘ্রই শেয়ার করবে')
                    : t('Meeting opens 15 min before scheduled time', 'সভা নির্ধারিত সময়ের ১৫ মিনিট আগে খুলবে')
              }
            >
              <Video className="w-4 h-4" />
              {canJoin ? t('Join Interview', 'ইন্টারভিউতে যোগ দিন') : t('Join', 'যোগ দিন')}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {row.interview_status === 'selected' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              {language === 'bn' ? 'অভিনন্দন! আপনি নির্বাচিত হয়েছেন' : 'Congratulations — you have been selected'}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (revealedIds.has(row.interview_id)) {
                hideContact(row.interview_id);
              } else {
                void fetchContact(row.interview_id);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-bold shadow-sm transition ${
              revealedIds.has(row.interview_id)
                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                : 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200'
            }`}
            title={t(
              'Reveal company contact details',
              'কোম্পানির যোগাযোগের তথ্য দেখুন',
            )}
          >
            {contactLoading === row.interview_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : revealedIds.has(row.interview_id) ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <PhoneCall className="w-4 h-4" />
            )}
            {revealedIds.has(row.interview_id)
              ? t('Hide contact details', 'যোগাযোগের তথ্য লুকান')
              : t('View Company Contact', 'কোম্পানির যোগাযোগ দেখুন')}
          </button>
          {row.interview_status === 'rejected' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700">
              <XCircle className="w-4 h-4" />
              {language === 'bn' ? 'পরবর্তী সুযোগের জন্য শুভকামনা' : 'Better luck next time'}
            </span>
          )}
          {row.interview_status === 'cancelled' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-600">
              <XCircle className="w-4 h-4" />
              {language === 'bn' ? 'কোম্পানি ইন্টারভিউ বাতিল করেছে' : 'Company cancelled the interview'}
            </span>
          )}
          {(row.interview_status === 'completed' || row.interview_status === 'closed' || row.interview_status === 'decision_pending' || row.interview_status === 'no_show') && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-600">
              <ShieldCheck className="w-4 h-4" />
              {row.interview_status === 'decision_pending'
                ? (language === 'bn' ? 'সিদ্ধান্তের জন্য অপেক্ষা' : 'Awaiting decision')
                : row.interview_status === 'no_show'
                  ? (language === 'bn' ? 'আপনি উপস্থিত ছিলেন না' : 'You were marked as no-show')
                  : (language === 'bn' ? 'ইন্টারভিউ সম্পন্ন' : 'Interview completed')}
            </span>
          )}
          </div>
        </div>

        {/* Joinable hint */}
        {canJoin && (
          <div className="mt-4 rounded-xl border-2 border-[#E31B23]/30 bg-gradient-to-r from-[#E31B23]/5 via-transparent to-amber-50 px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-[#E31B23]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {t(
                'Tap anywhere on this card or click the button to join the meeting now.',
                'এই কার্ডের যেকোনো জায়গায় ট্যাপ করুন বা বোতামে ক্লিক করে এখনই মিটিংয়ে যোগ দিন।',
              )}
            </span>
          </div>
        )}

        {/* Contact-reveal block — shown after the candidate has tapped
            "View Company Contact" for this interview. Toggled by the
            button above. */}
        {revealedIds.has(row.interview_id) && (
          <ContactRevealBlock
            interviewId={row.interview_id}
            companyName={row.company_name}
            data={contactById[row.interview_id]}
            loading={contactLoading === row.interview_id}
            error={contactError[row.interview_id] ?? null}
            onClose={() => hideContact(row.interview_id)}
            onRetry={() => void fetchContact(row.interview_id)}
            t={t}
            language={language}
          />
        )}
      </div>
    );
  }, (prev, next) => prev.row === next.row);

  // Reusable contact-reveal block. Renders the structured contact
  // (phone / email / address / website / contact_name / verified badge)
  // returned by `fn_user_get_company_contact_for_interview`. The data
  // comes from the public.companies row for the company on the supplied
  // interview — i.e. the *actual* phone / email / website the company
  // provided when creating its profile, never a demo or static value.
  // Safe to render even before the data arrives — it shows a
  // skeleton / error state.
  const ContactRevealBlock: React.FC<{
    interviewId: string;
    companyName: string;
    data: CompanyContactResult | undefined;
    loading: boolean;
    error: string | null;
    onClose: () => void;
    onRetry: () => void;
    t: (en: string, bn: string) => string;
    language: 'en' | 'bn';
  }> = ({ interviewId, companyName, data, loading, error, onClose, onRetry, t, language }) => {
    const revealed = !!data?.revealed;
    const c = data?.company;
    const j = data?.job;
    const phone = (c?.phone ?? '').trim();
    const email = (c?.email ?? '').trim();
    const address = (c?.address ?? '').trim();
    const website = (c?.website_url ?? '').trim();
    const contactName = (c?.contact_name ?? '').trim();
    const safeWebsite = /^https?:\/\//i.test(website) ? website : '';
    const hasAny = phone || email || address || safeWebsite || contactName;

    return (
      <div
        className="mt-4 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-5 shadow-sm"
        data-interview-id={interviewId}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              {t('Verified contact', 'যাচাইকৃত যোগাযোগ')}
            </p>
            <h4 className="mt-2 text-base font-black text-slate-900 truncate">
              {t('Contact details of', 'যোগাযোগের তথ্য')} {companyName}
            </h4>
            {j?.title && (
              <p className="mt-0.5 text-xs text-slate-600 truncate">
                {j.title}{j.location ? ` · ${j.location}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-slate-300"
            title={t('Hide contact details', 'যোগাযোগের তথ্য লুকান')}
          >
            <XCircle className="w-3.5 h-3.5" />
            {t('Hide', 'লুকান')}
          </button>
        </div>

        {loading && !data && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{t('Could not load contact details', 'যোগাযোগের তথ্য লোড করা যায়নি')}</p>
              <p className="mt-0.5">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
              >
                <RefreshCw className="w-3 h-3" />
                {t('Try again', 'আবার চেষ্টা করুন')}
              </button>
            </div>
          </div>
        )}

        {!loading && data && !revealed && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{t('Contact details are not available yet.', 'যোগাযোগের তথ্য এখনও পাওয়া যায়নি।')}</p>
              {data.reason && <p className="mt-0.5">{data.reason}</p>}
              {data.application_status && (
                <p className="mt-1 text-[10px] text-amber-700">
                  {t('Current status', 'বর্তমান অবস্থা')}: <span className="font-mono">{data.application_status}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {revealed && !hasAny && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            {t('The company has not published its contact details yet. Check back soon.', 'কোম্পানি এখনও যোগাযোগের তথ্য প্রকাশ করেনি। শীঘ্রই আবার দেখুন।')}
          </div>
        )}

        {revealed && hasAny && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-white px-3 py-2.5 hover:border-emerald-300 hover:bg-emerald-50 transition group"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-sm">
                  <Phone className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {contactName ? t('Phone (contact)', 'ফোন (যোগাযোগ)') : t('Phone', 'ফোন')}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate" dir="ltr">{phone}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-emerald-500" />
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 rounded-xl border-2 border-sky-200 bg-white px-3 py-2.5 hover:border-sky-300 hover:bg-sky-50 transition group"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white flex items-center justify-center shadow-sm">
                  <Mail className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t('Email', 'ইমেইল')}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate" dir="ltr">{email}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-sky-500" />
              </a>
            )}
            {address && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-white px-3 py-2.5">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t('Address', 'ঠিকানা')}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{address}</p>
                </div>
              </div>
            )}
            {contactName && (
              <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-sm">
                  <Building2 className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t('Contact person', 'যোগাযোগের ব্যক্তি')}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate">{contactName}</p>
                </div>
              </div>
            )}
            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="sm:col-span-2 flex items-center gap-3 rounded-xl border-2 border-violet-200 bg-white px-3 py-2.5 hover:border-violet-300 hover:bg-violet-50 transition group"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-sm">
                  <Globe className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t('Website', 'ওয়েবসাইট')}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate" dir="ltr">{website}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-violet-500" />
              </a>
            )}
          </div>
        )}

        {revealed && c?.mobile_verified && (
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('This company is mobile-verified by SkillProof.', 'এই কোম্পানি SkillProof দ্বারা মোবাইল যাচাইকৃত।')}
          </p>
        )}

        {revealed && (
          <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
            {t(
              'These contact details are shared with you only because you have been selected. Please be professional and respectful when reaching out.',
              'এই যোগাযোগের তথ্য কেবলমাত্র আপনার নির্বাচিত হওয়ার কারণেই শেয়ার করা হচ্ছে। যোগাযোগের সময় পেশাদার ও সম্মানজনক আচরণ করুন।',
            )}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {t('Interviews', 'ইন্টারভিউ')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {t('Jobs that scheduled an interview with you will appear here.', 'যেসব কোম্পানি আপনার সাথে ইন্টারভিউ নির্ধারণ করেছে সেগুলো এখানে দেখা যাবে।')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {realtimeReady && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700"
                title={t(
                  'Live: new interviews appear automatically without refresh.',
                  'লাইভ: নতুন ইন্টার�িউ স্বয়ংক্রিয়ভাবে দেখা যাবে।',
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t('Live', 'লাইভ')}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('Refresh', 'রিফ্রেশ')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {(['upcoming', 'completed', 'cancelled'] as Section[]).map((s) => {
            const meta = sectionMeta[s];
            const Icon = meta.icon;
            const active = section === s;
            const count = grouped[s].length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-bold border transition ${
                  active
                    ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] border-transparent text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {language === 'bn' ? meta.bn : meta.en}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : sectionRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <CalendarClock className="w-5 h-5" />
            </div>
            <p className="text-sm font-black text-slate-700">
              {section === 'upcoming'
                ? t('No upcoming interviews.', 'কোনো আসন্ন ইন্টারভিউ নেই।')
                : section === 'completed'
                  ? t('No completed interviews or decisions yet.', 'এখনও কোনো সম্পন্ন ইন্টারভিউ বা সিদ্ধান্ত নেই।')
                  : t('No cancelled interviews.', 'কোনো বাতিল ইন্টারভিউ নেই।')}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {t(
                'When a company schedules an interview with you, it will appear here and you will receive a notification.',
                'কোনো কোম্পানি আপনার সাথে ইন্টারভিউ নির্ধারণ করলে সেটি এখানে দেখা যাবে এবং আপনি একটি নোটিফিকেশন পাবেন।',
              )}
            </p>
            <Link
              to="/dashboard/jobs"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('Browse verified jobs', 'যাচাইকৃত জব দেখুন')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectionRows.map((row) => (
              <InterviewCard key={row.interview_id} row={row} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-3.5 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-sm">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-slate-800 text-[12px]">
            {t('Privacy', 'গোপনীয়তা')}
          </p>
          <p className="mt-1 leading-relaxed">
            {t(
              'You can only see interviews scheduled for you. The "View Company Contact" button reveals the actual phone, email, website and address the company provided when registering — so you can reach out directly.',
              'আপনি শুধুমাত্র নিজের জন্য নির্ধারিত ইন্টারভিউ দেখতে পারবেন। "কোম্পানির যোগাযোগ দেখুন" বোতামটি কোম্পানি যে আসল ফোন, ইমেইল, ওয়েবসাইট ও ঠিকানা দিয়ে নিবন্ধন করেছে সেগুলো দেখায় — যাতে আপনি সরাসরি যোগাযোগ করতে পারেন।',
            )}
          </p>
        </div>
      </div>

      {/* Bottom spacing — keeps the page content from clashing with the global site footer. */}
      <div aria-hidden className="h-6 sm:h-10" />
    </div>
  );
};

export default UserInterviewsPage;
