/**
 * Auth service — Supabase auth wrappers.
 */
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getAccessToken(opts: { forceRefresh?: boolean } = {}): Promise<string> {
  // Read the live Supabase session directly. This is the SINGLE source of
  // truth for the Bearer token. We never use the anon key, the refresh
  // token, the service-role key, undefined or null.
  let { data: { session } } = await supabase.auth.getSession();

  // If session is missing OR the access_token is within 60s of expiry OR
  // the caller explicitly asked, refresh from the Auth server.
  const closeToExpiry = !session
    || !session.expires_at
    || session.expires_at * 1000 - Date.now() < 60_000;

  if (!session || opts.forceRefresh || closeToExpiry) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      session = data.session;
    }
    // If refresh failed AND we still have no session, the user is signed out.
    if (!session) {
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  if (!session.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session.access_token;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function ensureProfile(userId: string, email: string, fullName: string): Promise<Profile> {
  // New accounts start with a completely empty profile. We intentionally do
  // NOT seed demo data, fake names, default profession, or placeholder skills.
  // Any real data only enters the profile once the user fills it in or
  // successfully uploads a CV that the AI extraction can parse.
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
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
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
