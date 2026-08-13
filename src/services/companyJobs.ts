import { companySupabase } from '../lib/supabaseCompany';
import { supabase } from '../lib/supabase';
import type { Category, Skill, SubCategory } from '../types/database';

export type CompanyJobStatus = 'draft' | 'published' | 'paused' | 'closed';
export type CompanyJobEmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'temporary';
export type CompanyJobWorkType = 'on_site' | 'remote' | 'hybrid';
export type CompanyJobSalaryMode = 'negotiable' | 'range' | 'fixed';
export type CompanyJobSkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type CompanyJobSkillPriority = 'required' | 'preferred';

export const COMPANY_JOB_STATUS_LABELS: Record<CompanyJobStatus, { en: string; bn: string; tone: string }> = {
  draft:     { en: 'Draft',     bn: 'খসড়া',         tone: 'slate' },
  published: { en: 'Published', bn: 'প্রকাশিত',      tone: 'emerald' },
  paused:    { en: 'Paused',    bn: 'স্থগিত',         tone: 'amber' },
  closed:    { en: 'Closed',    bn: 'বন্ধ',           tone: 'rose' },
};

export const COMPANY_JOB_EMPLOYMENT_LABELS: Record<CompanyJobEmploymentType, { en: string; bn: string }> = {
  full_time:  { en: 'Full Time',  bn: 'ফুল টাইম' },
  part_time:  { en: 'Part Time',  bn: 'পার্ট টাইম' },
  contract:   { en: 'Contract',   bn: 'কন্ট্রাক্ট' },
  internship: { en: 'Internship', bn: 'ইন্টার্নশিপ' },
  freelance:  { en: 'Freelance',  bn: 'ফ্রিল্যান্স' },
  temporary:  { en: 'Temporary',  bn: 'অস্থায়ী' },
};

export const COMPANY_JOB_WORK_LABELS: Record<CompanyJobWorkType, { en: string; bn: string }> = {
  on_site: { en: 'On-site', bn: 'অন-সাইট' },
  remote:  { en: 'Remote',  bn: 'রিমোট' },
  hybrid:  { en: 'Hybrid',  bn: 'হাইব্রিড' },
};

export const COMPANY_JOB_SALARY_MODE_LABELS: Record<CompanyJobSalaryMode, { en: string; bn: string }> = {
  negotiable: { en: 'Negotiable', bn: 'আলোচনা সাপেক্ষ' },
  range:      { en: 'Range',      bn: 'পরিসীমা' },
  fixed:      { en: 'Fixed',      bn: 'নির্দিষ্ট' },
};

export const COMPANY_JOB_SKILL_LEVEL_LABELS: Record<CompanyJobSkillLevel, { en: string; bn: string }> = {
  beginner:     { en: 'Beginner',     bn: 'বিগিনার' },
  intermediate: { en: 'Intermediate', bn: 'ইন্টারমিডিয়েট' },
  advanced:     { en: 'Advanced',     bn: 'অ্যাডভান্সড' },
  expert:       { en: 'Expert',       bn: 'এক্সপার্ট' },
};

export interface CompanyJobSkillInput {
  skill_id: string;
  level?: CompanyJobSkillLevel;
  priority?: CompanyJobSkillPriority;
}

export interface CompanyJob {
  id: string;
  company_id: string;
  title: string;
  category_id: string | null;
  category_label: string;
  sub_category_id: string | null;
  sub_category_label: string | null;
  employment_type: CompanyJobEmploymentType;
  work_type: CompanyJobWorkType;
  location: string | null;
  salary_mode: CompanyJobSalaryMode;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_label: string | null;
  experience_label: string | null;
  education_label: string | null;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string | null;
  deadline: string | null;
  vacancies: number | null;
  status: CompanyJobStatus;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  skill_count: number;
  application_count: number;
  total_count?: number;
}

