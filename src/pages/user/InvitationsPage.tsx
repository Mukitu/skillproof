import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  listMyInvites,
  respondToMyInvite,
  type CompanyCandidateInvite,
} from '../../services/candidateInvites';

type FilterTab = 'pending' | 'accepted' | 'declined' | 'all';

function formatRelative(iso: string): string {
  try {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return iso;
    const diff = Date.now() - t;
    const m = Math.round(diff / 60000);
    const h = Math.round(m / 60);
    const d = Math.round(h / 24);
    if (m < 1) return 'just now';
    if (h < 1) return `${m}m ago`;
    if (d < 1) return `${h}h ago`;
    return `${d}d ago`;
  } catch {
    return iso;
  }
}

const STATUS_TONE: Record<string, string> = {
  pending:   'border-amber-200 bg-amber-50 text-amber-700',
  accepted:  'border-emerald-200 bg-emerald-50 text-emerald-700',
  declined:  'border-rose-200 bg-rose-50 text-rose-700',
  withdrawn: 'border-slate-200 bg-slate-50 text-slate-700',
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending:   Clock,
  accepted:  CheckCircle2,
  declined:  XCircle,
  withdrawn: X,
};

export const InvitationsPage: React.FC = () => {
  const { language } = useLanguage();
  const [rows, setRows] = useState<CompanyCandidateInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: data } = await listMyInvites(null, 100, 0);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, declined: 0, withdrawn: 0, all: 0 };
    rows.forEach((r) => {
      c.all += 1;
      if (c[r.status as keyof typeof c] !== undefined) c[r.status as keyof typeof c] += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const handleRespond = async (row: CompanyCandidateInvite, decision: 'accepted' | 'declined') => {
    setBusyId(row.invite_id);
    try {
      const result = await respondToMyInvite(row.invite_id, decision);
      if (result.ok) {
        setRows((prev) => prev.map((r) => (r.invite_id === row.invite_id ? { ...r, status: result.status ?? decision } : r)));
        setToast({
          kind: 'ok',
          text: decision === 'accepted'
            ? (language === 'bn' ? 'ইনভাইট গৃহীত হয়েছে' : 'Invite accepted')
            : (language === 'bn' ? 'ইনভাইট প্রত্যাখ্যান করা হয়েছে' : 'Invite declined'),
        });
      } else {
        setToast({
          kind: 'err',
          text: language === 'bn' ? 'অপারেশন ব্যর্থ' : 'Operation failed',
        });
      }
    } catch (e: any) {
      setToast({
        kind: 'err',
        text: e?.message ?? (language === 'bn' ? 'অপারেশন ব্যর্থ' : 'Operation failed'),
      });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const tabs: { key: FilterTab; labelEn: string; labelBn: string; n: number }[] = [
    { key: 'pending',  labelEn: 'Pending',  labelBn: 'অপেক্ষমাণ',  n: counts.pending },
    { key: 'accepted', labelEn: 'Accepted', labelBn: 'গৃহীত',     n: counts.accepted },
    { key: 'declined', labelEn: 'Declined', labelBn: 'প্রত্যাখ্যাত', n: counts.declined },
    { key: 'all',      labelEn: 'All',      labelBn: 'সব',         n: counts.all },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {language === 'bn' ? 'কোম্পানি ইনভাইটেশন' : 'Company Invitations'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {language === 'bn'
                  ? 'কোম্পানিগুলো আপনাকে যেসব চাকরিতে আমন্ত্রণ জানিয়েছে'
                  : 'Companies that invited you to apply'}
              </p>
            </div>
          </div>
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

      {toast && (
        <div
          role="status"
          className={`rounded-2xl border px-3 py-2 text-[11px] flex items-center gap-2 ${
            toast.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {toast.kind === 'ok' ? (
            <Award className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-3 flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap border transition ${
              tab === t.key
                ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white border-transparent shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>{language === 'bn' ? t.labelBn : t.labelEn}</span>
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold ${
              tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <Bell className="w-5 h-5" />
          </div>
          <p className="text-sm font-black text-slate-700">
            {language === 'bn' ? 'কোনো ইনভাইটেশন নেই' : 'No invitations yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {language === 'bn'
              ? 'আপনার যাচাইকৃত দক্ষতার ভিত্তিতে কোম্পানিগুলো আপনাকে ইনভাইট পাঠাবে।'
              : 'Companies will invite you based on your verified skills.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((row) => {
            const StatusIcon = STATUS_ICON[row.status] ?? Clock;
            const isExpanded = expandedId === row.invite_id;
            const isPending = row.status === 'pending';
            return (
              <div key={row.invite_id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-brand-sm hover:border-[#E31B23]/40 transition relative">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400 rounded-t-2xl" />
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{row.company_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {language === 'bn' ? 'পদের জন্য আমন্ত্রণ: ' : 'Invite for: '}
                          <span className="font-bold text-slate-700">{row.job_title || '—'}</span>
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_TONE[row.status] ?? STATUS_TONE.pending}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="capitalize">{row.status}</span>
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelative(row.created_at)}
                    </p>

                    {row.message && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        {row.message}
                      </div>
                    )}

                    {isPending && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.invite_id}
                          onClick={() => handleRespond(row, 'accepted')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-[11px] disabled:opacity-60"
                        >
                          {busyId === row.invite_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>{language === 'bn' ? 'গ্রহণ করুন' : 'Accept'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.invite_id}
                          onClick={() => handleRespond(row, 'declined')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 text-rose-600 font-bold text-[11px] disabled:opacity-60"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'প্রত্যাখ্যান' : 'Decline'}</span>
                        </button>
                      </div>
                    )}

                    {row.status === 'accepted' && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{language === 'bn' ? 'কোম্পানি এখন আপনার সাথে যোগাযোগ করতে পারবে।' : 'The company can now contact you.'}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.invite_id)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{isExpanded ? (language === 'bn' ? 'লুকান' : 'Hide') : (language === 'bn' ? 'বিস্তারিত' : 'Details')}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                        <div>
                          <span className="font-bold">{language === 'bn' ? 'প্রেরিত:' : 'Sent:'}</span>{' '}
                          {new Date(row.created_at).toLocaleString()}
                        </div>
                        {row.responded_at && (
                          <div>
                            <span className="font-bold">{language === 'bn' ? 'উত্তর:' : 'Responded:'}</span>{' '}
                            {new Date(row.responded_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-700">
            {language === 'bn' ? 'গোপনীয়তা' : 'Privacy'}
          </p>
          <p className="mt-0.5">
            {language === 'bn'
              ? 'আপনি গ্রহণ না করা পর্যন্ত কোম্পানি আপনার ব্যক্তিগত যোগাযোগের তথ্য দেখতে পাবে না।'
              : 'Until you accept, the company cannot see your private contact details.'}
          </p>
          <p className="mt-1">
            <Link to="/dashboard/jobs" className="text-[#E31B23] hover:underline font-bold inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              <span>{language === 'bn' ? 'সব জব দেখুন' : 'Browse jobs'}</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationsPage;