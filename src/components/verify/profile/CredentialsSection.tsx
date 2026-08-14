/* eslint-disable react/no-unescaped-entities */

/**
 * CredentialsSection
 * ------------------
 * "Verified SkillProof Credentials" — replaces the old passport
 * duplication. Renders ALL valid verified passports / categories the
 * candidate holds as compact premium cards.
 *
 * Each card shows:
 *   - Category
 *   - Status (Verified / Pending / etc.)
 *   - Level
 *   - Score
 *   - Passed assessments
 *   - Average score
 *   - Passport ID
 *   - Issued / Expires dates
 *
 * NO primary-passport concept — every credential is treated equally.
 * Source: payload.passports (PublicCandidatePassportItem[]).
 */

import React from 'react';
import { Award, BadgeCheck, Calendar, Hash, ExternalLink, Layers, ShieldCheck } from 'lucide-react';
import { Section, StatTile, fmtDate, safeStr, safeNum } from './profileHelpers';

interface Props {
  payload: any;
}

export function CredentialsSection({ payload }: Props) {
  const list: any[] = Array.isArray(payload?.passports) ? payload.passports : [];
  // Filter out rejected ones (per spec — never `rejected`).
  const visible = list.filter((p) => {
    const status = String(p?.status ?? '').toLowerCase();
    return status !== 'rejected';
  });
  if (visible.length === 0) return null;

  return (
    <Section
      id="credentials"
      eyebrow="Verified SkillProof Credentials"
      title="All Verified Categories"
      icon={<ShieldCheck className="h-4 w-4" />}
      helper={`Every SkillProof credential this candidate holds. There is no \u201Cprimary\u201D passport \u2014 each one is independently verified.`}
      badge={`${visible.length}`}
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((p, idx) => {
          const categoryName =
            safeStr(p?.category_name ?? null) ||
            safeStr(p?.main_category_name ?? null) ||
            safeStr(p?.title ?? null) ||
            'SkillProof Credential';
          const passportNumber = safeStr(p?.passport_number ?? null);
          const status = safeStr(p?.status ?? null) || 'Active';
          const level = safeStr(p?.level ?? null);
          const overall = safeNum(p?.overall_score ?? null);
          const passed = safeNum(p?.passed_count ?? null);
          const avg = safeNum(p?.average_marks ?? null);
          const issueDate = safeStr(p?.issue_date ?? null);
          const expiryDate = safeStr(p?.expiry_date ?? null);
          const verificationUrl = safeStr(p?.verification_url ?? null);
          const publicId = safeStr(p?.public_id ?? null);

          const statusLower = status.toLowerCase();
          const isActive = statusLower === 'active' || statusLower === 'verified';
          const isPending = statusLower === 'pending_approval' || statusLower === 'pending';
          const isExpired = statusLower === 'expired';
          const isSuspended = statusLower === 'suspended';
          const isArchived = statusLower === 'archived';

          const tone = isActive
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/30'
            : isPending
            ? 'border-amber-200 bg-amber-50/30'
            : isExpired
            ? 'border-amber-200 bg-amber-50/30'
            : isSuspended || isArchived
            ? 'border-rose-200 bg-rose-50/30'
            : 'border-slate-200 bg-slate-50/40';

          const pill = isActive
            ? 'bg-emerald-100 text-emerald-800'
            : isPending
            ? 'bg-amber-100 text-amber-800'
            : isExpired
            ? 'bg-amber-100 text-amber-800'
            : isSuspended || isArchived
            ? 'bg-rose-100 text-rose-800'
            : 'bg-slate-100 text-slate-700';

          return (
            <li
              key={`${passportNumber ?? 'cred'}-${idx}`}
              className={`rounded-2xl border p-4 shadow-sm ${tone}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <Layers className="h-3 w-3" /> Category
                  </p>
                  <p className="text-base font-black text-slate-900 break-words">
                    {categoryName}
                  </p>
                </div>
                <span
                  className={
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ' +
                    pill
                  }
                >
                  {isActive ? <BadgeCheck className="h-3 w-3" /> : null}
                  {status}
                </span>
              </div>

              {level ? (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                  <Award className="h-3 w-3" /> {level}
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatTile
                  label="Score"
                  value={overall !== null ? overall : '—'}
                  suffix="/ 100"
                  tone="emerald"
                />
                <StatTile label="Passed" value={passed ?? 0} tone="emerald" />
                <StatTile
                  label="Avg"
                  value={avg !== null ? Number(avg).toFixed(1) : '—'}
                  suffix="/ 10"
                  tone="emerald"
                />
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                {passportNumber ? (
                  <p className="inline-flex items-center gap-1 font-mono">
                    <Hash className="h-3 w-3 text-slate-400" /> {passportNumber}
                  </p>
                ) : null}
                {publicId ? (
                  <p className="inline-flex items-center gap-1 font-mono">
                    Public ID: {publicId}
                  </p>
                ) : null}
                {issueDate ? (
                  <p className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> Issued {fmtDate(issueDate)}
                  </p>
                ) : null}
                {expiryDate ? (
                  <p className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> Expires {fmtDate(expiryDate)}
                  </p>
                ) : null}
              </div>

              {verificationUrl ? (
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#E31B23] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Verify Credential
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}