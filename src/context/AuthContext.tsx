import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchProfile,
  getCurrentSession,
  getCurrentUser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  ensureProfile,
  isAdmin,
  tryRecoverSession,
} from '../services/auth';
import { normalizeAuthError, type NormalizedAuthError } from '../services/authErrors';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeViewMode: 'user' | 'admin';
  setActiveViewMode: (mode: 'user' | 'admin') => void;
  signIn: (email: string, password: string) => Promise<{ error: NormalizedAuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: NormalizedAuthError | null; needsVerification?: boolean }>;
  signOut: () => Promise<{ error: NormalizedAuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: NormalizedAuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: NormalizedAuthError | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  refresh: () => Promise<void>;
  initError: NormalizedAuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<NormalizedAuthError | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'user' | 'admin'>('user');

  
  
  const inflight = useRef<Promise<Profile | null> | null>(null);

  const syncProfile = useCallback(async (userId: string, email: string): Promise<Profile | null> => {
    if (inflight.current) {
      try { await inflight.current; } catch {  }
    }
    const work = (async () => {
      let profile = await fetchProfile(userId);
      if (!profile) profile = await ensureProfile(userId, email, '');
      return profile;
    })();
    inflight.current = work;
    try {
      return await work;
    } finally {
      if (inflight.current === work) inflight.current = null;
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const session = await getCurrentSession();
    if (!session?.user) {
      setUser(null);
      return;
    }
    let authUser;
    try {
      authUser = await getCurrentUser();
    } catch (err) {
      const norm = normalizeAuthError(err);
      if (norm.code === 'session_expired' || norm.code === 'session_missing') {
        setUser(null);
        return;
      }
      throw err;
    }
    if (!authUser) {
      setUser(null);
      return;
    }
    const profile = await syncProfile(authUser.id, authUser.email ?? '');


    if (profile && profile.is_suspended === true) {
      try {
        await authSignOut();
      } catch {

      }
      setUser(null);
      throw normalizeAuthError(
        new Error(
          'Your account has been suspended. Reason: ' +
            (profile.suspended_reason || 'No reason provided') +
            '. Contact support to restore access.',
        ),
        'Account suspended',
      );
    }

    setUser(profile);
    if (isAdmin(profile)) setActiveViewMode('admin');
  }, [syncProfile]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        
        
        
        const recovered = await tryRecoverSession();
        if (!recovered) {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        await loadCurrentUser();
      } catch (err) {
        const norm = normalizeAuthError(err, 'Unable to initialize authentication.');
        
        console.error('Auth init failed', err);
        if (mounted) setInitError(norm);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            await loadCurrentUser();
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) await loadCurrentUser();
          else setUser(null);
        }
      } catch (err) {
        
        console.error('Auth state change failed', err);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadCurrentUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await authSignIn(email, password);
      // LoginPage uses unifiedLogin() which already refreshes both contexts;
      // this signIn() is the fallback for surfaces that call it directly.
      try {
        await loadCurrentUser();
      } catch (loadErr) {
        const norm = normalizeAuthError(loadErr, 'Sign-in failed');
        // Suspended accounts must keep their session so the page can show
        // the suspension notice — do NOT sign them out here.
        if (norm.code === 'account_suspended') {
          return { error: norm };
        }
        try { await authSignOut(); } catch { /* ignore */ }
        setUser(null);
        return { error: norm };
      }
      return { error: null };
    } catch (err) {
      return { error: normalizeAuthError(err, 'Sign-in failed') };
    }
  }, [loadCurrentUser]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const data = await authSignUp(email, password, fullName);
      if (data.session) {
        await loadCurrentUser();
        return { error: null, needsVerification: false };
      }
      return { error: null, needsVerification: true };
    } catch (err) {
      return { error: normalizeAuthError(err, 'Sign-up failed') };
    }
  }, [loadCurrentUser]);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
    } catch (err) {
      
      const norm = normalizeAuthError(err, 'Sign-out failed');
      setUser(null);
      return { error: norm };
    }
    setUser(null);
    setActiveViewMode('user');
    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authResetPassword(email);
      return { error: null };
    } catch (err) {
      return { error: normalizeAuthError(err, 'Password reset failed') };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      await authUpdatePassword(password);
      return { error: null };
    } catch (err) {
      return { error: normalizeAuthError(err, 'Password update failed') };
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!user) throw normalizeAuthError(new Error('session_missing'), 'You are signed out.');
    const userId = user.user_id;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw normalizeAuthError(error, 'Profile update failed');
    setUser(updated as Profile);
  }, [user]);

  const refresh = useCallback(async () => {
    await loadCurrentUser();
  }, [loadCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'user',
        isAuthenticated: !!user,
        isLoading,
        activeViewMode,
        setActiveViewMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refresh,
        initError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};