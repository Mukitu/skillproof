/* eslint-disable react/no-unescaped-entities */

/**
 * CompanyProfileCard
 * ------------------
 * Minimal, public-safe view of a SkillProof company account. Rendered
 * on `/verify` when a recruiter searches for a company Gmail and the
 * lookup resolves to `kind: 'company'`.
 *
 * Intentionally shows ONLY:
 *   - company logo (large)
 *   - company name
 *
 * No personal candidate data, no candidate passports, no candidate
 * skills — those would be a privacy violation. If the visitor wants
 * the candidate profile they should re-search with a Passport ID or
 * candidate email.
 *
 * The logo and name are read live from `public.companies`, so any
 * admin change in Supabase (or company owner update via the
 * dashboard) auto-reflects on the very next lookup. There is no
 * cache to invalidate.
 */

import React from 'react';
import { Building2, ExternalLink, Mail } from 'lucide-react';
import type { PublicCompanyVerification } from '../../../types/database';

interface Props {
  payload: PublicCompanyVerification;
}

export function CompanyProfileCard({ payload }: Props) {
  const company = payload?.company;
  if (!company) return null;

  const name = company.name ?? 'SkillProof Company';
  const logoUrl = company.logo_url ?? null;
  const websiteUrl = company.website_url ?? null;
  const email = company.email ?? '';
  const category = company.category ?? null;

  const initial = (name.trim()[0] ?? 'S').toUpperCase();

  return (
    <section
      id="company-profile"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col items-center px-5 py-10 sm:px-8 sm:py-12">
        {/* Logo / fallback initial */}
        <div className="relative">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="h-32 w-32 rounded-2xl border border-slate-200 bg-white object-contain shadow-sm sm:h-40 sm:w-40"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If the logo URL is broken, swap to the initial fallback
                // so the card never shows a broken image.
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const sibling = target.nextElementSibling as HTMLElement | null;
                if (sibling) sibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="h-32 w-32 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-red-50 via-white to-amber-50 text-3xl font-black text-[#E31B23] shadow-sm sm:h-40 sm:w-40 sm:text-4xl"
            style={{ display: logoUrl ? 'none' : 'flex' }}
            aria-hidden="true"
          >
            {initial}
          </div>
        </div>

        {/* Company name */}
        <h1 className="mt-6 text-center text-2xl font-black tracking-tight text-slate-900 break-words sm:text-3xl">
          {name}
        </h1>

        {/* Eyebrow badges */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
            <Building2 className="h-3 w-3" />
            Verified Company
          </span>
          {category ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
              {category}
            </span>
          ) : null}
        </div>

        {/* Contact strip — only public-safe contact info */}
        {(email || websiteUrl) && (
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-600">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#E31B23] hover:bg-white hover:text-[#E31B23]"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="break-all">{email}</span>
              </a>
            ) : null}
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#E31B23] hover:bg-white hover:text-[#E31B23]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="break-all">{websiteUrl}</span>
              </a>
            ) : null}
          </div>
        )}

        {/* Privacy notice — explicit so the visitor understands why this
            card is intentionally minimal. */}
        <p className="mt-8 max-w-md text-center text-[11px] leading-relaxed text-slate-500 break-words">
          This is a registered SkillProof company account. To view a
          candidate's verified profile, search with their{' '}
          <span className="font-mono font-semibold text-slate-700">Passport ID</span>{' '}
          or personal email.
        </p>
      </div>
    </section>
  );
}

export default CompanyProfileCard;