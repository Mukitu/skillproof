import { companySupabase } from '../lib/supabaseCompany';
import { fetchMyCompany } from './companies';
import type { Company } from './companies';

export type CompanyAuthErrorCode =
  | 'invalid_credentials'
  | 'session_expired'
  | 'session_missing'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network_error'
  | 'configuration_invalid'
  | 'company_not_found'
  | 'account_type_mismatch'
  | 'unknown';

export interface CompanyAuthError {
  code: CompanyAuthErrorCode;
  message: string;
}

function normalizeAuthError(err: any, fallback: string): CompanyAuthError {
  if (!err) return { code: 'unknown', message: fallback };
  const msg: string = (err.message ?? '').toString();
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return { code: 'invalid_credentials', message: 'Invalid email or password.' };
  }
  if (lower.includes('email not confirmed')) {
    return { code: 'email_not_confirmed', message: 'Please verify your email first.' };
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return { code: 'rate_limited', message: 'Too many attempts. Please wait and try again.' };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return { code: 'network_error', message: 'Network error. Please check your connection.' };
  }
  return { code: 'unknown', message: msg || fallback };
}

export async function getCompanySession() {
  const { data, error } = await companySupabase.auth.getSession();
  if (error) throw normalizeAuthError(error, 'Unable to read session');
  return data.session;
}

export async function getCompanyAuthUser() {
  const { data, error } = await companySupabase.auth.getUser();
  if (error) throw normalizeAuthError(error, 'Unable to read user');
  return data.user;
}

export async function tryRecoverCompanySession(): Promise<{ id: string; email: string } | null> {
  try {
    const session = await getCompanySession();
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email ?? '' };
  } catch {
    return null;
  }
}

export async function companySignIn(email: string, password: string): Promise<{ error: CompanyAuthError | null }> {
  try {
    const { error } = await companySupabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: normalizeAuthError(error, 'Sign-in failed') };
    return { error: null };
  } catch (err: any) {
    return { error: normalizeAuthError(err, 'Sign-in failed') };
  }
}

export async function companySignOut(): Promise<{ error: CompanyAuthError | null }> {
  // Use `scope: 'local'` so we only clear THIS client's storage. A
  // `scope: 'global'` sign-out would also invalidate the parallel User
  // session's refresh token (they share the same auth.users row).
  try {
    const { error } = await companySupabase.auth.signOut({ scope: 'local' });
    if (error) return { error: normalizeAuthError(error, 'Sign-out failed') };
  } catch (err: any) {
    return { error: normalizeAuthError(err, 'Sign-out failed') };
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('skillproof.company.auth');
    }
  } catch {}
  return { error: null };
}

export async function fetchCompanyForCurrentUser(): Promise<Company | null> {
  return fetchMyCompany('company');
}