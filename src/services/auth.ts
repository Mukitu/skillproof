
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

/**
 * SkillProof password policy. Mirrors the Supabase default (8+ chars)
 * plus a light complexity requirement so accounts are not trivially
 * brute-forced.
 */
export function validatePasswordPolicy(pwd: string): { ok: true } | { ok: false; reason: string } {
  const v = (pwd ?? '').toString();
  if (v.length < 8) {
    return { ok: false, reason: 'Password must be at least 8 characters.' };
  }
  if (v.length > 128) {
    return { ok: false, reason: 'Password must be 128 characters or fewer.' };
  }
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) {
    return {
      ok: false,
      reason: 'Password must contain both letters and numbers.',
    };
  }
  return { ok: true };
}

/**
 * Change Password for the currently signed-in user.
 *
 * Flow:
 *  1. Re-authenticate with the current password (sign in with the same
 *     email + current password). This is the only safe way to verify
 *     the current password without breaking the existing session.
 *  2. If the re-auth succeeds, call updateUser({ password: newPassword }).
 *  3. The new password is validated against the SkillProof policy
 *     client-side AND by Supabase Auth on the server.
 *
 * On success, the Supabase session is kept (we do NOT sign the user
 * out) so the rest of the app continues to work. The session may
 *  trigger a USER_UPDATED event automatically.
 */
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw normalizeAuthError(
      new Error('all_fields_required'),
      'All password fields are required.',
    );
  }
  if (newPassword !== confirmPassword) {
    throw normalizeAuthError(
      new Error('passwords_mismatch'),
      'New passwords do not match.',
    );
  }
  if (currentPassword === newPassword) {
    throw normalizeAuthError(
      new Error('same_password'),
      'New password must differ from the current password.',
    );
  }
  const policy: { ok: true } | { ok: false; reason: string } = validatePasswordPolicy(newPassword);
  if (policy.ok !== true) {
    throw normalizeAuthError(new Error('weak_password'), policy.reason);
  }

  // 1. Verify current password by signing in with the same email.
  const authUser = await getCurrentUser();
  if (!authUser || !authUser.email) {
    throw normalizeAuthError(
      new Error('session_missing'),
      'You are signed out. Please sign in again.',
    );
  }
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  });
  if (reauthErr) {
    // signInWithPassword already normalises to invalid_credentials.
    throw normalizeAuthError(
      reauthErr,
      'Current password is incorrect.',
    );
  }

  // 2. Update the password. The session is preserved.
  await updatePassword(newPassword);
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
  // SECURITY: profiles.email is the permanent account email set at
  // signup. We INSERT a new row if one does not exist, but we MUST
  // NOT overwrite the email on conflict — the trigger
  // fn_block_profiles_email_change will reject the UPDATE anyway.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) {
    // Only patch the missing non-email fields if needed.
    const { data: row, error } = await supabase
      .from('profiles')
      .update({ full_name: safeName })
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) rethrow(error, 'Unable to load profile');
    return row as Profile;
  }
  const { data, error } = await supabase
    .from('profiles')
    .insert({
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
    })
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
    // SECURITY: profiles.email is permanently bound to the authenticated
    // account email. Strip any client-side attempt to overwrite it. The
    // DB trigger fn_block_profiles_email_change would also reject this,
    // but stripping client-side gives a clean error without a round-trip.
    const safePatch: Partial<Profile> = { ...(patch as Partial<Profile>) };
    if ('email' in safePatch) {
      delete (safePatch as { email?: string }).email;
    }
    if ('user_id' in safePatch) {
      delete (safePatch as { user_id?: string }).user_id;
    }
    if ('id' in safePatch) {
      delete (safePatch as { id?: string }).id;
    }
    if ('role' in safePatch) {
      delete (safePatch as { role?: string }).role;
    }
    if ('role_status' in safePatch) {
      delete (safePatch as { role_status?: string }).role_status;
    }
    if ('is_suspended' in safePatch) {
      delete (safePatch as { is_suspended?: boolean }).is_suspended;
    }
    if (Object.keys(safePatch).length === 0) {
      // Nothing to update — return current state.
      const cur = await fetchProfile(user.id);
      if (!cur) throw normalizeAuthError(new Error('profile_missing'), 'Profile not found.');
      return cur;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(safePatch)
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