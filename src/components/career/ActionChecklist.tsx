/**
 * ActionChecklist — what the user can do to improve their score.
 *
 * Actions are derived from the coverage *gaps* (zero counts). We never
 * promise a specific delta — the trained model has no per-feature
 * counterfactual that maps to "complete X → +Y points". The checklist
 * lists current gaps with a single CTA per item.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ListChecks } from 'lucide-react';
import type { V2CoverageCounts } from '../../services/v2Prediction';


interface ActionItem {
  key: string;
  en: string;
  bn: string;
  href: string;
  done: boolean;
}

export const ActionChecklist: React.FC<{
  counts: V2CoverageCounts | null;
  bn: boolean;
}> = ({ counts, bn }) => {
  if (!counts) return null;

  const items: ActionItem[] = [
    {
      key: 'skills',
      en: 'Add skills to your profile',
      bn: 'প্রোফাইলে দক্ষতা যোগ করুন',
      href: '/dashboard/profile?tab=skills',
      done: (counts.skills ?? 0) > 0,
    },
    {
      key: 'verified',
      en: 'Verify at least one skill',
      bn: 'কমপক্ষে একটি দক্ষতা যাচাই করুন',
      href: '/dashboard/verify',
      done: (counts.verified ?? 0) > 0,
    },
    {
      key: 'assessments',
      en: 'Complete a coding assessment',
      bn: 'একটি কোডিং মূল্যায়ন সম্পন্ন করুন',
      href: '/dashboard/verify',
      done: (counts.assessments ?? 0) > 0,
    },
    {
      key: 'interviews_completed',
      en: 'Take an AI interview',
      bn: 'একটি AI ইন্টারভিউ নিন',
      href: '/dashboard/mentor',
      done: (counts.interviews_completed ?? 0) > 0,
    },
    {
      key: 'passport_active',
      en: 'Build a Skill Passport',
      bn: 'একটি স্কিল পাসপোর্ট তৈরি করুন',
      href: '/dashboard/passport',
      done: (counts.passport_active ?? 0) > 0,
    },
    {
      key: 'certificates',
      en: 'Earn a course certificate',
      bn: 'একটি কোর্স সার্টিফিকেট অর্জন করুন',
      href: '/dashboard/passport?tab=certificates',
      done: (counts.certificates ?? 0) > 0,
    },
    {
      key: 'roadmap_done',
      en: 'Start a career roadmap',
      bn: 'একটি ক্যারিয়ার রোডম্যাপ শুরু করুন',
      href: '/dashboard/roadmap',
      done: (counts.roadmap_done ?? 0) > 0,
    },
  ];

  const remaining = items.filter((it) => !it.done);
  const done = items.filter((it) => it.done);

  return (
    <section
      aria-labelledby="action-checklist-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-[#E31B23]" />
        <h2 id="action-checklist-heading" className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {bn ? 'আপনার স্কোর উন্নত করতে' : 'To improve your score'}
        </h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
          {remaining.length} / {items.length} {bn ? 'বাকি' : 'left'}
        </span>
      </header>

      {remaining.length === 0 ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] leading-relaxed text-emerald-900">
          {bn
            ? 'আপনি সব গুরুত্বপূর্ণ সংকেত পূরণ করেছেন। নতুন skill / assessment / interview যোগ করলে prediction আপডেট হবে।'
            : 'You have filled every key signal. New skills, assessments or interviews will keep your prediction fresh.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {remaining.map((it) => (
            <li key={it.key}>
              <Link
                to={it.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-current opacity-0" />
                </span>
                <span className="flex-1 text-[13px] font-semibold text-slate-900">
                  {bn ? it.bn : it.en}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">
            {bn ? `সম্পন্ন (${done.length})` : `Completed (${done.length})`}
          </summary>
          <ul className="mt-2 space-y-1">
            {done.map((it) => (
              <li key={`done-${it.key}`} className="flex items-center gap-2 text-[12px] text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {bn ? it.bn : it.en}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export default ActionChecklist;
