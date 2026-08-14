/* eslint-disable react/no-unescaped-entities */

/**
 * CertificationsSection
 * ----------------------
 * Renders the candidate's roadmap-completion certificates. The
 * verification URL (when present) is exposed so employers can verify
 * the certificate independently.
 *
 * Hidden when there are no certificates.
 */

import React from 'react';
import { BookOpen, Calendar, Hash, ExternalLink, BadgeCheck } from 'lucide-react';
import { Section, fmtDate, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

export function CertificationsSection({ payload }: Props) {
  const list = Array.isArray(payload?.certificates) ? payload.certificates : [];
  if (list.length === 0) return null;

  return (
    <Section
      id="certifications"
      eyebrow="Certifications"
      title="Certifications"
      icon={<BookOpen className="h-4 w-4" />}
      helper="Roadmap-completion certificates issued by SkillProof. Each one carries an independent verification link."
      badge={`${list.length}`}
    >
      <ul className="space-y-2">
        {list.map((c: any, idx: number) => {
          const title = safeStr(c?.roadmap_title ?? null) || 'Certification';
          const category = safeStr(c?.category_name ?? null);
          const subCategory = safeStr(c?.sub_category_name ?? null);
          const credentialNumber = safeStr(c?.credential_number ?? null);
          const issueDate = safeStr(c?.issue_date ?? null);
          const completionDate = safeStr(c?.completion_date ?? null);
          const duration = c?.completion_duration_days;
          const status = safeStr(c?.status ?? null) || 'Active';
          const verificationUrl = safeStr(c?.verification_url ?? null);

          const isActive = status === 'Active';
          const isRevoked = status === 'Revoked';

          return (
            <li
              key={`${credentialNumber ?? 'cert'}-${idx}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 break-words">{title}</p>
                  {(category || subCategory) ? (
                    <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                      {[category, subCategory].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ' +
                    (isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : isRevoked
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800')
                  }
                >
                  <BadgeCheck className="h-3 w-3" /> {status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                {credentialNumber ? (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Hash className="h-3 w-3" /> {credentialNumber}
                  </span>
                ) : null}
                {issueDate ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Issued {fmtDate(issueDate)}
                  </span>
                ) : null}
                {completionDate ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Completed {fmtDate(completionDate)}
                  </span>
                ) : null}
                {duration !== null && duration !== undefined ? (
                  <span className="inline-flex items-center gap-1">{duration} days</span>
                ) : null}
              </div>
              {verificationUrl ? (
                <div className="mt-2">
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E31B23] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Verify Certificate
                  </a>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}