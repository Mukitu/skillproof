/**
 * Authentication middleware: validates the Bearer access token and attaches the user to req.
 *
 * Token validation runs against the service-role client whose `auth.getUser(jwt)`
 * verifies the JWT signature against the project's secret. If the project URL
 * differs from the one that issued the token, the signature check fails and we
 * surface a precise error so the client can refresh + retry.
 */
import type { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server. ' +
        'Set them in .env or your hosting provider; never rely on VITE_* fallbacks on the server.',
      );
    }
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export interface AuthedRequest extends Request {
  user?: User;
  accessToken?: string;
  profile?: { id: string; role: 'user' | 'admin' | 'super_admin'; email: string };
}

function tokenErrorMessage(error: { message?: string; code?: string } | null, token: string): string {
  const message = error?.message || '';
  if (/expired/i.test(message)) return 'Token has expired. Please sign in again.';
  if (/invalid/i.test(message) || /malformed/i.test(message)) return 'Bearer token is malformed or invalid. Please sign in again to refresh your session.';
  if (!token || token.split('.').length !== 3) return 'Bearer token is malformed (expected 3 JWT segments).';
  return 'Bearer token could not be verified against the configured Supabase project. Ensure SUPABASE_URL matches VITE_SUPABASE_URL.';
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const maskedHeader = authHeader
    ? `${authHeader.slice(0, 14)}…${authHeader.slice(-12)} (len=${authHeader.length})`
    : '<none>';
  console.log(`[requireAuth] ${req.method} ${req.path} | authHeader=${maskedHeader}`);
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  if (token.split('.').length !== 3) {
    return res.status(401).json({
      error: 'Bearer token is malformed (expected 3 JWT segments).',
      debug: { tokenLength: token.length, segments: token.split('.').length },
    });
  }
  try {
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data.user) {
      console.error(
        `[requireAuth] rejected ${req.method} ${req.path} | ` +
        `error.message=${error?.message} | error.code=${error?.code ?? 'invalid_token'}`
      );
      return res.status(401).json({
        error: tokenErrorMessage(error ?? null, token),
        code: error?.code ?? 'invalid_token',
      });
    }
    req.user = data.user;
    req.accessToken = token;

    // Resolve the local profile row.
    const { data: profile } = await getAdminClient()
      .from('profiles')
      .select('id, role, email')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (profile) {
      req.profile = profile as AuthedRequest['profile'];
    }
    next();
  } catch (err: any) {
    console.error(`[requireAuth] threw ${req.method} ${req.path}: ${err.message}`);
    return res.status(500).json({ error: err.message || 'Auth verification failed' });
  }
}
