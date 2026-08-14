/* eslint-disable react/no-unescaped-entities */

/**
 * ProfileHero
 * -----------
 * Premium candidate hero for the new /verify public profile view.
 * Shows avatar, name, professional headline, location, SkillProof
 * verification status, short professional introduction, and the
 * employer action row (contact / download CV / share).
 *
 * Everything is sourced from the public verification payload —
 * no demo data, no fake fields. Hidden when no value exists.
 */

import React, { useState, useCallback } from 'react';
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Mail,
  MapPin,
  Share2,
  Sparkles,
  ExternalLink,
  Phone,
  Globe,
  Check,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { Section, fmtDate, hasValue, initialsOf, safeStr } from './profileHelpers';

interface ProfileHeroProps {
  payload: any;
  /**
   * Permanent verification URL the QR + share buttons should use.
   * Always `https://skillproof.top/verify?id=…` for /verify.
   */
  verificationUrl: string | null;
}

export function ProfileHero({ payload, verificationUrl }: ProfileHeroProps) {
  const candidate = payload?.candidate ?? null;
  const career = payload?.career_information ?? null;
  const personal = payload?.personal_information ?? null;
  const passportNumber = safeStr(payload?.passport_number) ?? '';
  const verifiedBySkillproof = payload?.verified_by_skillproof === true;

  // Privacy-gated phone — already enforced server-side. The candidate
  // object only carries `phone` when the public opt-in is true.
  const phoneValue = safeStr(candidate?.phone ?? null);
  const emailValue = safeStr(personal?.email ?? candidate?.email ?? null);

  // Display name resolution:
  //   1. candidate.full_name      (set by migration 14000014 / unified-view overlay)
  //   2. personal_information.full_name
  //   3. career_information.full_name
  //   4. email local-part         (e.g. "mukit" from "mukit@gmail.com")
  // Only fall through to the generic "SkillProof Member" placeholder if
  // everything above is empty.
  const fullNameFromEmail = (() => {
    const e = (personal?.email ?? candidate?.email ?? '').toString().trim();
    if (!e || !e.includes('@')) return null;
    const local = e.split('@')[0]?.trim();
    return local && local.length > 0 ? local : null;
  })();
  const fullName =
    safeStr(candidate?.full_name)
    || safeStr(personal?.full_name)
    || safeStr(career?.full_name)
    || fullNameFromEmail
    || 'SkillProof Member';
  const headline = safeStr(career?.headline ?? candidate?.current_position ?? candidate?.profession ?? null);
  const profession = safeStr(career?.profession ?? candidate?.profession ?? null);
  const currentPosition = safeStr(career?.current_position ?? candidate?.current_position ?? null);
  const currentOrg = safeStr(career?.current_organization ?? candidate?.current_organization ?? null);
  const expYears = safeNum(career?.experience_years ?? candidate?.experience_years ?? null);
  const totalExp = safeNum(career?.total_experience ?? candidate?.total_experience ?? null);
  const mainCategory = safeStr(candidate?.main_category ?? null);
  const verifiedAt = safeStr(payload?.verified_at ?? null);
  const issueDate = safeStr(payload?.issue_date ?? null);

  // Multi-passport: every category the candidate holds. Surface them as
  // a comma-separated headline so the public profile never shows only
  // one category when the candidate has more.
  const allCategories: string[] = (() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (raw: unknown) => {
      const s = safeStr(raw);
      if (!s) return;
      const k = s.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(s);
    };
    push(candidate?.main_category);
    const list = Array.isArray(payload?.passports) ? payload.passports : [];
    for (const pp of list) {
      push(pp?.main_category);
      push(pp?.main_category_name);
      push(pp?.category);
    }
    return out;
  })();

  const district = safeStr(candidate?.district ?? personal?.district ?? null);
  const country = safeStr(candidate?.country ?? personal?.country ?? null);

  // Professional summary / bio for the short introduction block.
  const summary = safeStr(career?.experience_summary ?? candidate?.experience_summary ?? null);
  const bio = safeStr(career?.bio ?? candidate?.bio ?? null);
  const shortIntro = summary || bio || '';

  const avatar = safeStr(candidate?.avatar_url ?? null);

  // Share popover state.
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopyLink = useCallback(async () => {
    if (!verificationUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(verificationUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = verificationUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [verificationUrl]);

  const linkedinShare = verificationUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`
    : '#';
  const facebookShare = verificationUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verificationUrl)}`
    : '#';
  const twitterShare = verificationUrl
    ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(verificationUrl)}&text=${encodeURIComponent(
        `${fullName} on SkillProof`,
      )}`
    : '#';
  const mailtoLink = emailValue ? `mailto:${emailValue}` : null;
  const telLink = phoneValue ? `tel:${phoneValue.replace(/\s+/g, '')}` : null;

  return (
    <section
      id="profile-hero"
      aria-label={`${fullName} profile header`}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Top accent bar — uses the SkillProof brand gradient. */}
      <div
        aria-hidden="true"
        className="h-1.5 w-full"
        style={{
          background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
        }}
      />

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-6 sm:p-7 lg:grid-cols-[auto_1fr_auto]">
        {/* Avatar block */}
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 ring-2 ring-amber-300/60 sm:h-24 sm:w-24">
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                {initialsOf(fullName)}
              </div>
            )}
          </div>

          {/* Mobile-only action row */}
          <div className="flex flex-col items-end gap-2 sm:hidden">
            <VerifiedPill verified={verifiedBySkillproof} state={payload?.result} />
          </div>
        </div>

        {/* Identity block */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">
              {fullName}
            </h1>
            {verifiedBySkillproof ? (
              <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-500" aria-label="SkillProof verified" />
            ) : null}
          </div>

          {headline ? (
            <p className="mt-1 text-sm font-semibold text-slate-700 sm:text-base break-words">
              {headline}
            </p>
          ) : null}

          {/* Compact meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
            {hasValue(currentOrg) ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> {currentOrg}
              </span>
            ) : null}
            {(district || country) ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {[district, country].filter(Boolean).join(', ')}
              </span>
            ) : null}
            {hasValue(totalExp) ? (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                {totalExp} year{Number(totalExp) === 1 ? '' : 's'} total experience
              </span>
            ) : hasValue(expYears) ? (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                {expYears} year{Number(expYears) === 1 ? '' : 's'} experience
              </span>
            ) : null}
            {allCategories.length > 0 ? (
              allCategories.map((cat, idx) => (
                <span
                  key={`${cat}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800"
                >
                  <Award className="h-3 w-3" /> {cat}
                </span>
              ))
            ) : null}
            {passportNumber ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                {passportNumber}
              </span>
            ) : null}
          </div>

          {/* Short intro paragraph — only when there is one. */}
          {shortIntro ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 break-words">
              {shortIntro}
            </p>
          ) : null}

          {/* Verified-state pill (desktop) */}
          <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
            <VerifiedPill verified={verifiedBySkillproof} state={payload?.result} />
            {verifiedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified {fmtDate(verifiedAt)}
              </span>
            ) : issueDate ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                <Calendar className="h-3 w-3 text-slate-400" /> Issued {fmtDate(issueDate)}
              </span>
            ) : null}
            {profession && profession !== headline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                {profession}
              </span>
            ) : null}
          </div>
        </div>

        {/* Employer actions — desktop column */}
        <div className="hidden flex-col items-stretch gap-2 sm:flex sm:w-56 lg:w-64">
          {mailtoLink ? (
            <a
              href={mailtoLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:brightness-110"
            >
              <Mail className="h-4 w-4" /> Contact Candidate
            </a>
          ) : telLink ? (
            <a
              href={telLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:brightness-110"
            >
              <Phone className="h-4 w-4" /> Call Candidate
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-400"
              aria-disabled="true"
            >
              <Mail className="h-4 w-4" /> Contact Hidden
            </button>
          )}

          {/* Download Digital CV button intentionally removed per spec. */}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={shareOpen}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
            >
              <Share2 className="h-4 w-4" /> Share Profile
            </button>
            {shareOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <a
                  role="menuitem"
                  href={linkedinShare}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Share on LinkedIn
                </a>
                <a
                  role="menuitem"
                  href={facebookShare}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Share on Facebook
                </a>
                <a
                  role="menuitem"
                  href={twitterShare}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Share on X
                </a>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onCopyLink}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>

          {verificationUrl ? (
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#E31B23]"
            >
              <Globe className="h-3 w-3" /> Open Verification Page
            </a>
          ) : null}
        </div>
      </div>

      {/* Mobile-only actions row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 sm:hidden">
        {mailtoLink ? (
          <a
            href={mailtoLink}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-2 text-xs font-bold text-white"
          >
            <Mail className="h-3.5 w-3.5" /> Contact
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-400"
          >
            <Mail className="h-3.5 w-3.5" /> Contact
          </button>
        )}
        {/* CV button intentionally removed per spec. */}
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" /> Share
            </>
          )}
        </button>
      </div>

      {/* SkillProof verification footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 px-5 py-3 text-[11px] text-slate-500 sm:px-7">
        <p className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-semibold text-slate-700">Verified by SkillProof</span>
          <span>· Public profile anchored to the SkillProof database.</span>
        </p>
        {verifiedAt ? (
          <p className="font-semibold text-slate-500">Last verified {fmtDate(verifiedAt)}</p>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- helpers ---------- */

function VerifiedPill({
  verified,
  state,
}: {
  verified: boolean;
  state?: string | null;
}) {
  const s = (state ?? '').toLowerCase();
  const isExpired = s === 'expired';
  const isRevoked = s === 'revoked';
  const isSuspended = s === 'suspended';
  const isArchived = s === 'archived';
  const isPending = s === 'pending_approval';
  const isPrivate = s === 'private';
  const isNotFound = s === 'not_found';

  if (verified && !isExpired && !isRevoked && !isSuspended && !isArchived && !isPending && !isPrivate && !isNotFound) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
        <BadgeCheck className="h-3.5 w-3.5" /> SkillProof Verified
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
        Expired
      </span>
    );
  }
  if (isRevoked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
        Revoked
      </span>
    );
  }
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
        Suspended
      </span>
    );
  }
  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
        Archived
      </span>
    );
  }
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
        Pending Approval
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
      SkillProof Profile
    </span>
  );
}

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}