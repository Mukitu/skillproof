import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  APPLICATION_SORT_LABELS,
  getAllowedTransitions,
  isTerminalStatus,
  listCompanyApplications,
  listCompanyJobsForFilter,
  rejectCompanyApplication,
  setCompanyApplicationStatus,
  type CompanyApplicationRow,
  type CompanyApplicationSort,
  type CompanyApplicationStatus,
  type CompanyJobFilterRow,
} from '../../services/applications';
import { CandidateProfileModal } from '../../components/company/CandidateProfileModal';
import { ApplicationStatusPill } from '../../components/company/ApplicationStatusPill';
import {
  ScheduleInterviewModal,
  type ScheduleInterviewCandidate,
} from '../../components/company/ScheduleInterviewModal';

interface CompanyApplicationsPageProps {
  mode?: 'all' | 'shortlisted';
}

const PAGE_SIZE = 12;

const STATUS_FILTERS: CompanyApplicationStatus[] = [
  'Applied',
  'Shortlisted',
  'Interview Scheduled',
  'Interview Completed',
  'Selected',
  'Rejected',
];

const SORT_OPTIONS: CompanyApplicationSort[] = ['newest', 'oldest', 'ai_match', 'experience'];

const TRANSITION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shortlist: Bookmark,
  interview: CalendarClock,
  complete: CheckCircle2,
  select: CheckCircle2,
  reject: Trash2,
};

function clampScore(score: number | null): number {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function skillToneClass(pct: number): { pill: string; bar: string; text: string } {
  if (pct >= 80) return { pill: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-emerald-600', text: 'text-emerald-700' };
  if (pct >= 60) return { pill: 'bg-teal-100 text-teal-700',       bar: 'from-teal-400 to-cyan-500',      text: 'text-teal-700' };
  if (pct >= 40) return { pill: 'bg-amber-100 text-amber-700',     bar: 'from-amber-400 to-orange-500',   text: 'text-amber-700' };
  if (pct >= 20) return { pill: 'bg-orange-100 text-orange-700',   bar: 'from-orange-400 to-rose-500',    text: 'text-orange-700' };
  return            { pill: 'bg-rose-100 text-rose-700',           bar: 'from-rose-400 to-rose-600',      text: 'text-rose-700' };
}

function formatDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return '—';
  }
}

