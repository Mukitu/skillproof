import { supabase } from '../lib/supabase';
import type { CompanyJobEmploymentType, CompanyJobWorkType, CompanyJobSalaryMode } from './companyJobs';

export type MatchTier = 'perfect' | 'strong' | 'good' | 'partial' | 'low';

export interface MatchedCompanyJob {
  job_id: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_mobile_verified: boolean;
  company_address: string | null;
  title: string;
  category_id: string | null;
  category_label: string | null;
  sub_category_id: string | null;
  sub_category_label: string | null;
  employment_type: CompanyJobEmploymentType;
  work_type: CompanyJobWorkType;
  location: string | null;
  deadline: string | null;
  vacancies: number | null;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string | null;
  salary_mode: CompanyJobSalaryMode;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_label: string | null;
  published_at: string | null;
  created_at: string;
  skills: Array<{
    skill_id: string;
    name: string;
    level: string;
    priority: 'required' | 'preferred';
  }>;
  match_score: number;
  match_tier: MatchTier | null;
  why_match: string | null;
  verified_required_matches: number;
  declared_required_matches: number;
  matching_skill_names: string[];
  missing_skill_names: string[];
  verified_count: number;
  ai_overall_match: number | null;
  total_count: number;
}

export interface EnrichedInvite {
  invite_id: string;
  job_id: string;
  job_title: string;
  job_category_id: string | null;
  job_category_label: string | null;
  job_sub_category_id: string | null;
  job_sub_category_label: string | null;
  job_skills: Array<{
    skill_id: string;
    name: string;
    level: string;
    priority: 'required' | 'preferred';
  }>;
  job_location: string | null;
  job_employment_type: CompanyJobEmploymentType;
  job_work_type: CompanyJobWorkType;
  job_deadline: string | null;
  job_salary_label: string | null;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_category: string | null;
  company_mobile_verified: boolean;
  match_score: number;
  why_match: string | null;
  matching_skill_names: string[];
  missing_skill_names: string[];
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  message: string | null;
  created_at: string;
  responded_at: string | null;
  total_count: number;
}

export interface CompanyContactReveal {
  company_id: string;
  company_name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  category: string | null;
  mobile_verified: boolean;
  jobs: Array<{ id: string; title: string }>;
}

/**
 * Personalized ranking of published company_jobs against the calling
 * user's verified skills + declared skills + category / sub-category.
 *
 * Ranking priority (highest first):
 *   1. number of job-required skills with a 'Passed' verification
 *      by THIS user (verified_required_matches)
 *   2. job sub_category matches one of the user's verified-skill
 *      sub-categories
 *   3. job category matches one of the user's verified-skill
 *      categories
 *   4. declared user_skills overlap with job-required skills
 *   5. job_skill_match_pct (required-only overlap, 0..100)
 *   6. AI job_match_results.overall_match (if exists)
 *   7. total verified_count + recency
 *
 * Returns rows enriched with matching_skill_names, missing_skill_names,
 * match_score (0..100), match_tier label, and a human-readable
 * why_match. No contact info exposed.
 */
export async function listVerifiedMatches(
  limit = 12,
  offset = 0,
): Promise<{ rows: MatchedCompanyJob[]; total: number }> {
  const { data, error } = await supabase.rpc('fn_user_verified_match_jobs', {
    p_limit: Math.max(1, Math.min(limit, 50)),
    p_offset: Math.max(0, offset),
  });
  if (error) throw error;
  const rows = (data as MatchedCompanyJob[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

/**
 * Candidate-side enriched invites. Joins each invite with its company
 * logo, job category / sub-category, required skills, and a per-invite
 * why_match based on the candidate's OWN verified skills.
 *
 * Returns rows in status order: pending → accepted → declined →
 * withdrawn, then by created_at DESC.
 */
export async function listEnrichedInvites(
  status?: 'pending' | 'accepted' | 'declined' | 'withdrawn' | null,
  limit = 50,
  offset = 0,
): Promise<{ rows: EnrichedInvite[]; total: number }> {
  const { data, error } = await supabase.rpc('fn_user_enriched_invites', {
    p_status: status ?? null,
    p_limit: Math.max(1, Math.min(limit, 100)),
    p_offset: Math.max(0, offset),
  });
  if (error) throw error;
  const rows = (data as EnrichedInvite[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

/**
 * Privacy-gated reveal of a company's contact info.
 *
 * Returns the full contact payload ONLY when the calling user has an
 * ACCEPTED invite from that company. Otherwise returns null so the UI
 * can show the "Accept invite to view contact info" placeholder.
 *
 * Safe to call repeatedly — read-only, no state mutation.
 */
export async function revealCompanyContact(
  companyId: string,
): Promise<CompanyContactReveal | null> {
  const { data, error } = await supabase.rpc('fn_user_view_company_contact', {
    p_company_id: companyId,
  });
  if (error) throw error;
  return (data as CompanyContactReveal | null) ?? null;
}