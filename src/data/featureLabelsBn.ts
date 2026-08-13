/**
 * featureLabelsBn — Bangla translations for the v2 model's top features.
 *
 * The actual feature importance numbers live on the backend (sent from
 * `v2_worker.py` via `top_features`). This file only provides the
 * human-readable Bangla label + a short description for each feature
 * the model uses.
 *
 * Keep this file in sync with `training_report.json:top_features`.
 * Anything missing falls back to the raw feature name.
 */

export interface FeatureLabel {
  en: string;
  bn: string;
  desc_bn: string;
}

const FEATURE_LABEL_MAP: Record<string, FeatureLabel> = {
  technical_score: {
    en: 'Technical score',
    bn: 'টেকনিক্যাল স্কোর',
    desc_bn: 'আপনার কোডিং সাবমিশন ও টেকনিক্যাল ইন্টার�িউ থেকে প্রাপ্ত গড় স্কোর।',
  },
  skill_verification_score: {
    en: 'Skill verification strength',
    bn: 'দক্ষতা যাচাইকরণ শক্তি',
    desc_bn: 'যাচাইকৃত দক্ষতার সং�্যা আপনার মোট দক্ষতার তুলনায়।',
  },
  communication_index: {
    en: 'Communication index',
    bn: 'যোগাযোগ সূচক',
    desc_bn: 'AI �ন্টারভিউতে আপনার যোগাযোগ দক্ষতার মূল্যায়ন।',
  },
  ai_interview_score: {
    en: 'AI interview score',
    bn: 'AI ইন্টারভিউ স্কোর',
    desc_bn: 'সম্পন্ন AI ইন্টারভিউ সেশনগুলোর গড় স্কোর।',
  },
  experience_weight: {
    en: 'Experience weight',
    bn: 'অভিজ্ঞতার ওজন',
    desc_bn: 'আপনার কাজের অভি�্ঞতার বছর ও প্রাসঙ্গিকতার ওজন।',
  },
  career_readiness_index: {
    en: 'Career readiness index',
    bn: 'ক্যারিয়ার প্রস্তুতি সূ�ক',
    desc_bn: 'প্রোফাইল, রোডম্যাপ ও সার্টিফিকেটের ভিত্তিতে ক্যারিয়ার প্রস্তুতি।',
  },
  experience_years: {
    en: 'Years of experience',
    bn: 'অভিজ্ঞতার বছর',
    desc_bn: 'আপনার মোট কাজের অভিজ্ঞতা (বছরে)।',
  },
  num_certifications: {
    en: 'Number of certifications',
    bn: 'সার্টি�িকেট সংখ্যা',
    desc_bn: 'অনুমোদিত কোর্স সার্টিফিকেটের মোট সংখ্যা।',
  },
  num_projects: {
    en: 'Number of projects',
    bn: 'প্রজেক্ট সংখ্যা',
    desc_bn: 'সম্পন্ন রোডম্যাপ স্�েপ থেকে প্রাপ্ত আনুমানিক প্রজেক্ট সংখ্যা।',
  },
  certification_weight: {
    en: 'Certification weight',
    bn: 'সার্টিফিকেট ওজন',
    desc_bn: 'সার্টিফিকেটের সংখ্যা ও স্ট্যাটাসের সম্মিলিত ওজন।',
  },
  num_skills: {
    en: 'Number of skills',
    bn: 'দক্ষতা সংখ্যা',
    desc_bn: 'আপনার প্রোফাইলে যোগ করা দক্ষতার মোট সংখ্যা।',
  },
  num_verified: {
    en: 'Number of verified skills',
    bn: 'যাচাইকৃত দক্ষতা সংখ্যা',
    desc_bn: 'লে�েল ≥ ৩ দিয়ে যাচাইকৃত দক্�তার সংখ্যা।',
  },
  english_score: {
    en: 'English score (proxy)',
    bn: 'ইংরেজি স্কোর (আনুমানিক)',
    desc_bn: 'কোডি� সাবমিশনের স্কোর থেকে প্রাপ্ত আনুমানিক ইংরেজি দক্ষতা।',
  },
  github_available: {
    en: 'GitHub profile available',
    bn: 'GitHub প্রোফাইল আছে',
    desc_bn: 'আপনার প্রোফাইলে GitHub URL যোগ করা আছে কিনা।',
  },
  portfolio_available: {
    en: 'Portfolio available',
    bn: 'পোর্টফোলিও আছে',
    desc_bn: 'আপনার প্রোফাইলে পোর্টফোলি� URL যোগ করা আছে কিনা।',
  },
  linkedin_available: {
    en: 'LinkedIn available',
    bn: 'LinkedIn আছে',
    desc_bn: 'আপনার প্রোফাইলে LinkedIn URL যোগ করা আছে কিনা।',
  },
  soft_skill_score: {
    en: 'Soft skill score',
    bn: 'সফট স্কিল স্কোর',
    desc_bn: 'আপনার স�ট স্কিলের সামগ্রিক মূল্যায়ন।',
  },
  job_category: {
    en: 'Job category',
    bn: '�াকরির ক্যাটাগরি',
    desc_bn: 'সক্রিয় রোডম্যাপের টাইটেল — আপনার টার্গেট ক্যারিয়ার ক্ষে�্র।',
  },
  education_level: {
    en: 'Education level',
    bn: 'শিক্ষাগত যোগ্যতা',
    desc_bn: '�পনার সর্বোচ্চ শিক্ষাগত �িগ্রি।',
  },
  institution: {
    en: 'Institution',
    bn: 'শিক্ষা প্রতিষ্ঠান',
    desc_bn: '�পনার শিক্ষা প্রতিষ্ঠান।',
  },
  preferred_city: {
    en: 'Preferred city',
    bn: 'পছন্দের শহর',
    desc_bn: 'আপনি যেখানে কাজ করতে চান সেই শহর।',
  },
  career_goal: {
    en: 'Career goal',
    bn: 'ক্যারিয়ার �ক্ষ্য',
    desc_bn: 'আপনার ঘোষিত ক্যারিয়ার লক্ষ্য।',
  },
  employment_status: {
    en: 'Employment status',
    bn: 'কর্মসংস্থানের অবস্থা',
    desc_bn: 'আপনি বর্তমানে ছাত্র না চাকরিজীবী।',
  },
  expected_salary_bdt: {
    en: 'Expected salary (BDT)',
    bn: 'প্রত্যাশিত বেতন (BDT)',
    desc_bn: 'আপনার প্রত্যাশিত মাসিক বেতন।',
  },
  age: {
    en: 'Age',
    bn: 'বয়স',
    desc_bn: 'জন্ম তারিখ থেকে গণনাকৃত বয়স।',
  },
  gender: {
    en: 'Gender',
    bn: 'লিঙ্গ',
    desc_bn: 'আপনার প্রোফাইলে �ল্লেখিত লিঙ্গ।',
  },
  num_internships: {
    en: 'Number of internships',
    bn: 'ইন্টার্�শিপ সংখ্যা',
    desc_bn: 'সম্পন্ন ইন্টার্নশিপের সংখ্যা।',
  },
  num_passive_signals: {
    en: 'Passive signals count',
    bn: 'প্যাসিভ সংকেত সংখ্যা',
    desc_bn: 'সামগ্রিক প্যাসিভ সিগন্যালের সংখ্যা।',
  },
  rare_skill_premium: {
    en: 'Rare skill premium',
    bn: 'বিরল দক্ষতা প্রি�িয়াম',
    desc_bn: 'বাজারে কম দেখা যায় এমন দক্ষতার জন্য বোনাস।',
  },
  city_tier: {
    en: 'City tier',
    bn: 'সিটি টায়ার',
    desc_bn: 'আপনার শহরের �ায়ার (মেট্রো / মেজর / অন্যান্য)।',
  },
  bdjobs_demand: {
    en: 'BDJobs demand index',
    bn: 'BDJobs চাহিদা সূচক',
    desc_bn: 'আপনার টার্গেট ক্যারিয়ারে বর্তমান বিডজবস চাহিদা।',
  },
};