interface ApplicationCardProps {
  row: CompanyApplicationRow;
  language: 'bn' | 'en';
  busy: boolean;
  onView: (row: CompanyApplicationRow) => void;
  onViewMore: (row: CompanyApplicationRow) => void;
  onTransition: (id: string, status: CompanyApplicationStatus, note?: string) => void;
  onReject: (row: CompanyApplicationRow) => void;
  onConfirmAction: (row: CompanyApplicationRow, status: CompanyApplicationStatus) => void;
  onScheduleInterview: (row: CompanyApplicationRow) => void;
  onMessage: (row: CompanyApplicationRow) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  row,
  language,
  busy,
  onView,
  onViewMore,
  onTransition,
  onReject,
  onConfirmAction,
  onScheduleInterview,
  onMessage,
}) => {
  const initials = (row.applicant_name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');
  const aiScore = row.ai_match_score;
  const matchScore = clampScore(row.job_match_score);
  const transitions = useMemo(() => getAllowedTransitions(row.status, language), [row.status, language]);
  const primary = transitions.find((t) => t.variant === 'primary');
  const reject = transitions.find((t) => t.variant === 'danger');
  const otherTransitions = transitions.filter((t) => t.variant !== 'danger' && t !== primary);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-brand-sm hover:border-[#E31B23]/40 transition relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400" />
      <div className="flex items-start gap-3">
        {row.applicant_avatar_url ? (
          <img src={row.applicant_avatar_url} alt={row.applicant_name} className="shrink-0 w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm" />
        ) : (
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm">
            {initials || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 truncate">{row.applicant_name}</h3>
          <p className="text-[11px] font-semibold text-slate-600 truncate">
            {row.applicant_profession || (language === 'bn' ? 'পেশা উল্লেখ নেই' : 'No title set')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="truncate">{row.job_title}</span>
          </p>
          {row.applicant_location && (
            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{row.applicant_location}</span>
            </p>
          )}
        </div>
        <ApplicationStatusPill status={row.status} language={language} size="sm" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'যাচাইকৃত' : 'Verified'}</p>
          <p className="text-emerald-700 font-black mt-0.5">{row.verified_skill_count}</p>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'মোট' : 'Total'}</p>
          <p className="text-slate-900 font-black mt-0.5">{row.total_skill_count}</p>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}</p>
          <p className="text-slate-900 font-black mt-0.5">{row.applicant_experience_years ?? 0} {language === 'bn' ? 'বছর' : 'yrs'}</p>
        </div>
      </div>


      {row.cover_letter && (
        <details className="mt-3 group">
          <summary className="text-[11px] font-bold text-slate-600 cursor-pointer hover:text-[#E31B23]">
            {language === 'bn' ? 'কভার লেটার দেখুন' : 'View cover letter'}
          </summary>
          <p className="mt-1 text-[11px] text-slate-700 leading-relaxed whitespace-pre-line border-l-2 border-slate-200 pl-2">
            {row.cover_letter.length > 280 ? row.cover_letter.slice(0, 280) + '…' : row.cover_letter}
          </p>
        </details>
      )}

      <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-2">
        <span>{language === 'bn' ? 'আবেদিত' : 'Applied'}: {formatDate(row.applied_at)}</span>
        {row.shortlisted_at && (
          <span className="text-amber-700">· {language === 'bn' ? 'শর্টলিস্টেড' : 'Shortlisted'}: {formatDate(row.shortlisted_at)}</span>
        )}
        {row.decision_at && (
          <span className="text-slate-700">· {language === 'bn' ? 'সিদ্ধান্ত' : 'Decision'}: {formatDate(row.decision_at)}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onView(row)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-[11px] shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'প্রোফাইল' : 'View Profile'}</span>
        </button>

        <button
          type="button"
          onClick={() => onViewMore(row)}
          title={language === 'bn' ? 'SkillProof /verify তে সম্পূর্ণ যাচাইকৃত CV দেখুন' : 'Open full verified CV on SkillProof /verify'}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-[11px]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'bn' ? 'আরও দেখুন' : 'View more'}</span>
        </button>

        <button
          type="button"
          onClick={() => onMessage(row)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-[11px]"
          title={language === 'bn' ? 'প্রার্থীকে বার্তা পাঠান' : 'Message the candidate'}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'বার্তা' : 'Message'}</span>
        </button>

        {primary && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (primary.to === 'Selected') {
                onConfirmAction(row, primary.to);
              } else if (primary.to === 'Interview Scheduled') {
                onScheduleInterview(row);
              } else {
                void onTransition(row.id, primary.to);
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-[11px] shadow-sm disabled:opacity-50"
          >
            {React.createElement(TRANSITION_ICONS[primary.iconName] || Bookmark, { className: 'w-3.5 h-3.5' })}
            <span>{language === 'bn' ? primary.label.bn : primary.label.en}</span>
          </button>
        )}

        {reject && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(row)}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px] disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'bn' ? reject.label.bn : reject.label.en}</span>
          </button>
        )}

        {otherTransitions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={busy}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 disabled:opacity-50"
              aria-label="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg z-30 overflow-hidden">
                  {otherTransitions.map((t) => {
                    const Icon = TRANSITION_ICONS[t.iconName] || Bookmark;
                    return (
                      <button
                        key={t.to}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          if (t.to === 'Selected') {
                            onConfirmAction(row, t.to);
                          } else if (t.to === 'Interview Scheduled') {
                            onScheduleInterview(row);
                          } else {
                            void onTransition(row.id, t.to);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? t.label.bn : t.label.en}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  confirmTone,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
        </div>
        <div className="px-5 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
          {body}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs ${
              confirmTone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CompanyApplicationsPage: React.FC<CompanyApplicationsPageProps> = ({ mode = 'all' }) => {
  const { language } = useLanguage();
  const { isApproved } = useCompanyAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilters, setStatusFilters] = useState<CompanyApplicationStatus[]>([]);
  const [jobId, setJobId] = useState<string>('');
  const [sort, setSort] = useState<CompanyApplicationSort>('newest');
  const [page, setPage] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  const [rows, setRows] = useState<CompanyApplicationRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<CompanyJobFilterRow[]>([]);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    row: CompanyApplicationRow;
    status: CompanyApplicationStatus;
  } | null>(null);

  const [scheduleCandidate, setScheduleCandidate] = useState<ScheduleInterviewCandidate | null>(null);

  const isShortlisted = mode === 'shortlisted';

  useEffect(() => {
    if (isShortlisted) {
      setStatusFilters(['Shortlisted']);
    } else {
      setStatusFilters([]);
    }
  }, [isShortlisted]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isApproved) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listCompanyJobsForFilter();
        if (cancelled) return;
        setJobs(list);
      } catch {
        if (!cancelled) setJobs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isApproved]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCompanyApplications({
        status: statusFilters.length > 0 ? statusFilters : null,
        jobId: jobId || null,
        search: debouncedSearch,
        sort,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load applications'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilters, jobId, debouncedSearch, sort, page, language]);

  useEffect(() => { setPage(0); }, [debouncedSearch, statusFilters, jobId, sort]);

  useEffect(() => { void load(); }, [load]);

  const flashToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleTransition = useCallback(async (
    id: string,
    status: CompanyApplicationStatus,
    note?: string,
  ) => {
    setBusyId(id);
    try {
      await setCompanyApplicationStatus(id, status, note);
      flashToast('success', status === 'Shortlisted'
        ? (language === 'bn' ? 'শর্টলিস্টেড হয়েছে' : 'Candidate shortlisted')
        : status === 'Interview Scheduled'
          ? (language === 'bn' ? 'ইন্টারভিউ নির্ধারিত হয়েছে' : 'Interview scheduled')
          : status === 'Interview Completed'
            ? (language === 'bn' ? 'ইন্টারভিউ সম্পন্ন' : 'Interview completed')
            : status === 'Selected'
              ? (language === 'bn' ? 'প্রার্থী নির্বাচিত' : 'Candidate selected')
              : status === 'Rejected'
                ? (language === 'bn' ? 'প্রার্থী প্রত্যাখ্যাত' : 'Candidate rejected')
                : (language === 'bn' ? 'আপডেট হয়েছে' : 'Updated'));
      await load();
    } catch (err: any) {
      flashToast('error', err?.message ?? (language === 'bn' ? 'আপডেট ব্যর্থ' : 'Could not update'));
    } finally {
      setBusyId(null);
    }
  }, [language, load]);

  const handleReject = useCallback(async (row: CompanyApplicationRow) => {
    if (row.status === 'Rejected') return;
    setBusyId(row.id);
    try {
      await rejectCompanyApplication(row.id, undefined);
      flashToast('success', language === 'bn' ? 'প্রার্থী প্রত্যাখ্যাত' : 'Candidate rejected');
      await load();
    } catch (err: any) {
      flashToast('error', err?.message ?? (language === 'bn' ? 'প্রত্যাখ্যান ব্যর্থ' : 'Could not reject'));
    } finally {
      setBusyId(null);
    }
  }, [language, load]);

  const toggleStatus = (s: CompanyApplicationStatus) => {
    if (isShortlisted) return;
    setStatusFilters((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilters(isShortlisted ? ['Shortlisted'] : []);
    setJobId('');
    setSort('newest');
  };

  const hasActiveFilters =
    !!search || (!isShortlisted && statusFilters.length > 0) || !!jobId || sort !== 'newest';

  const openProfile = (row: CompanyApplicationRow) => {
    setActiveProfileId(row.user_id);
    setActiveProfileName(row.applicant_name);
  };

  // "View more" / "View Profile" on the card opens the in-app profile
  // modal. The modal footer carries the deep-link to the public
  // SkillProof /verify portal (using the candidate's account email).
  // That way the recruiter sees both: the curated in-app summary AND
  // the live, unredacted verified CV — same affordance, same flow.
  const handleViewMore = (row: CompanyApplicationRow) => {
    openProfile(row);
  };

  const handleConfirmAction = (row: CompanyApplicationRow, status: CompanyApplicationStatus) => {
    setConfirmState({ row, status });
  };

  const handleScheduleInterview = (row: CompanyApplicationRow) => {
    setScheduleCandidate({
      application_id: row.id,
      job_id: row.job_id,
      candidate_name: row.applicant_name,
      job_title: row.job_title,
    });
  };

  const handleMessage = useCallback((row: CompanyApplicationRow) => {
    // Open the messages page with a deep-link to start (or reuse) the
    // conversation for this candidate + application. The page will then
    // auto-pick the thread.
    navigate(`/company/messages?with=${encodeURIComponent(row.user_id)}&application=${encodeURIComponent(row.id)}`);
  }, [navigate]);

  const handleScheduled = (interviewId: string) => {
    flashToast('success', language === 'bn' ? 'ইন্টারভিউ নির্ধারিত হয়েছে' : 'Interview scheduled');
    setScheduleCandidate(null);
    void load();

    void interviewId;
  };

  const handleConfirmExecute = async () => {
    if (!confirmState) return;
    const { row, status } = confirmState;
    setConfirmState(null);
    await handleTransition(row.id, status);
  };

  const isPending = (id: string) => busyId === id;

  const terminal = rows.length > 0 && rows.every((r) => isTerminalStatus(r.status));
  const title = isShortlisted
    ? (language === 'bn' ? 'শর্টলিস্টেড প্রার্থী' : 'Shortlisted Candidates')
    : (language === 'bn' ? 'আবেদনসমূহ' : 'Applications');
  const subtitle = isShortlisted
    ? (language === 'bn' ? 'শর্টলিস্টেড প্রার্থীদের পরিচালনা করুন' : 'Manage shortlisted candidates')
    : (language === 'bn' ? 'আপনার পোস্ট করা জবে প্রাপ্ত আবেদনগুলি' : 'Applications received for your posted jobs');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">{title}</h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
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
              <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {!isApproved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          {language === 'bn' ? 'আবেদন পরিচালনা শুধুমাত্র যাচাইকৃত কোম্পানির জন্য।' : 'Application management is only available to approved companies.'}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'নাম, পেশা, জব…' : 'Search name, profession, job…'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
            {search.length > 0 && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
            >
              <option value="">{language === 'bn' ? 'সব জব' : 'All Jobs'}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.application_count})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                filtersOpen || statusFilters.length > 0
                  ? 'bg-red-50 border-red-200 text-[#E31B23]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</span>
              {statusFilters.length > 0 && (
                <span className="px-1.5 rounded-full bg-[#E31B23] text-white text-[9px]">{statusFilters.length}</span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CompanyApplicationSort)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {language === 'bn' ? APPLICATION_SORT_LABELS[s].bn : APPLICATION_SORT_LABELS[s].en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isShortlisted && (
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => {
              const active = statusFilters.includes(s);
              const count = rows.filter((r) => r.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                    active
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white border-transparent shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <ApplicationStatusPill status={s} language={language} size="sm" className={active ? 'bg-white/20 border-white text-white' : ''} />
                  {count > 0 && <span className={active ? 'opacity-90' : 'text-slate-500'}>{count}</span>}
                </button>
              );
            })}
            {statusFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilters([])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-500 hover:text-rose-600"
              >
                <X className="w-3 h-3" />
                {language === 'bn' ? 'মুছুন' : 'Clear'}
              </button>
            )}
          </div>
        )}

        {filtersOpen && !isShortlisted && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <details className="rounded-2xl border border-slate-200 p-3">
              <summary className="text-[11px] font-bold text-slate-700 cursor-pointer">
                {language === 'bn' ? 'অতিরিক্ত স্ট্যাটাস ফিল্টার' : 'More status filters'}
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => {
                  const active = statusFilters.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                        active ? 'bg-[#E31B23] border-[#E31B23] text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </details>
            <div className="rounded-2xl border border-slate-200 p-3 text-[11px] text-slate-600">
              <p className="font-bold text-slate-700 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                {language === 'bn' ? 'প্রোফাইল গোপনীয়তা' : 'Profile privacy'}
              </p>
              <p className="mt-1">
                {language === 'bn'
                  ? 'প্রার্থীর গোপনীয়তা নিয়ম মেনে ফোন, AI ও টাইমলাইন অনুযায়ী দেখানো হয়।'
                  : 'Phone, AI, and timeline are shown only when the candidate has opted in.'}
              </p>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600"
            >
              <X className="w-3 h-3" />
              <span>{language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-black text-slate-700">
              {language === 'bn' ? 'কোনো আবেদন পাওয়া যায়নি' : 'No applications found.'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {isShortlisted
                ? (language === 'bn' ? 'আবেদনসমূহ পৃষ্ঠা থেকে প্রার্থী শর্টলিস্ট করুন।' : 'Shortlist candidates from the Applications page.')
                : (language === 'bn' ? 'প্রার্থীরা আপনার জবে আবেদন করলে এখানে দেখা যাবে।' : 'Candidates applying to your jobs will appear here.')}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
              >
                <X className="w-3.5 h-3.5" />
                {language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 mb-3">
              {language === 'bn'
                ? `মোট ${total}টি আবেদন`
                : `${total} application${total === 1 ? '' : 's'} found`}
              {terminal && (
                <span className="ml-2 text-slate-400 italic">
                  {language === 'bn' ? 'সবগুলি সম্পন্ন' : '· All closed'}
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => (
                <ApplicationCard
                  key={row.id}
                  row={row}
                  language={language}
                  busy={isPending(row.id)}
                  onView={openProfile}
                  onViewMore={handleViewMore}
                  onTransition={(id, status) => handleTransition(id, status)}
                  onReject={(r) => handleReject(r)}
                  onConfirmAction={handleConfirmAction}
                  onScheduleInterview={handleScheduleInterview}
                  onMessage={handleMessage}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {language === 'bn'
                    ? `পৃষ্ঠা ${page + 1} / ${totalPages} · মোট ${total}`
                    : `Page ${page + 1} of ${totalPages} · ${total} total`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
                  >
                    <span>{language === 'bn' ? 'পরবর্তী' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CandidateProfileModal
        profileId={activeProfileId}
        fullName={activeProfileName}
        onClose={() => {
          setActiveProfileId(null);
          setActiveProfileName(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={
          confirmState?.status === 'Selected'
            ? (language === 'bn' ? 'প্রার্থী নির্বাচন করুন' : 'Select this candidate?')
            : (language === 'bn' ? 'ইন্টারভিউ নির্ধারণ করুন' : 'Schedule an interview?')
        }
        body={
          confirmState?.status === 'Selected'
            ? (language === 'bn'
                ? `${confirmState.row.applicant_name} কে নির্বাচিত হিসেবে চিহ্নিত করা হবে। এই সিদ্ধান্ত চূড়ান্ত — আবার পরিবর্তন করা যাবে না।`
                : `${confirmState?.row.applicant_name} will be marked as Selected. This is a final decision and cannot be reversed.`)
            : (language === 'bn'
                ? `${confirmState?.row.applicant_name} এর জন্য ইন্টারভিউ নির্ধারিত হিসেবে চিহ্নিত করা হবে।`
                : `${confirmState?.row.applicant_name} will be marked as Interview Scheduled.`)
        }
        confirmLabel={
          confirmState?.status === 'Selected'
            ? (language === 'bn' ? 'নির্বাচন নিশ্চিত করুন' : 'Confirm Selection')
            : (language === 'bn' ? 'নির্ধারণ নিশ্চিত করুন' : 'Confirm Schedule')
        }
        confirmTone={confirmState?.status === 'Selected' ? 'primary' : 'primary'}
        onConfirm={handleConfirmExecute}
        onCancel={() => setConfirmState(null)}
      />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 ${
            toast.kind === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{toast.message}</span>
        </div>
      )}

      <ScheduleInterviewModal
        open={!!scheduleCandidate}
        candidate={scheduleCandidate}
        onClose={() => setScheduleCandidate(null)}
        onScheduled={handleScheduled}
      />

    </div>
  );
};

export default CompanyApplicationsPage;
