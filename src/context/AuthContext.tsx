import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchProfile, getCurrentSession, getCurrentUser, signIn as authSignIn,
  signUp as authSignUp, signOut as authSignOut, resetPassword as authResetPassword,
  updatePassword as authUpdatePassword, ensureProfile, isAdmin,
} from '../services/auth';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeViewMode: 'user' | 'admin';
  setActiveViewMode: (mode: 'user' | 'admin') => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeViewMode, setActiveViewMode] = useState<'user' | 'admin'>('user');

  const syncProfile = async (userId: string, email: string): Promise<Profile> => {
    let profile = await fetchProfile(userId);
    if (!profile) {
      // New accounts must start with a completely empty profile. We do NOT
      // pull the full name from user metadata or derive it from the email.
      profile = await ensureProfile(userId, email, '');
    }
    return profile;
  };

  const loadCurrentUser = async () => {
    const session = await getCurrentSession();
    if (!session?.user) {
      setUser(null);
      return;
    }
    const authUser = await getCurrentUser();
    if (!authUser) {
      setUser(null);
      return;
    }
    const profile = await syncProfile(authUser.id, authUser.email ?? '');
    setUser(profile);
    if (isAdmin(profile)) setActiveViewMode('admin');
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadCurrentUser();
      } catch (err) {
        console.error('Auth init failed', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          await loadCurrentUser();
        } catch (err) {
          console.error('Auth state change failed', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await authSignIn(email, password);
      await loadCurrentUser();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Sign-in failed') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await authSignUp(email, password, fullName);
      if (data.session) {
        await loadCurrentUser();
        return { error: null, needsVerification: false };
      }
      return { error: null, needsVerification: true };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Sign-up failed') };
    }
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await authResetPassword(email);
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Password reset failed') };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      await authUpdatePassword(password);
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Password update failed') };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const userId = user.user_id;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    setUser(updated as Profile);
  };

  const refresh = async () => {
    await loadCurrentUser();
  };

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
