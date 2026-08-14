/* eslint-disable react/no-unescaped-entities */

/**
 * CareerReadinessSection
 * ----------------------
 * "SkillProof Career Intelligence" — surfaces the deterministic AI
 * career intelligence signals for the candidate. The signals come from
 * two layered sources (most-recent wins):
 *
 *   1. `payload.career_intelligence` — already-computed signals
 *      (overall_score, employability_score, hiring_readiness,
 *      top_strengths, skill_gaps, career_matches, market_readiness,
 *      career_summary). These may be sourced from the legacy
 *      career_ai_reports row OR from the deterministic
 *      `public.v_candidate_ai_profile_signals` view (migration 14000019).
 *
 *   2. SkillProof AI Profile fallback — even when none of the above
 *      exist, we derive overall/employability scores from the data the
 *      candidate added through their AI Profile:
 *        - `candidate.skill_tags`         (chips added from dashboard)
 *        - `payload.technologies`         (live user_skills rows)
 *        - `career_information.experience_years`, `career_information.bio`
 *
 * This guarantees the Career Intelligence block is never empty while
 * the candidate has any profile data, and it stays hidden when they
 * explicitly opted out via `hide_ai_on_verified_profile`.
 */

import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Target, AlertTriangle, Briefcase, Activity } from 'lucide-react';
import { Section, StatTile, safeNum, safeStr, collectSkills } from './profileHelpers';

interface Props {
  payload: any;
}

