
import { supabase } from '../lib/supabase';
import { apiUrl } from '../config/api';
import { getAccessToken, getCurrentUser } from './auth';
import { listActiveJobs, listPublicJobs } from './jobs';
import { logActivity } from './activity';
import { subscribeTable } from './realtime';
import { getMyPassports } from './passports';
import { getVerifiedSkills } from './verifiedSkills';
import { listMySkillVerificationSubmissions } from './skillVerification';
import { listMyRoadmapEnrollments } from './roadmaps';
import {
  loadEducations,
  loadExperiences,
  loadSkills,
  computeProfileHash,
} from './profileReview';
import type {
  Job,
  JobMatchResult,
  JobMatchDashboard,
  JobMatchRow,
  JobMatchLabel,
  VerifiedSkill,
  CareerRoadmapEnrollment,
} from '../types/database';


async function getJobMatchUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}






function normaliseLabel(raw: any): JobMatchLabel {
  if (
    raw === 'perfect_match' ||
    raw === 'highly_recommended' ||
    raw === 'good_match' ||
    raw === 'need_more' ||
    raw === 'not_recommended'
  ) {
    return raw;
  }
  return 'not_recommended';
}

function clampScore(n: any): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function normaliseMatchRow(row: any): JobMatchResult {
  // job_source: prefer the DB column; fall back to guessing from prefix
  // (legacy rows that pre-date the migration were always 'admin').
  let jobSource: 'admin' | 'company' = 'admin';
  if (row.job_source === 'admin' || row.job_source === 'company') {
    jobSource = row.job_source;
  } else if (typeof row.job_id === 'string' && row.job_id.startsWith('company_job_')) {
    jobSource = 'company';
  }
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    job_source: jobSource,
    profile_hash: typeof row.profile_hash === 'string' ? row.profile_hash : '',
    profile_version: typeof row.profile_version === 'string' ? row.profile_version : '',
    job_version: typeof row.job_version === 'string' ? row.job_version : '',
    overall_match: clampScore(row.overall_match),
    skill_match: clampScore(row.skill_match),
    experience_match: clampScore(row.experience_match),
    education_match: clampScore(row.education_match),
    career_goal_match: clampScore(row.career_goal_match ?? 0),
    label: normaliseLabel(row.label),
    missing_skills_json: Array.isArray(row.missing_skills_json) ? row.missing_skills_json : [],
    missing_skills_required: Array.isArray(row.missing_skills_required)
      ? row.missing_skills_required
      : Array.isArray(row.missing_skills_json)
        ? row.missing_skills_json
        : [],
    matching_skills_json: Array.isArray(row.matching_skills_json)
      ? row.matching_skills_json.filter((s: unknown) => typeof s === 'string')
      : undefined,
    skill_gaps_json: Array.isArray(row.skill_gaps_json)
      ? row.skill_gaps_json
          .map((g: any) => ({
            skill: typeof g?.skill === 'string' ? g.skill : '',
            severity: g?.severity === 'low' || g?.severity === 'medium' || g?.severity === 'high'
              ? g.severity
              : undefined,
          }))
          .filter((g: { skill: string }) => g.skill.length > 0)
      : undefined,
    recommendations_json: Array.isArray(row.recommendations_json) ? row.recommendations_json : [],
    why_match: typeof row.why_match === 'string' ? row.why_match : '',
    prerequisites_text: typeof row.prerequisites_text === 'string' ? row.prerequisites_text : '',
    ai_reason: typeof row.ai_reason === 'string' ? row.ai_reason : '',
    ai_reason_bn: typeof row.ai_reason_bn === 'string' ? row.ai_reason_bn : '',
    input_snapshot: row.input_snapshot ?? {},
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}


export function tokenize(s: string): string[] {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .filter(Boolean);
}






