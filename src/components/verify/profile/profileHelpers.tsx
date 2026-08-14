/* eslint-disable react/no-unescaped-entities */

/**
 * profileHelpers.ts
 * -----------------
 * Shared visual / formatting helpers for the new premium
 * "Public Profile" / Digital CV view mounted on /verify.
 *
 * Everything here is presentation-only — no network, no side effects.
 */

import React from 'react';
import { Check, Clock, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function initialsOf(name: string): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

export function fmtDate(value: string | number | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fallback;
  }
}

export function safeStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function safeNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce a project row from the public verification payload into the
 * shape our CV expects. The SQL RPC returns `projects` as an array of
 * rows with a few different shapes over the migration history —
 * normalise here so the renderer only sees one shape.
 */
export function normaliseProject(p: any): {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
  role: string | null;
  image: string | null;
} {
  if (!p || typeof p !== 'object') {
    return { name: null, description: null, technologies: [], url: null, role: null, image: null };
  }
  const name = safeStr(p.name ?? p.title ?? null);
  const description = safeStr(p.description ?? null);
  const url = safeStr(p.url ?? p.live_url ?? null);
  const role = safeStr(p.role ?? null);
  const image = safeStr(p.image ?? p.image_url ?? null);

  let technologies: string[] = [];
  const techRaw = p.technologies ?? p.tech_stack ?? null;
  if (Array.isArray(techRaw)) {
    technologies = techRaw.map((t: any) => safeStr(t)).filter((t: string | null): t is string => Boolean(t));
  } else if (typeof techRaw === 'string') {
    technologies = techRaw
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (typeof p.tech_stack === 'string') {
    technologies = p.tech_stack
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return { name, description, technologies, url, role, image };
}

/**
 * Normalise an assessment history row from the public verification API.
 * The RPC returns either `task_title` / `task_max_marks` directly or
 * via snapshot fields. Coerce everything into a single shape.
 */
export function normaliseAssessmentRow(s: any): {
  id: string;
  title: string | null;
  skill: string | null;
  category: string | null;
  subCategory: string | null;
  status: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  eventAt: string | null;
} {
  const title = safeStr(s.task_title ?? s.task_title_snapshot ?? null);
  const skill = safeStr(s.skill_name ?? s.skill_name_snapshot ?? null);
  const category = safeStr(s.category_name ?? s.category_name_snapshot ?? null);
  const subCategory = safeStr(s.sub_category_name ?? s.sub_category_name_snapshot ?? null);
  const status = safeStr(s.status ?? null) ?? 'Unknown';
  const eventAt = safeStr(s.event_at ?? s.reviewed_at ?? s.updated_at ?? null);

  const score = safeNum(s.score);
  const maxScore = safeNum(s.task_max_marks ?? s.max_marks ?? null);

  let percentage: number | null = null;
  if (score !== null && maxScore !== null && maxScore > 0) {
    percentage = Math.round((score / maxScore) * 1000) / 10;
  } else if (score !== null) {
    percentage = Math.round(score * 10) / 10;
  }

  return {
    id: safeStr(s.id ?? null) ?? Math.random().toString(36).slice(2),
    title,
    skill,
    category,
    subCategory,
    status,
    score,
    maxScore,
    percentage,
    eventAt,
  };
}

/**
 * Outcome icon + tone for assessment result rows. Returns null-safe
 * colours the parent can apply via className.
 */
export function assessmentTone(status: string): {
  tone: 'emerald' | 'rose' | 'amber' | 'slate';
  icon: ReactNode;
  label: string;
} {
  const s = (status ?? '').toLowerCase();
  if (s === 'passed') {
    return {
      tone: 'emerald',
      icon: <Check className="h-3 w-3" />,
      label: 'Passed',
    };
  }
  if (s === 'failed') {
    return {
      tone: 'rose',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
    };
  }
  return {
    tone: 'amber',
    icon: <Clock className="h-3 w-3" />,
    label: status || 'Pending',
  };
}

/**
 * Section primitive — used by every block of the new public profile.
 * Renders a card with optional title, eyebrow, icon, badge, and an
 * optional helper line. Always renders inside a rounded white card so
 * the recruiter sees a unified visual language.
 */
export function Section({
  id,
  title,
  eyebrow,
  icon,
  badge,
  helper,
  children,
  className = '',
}: {
  id?: string;
  title?: string;
  eyebrow?: string;
  icon?: ReactNode;
  badge?: string;
  helper?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || eyebrow || helper) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E31B23]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-0.5 flex items-center gap-2 text-base font-black tracking-tight text-slate-900 sm:text-lg">
                {icon ? <span className="text-[#E31B23]">{icon}</span> : null}
                {title}
              </h2>
            ) : null}
            {helper ? (
              <p className="mt-1 text-xs text-slate-500 break-words">{helper}</p>
            ) : null}
          </div>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
              {badge}
            </span>
          ) : null}
        </header>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * A single KPI tile, used in the assessment summary and the new
 * Credentials strip. Tone controls the numeric colour.
 */
