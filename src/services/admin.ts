/**
 * Admin service — user management + bulk delete/status.
 *
 * Authorization header policy (strict):
 *   Every protected /api/admin/* request sends ONLY the current authenticated
 *   user's Supabase access_token — obtained via supabase.auth.getSession()
 *   and refreshed if expired. We NEVER use the anon key, refresh token,
 *   service-role key, undefined or null.
 */
import { supabase } from '../lib/supabase';
import { APP_URL } from '../lib/supabase';
import type { Profile } from '../types/database';

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

/** List every admin / super admin profile. Used by the governance page. */
export async function listAdminProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function getUser(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/**
 * Resolve the current Supabase access_token for an Admin API request.
 *   1. Call supabase.auth.getSession() — the single source of truth.
 *   2. If the session is null or the access_token is missing/expired, call
 *      supabase.auth.refreshSession() to get a fresh one.
 *   3. Return session.access_token — never anything else.
 */
async function getAdminBearer(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  let liveSession = session;

  const closeToExpiry = !liveSession
    || !liveSession.access_token
    || !liveSession.expires_at
    || liveSession.expires_at * 1000 - Date.now() < 60_000;

  if (!liveSession || closeToExpiry) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      liveSession = data.session;
    }
  }

  if (!liveSession || !liveSession.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return liveSession.access_token;
}

async function adminFetch(path: string, init?: RequestInit) {
  const send = async (token: string) => {
    const headerValue = `Bearer ${token}`;
    const masked = token.length > 12
      ? `${token.slice(0, 6)}…${token.slice(-6)}`
      : token;
    console.log(
      `[adminFetch] → ${path} | token.len=${token.length} ` +
      `| segments=${token.split('.').length} ` +
      `| header="${headerValue.length > 80 ? headerValue.slice(0, 14) + '…' + headerValue.slice(-12) : headerValue}" ` +
      `| fullTokenMasked=${masked}`
    );
    return fetch(`${APP_URL}/api/admin${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: headerValue,
        ...(init?.headers || {}),
      },
    });
  };

  // First attempt with the current Supabase session.access_token.
  let res = await send(await getAdminBearer());
  console.log(`[adminFetch] ← ${path} status=${res.status}`);

  if (res.status === 401 || res.status === 403) {
    // The BFF rejected the JWT. Force a refresh and retry exactly once.
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        res = await send(data.session.access_token);
        console.log(`[adminFetch] ← ${path} retry status=${res.status}`);
      }
    } catch {
      // Keep the original response so the caller sees the real error.
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[adminFetch] ✗ ${path} status=${res.status} body=${JSON.stringify(body)}`);
    throw new Error(body.error || 'Admin request failed');
  }
  return res.json();
}

export async function suspendUser(id: string, reason: string) {
  return adminFetch(`/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function activateUser(id: string) {
  return adminFetch(`/users/${id}/activate`, { method: 'POST' });
}

export async function setUserRole(id: string, role: 'user' | 'admin' | 'super_admin') {
  return adminFetch(`/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) });
}

export async function setUserPremium(id: string, until: string | null) {
  return adminFetch(`/users/${id}/premium`, { method: 'POST', body: JSON.stringify({ until }) });
}

export async function resetUserPassword(id: string) {
  return adminFetch(`/users/${id}/reset-password`, { method: 'POST' });
}

export async function deleteUser(id: string) {
  return adminFetch(`/users/${id}`, { method: 'DELETE' });
}

export async function bulkDelete(table: 'categories' | 'sub_categories' | 'skills' | 'jobs' | 'roadmap_templates', ids: string[]) {
  return adminFetch(`/bulk/delete`, { method: 'POST', body: JSON.stringify({ table, ids }) });
}

export async function bulkUpdate(
  table: 'categories' | 'sub_categories' | 'skills' | 'jobs' | 'roadmap_templates',
  ids: string[], column: 'status' | 'display_order' | 'difficulty', value: string
) {
  return adminFetch(`/bulk/update`, { method: 'POST', body: JSON.stringify({ table, ids, column, value }) });
}

export async function bootstrapSuperAdmin(email: string) {
  return adminFetch(`/bootstrap-super-admin`, { method: 'POST', body: JSON.stringify({ email }) });
}
