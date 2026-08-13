import { companySupabase as companyClientSupabase } from '../lib/supabaseCompany';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompanyApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Interview Completed'
  | 'Selected'
  | 'Rejected';

export const APPLICATION_STATUS_LABELS: Record<CompanyApplicationStatus, { en: string; bn: string }> = {
  'Applied':              { en: 'Applied',              bn: 'আবেদিত' },
  'Shortlisted':          { en: 'Shortlisted',          bn: 'শর্টলিস্টেড' },
  'Interview Scheduled':  { en: 'Interview Scheduled',  bn: 'ইন্টারভিউ নির্ধারিত' },
  'Interview Completed':  { en: 'Interview Completed',  bn: 'ইন্টারভিউ সম্পন্ন' },
  'Selected':             { en: 'Selected',             bn: 'নির্বাচিত' },
  'Rejected':             { en: 'Rejected',             bn: 'প্রত্যাখ্যাত' },
};

export interface CompanyApplicationRow {
  id: string;
  job_id: string;
  job_title: string;
  user_id: string;
  applicant_name: string;
  applicant_avatar_url: string | null;
  applicant_profession: string | null;
  applicant_location: string | null;
  applicant_experience_years: number | null;
  verified_skill_count: number;
  total_skill_count: number;
  ai_match_score: number | null;
  job_match_score: number | null;
  status: CompanyApplicationStatus;
  cover_letter: string | null;
  applied_at: string;
  updated_at: string;
  shortlisted_at: string | null;
  decision_at: string | null;
  total_count: number;
}

export interface CompanyApplicationDetail {
  application: {
    id: string;
    company_id: string;
    job_id: string;
    user_id: string;
    status: CompanyApplicationStatus;
    cover_letter: string | null;
    applied_at: string;
    updated_at: string;
    shortlisted_at: string | null;
    shortlisted_by: string | null;
    decision_at: string | null;
    decision_by: string | null;
  };
  job: Record<string, unknown> | null;
  candidate: Record<string, unknown> | null;
}

export interface CompanyApplicationListResult {
  rows: CompanyApplicationRow[];
  total: number;
}

export type CompanyApplicationSort =
  | 'newest'
  | 'oldest'
  | 'ai_match'
  | 'experience';

export const APPLICATION_SORT_LABELS: Record<CompanyApplicationSort, { en: string; bn: string }> = {
  newest:     { en: 'Newest First',     bn: 'নতুন আগে' },
  oldest:     { en: 'Oldest First',     bn: 'পুরনো আগে' },
  ai_match:   { en: 'AI Match (High)',  bn: 'এআই ম্যাচ (বেশি)' },
  experience: { en: 'Most Experience',  bn: 'বেশি অভিজ্ঞতা' },
};

export interface CompanyJobFilterRow {
  id: string;
  title: string;
  application_count: number;
}

export interface CompanyDashboardStatsFull {
  active_jobs: number;
  total_applications: number;
  shortlisted: number;
  upcoming_interviews: number;
  applied_today: number;
  applied_this_week: number;
  by_status: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface ListCompanyApplicationsOptions {
  status?: CompanyApplicationStatus[] | null;
  jobId?: string | null;
  search?: string;
  sort?: CompanyApplicationSort;
  offset?: number;
  limit?: number;
}

export async function listCompanyApplications(
  opts: ListCompanyApplicationsOptions = {},
): Promise<CompanyApplicationListResult> {
  const { status = null, jobId = null, search = '', sort = 'newest', offset = 0, limit = 12 } = opts;
  const { data, error } = await companyClientSupabase.rpc('fn_company_list_applications', {
    p_status: status && status.length > 0 ? status : null,
    p_job_id: jobId || null,
    p_search: search.trim() || null,
    p_sort: sort,
    p_offset: Math.max(0, offset),
    p_limit: Math.min(100, Math.max(1, limit)),
  });
  if (error) throw error;
  const rows = (data as CompanyApplicationRow[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0;
  return { rows, total };
}

export async function getCompanyApplication(
  applicationId: string,
): Promise<CompanyApplicationDetail | null> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_get_application', {
    p_application_id: applicationId,
  });
  if (error) throw error;
  return (data as CompanyApplicationDetail) ?? null;
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function setCompanyApplicationStatus(
  applicationId: string,
  status: CompanyApplicationStatus,
  note?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_set_application_status', {
    p_application_id: applicationId,
    p_status: status,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) ?? {};
}

