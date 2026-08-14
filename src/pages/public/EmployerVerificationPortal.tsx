/**
 * EmployerVerificationPortal
 * --------------------------
 * The single public SkillProof verification entry point. Mounted at
 * `/verify`. Anyone (employer, recruiter, candidate, admin) can paste
 * either a Passport ID or a candidate email and the page renders the
 * full verified CV-style profile straight from the live Supabase
 * database — no login, no demo data, no fake placeholders.
 *
 * URL behaviour:
 *   /verify                  → empty search
 *   /verify?id=<PASS_ID>     → auto-verifies the Passport and renders the CV
 *   /verify?id=<EMAIL>       → auto-verifies the candidate by email
 *   /verify?id=<OTHER>       → auto-runs the universal RPC and renders the result
 *
 * All other public routes (`/passport/:id`, `/profile/:id`,
 * `/certificate/:id`, `/verify/:id`) have been removed — this page is the
 * only public-facing verification surface in the SkillProof product.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, Mail, Search, ShieldCheck, Sparkles, XCircle, Award, IdCard } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { PublicProfileView } from '../../components/verify/profile/PublicProfileView';
import { CompanyProfileCard } from '../../components/verify/profile/CompanyProfileCard';
import { ShareButtons } from '../../components/verify/ShareButtons';
import {
  subscribeToPublicCandidateVerification,
  verifyCandidate,
} from '../../services/publicPassport';
import { logPublicVerification } from '../../services/courseCertificates';
import { getEmployerVerificationUrl, getPublicBaseUrl, normalizePassportId } from '../../utils/passportUrl';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { API_BASE_URL, apiUrl } from '../../config/api';
import { supabase } from '../../lib/supabase';
import type {
  PublicCandidateVerification,
  PublicCompanyVerification,
  PublicVerificationResponse,
} from '../../types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailShaped(raw: string): boolean {
  const s = (raw ?? '').trim();
  if (!s || s.length > 320) return false;
  const upper = s.toUpperCase();
  if (
    upper.startsWith('SP-BD-')
    || upper.startsWith('SPK-')
    || upper.startsWith('SP-CERT-')
    || upper.startsWith('SPK-CERT-')
    || upper.startsWith('SPBD')
  ) {
    return false;
  }
  return EMAIL_RE.test(s);
}

export const EmployerVerificationPortal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [passport, setPassport] = useState<PublicCandidateVerification | null>(null);
  const [company, setCompany] = useState<PublicCompanyVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeFlash, setRealtimeFlash] = useState(false);
  const [metaCache, setMetaCache] = useState<Record<string, any>>({});

  // Active lookup identity — used for analytics + realtime subscriptions.
  const lookupId = useMemo(() => {
    if (!passport) return null;
    return passport.passport_number ?? passport.public_profile_id ?? null;
  }, [passport]);

  const verify = useCallback(async (raw: string) => {
    const q = (raw ?? '').trim();
    if (!q) {
      setPassport(null);
      setCompany(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    setPassport(null);
    setCompany(null);
    try {
      const found: PublicVerificationResponse | null = await verifyCandidate(q);
      if (!found || found.kind === 'not_found') {
        setError(
          isEmailShaped(q)
            ? 'No SkillProof account matches that email address.'
            : 'Invalid Passport — no matching credential found in the SkillProof database.',
        );
        if (found?.kind === 'not_found') {
          void logPublicVerification(q, 'not_found').catch(() => {});
        }
        return;
      }

      // Company Gmail lookup → render the dedicated company card.
      if (found.kind === 'company') {
        setCompany(found as PublicCompanyVerification);
        void logPublicVerification(
          (found as PublicCompanyVerification).company?.email ?? q,
          'verified',
        ).catch(() => {});
        return;
      }

      // The /verify portal renders the unified CV shape. After migration
      // 20260814000021 the unified RPC also resolves Course Certificate
      // credential numbers (SP-CERT-…, SPK-CERT-…) to the candidate's
      // profile and emits a unified payload with a certificates[] array
      // — so searching by Course Certificate ID works exactly like
      // searching by Passport ID or email. Legacy 'certificate' kind is
      // no longer surfaced by the unified RPC, but if a legacy endpoint
      // still returns it we silently treat it as unified so the
      // candidate still renders.
      const f: any = found;
      if (
        f.kind !== 'passport'
        && f.kind !== 'unified'
        && f.kind !== 'private'
        && f.kind !== 'certificate'
      ) {
        setError('No matching SkillProof Passport found for that input.');
        return;
      }

      setPassport(found as PublicCandidateVerification);
      void logPublicVerification(
        (found as PublicCandidateVerification)?.passport_number ?? q,
        (found as any)?.result === 'private' ? 'private' : 'verified',
      ).catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'Verification lookup failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshMeta = useCallback(async (id: string) => {
    const apiBase = (API_BASE_URL || '').trim();
    if (!apiBase) return;
    try {
      const res = await fetch(apiUrl('/api/verify/meta?id=' + encodeURIComponent(id)), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      setMetaCache((prev) => ({ ...prev, [id]: data || { found: false } }));
    } catch {
      // Best-effort meta lookup.
    }
  }, []);

  // Auto-verify on mount when the URL carries `?id=`.
  useEffect(() => {
    const fromQuery = searchParams.get('id') ?? '';
    const target = (fromQuery || '').trim();
    if (!target) return;

    // Pre-populate the input box so the user can see what was searched.
    setInputValue(target);
    void verify(target);
    // Only refresh meta for Passport IDs (not emails).
    if (!isEmailShaped(target) && normalizePassportId(target)) {
      void refreshMeta(normalizePassportId(target));
    }
  }, [searchParams, verify, refreshMeta]);

  // Realtime: re-verify when the candidate's Passport changes.
  useEffect(() => {
    if (!passport?.passport_number) return;
    const unsub = subscribeToPublicCandidateVerification(passport.passport_number, () => {
      setRealtimeFlash(true);
      void verify(passport.passport_number);
      setTimeout(() => setRealtimeFlash(false), 2500);
    });
    return unsub;
  }, [passport?.passport_number, verify]);

  // Realtime: re-fetch the company card whenever the company row
  // changes — guarantees admin edits in Supabase (company_name,
  // logo_url, etc.) reflect immediately on the open /verify tab.
  useEffect(() => {
    const companyId = company?.company?.id;
    const companyEmail = company?.company?.email;
    if (!companyId || !companyEmail) return;
    const channel = supabase
      .channel(`public-company:${companyId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${companyId}`,
        },
        () => {
          setRealtimeFlash(true);
          void verify(companyEmail);
          setTimeout(() => setRealtimeFlash(false), 2500);
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [company?.company?.id, company?.company?.email, verify]);

  const lookupMeta = lookupId ? metaCache[lookupId] : null;
  const candidateName = passport?.candidate?.full_name ?? '';
  const mainCategory = passport?.candidate?.main_category ?? 'Skill Passport';

  // For company lookups we never produce a /passport share URL — the
  // /verify result is the company card itself, not a passport.
  const isCompanyLookup = Boolean(company);

  useDocumentMeta({
    title: lookupMeta?.title
      ?? (company
        ? `Verified Company · ${company.company.name} · SkillProof`
        : passport?.passport_number
        ? `Verification Result · ${passport.passport_number} · SkillProof`
        : 'Employer Verification Portal · SkillProof'),
    description:
      lookupMeta?.description
      ?? (company
        ? `${company.company.name} is a verified SkillProof company account.`
        : 'Verify any SkillProof Passport by Passport ID or candidate email. Real-time lookup against the SkillProof database.'),
    passport: passport?.passport_number
      ? ({
          passport_number: passport.passport_number,
          full_name: candidateName,
          avatar_url: passport.candidate?.avatar_url ?? null,
        } as any)
      : null,
    profile: passport?.candidate
      ? ({ full_name: candidateName, avatar_url: passport.candidate.avatar_url } as any)
      : null,
    url: lookupMeta?.public_url
      ?? getEmployerVerificationUrl() + (lookupId ? '?id=' + encodeURIComponent(lookupId) : ''),
    // Note: getEmployerVerificationUrl() now returns /passport, which is
    // the friendly alias the QR codes and share links use. The React
    // Router redirects /passport → /verify so the same page renders.
    image: lookupMeta?.image ?? company?.company?.logo_url ?? null,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    // Email or Passport ID — both go on the friendly /passport alias
    // (which 301s to /verify?id=… via the React Router redirect).
    navigate(`/passport?id=${encodeURIComponent(q)}`);
    void verify(q);
  };

  const samplePassportId = 'SP-BD-2026-000001';
  const sampleCertId = 'SP-CERT-2026-000001';
  const shareUrl = lookupId && !isCompanyLookup
    ? getPublicBaseUrl() + '/passport?id=' + encodeURIComponent(lookupId)
    : null;

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
              }}
            />
            <div className="text-center space-y-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-[11px] font-extrabold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Employer Verification Portal
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 break-words">
                Verify a SkillProof Passport
              </h1>
              <p className="text-sm text-slate-500 max-w-2xl mx-auto break-words">
                <span className="font-semibold text-slate-700">No login required.</span>{' '}
                Search by a candidate's{' '}
                <span className="font-semibold text-slate-700">Passport ID</span>, their{' '}
                <span className="font-semibold text-slate-700">email address</span>, or their{' '}
                <span className="font-semibold text-slate-700">Course Certificate number</span>{' '}
                to view their full verified profile.
              </p>
            </div>
          </header>

          {/*
            Search box. Auto-detects whether the input is a Passport ID or
            an email address and dispatches accordingly. The "Verify Now"
            button is also wired to the form submit so Enter-key works.
          */}
          <form onSubmit={onSubmit} className="max-w-3xl mx-auto" aria-label="Verify a candidate">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="Passport ID, candidate email, or Course Certificate number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E31B23]"
                  aria-label="Passport ID, candidate email, or Course Certificate number"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !inputValue.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {busy ? 'Verifying…' : 'Verify Now'}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Tip: candidates share their verification link — paste it above or scan the
              QR code on their Passport.
            </p>
          </form>

          {realtimeFlash && (
            <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 animate-pulse">
              <Sparkles className="w-4 h-4" /> Live update received from SkillProof database.
            </div>
          )}

          {busy && (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin text-amber-500" />
              Looking up the record in the SkillProof database…
            </div>
          )}

          {error && !busy && (
            <div className="max-w-2xl mx-auto rounded-3xl border-2 border-rose-200 bg-rose-50 p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-rose-700">Not Verified</h2>
                    <span className="rounded-full bg-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      ❌ No Match
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-rose-700">{error}</p>
                  <p className="mt-3 text-xs text-rose-600">
                    Double-check the Passport ID or email with the candidate, or ask them
                    to share their verification link directly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {passport && !busy && (
            <div className="max-w-4xl mx-auto space-y-5">
              {shareUrl && (
                <div className="flex items-center justify-end">
                  <ShareButtons
                    url={shareUrl}
                    title={`SkillProof Verified Profile — ${candidateName || passport.passport_number}`}
                    description={`Verified by SkillProof. ${mainCategory}.`}
                    fullName={candidateName}
                  />
                </div>
              )}
              <PublicProfileView payload={passport} verificationUrl={shareUrl} />
            </div>
          )}

          {company && !busy && !passport && (
            <div className="max-w-2xl mx-auto">
              <CompanyProfileCard payload={company} />
            </div>
          )}

          {!passport && !company && !busy && !error && (
            <section className="max-w-4xl mx-auto space-y-5">
              {/* Three lookup options — visually scannable cards. */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  How verification works
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">No login required.</span>{' '}
                  Paste any of the three identifiers below and click{' '}
                  <span className="font-semibold text-slate-800">Verify Now</span> to view the
                  candidate's full verified profile.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {/* Passport ID */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <IdCard className="h-4 w-4" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Passport ID
                      </h3>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-700 break-all">
                      {samplePassportId}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Mail className="h-4 w-4" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        Email
                      </h3>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-700 break-all">
                      candidate@example.com
                    </p>
                  </div>

                  {/* Course Certificate */}
                  <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                        <Award className="h-4 w-4" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700">
                        Course Certificate
                      </h3>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-700 break-all">
                      {sampleCertId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy notice — kept slim so it doesn't dominate the page. */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>
                  <span className="font-semibold text-slate-800">Privacy:</span> SkillProof privacy
                  rules apply — phone, address, and personal fields are only shown when the candidate
                  has explicitly opted in. Email-based lookups return every category Passport the
                  candidate holds plus their full verified CV and any issued Course Certificates.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EmployerVerificationPortal;
