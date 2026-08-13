/**
 * useLiveBrainInputs — auto-refreshing React hook for the AI Brain.
 *
 * Subscribes to every Supabase table the brain reads from and re-fetches
 * the live feature snapshot on:
 *   1. Mount
 *   2. Any change to a watched table (debounced 2s)
 *   3. The browser tab becoming visible (`visibilitychange`)
 *   4. A `brain:refresh` window event (fired by aiCenterAutoRefresh)
 *
 * Returns `{ inputs, loading, refreshedAt, reload }` — `inputs` is shaped
 * for `aiBrainScore()` and stays in sync with whatever the user just did
 * on any of the 8 source pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildBrainInputs, fetchBrainInputsRaw, summarizeBrainSignals } from '../services/brainFeatureBuilder';
import type { BrainInputs } from '../services/aiBrain';

const WATCHED_TABLES = [
  'profiles',
  'user_skills',
  'skill_verifications',
  'universal_submissions',
  'universal_assessments',
  'skill_verification_submissions',
  'skill_passports',
  'course_certificates',
  'career_roadmap_enrollment',
  'interview_sessions',
  'job_applications',
  'experiences',
  'career_ai_reports',
] as const;

const DEBOUNCE_MS = 2_000;

export type BrainSignals = ReturnType<typeof summarizeBrainSignals>;

export type LiveBrainInputs = {
  inputs: BrainInputs | null;
  signals: BrainSignals | null;
  loading: boolean;
  refreshedAt: number | null;
  reload: () => void;
};

export function useLiveBrainInputs(userId: string | null | undefined): LiveBrainInputs {
  const [inputs, setInputs] = useState<BrainInputs | null>(null);
  const [signals, setSignals] = useState<BrainSignals | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    if (!userId) return;
    const cancelled = { cancelled: false };
    cancelRef.current = cancelled;
    setLoading(true);
    void (async () => {
      try {
        const [built, raw] = await Promise.all([
          buildBrainInputs(userId),
          fetchBrainInputsRaw(userId),
        ]);
        if (cancelled.cancelled) return;
        setInputs(built);
        setSignals(summarizeBrainSignals(raw));
        setRefreshedAt(Date.now());
      } catch {
        // leave prior values in place; swallow to avoid crash
      } finally {
        if (!cancelled.cancelled) setLoading(false);
      }
    })();
  }, [userId]);

  // Initial fetch + userId change
  useEffect(() => {
    if (!userId) {
      setInputs(null);
      setSignals(null);
      setLoading(false);
      return;
    }
    reload();
    return () => {
      cancelRef.current.cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [userId, reload]);

  // Supabase realtime — debounced 2s
  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`brain-live:${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public' },
        (payload: any) => {
          const table = payload?.table;
          if (!table || !WATCHED_TABLES.includes(table as any)) return;
          // Only react to mutations for *this* user
          const row = payload?.new ?? payload?.old ?? {};
          const rowUserId = row?.user_id ?? row?.auth_user_id ?? null;
          if (rowUserId && rowUserId !== userId) return;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            reload();
          }, DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [userId, reload]);

  // Cross-tab visibility — recompute on return
  useEffect(() => {
    if (!userId) return undefined;
    const onVis = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId, reload]);

  // Custom event from aiCenterAutoRefresh + manual triggers
  useEffect(() => {
    if (!userId) return undefined;
    const onBrainRefresh = () => reload();
    window.addEventListener('brain:refresh', onBrainRefresh);
    return () => window.removeEventListener('brain:refresh', onBrainRefresh);
  }, [userId, reload]);

  return { inputs, signals, loading, refreshedAt, reload };
}