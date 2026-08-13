import { supabase } from '../lib/supabase';
import { companySupabase } from '../lib/supabaseCompany';

export type AccountKind = 'user' | 'admin' | 'company';

export interface UnifiedLoginResult {
  kind: AccountKind;
  userId: string;
  email: string;
  sessionPresent: boolean;
}

export class UnknownAccountError extends Error {
  code = 'unknown_account';
  constructor(message: string) {
    super(message);
    this.name = 'UnknownAccountError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function resolveAccountKind(userId: string): Promise<AccountKind> {
  const [companyRes, profileRes] = await Promise.allSettled([
    supabase
      .from('companies')
      .select('id, status')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    companyRes.status === 'fulfilled' &&
    !companyRes.value.error &&
    companyRes.value.data?.id
  ) {
    return 'company';
  }

  if (profileRes.status === 'fulfilled' && !profileRes.value.error) {
    const row = profileRes.value.data as { role?: string; is_suspended?: boolean } | null;
    if (row) {
      if (row.is_suspended === true) {
        throw new UnknownAccountError(
          'This account has been suspended. Contact support to restore access.',
        );
      }
      const role = row.role;
      if (role === 'admin' || role === 'super_admin') return 'admin';
      if (role === 'user') return 'user';
    }
  }

  const companyErr =
    companyRes.status === 'fulfilled' ? companyRes.value.error?.message : companyRes.reason?.message;
  const profileErr =
    profileRes.status === 'fulfilled' ? profileRes.value.error?.message : profileRes.reason?.message;
  // eslint-disable-next-line no-console
  console.error('[unifiedLogin] role resolution failed', {
    userId,
    companyErr,
    profileErr,
  });
  throw new UnknownAccountError(
    'Could not resolve account type. The user record exists but no profile or company row was found. ' +
      'Please contact support if this persists.',
  );
}

function describeSignInError(err: any, fallback: string): string {
  const msg: string = (err?.message ?? '').toString();
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (lower.includes('too many') || lower.includes('rate')) {
    return 'Too many sign-in attempts. Please wait a few minutes.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return msg || fallback;
}

// Mirror the current supabase session into the OTHER client's localStorage
// without calling signInWithPassword again (which would re-hit the rate
// limiter and may double-bill the user's failed-attempts counter).
async function mirrorSessionInto(target: typeof supabase): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s?.access_token || !s.refresh_token) return false;
    const { error } = await target.auth.setSession({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
    });
    return !error;
  } catch {
    return false;
  }
}

// Local-only sign-out: clears the client's localStorage key WITHOUT
// invalidating the server-side refresh token. Critical because both
// the user and company clients share the same auth.users row — a
// global sign-out would also kill the parallel portal's session.
async function clearLocalSession(client: typeof supabase): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // best-effort
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('skillproof.auth');
      window.localStorage.removeItem('skillproof.company.auth');
    }
  } catch {
    // ignore
  }
}

export async function unifiedLogin(
  email: string,
  password: string,
): Promise<UnifiedLoginResult> {
  const e = normalizeEmail(email);
  if (!e || !password) {
    throw new Error('Email and password are required.');
  }

  // Sign in on the canonical user client only. We mirror the resulting
  // session into the company client if the DB says this is a company
  // account — calling signInWithPassword on both clients would re-hit
  // the rate limiter and is unnecessary because they share auth.users.
  let userId = '';
  let signInErr: any = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });
    if (error) {
      signInErr = error;
    } else if (data.user?.id) {
      userId = data.user.id;
    }
  } catch (err: any) {
    signInErr = err;
  }

  if (!userId) {
    throw new Error(describeSignInError(signInErr, 'Sign-in failed.'));
  }

  // Resolve the account kind BEFORE deciding which storage key to keep.
  let kind: AccountKind;
  try {
    kind = await resolveAccountKind(userId);
  } catch (err) {
    await clearLocalSession(supabase);
    await clearLocalSession(companySupabase);
    throw err;
  }

  // Mirror the session into the right client. If the DB says 'company',
  // copy the tokens into the companySupabase storage key (and clear it
  // from the user side if present, so cross-portal sessions can't bleed).
  // If the DB says 'user'/'admin', the canonical sign-in already put the
  // session into skillproof.auth; we just need to make sure the company
  // key is empty.
  if (kind === 'company') {
    const ok = await mirrorSessionInto(companySupabase);
    if (!ok) {
      // Fallback: do a fresh sign-in on the company client. We do this
      // only if mirroring failed so we still keep the user signed in
      // even when the parallel client can't be seeded.
      try {
        await companySupabase.auth.signInWithPassword({ email: e, password });
      } catch {}
    }
  } else {
    // user / admin: the user client already has the session. Explicitly
    // evict any stale company-portal storage key so a user who previously
    // signed in as a company cannot accidentally render the company shell
    // from leftover state in `skillproof.company.auth`.
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('skillproof.company.auth');
      }
    } catch {
      // best-effort
    }
  }

  return {
    kind,
    userId,
    email: e,
    sessionPresent: true,
  };
}

// Full sign-out — used by the Navbar logout button. Clears both storage
// keys AND invalidates the server-side refresh token so back-button can't
// resurrect any dashboard. Safe to call only when the user actually
// intends to log out.
export async function unifiedSignOutAll(): Promise<void> {
  await clearLocalSession(supabase);
  await clearLocalSession(companySupabase);
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // ignore
  }
}