export function CareerReadinessSection({ payload }: Props) {
  const hideAi = Boolean(
    payload?.hide_ai_on_verified_profile ?? payload?.candidate?.hide_ai_on_verified_profile ?? false,
  );
  if (hideAi) return null;

  const ci = payload?.career_intelligence ?? null;
  const candidate = payload?.candidate ?? null;
  const career = payload?.career_information ?? null;

  // ---------------------------------------------------------------------
  // Top strengths — prefer the server-side signals, fall back to
  // SkillProof AI Profile skills.
  // ---------------------------------------------------------------------
  const strengths: Array<{ skill: string; score: number; reason?: string | null }> = useMemo(() => {
    const fromCi = Array.isArray(ci?.top_strengths) ? ci.top_strengths : [];
    if (fromCi.length > 0) {
      return fromCi
        .map((s: any) => ({
          skill: safeStr(s?.skill ?? s?.name ?? null) ?? 'Skill',
          score: safeNum(s?.score ?? null) ?? 70,
          reason: safeStr(s?.reason ?? null),
        }))
        .filter((s: { skill: string }) => Boolean(s.skill));
    }
    // Fallback: pick the first few AI Profile skills as strengths.
    const { all } = collectSkills(payload);
    return all.slice(0, 6).map((name) => ({
      skill: name,
      score: 80,
      reason: 'Added by the candidate through the SkillProof AI Profile.',
    }));
  }, [ci, payload]);

  const gaps: any[] = Array.isArray(ci?.skill_gaps) ? ci.skill_gaps : [];
  const matches: any[] = Array.isArray(ci?.career_matches) ? ci.career_matches : [];
  const summary =
    safeStr(ci?.career_summary ?? null)
    || safeStr(career?.experience_summary ?? null)
    || safeStr(candidate?.experience_summary ?? null)
    || safeStr(career?.bio ?? null)
    || safeStr(candidate?.bio ?? null)
    || null;

  // ---------------------------------------------------------------------
  // Score tiles: prefer server-computed value; fall back to a
  // deterministic estimate from the AI Profile.
  // ---------------------------------------------------------------------
  const skillCount = useMemo(() => {
    const { all } = collectSkills(payload);
    return all.length;
  }, [payload]);

  const years = safeNum(
    career?.experience_years ?? candidate?.experience_years ?? null,
  ) ?? 0;
  const hasProfession = Boolean(
    safeStr(career?.profession ?? candidate?.profession ?? null),
  );
  const hasPosition = Boolean(
    safeStr(career?.current_position ?? candidate?.current_position ?? null),
  );

  const overall = useMemo(() => {
    const fromCi = safeNum(ci?.overall_score ?? null);
    if (fromCi !== null) return fromCi;
    // Deterministic estimate: skill count + experience years.
    return Math.min(
      100,
      Math.max(
        0,
        (skillCount >= 1 ? 30 : 0)
          + Math.min(40, years * 5)
          + (hasProfession ? 15 : 0)
          + (skillCount >= 3 ? 15 : 0),
      ),
    );
  }, [ci, skillCount, years, hasProfession]);

  const employability = useMemo(() => {
    const fromCi = safeNum(ci?.employability_score ?? null);
    if (fromCi !== null) return fromCi;
    return Math.min(
      100,
      Math.max(
        0,
        (hasProfession ? 30 : 0)
          + (hasPosition ? 25 : 0)
          + Math.min(30, years * 3)
          + (skillCount >= 1 ? 15 : 0),
      ),
    );
  }, [ci, hasProfession, hasPosition, years, skillCount]);

  const hiring = useMemo(() => {
    const fromCi = safeNum(ci?.hiring_readiness ?? null);
    if (fromCi !== null) return fromCi;
    return Math.min(
      100,
      Math.max(
        0,
        (hasProfession ? 30 : 0)
          + (hasPosition ? 30 : 0)
          + Math.min(20, years * 2)
          + (skillCount >= 3 ? 20 : 0),
      ),
    );
  }, [ci, hasProfession, hasPosition, years, skillCount]);

  const careerLevel = (() => {
    const fromCi = safeStr(ci?.career_level ?? null);
    if (fromCi) return fromCi;
    if (years >= 8) return 'Senior';
    if (years >= 4) return 'Mid';
    if (years >= 1) return 'Junior';
    return 'Entry';
  })();

  const marketReadinessScore = safeNum(ci?.market_readiness?.score ?? null);
  const marketReadinessSummary = safeStr(ci?.market_readiness?.summary ?? null);

  // Derive a fallback market_readiness summary if the server didn't send one.
  const fallbackMarketSummary = hasProfession
    ? `Bangladesh market favours ${safeStr(career?.profession ?? candidate?.profession ?? null)} candidates with at least ${Math.max(2, years)} years of demonstrated experience.`
    : 'Market readiness will improve once profession and experience are recorded on the SkillProof AI Profile.';

    // Smart fallback for career_matches when none come from the server.
  const finalMatches: any[] =
    matches.length > 0
      ? matches
      : hasProfession
      ? [
          {
            role: safeStr(career?.profession ?? candidate?.profession ?? null) ?? 'Software Engineer',
            match_percentage: Math.min(95, 60 + years * 4 + (skillCount >= 3 ? 15 : 0)),
            reason: 'Based on the candidate\u2019s declared profession and AI Profile skill set.',
            missing_skills: [],
            next_step: 'Continue building the verified skill set in the SkillProof AI Profile.',
          },
        ]
      : [];

  // If literally nothing in the structure has data, hide the section.
  if (
    overall === 0 &&
    employability === 0 &&
    hiring === 0 &&
    !summary &&
    strengths.length === 0 &&
    gaps.length === 0 &&
    finalMatches.length === 0
  ) {
    return null;
  }

  return (
    <Section
      id="career-readiness"
      eyebrow="SkillProof Career Intelligence"
      title="Career Readiness"
      icon={<Sparkles className="h-4 w-4" />}
      helper="Computed from the candidate's SkillProof AI Profile — separate from assessment scores and credential scores."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Overall" value={overall ?? '—'} suffix="/ 100" tone="emerald" />
        <StatTile label="Employability" value={employability ?? '—'} suffix="/ 100" tone="emerald" />
        <StatTile label="Hiring Readiness" value={hiring ?? '—'} suffix="/ 100" tone="emerald" />
        <StatTile
          label="Market Readiness"
          value={marketReadinessScore ?? '—'}
          suffix="/ 100"
          tone="emerald"
        />
      </div>

      {careerLevel ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
            <Briefcase className="h-3 w-3" /> Career Level: {careerLevel}
          </span>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
            Career Summary
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-800 break-words">{summary}</p>
        </div>
      ) : null}

      {strengths.length > 0 ? (
        <div className="mt-4">
          <h3 className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            <TrendingUp className="h-3 w-3" /> Top Strengths
          </h3>
          <ul className="mt-2 space-y-1.5">
            {strengths.map((s, idx) => (
              <li
                key={`${s.skill}-${idx}`}
                className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 break-words">{s.skill}</p>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                    {s.score} / 100
                  </span>
                </div>
                {s.reason ? (
                  <p className="mt-1 text-[11px] text-slate-600 break-words">{s.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="mt-4">
          <h3 className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="h-3 w-3" /> Skill Gaps
          </h3>
          <ul className="mt-2 space-y-1.5">
            {gaps.map((g: any, idx: number) => {
              const priority = String(g?.priority ?? '').toLowerCase();
              const pill =
                priority === 'high'
                  ? 'bg-rose-100 text-rose-800'
                  : priority === 'medium'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800';
              return (
                <li
                  key={`${g?.skill ?? 'g'}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 break-words">
                      {safeStr(g?.skill ?? null)}
                    </p>
                    {priority ? (
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ' +
                          pill
                        }
                      >
                        {priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 break-words">
                    Current {safeNum(g?.current_level ?? null) ?? '—'} · Gap{' '}
                    {safeNum(g?.gap_level ?? null) ?? '—'}
                  </p>
                  {g?.recommendation ? (
                    <p className="mt-1 text-[11px] text-slate-700 break-words">
                      {String(g.recommendation)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {finalMatches.length > 0 ? (
        <div className="mt-4">
          <h3 className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            <Target className="h-3 w-3" /> Career Matches
          </h3>
          <ul className="mt-2 space-y-1.5">
            {finalMatches.map((m: any, idx: number) => (
              <li
                key={`${m?.role ?? 'm'}-${idx}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 break-words">
                    {safeStr(m?.role ?? null)}
                  </p>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800">
                    {safeNum(m?.match_percentage ?? null) ?? '—'}% match
                  </span>
                </div>
                {m?.reason ? (
                  <p className="mt-1 text-[11px] text-slate-600 break-words">{String(m.reason)}</p>
                ) : null}
                {Array.isArray(m?.missing_skills) && m.missing_skills.length > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-500 break-words">
                    <span className="font-bold">Missing:</span>{' '}
                    {m.missing_skills
                      .map((s: unknown) => safeStr(s))
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : null}
                {m?.next_step ? (
                  <p className="mt-1 text-[11px] text-slate-700 break-words">
                    <span className="font-bold">Next:</span> {String(m.next_step)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Bangladesh Market Readiness
          </p>
          <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
            {marketReadinessScore ?? '—'} / 100
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-700 break-words">
          {marketReadinessSummary || fallbackMarketSummary}
        </p>
      </div>

      <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
        <Activity className="h-3 w-3" /> Career Intelligence is separate from assessment score &amp; credential score.
      </p>
    </Section>
  );
}
