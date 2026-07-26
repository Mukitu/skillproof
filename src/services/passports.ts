/**
 * Passport service — view, approve, reject, request, review, renew.
 *
 * Enterprise Skill Passport Core (migration 42) adds:
 *   - per-category eligibility check + listing
 *   - manual request with server-side dedup
 *   - admin review (approve / request_revisions / reject) with level
 *     auto-computation, signature + QR + 2-year expiry
 *   - admin level override with audit trail
 *   - user-driven renewal request + admin renewal decision
 *   - aggregated passport overview (joined payload for the admin review
 *     page's tabbed render)
 *   - active-passport helper for the dashboard
 *
 * Existing `approvePassport` / `rejectPassport` are kept as thin wrappers
 * that delegate to `adminReviewPassport` for backward compatibility.
 */
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { logActivity } from './activity';
import type {
  PassportCategoryEligibility, PassportLevel, PassportLevelHistory,
  PassportOverviewJoined, PassportRenewalHistory, SkillPassport,
} from '../types/database';

// ---------------------------------------------------------------------------
// Existing helpers (kept verbatim for backward compatibility)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Legacy wrappers — delegate to fn_admin_review_passport (migration 42)
// ---------------------------------------------------------------------------

export async function approvePassport(id: string, feedback: string, digitalSignature: string): Promise<SkillPassport> {
  const result = await adminReviewPassport({
    passportId: id,
    overallScore: 75,
    feedback,
    decision: 'approve',
  });
  // digitalSignature param is honored by the legacy contract but the new RPC
  // computes its own signature server-side; we keep the parameter so callers
  // don't have to change.
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

// ---------------------------------------------------------------------------
// Enterprise eligibility + request flow
// ---------------------------------------------------------------------------

/**
 * Returns the per-category eligibility snapshot for the current user.
 * Used by the "Request Passport" card on the user passport page.
 */
export async function listEligibleCategoriesForUser(): Promise<PassportCategoryEligibility[]> {
  const { data, error } = await supabase.rpc('fn_list_my_passport_eligibility');
  if (error) throw error;
  return (data as PassportCategoryEligibility[]) ?? [];
}

/**
 * Manual passport request for the given main category. Server enforces
 * dedup — re-requesting an existing pending_approval passport returns the
 * existing row instead of erroring.
 */
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

/**
 * Eligibility check for one (user, category) pair. Returns the live count,
 * average, and is_eligible boolean.
 */
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

// ---------------------------------------------------------------------------
// Admin review (approve / request_revisions / reject)
// ---------------------------------------------------------------------------

export interface AdminReviewPassportParams {
  passportId: string;
  overallScore: number;     // 0..100 (required)
  feedback: string;         // required
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

/**
 * Manual level override for an active passport. Writes a row to
 * `passport_level_history` (audit) and updates the passport.
 */
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

/** Level-history audit rows for a passport (newest first). */
export async function listPassportLevelHistory(passportId: string): Promise<PassportLevelHistory[]> {
  const { data, error } = await supabase
    .from('passport_level_history')
    .select('*')
    .eq('passport_id', passportId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data as PassportLevelHistory[]) ?? [];
}

// ---------------------------------------------------------------------------
// Renewal flow
// ---------------------------------------------------------------------------

/**
 * User requests renewal of an active (or expired) passport.
 * Server inserts a row in passport_renewal_history with decision = NULL
 * and flips passports.renewal_status = 'requested'.
 */
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

/** All renewal requests for the current user (history). */
export async function listMyPassportRenewals(): Promise<PassportRenewalHistory[]> {
  const { data, error } = await supabase.rpc('fn_user_list_my_passport_renewals');
  if (error) throw error;
  return (data as PassportRenewalHistory[]) ?? [];
}

/** Admin queue — every renewal row (optionally only pending). */
export async function getAllPassportRenewals(pendingOnly = false): Promise<PassportRenewalHistory[]> {
  const { data, error } = await supabase.rpc('fn_admin_list_passport_renewals', {
    p_pending_only: pendingOnly,
  });
  if (error) throw error;
  return (data as PassportRenewalHistory[]) ?? [];
}

/** Admin decision on a renewal: 'renewed' (sets new expiry + active) or 'rejected'. */
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

// ---------------------------------------------------------------------------
// Aggregated overview (admin review page)
// ---------------------------------------------------------------------------

/**
 * Single round-trip payload for the tabbed admin review page.
 * Joins passport + profile + AI career + educations + experiences +
 * user skills + verifications + level history + renewal history.
 */
export async function getPassportOverview(passportId: string): Promise<PassportOverviewJoined | null> {
  const { data, error } = await supabase.rpc('fn_get_passport_overview', {
    p_passport_id: passportId,
  });
  if (error) throw error;
  return (data as PassportOverviewJoined | null);
}

// ---------------------------------------------------------------------------
// Dashboard helpers
// ---------------------------------------------------------------------------

/**
 * Returns the canonical "most relevant" passport for the dashboard card.
 * Priority: active (not expired) > pending_approval > most recent.
 */
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

/**
 * True if the passport's expiry_date has passed. Pure helper so we don't
 * have to add a stored computed column on the schema.
 */
export function isPassportExpired(p: SkillPassport): boolean {
  if (!p.expiry_date) return false;
  return new Date(p.expiry_date).getTime() < Date.now();
}

/**
 * Days until expiry_date (negative if expired). Returns null when there
 * is no expiry_date (e.g. legacy / pending_approval passports).
 */
export function daysUntilPassportExpiry(p: SkillPassport): number | null {
  if (!p.expiry_date) return null;
  const diff = new Date(p.expiry_date).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}