/**
 * brainFeatureBuilder — the live-DataSource layer for the AI Brain.
 *
 * Pure-side: it fetches the user's *live* Supabase state across 12 tables
 * (profiles, user_skills, skill_verifications, universal_submissions,
 * skill_verification_submissions, skill_passports, course_certificates,
 * career_roadmap_enrollment, interview_sessions, job_applications,
 * active_jobs, career_ai_reports, plus experiences for project count)
 * and assembles a `BrainInputs` object that is **byte-compatible** with
 * what `ml_profile.php::ml_build_payload()` produces on the server.
 *
 * No demo data, no hardcoded values, no fake counters. The `aiBrainScore()`
 * scorer on the client reads from this and produces the same numbers the
 * PHP `predict_profile()` engine would.
 *
 * RLS is in effect: every query is `.eq('user_id', uid)` so the user only
 * sees their own rows. Tables that are global (`active_jobs`) are filtered
 * by `is_active` only.
 */

import { supabase } from '../lib/supabase';
import {
  BrainInputs,
  mapProfessionToJob,
  mapExperienceLevel,
  mapEmploymentStatus,
  mapPreferredWorkType,
} from './aiBrain';

type AnyRow = Record<string, any>;

const TABLES_REQUIRE_USER = new Set([
  'profiles',
  'user_skills',
  'skill_verifications',
  'universal_submissions',
  'skill_verification_submissions',
  'skill_passports',
  'course_certificates',
  'career_roadmap_enrollment',
  'interview_sessions',
  'job_applications',
  'experiences',
  'career_ai_reports',
]);

/**
 * Pull a count+rows snapshot from the 11+2 tables the PHP brain reads.
 * Returns nulls on error so the caller can still render the page.
 */
