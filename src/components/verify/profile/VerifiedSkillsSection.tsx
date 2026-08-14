/* eslint-disable react/no-unescaped-entities */

/**
 * VerifiedSkillsSection
 * ---------------------
 * "SkillProof Verified Skills" — every skill the candidate has on
 * file that passed a SkillProof assessment. Each entry shows the
 * verification status, level (when available), score, and the date
 * the skill was verified. The level + score come from the public
 * `verified_skills` payload (already sanitised by the backend).
 *
 * The task-level detail (e.g. individual assessment tasks) lives in
 * AssessmentPerformanceSection; here we keep it strictly to the
 * per-skill summary so a recruiter can scan it quickly.
 */

import React from 'react';
import { BadgeCheck, Calendar, TrendingUp } from 'lucide-react';
import { Section, fmtDate, safeStr, safeNum } from './profileHelpers';

interface Props {
  payload: any;
}

export function VerifiedSkillsSection({ payload }: Props) {
  const verified = Array.isArray(payload?.verified_skills) ? payload.verified_skills : [];

  if (verified.length === 0) return null;

  // Sort by verified_at desc; nulls last.
  const sorted = [...verified]
    .map((v) => ({
      ...v,
      _ts: v?.verified_at ? new Date(String(v.verified_at)).getTime() : 0,
    }))
    .sort((a, b) => Number(b._ts ?? 0) - Number(a._ts ?? 0));

  return (
    <Section
      id="verified-skills"
      eyebrow="Verified by SkillProof"
      title="SkillProof Verified Skills"
      icon={<BadgeCheck className="h-4 w-4" />}
      helper="Each skill has been independently verified through a SkillProof assessment."
      badge={`${sorted.length}`}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map((v, idx) => {
          const skillName = safeStr(v?.skill_name ?? null) || 'Verified Skill';
          const status = safeStr(v?.pass_status ?? v?.status ?? null) || 'Verified';
          const level = safeStr(v?.skill_level ?? null);
          const score = safeNum(v?.score ?? v?.marks ?? null);
          const category = safeStr(v?.category ?? null);
          const subCategory = safeStr(v?.sub_category ?? null);
          const verifiedAt = safeStr(v?.verified_at ?? null);
          const taskTitle = safeStr(v?.task_title ?? null);
          const isPassed = status.toLowerCase() === 'passed';

          return (
            <li
              key={`${skillName}-${idx}`}
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/30 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 break-words">{skillName}</p>
                  {category || subCategory ? (
                    <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                      {[category, subCategory].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ' +
                    (isPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700')
                  }
                >
                  <BadgeCheck className="h-3 w-3" /> {isPassed ? 'Verified' : status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {score !== null ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                      Assessment Score
                    </p>
                    <p className="mt-0.5 text-sm font-black text-slate-900">
                      {Number(score).toFixed(1)} / 10
                    </p>
                  </div>
                ) : null}
                {level ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                      Level
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-black text-amber-800">
                      <TrendingUp className="h-3 w-3" /> {level}
                    </p>
                  </div>
                ) : null}
                {verifiedAt ? (
                  <div className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                      Verified On
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Calendar className="h-3 w-3 text-slate-400" /> {fmtDate(verifiedAt)}
                    </p>
                  </div>
                ) : null}
              </div>

              {taskTitle && taskTitle.toLowerCase() !== skillName.toLowerCase() ? (
                <p className="mt-2 text-[11px] text-slate-500 break-words">
                  Assessment:{' '}
                  <span className="font-semibold text-slate-700">{taskTitle}</span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}