/**
 * GapCardsPanel — actionable coverage / gap cards.
 *
 * Each card shows a real count from the v2 mapper plus a single Bangla
 * "what to do next" CTA. Empty counts get a warning tint and a primary
 * CTA. All cards are clickable links to existing routes (no guessing).
 *
 * Only renders when counts are provided — otherwise the section is
 * hidden (no fake zeros).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Award, BookOpen, FileCheck2, GraduationCap,
  Mic, ShieldCheck, Target,
} from 'lucide-react';
import type { V2CoverageCounts } from '../../services/v2Prediction';

interface GapCard {
  key: keyof V2CoverageCounts;
  label_en: string;
  label_bn: string;
  icon: 'skills' | 'verify' | 'assessment' | 'interview' | 'passport' | 'certificate' | 'roadmap';
  href: string;
  cta_en: string;
  cta_bn: string;
  empty_en: string;
  empty_bn: string;
}

const GAP_CARDS: GapCard[] = [
  {
    key: 'skills',
    label_en: 'Skills',
    label_bn: 'দক্ষতা',
    icon: 'skills',
    href: '/dashboard/profile?tab=skills',
    cta_en: 'Add more skills',
    cta_bn: 'আরও দক্ষতা যোগ করুন',
    empty_en: 'Skills give the model direct signal about what you can do.',
    empty_bn: 'দক্ষতা যোগ করলে মডেল আপনার সক্ষমতা সম্পর্কে সরাসরি সিদ্ধান্ত নিতে পারে।',
  },
  {
    key: 'verified',
    label_en: 'Verified Skills',
    label_bn: 'যাচাইকৃত দক্ষতা',
    icon: 'verify',
    href: '/dashboard/verify',
    cta_en: 'Verify a skill',
    cta_bn: 'একটি দক্ষতা যাচাই করুন',
    empty_en: 'Verified skills carry ~3× the weight of unverified ones.',
    empty_bn: 'যাচাইকৃত দক্ষতা অযাচাইকৃত দক্ষতার তুলনায় প্রায় ৩ গুণ বেশি ওজন বহন করে।',
  },
  {
    key: 'assessments',
    label_en: 'Assessments',
    label_bn: 'মূল্যায়ন',
    icon: 'assessment',
    href: '/dashboard/verify',
    cta_en: 'Take an assessment',
    cta_bn: 'একটি মূল্যায়ন দিন',
    empty_en: 'Coding assessments give the model objective behavioural signal.',
    empty_bn: 'কোডিং মূল্যায়ন মডেলকে বস্তুনিষ্ঠ আচরণগত সংকেত দেয়।',
  },
  {
    key: 'interviews_completed',
    label_en: 'AI Interview',
    label_bn: 'AI ইন্টারভিউ',
    icon: 'interview',
    href: '/dashboard/mentor',
    cta_en: 'Take an AI interview',
    cta_bn: 'AI ইন্টারভিউ নিন',
    empty_en: 'AI interviews feed communication + soft-skill signals.',
    empty_bn: 'AI ইন্টারভিউ যোগাযোগ ও সফট-স্কিল সংকেত যোগ করে।',
  },
  {
    key: 'passport_active',
    label_en: 'Skill Passport',
    label_bn: 'স্কিল পাসপোর্ট',
    icon: 'passport',
    href: '/dashboard/passport',
    cta_en: 'Build a passport',
    cta_bn: 'পাসপোর্ট তৈরি করুন',
    empty_en: 'An active passport lets employers verify your skills in one click.',
    empty_bn: 'সক্রিয় পাসপোর্ট নিয়োগকর্তাদের এক ক্লিকে আপনার দক্ষতা যাচাই করতে দেয়।',
  },
  {
    key: 'certificates',
    label_en: 'Certificates',
    label_bn: 'সার্টিফিকেট',
    icon: 'certificate',
    href: '/dashboard/passport?tab=certificates',
    cta_en: 'Complete a course',
    cta_bn: 'একটি কোর্স সম্পন্ন করুন',
    empty_en: 'Approved certificates strengthen the certification weight.',
    empty_bn: 'অনুমোদিত সার্টিফিকেট সার্টিফিকেশন ওজন বাড়ায়।',
  },
  {
    key: 'roadmap_done',
    label_en: 'Roadmap',
    label_bn: 'রোডম্যাপ',
    icon: 'roadmap',
    href: '/dashboard/roadmap',
    cta_en: 'Start a roadmap',
    cta_bn: 'রোডম্যাপ শুরু করুন',
    empty_en: 'Roadmap progress lifts projects-experience and readiness.',
    empty_bn: 'রোডম্যাপ অগ্রগতি প্রজেক্ট অভিজ্ঞতা ও প্রস্তুতি বাড়ায়।',
  },
];


function iconForRoute(name: GapCard['icon']): React.ReactNode {
  switch (name) {
    case 'skills': return <Target className="h-4 w-4" />;
    case 'verify': return <Award className="h-4 w-4" />;
    case 'assessment': return <FileCheck2 className="h-4 w-4" />;
    case 'interview': return <Mic className="h-4 w-4" />;
    case 'passport': return <ShieldCheck className="h-4 w-4" />;
    case 'certificate': return <GraduationCap className="h-4 w-4" />;
    case 'roadmap': return <BookOpen className="h-4 w-4" />;
  }
}


export const GapCardsPanel: React.FC<{
  counts: V2CoverageCounts | null;
  bn: boolean;
}> = ({ counts, bn }) => {
  if (!counts) return null;

  return (
    <section
      aria-labelledby="gap-cards-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#E31B23]" />
        <h2 id="gap-cards-heading" className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {bn ? 'আপনার গ্যাপ — কোথায় পূরণ করবেন' : 'Your gaps — where to improve'}
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAP_CARDS.map((card) => {
          const v = counts[card.key] ?? 0;
          const isEmpty = v === 0;
          return (
            <Link
              key={card.key}
              to={card.href}
              className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                isEmpty
                  ? 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isEmpty ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {iconForRoute(card.icon)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-bold text-slate-900">
                    {bn ? card.label_bn : card.label_en}
                  </p>
                  <p className={`font-mono text-base font-bold tabular-nums ${isEmpty ? 'text-amber-700' : 'text-slate-900'}`}>
                    {v}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                  {isEmpty
                    ? (bn ? card.empty_bn : card.empty_en)
                    : (bn ? card.cta_bn : card.cta_en)}
                </p>
                <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${isEmpty ? 'text-amber-700' : 'text-slate-700'}`}>
                  {isEmpty ? (bn ? card.cta_bn : card.cta_en) : (bn ? 'দেখুন' : 'View')}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default GapCardsPanel;
