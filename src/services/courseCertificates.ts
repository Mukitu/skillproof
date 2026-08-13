
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { logActivity } from './activity';
import type {
  CertificateActionHistory, CertificateAnalytics,
  CertificateDownloadFormat, CertificateDownloadLog,
  CertificateVerificationLog, CourseCertificate,
  CourseCertificateWithContext, PublicCertificateBundle,
} from '../types/database';






export async function getMyCertificates(): Promise<CourseCertificate[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('course_certificates')
    .select('*')
    .eq('user_id', profileId)
    .order('issue_date', { ascending: false });
  if (error) throw error;
  return (data as CourseCertificate[]) ?? [];
}


export async function getMyLatestActiveCertificate(): Promise<CourseCertificate | null> {
  const all = await getMyCertificates();
  return all.find((c) => c.status === 'Active') ?? null;
}


export async function getCertificateById(id: string): Promise<CourseCertificate | null> {
  const { data, error } = await supabase
    .from('course_certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as CourseCertificate) ?? null;
}


export async function getCertificateByCredentialNumber(
  credentialNumber: string,
): Promise<CourseCertificate | null> {
  const num = (credentialNumber ?? '').trim();
  if (!num) return null;
  const { data, error } = await supabase
    .from('course_certificates')
    .select('*')
    .eq('credential_number', num)
    .maybeSingle();
  if (error) throw error;
  return (data as CourseCertificate) ?? null;
}


export async function getCertificateHistory(certificateId: string): Promise<CertificateActionHistory[]> {
  const { data, error } = await supabase
    .from('certificate_action_history')
    .select('*')
    .eq('certificate_id', certificateId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CertificateActionHistory[]) ?? [];
}





export interface AdminListCertificatesFilters {
  search?: string;
  status?: 'Active' | 'Revoked' | 'Superseded' | 'all';
  
  categoryId?: string | null;
  
  page?: number;
  
  pageSize?: number;
}

export interface AdminListCertificatesResult {
  rows: CourseCertificateWithContext[];
  total: number;
}


export async function adminListCertificates(
  filters: AdminListCertificatesFilters = {},
): Promise<AdminListCertificatesResult> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const page = Math.max(filters.page ?? 0, 0);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('course_certificates')
    .select('*', { count: 'exact' })
    .order('issue_date', { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `credential_number.ilike.${term},user_full_name.ilike.${term},roadmap_title.ilike.${term},category_name.ilike.${term}`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  
  
  const certIds = ((data as CourseCertificate[]) ?? []).map((c) => c.id);
  let lastActionByCert: Record<string, { action: string; created_at: string }> = {};
  if (certIds.length > 0) {
    const { data: history } = await supabase
      .from('certificate_action_history')
      .select('certificate_id, action, created_at')
      .in('certificate_id', certIds)
      .order('created_at', { ascending: false });
    for (const h of (history as any[]) ?? []) {
      if (!lastActionByCert[h.certificate_id]) {
        lastActionByCert[h.certificate_id] = { action: h.action, created_at: h.created_at };
      }
    }
  }

  const rows: CourseCertificateWithContext[] = ((data as CourseCertificate[]) ?? []).map((c) => ({
    ...c,
    user_email: null,
    user_avatar_url_joined: c.user_avatar_url ?? null,
    roadmap_thumbnail_url: null,
    last_action: (lastActionByCert[c.id]?.action ?? null) as any,
    last_action_at: lastActionByCert[c.id]?.created_at ?? null,
  }));

  return { rows, total: count ?? rows.length };
}


export async function adminReissueCertificate(
  certificateId: string,
  reason: string,
  feedback?: string,
): Promise<CourseCertificate> {
  if (!reason || !reason.trim()) {
    throw new Error('Reissue reason is required.');
  }
  const { data, error } = await supabase.rpc('fn_admin_reissue_certificate', {
    p_certificate_id: certificateId,
    p_reason: reason.trim(),
    p_feedback: feedback?.trim() || null,
  });
  if (error) throw error;
  void logActivity('passport.approved', `Reissued certificate ${(data as CourseCertificate).credential_number}`, {
    entityType: 'course_certificate',
    entityId: certificateId,
    metadata: { reason, format: 'reissue' },
  });
  return data as CourseCertificate;
}


export async function adminRevokeCertificate(
  certificateId: string,
  reason: string,
): Promise<CourseCertificate> {
  if (!reason || !reason.trim()) {
    throw new Error('Revoke reason is required.');
  }
  const { data, error } = await supabase.rpc('fn_admin_revoke_certificate', {
    p_certificate_id: certificateId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
  void logActivity('passport.rejected', `Revoked certificate ${(data as CourseCertificate).credential_number}`, {
    entityType: 'course_certificate',
    entityId: certificateId,
    metadata: { reason, format: 'revoke' },
  });
  return data as CourseCertificate;
}


export async function adminRestoreCertificate(
  certificateId: string,
  reason: string,
): Promise<CourseCertificate> {
  if (!reason || !reason.trim()) {
    throw new Error('Restore reason is required.');
  }
  const { data, error } = await supabase.rpc('fn_admin_restore_certificate', {
    p_certificate_id: certificateId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
  void logActivity('passport.approved', `Restored certificate ${(data as CourseCertificate).credential_number}`, {
    entityType: 'course_certificate',
    entityId: certificateId,
    metadata: { reason, format: 'restore' },
  });
  return data as CourseCertificate;
}


export async function getCertificateAnalytics(): Promise<CertificateAnalytics> {
  const { data, error } = await supabase.rpc('fn_certificate_analytics');
  if (error) throw error;
  return data as CertificateAnalytics;
}






export async function getPublicCertificateBundle(
  query: string,
): Promise<PublicCertificateBundle | null> {
  const q = (query ?? '').trim();
  if (!q) return null;
  const { data, error } = await supabase.rpc('fn_public_verify_certificate', {
    p_credential_number: q,
  });
  if (error) throw error;
  const bundle = data as PublicCertificateBundle;
  if (!bundle || bundle.result === 'not_found') return null;
  return bundle;
}


export async function logPublicVerification(
  credentialNumber: string,
  result: 'verified' | 'revoked' | 'not_found',
  referer?: string,
): Promise<void> {
  try {
    await supabase.rpc('fn_log_certificate_verification', {
      p_credential_number: credentialNumber,
      p_result: result,
      p_referer: referer ?? null,
    });
  } catch {
    
  }
}


export async function logCertificateDownload(
  certificateId: string,
  format: CertificateDownloadFormat,
  referer?: string,
): Promise<void> {
  try {
    await supabase.rpc('fn_log_certificate_download', {
      p_certificate_id: certificateId,
      p_format: format,
      p_referer: referer ?? null,
    });
  } catch {
    
  }
}


export async function getMyRecentDownloads(limit = 10): Promise<CertificateDownloadLog[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('certificate_download_logs')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CertificateDownloadLog[]) ?? [];
}


export async function adminListVerificationLogs(limit = 100): Promise<CertificateVerificationLog[]> {
  const { data, error } = await supabase
    .from('certificate_verification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CertificateVerificationLog[]) ?? [];
}






export function subscribeToMyCertificates(onChange: () => void): () => void {
  let profileId: string | null = null;
  let cleanup: (() => void) | null = null;

  void getMyProfileId().then((id) => {
    profileId = id;
    if (!profileId) return;
    const channel = supabase
      .channel(`my-certificates:${profileId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'course_certificates',
          filter: `user_id=eq.${profileId}`,
        },
        () => {
          try { onChange(); } catch {  }
        },
      )
      .subscribe();
    cleanup = () => {
      try { supabase.removeChannel(channel); } catch {  }
    };
  });

  return () => {
    try { cleanup?.(); } catch {  }
  };
}


export function subscribeToCertificateById(
  certificateId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`certificate:${certificateId}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'course_certificates',
        filter: `id=eq.${certificateId}`,
      },
      () => {
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}


export function subscribeToCertificateHistory(
  certificateId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`certificate-history:${certificateId}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'certificate_action_history',
        filter: `certificate_id=eq.${certificateId}`,
      },
      () => {
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}


export function subscribeToAllCertificates(onChange: () => void): () => void {
  const channel = supabase
    .channel('admin-all-certificates')
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'course_certificates' },
      () => {
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}






export function isBundleValid(b: PublicCertificateBundle | null): b is PublicCertificateBundle {
  return !!b && (b.result === 'verified' || b.result === 'revoked');
}


export type { CourseCertificate, PublicCertificateBundle, CertificateAnalytics };