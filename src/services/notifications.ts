
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { subscribeOwnRows } from './realtime';
import type { Notification } from '../types/database';

const PAGE_SIZE = 50;

export async function listMyNotifications(): Promise<Notification[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return (data as Notification[]) ?? [];
}

export async function unreadNotificationCount(): Promise<number> {
  const profileId = await getMyProfileId();
  if (!profileId) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}


export async function markNotificationRead(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('fn_user_mark_notification_read', {
      p_notification_id: id,
    });
    if (!error) return;
    
    
    
    if (
      error.code === 'PGRST202' ||
      error.message?.toLowerCase().includes('function') ||
      error.message?.toLowerCase().includes('not found')
    ) {
      const profileId = await getMyProfileId();
      if (!profileId) return;
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', profileId);
      return;
    }
    throw error;
  } catch (e) {
    
    throw e;
  }
}


export async function markAllNotificationsRead(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('fn_user_mark_all_notifications_read');
    if (!error) return typeof data === 'number' ? data : 0;
    if (
      error.code === 'PGRST202' ||
      error.message?.toLowerCase().includes('function') ||
      error.message?.toLowerCase().includes('not found')
    ) {
      const profileId = await getMyProfileId();
      if (!profileId) return 0;
      const { count } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() }, { count: 'exact' })
        .eq('user_id', profileId)
        .eq('is_read', false);
      return count ?? 0;
    }
    throw error;
  } catch (e) {
    throw e;
  }
}


export function useMyNotifications() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listMyNotifications(),
        unreadNotificationCount(),
      ]);
      setRows(list);
      setUnread(count);
    } catch (e) {
      console.error('[notifications] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  
  
  
  useEffect(() => {
    const unsub = subscribeOwnRows(['notifications'], (event, _table, payload) => {
      const newRow = (payload?.new ?? null) as Notification | null;
      if (!newRow) return;
      setRows((prev) => {
        
        if (event === 'INSERT') {
          if (prev.some((p) => p.id === newRow.id)) return prev;
          return [newRow, ...prev].slice(0, PAGE_SIZE);
        }
        
        if (event === 'UPDATE') {
          return prev.map((p) => (p.id === newRow.id ? { ...p, ...newRow } : p));
        }
        return prev;
      });
      
      
      void unreadNotificationCount().then(setUnread);
    });
    return unsub;
  }, []);

  return { rows, loading, unread, refresh: load, setRows, setUnread };
}


export function useRealtimeNotificationsBell() {
  const [pulse, setPulse] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMyProfileId().then((id) => {
      if (!cancelled) setProfileId(id);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileId) return;
    // QA-USER-TEST-007: filter channel by user_id so we don't receive other
    // users' notification inserts (privacy + cost).
    const channel = supabase
      .channel(`notifications-bell:${profileId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` },
        () => {
          setPulse((p) => p + 1);
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {  }
    };
  }, [profileId]);

  return pulse;
}


export const NOTIFICATION_ICON: Record<string, string> = {
  info: 'Bell',
  success: 'CheckCircle2',
  warning: 'AlertTriangle',
  error: 'AlertCircle',

  
  roadmap_published: 'Map',
  roadmap_assigned: 'Map',
  roadmap_available: 'Map',

  
  skill_verification_published: 'BadgeCheck',
  verification_approved: 'CheckCircle2',
  verification_rejected: 'XCircle',
  verification_feedback: 'MessageSquare',

  
  job_published: 'Briefcase',

  
  passport_upgrade: 'Award',
  passport_approved: 'Award',
  passport_rejected: 'XCircle',
  passport_revision: 'RefreshCw',

  
  project_review: 'FileText',
  module_exam: 'GraduationCap',
  module_exam_passed: 'GraduationCap',
  module_exam_failed: 'GraduationCap',
  course_cert_issued: 'Award',
  course_cert_revoked: 'XCircle',
  course_cert_restored: 'Award',

  
  interview_report_ready: 'Award',

  interview_scheduled: 'CalendarClock',
  interview_completed: 'CheckCircle2',
  interview_cancelled: 'XCircle',

  message_received: 'MessageSquare',
};


export function iconForNotification(n: Pick<Notification, 'icon' | 'type'>): string {
  return n.icon || NOTIFICATION_ICON[n.type] || 'Bell';
}

export default {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadNotificationCount,
  useMyNotifications,
  useRealtimeNotificationsBell,
  NOTIFICATION_ICON,
  iconForNotification,
};