export interface CompanyJobDetail extends CompanyJob {
  skills: Array<{
    skill_id: string;
    level: CompanyJobSkillLevel;
    priority: CompanyJobSkillPriority;
    name: string;
    slug: string;
  }>;
  company: {
    id: string;
    company_name: string;
    logo_url: string | null;
    category: string;
    address: string;
    status: string;
    mobile_verified: boolean;
  };
}

export interface CompanyJobStats {
  total_jobs: number;
  draft_jobs: number;
  published_jobs: number;
  paused_jobs: number;
  closed_jobs: number;
  expired_jobs: number;
}

export interface PublishedCompanyJob {
  id: string;
  title: string;
  category_id: string | null;
  category_label: string;
  sub_category_id: string | null;
  sub_category_label: string | null;
  employment_type: CompanyJobEmploymentType;
  work_type: CompanyJobWorkType;
  location: string | null;
  salary_mode: CompanyJobSalaryMode;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_label: string | null;
  experience_label: string | null;
  education_label: string | null;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string | null;
  deadline: string | null;
  vacancies: number | null;
  published_at: string | null;
  created_at: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_category: string;
  company_address: string;
  company_mobile_verified: boolean;
  skills: Array<{
    skill_id: string;
    name: string;
    level: CompanyJobSkillLevel;
    priority: CompanyJobSkillPriority;
  }>;
  total_count: number;
}

export interface CompanyJobInput {
  title: string;
  categoryId: string;
  subCategoryId?: string | null;
  employmentType: CompanyJobEmploymentType;
  workType: CompanyJobWorkType;
  description: string;
  responsibilities: string;
  requirements: string;
  location?: string | null;
  salaryMode?: CompanyJobSalaryMode;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  salaryLabel?: string | null;
  experienceLabel?: string | null;
  educationLabel?: string | null;
  benefits?: string | null;
  deadline?: string | null;
  vacancies?: number | null;
  skills?: CompanyJobSkillInput[];
}

export interface CompanyJobListFilters {
  search?: string;
  status?: CompanyJobStatus | null;
  employmentType?: CompanyJobEmploymentType | null;
  workType?: CompanyJobWorkType | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  sort?: 'newest' | 'oldest' | 'deadline' | 'title';
  offset?: number;
  limit?: number;
}

