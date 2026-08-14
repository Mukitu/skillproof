
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { logActivity } from './activity';
import type {
  PassportCategoryEligibility, PassportLevel, PassportLevelHistory,
  PassportOverviewJoined, PassportRenewalHistory, SetPrimaryPassportResult, SkillPassport,
} from '../types/database';





export async function getMyPassports(): Promise<SkillPassport[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('skill_passports')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as SkillPassport[]) ?? [];
}

export async function getAllPassports(): Promise<SkillPassport[]> {
  const { data, error } = await supabase
    .from('skill_passports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as SkillPassport[]) ?? [];
}

export async function getPassportByNumber(num: string): Promise<SkillPassport | null> {
  const { data, error } = await supabase
    .from('skill_passports')
    .select('*')
    .eq('passport_number', num)
    .maybeSingle();
  if (error) throw error;
  return (data as SkillPassport) ?? null;
}

export async function getPassportById(id: string): Promise<SkillPassport | null> {
  const { data, error } = await supabase
    .from('skill_passports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as SkillPassport) ?? null;
}





export async function approvePassport(id: string, feedback: string, digitalSignature: string): Promise<SkillPassport> {
  const result = await adminReviewPassport({
    passportId: id,
    overallScore: 75,
    feedback,
    decision: 'approve',
  });
  
  
  
  void digitalSignature;
  return result;
}

export async function rejectPassport(id: string, reason: string): Promise<SkillPassport> {
  return adminReviewPassport({
    passportId: id,
    overallScore: 0,
    feedback: reason,
    decision: 'reject',
  });
}






export async function listEligibleCategoriesForUser(): Promise<PassportCategoryEligibility[]> {
  const { data, error } = await supabase.rpc('fn_list_my_passport_eligibility');
  if (error) throw error;
  return (data as PassportCategoryEligibility[]) ?? [];
}


export async function requestPassportManually(
  categoryId: string,
  motivation: string,
): Promise<SkillPassport> {
  const { data, error } = await supabase.rpc('fn_user_request_passport', {
    p_category_id: categoryId,
    p_motivation: motivation,
  });
  if (error) throw error;
  const row = data as SkillPassport;
  void logActivity('passport.requested', `Requested passport ${row.passport_number}`, {
    entityType: 'skill_passport',
    entityId: row.id,
    metadata: { category_id: categoryId, passport_number: row.passport_number },
  });
  return row;
}


export async function checkPassportEligibility(categoryId: string): Promise<{
  passed_count: number; average_marks: number; is_eligible: boolean;
}> {
  const { data, error } = await supabase.rpc('fn_check_passport_eligibility', {
    p_category_id: categoryId,
  });
  if (error) throw error;
  const row = (data as Array<{ passed_count: number; average_marks: number; is_eligible: boolean }> | null) ?? [];
  if (!row.length) return { passed_count: 0, average_marks: 0, is_eligible: false };
  return {
    passed_count: Number(row[0].passed_count ?? 0),
    average_marks: Number(row[0].average_marks ?? 0),
    is_eligible: Boolean(row[0].is_eligible),
  };
}





export interface AdminReviewPassportParams {
  passportId: string;
  overallScore: number;     
  feedback: string;         
  decision: 'approve' | 'reject' | 'request_revisions';
}

export async function adminReviewPassport(params: AdminReviewPassportParams): Promise<SkillPassport> {
  const { data, error } = await supabase.rpc('fn_admin_review_passport', {
    p_passport_id: params.passportId,
    p_overall_score: Math.max(0, Math.min(100, Math.round(params.overallScore))),
    p_feedback: params.feedback,
    p_decision: params.decision,
  });
  if (error) throw error;
  return data as SkillPassport;
}


export async function adminOverridePassportLevel(params: {
  passportId: string;
  newLevel: PassportLevel;
  reason: string;
}): Promise<SkillPassport> {
  const { data, error } = await supabase.rpc('fn_admin_override_passport_level', {
    p_passport_id: params.passportId,
    p_new_level: params.newLevel,
    p_reason: params.reason,
  });
  if (error) throw error;
  return data as SkillPassport;
}


export async function listPassportLevelHistory(passportId: string): Promise<PassportLevelHistory[]> {
  const { data, error } = await supabase
    .from('passport_level_history')
    .select('*')
    .eq('passport_id', passportId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data as PassportLevelHistory[]) ?? [];
}






export async function requestPassportRenewal(
  passportId: string,
  notes: string,
): Promise<PassportRenewalHistory> {
  const { data, error } = await supabase.rpc('fn_user_request_passport_renewal', {
    p_passport_id: passportId,
    p_notes: notes,
  });
  if (error) throw error;
  return data as PassportRenewalHistory;
}


export async function listMyPassportRenewals(): Promise<PassportRenewalHistory[]> {
  const { data, error } = await supabase.rpc('fn_user_list_my_passport_renewals');
  if (error) throw error;
  return (data as PassportRenewalHistory[]) ?? [];
}


export async function getAllPassportRenewals(pendingOnly = false): Promise<PassportRenewalHistory[]> {
  const { data, error } = await supabase.rpc('fn_admin_list_passport_renewals', {
    p_pending_only: pendingOnly,
  });
  if (error) throw error;
  return (data as PassportRenewalHistory[]) ?? [];
}


export async function adminReviewPassportRenewal(params: {
  renewalId: string;
  decision: 'renewed' | 'rejected';
  notes: string;
}): Promise<PassportRenewalHistory> {
  const { data, error } = await supabase.rpc('fn_admin_review_passport_renewal', {
    p_renewal_id: params.renewalId,
    p_decision: params.decision,
    p_notes: params.notes,
  });
  if (error) throw error;
  return data as PassportRenewalHistory;
}






export async function getPassportOverview(passportId: string): Promise<PassportOverviewJoined | null> {
  const { data, error } = await supabase.rpc('fn_get_passport_overview', {
    p_passport_id: passportId,
  });
  if (error) throw error;
  return (data as PassportOverviewJoined | null);
}






export async function setPrimaryPassport(passportId: string): Promise<SetPrimaryPassportResult> {
  const { data, error } = await supabase.rpc('fn_set_primary_passport', {
    p_passport_id: passportId,
  });
  if (error) {
    return { ok: false, code: 'rpc_error', error: error.message };
  }
  return (data as SetPrimaryPassportResult) ?? { ok: false, code: 'unknown', error: 'no_response' };
}

export async function getActivePassportForUser(): Promise<SkillPassport | null> {
  const all = await getMyPassports();
  if (!all.length) return null;
  const now = Date.now();
  const activeNonExpired = all.find(
    (p) => p.status === 'active' && (!p.expiry_date || new Date(p.expiry_date).getTime() > now),
  );
  if (activeNonExpired) return activeNonExpired;
  const pending = all.find((p) => p.status === 'pending_approval');
  if (pending) return pending;
  return all[0];
}


export function isPassportExpired(p: SkillPassport): boolean {
  if (!p.expiry_date) return false;
  return new Date(p.expiry_date).getTime() < Date.now();
}


export function daysUntilPassportExpiry(p: SkillPassport): number | null {
  if (!p.expiry_date) return null;
  const diff = new Date(p.expiry_date).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}





export type PassportPrivacyKey =
  | 'public_employer_view'
  | 'show_assessment_history'
  | 'show_ai_career_profile'
  | 'show_evidence';

export type PassportPrivacySettings = Record<PassportPrivacyKey, boolean>;

const PRIVACY_DEFAULTS: PassportPrivacySettings = {
  public_employer_view: true,
  show_assessment_history: true,
  show_ai_career_profile: true,
  show_evidence: true,
};


export function normalizePassportPrivacy(
  raw: Record<string, boolean> | null | undefined,
): PassportPrivacySettings {
  const out: PassportPrivacySettings = { ...PRIVACY_DEFAULTS };
  if (!raw) return out;
  for (const key of Object.keys(PRIVACY_DEFAULTS) as PassportPrivacyKey[]) {
    const v = raw[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  return out;
}


export function isPublicEmployerViewEnabled(p: SkillPassport): boolean {
  return normalizePassportPrivacy(p.privacy_settings).public_employer_view;
}


export async function updatePassportPrivacy(
  patch: Partial<PassportPrivacySettings>,
): Promise<PassportPrivacySettings> {
  const payload: Record<string, boolean> = {};
  for (const key of Object.keys(PRIVACY_DEFAULTS) as PassportPrivacyKey[]) {
    if (patch[key] !== undefined) payload[key] = patch[key]!;
  }
  const { data, error } = await supabase.rpc('fn_update_passport_privacy', {
    p_settings: payload,
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'settings' in data) {
    return normalizePassportPrivacy((data as { settings: Record<string, boolean> }).settings);
  }
  return normalizePassportPrivacy(payload);
}





import type { ProfilePublicEvidence, PublicEvidenceType } from '../types/database';

export async function listMyPublicEvidence(): Promise<ProfilePublicEvidence[]> {
  const { data, error } = await supabase
    .from('profile_public_evidence')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data as ProfilePublicEvidence[]) ?? [];
}

export async function addPublicEvidence(
  title: string,
  url: string,
  type: PublicEvidenceType = 'other',
): Promise<ProfilePublicEvidence> {
  if (!/^https?:\/\//.test(url)) throw new Error('url_must_start_with_http');
  const { data, error } = await supabase
    .from('profile_public_evidence')
    .insert({ title: title.trim(), url, type })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProfilePublicEvidence;
}

export async function removePublicEvidence(id: string): Promise<void> {
  const { error } = await supabase
    .from('profile_public_evidence')
    .delete()
    .eq('id', id);
  if (error) throw error;
}