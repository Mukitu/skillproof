import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Award, BadgeCheck, Briefcase, Building2, Calendar,
  CheckCircle2, Clock, Globe, Hash, Hash as HashIcon, History, Image as ImageIcon,
  Linkedin, Loader2, Mail, MapPin, QrCode, Search, ShieldCheck, Sparkles, Star,
  Target, TrendingUp, User as UserIcon, XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { PassportSeal } from '../../components/passport/PassportSeal';
import { LevelBadge } from '../../components/passport/LevelBadge';
import { ShareToolbar } from '../../components/passport/ShareToolbar';
import {
  getPublicPassportBundle, subscribeToPublicPassport,
  type PublicPassportBundle, type PublicProfile,
} from '../../services/publicPassport';
import { getPublicPassportUrl, getEmployerVerificationUrl, getPublicOrigin } from '../../utils/passportUrl';
import { downloadPassportPng, downloadPassportPdf } from '../../services/passportDownload';
import { isPassportExpired } from '../../services/passports';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { SkillPassport } from '../../types/database';

/**
 * Employer Verification Portal — `/verify`
 *
 * Anyone can verify a candidate's Skill Passport by:
 *   - typing the Passport ID
 *   - scanning a QR code (the camera input below opens a live scanner)
 *   - opening a deep link with `?id=SP-BD-...` (set by the QR code)
 *
 * The result shows ✅ Verified Passport or ❌ Invalid Passport, then
 * every public detail loaded directly from Supabase.
 */
