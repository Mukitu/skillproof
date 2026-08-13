/**
 * CISections — UI cards for the Career Intelligence response.
 *
 * Each component is bilingual (Bangla + English), self-contained, and
 * styled with the existing SkillProof design language:
 *   - Outer shell: `rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6`
 *   - Section icon tile: gradient `from-[#E31B23] to-[#F97316]`
 *   - Section title: uppercase, tracked, with gradient text fill
 *
 * These cards are pure renderers — they NEVER fabricate data. If the
 * backend returned empty arrays, the caller skips rendering.
 */

import React from 'react';
import {
  AlertTriangle,
  Award,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { CI_LABELS, pick } from '../../data/ciLabels';
import type {
  CIBaseline,
  CICareerMatch,
  CIImprovementPlan as CIImprovementPlanData,
  CIMarketReadiness as CIMarketReadinessData,
  CIResponse,
  CISections,
  CISkillGap,
  CIStrength,
} from '../../services/careerIntelligence';

function clampPct(n: number | null | undefined, max = 100): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, v));
}

function priorityTone(priority: CISkillGap['priority']): string {
  if (priority === 'high') return 'bg-rose-100 text-rose-800';
  if (priority === 'medium') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function priorityLabel(bn: boolean, priority: CISkillGap['priority']): string {
  if (priority === 'high') return bn ? 'উচ্চ' : 'High';
  if (priority === 'medium') return bn ? 'মাঝারি' : 'Medium';
  return bn ? 'কম' : 'Low';
}


export const CIFallbackBanner: React.FC<{ visible: boolean; bn: boolean }> = ({
  visible,
  bn,
}) => {
  if (!visible) return null;
  return (
    <section
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-[12px] leading-relaxed">
        {pick(bn, CI_LABELS.fallbackNotice)}
      </p>
    </section>
  );
};


export const CIHero: React.FC<{
  sections: CISections;
  baseline: CIBaseline;
  degraded: boolean;
  bn: boolean;
}> = ({ sections, baseline, degraded, bn }) => {
  const overall = clampPct(sections.overall_score);
  const emp = clampPct(sections.employability_score);
  const hire = clampPct(sections.hiring_readiness);
  const tech = clampPct(baseline.technical_strength);
  const ready = clampPct(baseline.career_readiness);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div
        aria-hidden="true"
        className="h-1 w-full bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]"
      />
      <div className="p-5 sm:p-7">
        <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-700">
              <Sparkles className="h-3 w-3" />
              <span>{pick(bn, CI_LABELS.heroTitle)}</span>
              {degraded && (
                <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                  {bn ? 'ফলব্যাক' : 'fallback'}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {pick(bn, CI_LABELS.careerSummary)}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-700">
              {sections.career_summary}
            </p>
            {sections.career_level && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Award className="h-3 w-3 text-orange-300" />
                {sections.career_level}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="list">
          <CIHeroTile
            role="listitem"
            icon={<Target className="h-4 w-4" />}
            label={pick(bn, CI_LABELS.overallReadiness)}
            value={overall}
            tone="from-[#E31B23] to-[#F97316]"
          />
          <CIHeroTile
            role="listitem"
            icon={<TrendingUp className="h-4 w-4" />}
            label={pick(bn, CI_LABELS.employability)}
            value={emp}
            tone="from-amber-500 to-orange-600"
          />
          <CIHeroTile
            role="listitem"
            icon={<Briefcase className="h-4 w-4" />}
            label={pick(bn, CI_LABELS.hiringReadiness)}
            value={hire}
            tone="from-emerald-500 to-teal-600"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CIHeroTile
            icon={<Brain className="h-3.5 w-3.5" />}
            label={bn ? 'ক্যারিয়ার প্রস্তুতি' : 'Career Readiness'}
            value={ready}
            tone="from-sky-500 to-blue-600"
            compact
          />
          <CIHeroTile
            icon={<Zap className="h-3.5 w-3.5" />}
            label={bn ? 'টেকনিক্যাল শক্তি' : 'Technical Strength'}
            value={tech}
            tone="from-violet-500 to-purple-600"
            compact
          />
        </div>
      </div>
    </section>
  );
};

const CIHeroTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  compact?: boolean;
  role?: string;
}> = ({ icon, label, value, tone, compact, role }) => (
  <div
    role={role}
    className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'}`}
  >
    <div
      className={`mb-2 inline-flex ${compact ? 'h-7 w-7' : 'h-9 w-9'} items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm`}
    >
      {icon}
    </div>
    <p
      className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-wider text-slate-500`}
    >
      {label}
    </p>
    <p className="mt-1 flex items-baseline gap-1">
      <span
        className={`${compact ? 'text-lg' : 'text-2xl'} font-bold tabular-nums text-slate-900`}
      >
        {value.toFixed(1)}
      </span>
      <span className="text-[10px] text-slate-500">/100</span>
    </p>
  </div>
);


export const CITopStrengths: React.FC<{ items: CIStrength[]; bn: boolean }> = ({
  items,
  bn,
}) => {
  if (!items || items.length === 0) return null;
  const max = Math.max(1, ...items.map((i) => clampPct(i.score)));
  const palette = [
    'from-rose-500 to-pink-600',
    'from-orange-500 to-amber-500',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.topStrengths)}
          </span>
        </h3>
      </header>

      <ol className="space-y-2.5">
        {items.map((it, idx) => {
          const pct = Math.max(2, Math.min(100, (clampPct(it.score) / max) * 100));
          const tone = palette[idx % palette.length];
          return (
            <li
              key={`${it.skill}-${idx}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900">{it.skill}</p>
                <p className="font-mono text-[11px] font-bold tabular-nums text-slate-700">
                  {clampPct(it.score).toFixed(1)}
                  <span className="ml-1 text-[10px] font-normal text-slate-500">/100</span>
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{it.reason}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tone}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};


export const CISkillGaps: React.FC<{ items: CISkillGap[]; bn: boolean }> = ({
  items,
  bn,
}) => {
  if (!items || items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <Target className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.skillGaps)}
          </span>
        </h3>
      </header>

      <ol className="space-y-2.5">
        {items.map((g, idx) => {
          const cur = clampPct(g.current_level);
          const gap = clampPct(g.gap_level);
          return (
            <li
              key={`${g.skill}-${idx}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900">{g.skill}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityTone(g.priority)}`}
                >
                  {priorityLabel(bn, g.priority)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {bn ? 'বর্তমান স্তর' : 'Current level'}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                      style={{ width: `${cur}%` }}
                    />
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-600">
                    {cur.toFixed(1)}/100
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {bn ? 'ঘাটতি' : 'Gap'}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-600"
                      style={{ width: `${gap}%` }}
                    />
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-600">
                    {gap.toFixed(1)}/100
                  </p>
                </div>
              </div>
              {g.recommendation && (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                  <span className="font-bold text-slate-900">
                    {bn ? 'প্রস্তাবনা: ' : 'Recommendation: '}
                  </span>
                  {g.recommendation}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};


export const CICareerMatches: React.FC<{ items: CICareerMatch[]; bn: boolean }> = ({
  items,
  bn,
}) => {
  if (!items || items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <Briefcase className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.careerMatches)}
          </span>
        </h3>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m, idx) => {
          const pct = clampPct(m.match_percentage);
          const ringTone =
            pct >= 70
              ? 'from-emerald-500 to-teal-600'
              : pct >= 45
                ? 'from-amber-500 to-orange-500'
                : 'from-rose-500 to-pink-600';
          return (
            <div
              key={`${m.role}-${idx}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ringTone} text-white shadow-sm`}
                >
                  <span className="text-[13px] font-black tabular-nums">
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-tight text-slate-900">
                    {m.role}
                  </p>
                  {m.reason && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      {m.reason}
                    </p>
                  )}
                </div>
              </div>

              {m.missing_skills && m.missing_skills.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {pick(bn, CI_LABELS.missingSkills)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.missing_skills.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {m.next_step && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-800">
                  <ChevronRight className="h-3 w-3" />
                  <span>{pick(bn, CI_LABELS.nextStep)}:</span>
                  <span className="font-semibold">{m.next_step}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};


export const CIMarketReadiness: React.FC<{ item: CIMarketReadinessData; bn: boolean }> = ({
  item,
  bn,
}) => {
  if (!item) return null;
  const pct = clampPct(item.score);
  const tone =
    pct >= 70
      ? 'from-emerald-500 to-teal-600'
      : pct >= 45
        ? 'from-amber-500 to-orange-500'
        : 'from-rose-500 to-pink-600';
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <MapPin className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.marketReadiness)}
          </span>
        </h3>
      </header>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex w-full max-w-[180px] shrink-0 flex-col items-center">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}
          >
            <div className="text-center">
              <p className="text-2xl font-black tabular-nums">{Math.round(pct)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                /100
              </p>
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tone}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <p className="flex-1 text-[13px] leading-relaxed text-slate-700">{item.summary}</p>
      </div>
    </section>
  );
};


export const CIImprovementPlan: React.FC<{ plan: CIImprovementPlanData; bn: boolean }> = ({
  plan,
  bn,
}) => {
  if (!plan) return null;
  const cols: Array<{
    key: keyof CIImprovementPlanData;
    label: string;
    icon: React.ReactNode;
    tone: string;
  }> = [
    {
      key: 'days_30',
      label: pick(bn, CI_LABELS.day30),
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'from-rose-500 to-pink-600',
    },
    {
      key: 'days_60',
      label: pick(bn, CI_LABELS.day60),
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      tone: 'from-amber-500 to-orange-500',
    },
    {
      key: 'days_90',
      label: pick(bn, CI_LABELS.day90),
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      tone: 'from-emerald-500 to-teal-600',
    },
  ];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <Lightbulb className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.improvementPlan)}
          </span>
        </h3>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cols.map((c) => {
          const list = plan[c.key] ?? [];
          return (
            <div
              key={c.key}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${c.tone} text-white shadow-sm`}
                >
                  {c.icon}
                </span>
                <p className="text-[12px] font-black uppercase tracking-wider text-slate-900">
                  {c.label}
                </p>
              </div>
              {list.length === 0 ? (
                <p className="text-[11px] italic text-slate-500">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.map((step, i) => (
                    <li
                      key={`${c.key}-${i}`}
                      className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-700"
                    >
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};


export const CIAISummary: React.FC<{ text: string; bn: boolean }> = ({ text, bn }) => {
  if (!text) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
          <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
            {pick(bn, CI_LABELS.aiSummary)}
          </span>
        </h3>
      </header>
      <blockquote className="border-l-4 border-[#F97316] bg-orange-50/40 px-4 py-3 text-[13px] italic leading-relaxed text-slate-700">
        {text.split(/\n+/).map((para, i) => (
          <p key={`ci-summary-${i}`} className={i === 0 ? '' : 'mt-2'}>
            {para}
          </p>
        ))}
      </blockquote>
    </section>
  );
};


export type { CIResponse };
