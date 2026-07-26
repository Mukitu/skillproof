import { useCallback, useEffect, useMemo, useState, type FormEvent, type Key as ReactKey } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Clock, ExternalLink, Lock, Plus, RefreshCcw, Send, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { PassportCard } from '../../components/passport/PassportCard';
import { ShareToolbar } from '../../components/passport/ShareToolbar';
import { useAuth } from '../../context/AuthContext';
import {
  daysUntilPassportExpiry, getMyPassports, isPassportExpired,
  listEligibleCategoriesForUser, listMyPassportRenewals, requestPassportManually,
  requestPassportRenewal,
} from '../../services/passports';
import { getMyProfile } from '../../services/profile';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  PassportCategoryEligibility, PassportRenewalHistory, Profile, SkillPassport,
} from '../../types/database';

/**
 * Premium SkillPassport page.
 *  - "Request Passport" card with per-category eligibility + manual request.
 *  - Active passport rendered as the enterprise digital card.
 *  - Expired passport banner + renewal flow.
 *  - Pending / archived / rejected sections.
 *  - Realtime: skill_passports, passport_renewal_history, skill_verification_submissions.
 */
export const SkillPassportPage = () => {
  const { user } = useAuth();
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [eligibility, setEligibility] = useState<PassportCategoryEligibility[]>([]);
  const [renewals, setRenewals] = useState<PassportRenewalHistory[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, prof, elig, ren] = await Promise.all([
        getMyPassports(),
        getMyProfile(),
        listEligibleCategoriesForUser().catch(() => []),
        listMyPassportRenewals().catch(() => []),
      ]);
      setPassports(p);
      setProfile(prof);
      setEligibility(elig);
      setRenewals(ren);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Could not load passport data.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(
    ['skill_passports', 'passport_renewal_history', 'passport_level_history', 'skill_verification_submissions'],
    load,
  );

  const active = useMemo(
    () => passports.find((p) => p.status === 'active' && !isPassportExpired(p)),
    [passports],
  );
  const expired = useMemo(
    () => passports.find((p) => p.status === 'active' && isPassportExpired(p)),
    [passports],
  );
  const pending = passports.filter((p) => p.status === 'pending_approval');
  const rejected = passports.filter((p) => p.status === 'rejected');
  const archived = passports.filter(
    (p) => !active && !expired && !pending.includes(p) && !rejected.includes(p),
  );

  const request = async (categoryId: string, motivation: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await requestPassportManually(categoryId, motivation);
      setSuccess(
        result.status === 'pending_approval'
          ? `Passport request submitted for ${result.main_category_name || 'this category'}. An admin will review it shortly.`
          : 'Passport already exists for this category.',
      );
      setShowRequest(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit passport request.');
    } finally {
      setBusy(false);
    }
  };

  const requestRenewal = async (passportId: string, notes: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await requestPassportRenewal(passportId, notes);
      setSuccess('Renewal request submitted. An admin will review it shortly.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit renewal request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Skill Passport</h1>
          <p className="mt-1 text-sm text-gray-500">
            Build a verified industry passport. Earn levels. Share with employers.
          </p>
        </div>
        <button
          onClick={() => setShowRequest(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:from-red-700 hover:to-orange-600"
        >
          <Plus size={16} /> Request Passport
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0" />{success}
        </div>
      )}

      {/* Active passport hero */}
      {active && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Passport</p>
            <Link
              to={`/passport/${active.passport_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={12} /> View Public Page
            </Link>
          </div>
          <PassportCard passport={active} profile={profile} mode="full" />
          <div className="flex flex-wrap items-center gap-3">
            <ExpiryCountdown passport={active} />
            {active.renewal_status !== 'requested' && (
              <button
                onClick={() => requestRenewal(active.id, 'User-initiated renewal request.')}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                <RefreshCcw size={14} /> Request Renewal
              </button>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Share your passport</p>
            <ShareToolbar passport={active} profile={profile} variant="full" />
          </div>
          <RenewalHistory renewals={renewals.filter((r) => r.passport_id === active.id)} />
        </div>
      )}

      {/* Expired passport banner */}
      {expired && (
        <div className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <X className="mt-0.5 shrink-0 text-rose-500" size={20} />
            <div>
              <p className="font-semibold text-rose-900">Your passport has expired</p>
              <p className="text-sm text-rose-700">
                Expired on {new Date(expired.expiry_date!).toLocaleDateString()}. Request a renewal to
                restore the verified badge.
              </p>
            </div>
          </div>
          <PassportCard passport={expired} profile={profile} mode="full" />
          <ExpiryCountdown passport={expired} />
          <RenewalHistory renewals={renewals.filter((r) => r.passport_id === expired.id)} />
          {expired.renewal_status !== 'requested' && (
            <button
              onClick={() => requestRenewal(expired.id, 'Renewal for expired passport.')}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <RefreshCcw size={16} /> Request Renewal
            </button>
          )}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">Pending Approval ({pending.length})</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((p) => (
              <div key={p.id} className="space-y-2">
                <PassportCard passport={p} profile={profile} mode="full" />
                {p.revisions_requested && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <strong>Revisions requested:</strong> {p.revisions_requested}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">Rejected ({rejected.length})</h2>
          <div className="space-y-2">
            {rejected.map((p) => (
              <div key={p.id} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
                <p className="font-semibold text-rose-900">{p.title || p.passport_number}</p>
                {p.reject_reason && <p className="mt-1 text-rose-700">{p.reject_reason}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Archived / other */}
      {archived.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-900">Archived</h2>
          <div className="space-y-2">
            {archived.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-semibold text-gray-700">{p.title || p.passport_number}</p>
                <p className="text-xs text-gray-500">Status: {p.status}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!passports.length && !eligibility.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto mb-3 text-amber-500" size={32} />
          <p className="font-semibold text-gray-900">No passports yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Pass 5 verifications in one main category to unlock auto-eligibility, or request manually.
          </p>
          <button
            onClick={() => setShowRequest(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Request Passport
          </button>
        </div>
      )}

      {/* Request modal */}
      {showRequest && (
        <RequestModal
          eligibility={eligibility}
          passports={passports}
          busy={busy}
          onClose={() => setShowRequest(false)}
          onSubmit={request}
        />
      )}

      {/* Logged-in hint */}
      {user && (
        <p className="text-[11px] text-gray-400">
          Signed in as <strong>{user.email}</strong>
        </p>
      )}
    </div>
  );
};

function ExpiryCountdown({ passport }: { passport: SkillPassport }) {
  const days = daysUntilPassportExpiry(passport);
  if (days == null) return null;
  const expired = days < 0;
  const tone = expired
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : days < 30
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${tone}`}>
      <Clock size={12} /> {expired ? `Expired ${Math.abs(days)} days ago` : `${days} days until expiry`}
    </div>
  );
}

function RenewalHistory({ renewals }: { renewals: PassportRenewalHistory[] }) {
  if (!renewals.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Renewal History</p>
      <ul className="space-y-1.5">
        {renewals.map((r) => {
          const tone =
            r.decision === 'renewed' ? 'bg-emerald-100 text-emerald-700'
            : r.decision === 'rejected' ? 'bg-rose-100 text-rose-700'
            : 'bg-amber-100 text-amber-700';
          return (
            <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-600">
                Requested {new Date(r.requested_at).toLocaleDateString()}
                {r.decided_at && ` · Decided ${new Date(r.decided_at).toLocaleDateString()}`}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${tone}`}>
                {r.decision ?? 'Pending'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RequestModal({
  eligibility, passports, busy, onClose, onSubmit,
}: {
  eligibility: PassportCategoryEligibility[];
  passports: SkillPassport[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (categoryId: string, motivation: string) => void;
}) {
  const [selected, setSelected] = useState<string>('');
  const [motivation, setMotivation] = useState('');

  const eligibleRows = eligibility.filter((e) => e.is_eligible);
  const nonEligibleRows = eligibility.filter((e) => !e.is_eligible && !e.has_pending_passport && !e.has_active_passport);
  const existingPassportCategories = new Set(
    passports.filter((p) => p.status === 'active' || p.status === 'pending_approval').map((p) => p.category_id),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !motivation.trim()) return;
    onSubmit(selected, motivation.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShieldCheck className="text-amber-500" size={20} /> Request Passport
          </h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible categories</p>
            {eligibleRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                No categories have reached 5 Passed verifications yet. You can still request manually below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {eligibleRows.map((e) => (
                  <CategoryOption
                    key={e.category_id}
                    row={e}
                    selected={selected === e.category_id}
                    onSelect={() => setSelected(e.category_id)}
                  />
                ))}
              </div>
            )}
          </div>
          {nonEligibleRows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Not yet eligible</p>
              <div className="space-y-1.5">
                {nonEligibleRows.map((e) => (
                  <CategoryOption
                    key={e.category_id}
                    row={e}
                    selected={selected === e.category_id}
                    onSelect={() => setSelected(e.category_id)}
                    disabled={existingPassportCategories.has(e.category_id)}
                  />
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-700">Motivation</span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              required
              minLength={10}
              rows={3}
              placeholder="Tell us why you deserve this passport..."
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500">
              <Lock size={11} className="inline" /> One pending passport per category.
            </p>
            <button
              type="submit"
              disabled={busy || !selected || !motivation.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Send size={14} /> {busy ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryOption({
  row, selected, onSelect, disabled, key: _key,
}: {
  row: PassportCategoryEligibility;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  key?: ReactKey;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition ${
        selected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-900">{row.category_name}</p>
        <p className="text-[11px] text-gray-500">
          {row.passed_count} passed · avg {Number(row.average_marks).toFixed(1)}/10
        </p>
      </div>
      {row.is_eligible && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Eligible
        </span>
      )}
    </button>
  );
}

export default SkillPassportPage;