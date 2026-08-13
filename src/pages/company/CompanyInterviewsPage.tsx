import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  cancelCompanyInterview,
  completeCompanyInterview,
  formatInterviewDateTime,
  formatRemainingDecisionTime,
  getCompanyInterviewDecisionWindow,
  listCompanyInterviews,
  INTERVIEW_PLATFORM_LABELS,
  INTERVIEW_STATUS_LABELS,
  type CompanyInterviewRow,
  type InterviewStatus,
} from '../../services/interviews';
import { useRealtimeRefresh } from '../../services/realtime';
import { setCompanyApplicationStatus } from '../../services/applications';
import { fetchCompanyOwnerProfileId } from '../../services/companies';

type Section = 'upcoming' | 'completed' | 'cancelled';

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

function toneFor(status: InterviewStatus): string {
  return STATUS_TONE[status] ?? STATUS_TONE.scheduled;
}

function sectionOf(status: InterviewStatus): Section {
  // Upcoming: still actionable — scheduled, awaiting decision, candidate missed.
  if (status === 'scheduled' || status === 'decision_pending' || status === 'no_show') return 'upcoming';
  // Completed / decided — interview finished and a decision (or completed-only) state was reached.
  if (status === 'completed' || status === 'selected' || status === 'rejected' || status === 'closed') return 'completed';
  // Truly cancelled.
  return 'cancelled';
}

function initials(name: string): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || '?';
}

// QA-COMPANY-TEST-002: shallow-equality check for an interview row.
// Used by `load()` so that a realtime refresh which returns the same
// data does NOT churn `row` references — preserving React.memo stability
// on InterviewCard. Compares every field visible to the card.
function interviewRowsEqual(
  a: CompanyInterviewRow,
  b: CompanyInterviewRow,
): boolean {
  return (
    a.interview_id === b.interview_id &&
    a.application_id === b.application_id &&
    a.candidate_id === b.candidate_id &&
    a.candidate_name === b.candidate_name &&
    a.candidate_avatar_url === b.candidate_avatar_url &&
    a.job_id === b.job_id &&
    a.job_title === b.job_title &&
    a.job_category_label === b.job_category_label &&
    a.job_sub_category_label === b.job_sub_category_label &&
    a.scheduled_at === b.scheduled_at &&
    a.timezone === b.timezone &&
    a.platform === b.platform &&
    a.meeting_url === b.meeting_url &&
    a.application_status === b.application_status &&
    a.decision_deadline === b.decision_deadline &&
    a.interview_status === b.interview_status &&
    a.created_at === b.created_at &&
    a.note === b.note
  );
}

// QA-COMPANY-TEST-002: the bottom "Decision window" banner. Defined at
// module scope (not inside the parent component) so React.memo's identity
// is stable across renders. The banner uses `language` only — no callback
// props — so a parent re-render that doesn't change `language` will not
// re-render the banner at all.
interface DecisionWindowBannerProps {
  language: 'en' | 'bn';
}
const DecisionWindowBannerImpl: React.FC<DecisionWindowBannerProps> = ({ language }) => {
  const isBn = language === 'bn';
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-3.5 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-sm">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="font-extrabold text-slate-800 text-[12px]">
          {isBn ? 'সিদ্ধান্তের সময়সীমা' : 'Decision window'}
        </p>
        <p className="mt-1 leading-relaxed">
          {isBn
            ? 'ইন্টারভিউ সম্পন্ন হওয়ার পরে আপনার ৭ দিন সময় আছে চূড়ান্ত সিদ্ধান্ত নেওয়ার জন্য। প্রতিটি কার্ডের নির্বাচন/প্রত্যাখ্যান বোতাম ব্যবহার করুন।'
            : 'After marking an interview completed, you have 7 days to share a final decision. Use the Select or Reject buttons on each card to finalize the candidate.'}
        </p>
      </div>
    </div>
  );
};
const DecisionWindowBanner = React.memo(DecisionWindowBannerImpl);

// QA-COMPANY-TEST-001 / 002: extract `InterviewCard` outside the parent
// component and wrap with React.memo so a parent re-render (e.g. timer
// tick, status change in an unrelated row) does NOT remount every card.
// Defined at module scope so React.memo's identity is stable across
// renders — defining it inside the parent component would re-create the
// memoized wrapper on every render and defeat the optimization.
interface InterviewCardProps {
  row: CompanyInterviewRow;
  remaining: number | null | undefined;
  busy: boolean;
  onMessage: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onDecision: (decision: 'Selected' | 'Rejected') => void;
}
const InterviewCardImpl: React.FC<InterviewCardProps> = ({
  row, remaining, busy, onMessage, onCancel, onComplete, onDecision,
}) => {
  const { language } = useLanguage();
  const dt = formatInterviewDateTime(row.scheduled_at, row.timezone, language === 'bn' ? 'bn-BD' : 'en-US');
  const platform = INTERVIEW_PLATFORM_LABELS[row.platform] ?? INTERVIEW_PLATFORM_LABELS.google_meet;
  const status = INTERVIEW_STATUS_LABELS[row.interview_status] ?? INTERVIEW_STATUS_LABELS.scheduled;
  const decisionMeta =
    row.interview_status === 'decision_pending' && remaining != null
      ? formatRemainingDecisionTime(remaining)
      : null;

  // Local decision-eligibility — passed `remaining` from parent so this
  // card re-renders *only* when its own `remaining` changes.
  const isDecidable =
    (row.interview_status === 'decision_pending' || row.interview_status === 'completed') &&
    (remaining === null || remaining === undefined || remaining > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#E31B23]/40 transition relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400" />
      <div className="flex items-start gap-3">
        {row.candidate_avatar_url ? (
          <img
            src={row.candidate_avatar_url}
            alt={row.candidate_name}
            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
            {initials(row.candidate_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 truncate">{row.candidate_name}</h3>
          <p className="text-[11px] font-semibold text-slate-600 truncate flex items-center gap-1">
            <Users className="w-3 h-3 shrink-0" />
            <span className="truncate">{row.job_title}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.job_category_label && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {row.job_category_label}
              </span>
            )}
            {row.job_sub_category_label && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {row.job_sub_category_label}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${toneFor(row.interview_status)}`}>
          {language === 'bn' ? status.bn : status.en}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
            {language === 'bn' ? 'তারিখ' : 'Date'}
          </p>
          <p className="text-slate-900 font-bold mt-0.5">{dt.date}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
            {language === 'bn' ? 'সময়' : 'Time'}
          </p>
          <p className="text-slate-900 font-bold mt-0.5">{dt.time} <span className="text-[10px] text-slate-500">({row.timezone || 'Asia/Dhaka'})</span></p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
          <Video className="w-3 h-3" />
          {language === 'bn' ? platform.bn : platform.en}
        </span>
        <a
          href={row.meeting_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 font-bold text-slate-700 hover:border-slate-300 truncate max-w-[180px]"
          title={row.meeting_url}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{row.meeting_url}</span>
        </a>
      </div>

      {row.note && (
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
          <span className="font-bold text-slate-800">{language === 'bn' ? 'নোট' : 'Note'}: </span>
          {row.note}
        </p>
      )}

      {decisionMeta && (
        <p className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
          remaining != null && remaining <= 24 * 3600
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          <Timer className="w-3 h-3" />
          {language === 'bn' ? decisionMeta.bn : decisionMeta.en}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={onMessage}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
          title={language === 'bn' ? 'প্রার্থীকে বার্তা পাঠান' : 'Message candidate'}
        >
          <MessageSquare className="w-3 h-3" />
          {language === 'bn' ? 'বার্তা' : 'Message'}
        </button>
        {row.interview_status === 'scheduled' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {language === 'bn' ? 'সম্পন্ন হিসেবে চিহ্নিত' : 'Mark Completed'}
            </button>
          </>
        )}
        {row.interview_status === 'decision_pending' && (
          isDecidable ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecision('Rejected')}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                title={language === 'bn' ? 'প্রার্থী প্রত্যাখ্যান' : 'Reject candidate'}
              >
                <X className="w-3 h-3" />
                {language === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecision('Selected')}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                title={language === 'bn' ? 'প্রার্থী নির্বাচন' : 'Select candidate'}
              >
                {busy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                {language === 'bn' ? 'নির্বাচন' : 'Select'}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
              <ShieldCheck className="w-3 h-3" />
              {language === 'bn' ? 'সিদ্ধান্তের সময় শেষ' : 'Decision window expired'}
            </span>
          )
        )}
        {row.interview_status === 'completed' && isDecidable && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecision('Rejected')}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              {language === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecision('Selected')}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3 h-3" />
              {language === 'bn' ? 'নির্বাচন' : 'Select'}
            </button>
          </>
        )}
        {(row.interview_status === 'selected' || row.interview_status === 'rejected') && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
            row.interview_status === 'selected'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            {row.interview_status === 'selected' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {language === 'bn'
              ? INTERVIEW_STATUS_LABELS[row.interview_status].bn
              : INTERVIEW_STATUS_LABELS[row.interview_status].en}
          </span>
        )}
      </div>
    </div>
  );
};

// Custom equality: re-render only when this row's own data changes,
// not when an unrelated row's data updates. (QA-COMPANY-TEST-001)
const InterviewCard = React.memo(InterviewCardImpl, (prev, next) => {
  return (
    prev.row === next.row &&
    prev.busy === next.busy &&
    prev.remaining === next.remaining
  );
});

export const CompanyInterviewsPage: React.FC = () => {
  const { language } = useLanguage();
  const { isApproved, company } = useCompanyAuth();
  const navigate = useNavigate();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  const [rows, setRows] = useState<CompanyInterviewRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | ''>('');
  const [section, setSection] = useState<Section>('upcoming');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [decisionRemaining, setDecisionRemaining] = useState<Record<string, number | null>>({});
  const [confirmCancel, setConfirmCancel] = useState<CompanyInterviewRow | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<CompanyInterviewRow | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<{ row: CompanyInterviewRow; decision: 'Selected' | 'Rejected' } | null>(null);
  // `notifications.user_id` references `public.profiles(id)`. The
  // realtime filter needs that profile PK — not `auth.uid` and not
  // `companies.user_id`. We resolve it once per page mount and feed it
  // into the realtime subscription filter.
  const [companyOwnerProfileId, setCompanyOwnerProfileId] = useState<string | null>(null);

  useEffect(() => {
    const tmo = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(tmo);
  }, [search]);

  const flash = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data, total: c } = await listCompanyInterviews({
        status: statusFilter ? statusFilter : null,
        search: debouncedSearch,
        sort: 'upcoming',
        offset: 0,
        limit: 100,
      });
      // QA-COMPANY-TEST-001: upsert by `interview_id` so a realtime refresh
      // that returns the same data preserves array order and React keys.
      // New rows are appended; existing rows preserve their position so the
      // user sees no visual jump. Removed rows (DELETE) are pruned.
      // QA-COMPANY-TEST-002 (Flicker fix): when `data[i]` is materially
      // identical to the existing `prev[i]` row (same fields), keep the
      // `prev[i]` REFERENCE so React.memo on InterviewCard sees the same
      // prop and skips re-rendering. Without this, every realtime refresh
      // produced fresh row objects → every card re-rendered → per-card
      // countdown text and bottom Decision window banner flickered.
      setRows((prev) => {
        const prevById = new Map(prev.map((r) => [r.interview_id, r]));
        const seen = new Set<string>();
        const merged: CompanyInterviewRow[] = [];
        let anyChanged = false;
        for (const r of prev) {
          const incoming = data.find((d) => d.interview_id === r.interview_id);
          if (incoming) {
            seen.add(r.interview_id);
            if (interviewRowsEqual(r, incoming)) {
              merged.push(r); // keep same reference → memo stable
            } else {
              merged.push(incoming);
              anyChanged = true;
            }
          } else {
            // row was removed server-side — drop it
            anyChanged = true;
          }
        }
        for (const r of data) {
          if (!seen.has(r.interview_id)) {
            merged.push(r);
            anyChanged = true;
          }
        }
        if (!anyChanged && merged.length === prev.length) {
          return prev; // identical data → skip re-render entirely
        }
        // Silence unused-warning for the lookup map when we don't actually
        // need it (small data sets make linear search faster than map+find).
        void prevById;
        return merged;
      });
      setTotal(c);
    } catch (e: any) {
      setError(e?.message ?? t('Failed to load interviews', 'ইন্টারভিউ লোড ব্যর্থ'));
      // Do NOT clear `rows` on refresh-failure: preserve last-known-good so
      // a transient network blip doesn't empty the UI.
      if (rows.length === 0) {
        setRows([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, t, rows.length]);

  useEffect(() => { void load(); }, [load]);

  // Resolve the Company owner's profiles.id (the FK target of
  // notifications.user_id) once on mount. Cached for the lifetime of the
  // page; refetched only if `company?.id` changes (e.g. after a re-auth).
  useEffect(() => {
    let cancelled = false;
    if (!company?.id) {
      setCompanyOwnerProfileId(null);
      return;
    }
    (async () => {
      const pid = await fetchCompanyOwnerProfileId();
      if (!cancelled) setCompanyOwnerProfileId(pid);
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  useRealtimeRefresh(
    ['company_interviews', 'company_applications', 'notifications'],
    () => { void load(); },
    // Scope to this company's rows so we don't receive every company's
    // notifications/interviews over the wire.
    //  - company_interviews has `company_id`
    //  - company_applications has `company_id`
    //  - notifications has `user_id` (references profiles.id, not auth.uid)
    company?.id
      ? {
          company_interviews:    `company_id=eq.${company.id}`,
          company_applications:  `company_id=eq.${company.id}`,
          ...(companyOwnerProfileId
            ? { notifications: `user_id=eq.${companyOwnerProfileId}` }
            : {}),
        }
      : undefined,
  );

  // Decoded section view: upcoming/completed/cancelled are derived from
  // status, not a server-side filter. The status filter is a refinement.
  // QA-COMPANY-TEST-001 (root-cause fix for candidate jumping):
  // 1. Sort comparators now include `interview_id` as a deterministic tie-
  //    breaker. Two rows with the exact same `scheduled_at` (common in
  //    UTC) used to be sorted with an unstable comparator, causing order
  //    to flip-flop between renders.
  // 2. We sort a SHALLOW COPY of each bucket, never the original array.
  // 3. The `rows` array is upserted by `interview_id` inside `load()`, so
  //    a realtime refresh that returns the same data preserves array
  //    ordering and React keys stay stable.
  const grouped = useMemo(() => {
    const out: Record<Section, CompanyInterviewRow[]> = {
      upcoming: [], completed: [], cancelled: [],
    };
    for (const r of rows) {
      out[sectionOf(r.interview_status)].push(r);
    };
    // Stable primary + secondary keys
    out.upcoming.sort((a, b) => {
      const dt = Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at);
      return dt !== 0 ? dt : a.interview_id.localeCompare(b.interview_id);
    });
    out.completed.sort((a, b) => {
      const dt = Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at);
      return dt !== 0 ? dt : a.interview_id.localeCompare(b.interview_id);
    });
    out.cancelled.sort((a, b) => {
      const dt = Date.parse(b.created_at) - Date.parse(a.created_at);
      return dt !== 0 ? dt : a.interview_id.localeCompare(b.interview_id);
    });
    return out;
  }, [rows]);

  const sectionRows = grouped[section];

  const sectionMeta: Record<Section, { en: string; bn: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
    upcoming:  { en: 'Upcoming Interviews',  bn: 'আসন্ন ইন্টারভিউ',     icon: CalendarClock, tone: 'from-blue-500 to-indigo-600' },
    completed: { en: 'Completed / Pending',  bn: 'সম্পন্ন / প্রক্রিয়াধীন', icon: CheckCircle2,  tone: 'from-emerald-500 to-teal-600' },
    cancelled: { en: 'Cancelled / Closed',   bn: 'বাতিল / বন্ধ',          icon: XCircle,        tone: 'from-slate-400 to-slate-500' },
  };

  // QA-COMPANY-TEST-001: only re-run the poll when the *set* of decision-
  // pending ids changes — not on every parent re-render. This prevents the
  // 60s cadence from cascading into a full card-grid remount.
  const decisionPendingIdsKey = useMemo(
    () => rows
      .filter((r) => r.interview_status === 'decision_pending')
      .map((r) => r.interview_id)
      .sort()
      .join(','),
    [rows],
  );

  useEffect(() => {
    const ids = decisionPendingIdsKey ? decisionPendingIdsKey.split(',') : [];
    if (ids.length === 0) {
      setDecisionRemaining({});
      return;
    }
    let cancelled = false;
    const fetchAll = async () => {
      const next: Record<string, number | null> = {};
      for (const id of ids) {
        try {
          const w = await getCompanyInterviewDecisionWindow(id);
          next[id] = w.remaining_seconds ?? null;
        } catch {
          next[id] = null;
        }
      }
      if (!cancelled) {
        // Merge into existing map so we don't drop entries that were
        // present on a previous tick but absent on this one (e.g. the
        // status changed between ticks).
        setDecisionRemaining((prev) => ({ ...prev, ...next }));
      }
    };
    void fetchAll();
    const tmo = window.setInterval(fetchAll, 60_000);
    return () => { cancelled = true; window.clearInterval(tmo); };
  }, [decisionPendingIdsKey]);

  const handleComplete = async (row: CompanyInterviewRow) => {
    setBusyId(row.interview_id);
    try {
      await completeCompanyInterview(row.interview_id);
      flash('success', t('Interview marked as completed', 'ইন্টারভিউ সম্পন্ন হিসেবে চিহ্নিত'));
      await load();
    } catch (e: any) {
      flash('error', e?.message ?? t('Could not complete interview', 'সম্পন্ন করা ব্যর্থ'));
    } finally {
      setBusyId(null);
      setConfirmComplete(null);
    }
  };

  const handleCancel = async (row: CompanyInterviewRow) => {
    setBusyId(row.interview_id);
    try {
      await cancelCompanyInterview(row.interview_id);
      flash('success', t('Interview cancelled', 'ইন্টারভিউ বাতিল'));
      await load();
    } catch (e: any) {
      flash('error', e?.message ?? t('Could not cancel interview', 'বাতিল করা ব্যর্থ'));
    } finally {
      setBusyId(null);
      setConfirmCancel(null);
    }
  };

  const canDecide = (row: CompanyInterviewRow): boolean => {
    // Allow SELECT / REJECT only when the interview is in a state the
    // server-side validator accepts (Interview Completed or decision_pending)
    // AND the decision window hasn't expired.
    if (row.interview_status !== 'decision_pending' && row.interview_status !== 'completed') return false;
    const remaining = decisionRemaining[row.interview_id];
    if (remaining === null) return true; // unknown yet — let the server decide
    return remaining > 0;
  };

  const handleDecision = async (row: CompanyInterviewRow, decision: 'Selected' | 'Rejected') => {
    setBusyId(row.interview_id);
    try {
      await setCompanyApplicationStatus(row.application_id, decision);
      flash(
        'success',
        decision === 'Selected'
          ? t('Candidate selected', 'প্রার্থী নির্বাচিত')
          : t('Candidate rejected', 'প্রার্থী প্রত্যাখ্যাত'),
      );
      await load();
    } catch (e: any) {
      flash('error', e?.message ?? t('Could not set decision', 'সিদ্ধান্ত সেট করা ব্যর্থ'));
    } finally {
      setBusyId(null);
      setConfirmDecision(null);
    }
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
                {t('Schedule, run, and complete interviews with your shortlisted candidates.', 'শর্টলিস্টেড প্রার্থীদের সাথে ইন্টারভিউ নির্ধারণ, পরিচালনা ও সম্পন্ন করুন।')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

      {!isApproved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          {t('Interviews are only available to approved companies.', 'ইন্টারভিউ শুধুমাত্র যাচাইকৃত কোম্পানির জন্য উপলব্ধ।')}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search candidate or job…', 'প্রার্থী বা জব খুঁজুন…')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as InterviewStatus | '')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
          >
            <option value="">{t('All statuses', 'সব স্ট্যাটাস')}</option>
            {(['scheduled','decision_pending','completed','cancelled','no_show','selected','rejected','closed'] as InterviewStatus[]).map((s) => (
              <option key={s} value={s}>
                {language === 'bn' ? INTERVIEW_STATUS_LABELS[s].bn : INTERVIEW_STATUS_LABELS[s].en}
              </option>
            ))}
          </select>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : sectionRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <CalendarClock className="w-5 h-5" />
            </div>
            <p className="text-sm font-black text-slate-700">
              {t('No interviews yet.', 'এখনও কোনো ইন্টারভিউ নেই।')}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {section === 'upcoming'
                ? t('Shortlist a candidate and schedule an interview from the Shortlisted page.', 'শর্টলিস্টেড পেজ থেকে প্রার্থী শর্টলিস্ট করে ইন্টারভিউ নির্ধারণ করুন।')
                : section === 'completed'
                  ? t('Completed and pending-decision interviews will show up here.', 'সম্পন্ন ও সিদ্ধান্ত-মুলতুবি ইন্টারভিউ এখানে দেখা যাবে।')
                  : t('Cancelled or closed interviews will appear here.', 'বাতিল বা বন্ধ ইন্টারভিউ এখানে দেখা যাবে।')}
            </p>
            {section === 'upcoming' && (
              <Link
                to="/company/shortlisted"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                {t('Go to Shortlisted', 'শর্টলিস্টেড দেখুন')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionRows.map((row) => (
              <InterviewCard
                key={row.interview_id}
                row={row}
                remaining={decisionRemaining[row.interview_id]}
                busy={busyId === row.interview_id}
                onMessage={() => navigate(`/company/messages?with=${encodeURIComponent(row.candidate_id)}&application=${encodeURIComponent(row.application_id)}`)}
                onCancel={() => setConfirmCancel(row)}
                onComplete={() => setConfirmComplete(row)}
                onDecision={(decision) => setConfirmDecision({ row, decision })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm mark-completed */}
      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmComplete(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900">
                {t('Mark interview completed?', 'ইন্টারভিউ সম্পন্ন করবেন?')}
              </h3>
            </div>
            <div className="px-5 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {t(
                `${confirmComplete.candidate_name} এর ইন্টারভিউ সম্পন্ন হিসেবে চিহ্নিত হবে। আপনার সিদ্ধান্তের জন্য ৭ দিনের সময় থাকবে।`,
                `${confirmComplete.candidate_name}'s interview will be marked as completed. You will have 7 days to share a final decision.`,
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setConfirmComplete(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
              >
                {t('Cancel', 'বাতিল')}
              </button>
              <button
                type="button"
                onClick={() => handleComplete(confirmComplete)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('Confirm', 'নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm cancel */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmCancel(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900">
                {t('Cancel interview?', 'ইন্টারভিউ বাতিল করবেন?')}
              </h3>
            </div>
            <div className="px-5 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {t(
                `${confirmCancel.candidate_name} এর ইন্টারভিউ বাতিল করলে প্রার্থী একটি নোটিফিকেশন পাবে এবং আবেদন শর্টলিস্টেড অবস্থায় ফিরে যাবে।`,
                `${confirmCancel.candidate_name}'s interview will be cancelled. The candidate will receive a notification and the application will revert to Shortlisted.`,
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setConfirmCancel(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
              >
                {t('Keep', 'রাখুন')}
              </button>
              <button
                type="button"
                onClick={() => handleCancel(confirmCancel)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                {t('Cancel interview', 'ইন্টারভিউ বাতিল')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm select / reject */}
      {confirmDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDecision(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`px-5 py-4 border-b border-slate-200 bg-gradient-to-r ${
              confirmDecision.decision === 'Selected'
                ? 'from-emerald-50 to-teal-50'
                : 'from-rose-50 to-rose-50'
            }`}>
              <h3 className="text-sm font-black text-slate-900">
                {confirmDecision.decision === 'Selected'
                  ? t('Select candidate?', 'প্রার্থী নির্বাচন করবেন?')
                  : t('Reject candidate?', 'প্রার্থী প্রত্যাখ্যান করবেন?')}
              </h3>
            </div>
            <div className="px-5 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {confirmDecision.decision === 'Selected'
                ? t(
                    `${confirmDecision.row.candidate_name} কে "${confirmDecision.row.job_title}" পদের জন্য নির্বাচিত হিসেবে চিহ্নিত করবেন? প্রার্থী একটি নোটিফিকেশন পাবে।`,
                    `Mark ${confirmDecision.row.candidate_name} as Selected for "${confirmDecision.row.job_title}"? The candidate will receive a notification.`,
                  )
                : t(
                    `${confirmDecision.row.candidate_name} কে "${confirmDecision.row.job_title}" পদের জন্য প্রত্যাখ্যান করবেন? প্রার্থী একটি নোটিফিকেশন পাবে।`,
                    `Mark ${confirmDecision.row.candidate_name} as Rejected for "${confirmDecision.row.job_title}"? The candidate will receive a notification.`,
                  )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setConfirmDecision(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
              >
                {t('Cancel', 'বাতিল')}
              </button>
              <button
                type="button"
                onClick={() => handleDecision(confirmDecision.row, confirmDecision.decision)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-white font-bold text-xs ${
                  confirmDecision.decision === 'Selected'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    : 'bg-rose-600'
                }`}
              >
                {confirmDecision.decision === 'Selected'
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />}
                {confirmDecision.decision === 'Selected'
                  ? t('Confirm Select', 'নির্বাচন নিশ্চিত করুন')
                  : t('Confirm Reject', 'প্রত্যাখ্যান নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 ${
            toast.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {isApproved && <DecisionWindowBanner language={language} />}

      {/* Bottom spacing — keeps the page content from clashing with the global site footer. */}
      <div aria-hidden className="h-6 sm:h-10" />
    </div>
  );
};

export default CompanyInterviewsPage;
