import { useEffect, useState, type ReactNode } from 'react';
import { Award, BadgeCheck, Calendar, Clock, ExternalLink, Hash, Star, Tag, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LevelBadge } from './LevelBadge';
import { PassportSeal } from './PassportSeal';
import { VerifiedSkillBadges } from './VerifiedSkillBadges';
import { daysUntilPassportExpiry, isPassportExpired } from '../../services/passports';
import { getPublicPassportUrl } from '../../utils/passportUrl';
import { getVerifiedSkills } from '../../services/verifiedSkills';
import type { Profile, SkillPassport } from '../../types/database';

type CardMode = 'full' | 'compact' | 'public';

interface PassportCardProps {
  passport: SkillPassport;
  
  profile?: Profile | null;
  mode?: CardMode;
  className?: string;
  
  verificationUrl?: string;
}


export function PassportCard({
  passport,
  profile,
  mode = 'full',
  className = '',
  verificationUrl,
}: PassportCardProps) {
  const isPublic = mode === 'public';
  const isCompact = mode === 'compact';
  const expired = isPassportExpired(passport);
  const isActive = passport.status === 'active' && !expired;
  const isPending = passport.status === 'pending_approval';
  const isRejected = passport.status === 'rejected';

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  void now;

  const fullName = profile?.full_name ?? 'SkillProof Member';
  const avatar = profile?.avatar_url ?? null;
  const qrPayload =
    verificationUrl ??
    passport.qr_code_data ??
    buildDefaultQr(passport);
  const daysToExpiry = daysUntilPassportExpiry(passport);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 ${className}`}
      data-testid="passport-card"
      data-status={passport.status}
      data-expired={expired ? 'true' : 'false'}
    >
      {}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900 to-orange-800" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.35),transparent_55%)]" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.25),transparent_55%)]" aria-hidden />
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px)',
        }}
        aria-hidden
      />

      {}
      {expired && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-18deg] rounded border-4 border-rose-400/70 px-6 py-2 text-5xl font-black uppercase tracking-[0.35em] text-rose-300/80 sm:text-6xl">
            Expired
          </span>
        </div>
      )}

      <div className="relative">
        {}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-white/5 px-5 py-3 backdrop-blur-sm sm:px-7 sm:py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-200/90">
            <Star size={14} className="text-amber-300" />
            <span>SkillProof Official Passport</span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && <VerifiedPill />}
            {isPending && <PendingPill />}
            {isRejected && <RejectedPill />}
            {expired && isActive === false && passport.status !== 'rejected' && <ExpiredPill />}
            <LevelBadge level={passport.level} size={isCompact ? 'sm' : 'md'} />
          </div>
        </div>

        {}
        <div className={`grid gap-6 px-5 py-6 sm:px-7 sm:py-7 ${isCompact ? 'sm:grid-cols-1' : 'md:grid-cols-[1fr_auto] md:items-start'}`}>
          {}
          <div className="min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-amber-300/60 sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-2xl font-black ring-2 ring-amber-300/60 sm:h-20 sm:w-20">
                  {initials(fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words text-xl font-black leading-tight sm:text-2xl">{fullName}</p>
                {!isPublic && profile?.email && (
                  <p className="break-words text-xs text-amber-100/80">{profile.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-amber-100/90">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                    <Hash size={10} /> {passport.passport_number}
                  </span>
                  {passport.main_category_name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-0.5 text-amber-100">
                      <Award size={10} /> {passport.main_category_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {}
            {passport.skill_tags?.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                  <Tag size={11} /> Skill Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {passport.skill_tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-amber-50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {}
            {(() => {
              const verifiedSkills = getVerifiedSkills(passport);
              if (!verifiedSkills.length) return null;
              return (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                    <Award size={11} /> Verified Skills
                  </p>
                  <VerifiedSkillBadges skills={verifiedSkills} variant="onDark" />
                </div>
              );
            })()}

            {}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat label="Passed" value={String(passport.passed_count)} />
              <Stat label="Avg / 10" value={passport.average_marks ? Number(passport.average_marks).toFixed(1) : '—'} />
              <Stat label="Overall" value={passport.overall_score ? `${passport.overall_score}/100` : '—'} />
            </div>

            {}
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] sm:grid-cols-3 sm:gap-3">
              <DateRow
                icon={<Calendar size={12} />}
                label="Issued"
                value={passport.issue_date ? new Date(passport.issue_date).toLocaleDateString() : '—'}
              />
              <DateRow
                icon={<BadgeCheck size={12} />}
                label="Approved"
                value={
                  passport.signed_at
                    ? new Date(passport.signed_at).toLocaleDateString()
                    : passport.issue_date
                    ? new Date(passport.issue_date).toLocaleDateString()
                    : '—'
                }
              />
              <DateRow
                icon={<Clock size={12} />}
                label={expired ? 'Expired' : 'Expires'}
                value={passport.expiry_date ? new Date(passport.expiry_date).toLocaleDateString() : '—'}
                extra={
                  daysToExpiry != null
                    ? expired
                      ? `${Math.abs(daysToExpiry)}d ago`
                      : `${daysToExpiry}d left`
                    : null
                }
                tone={expired ? 'rose' : daysToExpiry != null && daysToExpiry < 30 ? 'amber' : 'default'}
              />
            </div>

            {}
            {passport.status === 'pending_approval' && passport.revisions_requested && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-50">
                <p className="mb-1 font-semibold uppercase tracking-wider text-amber-200">Revisions requested</p>
                <p className="whitespace-pre-line leading-relaxed text-amber-50/90">{passport.revisions_requested}</p>
              </div>
            )}

            {}
            {passport.digital_signature && !isCompact && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/80">
                  Digital signature
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-amber-100/70">
                  {passport.digital_signature}
                </p>
                {passport.signed_at && (
                  <p className="mt-1 text-[10px] text-amber-100/60">
                    Signed {new Date(passport.signed_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {}
          {!isCompact && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 w-full md:w-auto md:min-w-[180px]">
              <PassportSeal size={104} animated={isActive} />
              {qrPayload ? (
                <a
                  href={qrPayload}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-1.5"
                  title={qrPayload}
                >
                  <div className="rounded-xl bg-white p-2.5 shadow-lg ring-1 ring-amber-300/30 transition group-hover:scale-105">
                    <QRCodeSVG
                      value={qrPayload}
                      size={132}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-200/80 group-hover:text-amber-100">
                    <ExternalLink size={10} /> Verify online
                  </span>
                </a>
              ) : (
                <p className="text-[10px] text-amber-200/60">QR not generated yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function VerifiedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
      <BadgeCheck size={12} /> Verified
    </span>
  );
}
function PendingPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
      <Clock size={12} /> Pending
    </span>
  );
}
function RejectedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
      <XCircle size={12} /> Rejected
    </span>
  );
}
function ExpiredPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
      <Clock size={12} /> Expired
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">{label}</p>
      <p className="mt-0.5 text-base font-black text-white sm:text-lg">{value}</p>
    </div>
  );
}

function DateRow({
  icon, label, value, extra, tone = 'default',
}: {
  icon: ReactNode; label: string; value: string; extra?: string | null;
  tone?: 'default' | 'amber' | 'rose';
}) {
  const toneClass =
    tone === 'rose' ? 'text-rose-200' : tone === 'amber' ? 'text-amber-200' : 'text-amber-100/80';
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
        {icon} {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
      {extra && <p className="text-[10px] text-amber-100/60">{extra}</p>}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

/**
 * Build the default QR payload for a passport. The single public
 * verification entry point is `/verify` — every Passport QR encodes
 * `https://skillproof.top/verify?id=<passport_number>` so any scan
 * lands directly on the verified CV.
 */
function buildDefaultQr(p: SkillPassport): string {
  return getPublicPassportUrl(p.passport_number);
}

export default PassportCard;