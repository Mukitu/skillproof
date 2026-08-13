import { supabase as defaultSupabase } from '../lib/supabase';
import { companySupabase as companyClientSupabase } from '../lib/supabaseCompany';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CompanyStatus =
  | 'PENDING_OTP'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type CompanyDocumentType =
  | 'trade_license'
  | 'company_registration'
  | 'business_certificate'
  | 'other';

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, { en: string; bn: string; tone: string }> = {
  PENDING_OTP:      { en: 'Mobile Verification', bn: 'মোবাইল যাচাই চলছে', tone: 'amber' },
  PENDING_APPROVAL: { en: 'Awaiting Review',    bn: 'অনুমোদনের অপেক্ষায়', tone: 'amber' },
  APPROVED:         { en: 'Approved',           bn: 'অনুমোদিত',           tone: 'emerald' },
  REJECTED:         { en: 'Rejected',           bn: 'প্রত্যাখ্যাত',       tone: 'rose' },
  SUSPENDED:        { en: 'Suspended',          bn: 'স্থগিত',             tone: 'rose' },
};

export const COMPANY_DOCUMENT_TYPE_LABELS: Record<CompanyDocumentType, { en: string; bn: string }> = {
  trade_license:         { en: 'Trade License',                bn: 'ট্রেড লাইসেন্স' },
  company_registration:  { en: 'Company Registration Document',bn: 'কোম্পানি নিবন্ধন ডকুমেন্ট' },
  business_certificate:  { en: 'Business Certificate',         bn: 'ব্যবসায়িক সনদপত্র' },
  other:                 { en: 'Other Valid Company Proof',    bn: 'অন্যান্য বৈধ প্রমাণ' },
};

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  category: string;
  description: string | null;
  address: string;
  phone: string;
  email: string;
  contact_name: string | null;
  website_url: string | null;
  logo_path: string | null;
  logo_url: string | null;
  status: CompanyStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  mobile_verified: boolean;
  mobile_verified_at: string | null;
  premium_until: string | null;
  premium_set_at: string | null;
  premium_set_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Pure helper: returns TRUE if `premium_until` is set and strictly in the
 * future. Mirrors the SQL `premium_until > now()` rule.
 */
export function isCompanyPremium(company: Pick<Company, 'premium_until'> | null | undefined): boolean {
  if (!company?.premium_until) return false;
  const ms = Date.parse(company.premium_until);
  if (!Number.isFinite(ms)) return false;
  return ms > Date.now();
}

export interface CompanyProfileUpdate {
  companyName?: string;
  category?: string;
  description?: string | null;
  address?: string;
  phone?: string;
  contactName?: string | null;
  websiteUrl?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
}

export async function updateMyCompanyProfile(update: CompanyProfileUpdate): Promise<Company> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_owner_update_profile', {
    p_company_name: update.companyName ?? null,
    p_category:     update.category     ?? null,
    p_description:  update.description  ?? null,
    p_address:      update.address      ?? null,
    p_phone:        update.phone        ?? null,
    p_contact_name: update.contactName  ?? null,
    p_website_url:  update.websiteUrl   ?? null,
    p_logo_path:    update.logoPath     ?? null,
    p_logo_url:     update.logoUrl      ?? null,
  });
  if (error) throw error;
  return data as Company;
}

const COMPANY_LOGO_BUCKET = 'company-logos';
const ALLOWED_LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export interface CompanyLogoUploadResult {
  path: string;
  url: string;
}

