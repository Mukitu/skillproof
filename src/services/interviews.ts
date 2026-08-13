import { companySupabase } from '../lib/supabaseCompany';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InterviewPlatform = 'google_meet' | 'zoom';

export type InterviewStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'decision_pending'
  | 'selected'
  | 'rejected'
  | 'closed';

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, { en: string; bn: string }> = {
  scheduled:        { en: 'Scheduled',         bn: 'নির্ধারিত' },
  completed:        { en: 'Completed',         bn: 'সম্পন্ন' },
  cancelled:        { en: 'Cancelled',         bn: 'বাতিল' },
  no_show:          { en: 'No-show',           bn: 'অনুপস্থিত' },
  decision_pending: { en: 'Decision Pending',  bn: 'সিদ্ধান্ত প্রক্রিয়াধীন' },
  selected:         { en: 'Selected',          bn: 'নির্বাচিত' },
  rejected:         { en: 'Rejected',          bn: 'প্রত্যাখ্যাত' },
  closed:           { en: 'Closed',            bn: 'বন্ধ' },
};

export const INTERVIEW_PLATFORM_LABELS: Record<InterviewPlatform, { en: string; bn: string }> = {
  google_meet: { en: 'Google Meet', bn: 'গুগল মিট' },
  zoom:        { en: 'Zoom',        bn: 'জুম' },
};

export interface CompanyInterviewRow {
  interview_id: string;
  application_id: string;
  job_id: string;
  job_title: string;
  job_category_label: string | null;
  job_sub_category_label: string | null;
  candidate_id: string;
  candidate_name: string;
  candidate_avatar_url: string | null;
  application_status: string;
  interview_status: InterviewStatus;
  scheduled_at: string;
  timezone: string;
  platform: InterviewPlatform;
  meeting_url: string;
  note: string | null;
  decision_deadline: string | null;
  created_at: string;
  total_count: number;
}

export interface UserInterviewRow {
  interview_id: string;
  application_id: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_mobile_verified: boolean;
  job_id: string;
  job_title: string;
  job_category_label: string | null;
  job_sub_category_label: string | null;
  application_status: string;
  interview_status: InterviewStatus;
  scheduled_at: string;
  timezone: string;
  platform: InterviewPlatform;
  meeting_url: string;
  note: string | null;
  decision_deadline: string | null;
  created_at: string;
  total_count: number;
}

export interface InterviewScheduleInput {
  application_id: string;
  scheduled_date: string;
  scheduled_time: string;
  platform: InterviewPlatform;
  meeting_url: string;
  note?: string | null;
}

export interface InterviewScheduleResult {
  interview_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  scheduled_at: string;
  timezone: string;
  platform: InterviewPlatform;
  meeting_url: string;
  note: string | null;
  status: InterviewStatus;
}

export interface InterviewCompleteResult {
  interview_id: string;
  status: InterviewStatus;
  completed_at: string;
  decision_deadline: string | null;
}

export interface InterviewCancelResult {
  interview_id: string;
  status: InterviewStatus;
  cancelled_reason: string | null;
}

export interface InterviewDecisionWindow {
  interview_id: string;
  status: InterviewStatus;
  has_window: boolean;
  decision_deadline: string | null;
  remaining_seconds: number | null;
  is_expired: boolean;
  min_window_seconds: number;
  max_window_seconds: number;
}

// ---------------------------------------------------------------------------
// Company side
// ---------------------------------------------------------------------------

export interface ListCompanyInterviewsOptions {
  status?: InterviewStatus | null;
  search?: string;
  sort?: 'upcoming' | 'newest';
  offset?: number;
  limit?: number;
}

