import { companySupabase } from '../lib/supabaseCompany';
import { supabase } from '../lib/supabase';

export type CandidateInviteStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface CandidateInviteCreateResult {
  result: 'ok' | 'forbidden' | 'invalid' | 'job_not_found' | 'candidate_not_found';
  invite_id?: string;
  status?: CandidateInviteStatus;
  already_pending?: boolean;
}

export interface CompanyCandidateInvite {
  invite_id: string;
  job_id: string;
  job_title: string;
  company_id: string;
  company_name: string;
  candidate_profile_id: string;
  candidate_full_name: string;
  candidate_avatar_url: string | null;
  status: CandidateInviteStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  total_count?: number;
}

export async function createCandidateInvite(
  jobId: string,
  candidateProfileId: string,
  message?: string | null,
): Promise<CandidateInviteCreateResult> {
  const { data, error } = await companySupabase.rpc(
    'fn_company_create_candidate_invite',
    {
      p_job_id: jobId,
      p_candidate_profile_id: candidateProfileId,
      p_message: (message ?? '').trim() || null,
    },
  );
  if (error) throw error;
  return (data as CandidateInviteCreateResult) ?? { result: 'invalid' };
}

export async function listCompanyInvites(
  status?: CandidateInviteStatus | null,
  limit = 100,
  offset = 0,
): Promise<{ rows: CompanyCandidateInvite[]; total: number }> {
  const { data, error } = await companySupabase.rpc(
    'fn_company_list_candidate_invites',
    {
      p_status: status ?? null,
      p_limit: limit,
      p_offset: offset,
    },
  );
  if (error) throw error;
  const rows = ((data as CompanyCandidateInvite[]) ?? []) as CompanyCandidateInvite[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export interface MyCandidateInvite extends CompanyCandidateInvite {
  invite_message: string | null;
}

/**
 * Candidate-side: list invites addressed to the current user. Uses the
 * standard supabase client (not the company client) because the caller
 * is on the user portal, and RLS still restricts reads to invites
 * where candidate_profile_id = profiles.id of auth.uid().
 */
export async function listMyInvites(
  status?: CandidateInviteStatus | null,
  limit = 100,
  offset = 0,
): Promise<{ rows: CompanyCandidateInvite[]; total: number }> {
  let q = supabase
    .from('company_candidate_invites')
    .select(
      'id, job_id, status, message, created_at, responded_at, candidate_profile_id, company_id, job:company_jobs(title), company:companies(company_name, logo_url), candidate:profiles!candidate_profile_id(full_name, avatar_url)',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + Math.max(limit - 1, 0));

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;

  type RawRow = {
    id: string;
    job_id: string;
    status: CandidateInviteStatus;
    message: string | null;
    created_at: string;
    responded_at: string | null;
    candidate_profile_id: string;
    company_id: string;
    job: { title: string }[] | null;
    company: { company_name: string; logo_url: string | null }[] | null;
    candidate: { full_name: string; avatar_url: string | null }[] | null;
  };

  const rows = ((data ?? []) as RawRow[]).map<CompanyCandidateInvite>((r) => ({
    invite_id: r.id,
    job_id: r.job_id,
    job_title: r.job?.[0]?.title ?? '',
    company_id: r.company_id,
    company_name: r.company?.[0]?.company_name ?? '',
    candidate_profile_id: r.candidate_profile_id,
    candidate_full_name: r.candidate?.[0]?.full_name ?? '',
    candidate_avatar_url: r.candidate?.[0]?.avatar_url ?? null,
    status: r.status,
    message: r.message,
    created_at: r.created_at,
    responded_at: r.responded_at,
  }));

  return { rows, total: rows.length };
}

export async function respondToMyInvite(
  inviteId: string,
  decision: 'accepted' | 'declined',
): Promise<{ ok: boolean; status?: CandidateInviteStatus }> {
  const { data, error } = await supabase.rpc('fn_user_respond_to_invite', {
    p_invite_id: inviteId,
    p_decision: decision,
  });
  if (error) throw error;
  return (data as { ok: boolean; status?: CandidateInviteStatus }) ?? { ok: false };
}

export async function withdrawCompanyInvite(inviteId: string): Promise<{ ok: boolean }> {
  const { data, error } = await companySupabase.rpc('fn_company_withdraw_invite', {
    p_invite_id: inviteId,
  });
  if (error) throw error;
  return (data as { ok: boolean }) ?? { ok: false };
}