
import { supabase } from '../lib/supabase';
import { useRealtimeRefresh } from './realtime';
import { useCallback, useEffect, useState } from 'react';

export interface AnalyticsDashboard {
  totals: AnalyticsTotals;
  popular_categories: Array<{ category_id: string | null; category_name: string | null; passed: number }>;
  
  popular_skills: Array<{ skill_id: string | null; skill_name: string | null; category_id?: string | null; count: number }>;
  monthly_growth: Array<{ month: string; users: number }>;
  daily_activity: Array<{ day: string; events: number }>;
  recent_activity: Array<{
    id: string;
    kind: string;
    title: string;
    description: string | null;
    entity_type: string | null;
    entity_id: string | null;
    profile_id: string | null;
    actor_email: string | null;
    actor_name: string | null;
    created_at: string;
  }>;
  computed_at: string;
}

export interface AnalyticsTotals {
  total_users: number;
  active_users: number;
  admin_users: number;
  premium_users: number;
  verified_users: number;
  total_passports: number;
  pending_passports: number;
  active_passports: number;
  rejected_passports: number;
  suspended_passports: number;
  renewed_passports: number;
  expired_passports: number;
  total_assessments: number;
  total_submissions: number;
  total_verifications: number;
  passed_verifications: number;
  failed_verifications: number;
  pending_verifications: number;
  employer_verifications: number;
  verifications_24h: number;
  active_jobs: number;
  total_jobs: number;
  total_roadmaps: number;
  published_roadmaps: number;
  total_categories: number;
  total_skills: number;
  total_admin_permissions: number;
  notifications_7d: number;
}

const EMPTY: AnalyticsDashboard = {
  totals: {
    total_users: 0, active_users: 0, admin_users: 0, premium_users: 0, verified_users: 0,
    total_passports: 0, pending_passports: 0, active_passports: 0, rejected_passports: 0,
    suspended_passports: 0, renewed_passports: 0, expired_passports: 0,
    total_assessments: 0, total_submissions: 0, total_verifications: 0,
    passed_verifications: 0, failed_verifications: 0, pending_verifications: 0,
    employer_verifications: 0, verifications_24h: 0,
    active_jobs: 0, total_jobs: 0,
    total_roadmaps: 0, published_roadmaps: 0,
    total_categories: 0, total_skills: 0, total_admin_permissions: 0,
    notifications_7d: 0,
  },
  popular_categories: [],
  popular_skills: [],
  monthly_growth: [],
  daily_activity: [],
  recent_activity: [],
  computed_at: '',
};


export async function fetchAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  const { data, error } = await supabase.rpc('fn_analytics_dashboard');
  if (error) throw error;
  return (data as AnalyticsDashboard) ?? EMPTY;
}


export function passRate(d: AnalyticsDashboard): number {
  const t = d.totals.passed_verifications + d.totals.failed_verifications;
  if (!t) return 0;
  return d.totals.passed_verifications / t;
}


export function useAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDashboard>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAnalyticsDashboard();
      setData(payload);
      setError(null);
    } catch (e: any) {
      console.error('[analytics] load failed', e);
      setError(e?.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useRealtimeRefresh(
    [
      'profiles',
      'skill_passports',
      'skill_verification_submissions',
      'skill_verification_tasks',
      'universal_assessments',
      'universal_submissions',
      'employer_verifications',
      'jobs',
      'roadmap_templates',
      'notifications',
      'activity_events',
    ],
    load,
  );

  return { data, loading, error, refresh: load };
}