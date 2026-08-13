/**
 * WhyThisScorePanel — explains the v2 prediction to the user.
 *
 * Renders the top-N features from the trained CatBoost model along with
 * the user's actual feature value (when known) and the feature's
 * Bangla description. Features are pulled from the server response
 * (`top_features`) — the model artifact is the only source of truth.
 *
 * IMPORTANT: this panel NEVER invents explanations. If a feature's
 * user value is unknown, it renders "ডেটা নেই" — no fake numbers.
 */

import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import {
  featureLabelBn,
  featureValueForBundle,
} from '../../data/featureLabelsBn';
import type { V2CoverageCounts, V2TopFeature } from '../../services/v2Prediction';

export interface WhyThisScorePanelProps {
  language: 'en' | 'bn';
  topFeatures: V2TopFeature[];
  counts: V2CoverageCounts | null;

  candidate: Record<string, unknown> | null;
}

const FEATURE_PALETTE = [
  'from-rose-500 to-pink-600',
  'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-fuchsia-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-teal-500 to-cyan-600',
  'from-pink-500 to-rose-500',
];

export const WhyThisScorePanel: React.FC<WhyThisScorePanelProps> = ({
  language,
  topFeatures,
  counts,
  candidate,
}) => {
  const bn = language === 'bn';
  const t = (en: string, bnText: string) => (bn ? bnText : en);

  if (!topFeatures || topFeatures.length === 0) {
    return null;
  }

  const bundleLike = candidate
    ? { profile: { candidate, skills: undefined, assessments: undefined } }
    : null;

  const maxImportance = topFeatures[0]?.importance ?? 1;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
            <Cpu className="h-4 w-4 text-[#E31B23]" />
            <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
              {t('Why this score?', 'এই স্কোর কেন?')}
            </span>
          </h3>
          <p className="mt-1 max-w-xl text-[11px] text-slate-500">
            {t(
              'Your Career Intelligence engine weighs the top features from your real SkillProof data. Below are the features with the biggest impact on your score — each shows a Bangla description and your current value.',
              'ক্যারিয়ার ইন্টেলিজেন্স ইঞ্জিন আপনার প্রকৃত SkillProof ডেটার শীর্ষ ফিচারগুলোকে কতটা গুরুত্ব দেয় তা বিশ্লেষণ করে। নিচে স্কোরে সবচেয়ে বেশি প্রভাব ফেলে এমন ফিচারগুলো — প্রতিটির সাথে বাংলা বর্ণনা ও আপনার বর্তমান মান।',
            )}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3 text-orange-300" />
          {t('Career Intelligence', 'ক্যারিয়ার ইন্টেলিজেন্স')}
        </span>
      </header>

      <div className="space-y-2.5">
        {topFeatures.map((f, idx) => {
          const label = featureLabelBn(f.name);
          const userValue = featureValueForBundle(
            f.name,
            bundleLike as any,
            counts as unknown as Record<string, number>,
          );
          const pct = Math.max(2, Math.min(100, (f.importance / maxImportance) * 100));
          const palette = FEATURE_PALETTE[idx % FEATURE_PALETTE.length];
          const hasData = userValue !== 'ডেটা নেই' && userValue !== '—';

          return (
            <div
              key={`${f.name}-${f.rank}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-slate-900">
                    <span className="font-mono text-[10px] text-slate-400">#{f.rank}</span>{' '}
                    {bn ? label.bn : label.en}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">
                    {label.desc_bn}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[12px] font-black ${hasData ? 'text-slate-900' : 'text-slate-400'}`}>
                    {userValue}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    {t('your value', 'আপনার মান')}
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-mono">{f.name}</span>
                  <span className="font-semibold text-slate-700">
                    {f.importance.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${palette}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WhyThisScorePanel;
