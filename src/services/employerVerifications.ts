/**
 * Employer verification service.
 *
 * The atomic `fn_employer_verify` RPC validates a passport and writes a
 * row to `employer_verifications` in the same transaction. The client
 * just calls the RPC; the server captures IP, browser, device.
 */
import { supabase } from '../lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from './realtime';
import type { EmployerVerification, SkillPassport } from '../types/database';

export type VerifyOutcome = 'verified' | 'invalid' | 'expired' | 'suspended';

export interface VerifyResult {
  result: VerifyOutcome;
  passport: SkillPassport | null;
}

/**
 * Resolve the caller's IP via the public ipify endpoint. Falls back to
 * null when offline or blocked (still useful for analytics).
 */
async function resolveCallerGeo(): Promise<{ ip: string | null; country: string | null; city: string | null; region: string | null }> {
  try {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 3500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: ctl.signal });
    clearTimeout(timeout);
    if (!res.ok) return { ip: null, country: null, city: null, region: null };
    const json = await res.json();
    return { ip: json.ip ?? null, country: null, city: null, region: null };
  } catch {
    return { ip: null, country: null, city: null, region: null };
  }
}

function deviceFromUA(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function browserFromUA(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

/**
 * Public verification entrypoint. Calls the atomic RPC and returns the
 * resolved passport + outcome. IP and geo are best-effort.
 */
export async function verifyPassport(query: string): Promise<VerifyResult> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const referer = typeof document !== 'undefined' ? document.referrer || null : null;
  const { ip, country, city, region } = await resolveCallerGeo();
  const { data, error } = await supabase.rpc('fn_employer_verify', {
    p_query: query,
    p_ip: ip ?? null,
    p_user_agent: ua || null,
    p_browser: browserFromUA(ua),
    p_device: deviceFromUA(ua),
    p_country: country,
    p_city: city,
    p_region: region,
    p_referer: referer,
  });
  if (error) throw error;
  const result = (data?.result ?? 'invalid') as VerifyOutcome;
  const passport = (data?.passport as SkillPassport) ?? null;
  return { result, passport };
}

/** List all employer verifications (admin only). */
export async function listEmployerVerifications(opts: { limit?: number; result?: string } = {}): Promise<EmployerVerification[]> {
  let q = supabase
    .from('employer_verifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.result) q = q.eq('result', opts.result);
  const { data, error } = await q;
  if (error) throw error;
  return (data as EmployerVerification[]) ?? [];
}

/** Hook with realtime subscription. */
export function useEmployerVerifications(limit = 200) {
  const [rows, setRows] = useState<EmployerVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEmployerVerifications({ limit });
      setRows(data);
    } catch (e) {
      console.error('[employer-verifications] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('employer_verifications', load);

  return { rows, loading, refresh: load };
}