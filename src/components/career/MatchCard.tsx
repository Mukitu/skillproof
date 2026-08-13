import React from 'react';
import { MATCH_LABEL_META } from '../../services/jobMatch';
import type { Job, JobMatchResult } from '../../types/database';
import { ScoreBar } from './ScoreBar';

export const MatchCard: React.FC<{ job: Job; match: JobMatchResult; language: 'en' | 'bn' }> = ({ job, match, language }) => {
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const meta = MATCH_LABEL_META[match.label] ?? MATCH_LABEL_META.good_match;
  const overall = Math.max(0, Math.min(100, Math.round(match.overall_match ?? 0)));
  const missing = Array.isArray(match.missing_skills_required)
    ? match.missing_skills_required
    : Array.isArray(match.missing_skills_json)
      ? match.missing_skills_json
      : [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-black text-slate-900">{job.title}</h4>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.chip}`}>
              {t(meta.label, meta.labelBn)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {job.company_name} · {job.location || 'Bangladesh'} · {job.job_type || 'Full-time'}
          </p>
          {match.ai_reason_bn && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-slate-50/60 p-2 text-[11px] leading-relaxed text-slate-700">
              {match.ai_reason_bn}
            </p>
          )}
        </div>
        <div className="flex w-24 shrink-0 flex-col items-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${meta.barTone} text-base font-black text-white shadow`}>
            {overall}%
          </div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('Match', 'ম্যাচ')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <ScoreBar label="Skill" value={match.skill_match ?? 0} />
        <ScoreBar label="Exp" value={match.experience_match ?? 0} />
        <ScoreBar label="Edu" value={match.education_match ?? 0} />
        <ScoreBar label="Goal" value={match.career_goal_match ?? 0} />
      </div>
    </div>
  );
};

export default MatchCard;