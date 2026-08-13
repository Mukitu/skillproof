
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeRefresh, subscribeTable } from './realtime';
import type {
  CareerRoadmapModule, CareerRoadmapProgress, CareerRoadmapEnrollment,
  RoadmapCompletionRequest, RoadmapCompletionRequestWithContext,
  RoadmapCompletionModuleProgress, RoadmapTemplate, Profile,
} from '../types/database';






export async function getEnrollmentCompletion(
  enrollmentId: string,
): Promise<{
  enrollment: CareerRoadmapEnrollment;
  totalDays: number;
  completedDays: number;
  completionPct: number;
  isComplete: boolean;
} | null> {
  const { data: enrollment, error } = await supabase
    .from('career_roadmap_enrollment')
    .select('*')
    .eq('id', enrollmentId)
    .maybeSingle();
  if (error) throw error;
  if (!enrollment) return null;

  const { count, error: progressErr } = await supabase
    .from('career_roadmap_progress')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .eq('is_completed', true);
  if (progressErr) throw progressErr;

  const completedDays = count ?? 0;
  const totalDays = enrollment.total_days || 0;
  const completionPct = totalDays > 0
    ? Math.min(100, Math.round((100 * completedDays) / totalDays))
    : 0;
  return {
    enrollment: enrollment as CareerRoadmapEnrollment,
    totalDays,
    completedDays,
    completionPct,
    isComplete: completedDays >= totalDays && totalDays > 0,
  };
}


export async function isRoadmapFullyCompleted(enrollmentId: string): Promise<boolean> {
  const stats = await getEnrollmentCompletion(enrollmentId);
  if (!stats || !stats.isComplete) return false;

  
  
  
  const { data: enrollment, error: eErr } = await supabase
    .from('career_roadmap_enrollment').select('template_id').eq('id', enrollmentId).maybeSingle();
  if (eErr || !enrollment) return false;

  const { data: examDays, error: examErr } = await supabase
    .from('roadmap_template_days')
    .select('day_number, practice_tasks, assignment, mini_project')
    .eq('template_id', (enrollment as CareerRoadmapEnrollment).template_id);
  if (examErr) throw examErr;

  const examDayNumbers = (examDays ?? [])
    .filter((d: any) =>
      (Array.isArray(d.practice_tasks) && d.practice_tasks.length > 0) ||
      (typeof d.assignment === 'string' && d.assignment.trim().length > 0) ||
      (typeof d.mini_project === 'string' && d.mini_project.trim().length > 0),
    )
    .map((d: any) => d.day_number);

  if (examDayNumbers.length === 0) return true; 

  const { data: completedExamDays, error: compErr } = await supabase
    .from('career_roadmap_progress')
    .select('day_number')
    .eq('enrollment_id', enrollmentId)
    .eq('is_completed', true)
    .in('day_number', examDayNumbers);
  if (compErr) throw compErr;

  const passedSet = new Set((completedExamDays ?? []).map((r: any) => r.day_number));
  return examDayNumbers.every((d: number) => passedSet.has(d));
}






export async function requestRoadmapCompletion(
  enrollmentId: string,
): Promise<RoadmapCompletionRequest> {
  const { data, error } = await supabase.rpc('fn_user_request_roadmap_completion', {
    p_enrollment_id: enrollmentId,
  });
  if (error) throw new Error(error.message || 'Could not create completion request.');
  return data as RoadmapCompletionRequest;
}


export async function syncRoadmapCompletionIfReady(
  enrollmentId: string,
): Promise<RoadmapCompletionRequest | null> {
  try {
    return await requestRoadmapCompletion(enrollmentId);
  } catch {
    return null;
  }
}






export async function listMyCompletionRequests(): Promise<RoadmapCompletionRequest[]> {
  const { data, error } = await supabase
    .from('roadmap_completion_requests')
    .select('*')
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return (data as RoadmapCompletionRequest[]) ?? [];
}

