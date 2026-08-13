
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { triggerPredictionAfterSave } from './aiCenter';


const WATCHED_TABLES = [
  'profiles',
  'educations',
  'experiences',
  'user_skills',
  'skill_verifications',
  'skill_verification_submissions',
  'universal_assessments',
  'universal_submissions',
  'skill_passports',
  'course_certificates',
  'career_roadmap_enrollment',
  'interview_sessions',
  'job_applications',
  'career_ai_reports',
] as const;

const DEBOUNCE_MS = 5_000;

let installedFor: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(userId: string): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (!userId) return;
    void triggerPredictionAfterSave({ include_exam_scores: true });
    // Tell every mounted useLiveBrainInputs() to re-fetch live snapshot too.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brain:refresh'));
    }
  }, DEBOUNCE_MS);
}

export function useAICenterAutoRefresh(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return undefined;
    if (installedFor === userId) {
      
      
      return undefined;
    }
    installedFor = userId;

    const channel = supabase
      .channel(`ai-center-autorefresh:${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public' },
        (payload: any) => {
          const table = payload?.table;
          if (!table || !WATCHED_TABLES.includes(table as any)) return;
          
          
          
          const row = payload?.new ?? payload?.old ?? {};
          const rowUserId =
            row?.user_id
            ?? row?.auth_user_id
            ?? null;
          if (rowUserId && rowUserId !== userId) return;
          scheduleRefresh(userId);
        },
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {  }
      installedFor = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };
  }, [userId]);
}