/**
 * Enterprise notifications service.
 *
 * Real-time bell + activity feed backed by Supabase. Triggers on the
 * server (added by migrations 24+) insert rows into the `notifications`
 * table when sensitive events happen (passport approved, assessment
 * reviewed, roadmap assigned, etc.).
 *
 * This service:
 *  - lists the current user's notifications
 *  - marks them read
 *  - subscribes via realtime so the bell flashes on insert
 *  - inserts new rows (admin / system) via `fn_log_notification` RPC
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { useRealtimeRefresh } from './realtime';
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

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const profileId = await getMyProfileId();
  if (!profileId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', profileId)
    .eq('is_read', false);
  if (error) throw error;
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

/**
 * React hook with realtime subscription.
 * Returns the most recent notifications + unread count.
 */
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
  useRealtimeRefresh('notifications', load);

  return { rows, loading, unread, refresh: load, setRows, setUnread };
}

/**
 * Realtime-flash version: subscribes to the postgres_changes stream
 * directly so the bell can blink even before the next refresh fires.
 */
export function useRealtimeNotificationsBell() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          setPulse((p) => p + 1);
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, []);

  return pulse;
}