export async function listActiveJobsWithMatches(): Promise<JobMatchRow[]> {
  const userId = await getJobMatchUserId();
  if (!userId) return [];

  // Unified public feed (admin jobs + approved-company jobs) is the
  // canonical source for the user Job Portal. Falls back to admin-only
  // `jobs` table for back-compat when the new RPC isn't deployed yet.
  let jobs: Job[] = [];
  try {
    const unified = await listPublicJobs({ limit: 200 });
    jobs = unified.rows;
  } catch {
    jobs = await listActiveJobs();
  }

  const { data: matchesData, error: matchesErr } = await supabase
    .from('job_match_results')
    .select('*')
    .eq('user_id', userId);
  if (matchesErr) {
    return jobs.map((j) => ({ job: j, match: null }));
  }
  const byId = new Map<string, JobMatchResult>();
  for (const m of (matchesData ?? []) as any[]) {
    byId.set(m.job_id, normaliseMatchRow(m));
  }
  return jobs.map((j) => ({ job: j, match: byId.get(j.id) ?? null }));
}


export async function getMatchForJob(jobId: string): Promise<JobMatchResult | null> {
  const userId = await getJobMatchUserId();
  if (!userId || !jobId) return null;
  const { data, error } = await supabase
    .from('job_match_results')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) return null;
  return data ? normaliseMatchRow(data) : null;
}


export async function getJobMatchDashboard(
  rows: Array<{ job: Job; match: JobMatchResult | null }> = [],
): Promise<JobMatchDashboard> {
  const scored = rows.filter((r): r is { job: Job; match: JobMatchResult } => !!r.match);
  const total = scored.length;
  const sum = scored.reduce((acc, r) => acc + clampScore(r.match.overall_match), 0);
  const average = total > 0 ? Math.round(sum / total) : 0;
  const sorted = [...scored].sort((a, b) => b.match.overall_match - a.match.overall_match);
  const top = sorted[0];
  const dashboard: JobMatchDashboard = {
    top_match: top
      ? {
          job_id: top.job.id,
          title: top.job.title,
          company: top.job.company_name,
          overall_match: clampScore(top.match.overall_match),
          label: normaliseLabel(top.match.label),
        }
      : null,
    average_match: average,
    jobs_ready_to_apply: scored.filter((r) => clampScore(r.match.overall_match) >= 60).length,
    need_more_skills: scored.filter((r) => {
      const s = clampScore(r.match.overall_match);
      return s >= 40 && s < 60;
    }).length,
    recommended_today: scored.filter((r) => clampScore(r.match.overall_match) >= 80).length,
    total_scored: total,
  };
  return dashboard;
}





export interface RunJobMatchingOpts {

  jobIds?: string[];

  silent?: boolean;

  force?: boolean;

  profileHash?: string;
}

export interface RunJobMatchingSummary {
  matches: JobMatchResult[];
  cached: boolean;
  aiCalls: number;
  rateLimited: boolean;
  cacheReused: number;
}

export type MatchRunStatus =
  | 'ai-evaluating'
  | 'cache-reused'
  | 'rate-limited'
  | 'idle';

export function deriveMatchStatus(
  summary: { cached: boolean; aiCalls: number; rateLimited: boolean; cacheReused: number } | null,
): MatchRunStatus {
  if (!summary) return 'idle';
  if (summary.rateLimited) return 'rate-limited';
  if (summary.cached && summary.aiCalls === 0 && summary.cacheReused > 0) return 'cache-reused';
  if (summary.aiCalls > 0) return 'ai-evaluating';
  return 'idle';
}


