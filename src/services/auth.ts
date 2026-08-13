
import { supabase, getSupabase, SupabaseConfigurationError } from '../lib/supabase';
import { normalizeAuthError, type NormalizedAuthError } from './authErrors';
import type { Profile, UserRole } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
}

const DEBUG_KEY = 'skillproof.auth.debug';
function debugLog(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(DEBUG_KEY) === '1') {
      
      console.log('[skillproof:auth]', ...args);
    }
  } catch {
    
  }
}

function toNormalized(err: unknown, fallback: string): NormalizedAuthError {
  
  
  
  if (err instanceof SupabaseConfigurationError) {
    return {
      code: 'configuration_invalid',
      message: err.message,
      cause: err,
      status: 0,
    };
  }
  return normalizeAuthError(err, fallback);
}

function rethrow(err: unknown, fallback: string): never {
  throw toNormalized(err, fallback);
}

export async function signUp(email: string, password: string, fullName: string) {
  debugLog('signUp start', { email });
  
  
  try { getSupabase(); } catch (err) { rethrow(err, 'Sign-up failed'); }
  try {
    debugLog('signUp calling Supabase');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      debugLog('signUp error', { code: error.code, message: error.message, status: error.status });
      rethrow(error, 'Sign-up failed');
    }
    debugLog('signUp result', { ok: true, hasSession: !!data.session, hasUser: !!data.user });
    return data;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err && 'cause' in err) {
      throw err;
    }
    rethrow(err, 'Sign-up failed');
  }
}

export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  debugLog('signIn start', { email: normalizedEmail });
  try { getSupabase(); } catch (err) { rethrow(err, 'Sign-in failed'); }
  try {
    debugLog('signIn calling Supabase');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      debugLog('signIn error', { code: error.code, message: error.message, status: error.status });
      rethrow(error, 'Sign-in failed');
    }
    debugLog('signIn result', { ok: true, hasSession: !!data.session, hasUser: !!data.user });
    return data;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err && 'cause' in err) {
      throw err;
    }
    rethrow(err, 'Sign-in failed');
  }
}

export async function signOut() {
  // Use `scope: 'local'` so we only clear THIS client's storage. Both
  // the user and company clients share the same auth.users row, so a
  // global sign-out would also kill the parallel Company session that
  // belongs to a different portal. The full Navbar logout combines
  // signOut() + the company's signOut() + clearLocalStorage().
  // SECURITY HARDENING (Phase 1): also clear the company-side storage
  // key (`skillproof.company.auth`) so a user-side sign-out does not
  // leave a stale company-portal session on the same machine. If the
  // caller is also actively signed in to the company portal under the
  // same auth.users row, the unifiedAuth.unifiedSignOutAll() flow still
  // remains available for the explicit "sign out everywhere" path.
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) rethrow(error, 'Sign-out failed');
  } catch (err) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('skillproof.auth');
        window.localStorage.removeItem('skillproof.company.auth');
      }
    } catch {}
    rethrow(err, 'Sign-out failed');
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('skillproof.auth');
      window.localStorage.removeItem('skillproof.company.auth');
    }
  } catch {}
}

export async function resetPassword(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/reset-password`
        : undefined;
    debugLog('resetPassword start', { email: normalizedEmail, redirectTo });
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    if (error) rethrow(error, 'Password reset failed');
  } catch (err) {
    rethrow(err, 'Password reset failed');
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) rethrow(error, 'Password update failed');
  } catch (err) {
    rethrow(err, 'Password update failed');
  }
}


export async function getAccessToken(opts: { forceRefresh?: boolean } = {}): Promise<string> {
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (err) {
    rethrow(err, 'Your session has expired. Please sign in again.');
  }

  const closeToExpiry =
    !session ||
    !session.expires_at ||
    session.expires_at * 1000 - Date.now() < 60_000;

  if (!session || opts.forceRefresh || closeToExpiry) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) session = data.session;
    } catch {
      
    }
    if (!session) {
      throw normalizeAuthError(
        new Error('session_expired'),
        'Your session has expired. Please sign in again.',
      );
    }
  }
  if (!session.access_token) {
    throw normalizeAuthError(
      new Error('session_missing'),
      'Your session has expired. Please sign in again.',
    );
  }
  return session.access_token;
}

export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) rethrow(error, 'Unable to read session');
    return data.session;
  } catch (err) {
    rethrow(err, 'Unable to read session');
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) rethrow(error, 'Unable to read user');
    return data.user;
  } catch (err) {
    rethrow(err, 'Unable to read user');
  }
}


export async function tryRecoverSession(): Promise<AuthUser | null> {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email ?? '' };
  } catch (err) {
    const norm = normalizeAuthError(err);
    if (norm.code === 'session_expired' || norm.code === 'session_missing') return null;
    return null;
  }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) rethrow(error, 'Unable to load profile');
  return (data as Profile) ?? null;
}

export async function ensureProfile(userId: string, email: string, fullName: string): Promise<Profile> {
  const safeName = fullName && fullName.trim().length > 0 ? fullName : '';
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        email,
        full_name: safeName,
        role: 'user',
        avatar_url: null,
        phone: null,
        bio: null,
        profession: null,
        current_position: null,
        experience_years: 0,
        experience_summary: null,
        education_degree: null,
        education_institution: null,
        education_year: null,
        skills: [],
        resume_url: null,
        github_url: null,
        linkedin_url: null,
        portfolio_url: null,
        website_url: null,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) rethrow(error, 'Unable to create profile');
  return data as Profile;
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<Profile> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw normalizeAuthError(new Error('session_missing'), 'You are signed out.');
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) rethrow(error, 'Profile update failed');
    return data as Profile;
  } catch (err) {
    rethrow(err, 'Profile update failed');
  }
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin' || profile?.role === 'super_admin';
}

export function isSuperAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'super_admin';
}

export function hasRole(profile: Profile | null | undefined, role: UserRole): boolean {
  return profile?.role === role;
}