export async function rejectCompanyApplication(
  applicationId: string,
  note?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_reject_application', {
    p_application_id: applicationId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) ?? {};
}

// ---------------------------------------------------------------------------
// Job filter
// ---------------------------------------------------------------------------

export async function listCompanyJobsForFilter(): Promise<CompanyJobFilterRow[]> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_list_jobs_for_filter');
  if (error) throw error;
  return (data as CompanyJobFilterRow[]) ?? [];
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function fetchCompanyDashboardStatsFull(): Promise<CompanyDashboardStatsFull> {
  const empty: CompanyDashboardStatsFull = {
    active_jobs: 0,
    total_applications: 0,
    shortlisted: 0,
    upcoming_interviews: 0,
    applied_today: 0,
    applied_this_week: 0,
    by_status: {},
  };
  try {
    const { data, error } = await companyClientSupabase.rpc('fn_company_dashboard_stats');
    if (!error && data) {
      const d = data as Partial<CompanyDashboardStatsFull>;
      return {
        active_jobs: Number(d.active_jobs ?? 0),
        total_applications: Number(d.total_applications ?? 0),
        shortlisted: Number(d.shortlisted ?? 0),
        upcoming_interviews: Number(d.upcoming_interviews ?? 0),
        applied_today: Number(d.applied_today ?? 0),
        applied_this_week: Number(d.applied_this_week ?? 0),
        by_status: (d.by_status as Record<string, number>) ?? {},
      };
    }
  } catch {}
  return empty;
}

// ---------------------------------------------------------------------------
// Status transition helpers
// ---------------------------------------------------------------------------

export interface StatusTransition {
  to: CompanyApplicationStatus;
  label: { en: string; bn: string };
  variant: 'primary' | 'secondary' | 'danger';
  iconName: 'shortlist' | 'interview' | 'complete' | 'select' | 'reject';
}

/**
 * Returns the legal status transitions for the given current status.
 * Mirrors the server-side validator in fn_company_set_application_status.
 */
export function getAllowedTransitions(
  current: CompanyApplicationStatus,
  language: 'bn' | 'en' = 'en',
): StatusTransition[] {
  const t = (en: string, bn: string) => ({ en, bn });

  const transitions: StatusTransition[] = [];

  if (current === 'Applied') {
    transitions.push({
      to: 'Shortlisted',
      label: t('Shortlist', 'শর্টলিস্ট'),
      variant: 'primary',
      iconName: 'shortlist',
    });
  }

  if (current === 'Shortlisted') {
    transitions.push({
      to: 'Interview Scheduled',
      label: t('Schedule Interview', 'ইন্টারভিউ নির্ধারণ'),
      variant: 'primary',
      iconName: 'interview',
    });
  }

  if (current === 'Interview Scheduled') {
    transitions.push({
      to: 'Interview Completed',
      label: t('Mark Completed', 'সম্পন্ন হিসেবে চিহ্নিত'),
      variant: 'primary',
      iconName: 'complete',
    });
  }

  if (current === 'Interview Completed') {
    transitions.push({
      to: 'Selected',
      label: t('Select Candidate', 'প্রার্থী নির্বাচন'),
      variant: 'primary',
      iconName: 'select',
    });
  }

  if (current !== 'Selected' && current !== 'Rejected') {
    transitions.push({
      to: 'Rejected',
      label: t('Reject', 'প্রত্যাখ্যান'),
      variant: 'danger',
      iconName: 'reject',
    });
  }

  return transitions;
}

export function isTerminalStatus(status: CompanyApplicationStatus): boolean {
  return status === 'Selected' || status === 'Rejected';
}