export async function listCompanyInterviews(
  opts: ListCompanyInterviewsOptions = {},
): Promise<{ rows: CompanyInterviewRow[]; total: number }> {
  const status = opts.status ?? null;
  const search = opts.search ?? '';
  const sort   = opts.sort ?? 'upcoming';
  const offset = opts.offset ?? 0;
  const limit  = opts.limit ?? 50;
  const { data, error } = await companySupabase.rpc('fn_company_list_interviews', {
    p_status: status,
    p_search: search.trim() || null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data as CompanyInterviewRow[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export async function getCompanyInterview(
  interviewId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await companySupabase.rpc('fn_company_get_interview', {
    p_interview_id: interviewId,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) ?? null;
}

export async function scheduleCompanyInterview(
  input: InterviewScheduleInput,
): Promise<InterviewScheduleResult> {
  const { data, error } = await companySupabase.rpc('fn_company_schedule_interview', {
    p_application_id: input.application_id,
    p_scheduled_date: input.scheduled_date,
    p_scheduled_time: input.scheduled_time,
    p_platform: input.platform,
    p_meeting_url: input.meeting_url,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return (data as InterviewScheduleResult) ?? null;
}

export async function completeCompanyInterview(
  interviewId: string,
  outcome: 'decision_pending' = 'decision_pending',
): Promise<InterviewCompleteResult> {
  const { data, error } = await companySupabase.rpc('fn_company_complete_interview', {
    p_interview_id: interviewId,
    p_outcome: outcome,
  });
  if (error) throw error;
  return (data as InterviewCompleteResult) ?? null;
}

export async function cancelCompanyInterview(
  interviewId: string,
  reason?: string | null,
): Promise<InterviewCancelResult> {
  const { data, error } = await companySupabase.rpc('fn_company_cancel_interview', {
    p_interview_id: interviewId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
  return (data as InterviewCancelResult) ?? null;
}

export async function getCompanyInterviewDecisionWindow(
  interviewId: string,
): Promise<InterviewDecisionWindow> {
  const { data, error } = await companySupabase.rpc('fn_company_interview_decision_window', {
    p_interview_id: interviewId,
  });
  if (error) throw error;
  return (data as InterviewDecisionWindow) ?? null;
}

// ---------------------------------------------------------------------------
// User side
// ---------------------------------------------------------------------------

export interface ListUserInterviewsOptions {
  status?: InterviewStatus | null;
  offset?: number;
  limit?: number;
}

export async function listUserInterviews(
  opts: ListUserInterviewsOptions = {},
): Promise<{ rows: UserInterviewRow[]; total: number }> {
  const status = opts.status ?? null;
  const offset = opts.offset ?? 0;
  const limit  = opts.limit ?? 50;
  const { data, error } = await supabase.rpc('fn_user_list_interviews', {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data as UserInterviewRow[]) ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export async function getUserInterview(
  interviewId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc('fn_user_get_interview', {
    p_interview_id: interviewId,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) ?? null;
}

// ---------------------------------------------------------------------------
// Contact reveal — only works after the candidate has been SELECTED by
// the company. Returns { revealed: false, reason } otherwise.
// ---------------------------------------------------------------------------

export interface CompanyContactCompany {
  id: string;
  company_name: string;
  logo_url: string | null;
  category: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  website_url: string | null;
  mobile_verified: boolean;
}

export interface CompanyContactJob {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
}

export interface CompanyContactResult {
  revealed: boolean;
  reason?: string;
  application_status?: string;
  company?: CompanyContactCompany;
  job?: CompanyContactJob;
}

export async function getCompanyContact(
  applicationId: string,
): Promise<CompanyContactResult> {
  const { data, error } = await supabase.rpc('fn_user_get_company_contact', {
    p_application_id: applicationId,
  });
  if (error) throw error;
  // PostgREST returns the JSONB row directly. Default to a "not revealed"
  // shape so the caller never has to null-check the optional fields.
  const row = (data ?? {}) as CompanyContactResult;
  if (typeof row.revealed !== 'boolean') {
    return {
      revealed: false,
      reason: 'Contact details are not available yet.',
      application_status: row.application_status,
    };
  }
  return row;
}

/**
 * Resolve the company contact (phone / email / website / address /
 * contact_name / logo) for the company on the supplied interview.
 *
 * Unlike `getCompanyContact` (which only reveals after a candidate is
 * SELECTED), this works for ANY interview the candidate owns — needed
 * by the Interview page "কোম্পানির যোগাযোগ দেখুন" button which has
 * to be reachable on scheduled, decision_pending, completed, etc.
 *
 * Strictness:
 *   - The candidate must own the interview (profiles.id == candidate_id).
 *   - The underlying application must point to the same company as the
 *     interview row (Interview → Job → Company consistency).
 *   - The company record must still exist.
 * Returns a `CompanyContactResult` with the same shape as the
 * application-scoped variant so the UI can render either source
 * with a single component.
 */
export async function getCompanyContactByInterview(
  interviewId: string,
): Promise<CompanyContactResult> {
  if (!interviewId) {
    return { revealed: false, reason: 'Missing interview id.' };
  }
  const { data, error } = await supabase.rpc(
    'fn_user_get_company_contact_for_interview',
    { p_interview_id: interviewId },
  );
  if (error) throw error;
  const row = (data ?? {}) as CompanyContactResult & {
    interview_id?: string;
  };
  if (typeof row.revealed !== 'boolean') {
    return {
      revealed: false,
      reason: 'Contact details are not available yet.',
      application_status: row.application_status,
    };
  }
  return row;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isInterviewJoinable(
  status: InterviewStatus,
  scheduledAt: string,
): boolean {
  if (status !== 'scheduled') return false;
  const ts = Date.parse(scheduledAt);
  if (!Number.isFinite(ts)) return false;
  // Allow joining 15 minutes before scheduled time. After the scheduled
  // time it remains joinable until the company marks it completed.
  return Date.now() >= ts - 15 * 60 * 1000;
}

export function formatInterviewDateTime(
  iso: string,
  timezone: string = 'Asia/Dhaka',
  locale: string = 'en-US',
): { date: string; time: string } {
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
    const time = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return { date, time };
  } catch {
    return { date: iso, time: '' };
  }
}

export function formatRemainingDecisionTime(seconds: number | null): {
  en: string;
  bn: string;
} {
  if (seconds == null) return { en: '—', bn: '—' };
  if (seconds <= 0) return { en: 'Window closed', bn: 'সময় শেষ' };
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) {
    return {
      en: `${d}d ${h}h remaining`,
      bn: `${d} দিন ${h} ঘণ্টা বাকি`,
    };
  }
  if (h > 0) {
    return {
      en: `${h}h ${m}m remaining`,
      bn: `${h} ঘণ্টা ${m} মিনিট বাকি`,
    };
  }
  return {
    en: `${m}m remaining`,
    bn: `${m} মিনিট বাকি`,
  };
}

export default {
  listCompanyInterviews,
  getCompanyInterview,
  scheduleCompanyInterview,
  completeCompanyInterview,
  cancelCompanyInterview,
  getCompanyInterviewDecisionWindow,
  listUserInterviews,
  getUserInterview,
  getCompanyContact,
  getCompanyContactByInterview,
  isInterviewJoinable,
  formatInterviewDateTime,
  formatRemainingDecisionTime,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_PLATFORM_LABELS,
};