export const EmployerVerificationPortal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<PublicPassportBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeFlash, setRealtimeFlash] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState<'pdf' | 'png' | null>(null);

  const verify = useCallback(async (query: string) => {
    const q = (query ?? '').trim();
    if (!q) {
      setBundle(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await getPublicPassportBundle(q);
      if (!found) {
        setBundle(null);
        setError('Invalid Passport — no matching credential found in the SkillProof database.');
        return;
      }
      setBundle(found);
    } catch (e: any) {
      setBundle(null);
      setError(e?.message || 'Verification lookup failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  // Verify when ?id= is provided (QR deep link).
  useEffect(() => {
    const id = searchParams.get('id') ?? searchParams.get('passport') ?? '';
    if (id) {
      setInputValue(id);
      void verify(id);
    }
  }, [searchParams, verify]);

  // Realtime updates for the currently shown passport.
  useEffect(() => {
    if (!bundle?.passport?.passport_number) return;
    const unsub = subscribeToPublicPassport(bundle.passport.passport_number, () => {
      setRealtimeFlash(true);
      void verify(bundle.passport.passport_number);
      setTimeout(() => setRealtimeFlash(false), 2500);
    });
    return unsub;
  }, [bundle?.passport?.passport_number, verify]);

  useDocumentMeta({
    title: bundle?.passport
      ? `Verification Result · ${bundle.passport.passport_number} · SkillProof`
      : 'Employer Verification Portal · SkillProof',
    description: 'Verify SkillProof passports by ID or QR code. Real-time lookup against the SkillProof database.',
    passport: bundle?.passport,
    profile: bundle?.profile ? ({ full_name: bundle.profile.full_name, avatar_url: bundle.profile.avatar_url } as any) : null,
    url: getEmployerVerificationUrl(),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    navigate(`/verify?id=${encodeURIComponent(q)}`);
    void verify(q);
  };

  const onDownload = async (kind: 'pdf' | 'png') => {
    if (!bundle) return;
    setDownloadBusy(kind);
    try {
      if (kind === 'pdf') await downloadPassportPdf(bundle);
      else await downloadPassportPng(bundle);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#ED1C24] text-[11px] font-extrabold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" /> Employer Verification Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Verify any SkillProof Passport
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              No login required. Enter the Passport ID or scan the candidate's
              QR code. SkillProof returns the live verification record straight
              from the database.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Passport ID — e.g. SP-BD-2026-000001"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ED1C24]"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !inputValue.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ED1C24] to-[#F58220] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {busy ? 'Verifying…' : 'Verify Now'}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Tip: candidates share their verification URL — paste it above or use
              <span className="font-mono text-slate-600"> ?id=&lt;PASSNPORT_ID&gt;</span>.
            </p>
          </form>

          {/* Realtime flash banner */}
          {realtimeFlash && (
            <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 animate-pulse">
              <Sparkles className="w-4 h-4" /> Live update received from SkillProof database.
            </div>
          )}

          {/* Loading */}
          {busy && (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin text-amber-500" />
              Looking up the passport in the SkillProof database…
            </div>
          )}

          {/* Error / Invalid */}
          {error && !busy && (
            <div className="max-w-2xl mx-auto rounded-3xl border-2 border-rose-200 bg-rose-50 p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-rose-700">Invalid Passport</h2>
                    <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      ❌ Not Verified
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-rose-700">{error}</p>
                  <p className="mt-3 text-xs text-rose-600">
                    Double-check the ID with the candidate, or ask them to share
                    their public verification link directly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Valid result */}
          {bundle && !busy && (
            <div className="max-w-3xl mx-auto space-y-6">
              <ResultHero bundle={bundle} />

              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-lg">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Passport Holder" value={bundle.profile.full_name} icon={<UserIcon className="w-4 h-4" />} />
                  <Field label="Main Category" value={bundle.passport.main_category_name ?? '—'} icon={<Award className="w-4 h-4" />} />
                  <Field label="Skill Tags" value={bundle.passport.skill_tags?.length ? bundle.passport.skill_tags.join(', ') : '—'} icon={<Target className="w-4 h-4" />} />
                  <Field
                    label="Passport Level"
                    value={bundle.passport.level}
                    icon={<Star className="w-4 h-4" />}
                    right={<LevelBadge level={bundle.passport.level} size="sm" />}
                  />
                  <Field label="Issue Date" value={fmt(bundle.passport.issue_date)} icon={<Calendar className="w-4 h-4" />} />
                  <Field
                    label="Expiry Date"
                    value={fmt(bundle.passport.expiry_date)}
                    icon={<Calendar className="w-4 h-4" />}
                    tone={isPassportExpired(bundle.passport) ? 'rose' : 'default'}
                  />
                  <Field
                    label="Verification Status"
                    value={verificationStatus(bundle.passport)}
                    icon={<BadgeCheck className="w-4 h-4" />}
                    tone={verificationTone(bundle.passport)}
                  />
                  <Field
                    label="Official Seal"
                    value="SkillProof Verified"
                    icon={<ShieldCheck className="w-4 h-4" />}
                    tone="emerald"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onDownload('pdf')}
                    disabled={downloadBusy !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ED1C24] to-[#F58220] px-4 py-2.5 text-sm font-bold text-white shadow disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" /> {downloadBusy === 'pdf' ? '…' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => onDownload('png')}
                    disabled={downloadBusy !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" /> {downloadBusy === 'png' ? '…' : 'Download PNG'}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Share verification record</p>
                  <ShareToolbar passport={bundle.passport} profile={bundle.profile as any} variant="full" />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <span className="font-mono break-all">{getPublicPassportUrl(bundle.passport.passport_number)}</span>
                  <Link
                    to={`/passport/${bundle.passport.passport_number}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#ED1C24] hover:underline"
                  >
                    View full passport <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Verification timeline */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-lg">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <History className="w-4 h-4 text-[#ED1C24]" /> Verification Timeline
                </h3>
                <Timeline bundle={bundle} />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// ===== Helpers =====

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
}

function verificationStatus(p: SkillPassport): string {
  if (p.status === 'active' && !isPassportExpired(p)) return 'Verified · Active';
  if (isPassportExpired(p)) return 'Expired';
  if (p.status === 'pending_approval') return 'Pending Review';
  if (p.status === 'suspended' || p.status === 'archived') return 'Suspended';
  if (p.status === 'rejected') return 'Rejected';
  return p.status;
}

function verificationTone(p: SkillPassport): 'emerald' | 'amber' | 'rose' | 'default' {
  if (p.status === 'active' && !isPassportExpired(p)) return 'emerald';
  if (isPassportExpired(p)) return 'rose';
  if (p.status === 'pending_approval') return 'amber';
  if (p.status === 'rejected') return 'rose';
  if (p.status === 'suspended' || p.status === 'archived') return 'amber';
  return 'default';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function Field({
  label, value, icon, tone = 'default', right,
}: {
  label: string; value: string; icon?: ReactNode;
  tone?: 'default' | 'emerald' | 'amber' | 'rose';
  right?: ReactNode;
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700'
    : tone === 'amber' ? 'text-amber-700'
    : tone === 'rose' ? 'text-rose-700'
    : 'text-slate-900';
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`text-sm font-bold ${toneClass}`}>{value}</p>
        {right}
      </div>
    </div>
  );
}

function ResultHero({ bundle }: { bundle: PublicPassportBundle }) {
  const { passport, profile } = bundle;
  const publicUrl = getPublicPassportUrl(passport.passport_number);
  const valid = passport.status === 'active' && !isPassportExpired(passport);

  return (
    <div className={`rounded-3xl border-2 p-6 shadow-lg ${valid ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow ${valid ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {valid ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-xl font-black ${valid ? 'text-emerald-800' : 'text-amber-800'}`}>
              {valid ? 'Verified Passport' : 'Passport Found — Not Currently Verified'}
            </h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${valid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
              {valid ? '✅ Verified' : '⚠ Review'}
            </span>
          </div>
          <p className={`mt-1 text-sm ${valid ? 'text-emerald-700' : 'text-amber-700'}`}>
            This passport exists in the SkillProof database. {valid
              ? 'Its signature, level and dates are all valid.'
              : `Current status: ${verificationStatus(passport)}.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-amber-300" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-xl font-black text-white">
              {initials(profile.full_name)}
            </div>
          )}
          <div>
            <p className="text-lg font-black text-slate-900">{profile.full_name}</p>
            <p className="font-mono text-xs text-slate-500">{passport.passport_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-self-end">
          <PassportSeal size={56} variant="compact" animated={valid} />
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-white p-2 shadow ring-1 ring-slate-200"
            title={publicUrl}
          >
            <QRCodeSVG value={publicUrl} size={88} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin={false} />
          </a>
        </div>
      </div>
    </div>
  );
}

function Timeline({ bundle }: { bundle: PublicPassportBundle }) {
  const { passport, levelHistory, renewalHistory } = bundle;
  const events: Array<{ id: string; at: string; label: string; detail?: string }> = [];
  if (passport.signed_at) {
    events.push({
      id: `sign-${passport.id}`,
      at: passport.signed_at,
      label: 'Verified by SkillProof admin',
      detail: passport.digital_signature ? `Signature: ${passport.digital_signature.slice(0, 24)}…` : undefined,
    });
  }
  if (passport.issue_date) {
    events.push({ id: `issue-${passport.id}`, at: passport.issue_date, label: 'Passport issued' });
  }
  for (const r of renewalHistory) {
    events.push({
      id: `ren-${r.id}`,
      at: r.decided_at ?? r.requested_at,
      label: r.decision === 'renewed' ? 'Passport renewed' : r.decision === 'rejected' ? 'Renewal rejected' : 'Renewal requested',
      detail: r.admin_notes ?? undefined,
    });
  }
  for (const l of levelHistory) {
    events.push({
      id: `lvl-${l.id}`,
      at: l.changed_at,
      label: `Level: ${l.old_level} → ${l.new_level}`,
      detail: l.reason ?? undefined,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (events.length === 0) {
    return <p className="text-sm text-slate-500 italic">No timeline events recorded.</p>;
  }
  return (
    <ol className="relative ml-2 border-l-2 border-slate-200 pl-5 space-y-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <p className="text-xs font-bold text-slate-900">{e.label}</p>
          <p className="text-[11px] text-slate-500">{new Date(e.at).toLocaleString()}</p>
          {e.detail && <p className="mt-1 text-xs text-slate-600">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

export default EmployerVerificationPortal;