/* eslint-disable react/no-unescaped-entities */
import React from 'react';

/**
 * CredentialPanel
 * ---------------
 * Wraps the existing VerifiedCvProfile with the new professional
 * Digital Credential sections that are required by the /verify page.
 *
 * IMPORTANT — existing search & verification flow is untouched:
 *   - The Passport ID / email search box, Verify Now button, RTL
 *     realtime subscription, backend RPC, privacy rules, and error
 *     handling are all untouched in EmployerVerificationPortal.
 *   - The full VerifiedCvProfile component is rendered unchanged
 *     below the new credential sections.
 *
 * New sections (all driven by real database data — no fake
 * placeholders, no demo numbers; hidden gracefully when empty):
 *
 *   1. AUTHENTIC & VERIFIED header block with big tick
 *   2. SKILL PASSPORT ID card (prominent)
 *   3. CREDENTIAL INTEGRITY check-list
 *   4. ASSESSMENT PERFORMANCE score grid
 *   5. VERIFIED SKILL EVIDENCE (existing data, enhanced)
 *   6. PROFESSIONAL SNAPSHOT
 *   7. PERMANENT VERIFICATION LINK + Copy button
 *   8. SCAN TO VERIFY QR (re-uses existing QR URL)
 *   9. Credential state pill (Active / Expiring / Expired / Revoked / Private / Not Found)
 *  10. Employer-friendly share actions
 *
 * The exported default is the same component as before so main.tsx
 * routes don't change.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  Award,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Hash,
  Layers,
  Link as LinkIcon,
  Link2,
  Mail,
  MapPin,
  QrCode,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { ShareButtons } from './ShareButtons';
import { VerifiedCvProfile } from './VerifiedCvProfile';
import { getPublicBaseUrl } from '../../utils/appUrl';
import type {
  PublicCandidateVerification,
  PublicVerificationResult,
} from '../../types/database';

interface Props {
  payload: PublicCandidateVerification;
  showAdminActions?: boolean;
  /**
   * Full public URL of this verification page (e.g. https://skillproof.top/verify?id=SP-BD-…)
   * Used for the QR code + permanent verification link.
   */
  verificationUrl?: string | null;
}

/* ---------- visual helpers ---------- */

type CredentialState =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'revoked'
  | 'private'
  | 'not_found';

function classifyCredentialState(payload: PublicCandidateVerification): CredentialState {
  const status = String(payload.status ?? '').toLowerCase();
  const result = String(payload.result ?? '').toLowerCase();

  if (result === 'not_found' || status === 'not_found') return 'not_found';
  if (result === 'private' || status === 'private') return 'private';
  if (status === 'revoked' || payload.revoked_at) return 'revoked';
  if (status === 'expired' || result === 'expired') return 'expired';

  // Expiring soon: still active but expiry is within 30 days.
  if (payload.expiry_date) {
    const exp = new Date(payload.expiry_date).getTime();
    if (Number.isFinite(exp)) {
      const now = Date.now();
      const diffDays = Math.round((exp - now) / (24 * 60 * 60 * 1000));
      if (diffDays <= 30 && diffDays >= 0) return 'expiring_soon';
    }
  }
  return 'active';
}

interface StateVisual {
  label: string;
  badge: string;
  pill: string;
  icon: 'active' | 'expiring' | 'expired' | 'revoked' | 'private' | 'not_found';
  blurb: string;
}

function stateVisual(s: CredentialState): StateVisual {
  switch (s) {
    case 'active':
      return {
        label: 'Active',
        badge: 'AUTHENTIC & VERIFIED',
        pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: 'active',
        blurb: 'This credential is currently active and verified against the SkillProof database.',
      };
    case 'expiring_soon':
      return {
        label: 'Expiring Soon',
        badge: 'AUTHENTIC — EXPIRING SOON',
        pill: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: 'expiring',
        blurb: 'This credential is still valid but will expire within 30 days.',
      };
    case 'expired':
      return {
        label: 'Expired',
        badge: 'CREDENTIAL EXPIRED',
        pill: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: 'expired',
        blurb: 'This credential has expired. The holder must renew it via SkillProof.',
      };
    case 'revoked':
      return {
        label: 'Revoked',
        badge: 'CREDENTIAL REVOKED',
        pill: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: 'revoked',
        blurb: 'This credential has been revoked by SkillProof. Do not rely on it.',
      };
    case 'private':
      return {
        label: 'Private / Restricted',
        badge: 'PUBLIC VIEW DISABLED',
        pill: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: 'private',
        blurb: 'The holder has not enabled public employer view for this credential.',
      };
    case 'not_found':
      return {
        label: 'Not Found',
        badge: 'NO MATCH',
        pill: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: 'not_found',
        blurb: 'No matching credential found in the SkillProof database.',
      };
  }
}

