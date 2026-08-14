/* eslint-disable react/no-unescaped-entities */

/**
 * VerifiedCvProfile
 * ----------------
 * Production CV-style rendering of a SkillProof verified profile.
 *
 * Designed for the /verify/:passportNumber public route. Surfaces ONLY
 * the public, verified fields that the backend RPC + sanitiser allow.
 *
 * Layout — follows the order a recruiter expects on a real recruitment
 * platform's public CV:
 *
 *   1.  Header strip (avatar, name, title, location, passport status)
 *   2.  Passport Result banner (Verified / Pending / Expired / etc.)
 *   3.  Score / KPIs row
 *   4.  Profile Completeness
 *   5.  Personal Information         ← always renders (placeholder if empty)
 *   6.  Career Information           ← always renders
 *   7.  Education
 *   8.  Experience
 *   9.  Skills (with verify links)
 *  10.  Languages
 *  11.  Certifications (course completions)
 *  12.  Portfolio & Social Links
 *  ─── Verification & Credentials ───
 *  13.  Verification Category        (Bronze / Silver / Gold / Platinum)
 *  14.  Verified Categories          (per-category breakdown)
 *  15.  Verified Career Summary      (flat per-career chips)
 *  16.  Assessment History           (every task + marks + status)
 *  17.  Verified Skills              (Passed only — assessment name + score)
 *  18.  Assessment Summary           (KPIs + strongest + needs improvement)
 *  19.  Skill Passports              (multi-passport cards)
 *  20.  AI Career Profile            (gated)
 *  21.  Career Intelligence          (gated)
 *  22.  Public Evidence              (gated)
 *  23.  Career Activity Timeline     (gated)
 *  24.  Verification info
 *
 * Every section renders — even when empty — with a friendly
 * "No data added yet" placeholder so the page always reads as a
 * complete CV template rather than appearing to be missing sections.
 *
 * Print/PDF: window.print() with print-friendly CSS.
 * No unnecessary animations.
 */

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  Hash as HashIcon,
  Layers,
  Linkedin,
  Lightbulb,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Rocket,
  School,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User as UserIcon,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  PublicCandidatePassportItem,
  PublicCandidateVerification,
  PublicVerificationCategory,
  PublicVerificationResult,
} from '../../types/database';


function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function fmtDate(value: string | number | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString();
  } catch {
    return fallback;
  }
}

interface Props {
  payload: PublicCandidateVerification;
  showAdminActions?: boolean;
}

/** Empty-state placeholder shown when a section has no data. */
function EmptyNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium italic text-slate-500">
      {message}
    </p>
  );
}

