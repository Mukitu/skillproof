
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardCounts {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalCategories: number;
  totalSkills: number;
  totalAssessments: number;
  pendingAssessments: number;
  completedAssessments: number;
  totalPassports: number;
  pendingPassports: number;
  verifiedPassports: number;
  activeJobs: number;
  totalRoadmaps: number;
  storageBytes: number;
  todaysNewUsers: number;
  todaysSubmissions: number;
  
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
}

const empty: DashboardCounts = {
  totalUsers: 0, activeUsers: 0, pendingUsers: 0,
  totalCategories: 0, totalSkills: 0,
  totalAssessments: 0, pendingAssessments: 0, completedAssessments: 0,
  totalPassports: 0, pendingPassports: 0, verifiedPassports: 0,
  activeJobs: 0, totalRoadmaps: 0,
  storageBytes: 0,
  todaysNewUsers: 0, todaysSubmissions: 0,
  totalCertificates: 0, activeCertificates: 0, revokedCertificates: 0,
};

export function useDashboardCounts() {
  const [counts, setCounts] = useState<DashboardCounts>(empty);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const nowIso = new Date().toISOString();

    const [
      totalUsers, activeUsers, pendingUsers,
      totalCategories, totalSkills,
      totalAssessments, pendingAssessments,
      submittedAssessments, passedAssessments, failedAssessments, expiredAssessments,
      totalPassports, pendingPassports, verifiedPassports,
      activeJobs, totalRoadmaps,
      todaysNewUsers, todaysSubmissions,
      totalCertificates, activeCertificates, revokedCertificates,
      storageRpc,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('role_status', 'active').eq('is_suspended', false),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('role_status', 'pending'),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('skills').select('*', { count: 'exact', head: true }),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true }),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true })
        .eq('status', 'Pending'),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true })
        .eq('status', 'Submitted'),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true })
        .eq('status', 'Passed'),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true })
        .eq('status', 'Failed'),
      supabase.from('universal_assessments').select('*', { count: 'exact', head: true })
        .eq('status', 'Expired'),
      supabase.from('skill_passports').select('*', { count: 'exact', head: true }),
      supabase.from('skill_passports').select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      supabase.from('skill_passports').select('*', { count: 'exact', head: true })
        .eq('status', 'active').eq('is_verified', true),
      supabase.from('jobs').select('*', { count: 'exact', head: true })
        .eq('status', 'Active'),
      supabase.from('roadmap_templates').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString()),
      supabase.from('universal_submissions').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString()),
      supabase.from('course_certificates').select('*', { count: 'exact', head: true }),
      supabase.from('course_certificates').select('*', { count: 'exact', head: true })
        .eq('status', 'Active'),
      supabase.from('course_certificates').select('*', { count: 'exact', head: true })
        .eq('status', 'Revoked'),
      supabase.rpc('fn_storage_total_bytes' as any),
    ]);

    const completed = (submittedAssessments.count ?? 0)
      + (passedAssessments.count ?? 0)
      + (failedAssessments.count ?? 0)
      + (expiredAssessments.count ?? 0);

    setCounts({
      totalUsers: totalUsers.count ?? 0,
      activeUsers: activeUsers.count ?? 0,
      pendingUsers: pendingUsers.count ?? 0,
      totalCategories: totalCategories.count ?? 0,
      totalSkills: totalSkills.count ?? 0,
      totalAssessments: totalAssessments.count ?? 0,
      pendingAssessments: pendingAssessments.count ?? 0,
      completedAssessments: completed,
      totalPassports: totalPassports.count ?? 0,
      pendingPassports: pendingPassports.count ?? 0,
      verifiedPassports: verifiedPassports.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      totalRoadmaps: totalRoadmaps.count ?? 0,
      storageBytes: typeof storageRpc.data === 'string' ? parseInt(storageRpc.data, 10) : (storageRpc.data ?? 0),
      todaysNewUsers: todaysNewUsers.count ?? 0,
      todaysSubmissions: todaysSubmissions.count ?? 0,
      totalCertificates: totalCertificates.count ?? 0,
      activeCertificates: activeCertificates.count ?? 0,
      revokedCertificates: revokedCertificates.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { counts, loading, refresh: load };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}