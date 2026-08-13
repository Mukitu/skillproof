/**
 * TopFeaturesPanel — top-5 most important features for this prediction.
 *
 * Concise Bangla-first view. Importance numbers come from the trained
 * CatBoost artefact (server-sent via `top_features`); we never invent
 * them client-side. Each row shows the Bangla label + a one-line
 * description + importance bar.
 */

import React from 'react';
import { Brain } from 'lucide-react';
import { featureLabelBn } from '../../data/featureLabelsBn';
import type { V2TopFeature } from '../../services/v2Prediction';


const PALETTE = [
  'from-orange-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-fuchsia-600',
];


export const TopFeaturesPanel: React.FC<{
  features: V2TopFeature[];
  language: 'en' | 'bn';
}> = ({ features, language }) => {
  if (!features || features.length === 0) return null;
  const bn = language === 'bn';
  const max = features[0]?.importance ?? 1;

  return (
    <section
      aria-labelledby="top-features-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-[#E31B23]" />
        <h2 id="top-features-heading" className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {bn ? 'আপনার স্কোরে সবচেয়ে বেশি প্রভাব' : 'Top features driving your score'}
        </h2>
      </header>

      <ol className="space-y-2.5">
        {features.map((f, idx) => {
          const label = featureLabelBn(f.name);
          const pct = Math.max(2, Math.min(100, (f.importance / max) * 100));
          const palette = PALETTE[idx % PALETTE.length];
          return (
            <li key={`${f.name}-${f.rank}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900">
                  <span className="mr-1.5 inline-block rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    #{f.rank}
                  </span>
                  {bn ? label.bn : label.en}
                </p>
                <p className="font-mono text-[11px] font-bold tabular-nums text-slate-700">
                  {f.importance.toFixed(2)}
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                {label.desc_bn}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${palette}`}
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

export default TopFeaturesPanel;