async function getCurrentProfileHash(): Promise<string> {
  try {
    const [profile, educations, experiences, skills] = await Promise.all([
      supabase.from('profiles').select('*').maybeSingle(),
      loadEducations().catch(() => []),
      loadExperiences().catch(() => []),
      loadSkills().catch(() => []),
    ]);
    const p = profile.data ?? null;
    return computeProfileHash({
      personal: {
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        gender: p?.gender ?? null,
        date_of_birth: p?.date_of_birth ?? null,
        address: p?.address ?? null,
        district: p?.district ?? null,
        division: p?.division ?? null,
        country: p?.country ?? null,
        bio: p?.bio ?? null,
      },
      career: {
        profession: p?.profession ?? null,
        current_position: p?.current_position ?? null,
        experience_years: p?.experience_years ?? null,
        experience_summary: p?.experience_summary ?? null,
        education_degree: p?.education_degree ?? null,
        education_institution: p?.education_institution ?? null,
        education_year: p?.education_year ?? null,
      },
      links: {
        github_url: p?.github_url ?? null,
        linkedin_url: p?.linkedin_url ?? null,
        portfolio_url: p?.portfolio_url ?? null,
        website_url: p?.website_url ?? null,
      },
      educations: educations.map((e) => ({
        degree: e.degree, institution: e.institution,
        year: e.year ?? null, cgpa: e.cgpa ?? null,
      })),
      experiences: experiences.map((x) => ({
        role: x.role, company: x.company,
        duration: x.duration ?? null, summary: x.summary ?? null,
      })),
      skills: skills.map((s) => ({ name: s.name, category: s.category })),
    });
  } catch {
    return '';
  }
}

// Exported so detail pages can compare the live profile hash against the
// one stored on the match row and detect stale scores.
export { getCurrentProfileHash };


export async function runJobMatching(
  opts: RunJobMatchingOpts = {},
): Promise<JobMatchResult[]> {
  const summary = await runJobMatchingWithSummary(opts);
  return summary.matches;
}

export async function runJobMatchingWithSummary(
  opts: RunJobMatchingOpts = {},
): Promise<RunJobMatchingSummary> {
  const token = await getAccessToken();
  const user = await getCurrentUser();
  if (!token || !user) throw new Error('Not authenticated');
  const profileHash = opts.profileHash ?? (await getCurrentProfileHash());
  const res = await fetch(apiUrl('/api/job-match/run'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jobIds: opts.jobIds ?? null,
      force: !!opts.force,
      profile_hash: profileHash,
    }),
  });

  const rawText = await res.text();
  const looksLikeHtml = /^\s*<(!doctype|html|HTML)/i.test(rawText);
  if (looksLikeHtml) {
    throw new Error(
      'Backend API URL misconfigured. The server returned an HTML page instead of JSON. ' +
      'Please verify that /api/job-match/run is reachable on the current origin.'
    );
  }
  let body: any = {};
  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      throw new Error(`Failed to parse server response as JSON. First 160 chars: ${rawText.slice(0, 160)}`);
    }
  }
  if (!res.ok) {




    const code = (body?.code as string | undefined) ?? '';
    const baseMsg = (body?.error as string | undefined)?.trim();
    const friendly =
      code === 'AI_PROFILE_INCOMPLETE'
        ? 'AI Profile পূরণ করুন — স্কিল, শিক্ষা ও অভিজ্ঞতা যোগ করলে Job Matching আরও ভালো ফলাফল দেবে।'
        : code === 'PROFILE_REQUIRED'
          ? 'AI Profile পূরণ করুন — Job Matching চালানোর আগে আপনার স্কিল, শিক্ষা ও অভিজ্ঞতা যোগ করুন।'
          : code === 'GROQ_RATE_LIMIT'
          ? 'AI সার্ভিস এই মুহূর্তে ব্যস্ত। একটু পরে আবার চেষ্টা করুন।'
          : code === 'GROQ_TIMEOUT'
            ? 'AI সার্ভিস সাড়া দিচ্ছে না (timeout)। আবার চেষ্টা করুন।'
            : code === 'GROQ_MALFORMED'
              ? 'AI থেকে সঠিক উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।'
              : baseMsg && baseMsg !== 'Internal server error'
                ? baseMsg
                : `AI job matching failed (HTTP ${res.status}). Please try again.`;
    const err: any = new Error(friendly);
    err.code = code || 'INTERNAL';
    err.status = res.status;
    err.details = body?.details;
    err.missing = body?.missing;
    err.suggestion = body?.suggestion;
    throw err;
  }
  const rows: any[] = Array.isArray(body.matches) ? body.matches : [];
  const summary: RunJobMatchingSummary = {
    matches: rows.map(normaliseMatchRow),
    cached: !!body.cached,
    aiCalls: typeof body.ai_calls === 'number' ? body.ai_calls : 0,
    rateLimited: !!body.rate_limited,
    cacheReused: typeof body.cache_reused === 'number' ? body.cache_reused : 0,
  };
  if (!opts.silent) {
    void logActivity('job_match.generated', 'AI job matching completed', {
      entityType: 'job_match_results',
      entityId: null,
      metadata: {
        scored: summary.matches.length,
        scope: opts.jobIds && opts.jobIds.length > 0 ? 'filter' : 'all_active',
        cached: summary.cached,
        ai_calls: summary.aiCalls,
        rate_limited: summary.rateLimited,
      },
    });
  }
  return summary;
}





