/**
 * Realtime subscription helper. Returns an unsubscribe function.
 */
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export function subscribeTable(
  table: string,
  callback: (event: RealtimeEvent, payload: any) => void,
  filter?: string
) {
  const channel = supabase
    .channel(`public:${table}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table, filter },
      (payload: any) => {
        callback(payload.eventType as RealtimeEvent, payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * React hook: re-runs `refresh` whenever any row of the given table changes.
 * Optional `filters` map supplies per-table filters (e.g. { skill_passports: 'passport_number=eq.SP-BD-...' }).
 */
export function useRealtimeRefresh(
  table: string | string[],
  refresh: () => void | Promise<void>,
  filters?: Record<string, string>,
) {
  useEffect(() => {
    const tables = Array.isArray(table) ? table : [table];
    const unsubs = tables.map((t) =>
      subscribeTable(t, () => { void refresh(); }, filters?.[t]),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(table) ? table.join(',') : table]);
}
