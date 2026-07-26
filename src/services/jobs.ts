/**
 * Jobs service.
 */
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import type { Job, JobType, JobStatus, JobApplication } from '../types/database';

export async function listActiveJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'Active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Job[]) ?? [];
}

export async function listAllJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Job[]) ?? [];
}

export async function adminCreateJob(input: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
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
  });
  if (error) throw new Error(`Could not create job: ${error.message || 'Unknown error'}`);
  return data as Job;
}

export async function adminUpdateJob(id: string, input: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
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
  });
  if (error) throw new Error(`Could not update job: ${error.message || 'Unknown error'}`);
  return data as Job;
}

export async function adminDeleteJob(id: string) {
  const { error } = await supabase.rpc('fn_admin_delete_job', { p_id: id });
  if (error) throw new Error(`Could not delete job: ${error.message || 'Unknown error'}`);
}

export async function applyToJob(jobId: string, coverLetter?: string): Promise<JobApplication> {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');
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