export interface VerifiedSkillsProjection {
  verifiedSkills: string[];
  passedVerificationTitles: string[];
  completedRoadmapTitles: string[];
  activeRoadmapTitles: string[];
}


export async function getFilterProjection(): Promise<VerifiedSkillsProjection> {
  const empty: VerifiedSkillsProjection = {
    verifiedSkills: [],
    passedVerificationTitles: [],
    completedRoadmapTitles: [],
    activeRoadmapTitles: [],
  };
  try {
    const [passports, verifications, roadmaps, profileSkills] = await Promise.all([
      getMyPassports(),
      listMySkillVerificationSubmissions().catch(() => [] as any[]),
      listMyRoadmapEnrollments().catch(() => [] as CareerRoadmapEnrollment[]),
      // user_skills rows from the profile editor — these power the
      // basic "jobs matching your profile" flow even when the user
      // has no verified passports / roadmaps / assessments yet.
      loadSkills().catch(() => [] as Awaited<ReturnType<typeof loadSkills>>),
    ]);
    const verifiedSkills: string[] = [];
    for (const p of passports) {
      const list: VerifiedSkill[] = getVerifiedSkills(p) ?? [];
      for (const v of list) {
        const n = (v?.name ?? '').trim();
        if (!n) continue;
        if (!verifiedSkills.some((x) => x.toLowerCase() === n.toLowerCase())) {
          verifiedSkills.push(n);
        }
      }
    }
    // Fold profile skills into the corpus used by isJobVerifiedMatch /
    // isJobRoadmapRelevant so jobs that match the user's declared
    // skills surface immediately when they hit the portal — no need
    // to wait for a passport / verification / roadmap first.
    for (const s of profileSkills ?? []) {
      const n = (s?.name ?? '').trim();
      if (!n) continue;
      if (!verifiedSkills.some((x) => x.toLowerCase() === n.toLowerCase())) {
        verifiedSkills.push(n);
      }
    }
    const passedVerificationTitles = (verifications as any[])
      .filter((v) => v?.status === 'Passed')
      .map((v) => (v?.task_title ?? '').trim())
      .filter(Boolean);
    const completedRoadmapTitles = roadmaps
      .filter((r) => r.status === 'completed')
      .map((r) => (r.title ?? '').trim())
      .filter(Boolean);
    const activeRoadmapTitles = roadmaps
      .filter((r) => r.status === 'active')
      .map((r) => (r.title ?? '').trim())
      .filter(Boolean);
    return {
      verifiedSkills,
      passedVerificationTitles,
      completedRoadmapTitles,
      activeRoadmapTitles,
    };
  } catch {
    return empty;
  }
}


export function isJobVerifiedMatch(job: Job, projection: VerifiedSkillsProjection): boolean {
  const jobTokens = new Set<string>();
  for (const s of job.required_skills ?? []) {
    for (const t of tokenize(s)) jobTokens.add(t);
  }
  if (jobTokens.size === 0) return false;
  const candidateCorpus = [
    ...projection.verifiedSkills,
    ...projection.passedVerificationTitles,
    ...projection.completedRoadmapTitles,
    ...projection.activeRoadmapTitles,
  ];
  for (const c of candidateCorpus) {
    for (const t of tokenize(c)) {
      if (jobTokens.has(t)) return true;
    }
  }
  return false;
}