export function featureLabelBn(name: string): FeatureLabel {
  return FEATURE_LABEL_MAP[name] || {
    en: name,
    bn: name,
    desc_bn: 'মডেল দ্বারা ব্যবহৃত ফিচার।',
  };
}


export function featureValueForBundle(
  name: string,
  bundle: { profile: { candidate: Record<string, unknown>; skills?: unknown[]; assessments?: unknown[] } } | null,
  counts: Record<string, number> | null,
): string {
  if (!bundle) return '—';
  const candidate = bundle.profile.candidate || {};
  if (name in candidate) {
    const v = candidate[name];
    if (v === null || v === undefined) return 'ডেটা নেই';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v || 'ডেটা নেই';
    return String(v);
  }
  if (counts && name in counts) {
    const n = counts[name];
    return typeof n === 'number' ? String(n) : '�েটা নেই';
  }

  if (name === 'num_skills' && counts) return String(counts.skills ?? 0);
  if (name === 'num_verified' && counts) return String(counts.verified ?? 0);
  if (name === 'num_passive_signals' && counts) {
    return String(
      (counts.skills ?? 0) + (counts.assessments ?? 0) + (counts.interviews_completed ?? 0) +
      (counts.passport_active ?? 0) + (counts.certificates ?? 0) + (counts.roadmap_done ?? 0),
    );
  }
  if (name === 'communication_index' && counts) {
    const completed = counts.interviews_completed ?? 0;
    return completed > 0 ? `${completed} ইন্টারভিউ` : 'ডেটা নেই';
  }

  if (Array.isArray(bundle.profile.skills)) {
    if (name === 'num_skills') return String(bundle.profile.skills.length);
  }
  if (Array.isArray(bundle.profile.assessments)) {
    if (name === 'english_score' && bundle.profile.assessments.length > 0) {
      const avg =
        bundle.profile.assessments
          .map((a: any) => Number(a?.score_percentage))
          .filter((n) => Number.isFinite(n))
          .reduce((a: number, b: number) => a + b, 0) /
        Math.max(1, bundle.profile.assessments.length);
      return avg.toFixed(1);
    }
  }

  return 'ডেটা নেই';
}
