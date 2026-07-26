/**
 * Activity timeline service — user-facing event feed backed by
 * `activity_events`. The table is write-only from the client; users and
 * admins can read it. Rows are never updated or deleted.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { useRealtimeRefresh } from './realtime';
import type { ActivityEvent, ActivityEventKind } from '../types/database';

export async function listMyActivity(limit = 50): Promise<ActivityEvent[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ActivityEvent[]) ?? [];
}

export async function listUserActivity(profileId: string, limit = 100): Promise<ActivityEvent[]> {
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ActivityEvent[]) ?? [];
}

/**
 * Write a permanent activity row. The table is RLS-protected so the
 * SECURITY DEFINER RPC `fn_log_activity` is the canonical write path —
 * we never INSERT directly from the client.
 */
export async function logActivity(
  kind: ActivityEventKind,
  title: string,
  options: { description?: string; entityType?: string; entityId?: string; metadata?: Record<string, any> } = {},
): Promise<boolean> {
  const profileId = await getMyProfileId();
  if (!profileId) return false;
  try {
    const { error } = await supabase.rpc('fn_log_activity', {
      p_profile_id: profileId,
      p_kind: kind,
      p_title: title,
      p_description: options.description ?? null,
      p_entity_type: options.entityType ?? null,
      p_entity_id: options.entityId ?? null,
      p_metadata: options.metadata ?? {},
    });
    if (error) {
      console.warn('[activity] log failed', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[activity] log threw', err);
    return false;
  }
}

/** React hook: load the current user's activity timeline and refresh on realtime. */
export function useMyActivity(limit = 50) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await listMyActivity(limit);
      setEvents(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('activity_events', load);

  return { events, loading, refresh: load };
}

/**
 * Visual config for a kind → icon/color used by the timeline UI.
 */
export const ACTIVITY_PRESET: Record<ActivityEventKind, { label: string; color: string; icon: string }> = {
  'account.created': { label: 'Account created', color: 'text-blue-600 bg-blue-50', icon: 'user-plus' },
  'profile.updated': { label: 'Profile updated', color: 'text-slate-700 bg-slate-50', icon: 'user' },
  'avatar.uploaded': { label: 'Avatar uploaded', color: 'text-indigo-600 bg-indigo-50', icon: 'image' },
  'resume.uploaded': { label: 'Resume uploaded', color: 'text-cyan-600 bg-cyan-50', icon: 'file-text' },
  'ai_career.generated': { label: 'AI career profile generated', color: 'text-fuchsia-600 bg-fuchsia-50', icon: 'sparkles' },
  'roadmap.started': { label: 'Roadmap started', color: 'text-purple-600 bg-purple-50', icon: 'map' },
  'roadmap.day_completed': { label: 'Roadmap day completed', color: 'text-violet-600 bg-violet-50', icon: 'check-circle' },
  'roadmap.completed': { label: 'Roadmap completed', color: 'text-emerald-600 bg-emerald-50', icon: 'flag' },
  'assessment.created': { label: 'Assessment created', color: 'text-amber-700 bg-amber-50', icon: 'plus-circle' },
  'assessment.submitted': { label: 'Assessment submitted', color: 'text-amber-600 bg-amber-50', icon: 'send' },
  'assessment.passed': { label: 'Assessment passed', color: 'text-emerald-600 bg-emerald-50', icon: 'check' },
  'assessment.failed': { label: 'Assessment failed', color: 'text-rose-600 bg-rose-50', icon: 'x' },
  'assessment.reviewed': { label: 'Assessment reviewed', color: 'text-blue-600 bg-blue-50', icon: 'eye' },
  'verification.created': { label: 'Skill verification submitted', color: 'text-sky-600 bg-sky-50', icon: 'file-plus' },
  'verification.passed': { label: 'Skill verification passed', color: 'text-emerald-700 bg-emerald-50', icon: 'badge-check' },
  'verification.failed': { label: 'Skill verification failed', color: 'text-rose-700 bg-rose-50', icon: 'x-circle' },
  'passport.requested': { label: 'Passport requested', color: 'text-amber-600 bg-amber-50', icon: 'award' },
  'passport.approved': { label: 'Passport approved', color: 'text-emerald-700 bg-emerald-50', icon: 'check-circle-2' },
  'passport.rejected': { label: 'Passport rejected', color: 'text-rose-700 bg-rose-50', icon: 'x-circle' },
  'passport.renewed': { label: 'Passport renewed', color: 'text-cyan-600 bg-cyan-50', icon: 'refresh-cw' },
  'passport.downloaded': { label: 'Passport downloaded', color: 'text-orange-600 bg-orange-50', icon: 'download' },
  'job.applied': { label: 'Job application submitted', color: 'text-blue-700 bg-blue-50', icon: 'briefcase' },
  'job.saved': { label: 'Job saved', color: 'text-yellow-700 bg-yellow-50', icon: 'bookmark' },
  'notification.sent': { label: 'Notification sent', color: 'text-slate-600 bg-slate-50', icon: 'bell' },
  'login.success': { label: 'Signed in', color: 'text-slate-600 bg-slate-50', icon: 'log-in' },
  'login.failed': { label: 'Failed sign-in', color: 'text-rose-600 bg-rose-50', icon: 'log-in' },
  'password.changed': { label: 'Password changed', color: 'text-slate-600 bg-slate-50', icon: 'key' },
  'admin.role_changed': { label: 'Role changed', color: 'text-indigo-600 bg-indigo-50', icon: 'shield' },
};