function StateIcon({ kind }: { kind: StateVisual['icon'] }) {
  const cls = 'h-4 w-4';
  if (kind === 'active') return <CheckCircle2 className={cls} />;
  if (kind === 'expiring') return <Clock className={cls} />;
  if (kind === 'expired') return <Clock className={cls} />;
  if (kind === 'revoked') return <AlertOctagon className={cls} />;
  if (kind === 'private') return <Shield className={cls} />;
  return <XCircle className={cls} />;
}

function fmtDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return fallback;
  }
}

/* ---------- QR helper ---------- */

function qrUrl(data: string): string {
  const enc = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${enc}&color=0b1e3f&bgcolor=ffffff&margin=2&qzone=2`;
}

/* ---------- small component: copy button ---------- */

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
      aria-label="Copy verification link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy Verification Link'}
    </button>
  );
}

/* ---------- whitespace-aware section helper ---------- */

function Section({
  title,
  icon,
  subtitle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 px-6 py-5 sm:px-8">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className="text-[#E31B23]">{icon}</span> {title}
        </h2>
        {badge ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#E31B23]">
            {badge}
          </span>
        ) : null}
        {subtitle ? (
          <p className="text-[11px] text-slate-500 text-right max-w-[60%]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* ---------- main component ---------- */

export function CredentialPanel({ payload, showAdminActions = false, verificationUrl }: Props) {
  const candidate = payload.candidate;
  const passportNumber = payload.passport_number ?? '';
  const candidateName = candidate?.full_name ?? 'SkillProof Member';
  const mainCategory = candidate?.main_category ?? candidate?.profession ?? 'SkillProof Passport';

  // The verification URL — what the QR + share use.
  const verifyUrl = useMemo(() => {
    if (verificationUrl && /^https?:\/\//i.test(verificationUrl)) return verificationUrl;
    if (payload.verification_url && /^https?:\/\//i.test(payload.verification_url)) return payload.verification_url;
    if (passportNumber) return `${getPublicBaseUrl()}/verify?id=${encodeURIComponent(passportNumber)}`;
    return null;
  }, [verificationUrl, payload.verification_url, passportNumber]);

  const state = useMemo(() => classifyCredentialState(payload), [payload]);
  const visual = stateVisual(state);

  // If the credential is not found / private, render the existing CV
  // component (which already handles those cases) and skip the new
  // credential panel above it.
  if (state === 'not_found' || state === 'private') {
    return <VerifiedCvProfile payload={payload} showAdminActions={showAdminActions} />;
  }

  const overallScore = payload.overall_score;
  const averageMarks = payload.average_marks;
  const passedCount = payload.passed_count;
  const verifiedSkills = payload.verified_skills ?? [];
  const verifiedSkillsCount = verifiedSkills.length;
  const latestSkill = useMemo(() => {
    let best: any = null;
    for (const s of verifiedSkills) {
      if (!s) continue;
      const ts = s.verified_at ? new Date(s.verified_at).getTime() : 0;
      if (!best || ts > (best._ts ?? 0)) {
        best = { ...s, _ts: ts };
      }
    }
    return best;
  }, [verifiedSkills]);

  const shareTitle = `SkillProof Verified Credential — ${candidateName}`;
  const shareDescription = `Verified by SkillProof. ${mainCategory}.`;

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* EXISTING VERIFIED CV — at the top, so the candidate's avatar */}
      {/* + name + passport-number strip appears first.                 */}
      {/* ============================================================ */}
      <VerifiedCvProfile payload={payload} showAdminActions={showAdminActions} />

      {/* ============================================================ */}
      {/* CREDENTIAL BOTTOM PANEL — the new "Digital Credential" surface */}
      {/* ============================================================ */}
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-200">
        <div
          aria-hidden="true"
          className="h-2 w-full"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />

        {/* ---------- 1. AUTHENTIC & VERIFIED header ---------- */}
        <section className="px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#E31B23]">
                <BadgeCheck className="h-3.5 w-3.5" /> Digital SkillProof Credential
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">
                {candidateName}
              </h1>
              <p className="mt-1 text-sm text-slate-600 break-words">{mainCategory}</p>
            </div>
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider ' +
                visual.pill
              }
              aria-label={`Credential state: ${visual.label}`}
            >
              <StateIcon kind={visual.icon} /> {visual.label}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">{visual.blurb}</p>
        </section>

        {/* ---------- 2. SKILL PASSPORT ID ---------- */}
        <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Skill Passport ID
          </p>
          <p className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-lg font-black text-slate-900 sm:text-xl break-all">
            <Hash className="h-4 w-4 text-[#E31B23]" />
            {passportNumber || '—'}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KV label="Credential Type" value={payload.level ? `SkillProof Passport · ${cap(payload.level)}` : 'SkillProof Passport'} />
            <KV label="Status" value={visual.label} />
            <KV label="Issued" value={fmtDate(payload.issue_date)} />
            <KV label="Expires" value={fmtDate(payload.expiry_date)} />
          </dl>
        </section>

        {/* ---------- 3. CREDENTIAL INTEGRITY ---------- */}
        <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Credential Integrity
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <IntegrityRow
              ok
              label="Verified against SkillProof database"
              hint={
                payload.verified_by_skillproof
                  ? 'Direct match in the verified identities table.'
                  : 'Lookup routed through the universal verification RPC.'
              }
            />
            <IntegrityRow
              ok={state === 'active' || state === 'expiring_soon'}
              muted={state === 'expiring_soon'}
              label="Credential is active"
              hint={
                state === 'expiring_soon'
                  ? 'Active, but expires within 30 days.'
                  : state === 'expired'
                  ? 'Past the expiry date.'
                  : state === 'revoked'
                  ? 'Revoked by SkillProof.'
                  : 'Status is active in the database.'
              }
            />
            <IntegrityRow
              ok={state !== 'revoked'}
              label="No revocation detected"
              hint={
                payload.revoked_at
                  ? `Revoked on ${fmtDate(payload.revoked_at)}`
                  : 'No revocation record on file.'
              }
            />
            <IntegrityRow
              ok={Boolean(payload.passport_number) && Boolean(candidate?.full_name)}
              label="Holder identity matched"
              hint={
                candidate?.full_name
                  ? `Resolved to ${candidate.full_name}.`
                  : 'Candidate name not present in the public RPC payload.'
              }
            />
          </ul>
        </section>

        {/* ---------- 4. ASSESSMENT PERFORMANCE ---------- */}
        <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <TrendingUp className="h-4 w-4 text-amber-600" /> Assessment Performance
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {overallScore != null ? (
              <ScoreTile label="Overall Score" value={String(overallScore)} suffix="/100" tone="emerald" />
            ) : null}
            {latestSkill?.score != null ? (
              <ScoreTile
                label="Latest"
                value={Number(latestSkill.score).toFixed(1)}
                suffix="/10"
                tone="emerald"
              />
            ) : null}
            {averageMarks != null ? (
              <ScoreTile label="Average" value={Number(averageMarks).toFixed(1)} suffix="/10" tone="amber" />
            ) : null}
            {passedCount != null ? (
              <ScoreTile label="Passed" value={String(passedCount)} tone="default" />
            ) : null}
            <ScoreTile
              label="Verified Skills"
              value={String(verifiedSkillsCount)}
              tone="default"
            />
          </div>
          {verifiedSkillsCount === 0 && passedCount == null && overallScore == null ? (
            <p className="mt-3 text-xs text-slate-500">
              No assessment numbers are linked to this credential yet.
            </p>
          ) : null}
        </section>

        {/* ---------- 5. VERIFIED SKILL EVIDENCE ---------- */}
        {verifiedSkillsCount > 0 ? (
          <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Award className="h-4 w-4 text-emerald-600" /> Verified Skill Evidence
            </h2>
            <ul className="mt-3 space-y-2">
              {verifiedSkills.slice(0, 8).map((s, idx) => (
                <li
                  key={`${s.skill_name ?? 'skill'}-${idx}`}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-900 break-words">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                        {s.skill_name || 'Verified Skill'}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 break-words">
                        {s.category ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            <Layers className="h-3 w-3" /> {s.category}
                          </span>
                        ) : null}
                        {s.sub_category ? (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            · {s.sub_category}
                          </span>
                        ) : null}
                        {s.skill_level ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            {s.skill_level}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      {s.score != null ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                          {Number(s.score).toFixed(1)} / 10
                        </span>
                      ) : null}
                      {s.verified_at ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(s.verified_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {verifiedSkillsCount > 8 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Showing 8 of {verifiedSkillsCount} verified skills — see the full CV below for the complete list.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ---------- 6. PROFESSIONAL SNAPSHOT ---------- */}
        {(() => {
          const role =
            candidate?.current_position ??
            candidate?.profession ??
            payload.resume_professional?.headline ??
            null;
          const expYears =
            candidate?.experience_years ??
            (candidate?.total_experience != null ? String(candidate.total_experience) : null);
          const location = [candidate?.district, candidate?.country].filter(Boolean).join(', ') || null;
          const category = candidate?.main_category ?? payload.passports?.[0]?.main_category_name ?? null;
          const hasAny = role || expYears || location || category;
          if (!hasAny) return null;
          return (
            <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <UserIcon className="h-4 w-4 text-slate-600" /> Professional Snapshot
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {role ? (
                  <SnapRow icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Professional Role" value={role} />
                ) : null}
                {expYears ? (
                  <SnapRow
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Experience"
                    value={`${expYears} year${Number(expYears) === 1 ? '' : 's'}`}
                  />
                ) : null}
                {category ? (
                  <SnapRow icon={<Layers className="h-3.5 w-3.5" />} label="Primary Category" value={category} />
                ) : null}
                {location ? (
                  <SnapRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={location} />
                ) : null}
              </dl>
            </section>
          );
        })()}

        {/* ---------- 7. PERMANENT VERIFICATION LINK ---------- */}
        {verifyUrl ? (
          <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <LinkIcon className="h-4 w-4 text-slate-600" /> Permanent Verification Link
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Anyone with this URL can verify the credential directly against the SkillProof database.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <code className="block w-full min-w-0 overflow-hidden truncate whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 sm:flex-1">
                {verifyUrl}
              </code>
              <div className="flex flex-wrap gap-2">
                <CopyButton url={verifyUrl} />
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
              </div>
            </div>
            <p
              className="mt-2 block truncate text-[11px] text-slate-500"
              title={verifyUrl}
            >
              {verifyUrl}
            </p>
          </section>
        ) : null}

        {/* ---------- 8. SCAN TO VERIFY + QR ---------- */}
        {verifyUrl ? (
          <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <QrCode className="h-4 w-4 text-slate-600" /> Scan to Verify
            </h2>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <img
                  src={qrUrl(verifyUrl)}
                  alt={`Scan to verify ${passportNumber}`}
                  width={160}
                  height={160}
                  className="h-40 w-40"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">SCAN TO VERIFY</p>
                <p className="mt-1 text-xs text-slate-600">
                  Scan this QR code to verify this credential directly against SkillProof.
                </p>
                <p
                  className="mt-2 block truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700"
                  title={verifyUrl}
                >
                  {verifyUrl}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------- 10. EMPLOYER-FRIENDLY ACTIONS ---------- */}
        {verifyUrl ? (
          <section className="border-t border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-4 w-4 text-[#E31B23]" /> Share this Credential
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Reuses the existing verified share experience. Copy the link, or share to a network.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ShareButtons
                url={verifyUrl}
                title={shareTitle}
                description={shareDescription}
                fullName={candidateName}
                variant="inline"
              />
            </div>
          </section>
        ) : null}

        {/* ---------- Footer ---------- */}
        <footer className="rounded-b-2xl border-t border-slate-100 px-6 py-4 text-[11px] text-slate-500 sm:px-8">
          <p className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700">Verified by SkillProof</span>
            <span>· This page is read-only and anchored to the SkillProof database.</span>
          </p>
          <p className="mt-1">
            Generated for{' '}
            <span className="font-mono">{passportNumber || '—'}</span> ·{' '}
            <span className="font-mono">{new Date().toLocaleDateString()}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ---------- tiny row helpers ---------- */

function cap(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{value}</dd>
    </div>
  );
}

function IntegrityRow({
  ok,
  muted,
  label,
  hint,
}: {
  ok: boolean;
  muted?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' +
          (ok
            ? 'bg-emerald-100 text-emerald-700'
            : muted
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700')
        }
      >
        {ok ? (
          <Check className="h-3 w-3" />
        ) : muted ? (
          <Clock className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={'text-sm font-semibold ' + (ok ? 'text-slate-900' : muted ? 'text-amber-800' : 'text-rose-800')}>
          {label}
        </p>
        {hint ? <p className="text-[11px] text-slate-500 break-words">{hint}</p> : null}
      </div>
    </li>
  );
}

function ScoreTile({
  label,
  value,
  suffix,
  tone = 'default',
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'default' | 'emerald' | 'amber' | 'rose';
}) {
  const colour =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : tone === 'rose'
      ? 'text-rose-700'
      : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${colour}`}>
        {value}
        {suffix ? <span className="text-xs font-bold text-slate-500">{suffix}</span> : null}
      </p>
    </div>
  );
}

function SnapRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900 break-words">{value}</span>
    </div>
  );
}

export default CredentialPanel;
