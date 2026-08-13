
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import type { Job, JobType, JobStatus, JobApplication } from '../types/database';


export async function getJobById(id: string): Promise<Job | null> {
  // Try the unified RPC first so admin jobs AND published company jobs
  // can both be opened from the user portal. Falls back to the legacy
  // admin-only path if the RPC isn't deployed yet.
  try {
    const unified = await getPublicJobById(id);
    if (unified) return unified;
  } catch {
    // Fall through to admin-only fetch below.
  }
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('status', 'Active')
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

export async function listActiveJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'Active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Job[]) ?? [];
}

/**
 * Unified public feed used by the user Job Portal. Returns admin jobs
 * (public.jobs WHERE status='Active') AND published company jobs
 * (public.company_jobs WHERE status='published' AND company APPROVED),
 * normalised into the existing `Job` shape so the AI match pipeline,
 * filter toolbar, and card renderer keep working without branching.
 */
export async function listPublicJobs(opts?: {
  search?: string;
  employmentType?: string;
  workplace?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: Job[]; total: number }> {
  const { data, error } = await supabase.rpc('fn_list_public_jobs', {
    p_search:          opts?.search?.trim() || null,
    p_employment_type: opts?.employmentType ?? null,
    p_workplace:       opts?.workplace ?? null,
    p_offset:          Math.max(0, opts?.offset ?? 0),
    p_limit:           Math.max(1, Math.min(opts?.limit ?? 100, 200)),
  });
  if (error) throw error;
  const rows = ((data as Job[]) ?? []) as Job[];
  const total = rows.length > 0 ? Number((rows[0] as any).total_count ?? 0) : 0;
  // Strip the helper total_count field so callers see clean Job rows.
  const cleaned = rows.map((r) => {
    const { ...rest } = r as any;
    delete (rest as any).total_count;
    return rest as Job;
  });
  return { rows: cleaned, total };
}

export async function getPublicJobById(id: string): Promise<Job | null> {
  if (!id) return null;
  const { data, error } = await supabase.rpc('fn_get_public_job', {
    p_job_id: id,
  });
  if (error) throw error;
  const row = (data as Job[] | null)?.[0] ?? null;
  return row as Job | null;
}

/**
 * Skill-based job feed.
 *
 * Returns the union of admin jobs and approved-company jobs whose
 * required skills or category match the user's declared profile
 * skills. Used by the User Job Portal to surface matched jobs as soon
 * as a user fills in their profile — without waiting for them to
 * verify a passport or complete a roadmap.
 *
 * Falls back to an empty result if the RPC isn't deployed yet
 * (older migration), so the caller can safely chain it.
 */
export async function listPublicJobsByUserSkills(opts: {
  skillNames?: string[];
  skillCategories?: string[];
  offset?: number;
  limit?: number;
}): Promise<{ rows: Job[]; total: number }> {
  const skillNames = (opts.skillNames ?? []).filter((s) => !!s && s.trim().length > 0);
  const skillCategories = (opts.skillCategories ?? []).filter((s) => !!s && s.trim().length > 0);
  if (skillNames.length === 0 && skillCategories.length === 0) {
    return { rows: [], total: 0 };
  }
  const { data, error } = await supabase.rpc('fn_list_public_jobs_by_user_skills', {
    p_skill_names: skillNames,
    p_skill_categories: skillCategories,
    p_offset: Math.max(0, opts.offset ?? 0),
    p_limit: Math.max(1, Math.min(opts.limit ?? 50, 200)),
  });
  if (error) throw error;
  const rows = ((data as Job[]) ?? []) as Job[];
  const total = rows.length > 0 ? Number((rows[0] as any).total_count ?? 0) : 0;
  const cleaned = rows.map((r) => {
    const { ...rest } = r as any;
    delete (rest as any).total_count;
    return rest as Job;
  });
  return { rows: cleaned, total };
}

export async function listAllJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Job[]) ?? [];
}


export const emptyJobInput = (): Omit<Job, 'id' | 'created_at' | 'updated_at'> => ({
  title: '',
  company_name: '',
  company_logo: null,
  location: '',
  job_type: 'Full-time',
  salary_range: '',
  required_skills: [],
  description: '',
  responsibilities: [],
  requirements: [],
  status: 'Active',
  workplace: null,
  experience_level: null,
  education: null,
  benefits: [],
  deadline: null,
  application_url: null,
  source: null,
});

