
import { supabase } from '../lib/supabase';
import { useEffect, useRef } from 'react';

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


export function subscribeOwnRows(
  tables: string[],
  callback: (event: RealtimeEvent, table: string, payload: any) => void,
) {
  const unsubs: Array<() => void> = [];
  for (const t of tables) {
    unsubs.push(subscribeTable(t, (event, payload) => callback(event, t, payload)));
  }
  return () => { unsubs.forEach((u) => u()); };
}


export function useRealtimeRefresh(
  table: string | string[],
  refresh: () => void | Promise<void>,
  filters?: Record<string, string>,
) {
  // Keep the latest refresh callback in a ref so the subscription effect
  // doesn't need to depend on it (and so a fresh closure is always invoked
  // when an event fires). QA-USER-TEST-008: prevents stale-closure bugs.
  const refreshRef = useFreshRef(refresh);
  useEffect(() => {
    const tables = Array.isArray(table) ? table : [table];
    const unsubs = tables.map((t) =>
      subscribeTable(t, () => { void refreshRef.current(); }, filters?.[t]),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [Array.isArray(table) ? table.join(',') : table, refreshRef]);
}

function useFreshRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}
