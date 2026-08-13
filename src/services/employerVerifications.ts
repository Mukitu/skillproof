
import { supabase } from '../lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from './realtime';

export type VerifyOutcome = 'verified' | 'invalid' | 'expired' | 'suspended';

export interface VerifyResult {
  result: VerifyOutcome;
  passport: any | null;
}


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
  const passport = (data?.passport ?? null) as any;
  return { result, passport };
}


export interface EmployerVerificationListRow {
  id: string;
  passport_id: string | null;
  passport_number: string | null;
  verification_id: string | null;
  result: string;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  referer: string | null;
  created_at: string;
  passport_status: string | null;
  passport_title: string | null;
  passport_full_name: string | null;
  passport_email: string | null;
  total_count: number;
}

export interface EmployerVerificationListPage {
  rows: EmployerVerificationListRow[];
  total: number;
}


export async function listEmployerVerificationsPage(opts: {
  search?: string;
  result?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<EmployerVerificationListPage> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));
  const offset = Math.max(0, opts.offset ?? 0);
  const { data, error } = await supabase.rpc('fn_admin_list_employer_verifications', {
    p_search: opts.search ?? null,
    p_result: opts.result === 'all' || !opts.result ? null : opts.result,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) throw error;
  const rows = ((data as any[]) ?? []) as EmployerVerificationListRow[];
  // total_count is embedded on every row by the SQL function, but lands as 0
  // when the offset skips past the end (no rows returned). Fall back to a
  // dedicated count RPC so the pager shows the true total.
  let total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  if (rows.length === 0 && offset > 0) {
    try {
      const { data: countData, error: countErr } = await supabase.rpc('fn_admin_count_employer_verifications', {
        p_search: opts.search ?? null,
        p_result: opts.result === 'all' || !opts.result ? null : opts.result,
      });
      if (!countErr && countData != null) {
        total = Number(countData) || 0;
      }
    } catch {
      // non-fatal
    }
  }
  return { rows, total };
}


export async function getEmployerVerificationDetail(id: string): Promise<any> {
  const { data, error } = await supabase.rpc('fn_admin_get_employer_verification', { p_id: id });
  if (error) throw error;
  return data;
}


export function useEmployerVerifications(opts: {
  search?: string;
  result?: string;
  pageSize?: number;
} = {}) {
  const pageSize = opts.pageSize ?? 25;
  const [rows, setRows] = useState<EmployerVerificationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (off: number) => {
    setLoading(true);
    setError(null);
    try {
      const page = await listEmployerVerificationsPage({
        search: opts.search,
        result: opts.result,
        offset: off,
        limit: pageSize,
      });
      setRows(page.rows);
      setTotal(page.total);
      setOffset(off);
    } catch (e: any) {
      console.error('[employer-verifications] load failed', e);
      setError(e?.message ?? 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  }, [opts.search, opts.result, pageSize]);

  useEffect(() => {
    void load(0);
    
  }, [opts.search, opts.result, pageSize]);

  useRealtimeRefresh('employer_verifications', () => { void load(0); });

  const next = () => { void load(offset + pageSize); };
  const prev = () => { void load(Math.max(0, offset - pageSize)); };
  const refresh = () => { void load(offset); };

  return { rows, loading, error, total, offset, pageSize, next, prev, refresh };
}
