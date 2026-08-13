/**
 * ModelTechnicalDetails — collapsed disclosure for model internals.
 *
 * Out of the default user UX. Hosts the training-time metrics card plus
 * the regressor / classifier / model version so curious users can
 * verify the artefact, but doesn't compete with the headline scores.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { ModelPerformanceCard } from './ModelPerformanceCard';


export const ModelTechnicalDetails: React.FC<{
  language: 'en' | 'bn';
  regressor?: string;
  classifier?: string;
  modelVersion?: string;
  coldStart?: boolean;
}> = ({ language, regressor, classifier, modelVersion, coldStart }) => {
  const [open, setOpen] = useState(false);
  const bn = language === 'bn';
  const t = (en: string, bnText: string) => (bn ? bnText : en);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left text-[12px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 sm:px-6"
        aria-expanded={open}
      >
        <Cpu className="h-4 w-4 text-slate-500" />
        <span>{t('Technical details', 'প্রযুক্তিগত বিবরণ')}</span>
        <span className="ml-2 hidden text-[10px] font-normal normal-case text-slate-500 sm:inline">
          {t(
            'Holdout metrics · regressor · classifier · model version',
            'হোল্ডআউট মেট্রিক্স · রিগ্রেসর · ক্লাসিফায়ার · মডেল ভার্সন',
          )}
        </span>
        <span className="ml-auto">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5 sm:p-6">
          <ModelPerformanceCard
            language={language}
            regressor={regressor}
            classifier={classifier}
            modelVersion={modelVersion}
          />
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {t(
              'These numbers are the trained model\'s holdout-test metrics — they describe how well the model predicts employability for unseen candidates, not your personal score. Production never re-trains; the artefact is loaded once.',
              'এই সংখ্যাগুলো প্রশিক্ষিত মডেলের হোল্ডআউট-টেস্ট মেট্রিক্স — এগুলো বর্ণনা করে যে মডেলটি অদেখা প্রার্থীদের জন্য কর্মযোগ্যতা কতটা ভালোভাবে প্রেডিক্ট করে, আপনার ব্যক্তিগত স্কোর নয়। প্রোডাকশনে পুনরায় প্রশিক্ষণ হয় না; আর্টিফ্যাক্ট একবার লোড হয়।',
            )}
          </p>
          {coldStart && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              {t(
                'This prediction used the cold-start model variant (no assessment / interview signals yet). Complete an assessment or AI interview to switch to the primary model.',
                'এই প্রেডিকশনে কোল্ড-স্টার্ট মডেল ব্যবহার করা হয়েছে (এখনো কোনো মূল্যায়ন / ইন্টারভিউ সংকেত নেই)। প্রাইমারি মডেলে যেতে একটি মূল্যায়ন বা AI ইন্টারভিউ সম্পন্ন করুন।',
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ModelTechnicalDetails;