export async function getCompletionRequest(
  id: string,
): Promise<RoadmapCompletionRequest | null> {
  const { data, error } = await supabase
    .from('roadmap_completion_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as RoadmapCompletionRequest) ?? null;
}


export async function listAllCompletionRequests(): Promise<RoadmapCompletionRequestWithContext[]> {
  const { data, error } = await supabase
    .from('roadmap_completion_requests')
    .select(`
      *,
      profile:profiles!roadmap_completion_requests_user_id_fkey (
        full_name, email, avatar_url
      ),
      roadmap:roadmap_templates!roadmap_completion_requests_roadmap_id_fkey (
        title, thumbnail_url
      ),
      category:categories!roadmap_completion_requests_category_id_fkey (
        name
      ),
      reviewer:profiles!roadmap_completion_requests_reviewer_id_fkey (
        full_name
      )
    `)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    profile_full_name: row.profile?.full_name ?? null,
    profile_email: row.profile?.email ?? null,
    profile_avatar_url: row.profile?.avatar_url ?? null,
    roadmap_title: row.roadmap?.title ?? null,
    roadmap_thumbnail_url: row.roadmap?.thumbnail_url ?? null,
    category_name: row.category?.name ?? null,
    reviewer_full_name: row.reviewer?.full_name ?? null,
  }));
}





export type ReviewDecision = 'approve' | 'reject';


export interface RoadmapCompletionReviewResult {
  request: RoadmapCompletionRequest;
  certificate: {
    id: string;
    credential_number: string;
    verification_token: string;
    status: string;
    issue_date: string;
  } | null;
}

export async function reviewRoadmapCompletion(
  requestId: string,
  decision: ReviewDecision,
  feedback?: string,
): Promise<RoadmapCompletionRequest> {
  const result = await reviewRoadmapCompletionWithCertificate(requestId, decision, feedback);
  return result.request;
}


export async function reviewRoadmapCompletionWithCertificate(
  requestId: string,
  decision: ReviewDecision,
  feedback?: string,
): Promise<RoadmapCompletionReviewResult> {
  const { data, error } = await supabase.rpc('fn_admin_review_roadmap_completion', {
    p_request_id: requestId,
    p_decision: decision,
    p_feedback: feedback ?? null,
  });
  if (error) throw new Error(error.message || 'Could not save the review decision.');
  const request = data as RoadmapCompletionRequest;

  if (decision !== 'approve') {
    return { request, certificate: null };
  }

  
  
  
  try {
    const { data: certRow, error: certErr } = await supabase
      .from('course_certificates')
      .select('id, credential_number, verification_token, status, issue_date, completion_request_id, enrollment_id')
      .eq('completion_request_id', requestId)
      .maybeSingle();
    if (certErr) {
      return { request, certificate: null };
    }
    if (certRow) {
      return {
        request,
        certificate: {
          id: certRow.id,
          credential_number: certRow.credential_number,
          verification_token: certRow.verification_token,
          status: certRow.status,
          issue_date: certRow.issue_date,
        },
      };
    }
  } catch {
    
  }

  
  if (request.enrollment_id) {
    try {
      const { data: certRow } = await supabase
        .from('course_certificates')
        .select('id, credential_number, verification_token, status, issue_date')
        .eq('enrollment_id', request.enrollment_id)
        .order('issue_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (certRow) {
        return {
          request,
          certificate: {
            id: certRow.id,
            credential_number: certRow.credential_number,
            verification_token: certRow.verification_token,
            status: certRow.status,
            issue_date: certRow.issue_date,
          },
        };
      }
    } catch {
      
    }
  }

  return { request, certificate: null };
}






