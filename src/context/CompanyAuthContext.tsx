import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  companySignIn,
  companySignOut,
  tryRecoverCompanySession,
  fetchCompanyForCurrentUser,
  type CompanyAuthError,
} from '../services/companyAuth';
import { companySupabase } from '../lib/supabaseCompany';
import { isCompanyPremium, type Company } from '../services/companies';

/**
 * Cross-auth guard for the Company portal.
 *
 * Supabase `auth.users` is shared between the User, Admin, and Company
 * clients — only the localStorage keys differ. After a Company-side
 * sign-in completes, we look up the corresponding `profiles` row and
 * refuse the sign-in if the account has User (`role = 'user'`) or
 * Admin (`role = 'admin' / 'super_admin'`) credentials. Company owners
 * must sign in here; everyone else goes through `/login`.
 */
async function detectNonCompanyAccount(userId: string): Promise<boolean> {
  try {
    const { data, error } = await companySupabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {

      console.warn('Non-company profile probe failed', error);
      return false;
    }
    const role = (data as { role?: string } | null)?.role;
    return role === 'user' || role === 'admin' || role === 'super_admin';
  } catch (err) {
    console.warn('Non-company profile probe threw', err);
    return false;
  }
}

interface CompanyAuthContextValue {
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isSuspended: boolean;
  isAwaitingOtp: boolean;
  /**
   * Real-time premium flag, derived from `company.premium_until > now()`.
   * Backend is the source of truth — this value reflects whatever the DB
   * returned on the most recent fetch (no caching beyond the loaded row).
   */
  isPremium: boolean;
  signIn: (email: string, password: string) => Promise<{ error: CompanyAuthError | null }>;
  signOut: () => Promise<{ error: CompanyAuthError | null }>;
  refresh: () => Promise<void>;
  initError: CompanyAuthError | null;
}

const CompanyAuthContext = createContext<CompanyAuthContextValue | undefined>(undefined);

export const CompanyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<CompanyAuthError | null>(null);

  const inflight = useRef<Promise<Company | null> | null>(null);

  const syncCompany = useCallback(async (): Promise<Company | null> => {
    if (inflight.current) {
      try { await inflight.current; } catch {}
    }
    const work = (async () => {
      return await fetchCompanyForCurrentUser();
    })();
    inflight.current = work;
    try {
      return await work;
    } finally {
      if (inflight.current === work) inflight.current = null;
    }
  }, []);

  // Stable-comparison helper: returns true if `next` is materially
  // different from `prev` (any relevant field changed). Uses a shallow
  // key-by-key check so identity-only updates do NOT trigger a context
  // re-render.
  const companiesEqual = useCallback((a: Company | null, b: Company | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.id !== b.id) return false;
    if (a.status !== b.status) return false;
    if (a.premium_until !== b.premium_until) return false;
    if (a.company_name !== b.company_name) return false;
    if (a.email !== b.email) return false;
    if (a.logo_url !== b.logo_url) return false;
    return true;
  }, []);

  const loadCurrentCompany = useCallback(async () => {
    const session = await tryRecoverCompanySession();
    if (!session) {
      // Hard-clear ONLY when we genuinely don't have a session AND we
      // never had a company. If we already have a valid company in state,
      // a transient session miss (e.g. mid TOKEN_REFRESHED) must NOT clear
      // it — doing so would flicker `isApproved` and unmount every
      // component gated on it (e.g. the "Decision window" banner).
      setCompany((prev) => (prev ? prev : null));
      return;
    }
    try {
      const c = await syncCompany();
      if (!c) {
        // Stale Company session — the auth.users row exists but the
        // matching `companies` row is missing. Wipe ONLY the company
        // storage key (do NOT sign out globally — that would also kill
        // a parallel User session on the same auth.users row and bounce
        // the user to /login).
        try {
          await companySupabase.auth.signOut({ scope: 'local' });
        } catch {}
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('skillproof.company.auth');
          }
        } catch {}
        setCompany(null);
        return;
      }
      // Only update `company` if the fields visible to consumers actually
      // changed. This prevents context re-renders when realtime refresh
      // passes back the same row.
      setCompany((prev) => (companiesEqual(prev, c) ? (prev ?? c) : c));
    } catch (err) {
      console.error('Company sync failed', err);
      // Same guard: keep the previous company on transient error so the
      // Decision window banner and other isApproved-gated UI do not flicker.
      setCompany((prev) => (prev ? prev : null));
    }
  }, [syncCompany, companiesEqual]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadCurrentCompany();
      } catch (err: any) {
        if (mounted) {
          setInitError({
            code: 'unknown',
            message: err?.message ?? 'Failed to initialize',
          } as CompanyAuthError);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: sub } = companySupabase.auth.onAuthStateChange(async (event) => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await loadCurrentCompany();
        } else if (event === 'SIGNED_OUT') {
          setCompany(null);
        } else if (event === 'INITIAL_SESSION') {
          await loadCurrentCompany();
        }
      } catch (err) {
        console.error('Company auth state change failed', err);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadCurrentCompany]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await companySignIn(email, password);
    if (result.error) return result;

    // Cross-auth guard: if the same auth.users row has a Profile with a
    // User or Admin role, this account belongs to a different portal.
    // Roll the session back so the user isn't half-signed in.
    try {
      const { data: userData } = await companySupabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId && (await detectNonCompanyAccount(userId))) {
        try { await companySignOut(); } catch {  }
        setCompany(null);
        return {
          error: {
            code: 'account_type_mismatch',
            message:
              'This account is not a Company account. Please sign in via the User or Admin portal instead.',
          } as CompanyAuthError,
        };
      }
    } catch (err) {
      console.warn('Company cross-auth guard failed', err);
    }

    try {
      await loadCurrentCompany();
    } catch (err: any) {
      console.error('Company load after sign-in failed', err);
    }
    return { error: null };
  }, [loadCurrentCompany]);

  const signOut = useCallback(async () => {
    try {
      const result = await companySignOut();
      setCompany(null);
      return result;
    } catch (err: any) {
      setCompany(null);
      return {
        error: {
          code: 'unknown',
          message: err?.message ?? 'Sign-out failed',
        } as CompanyAuthError,
      };
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadCurrentCompany();
  }, [loadCurrentCompany]);

  const value = useMemo<CompanyAuthContextValue>(() => {
    const status = company?.status ?? null;
    return {
      company,
      isAuthenticated: !!company,
      isLoading,
      isApproved: status === 'APPROVED',
      isPending: status === 'PENDING_APPROVAL' || status === 'PENDING_OTP',
      isRejected: status === 'REJECTED',
      isSuspended: status === 'SUSPENDED',
      isAwaitingOtp: status === 'PENDING_OTP',
      isPremium: isCompanyPremium(company),
      signIn,
      signOut,
      refresh,
      initError,
    };
  }, [company, isLoading, signIn, signOut, refresh, initError]);

  return (
    <CompanyAuthContext.Provider value={value}>
      {children}
    </CompanyAuthContext.Provider>
  );
};

export const useCompanyAuth = () => {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) {
    throw new Error('useCompanyAuth must be used within a CompanyAuthProvider');
  }
  return ctx;
};