export async function uploadCompanyLogo(companyId: string, file: File): Promise<CompanyLogoUploadResult> {
  if (!file.type || !ALLOWED_LOGO_MIME.has(file.type)) {
    throw new Error('Logo must be a PNG, JPG, JPEG, or WEBP image.');
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Logo must be smaller than 5 MB.');
  }

  const { data: { user } } = await companyClientSupabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = (file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')) || 'png';
  const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png';
  const fileName = `logo-${Date.now()}.${safeExt}`;
  const filePath = `${user.id}/${companyId}/${fileName}`;

  const { error: uploadErr } = await companyClientSupabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  if (uploadErr) throw uploadErr;

  const { data: pub } = companyClientSupabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .getPublicUrl(filePath);
  const publicUrl = pub?.publicUrl ?? null;
  if (!publicUrl) {
    await companyClientSupabase.storage.from(COMPANY_LOGO_BUCKET).remove([filePath]);
    throw new Error('Could not resolve public URL for uploaded logo.');
  }

  return { path: filePath, url: publicUrl };
}

export async function removeCompanyLogo(companyId: string, filePath: string): Promise<void> {
  try {
    await companyClientSupabase.storage.from(COMPANY_LOGO_BUCKET).remove([filePath]);
  } finally {
    await updateMyCompanyProfile({ logoPath: null, logoUrl: null });
  }
}

export async function changeCompanyPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { error } = await companyClientSupabase.rpc('fn_company_change_password', {
    p_new_password: newPassword,
  });
  if (error) throw error;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: CompanyDocumentType;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export interface CompanyWithDocuments {
  company: Company;
  documents: CompanyDocument[];
}

export interface CompanyAdminListRow {
  id: string;
  company_name: string;
  category: string;
  description: string | null;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
  status: CompanyStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  mobile_verified: boolean;
  mobile_verified_at: string | null;
  premium_until: string | null;
  premium_set_at: string | null;
  premium_set_by: string | null;
  document_count: number;
  total_count: number;
}

export interface CompanyDashboardStats {
  active_jobs: number;
  total_applications: number;
  shortlisted: number;
  upcoming_interviews: number;
  applied_today?: number;
  applied_this_week?: number;
  by_status?: Record<string, number>;
}

type Client = SupabaseClient;

function clientFor(accountType: 'company' | 'admin'): Client {
  return accountType === 'company' ? companyClientSupabase : defaultSupabase;
}

/**
 * Look up the `profiles.id` (PK) row matching the current Company session.
 *
 * `notifications.user_id` references `public.profiles(id)`, NOT `auth.users`,
 * so realtime filters on `notifications` need the profile PK — not
 * `auth.uid` and not `companies.user_id`. Returns `null` when there is no
 * signed-in Company or no matching profile row.
 *
 * Safe to call repeatedly (lightweight single-row lookup). The page-level
 * cache should memoize the result so the realtime effect doesn't refetch
 * on every render.
 */
export async function fetchCompanyOwnerProfileId(): Promise<string | null> {
  try {
    const { data: { user } } = await companyClientSupabase.auth.getUser();
    if (!user?.id) return null;
    const { data, error } = await companyClientSupabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('fetchCompanyOwnerProfileId failed', error);
      return null;
    }
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.warn('fetchCompanyOwnerProfileId threw', err);
    return null;
  }
}

export async function fetchMyCompany(accountType: 'company' | 'admin' = 'company'): Promise<Company | null> {
  const client = clientFor(accountType);
  if (accountType === 'company') {
    const { data, error } = await client.rpc('fn_get_company_for_current_user');
    if (error) throw error;
    return (data as Company) ?? null;
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Company) ?? null;
}

export interface CompanySignupPayload {
  email: string;
  password: string;
  companyName: string;
  category: string;
  address: string;
  phone: string;
  contactName?: string;
  websiteUrl?: string;
}

export interface CompanySignupResult {
  company: Company;
  userId: string;
  needsEmailConfirmation: boolean;
}

export async function createCompanyWithProfile(payload: CompanySignupPayload): Promise<CompanySignupResult> {
  const { data, error } = await companyClientSupabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      data: {
        full_name: payload.contactName || payload.companyName,
        is_company_owner: true,
      },
    },
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Account creation failed. Please try again.');
  }

  const { data: company, error: companyErr } = await companyClientSupabase
    .from('companies')
    .insert({
      user_id: data.user.id,
      company_name: payload.companyName,
      category: payload.category,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      contact_name: payload.contactName || null,
      website_url: payload.websiteUrl || null,
      status: 'PENDING_OTP',
      mobile_verified: false,
    })
    .select('*')
    .single();
  if (companyErr) throw companyErr;

  return {
    company: company as Company,
    userId: data.user.id,
    needsEmailConfirmation: !data.session,
  };
}

