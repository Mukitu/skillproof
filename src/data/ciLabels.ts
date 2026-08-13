/**
 * ciLabels — bilingual (Bangla + English) label constants for the
 * Career Intelligence sections. Each value is a 2-tuple: [English, Bangla].
 *
 * Consumed by `src/components/career/CISections.tsx`. Use `pick(lang, tuple)`
 * to choose the active string. `bn` is the user's current language (true ⇒
 * Bangla, false ⇒ English).
 */

export type BilingualPair = readonly [string, string];

export function pick(bn: boolean, pair: BilingualPair): string {
  return bn ? pair[1] : pair[0];
}

export const CI_LABELS = {
  heroTitle: ['Your Career Intelligence', 'আপনার ক্যারিয়ার ইন্টেলিজেন্স'],
  overallReadiness: ['Overall Career Readiness', 'সামগ্রিক ক্যারিয়ার প্রস্তুতি'],
  employability: ['Employability', 'কর্মযোগ্যতা'],
  hiringReadiness: ['Hiring Readiness', 'নিয়োগের প্রস্তুতি'],
  topStrengths: ['Top Strengths', 'আপনার শক্তিশালী দিকগুলো'],
  skillGaps: ['Skill Gaps', 'যেসব দক্ষতায় ঘাটতি আছে'],
  careerMatches: ['Career Matches', 'আপনার জন্য উপযুক্ত ক্যারিয়ার'],
  marketReadiness: ['Job Market Readiness', 'বাংলাদেশ জব মার্কেট প্রস্তুতি'],
  improvementPlan: ['90-Day Improvement Plan', '৯০ দিনের উন্নয়ন পরিকল্পনা'],
  aiSummary: ['AI Career Summary', 'AI ক্যারিয়ার সারাংশ'],
  careerSummary: ['Career summary', 'ক্যারিয়ার সারাংশ'],
  day30: ['Next 30 days', 'পরবর্তী ৩০ দিন'],
  day60: ['Next 60 days', 'পরবর্তী ৬০ দিন'],
  day90: ['Next 90 days', 'পরবর্তী ৯০ দিন'],
  missingSkills: ['Missing skills', 'অনুপস্থিত দক্ষতা'],
  nextStep: ['Next step', 'পরবর্তী পদক্ষেপ'],
  fallbackNotice: [
    'AI explanation temporarily unavailable — showing computed analysis.',
    'AI ব্যাখ্যা সাময়িকভাবে অনুপলব্ধ — গণনাকৃত বিশ্লেষণ দেখানো হচ্ছে।',
  ],
  inlineError: [
    'Unable to load your Career Intelligence right now. Tap retry.',
    'আপনার ক্যারিয়ার ইন্টেলিজেন্স এই মুহূর্তে লোড করা যাচ্ছে না। আবার চেষ্টা করুন।',
  ],
  refresh: ['Refresh', 'রিফ্রেশ'],
  coldStartHint: [
    'Add skills or take an assessment to unlock a personalised analysis.',
    'ব্যক্তিগত বিশ্লেষণ পেতে দক্ষতা যোগ করুন বা মূল্যায়ন নিন।',
  ],
} as const;