export async function listCompanyJobs(filters: CompanyJobListFilters = {}): Promise<{ rows: CompanyJob[]; total: number }> {
  const { data, error } = await companySupabase.rpc('fn_company_list_jobs', {
    p_search:          filters.search?.trim() || null,
    p_status:          filters.status ?? null,
    p_employment_type: filters.employmentType ?? null,
    p_work_type:       filters.workType ?? null,
    p_category_id:     filters.categoryId ?? null,
    p_sub_category_id: filters.subCategoryId ?? null,
    p_sort:            filters.sort ?? 'newest',
    p_offset:          Math.max(0, filters.offset ?? 0),
    p_limit:           Math.max(1, Math.min(filters.limit ?? 25, 100)),
  });
  if (error) throw error;
  const rows = (data as CompanyJob[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export async function getCompanyJob(jobId: string): Promise<CompanyJobDetail | null> {
  const { data, error } = await companySupabase.rpc('fn_company_get_job', { p_job_id: jobId });
  if (error) throw error;
  if (!data) return null;
  const payload = data as { job: CompanyJob; skills: CompanyJobDetail['skills']; company: CompanyJobDetail['company']; application_count: number };
  return {
    ...payload.job,
    skills: payload.skills,
    company: payload.company,
    application_count: payload.application_count ?? 0,
  };
}

export async function createCompanyJob(input: CompanyJobInput): Promise<CompanyJob> {
  const { data, error } = await companySupabase.rpc('fn_company_create_job', {
    p_title:            input.title,
    p_category_id:      input.categoryId,
    p_employment_type:  input.employmentType,
    p_work_type:        input.workType,
    p_description:      input.description,
    p_responsibilities: input.responsibilities,
    p_requirements:     input.requirements,
    p_sub_category_id:  input.subCategoryId ?? null,
    p_location:         input.location ?? null,
    p_salary_mode:      input.salaryMode ?? 'negotiable',
    p_salary_min:       input.salaryMin ?? null,
    p_salary_max:       input.salaryMax ?? null,
    p_salary_currency:  input.salaryCurrency ?? 'BDT',
    p_salary_label:     input.salaryLabel ?? null,
    p_experience_label: input.experienceLabel ?? null,
    p_education_label:  input.educationLabel ?? null,
    p_benefits:         input.benefits ?? null,
    p_deadline:         input.deadline ?? null,
    p_vacancies:        input.vacancies ?? null,
    p_skills:           input.skills ?? [],
  });
  if (error) throw error;
  return data as CompanyJob;
}

export async function updateCompanyJob(jobId: string, input: CompanyJobInput): Promise<CompanyJob> {
  const { data, error } = await companySupabase.rpc('fn_company_update_job', {
    p_job_id:           jobId,
    p_title:            input.title,
    p_category_id:      input.categoryId,
    p_sub_category_id:  input.subCategoryId ?? null,
    p_employment_type:  input.employmentType,
    p_work_type:        input.workType,
    p_description:      input.description,
    p_responsibilities: input.responsibilities,
    p_requirements:     input.requirements,
    p_location:         input.location ?? null,
    p_salary_mode:      input.salaryMode ?? 'negotiable',
    p_salary_min:       input.salaryMin ?? null,
    p_salary_max:       input.salaryMax ?? null,
    p_salary_currency:  input.salaryCurrency ?? 'BDT',
    p_salary_label:     input.salaryLabel ?? null,
    p_experience_label: input.experienceLabel ?? null,
    p_education_label:  input.educationLabel ?? null,
    p_benefits:         input.benefits ?? null,
    p_deadline:         input.deadline ?? null,
    p_vacancies:        input.vacancies ?? null,
    p_skills:           input.skills ?? [],
  });
  if (error) throw error;
  return data as CompanyJob;
}

export async function deleteCompanyJob(jobId: string): Promise<void> {
  const { error } = await companySupabase.rpc('fn_company_delete_job', { p_job_id: jobId });
  if (error) throw error;
}

export async function setCompanyJobStatus(jobId: string, status: CompanyJobStatus): Promise<CompanyJob> {
  const { data, error } = await companySupabase.rpc('fn_company_set_job_status', {
    p_job_id: jobId,
    p_status: status,
  });
  if (error) throw error;
  return data as CompanyJob;
}

export async function fetchCompanyJobStats(): Promise<CompanyJobStats> {
  try {
    const { data, error } = await companySupabase.rpc('fn_company_job_stats');
    if (!error && data) return data as CompanyJobStats;
  } catch {}
  return {
    total_jobs: 0,
    draft_jobs: 0,
    published_jobs: 0,
    paused_jobs: 0,
    closed_jobs: 0,
    expired_jobs: 0,
  };
}

export async function setCompanyJobSkills(jobId: string, skills: CompanyJobSkillInput[]): Promise<void> {
  const { error } = await companySupabase.rpc('fn_company_set_job_skills', {
    p_job_id: jobId,
    p_skills: skills ?? [],
  });
  if (error) throw error;
}

export async function listActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('status', 'Active')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function listActiveSubCategories(categoryId?: string | null): Promise<SubCategory[]> {
  let q = supabase
    .from('sub_categories')
    .select('*')
    .eq('status', 'Active')
    .order('display_order', { ascending: true });
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as SubCategory[]) ?? [];
}

export async function listActiveSkills(opts?: { search?: string; limit?: number }): Promise<Skill[]> {
  let q = supabase.from('skills').select('*').eq('status', 'Active').order('name', { ascending: true });
  if (opts?.search && opts.search.trim().length > 0) {
    q = q.ilike('name', `%${opts.search.trim()}%`);
  }
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Skill[]) ?? [];
}

/**
 * Ensure a skill exists in `public.skills` and return the row.
 *
 * Behaviour:
 *   1. Look up by exact case-insensitive name (any status — including Pending
 *      and Inactive, so we don't double-create a deactivated skill).
 *   2. If not found, INSERT a new Active skill with the given name. The slug
 *      is auto-generated from the name. created_by is left NULL since the
 *      skill is being added by a company account, not an admin.
 *
 * Why this exists:
 *   `company_job_skills.skill_id` is a hard FK into `public.skills(id)`, so
 *   a company can't add a job skill that isn't already in the public
 *   taxonomy. To honour the user-facing promise of "type any skill and press
 *   Enter", we transparently auto-create the missing skill on first use.
 *
 * Failures (RLS, network, etc.) bubble up to the caller so the UI can show
 * a friendly error instead of silently swallowing the input.
 */
export async function ensureSkill(name: string): Promise<Skill> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Skill name is empty');
  }

  // 1. Try to find an existing row (any status — so a duplicate doesn't
  //    silently re-create a deactivated skill).
  const { data: existing, error: lookupErr } = await supabase
    .from('skills')
    .select('*')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();

  if (lookupErr) throw lookupErr;
  if (existing) return existing as Skill;

  // 2. Not found — auto-create. Slug gets a tiny random suffix to dodge
  //    the unlikely collision on the slug UNIQUE index.
  const slugBase = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'skill';
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  // We tag the skill with the calling user's auth.uid() so the company's
  // UPDATE policy (created_by = auth.uid()) can also edit it later.
  const { data: { user } } = await supabase.auth.getUser();
  const createdBy = user?.id ?? null;

  const { data: inserted, error: insertErr } = await supabase
    .from('skills')
    .insert({
      name: trimmed,
      slug,
      status: 'Active',
      description: 'Auto-added by a company while posting a job.',
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (insertErr) throw insertErr;
  return inserted as Skill;
}

/**
 * Summary of a single skill the signed-in user has on their personal
 * profile, plus an optional match score from the public `skill_verifications`
 * table when the same skill_id has been verified.
 */
export interface CompanyOwnerProfileSkill {
  /** Stable id we can use as a React key — we synthesize from name when no skill_id exists. */
  id: string;
  name: string;
  category: string | null;
  /**
   * The matching `public.skills.id` if we found a taxonomy match for the
   * profile skill's name (case-insensitive). null means the user's profile
   * has a free-text skill that has not been catalogued yet.
   */
  skillId: string | null;
  /** Best verification score 0-100 from `skill_verifications`, if any. */
  bestScore: number | null;
  /** Best level 1-N from `skill_verifications`, if any. */
  bestLevel: number | null;
}

/**
 * Loads the signed-in user's personal skills + their best verification
 * score/level per skill. We resolve via `auth.users → profiles → user_skills`
 * because `user_skills.user_id` references `profiles.id` (NOT auth.uid).
 *
 * The whole call is best-effort — failures return [] so the job-create
 * page can still load even if the personal-profile tables are empty or the
 * RLS doesn't apply to the current client.
 */
export async function fetchCompanyOwnerProfileSkills(): Promise<CompanyOwnerProfileSkill[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const authUserId = user?.id;
    if (!authUserId) return [];

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (profileErr || !profile?.id) return [];

    const [{ data: userSkills, error: usErr }, { data: verifications, error: svErr }] = await Promise.all([
      supabase
        .from('user_skills')
        .select('id, name, category')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('skill_verifications')
        .select('skill_id, level, score')
        .eq('user_id', profile.id)
        .limit(200),
    ]);
    if (usErr) return [];

    const safeVerifications = (verifications ?? []) as Array<{
      skill_id: string;
      level: number;
      score: number;
    }>;
    void svErr;

    // Group best score / level per skill_id
    const bestBySkill = new Map<string, { score: number; level: number }>();
    for (const v of safeVerifications) {
      const cur = bestBySkill.get(v.skill_id);
      if (!cur || v.score > cur.score) {
        bestBySkill.set(v.skill_id, { score: v.score, level: v.level });
      }
    }

    // Try to map profile-skill names to `public.skills.id` rows so the
    // company owner can add them to the job with one click. Case-insensitive
    // name match.
    const userSkillNames = (userSkills ?? [])
      .map((s) => (s.name ?? '').trim())
      .filter(Boolean);
    const { data: skillRows } = userSkillNames.length === 0
      ? { data: [] as Array<{ id: string; name: string }> | null }
      : await supabase
          .from('skills')
          .select('id, name')
          .eq('status', 'Active')
          .in('name', userSkillNames);

    const skillRowByName = new Map<string, { id: string; name: string }>();
    for (const row of skillRows ?? []) {
      skillRowByName.set(row.name.trim().toLowerCase(), row);
    }

    const out: CompanyOwnerProfileSkill[] = [];
    for (const us of (userSkills ?? []) as Array<{ id: string; name: string; category: string | null }>) {
      const trimmed = (us.name ?? '').trim();
      if (!trimmed) continue;
      const row = skillRowByName.get(trimmed.toLowerCase());
      const best = row ? bestBySkill.get(row.id) ?? null : null;
      out.push({
        id: us.id,
        name: trimmed,
        category: us.category ?? null,
        skillId: row?.id ?? null,
        bestScore: best ? best.score : null,
        bestLevel: best ? best.level : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export interface PublishedCompanyJobFilters {
  search?: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  employmentType?: CompanyJobEmploymentType | null;
  workType?: CompanyJobWorkType | null;
  offset?: number;
  limit?: number;
}

export async function listPublishedCompanyJobs(
  filters: PublishedCompanyJobFilters = {},
): Promise<{ rows: PublishedCompanyJob[]; total: number }> {
  const { data, error } = await supabase.rpc('fn_list_published_company_jobs', {
    p_search:          filters.search?.trim() || null,
    p_category_id:     filters.categoryId ?? null,
    p_sub_category_id: filters.subCategoryId ?? null,
    p_employment_type: filters.employmentType ?? null,
    p_work_type:       filters.workType ?? null,
    p_offset:          Math.max(0, filters.offset ?? 0),
    p_limit:           Math.max(1, Math.min(filters.limit ?? 25, 100)),
  });
  if (error) throw error;
  const rows = ((data as PublishedCompanyJob[]) ?? []) as PublishedCompanyJob[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export async function getPublishedCompanyJob(jobId: string): Promise<{
  job: CompanyJob;
  company: {
    id: string;
    company_name: string;
    logo_url: string | null;
    category: string;
    address: string;
    mobile_verified: boolean;
  };
  skills: PublishedCompanyJob['skills'];
} | null> {
  const { data, error } = await supabase.rpc('fn_get_published_company_job', { p_job_id: jobId });
  if (error) throw error;
  return (data as any) ?? null;
}

export function formatSalaryLabel(job: Pick<CompanyJob, 'salary_mode' | 'salary_min' | 'salary_max' | 'salary_currency' | 'salary_label'>): string {
  if (job.salary_label && job.salary_label.trim().length > 0) return job.salary_label;
  if (job.salary_mode === 'negotiable') return 'Negotiable';
  if (job.salary_mode === 'fixed' && job.salary_min != null) {
    return `${formatNumber(job.salary_min)} ${job.salary_currency}`;
  }
  if (job.salary_mode === 'range' && job.salary_min != null && job.salary_max != null) {
    return `${formatNumber(job.salary_min)} – ${formatNumber(job.salary_max)} ${job.salary_currency}`;
  }
  return job.salary_mode === 'fixed' ? 'Fixed' : 'Range';
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function isJobExpired(job: Pick<CompanyJob, 'deadline' | 'status'>): boolean {
  if (!job.deadline) return false;
  if (job.status !== 'published' && job.status !== 'paused') return false;
  const d = new Date(job.deadline);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}