export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  documentType: CompanyDocumentType,
): Promise<CompanyDocument> {
  const { data: { user } } = await companyClientSupabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const safeExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const fileName = `${documentType}-${Date.now()}.${safeExt}`;
  const filePath = `${user.id}/${companyId}/${fileName}`;

  const { error: uploadErr } = await companyClientSupabase.storage
    .from('company-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  if (uploadErr) throw uploadErr;

  const { data: doc, error: docErr } = await companyClientSupabase
    .from('company_documents')
    .upsert({
      company_id: companyId,
      document_type: documentType,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    }, { onConflict: 'company_id,document_type' })
    .select('*')
    .single();
  if (docErr) {
    await companyClientSupabase.storage.from('company-documents').remove([filePath]);
    throw docErr;
  }

  return doc as CompanyDocument;
}

export async function listMyCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
  const { data, error } = await companyClientSupabase
    .from('company_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data as CompanyDocument[]) ?? [];
}

export async function createCompanySignedDocumentUrl(
  companyId: string,
  filePath: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await defaultSupabase.storage
    .from('company-documents')
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Could not generate document URL.');
  return data.signedUrl;
}

export async function adminListCompanies(opts: {
  search?: string;
  status?: CompanyStatus | null;
  offset?: number;
  limit?: number;
} = {}): Promise<{ rows: CompanyAdminListRow[]; total: number }> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));
  const offset = Math.max(0, opts.offset ?? 0);
  const { data, error } = await defaultSupabase.rpc('fn_admin_list_companies', {
    p_search: opts.search ?? null,
    p_status: opts.status ?? null,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  const rows = ((data as CompanyAdminListRow[]) ?? []) as CompanyAdminListRow[];

  // The SQL function returns total_count on every row, but on a paginated
  // request that lands PAST the end of the result set (or when there are
  // zero matches at this offset), it returns no rows at all — leaving us
  // with total=0 even though other pages have data. Fall back to a cheap
  // count RPC in that edge case so the pager stays accurate.
  let total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  if (rows.length === 0 && offset > 0) {
    try {
      const { data: countData, error: countErr } = await defaultSupabase.rpc('fn_admin_count_companies', {
        p_search: opts.search ?? null,
        p_status: opts.status ?? null,
      });
      if (!countErr && countData != null) {
        total = Number(countData) || 0;
      }
    } catch {
      // Non-fatal — pagination will still work, just without an accurate total.
    }
  }
  return { rows, total };
}

export async function adminGetCompany(companyId: string): Promise<CompanyWithDocuments | null> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_get_company', { p_company_id: companyId });
  if (error) throw error;
  if (!data) return null;
  return data as CompanyWithDocuments;
}

export async function adminApproveCompany(companyId: string): Promise<Company> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_approve_company', { p_company_id: companyId });
  if (error) throw error;
  return data as Company;
}

export async function adminRejectCompany(companyId: string, reason?: string): Promise<Company> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_reject_company', {
    p_company_id: companyId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as Company;
}

export async function adminSuspendCompany(companyId: string, reason?: string): Promise<Company> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_suspend_company', {
    p_company_id: companyId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as Company;
}

export async function adminSetCompanyStatus(
  companyId: string,
  status: CompanyStatus,
  reason?: string,
): Promise<Company> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_set_company_status', {
    p_company_id: companyId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as Company;
}

/**
 * Admin: set / clear a company's premium expiry timestamp.
 * Pass `null` to remove the premium flag entirely.
 *
 * Backend (PostgreSQL function `fn_admin_set_company_premium`) is
 * SECURITY DEFINER and enforces `public.is_admin()`. We never trust
 * the frontend to compute premium status; we always re-read from DB.
 */
export async function adminSetCompanyPremium(
  companyId: string,
  premiumUntil: string | null,
): Promise<Company> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_set_company_premium', {
    p_company_id: companyId,
    p_premium_until: premiumUntil,
  });
  if (error) throw error;
  return data as Company;
}

export async function fetchCompanyDashboardStats(): Promise<CompanyDashboardStats> {
  const zero: CompanyDashboardStats = {
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
      const d = data as Record<string, unknown>;
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
  return zero;
}

export async function markCompanyMobileVerified(companyId: string): Promise<Company> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_mark_mobile_verified', {
    p_company_id: companyId,
  });
  if (error) throw error;
  return data as Company;
}

export async function setOwnCompanyStatus(
  companyId: string,
  status: CompanyStatus,
): Promise<Company> {
  const { data, error } = await companyClientSupabase.rpc('fn_company_set_status', {
    p_company_id: companyId,
    p_status: status,
  });
  if (error) throw error;
  return data as Company;
}

/**
 * Master BDApps toggle.
 *
 * `company_bdapps_required` is the SINGLE source of truth for whether a
 * company needs BDApps subscription + OTP verification before reaching
 * the dashboard.
 *
 *   * FALSE (default) → BDApps is fully bypassed. The company lands
 *     directly on the dashboard with no subscription page, no mobile
 *     number, no OTP form.
 *
 *   * TRUE → subscription + OTP verification are required, but already
 *     completed steps are remembered — the company never re-enters an
 *     already-completed step.
 *
 * The two legacy toggles (`company_otp_verification` and
 * `company_subscription_required`) are kept on the table for backward
 * compatibility but the backend RPCs now delegate to this master value.
 */
export async function fetchCompanyBdappsRequired(): Promise<boolean> {
  try {
    const { data, error } = await companyClientSupabase.rpc('fn_get_company_bdapps_required');
    if (!error && typeof data === 'boolean') return data;
  } catch {}
  try {
    const { data, error } = await defaultSupabase.rpc('fn_get_company_bdapps_required');
    if (!error && typeof data === 'boolean') return data;
  } catch {}
  return false;
}