export async function getCompletionProgressDetail(
  enrollmentId: string,
): Promise<RoadmapCompletionModuleProgress[]> {
  const [{ data: modules, error: mErr }, { data: progress, error: pErr }] = await Promise.all([
    supabase
      .from('career_roadmap_modules')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('day_number', { ascending: true }),
    supabase
      .from('career_roadmap_progress')
      .select('*')
      .eq('enrollment_id', enrollmentId),
  ]);
  if (mErr) throw mErr;
  if (pErr) throw pErr;

  const moduleRows = (modules ?? []) as CareerRoadmapModule[];
  const progressRows = (progress ?? []) as CareerRoadmapProgress[];
  const byDay = new Map<number, CareerRoadmapProgress>();
  for (const p of progressRows) byDay.set(p.day_number, p);

  
  
  const { data: examRows, error: exErr } = moduleRows.length > 0
    ? await supabase
        .from('roadmap_template_days')
        .select('day_number, practice_tasks, assignment, mini_project')
        .eq('template_id', moduleRows[0].template_id)
    : { data: [], error: null };
  if (exErr) throw exErr;
  const examDays = new Set(
    ((examRows ?? []) as any[])
      .filter((d) =>
        (Array.isArray(d.practice_tasks) && d.practice_tasks.length > 0) ||
        (typeof d.assignment === 'string' && d.assignment.trim().length > 0) ||
        (typeof d.mini_project === 'string' && d.mini_project.trim().length > 0),
      )
      .map((d) => d.day_number),
  );

  return moduleRows.map((m) => {
    const p = byDay.get(m.day_number);
    return {
      module_id: m.id,
      enrollment_id: m.enrollment_id,
      day_number: m.day_number,
      title: m.title,
      description: m.description ?? null,
      estimated_minutes: m.estimated_minutes,
      is_completed: !!p?.is_completed,
      completed_at: p?.completed_at ?? null,
      unlocked_at: m.unlock_at ?? null,
      has_exam: examDays.has(m.day_number),
    };
  });
}


export async function getCompletionRoadmapTemplate(
  requestId: string,
): Promise<{ template: RoadmapTemplate | null; enrollment: CareerRoadmapEnrollment | null }> {
  const req = await getCompletionRequest(requestId);
  if (!req) return { template: null, enrollment: null };
  const [{ data: tpl, error: tErr }, { data: enr, error: eErr }] = await Promise.all([
    supabase
      .from('roadmap_templates').select('*').eq('id', req.roadmap_id).maybeSingle(),
    supabase
      .from('career_roadmap_enrollment').select('*').eq('id', req.enrollment_id).maybeSingle(),
  ]);
  if (tErr) throw tErr;
  if (eErr) throw eErr;
  return {
    template: (tpl as RoadmapTemplate) ?? null,
    enrollment: (enr as CareerRoadmapEnrollment) ?? null,
  };
}






export function useCompletionRequests(): {
  rows: RoadmapCompletionRequestWithContext[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<RoadmapCompletionRequestWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listAllCompletionRequests();
      setRows(data);
    } catch (e) {
      console.error('[roadmapCompletion] listAll failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('roadmap_completion_requests', load);

  return { rows, loading, refresh: load };
}


export function useMyCompletionRequests(): {
  rows: RoadmapCompletionRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<RoadmapCompletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listMyCompletionRequests();
      setRows(data);
    } catch (e) {
      console.error('[roadmapCompletion] listMy failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('roadmap_completion_requests', load);

  return { rows, loading, refresh: load };
}


export function useEnrollmentCompletionStatus(enrollmentId: string | null): {
  request: RoadmapCompletionRequest | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [request, setRequest] = useState<RoadmapCompletionRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enrollmentId) { setRequest(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_completion_requests')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setRequest((data as RoadmapCompletionRequest) ?? null);
    } catch (e) {
      console.error('[roadmapCompletion] status failed', e);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { void load(); }, [load]);

  
  
  
  
  useRealtimeRefresh('roadmap_completion_requests', load);

  return { request, loading, refresh: load };
}


export function subscribeToCompletionRequests(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void,
) {
  return subscribeTable('roadmap_completion_requests', callback);
}




export type { Profile };