export function isJobRoadmapRelevant(job: Job, projection: VerifiedSkillsProjection): boolean {
  const jobTokens = new Set<string>();
  for (const s of job.required_skills ?? []) {
    for (const t of tokenize(s)) jobTokens.add(t);
  }
  if (jobTokens.size === 0) return false;
  for (const r of [...projection.completedRoadmapTitles, ...projection.activeRoadmapTitles]) {
    for (const t of tokenize(r)) {
      if (jobTokens.has(t)) return true;
    }
  }
  return false;
}





export interface JobMatchAutoRefreshOpts {
  
  onChange?: () => void;
  
  cooldownMs?: number;
  
  autoRun?: boolean;
  
  jobIds?: string[];
}


export function createJobMatchAutoRefresh(opts: JobMatchAutoRefreshOpts = {}): () => void {
  const cooldown = opts.cooldownMs ?? 30_000;
  let lastRun = 0;
  let cancelled = false;
  const triggers = [


    'profiles',
    'educations',
    'experiences',
    'user_skills',

    'skill_passports',
    'skill_verification_submissions',
    'career_roadmap_enrollment',
    'career_ai_reports',

    'jobs',
    'job_match_results',
    'company_jobs',
    'company_job_skills',
  ];
  const unsubs: Array<() => void> = [];

  const handle = async () => {
    if (cancelled) return;
    opts.onChange?.();
    if (!opts.autoRun) return;
    const now = Date.now();
    if (now - lastRun < cooldown) return;
    lastRun = now;
    try {
      await runJobMatching({ jobIds: opts.jobIds, silent: true });
      opts.onChange?.();
    } catch {
      
    }
  };

  for (const table of triggers) {
    const unsub = subscribeTable(table, () => { void handle(); });
    unsubs.push(unsub);
  }

  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}





export interface ProfileCompletenessForMatching {
  hasSkills: boolean;
  hasEducation: boolean;
  hasExperience: boolean;
  hasCareer: boolean;
  hasLanguages: boolean;
  hasLinks: boolean;
  
  completionPct: number;
  
  missing: string[];
  
  isIncomplete: boolean;
}


export async function getProfileCompletenessForMatching(): Promise<ProfileCompletenessForMatching> {
  const empty: ProfileCompletenessForMatching = {
    hasSkills: false, hasEducation: false, hasExperience: false,
    hasCareer: false, hasLanguages: false, hasLinks: false,
    completionPct: 0, missing: [], isIncomplete: true,
  };
  try {
    const [profileRes, educations, experiences, skills] = await Promise.all([
      supabase.from('profiles').select('*').maybeSingle(),
      loadEducations().catch(() => []),
      loadExperiences().catch(() => []),
      loadSkills().catch(() => []),
    ]);
    const p: any = profileRes.data ?? {};
    const hasSkills = skills.some((s) => (s.category || 'technical') === 'technical' || s.category === 'tools');
    const hasLanguages = skills.some((s) => s.category === 'language');
    const hasEducation = educations.length > 0 || !!(p.education_degree && String(p.education_degree).trim());
    const hasExperience = experiences.length > 0
      || !!p.experience_years
      || !!(p.current_position && String(p.current_position).trim());
    const hasCareer = !!(p.profession && String(p.profession).trim());
    const hasLinks = !!(p.github_url || p.linkedin_url || p.portfolio_url || p.website_url);

    const missing: string[] = [];
    if (!hasSkills) missing.push('skills');
    if (!hasEducation) missing.push('education');
    if (!hasExperience) missing.push('experience');
    if (!hasCareer) missing.push('career');

    const filled = [hasSkills, hasEducation, hasExperience, hasCareer, hasLanguages, hasLinks]
      .filter(Boolean).length;
    const completionPct = Math.round((filled / 6) * 100);
    return {
      hasSkills, hasEducation, hasExperience, hasCareer, hasLanguages, hasLinks,
      completionPct,
      missing,
      isIncomplete: missing.length >= 3,
    };
  } catch {
    return empty;
  }
}