export function StatTile({
  label,
  value,
  suffix,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  tone?: 'default' | 'emerald' | 'amber' | 'rose' | 'indigo';
  hint?: string;
}) {
  const colour =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : tone === 'rose'
      ? 'text-rose-700'
      : tone === 'indigo'
      ? 'text-indigo-700'
      : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-black ${colour}`}>
        {value === null || value === undefined || value === '' ? '—' : value}
        {suffix ? <span className="ml-0.5 text-[10px] font-bold text-slate-500">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Visible field check — used everywhere to honour the "hide empty
 * fields" rule. Accepts anything (string, number, nullable boolean,
 * empty array) and returns true only when there is something a
 * recruiter could read.
 */
export function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return false;
}

/**
 * Compute the pass rate from the public assessment_summary. Falls back
 * to 0 when the summary is missing or malformed.
 */
export function passRateFromSummary(summary: {
  total_assessments?: number | null;
  total_attempts?: number | null;
  passed?: number | null;
} | null | undefined): { total: number; passed: number; rate: number } {
  if (!summary) return { total: 0, passed: 0, rate: 0 };
  const total = Number(summary.total_assessments ?? summary.total_attempts ?? 0);
  const passed = Number(summary.passed ?? 0);
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, rate };
}

/**
 * Build a deduplicated, ordered list of skills from the candidate's
 * public payload. Source fields are (most-recent wins):
 *   - candidate.skill_tags          (string[])
 *   - payload.technologies          ({name}[])    ← mirrors user_skills
 *   - payload.verified_skills       (verified-skill strings)
 *   - payload.career_intelligence.skills (ai_career_profile.skills)
 *
 * Each tag is unique by lower-case name. Verified skills bubble to the
 * top so the verified list is rendered separately. The "all" list
 * returns skills in the order they appeared in the payload.
 *
 * Defence-in-depth: even if every other source is empty, we surface at
 * least one skill from verified_skills in `all` so recruiters never see
 * an empty chip grid when the candidate has any verifiable skill.
 */
export function collectSkills(payload: any): {
  all: string[];
  verified: string[];
  withUrl: Map<string, string>;
} {
  const all: string[] = [];
  const seen = new Set<string>();
  const withUrl = new Map<string, string>();

  const verifiedSet = new Set<string>();
  const verifiedArr: string[] = [];

  const verifiedSkills = Array.isArray(payload?.verified_skills) ? payload.verified_skills : [];
  for (const v of verifiedSkills) {
    const nm = safeStr(v?.skill_name ?? null);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (!verifiedSet.has(key)) {
      verifiedSet.add(key);
      verifiedArr.push(nm);
    }
  }

  const candidate = payload?.candidate ?? null;
  const skillTags = Array.isArray(candidate?.skill_tags) ? candidate.skill_tags : [];
  for (const t of skillTags) {
    const nm = safeStr(t);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(nm);
    }
  }

  const technologies = Array.isArray(payload?.technologies) ? payload.technologies : [];
  for (const t of technologies) {
    if (!t || typeof t !== 'object') continue;
    const nm = safeStr(t.name);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(nm);
    }
    const url = safeStr((t as any).evidence_url ?? (t as any).url ?? null);
    if (url && !withUrl.has(key)) withUrl.set(key, url);
  }

  // Also pull from career_intelligence.skills (mirrors user_skills via
  // the v_candidate_ai_profile_signals view in migration 14000019).
  const ciSkills = Array.isArray(payload?.career_intelligence?.skills)
    ? payload.career_intelligence.skills
    : [];
  for (const s of ciSkills) {
    const nm = safeStr(typeof s === 'string' ? s : s?.skill_name ?? s?.name ?? null);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(nm);
    }
  }

  // Verified skills also surface in the "all" list to give the
  // recruiter a single combined view if they want one.
  for (const nm of verifiedArr) {
    const key = nm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(nm);
    }
  }

  return { all, verified: verifiedArr, withUrl };
}

/**
 * QR code helper — same pattern the existing CV uses. Returns a
 * third-party image URL that the browser can render without further
 * setup. Works in both dev and production because the URL is absolute.
 */
export function qrUrl(data: string, size = 320): string {
  const enc = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${enc}&color=0f172a&bgcolor=ffffff&margin=2&qzone=2`;
}