/**
 * @deprecated Use `fetchCompanyBdappsRequired()` instead.
 *
 * Kept as a compatibility shim during the deprecation window. The
 * backend RPC `fn_get_company_otp_enabled` now delegates to the master
 * toggle, so this returns the same value as the master.
 */
export async function fetchCompanyOtpEnabled(): Promise<boolean> {
  return fetchCompanyBdappsRequired();
}

/**
 * @deprecated Use `fetchCompanyBdappsRequired()` instead.
 *
 * Kept as a compatibility shim during the deprecation window. The
 * backend RPC `fn_get_company_subscription_required` now delegates to
 * the master toggle.
 */
export async function fetchCompanySubscriptionRequired(): Promise<boolean> {
  return fetchCompanyBdappsRequired();
}

export interface CompanyFeatureToggle {
  feature_key: string;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export async function adminListCompanyFeatures(): Promise<CompanyFeatureToggle[]> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_get_company_features');
  if (error) throw error;
  return (data as CompanyFeatureToggle[]) ?? [];
}

export async function adminSetCompanyFeature(
  featureKey: string,
  enabled: boolean,
): Promise<CompanyFeatureToggle> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_set_company_feature', {
    p_feature_key: featureKey,
    p_enabled: enabled,
  });
  if (error) throw error;
  return data as CompanyFeatureToggle;
}

/**
 * Admin: permanently delete a company and its dependent rows.
 *
 * Backend `fn_admin_delete_company(p_company_id UUID)` is SECURITY DEFINER
 * and enforces `public.is_admin()`. It cascades deletion across:
 *   - company_applications
 *   - company_interviews
 *   - company_job_skills + company_jobs
 *   - company_documents (Postgres rows only — storage objects are returned
 *     in `storage_paths` so the caller can remove them via the Storage
 *     SDK; storage cleanup is best-effort and does not roll back the
 *     Postgres deletion if it fails)
 *   - companies
 *   - auth.users (best-effort — the company row delete still succeeds
 *     even if the auth user delete fails)
 *
 * Returns a structured payload describing what was deleted. The frontend
 * uses `storage_paths` to drive the storage cleanup in `AdminCompaniesPage`.
 */
export interface AdminDeleteCompanyResult {
  ok: boolean;
  company_id: string;
  company_name: string;
  user_id: string;
  auth_user_deleted: boolean;
  auth_user_error?: string | null;
  jobs_deleted: number;
  applications_deleted: number;
  documents_deleted: number;
  interviews_deleted: number;
  storage_paths: string[];
}

export async function adminDeleteCompany(
  companyId: string,
): Promise<AdminDeleteCompanyResult> {
  const { data, error } = await defaultSupabase.rpc('fn_admin_delete_company', {
    p_company_id: companyId,
  });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<AdminDeleteCompanyResult> & {
    storage_paths?: unknown;
  };
  return {
    ok: Boolean(raw.ok),
    company_id: raw.company_id ?? companyId,
    company_name: raw.company_name ?? '',
    user_id: raw.user_id ?? '',
    auth_user_deleted: Boolean(raw.auth_user_deleted),
    auth_user_error: raw.auth_user_error ?? null,
    jobs_deleted: Number(raw.jobs_deleted ?? 0),
    applications_deleted: Number(raw.applications_deleted ?? 0),
    documents_deleted: Number(raw.documents_deleted ?? 0),
    interviews_deleted: Number(raw.interviews_deleted ?? 0),
    storage_paths: Array.isArray(raw.storage_paths) ? (raw.storage_paths as string[]) : [],
  };
}

/**
 * Best-effort companion helper: delete a list of storage paths the
 * backend returned via `adminDeleteCompany().storage_paths`. Failures are
 * logged but never thrown because the source-of-truth company row is
 * already gone from Postgres — orphaned storage rows are recoverable but
 * a stuck delete UI is not.
 */
export async function adminDeleteCompanyStoragePaths(paths: string[]): Promise<{
  attempted: number;
  removed: number;
  failed: string[];
}> {
  const attempted = paths.length;
  const failed: string[] = [];
  let removed = 0;
  for (const filePath of paths) {
    try {
      const { error: rmErr } = await defaultSupabase.storage
        .from('company-documents')
        .remove([filePath]);
      if (rmErr) {
        failed.push(filePath);
      } else {
        removed += 1;
      }
    } catch {
      failed.push(filePath);
    }
  }
  return { attempted, removed, failed };
}