export function findMissingSkillRoadmaps(
  missingSkills: string[],
  projection: VerifiedSkillsProjection,
): Array<{ title: string; matchedSkill: string; hits: number }> {
  const candidates: Array<{ title: string; status: 'active' | 'completed' }> = [
    ...projection.activeRoadmapTitles.map((t) => ({ title: t, status: 'active' as const })),
    ...projection.completedRoadmapTitles.map((t) => ({ title: t, status: 'completed' as const })),
  ];
  if (missingSkills.length === 0 || candidates.length === 0) return [];

  const out: Array<{ title: string; matchedSkill: string; hits: number; status: string }> = [];
  for (const title of new Set(candidates.map((c) => c.title))) {
    const titleTokens = new Set(tokenize(title));
    if (titleTokens.size === 0) continue;
    let bestSkill = '';
    let bestHits = 0;
    for (const skill of missingSkills) {
      const skillTokens = tokenize(skill);
      let hits = 0;
      for (const t of skillTokens) {
        if (titleTokens.has(t)) hits++;
      }
      if (hits > bestHits) {
        bestHits = hits;
        bestSkill = skill;
      }
    }
    if (bestHits > 0 && bestSkill) {
      out.push({ title, matchedSkill: bestSkill, hits: bestHits, status: 'available' });
    }
  }
  return out
    .sort((a, b) => b.hits - a.hits || a.title.localeCompare(b.title))
    .map(({ title, matchedSkill, hits }) => ({ title, matchedSkill, hits }));
}





export const MATCH_LABEL_META: Record<
  JobMatchLabel,
  { label: string; labelBn: string; color: string; chip: string; ring: string; barTone: string; stars: number }
> = {
  perfect_match: {
    label: 'Perfect Match',
    labelBn: 'পারফেক্ট ম্যাচ',
    color: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-300',
    barTone: 'from-emerald-400 to-emerald-600',
    stars: 5,
  },
  highly_recommended: {
    label: 'Highly Recommended',
    labelBn: 'অত্যন্ত প্রস্তাবিত',
    color: 'text-teal-700',
    chip: 'bg-teal-100 text-teal-700',
    ring: 'ring-teal-300',
    barTone: 'from-teal-400 to-cyan-500',
    stars: 4,
  },
  good_match: {
    label: 'Good Match',
    labelBn: 'ভালো ম্যাচ',
    color: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-700',
    ring: 'ring-amber-300',
    barTone: 'from-amber-400 to-orange-500',
    stars: 3,
  },
  need_more: {
    label: 'Need More Skills',
    labelBn: 'আরও দক্ষতা দরকার',
    color: 'text-orange-700',
    chip: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-300',
    barTone: 'from-orange-400 to-rose-500',
    stars: 2,
  },
  not_recommended: {
    label: 'Not Recommended',
    labelBn: 'প্রস্তাবিত নয়',
    color: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-700',
    ring: 'ring-rose-300',
    barTone: 'from-rose-400 to-rose-600',
    stars: 1,
  },
};


export function matchStars(n: number): { filled: number; total: number } {
  const filled = Math.max(0, Math.min(5, Math.round(n)));
  return { filled, total: 5 };
}

export default {
  listActiveJobsWithMatches,
  getMatchForJob,
  runJobMatching,
  getJobMatchDashboard,
  getFilterProjection,
  isJobVerifiedMatch,
  isJobRoadmapRelevant,
  createJobMatchAutoRefresh,
  getProfileCompletenessForMatching,
  findMissingSkillRoadmaps,
  MATCH_LABEL_META,
  matchStars,
  tokenize,
};