export async function adminCreateJob(
  input: Omit<Job, 'id' | 'created_at' | 'updated_at'>,
): Promise<Job> {
  const { data, error } = await supabase.rpc('fn_admin_create_job', {
    p_title: input.title,
    p_company_name: input.company_name,
    p_company_logo: input.company_logo,
    p_location: input.location,
    p_job_type: input.job_type,
    p_salary_range: input.salary_range,
    p_required_skills: input.required_skills,
    p_description: input.description,
    p_responsibilities: input.responsibilities,
    p_requirements: input.requirements,
    p_status: input.status,
    p_workplace: input.workplace,
    p_experience_level: input.experience_level,
    p_education: input.education,
    p_benefits: input.benefits ?? [],
    p_deadline: input.deadline,
    p_application_url: input.application_url,
    p_source: input.source,
  });
  if (error) throw new Error(`Could not create job: ${error.message || 'Unknown error'}`);
  return data as Job;
}

export async function adminUpdateJob(
  id: string,
  input: Omit<Job, 'id' | 'created_at' | 'updated_at'>,
): Promise<Job> {
  const { data, error } = await supabase.rpc('fn_admin_update_job', {
    p_id: id,
    p_title: input.title,
    p_company_name: input.company_name,
    p_company_logo: input.company_logo,
    p_location: input.location,
    p_job_type: input.job_type,
    p_salary_range: input.salary_range,
    p_required_skills: input.required_skills,
    p_description: input.description,
    p_responsibilities: input.responsibilities,
    p_requirements: input.requirements,
    p_status: input.status,
    p_workplace: input.workplace,
    p_experience_level: input.experience_level,
    p_education: input.education,
    p_benefits: input.benefits ?? [],
    p_deadline: input.deadline,
    p_application_url: input.application_url,
    p_source: input.source,
  });
  if (error) throw new Error(`Could not update job: ${error.message || 'Unknown error'}`);
  return data as Job;
}

export async function adminDeleteJob(id: string) {
  const { error } = await supabase.rpc('fn_admin_delete_job', { p_id: id });
  if (error) throw new Error(`Could not delete job: ${error.message || 'Unknown error'}`);
}


export function isValidApplyUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const trimmed = String(raw).trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export async function applyToJob(jobId: string, coverLetter?: string): Promise<JobApplication> {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');
  // Use the unified RPC so admin jobs AND approved-company jobs both
  // record applications. The RPC handles routing into public.job_applications
  // or public.company_applications depending on which table owns the row.
  try {
    const { data, error } = await supabase.rpc('fn_apply_to_public_job', {
      p_job_id: jobId,
      p_cover_letter: coverLetter ?? null,
    });
    if (!error && data) return data as JobApplication;
    if (error) {
      // If the RPC isn't deployed (older migration), fall back below.
      const msg = String(error.message || '');
      if (!/function .* does not exist/i.test(msg) && !/schema cache/i.test(msg)) {
        throw error;
      }
    }
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (!/function .* does not exist/i.test(msg) && !/schema cache/i.test(msg)) {
      throw e;
    }
  }
  // Legacy fallback — works only for admin jobs in public.jobs.
  const { data, error } = await supabase
    .from('job_applications')
    .insert({ job_id: jobId, user_id: profileId, cover_letter: coverLetter ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as JobApplication;
}

export async function listMyApplications(): Promise<JobApplication[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];

  // Pull the union of admin-job and company-job applications via the
  // unified RPC so the "Applied" badge works on both kinds of jobs.
  try {
    const { data, error } = await supabase.rpc('fn_list_my_public_applications');
    if (!error && Array.isArray(data)) {
      const ids = (data as Array<{ job_id: string }>).map((r) => r.job_id);
      // Return a JobApplication-shaped placeholder per id (the portal only
      // checks the job_id is included in `applied`).
      return ids.map((job_id) => ({
        id: job_id,
        job_id,
        user_id: profileId,
        status: 'Submitted',
        cover_letter: null,
        resume_url: null,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as unknown as JobApplication[];
    }
  } catch {
    // RPC not deployed — fall back to admin-only listing.
  }

  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', profileId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return (data as JobApplication[]) ?? [];
}

export async function listSavedJobIds(): Promise<string[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('user_id', profileId);
  if (error) throw error;
  return (data ?? []).map((r) => r.job_id);
}

export async function toggleSavedJob(jobId: string): Promise<boolean> {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');
  const { data: existing } = await supabase
    .from('saved_jobs')
    .select('id')
    .eq('user_id', profileId)
    .eq('job_id', jobId)
    .maybeSingle();
  if (existing) {
    await supabase.from('saved_jobs').delete().eq('id', existing.id);
    return false;
  }
  await supabase.from('saved_jobs').insert({ user_id: profileId, job_id: jobId });
  return true;
}