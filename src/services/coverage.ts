/**
 * coverage — live counts of every SkillProof signal that feeds the v2 model.
 *
 * The 7 source tables are queried directly from Supabase. Schema quirk:
 * most tables actually store `auth.uid()` (= `profiles.user_id`) in their
 * `user_id` column even though the FK constraint declares
 * `REFERENCES profiles(id)`. A few tables (skill_passports,
 * career_roadmap_progress) consistently store `profiles.id`. To match
 * both layouts we resolve `profileId` first and build a 2-element filter
 * `[authUid, profileId]` that matches either value.
 *
 * The ML v2 mapper (`server/lib/v2ProfileMapper.ts`) returns equivalent
 * counts inside the `/api/ai-center/v2/predict-v2` response. This helper
 * exists for the AI page to show "where the brain gets its data" BEFORE
 * the first prediction is generated, and to navigate to the underlying
 * pages via existing routes.
 */

import { supabase } from '../lib/supabase';

export interface CoverageCounts {
  skills: number;
  verified: number;
  assessments: number;
  interviews_completed: number;
  passport_active: number;
  certificates: number;
  roadmap_done: number;
}

export const EMPTY_COVERAGE: CoverageCounts = {
  skills: 0,
  verified: 0,
  assessments: 0,
  interviews_completed: 0,
  passport_active: 0,
  certificates: 0,
  roadmap_done: 0,
};


export interface GetCoverageOpts {
  forceRefresh?: boolean;
}


/**
 * Resolve the user's two possible foreign-key layouts so every downstream
 * table query matches both `profiles.user_id` (= auth.uid) AND
 * `profiles.id`. Returns the array of user_ids to filter on.
 */
async function resolveUserIdFilter(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  const profileId = (data as { id?: string } | null)?.id ?? null;
  return profileId && profileId !== userId ? [userId, profileId] : [userId];
}


export async function getCoverageCounts(
  userId: string | null | undefined,
  opts: GetCoverageOpts = {},
): Promise<CoverageCounts> {
  if (!userId) return EMPTY_COVERAGE;
  void opts;

  const userIds = await resolveUserIdFilter(userId);

  const [
    skillsRes,
    verifsRes,
    codingRes,
    interviewRes,
    passportRes,
    certRes,
    progressRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from('user_skills')
      .select('id', { count: 'exact', head: true })
      .in('user_id', userIds),
    supabase
      .from('skill_verifications')
      .select('skill_id, level', { count: 'exact' })
      .in('user_id', userIds)
      .limit(500),
    supabase
      .from('coding_submissions')
      .select('id', { count: 'exact' })
      .in('user_id', userIds)
      .limit(500),
    supabase
      .from('interview_sessions')
      .select('id, status', { count: 'exact' })
      .in('user_id', userIds)
      .limit(200),
    supabase
      .from('skill_passports')
      .select('id', { count: 'exact' })
      .in('user_id', userIds)
      .eq('status', 'active'),
    supabase
      .from('course_certificates')
      .select('id, status, profile_id, user_id')
      .in('status', ['approved', 'active', 'completed'])
      .limit(500),
    supabase
      .from('career_roadmap_progress')
      .select('id, is_completed')
      .in('user_id', userIds)
      .limit(2000),
    supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const skills = skillsRes.count ?? 0;
  const verifs = (verifsRes.data ?? []) as Array<{ skill_id: string | null; level: number | null }>;
  // A "verified" skill is one with a verification row at level ≥ 3 — same
  // rule the server-side mapper uses to gate the v2 cold-start.
  const verifiedCount = verifs.filter((v) => Boolean(v.skill_id) && (v.level ?? 0) >= 3).length;

  const codingSubs = (codingRes.data ?? []) as Array<unknown>;
  const assessments = codingSubs.length;

  const interviewSessions = (interviewRes.data ?? []) as Array<{ status: string | null }>;
  const interviewsCompleted = interviewSessions.filter((s) => s.status === 'completed').length;

  const passportActive = passportRes.count ?? 0;

  const profileId = (profileRes.data as { id?: string } | null)?.id ?? null;
  const allCerts = (certRes.data ?? []) as Array<{ profile_id: string | null; user_id: string | null }>;
  // A certificate belongs to this user if EITHER its `profile_id` matches
  // `profiles.id` OR its `user_id` matches `auth.uid`. Some certs in the
  // wild only have one of the two populated.
  const certificates = profileId
    ? allCerts.filter((c) =>
      c.profile_id === profileId || c.user_id === userId
    ).length
    : 0;

  const progress = (progressRes.data ?? []) as Array<{ is_completed: boolean | null }>;
  const roadmapDone = progress.filter((p) => p.is_completed === true).length;

  return {
    skills,
    verified: verifiedCount,
    assessments,
    interviews_completed: interviewsCompleted,
    passport_active: passportActive,
    certificates,
    roadmap_done: roadmapDone,
  };
}


export interface CoverageRoute {
  key: keyof CoverageCounts;
  label_en: string;
  label_bn: string;
  href: string;
  icon: 'skills' | 'verify' | 'assessment' | 'interview' | 'passport' | 'certificate' | 'roadmap';
  desc_en: string;
  desc_bn: string;
}

export const COVERAGE_ROUTES: CoverageRoute[] = [
  {
    key: 'skills',
    label_en: 'Skills',
    label_bn: 'দক্ষতা',
    href: '/dashboard/profile?tab=skills',
    icon: 'skills',
    desc_en: 'Skills on your profile',
    desc_bn: 'প্রোফাইলে যোগ করা দক্ষতা',
  },
  {
    key: 'assessments',
    label_en: 'Assessments',
    label_bn: 'মূল্যায়ন',
    href: '/dashboard/verify',
    icon: 'assessment',
    desc_en: 'Coding submissions',
    desc_bn: 'কোডিং সাবমিশন',
  },
  {
    key: 'verified',
    label_en: 'Verified Skills',
    label_bn: 'যাচাইকৃত দক্ষতা',
    href: '/dashboard/verify',
    icon: 'verify',
    desc_en: 'Skill verifications (level ≥ 3)',
    desc_bn: 'দক্ষতা যাচাইকরণ (লেভেল ≥ ৩)',
  },
  {
    key: 'passport_active',
    label_en: 'Passport',
    label_bn: 'পাসপোর্ট',
    href: '/dashboard/passport',
    icon: 'passport',
    desc_en: 'Active skill passports',
    desc_bn: 'সক্রিয় স্কিল পাসপোর্ট',
  },
  {
    key: 'certificates',
    label_en: 'Certificates',
    label_bn: 'সার্টিফিকেট',
    href: '/dashboard/passport?tab=certificates',
    icon: 'certificate',
    desc_en: 'Approved course certificates',
    desc_bn: 'অনুমোদিত কোর্স সার্টিফিকেট',
  },
  {
    key: 'roadmap_done',
    label_en: 'Roadmap',
    label_bn: 'রোডম্যাপ',
    href: '/dashboard/roadmap',
    icon: 'roadmap',
    desc_en: 'Completed roadmap steps',
    desc_bn: 'সম্পন্ন রোডম্যাপ স্টেপ',
  },
  {
    key: 'interviews_completed',
    label_en: 'AI Interview',
    label_bn: 'AI ইন্টারভিউ',
    href: '/dashboard/mentor',
    icon: 'interview',
    desc_en: 'Completed AI interviews',
    desc_bn: 'সম্পন্ন AI ইন্টারভিউ',
  },
];
