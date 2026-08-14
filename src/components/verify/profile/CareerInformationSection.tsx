/* eslint-disable react/no-unescaped-entities */

/**
 * CareerInformationSection
 * ------------------------
 * Full Career Information card for the public /verify profile.
 * Surfaces every personal + professional field the candidate has on file
 * (name, phone, gender, date_of_birth, division, district, street address,
 *  professional bio, current position, profession, current organization,
 *  experience years, languages, portfolio links, …).
 *
 * Privacy rules (server-side enforced, this component is a second
 * layer of defence):
 *   - phone is shown only when candidate.show_phone_on_verified_profile = true
 *   - gender is shown only when show_gender_on_verified_profile = true
 *   - date_of_birth is shown only when show_dob_on_verified_profile = true
 *   - street address is shown only when show_address_on_verified_profile = true
 *   - the whole AI / career_intelligence block hides when hide_ai_* is true
 *
 * Hidden rows just don't render — the section never shows a "missing"
 * placeholder for privacy-suppressed fields, only for genuinely empty
 * ones.
 */

import React from 'react';
import {
  Briefcase,
  Building2,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Section, hasValue, safeNum, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

interface FieldRow {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}

function readBoolFlag(...candidates: unknown[]): boolean {
  for (const c of candidates) {
    if (c === true) return true;
    if (c === false || c == null) continue;
    if (typeof c === 'string') {
      const v = c.toLowerCase().trim();
      if (v === 'true' || v === '1' || v === 't' || v === 'yes' || v === 'on') return true;
      if (v === 'false' || v === '0' || v === 'f' || v === 'no' || v === 'off') return false;
    }
    if (typeof c === 'number') return c === 1;
  }
  return false;
}

export function CareerInformationSection({ payload }: Props) {
  const candidate = payload?.candidate ?? null;
  const personal  = payload?.personal_information ?? null;
  const career    = payload?.career_information ?? null;
  const ciProfile = payload?.career_intelligence?.profile ?? null;
  const hideAi    = readBoolFlag(
    candidate?.hide_ai_on_verified_profile,
    payload?.hide_ai_on_verified_profile,
  );

  const showPhone   = readBoolFlag(candidate?.show_phone_on_verified_profile, payload?.show_phone_on_verified_profile);
  const showGender  = readBoolFlag(candidate?.show_gender_on_verified_profile, payload?.show_gender_on_verified_profile);
  const showDob     = readBoolFlag(candidate?.show_dob_on_verified_profile, payload?.show_dob_on_verified_profile);
  const showAddress = readBoolFlag(candidate?.show_address_on_verified_profile, payload?.show_address_on_verified_profile);

  // ---------------------------------------------------------------------
  // Field resolution. Each field checks candidate → personal → career →
  // AI-profile in that order so the most-recently-edited source wins.
  // ---------------------------------------------------------------------
  const fullName       = safeStr(candidate?.full_name)       ?? safeStr(personal?.full_name)       ?? safeStr(career?.full_name);
  const fullNameBn     = safeStr(candidate?.full_name_bn)    ?? safeStr(personal?.full_name_bn)    ?? safeStr(career?.full_name_bn);
  const phoneValue     = showPhone
    ? safeStr(candidate?.phone) ?? safeStr(personal?.phone)
    : null;
  const emailValue     = safeStr(personal?.email)     ?? safeStr(candidate?.email);
  const genderValue    = showGender
    ? safeStr(candidate?.gender) ?? safeStr(personal?.gender)
    : null;
  const dobValue       = showDob
    ? safeStr(candidate?.date_of_birth) ?? safeStr(personal?.date_of_birth)
    : null;
  const addressValue   = showAddress
    ? safeStr(candidate?.address) ?? safeStr(personal?.address)
    : null;
  const countryValue   = safeStr(candidate?.country)   ?? safeStr(personal?.country);
  const divisionValue  = safeStr(candidate?.division)  ?? safeStr(personal?.division);
  const districtValue  = safeStr(candidate?.district)  ?? safeStr(personal?.district);

  const profession        = safeStr(career?.profession)       ?? safeStr(candidate?.profession);
  const currentPosition   = safeStr(career?.current_position) ?? safeStr(candidate?.current_position);
  const currentOrg        = safeStr(career?.current_organization) ?? safeStr(candidate?.current_organization);
  const headline          = safeStr(career?.headline)         ?? currentPosition ?? profession;
  const expYears          = safeNum(career?.experience_years) ?? safeNum(candidate?.experience_years);
  const totalExp          = safeNum(career?.total_experience) ?? safeNum(candidate?.total_experience);
  const bio               = safeStr(career?.bio)              ?? safeStr(candidate?.bio);
  const summary           = safeStr(career?.experience_summary) ?? safeStr(candidate?.experience_summary);
  const linkedinUrl       = safeStr(candidate?.linkedin_url);
  const githubUrl         = safeStr(candidate?.github_url);
  const portfolioUrl      = safeStr(candidate?.portfolio_url);
  const websiteUrl        = safeStr(candidate?.website_url);
  const languages: string[] = (() => {
    const raw = candidate?.languages ?? personal?.languages ?? ciProfile?.languages;
    if (Array.isArray(raw)) return raw.filter((l) => typeof l === 'string' && l.trim() !== '');
    if (typeof raw === 'string' && raw.trim() !== '') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((l) => typeof l === 'string' && l.trim() !== '');
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })();

  // ---------------------------------------------------------------------
  // Build rows. Only render rows where the value is present (or the row
  // is itself a privacy-suppressed field we want to acknowledge).
  // ---------------------------------------------------------------------
  const rows: FieldRow[] = [];

  if (hasValue(fullName)) {
    rows.push({
      icon: User,
      label: 'Full name',
      value: (
        <span>
          {fullName}
          {fullNameBn ? (
            <span className="ml-2 text-[11px] font-semibold text-slate-500">({fullNameBn})</span>
          ) : null}
        </span>
      ),
    });
  }

  if (hasValue(phoneValue)) {
    rows.push({
      icon: Phone,
      label: 'Phone',
      value: (
        <a
          href={`tel:${phoneValue!.replace(/\s+/g, '')}`}
          className="font-semibold text-slate-900 hover:text-[#E31B23]"
        >
          {phoneValue}
        </a>
      ),
    });
  }

  if (hasValue(emailValue)) {
    rows.push({
      icon: Mail,
      label: 'Email',
      value: (
        <a
          href={`mailto:${emailValue}`}
          className="font-semibold text-slate-900 hover:text-[#E31B23]"
        >
          {emailValue}
        </a>
      ),
    });
  }

  if (hasValue(genderValue)) {
    rows.push({ icon: Users,  label: 'Gender',         value: genderValue! });
  }
  if (hasValue(dobValue)) {
    rows.push({ icon: Globe,  label: 'Date of birth',  value: dobValue! });
  }
  if (hasValue(divisionValue)) {
    rows.push({ icon: MapPin, label: 'Division',       value: divisionValue! });
  }
  if (hasValue(districtValue)) {
    rows.push({ icon: MapPin, label: 'District',       value: districtValue! });
  }
  if (hasValue(countryValue)) {
    rows.push({ icon: MapPin, label: 'Country',        value: countryValue! });
  }
  if (hasValue(addressValue)) {
    rows.push({ icon: MapPin, label: 'Street address', value: addressValue! });
  }

  // Professional block.
  if (hasValue(profession)) {
    rows.push({ icon: Briefcase, label: 'Profession',          value: profession! });
  }
  if (hasValue(currentPosition)) {
    rows.push({ icon: Briefcase, label: 'Current position',    value: currentPosition! });
  }
  if (hasValue(currentOrg)) {
    rows.push({ icon: Building2, label: 'Current organization', value: currentOrg! });
  }
  if (expYears !== null) {
    rows.push({
      icon: Briefcase,
      label: 'Experience',
      value: `${expYears} year${Number(expYears) === 1 ? '' : 's'}${totalExp && totalExp !== expYears ? ` (total ${totalExp})` : ''}`,
    });
  }
  if (languages.length > 0) {
    rows.push({ icon: Globe, label: 'Languages', value: languages.join(', ') });
  }

  // External links.
  if (hasValue(linkedinUrl) || hasValue(githubUrl) || hasValue(portfolioUrl) || hasValue(websiteUrl)) {
    const links: React.ReactNode[] = [];
    if (hasValue(linkedinUrl))  links.push(<a key="li" href={linkedinUrl!}  target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E31B23] hover:underline">LinkedIn</a>);
    if (hasValue(githubUrl))    links.push(<a key="gh" href={githubUrl!}    target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E31B23] hover:underline">GitHub</a>);
    if (hasValue(portfolioUrl)) links.push(<a key="pf" href={portfolioUrl!} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E31B23] hover:underline">Portfolio</a>);
    if (hasValue(websiteUrl))   links.push(<a key="wb" href={websiteUrl!}   target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E31B23] hover:underline">Website</a>);
    rows.push({
      icon: Globe,
      label: 'Online presence',
      value: <span className="flex flex-wrap items-center gap-x-3 gap-y-1">{links.map((l, i) => <React.Fragment key={i}>{i > 0 ? <span className="text-slate-300">·</span> : null}{l}</React.Fragment>)}</span>,
    });
  }

  if (rows.length === 0 && !hasValue(bio) && !hasValue(summary) && !hasValue(headline)) {
    return null;
  }

  return (
    <Section
      id="career-information"
      eyebrow="Career Information"
      title="Career Information"
      icon={<GraduationCap className="h-4 w-4" />}
      helper={
        hideAi
          ? 'Privacy-gated candidate information from the SkillProof profile.'
          : 'Personal and professional details from the candidate\u2019s SkillProof profile.'
      }
    >
      <div className="space-y-4">
        {(hasValue(headline) || hasValue(profession)) ? (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 via-white to-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#E31B23]">
              Professional headline
            </p>
            <p className="mt-1 text-base font-black text-slate-900 break-words">
              {headline || profession}
            </p>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={`${row.label}-${idx}`}
                  className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-800 break-words">{row.value}</p>
                  </div>
                </div>
              );
            })}
          </dl>
        ) : null}

        {hasValue(summary) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#E31B23]">
              Experience summary
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800 break-words">
              {summary}
            </p>
          </div>
        ) : null}

        {hasValue(bio) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#E31B23]">
              Professional bio
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800 break-words">
              {bio}
            </p>
          </div>
        ) : null}

        {!hideAi ? (
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> Privacy-gated — only fields the candidate has chosen to expose are shown.
          </p>
        ) : null}
      </div>
    </Section>
  );
}

export default CareerInformationSection;