export async function fetchBrainInputsRaw(userId: string) {
  const [
    profileRes,
    skillsRes,
    verifiedRes,
    submissionsRes,
    assessRowRes,
    passportsRes,
    certificatesRes,
    enrollmentsRes,
    interviewsRes,
    appsRes,
    activeJobsRes,
    experiencesRes,
    careerReportRes,
  ] = await Promise.all([
    // 1. Profile
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    // 2. User skills (with category for filtering technical/tools/soft)
    supabase
      .from('user_skills')
      .select('id, name, category')
      .eq('user_id', userId)
      .limit(200),
    // 3. Verified skill flags (matches PHP ml_read_profile_context)
    supabase
      .from('skill_verifications')
      .select('id, skill_id, created_at')
      .eq('user_id', userId)
      .limit(100),
    // 4. Universal submissions (PHP ml_read_assessments fallback variant 1)
    supabase
      .from('universal_submissions')
      .select('id, test_type, score_percentage, passed, time_taken_ratio, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
    // 4b. Backup assessments table (PHP fallback variant 2)
    supabase
      .from('universal_assessments')
      .select('id, user_id, test_type, score_percentage, time_taken_ratio, passed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
    // 5. Passports
    supabase
      .from('skill_passports')
      .select('id, status, expiry_date')
      .eq('user_id', userId)
      .limit(10),
    // 6. Course certificates
    supabase
      .from('course_certificates')
      .select('id, status')
      .eq('user_id', userId)
      .limit(50),
    // 7. Roadmap enrollments
    supabase
      .from('career_roadmap_enrollment')
      .select('id, status')
      .eq('user_id', userId)
      .limit(50),
    // 8. Interview sessions (best score for ai_interview_score)
    supabase
      .from('interview_sessions')
      .select('id, score, communication_score, technical_skill_score, soft_skill_score, status, created_at')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(50),
    // 9. Job applications
    supabase
      .from('job_applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    // 10. Active jobs (global, used for panel tile only — not scoring)
    supabase
      .from('active_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    // 11. Experiences (for project count + internship count)
    supabase
      .from('experiences')
      .select('id, role, role_title, title, position, company')
      .eq('user_id', userId)
      .limit(100),
    // 12. Career AI report (newest row — for english/technical/soft/portfolio scores)
    supabase
      .from('career_ai_reports')
      .select(
        'technical_skill_score, soft_skill_score, communication_score, ' +
        'project_quality_score, portfolio_score, job_readiness_score, ' +
        'resume_strength_score, ats_compatibility_score, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: (profileRes.data as AnyRow | null) ?? null,
    skills: (skillsRes.data as AnyRow[]) ?? [],
    verified: (verifiedRes.data as AnyRow[]) ?? [],
    submissions: (submissionsRes.data as AnyRow[]) ?? [],
    assessments: (assessRowRes.data as AnyRow[]) ?? [],
    passports: (passportsRes.data as AnyRow[]) ?? [],
    certificates: (certificatesRes.data as AnyRow[]) ?? [],
    enrollments: (enrollmentsRes.data as AnyRow[]) ?? [],
    interviews: (interviewsRes.data as AnyRow[]) ?? [],
    appsCount: appsRes.count ?? 0,
    activeJobsCount: activeJobsRes.count ?? 0,
    experiences: (experiencesRes.data as AnyRow[]) ?? [],
    careerReport: (careerReportRes.data as AnyRow | null) ?? null,
  };
}

/**
 * Build the `BrainInputs` shape the in-browser `aiBrainScore()` consumes.
 *
 * Mirrors `ml_profile.php::ml_build_payload()` line-for-line:
 *   - Counts certifications from `user_skills WHERE category='certification'`
 *   - Counts projects + internships from `experiences`
 *   - Filters skills by `category IN ('technical','tools','soft')`
 *   - Maps profession → job_category via PROFESSION_JOB_MAP
 *   - Maps experience_years → experience_level
 *   - Maps profession + current_position → employment_status
 *   - Pulls exam scores from `career_ai_reports` (and `interview_sessions.best.score`)
 *   - All GitHub/Portfolio/LinkedIn flags come from `profiles.*_url`
 */
export async function buildBrainInputs(userId: string): Promise<BrainInputs> {
  const raw = await fetchBrainInputsRaw(userId);
  const p = raw.profile ?? {};

  // ── Profession + job category
  const profession = String(p.profession ?? p.current_position ?? '').trim();
  const jobCategory = mapProfessionToJob(profession);

  // ── Project & internship counts (PHP uses experiences table)
  const numProjects = raw.experiences.length;
  const numInternships = raw.experiences.filter((e) => {
    const role = String(e.role_title ?? e.role ?? e.title ?? e.position ?? '').toLowerCase();
    return /intern/.test(role);
  }).length;

  // ── Certifications (PHP filters user_skills by category='certification')
  const numCertifications = raw.skills.filter(
    (s) => String(s.category ?? 'technical') === 'certification',
  ).length;

  // ── Experience years + derived level
  const experienceYears = clampInt(p.experience_years ?? 0, 0, 50, 0);
  const experienceLevel = mapExperienceLevel(experienceYears);

  // ── Employment status + preferred work type
  const employmentStatus = mapEmploymentStatus(profession, String(p.current_position ?? ''));
  const preferredWorkType = mapPreferredWorkType(profession);

  // ── Verified skill set
  const verifiedMap: Record<string, boolean> = {};
  for (const v of raw.verified) {
    if (v.skill_id) verifiedMap[String(v.skill_id)] = true;
  }
  const nVerified = raw.verified.length;

  // ── Exam scores: career_ai_reports (newest) → interview best score
  const cr = raw.careerReport;
  const englishScore = numOrNull(cr?.communication_score);
  const technicalScore = numOrNull(cr?.technical_skill_score);
  const softSkillRubric = numOrNull(cr?.soft_skill_score);
  const skillVerificationScore = numOrNull(cr?.portfolio_score);

  // PHP picks max(interview_sessions.score) — we already ordered by score desc
  const bestInterview = raw.interviews[0];
  const aiInterviewScore = numOrNull(bestInterview?.score);

  // ── Fallback chain for english/communication if no career report
  const communicationFromInterview = numOrNull(bestInterview?.communication_score);
  const englishFinal =
    englishScore != null
      ? englishScore
      : communicationFromInterview;

  // ── Build the candidate
  const candidate: BrainInputs = {
    age: clampInt(p.age ?? 0, 0, 100, 0),
    gender: strOrEmpty(p.gender),
    preferred_city: strOrEmpty(p.division ?? p.district),
    institution: strOrEmpty(p.education_institution),
    education_level: strOrEmpty(p.education_degree),
    job_category: jobCategory,
    experience_years: experienceYears,
    experience_level: experienceLevel,
    expected_salary_bdt: clampInt(p.expected_salary ?? 0, 0, 1_000_000, 0),
    preferred_work_type: preferredWorkType,
    career_goal: strOrEmpty(p.current_position ?? profession),
    github_available: hasUrl(p.github_url) ? 1 : 0,
    portfolio_available: hasUrl(p.portfolio_url ?? p.website_url) ? 1 : 0,
    linkedin_available: hasUrl(p.linkedin_url) ? 1 : 0,
    english_score: englishFinal,
    technical_score: technicalScore,
    soft_skill_score: softSkillRubric,
    ai_interview_score: aiInterviewScore,
    skill_verification_score: skillVerificationScore,
    num_certifications: numCertifications,
    num_projects: numProjects,
    num_internships: numInternships,
    employment_status: employmentStatus,
  };

  // ── Skills for ML (PHP filters category ∈ technical/tools/soft)
  const skillsForMl: BrainInputs['skills'] = [];
  for (const s of raw.skills) {
    const cat = String(s.category ?? 'technical');
    if (!['technical', 'tools', 'soft'].includes(cat)) continue;
    const name = String(s.name ?? '').trim();
    if (!name) continue;
    const sid = String(s.id ?? '');
    skillsForMl.push({
      skill_name: name,
      proficiency_level: 3, // PHP hardcodes 3
      is_verified: nVerified > 0 && !!verifiedMap[sid],
      months_using_skill: 12,
    });
  }

  // ── Assessments: prefer universal_submissions (already has passed+score_percentage),
  //    fall back to universal_assessments if empty
  const assessmentRows = raw.submissions.length > 0 ? raw.submissions : raw.assessments;
  const assessmentsForMl: BrainInputs['assessments'] = [];
  for (const a of assessmentRows) {
    const sp = Number(a.score_percentage ?? a.score ?? 0);
    if (!Number.isFinite(sp) || sp <= 0) continue;
    const tr = Number(a.time_taken_ratio ?? 1);
    const passed = Boolean(a.passed) || sp >= 60;
    assessmentsForMl.push({
      test_type: String(a.test_type ?? 'Aptitude_Logic'),
      score_percentage: clampRange(sp, 0, 100, 0),
      time_taken_ratio: clampRange(tr, 0.1, 2, 1),
      passed,
    });
  }

  return {
    ...candidate,
    skills: skillsForMl,
    assessments: assessmentsForMl,
  };
}

/**
 * Convenience: aggregate signal counts for the ML Brain Sources panel (telemetry).
 * Pulled from the same raw snapshot so the panel and the brain never disagree.
 */
export function summarizeBrainSignals(raw: Awaited<ReturnType<typeof fetchBrainInputsRaw>>) {
  return {
    skills: raw.skills.length,
    verifiedSkills: raw.verified.length,
    exams: raw.submissions.length + raw.assessments.length,
    passedExams:
      raw.submissions.filter((s) => Boolean(s.passed) || Number(s.score_percentage ?? 0) >= 60)
        .length +
      raw.assessments.filter((s) => Boolean(s.passed) || Number(s.score_percentage ?? s.score ?? 0) >= 60)
        .length,
    passports: raw.passports.length,
    activePassports: raw.passports.filter((p) => String(p.status) === 'active').length,
    certificates: raw.certificates.length,
    enrollments: raw.enrollments.length,
    activeEnrollments: raw.enrollments.filter((e) => String(e.status) === 'active').length,
    interviewSessions: raw.interviews.length,
    avgInterviewScore:
      raw.interviews.length > 0
        ? raw.interviews
            .map((i) => Number(i.score ?? 0))
            .filter((n) => Number.isFinite(n) && n > 0)
            .reduce((a, b) => a + b, 0) /
          Math.max(
            1,
            raw.interviews.filter((i) => Number(i.score ?? 0) > 0).length,
          )
        : null,
    jobsApplied: raw.appsCount,
    jobsActive: raw.activeJobsCount,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers (kept local to avoid bloating aiBrain.ts)
// ──────────────────────────────────────────────────────────────────────────────

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function hasUrl(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return s.length > 4 && /^https?:\/\//i.test(s);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampRange(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

// Re-export so TypeScript treats the set as "used" (consumed by future tests).
export const _TABLES_REQUIRE_USER = TABLES_REQUIRE_USER;
