
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types/database';

export interface AuditFilter {
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}

export async function listAuditLogs(filter?: AuditFilter, limit = 500): Promise<AuditLog[]> {
  let q = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (filter?.actorEmail) q = q.ilike('actor_email', `%${filter.actorEmail}%`);
  if (filter?.entityType) q = q.eq('entity_type', filter.entityType);
  if (filter?.entityId)   q = q.eq('entity_id', filter.entityId);
  if (filter?.action)     q = q.eq('action', filter.action);
  if (filter?.fromDate)   q = q.gte('created_at', filter.fromDate);
  if (filter?.toDate)     q = q.lte('created_at', filter.toDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data as AuditLog[]) ?? [];
}

export async function listAuditActions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.action).filter(Boolean)));
}

export async function listAuditEntityTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('entity_type')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: any) => r.entity_type).filter(Boolean)));
}

export async function auditRowCount(filter?: AuditFilter): Promise<number> {
  let q = supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true });
  if (filter?.actorEmail) q = q.ilike('actor_email', `%${filter.actorEmail}%`);
  if (filter?.entityType) q = q.eq('entity_type', filter.entityType);
  if (filter?.entityId)   q = q.eq('entity_id', filter.entityId);
  if (filter?.action)     q = q.eq('action', filter.action);
  if (filter?.fromDate)   q = q.gte('created_at', filter.fromDate);
  if (filter?.toDate)     q = q.lte('created_at', filter.toDate);
  const { count } = await q;
  return count ?? 0;
}