export function VerifiedCvProfile({ payload, showAdminActions = false }: Props) {
  const candidate = payload.candidate;
  const passportNumber = payload.passport_number ?? '';
  const candidateName = candidate?.full_name ?? 'SkillProof Member';
  const title =
    candidate?.current_position ??
    candidate?.profession ??
    payload.resume_professional?.headline ??
    null;
  const verifiedAt = payload.verified_at ?? null;

  // Privacy gate. Phone is only rendered when the backend explicitly
  // returns it AND the show_phone_on_verified_profile flag is true.
  const showPhone = Boolean(candidate?.show_phone_on_verified_profile);
  const phone = showPhone ? candidate?.phone ?? null : null;

  // Per-section hide toggles.
  const hideAi = Boolean(
    payload.hide_ai_on_verified_profile ?? candidate?.hide_ai_on_verified_profile ?? false,
  );
  const hideEvidence = Boolean(
    payload.hide_evidence_on_verified_profile ?? candidate?.hide_evidence_on_verified_profile ?? false,
  );
  const hideTimeline = Boolean(
    payload.hide_timeline_on_verified_profile ?? candidate?.hide_timeline_on_verified_profile ?? false,
  );

  const overallScore = payload.overall_score;
  const result = payload.result;
  const verificationCategory = (payload.verification_category ?? 'Unranked') as PublicVerificationCategory;
  const verificationCategoryLabel =
    payload.verification_category_label ??
    ({
      Unranked: 'No assessments passed yet',
      Bronze: 'Verified learner',
      Silver: 'Verified professional',
      Gold: 'Highly verified professional',
      Platinum: 'Top-tier verified expert',
    } as Record<PublicVerificationCategory, string>)[verificationCategory] ??
    '';

  const completedRoadmaps = payload.completed_roadmaps ?? [];
  const roadmapItems = payload.roadmap_progress_items ?? [];
  const completedRoadmapCount = completedRoadmaps.length;
  const completedMilestoneCount = roadmapItems.length;

  const roadmapTitles = useMemo(() => {
    const titles = new Set<string>();
    for (const r of completedRoadmaps) {
      if (r.roadmap_title) titles.add(r.roadmap_title);
    }
    if (titles.size === 0) {
      for (const m of roadmapItems) {
        if (m.roadmap_title) titles.add(m.roadmap_title);
      }
    }
    return Array.from(titles);
  }, [completedRoadmaps, roadmapItems]);

  const [printMode] = useState(false);

  if (result === 'not_found' || result === 'private') {
    return <NotFoundCard result={result} />;
  }

  return (
    <div className="sp-cv-root">
      <div
        className={
          'mx-auto w-full max-w-4xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-200 ' +
          'rounded-2xl '
        }
      >
        {/* ---------- 1. Header strip ---------- */}
        <header className="overflow-hidden rounded-t-2xl">
          <div
            aria-hidden="true"
            className="h-2 w-full"
            style={{
              background:
                'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
            }}
          />

          {/* Passport Result banner */}
          <PassportResultBanner result={result} verifiedAt={verifiedAt} />

          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 ring-2 ring-amber-300/60 sm:h-24 sm:w-24">
                {candidate?.avatar_url ? (
                  <img
                    src={candidate.avatar_url}
                    alt={candidateName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                    {initials(candidateName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">
                    {candidateName}
                  </h1>
                  {payload.verified_by_skillproof ? (
                    <BadgeCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                  ) : null}
                </div>
                {title ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Briefcase className="h-3.5 w-3.5" /> {title}
                  </p>
                ) : null}
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <HashIcon className="h-3 w-3" /> {passportNumber || ''}
                </p>
                {(candidate?.district || candidate?.country || candidate?.main_category) ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {(candidate?.district || candidate?.country) ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[candidate?.district, candidate?.country].filter(Boolean).join(', ')}
                      </span>
                    ) : null}
                    {candidate?.main_category ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                        <Award className="h-3 w-3" /> {candidate.main_category}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {payload.verified_career_summary && payload.verified_career_summary.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Career Categories:
                    </span>
                    {payload.verified_career_summary.map((c, idx) => (
                      <span
                        key={`${c.category_id}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                        title={`${c.verified_skill_count} verified skill${c.verified_skill_count === 1 ? '' : 's'}${
                          c.average_score != null ? ` · avg ${Number(c.average_score).toFixed(1)} / 10` : ''
                        }`}
                      >
                        <BadgeCheck className="h-3 w-3" />
                        {c.category_name}
                        <span className="font-mono text-[10px] text-emerald-700">
                          ×{c.verified_skill_count}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-1">
              <VerifiedBadge
                verified={payload.verified_by_skillproof === true}
                status={result}
              />
              {verifiedAt ? (
                <p className="text-[11px] text-slate-500">
                  Verified {fmtDate(verifiedAt)}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              {/* Print / Save as PDF removed — SkillProof Passport is a digital-only credential. */}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-3 sm:hidden">
            <VerifiedBadge verified={payload.verified_by_skillproof === true} status={result} />
            {verifiedAt ? (
              <p className="text-[11px] text-slate-500">Verified {fmtDate(verifiedAt)}</p>
            ) : null}
          </div>
        </header>

        {/* ---------- 2. Score / KPIs ---------- */}
        <section className="grid grid-cols-2 gap-3 border-b border-slate-100 px-6 py-5 sm:grid-cols-4 sm:px-8">
          <Kpi
            label="Overall / 10"
            value={overallScore != null ? Number(overallScore).toFixed(1) : ''}
            tone={overallScore != null && Number(overallScore) >= 7 ? 'emerald' : 'default'}
          />
          <Kpi label="Passed" value={String(payload.passed_count ?? 0)} />
          <Kpi
            label="Avg / 10"
            value={
              payload.average_marks != null
                ? Number(payload.average_marks).toFixed(1)
                : ''
            }
          />
          <Kpi
            label="Verified Skills"
            value={String(payload.verified_skills?.length ?? 0)}
            tone="emerald"
          />
        </section>

        {/* ---------- 3. Profile Completeness ---------- */}
        {(() => {
          const pc: any = (payload as any).profile_completeness ?? null;
          const score = typeof pc === 'object' && pc && typeof pc.score === 'number'
            ? pc.score
            : (typeof pc === 'number' ? pc : null);
          if (score == null || score <= 0) return null;
          const breakdown: Record<string, { complete: boolean; weight?: number }> =
            pc && typeof pc === 'object' && pc.breakdown && typeof pc.breakdown === 'object'
              ? pc.breakdown
              : {};
          const entries = Object.entries(breakdown);
          return (
            <section className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Profile Completeness
                  </p>
                  <p className="mt-0.5 text-2xl font-black text-slate-900">
                    {Math.max(0, Math.min(100, Math.round(score)))}%
                  </p>
                </div>
                <div className="flex-1 max-w-[260px]">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        'h-full rounded-full ' +
                        (score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500')
                      }
                      style={{ width: `${Math.max(0, Math.min(100, Math.round(score)))}%` }}
                    />
                  </div>
                </div>
              </div>
              {entries.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {entries.map(([key, val]) => (
                    <div
                      key={key}
                      className={
                        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ' +
                        (val?.complete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-500')
                      }
                    >
                      <span className={val?.complete ? 'text-emerald-600' : 'text-slate-400'}>
                        {val?.complete ? '✓' : '○'}
                      </span>
                      <span className="truncate">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* ---------- 4. Personal Information (always renders) ---------- */}
        <Section title="Personal Information" icon={<UserIcon className="h-4 w-4" />}>
          {(() => {
            const p = payload.personal_information ?? null;
            const phoneValue = phone ?? p?.phone ?? null;
            const gender = candidate?.gender ?? p?.gender ?? null;
            const dob = candidate?.date_of_birth ?? p?.date_of_birth ?? null;
            const address = candidate?.address ?? p?.address ?? null;
            const org = candidate?.current_organization ?? p?.current_organization ?? null;
            const country = p?.country ?? candidate?.country ?? null;
            const district = p?.district ?? candidate?.district ?? null;
            const division = p?.division ?? candidate?.division ?? null;
            const totalExp =
              payload.career_information?.total_experience ??
              candidate?.total_experience ??
              null;
            const expYears =
              payload.career_information?.experience_years ??
              candidate?.experience_years ??
              null;
            const email = p?.email ?? null;
            const emailVerified = p?.email_verified ?? candidate?.email_verified ?? null;

            const rows = [
              phoneValue
                ? { icon: <Phone className="h-3.5 w-3.5" />, label: 'Phone', value: phoneValue, kind: 'text' as const }
                : { icon: <Phone className="h-3.5 w-3.5" />, label: 'Phone', value: null as string | null, kind: 'hidden-phone' as const },
              gender
                ? { icon: <UserIcon className="h-3.5 w-3.5" />, label: 'Gender', value: gender, kind: 'text' as const }
                : { icon: <UserIcon className="h-3.5 w-3.5" />, label: 'Gender', value: null, kind: 'hidden' as const },
              dob
                ? { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Date of Birth', value: fmtDate(dob), kind: 'text' as const }
                : { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Date of Birth', value: null, kind: 'hidden' as const },
              country || district
                ? {
                    icon: <MapPin className="h-3.5 w-3.5" />,
                    label: 'Location',
                    value: [district, division, country].filter(Boolean).join(', '),
                    kind: 'text' as const,
                  }
                : { icon: <MapPin className="h-3.5 w-3.5" />, label: 'Location', value: null, kind: 'hidden' as const },
              org
                ? { icon: <Building2 className="h-3.5 w-3.5" />, label: 'Current Organization', value: org, kind: 'text' as const }
                : { icon: <Building2 className="h-3.5 w-3.5" />, label: 'Current Organization', value: null, kind: 'hidden' as const },
              totalExp != null
                ? {
                    icon: <Briefcase className="h-3.5 w-3.5" />,
                    label: 'Total Experience',
                    value: `${totalExp} year${Number(totalExp) === 1 ? '' : 's'}`,
                    kind: 'text' as const,
                  }
                : expYears != null
                ? {
                    icon: <Briefcase className="h-3.5 w-3.5" />,
                    label: 'Total Experience',
                    value: `${expYears} year${Number(expYears) === 1 ? '' : 's'}`,
                    kind: 'text' as const,
                  }
                : { icon: <Briefcase className="h-3.5 w-3.5" />, label: 'Total Experience', value: null, kind: 'hidden' as const },
              email
                ? {
                    icon: <Mail className="h-3.5 w-3.5" />,
                    label: 'Email',
                    value: email,
                    kind: 'email' as const,
                  }
                : { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email', value: null, kind: 'hidden' as const },
              address
                ? {
                    icon: <MapPin className="h-3.5 w-3.5" />,
                    label: 'Address',
                    value: address,
                    kind: 'text' as const,
                  }
                : { icon: <MapPin className="h-3.5 w-3.5" />, label: 'Address', value: null, kind: 'hidden' as const },
            ];

            const visibleRows = rows.filter((r) => r.kind !== 'hidden' && r.value);
            const privateRows = rows.filter((r) => r.kind === 'hidden' || (r.kind === 'hidden-phone' && !r.value));

            if (visibleRows.length === 0) {
              return <EmptyNote message="No personal information has been added yet — the candidate has not shared these details publicly." />;
            }

            return (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visibleRows.map((r, idx) => (
                    <PersonalInfoRow
                      key={`${r.label}-${idx}`}
                      icon={r.icon}
                      label={r.label}
                      value={r.value as string}
                      href={r.kind === 'email' ? `mailto:${r.value}` : undefined}
                    />
                  ))}
                </div>
                {privateRows.length > 0 ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-[10px] italic text-slate-400">
                    <Shield className="h-3 w-3" />
                    {privateRows.length} field{privateRows.length === 1 ? '' : 's'} hidden by the candidate
                  </p>
                ) : null}
              </>
            );
          })()}
        </Section>

        {/* ---------- 5. Career Information (always renders) ---------- */}
        <Section
          title="Career Information"
          icon={<Briefcase className="h-4 w-4" />}
        >
          {(() => {
            const ci = payload.career_information ?? null;
            const headline =
              ci?.headline ??
              ci?.current_position ??
              candidate?.current_position ??
              candidate?.profession ??
              null;
            const profession =
              ci?.profession ?? candidate?.profession ?? null;
            const currentOrg =
              ci?.current_organization ?? candidate?.current_organization ?? null;
            const expYears =
              ci?.experience_years ?? candidate?.experience_years ?? null;
            const totalExp =
              ci?.total_experience ?? candidate?.total_experience ?? null;
            const summary =
              ci?.experience_summary ??
              candidate?.experience_summary ??
              candidate?.bio ??
              null;
            const bio = ci?.bio ?? candidate?.bio ?? null;

            const hasAny =
              headline || profession || currentOrg || expYears != null || totalExp != null || summary || bio;
            if (!hasAny) {
              return (
                <EmptyNote message="No career information has been added yet — profession, current position and bio are blank." />
              );
            }
            return (
              <div className="space-y-3">
                {headline ? (
                  <p className="text-base font-black text-slate-900 break-words">
                    {headline}
                  </p>
                ) : null}
                {profession && profession !== headline ? (
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {profession}
                  </p>
                ) : null}
                {currentOrg ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> {currentOrg}
                  </p>
                ) : null}
                {(expYears != null || totalExp != null) ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {totalExp != null
                      ? `${totalExp} year${Number(totalExp) === 1 ? '' : 's'} total experience`
                      : expYears != null
                      ? `${expYears} year${Number(expYears) === 1 ? '' : 's'} experience`
                      : null}
                  </p>
                ) : null}
                {summary || bio ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 break-words">
                    {summary ?? bio}
                  </p>
                ) : null}
              </div>
            );
          })()}
        </Section>

        {/* ---------- 6. Education (always renders) ---------- */}
        <Section title="Education" icon={<GraduationCap className="h-4 w-4" />}>
          {payload.education && payload.education.length > 0 ? (
            <ul className="space-y-2">
              {payload.education.map((e, idx) => (
                <li
                  key={`${e.id ?? 'edu'}-${idx}`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 break-words">{e.degree}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                      <School className="inline h-3 w-3 mr-1" />
                      {e.institution}
                      {e.year ? ` · ${e.year}` : ''}
                    </p>
                  </div>
                  {e.cgpa ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                      CGPA {e.cgpa}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote message="No education entries added yet — the candidate has not shared their academic history." />
          )}
        </Section>

        {/* ---------- 7. Experience (always renders) ---------- */}
        <Section title="Experience" icon={<Briefcase className="h-4 w-4" />}>
          {payload.experience && payload.experience.length > 0 ? (
            <ul className="space-y-2">
              {payload.experience.map((x, idx) => (
                <li
                  key={`${x.id ?? 'exp'}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{x.role}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {x.company}
                        {x.duration ? ` · ${x.duration}` : ''}
                      </p>
                    </div>
                  </div>
                  {x.summary ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{x.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote message="No work experience added yet — the candidate has not listed any roles." />
          )}
        </Section>

        {/* ---------- 8. Skills / Core Skills ---------- */}
        <Section title="Skills" icon={<Wrench className="h-4 w-4" />}>
          {(() => {
            const techTags: string[] = [];
            const techTagUrls = new Map<string, string>();
            if (Array.isArray(candidate?.skill_tags)) {
              for (const t of candidate.skill_tags) {
                if (typeof t === 'string' && t.trim()) techTags.push(t.trim());
              }
            }
            if (Array.isArray(payload.technologies)) {
              for (const t of payload.technologies) {
                if (t && typeof t.name === 'string' && t.name.trim()) {
                  const nm = t.name.trim();
                  techTags.push(nm);
                  const url = (t as any)?.evidence_url;
                  if (typeof url === 'string' && url.trim()) {
                    techTagUrls.set(nm.toLowerCase(), url.trim());
                  }
                }
              }
            }
            const seen = new Set<string>();
            const unique: string[] = [];
            for (const t of techTags) {
              const key = t.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              unique.push(t);
            }
            if (unique.length === 0) {
              return (
                <EmptyNote message="No skills added yet — the candidate has not listed any technical or professional skills." />
              );
            }
            return (
              <div className="flex flex-wrap gap-1.5">
                {unique.map((t, idx) => {
                  const url = techTagUrls.get(t.toLowerCase());
                  if (url) {
                    return (
                      <a
                        key={`${t}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#E31B23] hover:bg-white"
                      >
                        <Code2 className="h-3 w-3" />
                        {t}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    );
                  }
                  return (
                    <span
                      key={`${t}-${idx}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <Code2 className="mr-1 h-3 w-3" />
                      {t}
                    </span>
                  );
                })}
              </div>
            );
          })()}
        </Section>

        {/* ---------- 9. Languages (always renders) ---------- */}
        <Section title="Languages" icon={<Globe className="h-4 w-4" />}>
          {(() => {
            const ci = payload.career_information ?? null;
            const fromCi = Array.isArray((ci as any)?.languages)
              ? ((ci as any).languages as unknown[]).filter((l): l is string => typeof l === 'string' && l.trim() !== '')
              : [];
            const fromCandidate = Array.isArray(candidate?.languages)
              ? (candidate!.languages as unknown[]).filter((l): l is string => typeof l === 'string' && l.trim() !== '')
              : [];
            const langs = Array.from(new Set([...fromCi, ...fromCandidate]));
            if (langs.length === 0) {
              return <EmptyNote message="No languages added yet — the candidate has not shared any spoken languages." />;
            }
            return (
              <div className="flex flex-wrap gap-1.5">
                {langs.map((l, idx) => (
                  <span
                    key={`${l}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
                  >
                    <Globe className="h-3 w-3" /> {l}
                  </span>
                ))}
              </div>
            );
          })()}
        </Section>

        {/* ---------- 10. Certifications (always renders) ---------- */}
        <Section title="Certifications" icon={<BookOpen className="h-4 w-4" />}>
          {payload.certificates && payload.certificates.length > 0 ? (
            <ul className="space-y-2">
              {payload.certificates.map((c, idx) => (
                <li
                  key={`${c.credential_number}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{c.roadmap_title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                        {c.category_name}
                        {c.sub_category_name ? ` · ${c.sub_category_name}` : ''}
                      </p>
                    </div>
                    <span
                      className={
                        'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' +
                        (c.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'Revoked'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800')
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      {c.credential_number}
                    </span>
                    {c.issue_date ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Issued {fmtDate(c.issue_date)}
                      </span>
                    ) : null}
                    {c.completion_duration_days != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {c.completion_duration_days} days
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote message="No certifications added yet — the candidate has not completed any SkillProof roadmap certifications." />
          )}
        </Section>

        {/* ---------- 11. Portfolio & Social Links ---------- */}
        <Section title="Portfolio & Social Links" icon={<LinkIcon className="h-4 w-4" />}>
          {(() => {
            const links: Array<{ url: string; label: string; icon: ReactNode }> = [];
            if (candidate?.linkedin_url) {
              links.push({ url: candidate.linkedin_url, label: 'LinkedIn', icon: <Linkedin className="h-3.5 w-3.5" /> });
            }
            if (candidate?.github_url) {
              links.push({ url: candidate.github_url, label: 'GitHub', icon: <Code2 className="h-3.5 w-3.5" /> });
            }
            if (candidate?.portfolio_url) {
              links.push({ url: candidate.portfolio_url, label: 'Portfolio', icon: <ExternalLink className="h-3.5 w-3.5" /> });
            }
            if (candidate?.website_url) {
              links.push({ url: candidate.website_url, label: 'Website', icon: <Globe className="h-3.5 w-3.5" /> });
            }
            if (links.length === 0) {
              return <EmptyNote message="No portfolio or social links added yet — GitHub, LinkedIn, Portfolio and Website are all blank." />;
            }
            return (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {links.map((l, idx) => (
                  <a
                    key={`${l.label}-${idx}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-[#E31B23] hover:bg-red-50/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      {l.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900">{l.label}</p>
                      <p className="truncate text-[10px] font-mono text-slate-500">
                        {l.url}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            );
          })()}
        </Section>

        {/* ─── divider: VERIFICATION & CREDENTIALS ─── */}
        <div className="relative border-y-2 border-dashed border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-3 sm:px-8">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
            — Verification &amp; Credentials —
          </p>
        </div>

        {/* ---------- 12. Verification Category ---------- */}
        <Section title="Verification Category" icon={<Award className="h-4 w-4" />}>
          <VerificationCategoryCard
            category={verificationCategory}
            label={verificationCategoryLabel}
            passedCount={payload.passed_count ?? 0}
            avgScore={payload.average_marks != null ? Number(payload.average_marks) : null}
            overallScore={overallScore != null ? Number(overallScore) : null}
            verifiedSkillsCount={payload.verified_skills?.length ?? 0}
          />
        </Section>

        {/* ---------- 13. Verified Categories ---------- */}
        <Section
          title="Verified Categories"
          icon={<Layers className="h-4 w-4" />}
          subtitle={
            payload.verified_categories && payload.verified_categories.length > 0
              ? `${payload.verified_categories.length} category${payload.verified_categories.length === 1 ? '' : 'ies'} · ${payload.verified_skills?.length ?? 0} skill${(payload.verified_skills?.length ?? 0) === 1 ? '' : 's'} passed`
              : undefined
          }
        >
          {payload.verified_categories && payload.verified_categories.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {payload.verified_categories.map((cat, cIdx) => {
                const avg = cat.average_score != null ? Number(cat.average_score).toFixed(1) : null;
                const lastDate = cat.latest_verified_at ? fmtDate(cat.latest_verified_at) : null;
                return (
                  <article
                    key={`${cat.category}-${cIdx}`}
                    className="flex h-full flex-col rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 p-4 shadow-sm"
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-1.5 text-base font-black text-slate-900 break-words">
                          <Layers className="h-4 w-4 shrink-0 text-emerald-600" />
                          {cat.category || 'Other'}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {cat.skill_count} verified skill{cat.skill_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        {avg != null ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 font-mono text-[11px] font-bold text-emerald-800">
                            <TrendingUp className="h-3 w-3" /> Avg {avg} / 10
                          </span>
                        ) : null}
                        {lastDate ? (
                          <span className="text-[10px] text-slate-500">{lastDate}</span>
                        ) : null}
                      </div>
                    </header>

                    {cat.skills && cat.skills.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {cat.skills.map((s, sIdx) => (
                          <li
                            key={`${cat.category}-skill-${sIdx}-${s.skill_name ?? 's'}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 break-words">
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                {s.skill_name || s.task_title || 'Verified Skill'}
                              </p>
                              {s.sub_category ? (
                                <p className="ml-5 text-[10px] text-slate-500">{s.sub_category}</p>
                              ) : null}
                            </div>
                            {s.score != null ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">
                                {Number(s.score).toFixed(1)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyNote message="No verified categories yet — the candidate has not passed any SkillProof assessment." />
          )}
        </Section>

        {/* ---------- 14. Assessment History — every task + marks ---------- */}
        <Section
          title="Assessment History"
          icon={<FileText className="h-4 w-4" />}
          subtitle={
            payload.assessment_history && payload.assessment_history.length > 0
              ? `${payload.assessment_history.length} submission${payload.assessment_history.length === 1 ? '' : 's'} on file`
              : undefined
          }
        >
          {payload.assessment_history && payload.assessment_history.length > 0 ? (
            <ul className="space-y-2">
              {payload.assessment_history.map((s, idx) => {
                const status = String(s.status ?? '').toLowerCase();
                const isPassed = status === 'passed';
                const isFailed = status === 'failed';
                const isPending = status === 'pending review' || status === 'pending' || status === 'submitted' || status === 'under review';
                const tone = isPassed
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : isFailed
                  ? 'border-rose-200 bg-rose-50/30'
                  : isPending
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-slate-200 bg-white';
                const score = s.score != null ? Number(s.score) : null;
                const max = s.task_max_marks != null ? Number(s.task_max_marks) : null;
                const marksDisplay =
                  score != null ? (max != null ? `${score.toFixed(1)} / ${max}` : `${score.toFixed(1)} / 10`) : '—';
                return (
                  <li
                    key={`${s.id ?? 'ah'}-${idx}`}
                    className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2.5 ${tone}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 break-words">
                          {s.task_title || s.skill_name || 'Assessment'}
                        </p>
                        <span
                          className={
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                            (isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFailed
                              ? 'bg-rose-100 text-rose-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700')
                          }
                        >
                          {isPassed ? <BadgeCheck className="h-3 w-3" /> : isFailed ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {s.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                        {s.category_name ?? ''}
                        {s.sub_category_name ? ` · ${s.sub_category_name}` : ''}
                        {s.skill_name && s.skill_name !== s.task_title ? ` · ${s.skill_name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                      <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-sm font-black text-white">
                        {marksDisplay}
                      </span>
                      {s.event_at ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {fmtDate(s.event_at)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyNote message="No assessment submissions yet — the candidate has not attempted any SkillProof assessments." />
          )}
        </Section>

        {/* ---------- 15. Verified Skills (Passed only, with task title) ---------- */}
        <Section
          title="Verified Skills"
          icon={<BadgeCheck className="h-4 w-4" />}
          subtitle={
            payload.verified_skills && payload.verified_skills.length > 0
              ? `${payload.verified_skills.length} passed SkillProof verification${payload.verified_skills.length === 1 ? '' : 's'}`
              : undefined
          }
        >
          {payload.verified_skills && payload.verified_skills.length > 0 ? (
            <ul className="space-y-2">
              {payload.verified_skills.map((s, idx) => {
                const taskTitle = s.task_title ?? '';
                const skillName = s.skill_name ?? 'Verified Skill';
                const assessmentName = taskTitle && taskTitle.toLowerCase() !== skillName.toLowerCase()
                  ? taskTitle
                  : '';
                return (
                  <li
                    key={`${s.skill_name ?? 'skill'}-${idx}`}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 break-words">
                          {skillName}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                        {s.skill_level ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            <TrendingUp className="h-3 w-3" /> {s.skill_level}
                          </span>
                        ) : null}
                      </div>
                      {assessmentName && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 break-words">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-500">Assessment:</span> {assessmentName}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                        {s.category ?? ''}
                        {s.sub_category ? ` · ${s.sub_category}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                      <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-sm font-black text-white">
                        {s.score != null ? `${Number(s.score).toFixed(1)} / 10` : '—'}
                      </span>
                      {s.verified_at ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {fmtDate(s.verified_at)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyNote message="No verified skills yet — the candidate has not yet passed a SkillProof assessment." />
          )}
        </Section>

        {/* ---------- 16. Assessment Summary ---------- */}
        <Section
          title="Assessment Summary"
          icon={<Target className="h-4 w-4" />}
        >
          {(() => {
            const a = payload.assessment_summary;
            if (!a || (a.total_assessments == null && a.total_attempts == null)) {
              return <EmptyNote message="Assessment summary is not available — the candidate has no assessment data on file." />;
            }
            const total = a.total_assessments ?? a.total_attempts ?? 0;
            const passed = a.passed ?? 0;
            const failed = a.failed ?? 0;
            const avg = a.average_score != null ? Number(a.average_score) : null;
            const strongest = a.strongest_skill ?? a.strength_areas?.[0] ?? null;
            const improvement = a.improvement_skill ?? a.improvement_areas?.[0] ?? null;
            return (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Kpi label="Total Assessments" value={String(total)} />
                  <Kpi label="Passed" value={String(passed)} tone="emerald" />
                  <Kpi label="Failed" value={String(failed)} tone={failed > 0 ? 'rose' : 'default'} />
                  <Kpi
                    label="Average Score / 10"
                    value={avg != null ? avg.toFixed(1) : ''}
                    tone={avg != null && avg >= 7 ? 'emerald' : 'default'}
                  />
                </div>
                {(strongest || improvement) && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {strongest && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Strongest Skill
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900 break-words">{strongest}</p>
                      </div>
                    )}
                    {improvement && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                        <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          <Lightbulb className="h-3 w-3" /> Needs Improvement
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900 break-words">{improvement}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </Section>

        {/* ---------- 17. Skill Passports (multi-passport cards) ---------- */}
        <Section
          title="Skill Passports"
          icon={<ShieldCheck className="h-4 w-4" />}
          subtitle={
            payload.passports && payload.passports.length > 0
              ? `${payload.passports.length} category passport${payload.passports.length === 1 ? '' : 's'} issued by SkillProof`
              : undefined
          }
        >
          {payload.passports && payload.passports.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {payload.passports.map((pp, ppIdx) => (
                <MultiPassportCard
                  key={`${pp.passport_number}-${ppIdx}`}
                  item={pp}
                  isPrimary={pp.is_primary === true || pp.passport_number === passportNumber}
                />
              ))}
            </div>
          ) : (
            <EmptyNote message="No SkillProof Passport has been issued yet — the candidate is currently building their verified profile." />
          )}
        </Section>

        {/* ---------- 18. Career Roadmap ---------- */}
        {(roadmapItems.length > 0 || completedRoadmapCount > 0) ? (
          <Section
            title="Career Roadmap"
            icon={<Target className="h-4 w-4" />}
            subtitle={
              roadmapItems.length > 0
                ? `${roadmapItems.length} completed milestone${roadmapItems.length === 1 ? '' : 's'}`
                : `${completedRoadmapCount} completed roadmap${completedRoadmapCount === 1 ? '' : 's'}`
            }
          >
            <>
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Completed Roadmap
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {roadmapTitles.length > 0
                    ? `${roadmapTitles.length} / ${roadmapTitles.length} completed`
                    : completedRoadmapCount > 0
                    ? `${completedRoadmapCount} completed`
                    : '0 / 0 completed'}
                </p>
                {roadmapTitles.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {roadmapTitles.map((t, idx) => (
                      <li
                        key={`${t}-${idx}`}
                        className="flex items-center gap-2 text-xs text-slate-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="break-words">{t}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-3">
                {completedRoadmaps.length > 0 ? (
                  <ul className="space-y-2">
                    {completedRoadmaps.map((r, idx) => (
                      <li
                        key={`${r.roadmap_title ?? 'roadmap'}-${idx}`}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 break-words">
                              {r.roadmap_title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                              {r.category}
                              {r.sub_category ? ` · ${r.sub_category}` : ''}
                            </p>
                          </div>
                          {r.completion_percentage != null ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                              {Math.round(Number(r.completion_percentage))}% · Completed
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                              Completed
                            </span>
                          )}
                        </div>
                        {r.completed_at ? (
                          <p className="mt-2 text-[11px] text-slate-500">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            Completed {fmtDate(r.completed_at)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {roadmapItems.length > 0 ? (
                  <ul className="space-y-1.5">
                    {roadmapItems.map((m, idx) => (
                      <li
                        key={`${m.day_title ?? 'm'}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 break-words">
                            {m.day_title || 'Completed milestone'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500 break-words">
                            {m.roadmap_title ?? ''}
                            {m.category ? ` · ${m.category}` : ''}
                          </p>
                        </div>
                        {m.completed_at ? (
                          <span className="text-[10px] text-slate-500">
                            {fmtDate(m.completed_at)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </>
          </Section>
        ) : null}

        {/* ---------- 19. AI Career Profile ---------- */}
        {!hideAi && payload.ai_career_profile ? (
          <Section
            title="AI Career Profile"
            icon={<Sparkles className="h-4 w-4" />}
            subtitle={payload.ai_career_profile.career_readiness ?? 'AI-generated career signal'}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi
                  label="Career"
                  value={payload.ai_career_profile.ats_score != null ? String(payload.ai_career_profile.ats_score) : ''}
                  tone="emerald"
                />
                <Kpi
                  label="Profile %"
                  value={payload.ai_career_profile.profile_completion != null ? String(payload.ai_career_profile.profile_completion) : ''}
                  tone="emerald"
                />
                <Kpi
                  label="Readiness"
                  value={payload.ai_career_profile.career_readiness ?? ''}
                  tone="emerald"
                />
                <Kpi
                  label="Skills"
                  value={String(payload.ai_career_profile.skill_strengths?.length ?? 0)}
                />
              </div>

              {payload.ai_career_profile.skill_strengths && payload.ai_career_profile.skill_strengths.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Strengths
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {payload.ai_career_profile.skill_strengths.map((s, idx) => (
                      <span
                        key={`${s}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                      >
                        <BadgeCheck className="h-3 w-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {payload.ai_career_profile.recommended_skills && payload.ai_career_profile.recommended_skills.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Recommended next skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {payload.ai_career_profile.recommended_skills.map((s, idx) => (
                      <span
                        key={`${s}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                      >
                        <Lightbulb className="h-3 w-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {payload.ai_career_profile.career_summary ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Career summary
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700 break-words">
                    {payload.ai_career_profile.career_summary}
                  </p>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {/* ---------- 20. Career Intelligence (gated) ---------- */}
        {!hideAi && payload.career_intelligence ? (
          <Section
            title="Career Intelligence"
            icon={<Sparkles className="h-4 w-4" />}
            subtitle={(() => {
              const baselineLabel = payload.career_intelligence_meta?.baseline?.employability_label_name;
              if (baselineLabel && typeof baselineLabel === 'string' && baselineLabel.trim() && baselineLabel.toLowerCase() !== 'undefined') {
                return baselineLabel;
              }
              const ci = payload.career_intelligence;
              const employ = typeof ci.employability_score === 'number' ? ci.employability_score : Number(ci.employability_score ?? 0);
              const overall = typeof ci.overall_score === 'number' ? ci.overall_score : Number(ci.overall_score ?? 0);
              const labelSrc = Math.max(employ, overall);
              const labelName = labelSrc >= 70 ? 'Job-ready'
                : labelSrc >= 50 ? 'Nearly Job-ready'
                : labelSrc >= 30 ? 'Developing'
                : 'Foundation Phase';
              return `${labelName} · ${employ}/100`;
            })()}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi
                  label="Overall / 100"
                  value={String(payload.career_intelligence.overall_score ?? 0)}
                  tone="emerald"
                />
                <Kpi
                  label="Employability"
                  value={String(payload.career_intelligence.employability_score ?? 0)}
                  tone="emerald"
                />
                <Kpi
                  label="Hiring"
                  value={String(payload.career_intelligence.hiring_readiness ?? 0)}
                  tone="emerald"
                />
                <Kpi
                  label="Career Level"
                  value={(() => {
                    const lvl = payload.career_intelligence.career_level;
                    if (!lvl) return '';
                    const s = String(lvl).trim();
                    if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return '';
                    return s;
                  })()}
                  tone="emerald"
                />
              </div>

              {payload.career_intelligence.career_summary ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Career Summary
                  </p>
                  <p className="text-xs leading-relaxed text-slate-800 break-words">
                    {payload.career_intelligence.career_summary}
                  </p>
                </div>
              ) : null}

              {payload.career_intelligence.top_strengths?.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Top Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {payload.career_intelligence.top_strengths.map((s, idx) => (
                      <li
                        key={`${s.skill}-${idx}`}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 break-words">
                            {s.skill}
                          </p>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                            {s.score}/100
                          </span>
                        </div>
                        {s.reason ? (
                          <p className="mt-1 text-[11px] text-slate-600 break-words">
                            {s.reason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payload.career_intelligence.skill_gaps?.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Skill Gaps
                  </p>
                  <ul className="space-y-1.5">
                    {payload.career_intelligence.skill_gaps.map((g, idx) => (
                      <li
                        key={`${g.skill}-${idx}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 break-words">
                            {g.skill}
                          </p>
                          <span
                            className={
                              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                              (g.priority === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : g.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800')
                            }
                          >
                            {g.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 break-words">
                          Current {g.current_level}/100 · Gap {g.gap_level}/100
                        </p>
                        {g.recommendation ? (
                          <p className="mt-1 text-[11px] text-slate-700 break-words">
                            {g.recommendation}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payload.career_intelligence.career_matches?.length > 0 ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Career Matches
                  </p>
                  <ul className="space-y-1.5">
                    {payload.career_intelligence.career_matches.map((m, idx) => (
                      <li
                        key={`${m.role}-${idx}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 break-words">
                            {m.role}
                          </p>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800">
                            {m.match_percentage}% match
                          </span>
                        </div>
                        {m.reason ? (
                          <p className="mt-1 text-[11px] text-slate-600 break-words">
                            {m.reason}
                          </p>
                        ) : null}
                        {m.missing_skills && m.missing_skills.length > 0 ? (
                          <p className="mt-1 text-[11px] text-slate-500 break-words">
                            <span className="font-bold">Missing:</span>{' '}
                            {m.missing_skills.join(', ')}
                          </p>
                        ) : null}
                        {m.next_step ? (
                          <p className="mt-1 text-[11px] text-slate-700 break-words">
                            <span className="font-bold">Next:</span> {m.next_step}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {payload.career_intelligence.market_readiness ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Bangladesh Market Readiness
                    </p>
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      {payload.career_intelligence.market_readiness.score}/100
                    </span>
                  </div>
                  {payload.career_intelligence.market_readiness.summary ? (
                    <p className="mt-1 text-[11px] text-slate-700 break-words">
                      {payload.career_intelligence.market_readiness.summary}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {payload.career_intelligence.improvement_plan ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    90-Day Improvement Plan
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      [
                        { key: 'days_30', label: 'Next 30 days' },
                        { key: 'days_60', label: 'Next 60 days' },
                        { key: 'days_90', label: 'Next 90 days' },
                      ] as const
                    ).map((bucket) => {
                      const items = payload.career_intelligence!.improvement_plan[bucket.key] ?? [];
                      if (items.length === 0) return null;
                      return (
                        <div
                          key={bucket.key}
                          className="rounded-xl border border-slate-200 bg-white p-2.5"
                        >
                          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#E31B23]">
                            {bucket.label}
                          </p>
                          <ul className="space-y-1 text-[11px] text-slate-700">
                            {items.map((it, i) => (
                              <li key={`${it}-${i}`} className="break-words">
                                • {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {payload.career_intelligence.ai_summary ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    AI Career Summary
                  </p>
                  <p className="text-xs leading-relaxed text-slate-800 break-words">
                    {payload.career_intelligence.ai_summary}
                  </p>
                </div>
              ) : null}

              {payload.career_intelligence_meta?.baseline ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Kpi
                    label="Technical"
                    value={String(payload.career_intelligence_meta.baseline.technical_strength ?? 0)}
                  />
                  <Kpi
                    label="Soft Skills"
                    value={String(payload.career_intelligence_meta.baseline.soft_skill_strength ?? 0)}
                  />
                  <Kpi
                    label="Career Readiness"
                    value={String(payload.career_intelligence_meta.baseline.career_readiness ?? 0)}
                  />
                  <Kpi
                    label="Hiring Probability"
                    value={String(payload.career_intelligence_meta.baseline.hiring_probability ?? 0)}
                  />
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {/* ---------- 21. Public Evidence ---------- */}
        {!hideEvidence ? (
          <Section
            title="Public Evidence"
            icon={<LinkIcon className="h-4 w-4" />}
            subtitle={
              payload.public_evidence && payload.public_evidence.length > 0
                ? `${payload.public_evidence.length} public link${payload.public_evidence.length === 1 ? '' : 's'}`
                : undefined
            }
          >
            {payload.public_evidence && payload.public_evidence.length > 0 ? (
              <ul className="space-y-2">
                {payload.public_evidence.map((e, idx) => (
                  <li
                    key={`${e.url ?? 'ev'}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">
                        {e.title || e.type || 'Public link'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                        {e.type ? `${e.type} · ` : ''}
                        {e.added_at ? `Added ${fmtDate(e.added_at)}` : ''}
                      </p>
                    </div>
                    {e.url ? (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E31B23] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote message="No public evidence added yet — GitHub repos, portfolio links and live demos are blank." />
            )}
          </Section>
        ) : null}

        {/* ---------- 22. Career Activity Timeline ---------- */}
        {!hideTimeline ? (
          <Section
            title="Career Activity Timeline"
            icon={<Activity className="h-4 w-4" />}
            subtitle={
              payload.activity_timeline && payload.activity_timeline.length > 0
                ? `${payload.activity_timeline.length} public event${payload.activity_timeline.length === 1 ? '' : 's'}`
                : undefined
            }
          >
            {payload.activity_timeline && payload.activity_timeline.length > 0 ? (
              <ol className="space-y-2">
                {payload.activity_timeline.map((t, idx) => (
                  <li
                    key={`${t.id ?? 'tl'}-${idx}`}
                    className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">
                        {t.title || t.result_label || 'Career event'}
                      </p>
                      {t.description ? (
                        <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                          {t.description}
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        {t.category_label ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {t.category_label}
                          </span>
                        ) : null}
                        {t.skill_label ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {t.skill_label}
                          </span>
                        ) : null}
                        {t.result_label ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                            {t.result_label}
                          </span>
                        ) : null}
                        {t.event_at ? (
                          <span>
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {fmtDate(t.event_at)}
                          </span>
                        ) : null}
                        {t.score != null ? (
                          <span className="font-mono text-slate-700">
                            {Number(t.score).toFixed(1)} / 10
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyNote message="No public timeline events yet." />
            )}
          </Section>
        ) : null}

        {/* ---------- 23. Verification info ---------- */}
        <Section title="Verification" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge
                verified={payload.verified_by_skillproof === true}
                status={result}
              />
              <span className="font-mono text-[11px] text-slate-500">
                {passportNumber || ''}
              </span>
            </div>
            {payload.verified_at ? (
              <p className="text-xs text-slate-500">
                Verified on <span className="font-semibold">{fmtDate(payload.verified_at)}</span>
              </p>
            ) : null}
            {payload.expiry_date ? (
              <p className="text-xs text-slate-500">
                Expires on <span className="font-semibold">{fmtDate(payload.expiry_date)}</span>
              </p>
            ) : null}
            {(payload.level || candidate?.main_category) ? (
              <p className="text-xs text-slate-500">
                Level:{' '}
                <span className="font-semibold text-slate-700">
                  {payload.level ?? ''}
                </span>
                {candidate?.main_category ? ` · ${candidate.main_category}` : ''}
              </p>
            ) : null}
            {payload.digital_signature ? (
              <p className="text-[10px] text-slate-400">
                Signature: <span className="font-mono">{payload.digital_signature.slice(0, 32)}…</span>
              </p>
            ) : null}
            {candidate?.country || candidate?.district ? (
              <p className="text-xs text-slate-500">
                <MapPin className="inline h-3 w-3 mr-1" />
                {candidate?.district ? `${candidate.district}, ` : ''}
                {candidate?.country ?? 'Bangladesh'}
              </p>
            ) : null}
          </div>
        </Section>

        {/* ---------- Footer ---------- */}
        <footer className="rounded-b-2xl border-t border-slate-100 px-6 py-4 text-[11px] text-slate-500 sm:px-8">
          <p className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700">Verified by SkillProof</span>
            <span>· This page is read-only and anchored to the SkillProof database.</span>
          </p>
          <p className="mt-1">
            Generated for{' '}
            <span className="font-mono">{passportNumber || ''}</span> ·{' '}
            <span className="font-mono">{new Date().toLocaleDateString()}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}


/* ----------------- helpers ------------------ */

function PersonalInfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900 break-words">{value}</span>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block hover:[&>div]:border-[#E31B23]">
        {inner}
      </a>
    );
  }
  return inner;
}

/**
 * VerificationCategoryCard
 * -------------------------
 * Surfaces the Bronze / Silver / Gold / Platinum tier on the public CV
 * (derived from passed_count + avg score by the verify RPC). Each tier
 * gets its own colour so a recruiter reads the ranking at a glance.
 */
function VerificationCategoryCard({
  category,
  label,
  passedCount,
  avgScore,
  overallScore,
  verifiedSkillsCount,
}: {
  category: PublicVerificationCategory;
  label: string;
  passedCount: number;
  avgScore: number | null;
  overallScore: number | null;
  verifiedSkillsCount: number;
}): React.ReactElement {
  const tierTone: Record<
    PublicVerificationCategory,
    { ring: string; bg: string; text: string; chip: string; chipText: string; icon: ReactNode }
  > = {
    Unranked: {
      ring: 'border-slate-300',
      bg: 'bg-gradient-to-br from-slate-50 via-white to-slate-100',
      text: 'text-slate-800',
      chip: 'bg-slate-100',
      chipText: 'text-slate-700',
      icon: <Shield className="h-6 w-6 text-slate-500" />,
    },
    Bronze: {
      ring: 'border-amber-300',
      bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
      text: 'text-amber-900',
      chip: 'bg-amber-100',
      chipText: 'text-amber-800',
      icon: <ShieldCheck className="h-6 w-6 text-amber-600" />,
    },
    Silver: {
      ring: 'border-slate-400',
      bg: 'bg-gradient-to-br from-slate-50 via-white to-zinc-100',
      text: 'text-slate-900',
      chip: 'bg-slate-200',
      chipText: 'text-slate-800',
      icon: <ShieldCheck className="h-6 w-6 text-slate-600" />,
    },
    Gold: {
      ring: 'border-yellow-400',
      bg: 'bg-gradient-to-br from-yellow-50 via-white to-amber-50',
      text: 'text-yellow-900',
      chip: 'bg-yellow-100',
      chipText: 'text-yellow-800',
      icon: <Award className="h-6 w-6 text-yellow-600" />,
    },
    Platinum: {
      ring: 'border-indigo-400',
      bg: 'bg-gradient-to-br from-indigo-50 via-white to-purple-50',
      text: 'text-indigo-900',
      chip: 'bg-indigo-100',
      chipText: 'text-indigo-800',
      icon: <Star className="h-6 w-6 text-indigo-600" />,
    },
  };
  const tone = tierTone[category];

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border-2 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${tone.ring} ${tone.bg}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-inner">
          {tone.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            SkillProof Verification Tier
          </p>
          <p className={`mt-0.5 text-2xl font-black ${tone.text}`}>
            {category}
          </p>
          <p className={`text-xs ${tone.text} opacity-80`}>
            {label}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className={`rounded-xl border ${tone.ring} ${tone.chip} px-3 py-2 text-center`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Overall</p>
          <p className={`mt-0.5 text-lg font-black ${tone.chipText}`}>
            {overallScore != null ? Number(overallScore).toFixed(1) : '—'}
            <span className="ml-0.5 text-[10px] opacity-70">/10</span>
          </p>
        </div>
        <div className={`rounded-xl border ${tone.ring} ${tone.chip} px-3 py-2 text-center`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Passed</p>
          <p className={`mt-0.5 text-lg font-black ${tone.chipText}`}>
            {passedCount}
          </p>
        </div>
        <div className={`rounded-xl border ${tone.ring} ${tone.chip} px-3 py-2 text-center`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Avg</p>
          <p className={`mt-0.5 text-lg font-black ${tone.chipText}`}>
            {avgScore != null ? avgScore.toFixed(1) : '—'}
            <span className="ml-0.5 text-[10px] opacity-70">/10</span>
          </p>
        </div>
        <div className={`rounded-xl border ${tone.ring} ${tone.chip} px-3 py-2 text-center`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Skills</p>
          <p className={`mt-0.5 text-lg font-black ${tone.chipText}`}>
            {verifiedSkillsCount}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A single Skill Passport card, rendered for each (user, category)
 * passport the candidate holds. Used by the "Skill Passports" section
 * on the public CV.
 */
function MultiPassportCard({
  item,
  isPrimary,
}: {
  item: PublicCandidatePassportItem;
  isPrimary?: boolean;
}): React.ReactElement {
  const status = String(item.status ?? 'unknown');
  const isActive = status === 'active' || status === 'verified';
  const isPending = status === 'pending_approval';
  const isExpired = status === 'expired';
  const isSuspended = status === 'suspended';
  const isArchived = status === 'archived';
  const isRejected = status === 'rejected';

  const tone = isActive
    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40'
    : isPending
    ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30'
    : isExpired
    ? 'border-amber-200 bg-amber-50/30'
    : isSuspended || isArchived || isRejected
    ? 'border-rose-200 bg-rose-50/30'
    : 'border-slate-200 bg-slate-50/40';

  const badge = (() => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
          <BadgeCheck className="h-3 w-3" /> Verified
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
          <Clock className="h-3 w-3" /> Pending Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
        <Shield className="h-3 w-3" /> {status}
      </span>
    );
  })();

  const categoryLabel =
    item.category_name ||
    item.main_category_name ||
    'Skill Passport';

  const verifiedSkillsCount = Array.isArray(item.verified_skills)
    ? item.verified_skills.length
    : 0;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm ${tone}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-base font-black text-slate-900 break-words">
            <Award className="h-4 w-4 shrink-0 text-[#E31B23]" />
            {categoryLabel}
          </h3>
          <p className="mt-0.5 text-[11px] font-mono text-slate-500 break-all">
            {item.passport_number}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {badge}
          {/* "Primary Passport" badge removed: the new /verify surface
              aggregates every category Passport as an independent
              credential. No passport is privileged over the others. */}
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        {item.level ? (
          <div className="rounded-md bg-white/70 px-2 py-1.5">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Level</p>
            <p className="font-bold text-slate-900">{item.level}</p>
          </div>
        ) : null}
        {item.overall_score != null ? (
          <div className="rounded-md bg-white/70 px-2 py-1.5">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Score</p>
            <p className="font-bold text-slate-900">{item.overall_score}/100</p>
          </div>
        ) : null}
        {item.passed_count != null ? (
          <div className="rounded-md bg-white/70 px-2 py-1.5">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Passed</p>
            <p className="font-bold text-slate-900">{item.passed_count}</p>
          </div>
        ) : null}
        {item.average_marks != null ? (
          <div className="rounded-md bg-white/70 px-2 py-1.5">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Avg / 10</p>
            <p className="font-bold text-slate-900">{Number(item.average_marks).toFixed(1)}</p>
          </div>
        ) : null}
      </div>

      <dl className="mt-3 space-y-1 text-[11px] text-slate-600">
        {item.issue_date ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Issued</dt>
            <dd className="font-semibold text-slate-800">{fmtDate(item.issue_date)}</dd>
          </div>
        ) : null}
        {item.expiry_date ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Expires</dt>
            <dd className="font-semibold text-slate-800">{fmtDate(item.expiry_date)}</dd>
          </div>
        ) : null}
        {verifiedSkillsCount > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Verified skills</dt>
            <dd className="font-semibold text-slate-800">{verifiedSkillsCount}</dd>
          </div>
        ) : null}
      </dl>

      {!isActive && item.revoked_at ? (
        <p className="mt-2 text-[10px] text-rose-700">
          Revoked {fmtDate(item.revoked_at)}
          {item.admin_notes ? ` · ${item.admin_notes}` : ''}
        </p>
      ) : null}
    </article>
  );
}

/**
 * PassportResultBanner
 * --------------------
 * A full-width CV-header banner that prominently declares the Passport
 * verification result so the page reads as a CV with a clear credential
 * state instead of a generic dashboard.
 */
function PassportResultBanner({
  result,
  verifiedAt,
}: {
  result: string | null | undefined;
  verifiedAt: string | null;
}): React.ReactElement | null {
  const r = String(result ?? '').toLowerCase();
  let bg = 'bg-slate-100';
  let border = 'border-slate-200';
  let text = 'text-slate-800';
  let icon = <Shield className="h-4 w-4" />;
  let label = 'SkillProof Profile';
  let sublabel = '';

  if (r === 'verified' || r === 'active') {
    bg = 'bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-amber-50/60';
    border = 'border-emerald-200';
    text = 'text-emerald-900';
    icon = <BadgeCheck className="h-5 w-5 text-emerald-600" />;
    label = 'Verified by SkillProof';
    sublabel = verifiedAt ? `Issued ${fmtDate(verifiedAt)}` : '';
  } else if (r === 'pending_approval' || r === 'pending') {
    bg = 'bg-amber-50';
    border = 'border-amber-200';
    text = 'text-amber-900';
    icon = <Clock className="h-5 w-5 text-amber-600" />;
    label = 'Pending Review';
    sublabel = 'Awaiting SkillProof verification';
  } else if (r === 'expired') {
    bg = 'bg-amber-50';
    border = 'border-amber-300';
    text = 'text-amber-900';
    icon = <Clock className="h-5 w-5 text-amber-600" />;
    label = 'Passport Expired';
    sublabel = 'Renewal required to keep the verified badge';
  } else if (r === 'suspended') {
    bg = 'bg-rose-50';
    border = 'border-rose-200';
    text = 'text-rose-900';
    icon = <XCircle className="h-5 w-5 text-rose-600" />;
    label = 'Suspended';
    sublabel = 'Verification temporarily paused';
  } else if (r === 'archived') {
    bg = 'bg-slate-100';
    border = 'border-slate-300';
    text = 'text-slate-700';
    icon = <Shield className="h-5 w-5 text-slate-500" />;
    label = 'Archived';
    sublabel = 'No longer active';
  } else if (r === 'rejected') {
    bg = 'bg-rose-50';
    border = 'border-rose-200';
    text = 'text-rose-900';
    icon = <XCircle className="h-5 w-5 text-rose-600" />;
    label = 'Rejected';
    sublabel = 'Verification did not pass';
  } else if (r === 'profile_only') {
    bg = 'bg-sky-50';
    border = 'border-sky-200';
    text = 'text-sky-900';
    icon = <UserIcon className="h-5 w-5 text-sky-600" />;
    label = 'Profile Only';
    sublabel = 'No SkillProof Passport has been issued yet';
  } else if (r === 'private') {
    return null;
  } else if (r === 'not_found') {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-6 py-3 sm:px-8 ${bg} ${border}`}
      data-testid="passport-result-banner"
    >
      <div className="flex items-center gap-2">
        {icon}
        <div className="min-w-0">
          <p className={`text-sm font-black uppercase tracking-wider ${text}`}>
            Passport Result · {label}
          </p>
          {sublabel && (
            <p className={`text-[11px] font-semibold ${text} opacity-80`}>{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 px-6 py-5 sm:px-8">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className="text-[#E31B23]">{icon}</span> {title}
        </h2>
        {subtitle ? (
          <p className="text-[11px] text-slate-500 text-right max-w-[60%]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
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
  // Hide the entire tile when no real value is available — never render
  // em-dashes, "0%" or "undefined" placeholders in the public CV.
  if (!value || value === 'undefined' || value === 'null' || value === '—') return null;
  // Also hide a literal "0" / "0.0" / "0%" — a missing or zero score
  // is information, not something to surface as a misleading badge.
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric <= 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${colour}`}>{value}</p>
    </div>
  );
}

function VerifiedBadge({
  verified,
  status,
}: {
  verified: boolean;
  status: PublicVerificationResult | string;
}) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
        <BadgeCheck className="h-3.5 w-3.5" /> Verified by SkillProof
      </span>
    );
  }
  const s = String(status);
  if (s === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
        <Shield className="h-3.5 w-3.5" /> Expired
      </span>
    );
  }
  if (s === 'suspended' || s === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
        <XCircle className="h-3.5 w-3.5" /> {s}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
      <Shield className="h-3.5 w-3.5" /> {s}
    </span>
  );
}

function NotFoundCard({ result }: { result: PublicVerificationResult | string }) {
  const isPrivate = result === 'private';
  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
          <XCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-black text-rose-700">
            {isPrivate ? 'Public View Disabled' : 'Verification Not Found'}
          </h2>
          <p className="mt-1 text-sm text-rose-700">
            {isPrivate
              ? 'The holder has not enabled public employer view for this passport. Ask the candidate to share details directly.'
              : 'No matching passport found in the SkillProof database. Double-check the verification number.'}
          </p>
        </div>
      </div>
    </div>
  );
}


export default VerifiedCvProfile;