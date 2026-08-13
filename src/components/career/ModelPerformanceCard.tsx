/**
 * ModelPerformanceCard — frozen v2 model performance metrics.
 *
 * Numbers come from `src/data/mlV2Metrics.ts` — they are computed
 * once on the held-out test set and never recomputed at runtime.
 * The model artifact is loaded once at boot and reused for inference.
 */

import React from 'react';
import { BadgeCheck, Cpu, Target, TrendingUp } from 'lucide-react';
import { ML_V2_METRICS } from '../../data/mlV2Metrics';

export interface ModelPerformanceCardProps {
  language: 'en' | 'bn';
  regressor?: string;
  classifier?: string;
  modelVersion?: string;
  featureCount?: number;
}

export const ModelPerformanceCard: React.FC<ModelPerformanceCardProps> = ({
  language,
  regressor,
  classifier,
  modelVersion,
  featureCount,
}) => {
  const bn = language === 'bn';
  const t = (en: string, bnText: string) => (bn ? bnText : en);

  const regName = regressor ?? ML_V2_METRICS.regressor;
  const clsName = classifier ?? ML_V2_METRICS.classifier;
  const ver = modelVersion ?? ML_V2_METRICS.model_version;
  const nFeat = featureCount ?? ML_V2_METRICS.n_features;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
            <Cpu className="h-4 w-4 text-[#E31B23]" />
            <span className="bg-gradient-to-r from-[#E31B23] to-[#F97316] bg-clip-text text-transparent">
              {t('Model Performance', 'মডেল পারফরম্যান্স')}
            </span>
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {t(
              'Holdout-test metrics for the v2 model. Frozen at training time — the production service only loads the trained artefact.',
              'v2 মডেলের হোল্ডআউট টেস্ট মেট্রিক্স। প্রশিক্ষণের সময় ফ্রিজ করা — প্রোডাকশন সার্ভিস শুধু প্রশিক্ষিত আর্টিফ্যাক্ট লোড করে।',
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-bold text-white">
          {ver}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="R²"
          labelBn="R²"
          value={ML_V2_METRICS.R2.toFixed(4)}
          tone="from-emerald-500 to-teal-600"
          t={t}
        />
        <Metric
          icon={<Target className="h-3.5 w-3.5" />}
          label="MAE"
          labelBn="MAE"
          value={ML_V2_METRICS.MAE.toFixed(4)}
          tone="from-orange-500 to-pink-600"
          t={t}
        />
        <Metric
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="macro-F1"
          labelBn="macro-F1"
          value={ML_V2_METRICS.macro_F1.toFixed(4)}
          tone="from-sky-500 to-blue-600"
          t={t}
        />
        <Metric
          icon={<BadgeCheck className="h-3.5 w-3.5" />}
          label="balanced-acc"
          labelBn="balanced-acc"
          value={ML_V2_METRICS.balanced_accuracy.toFixed(4)}
          tone="from-violet-500 to-purple-600"
          t={t}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
        <Small label={t('Regressor', 'রিগ্রেসর')} value={regName} />
        <Small label={t('Classifier', 'ক্লাসিফায়ার')} value={clsName} />
        <Small label={t('Features', 'ফিচার')} value={String(nFeat)} />
        <Small label={t('Test rows', 'টেস্ট সারি')} value={ML_V2_METRICS.holdout_rows.toLocaleString()} />
      </div>

      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
        {t(
          'macro-F1 and balanced accuracy are reported on the candidate-level holdout split (no train/test overlap). The service NEVER re-trains in production — the artefact is loaded once.',
          'macro-F1 এবং balanced accuracy প্রার্থী-স্তরের হোল্ডআউট স্প্লিটে রিপোর্ট করা হয়েছে (ট্রেন/টেস্ট ওভারল্যাপ নেই)। প্রোডাকশনে সার্ভিস কখনো পুনরায় প্রশিক্ষণ দেয় না — আর্টিফ্যাক্ট একবার লোড হয়।',
        )}
      </p>
    </section>
  );
};


const Metric: React.FC<{
  icon: React.ReactNode;
  label: string;
  labelBn: string;
  value: string;
  tone: string;
  t: (en: string, bn: string) => string;
}> = ({ icon, label, labelBn, value, tone, t }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-3">
    <div className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${tone} text-white`}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
      {t(label, labelBn)}
    </p>
    <p className="mt-0.5 font-mono text-lg font-black text-slate-900 tabular-nums">{value}</p>
  </div>
);

const Small: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-800">{value}</p>
  </div>
);

export default ModelPerformanceCard;
