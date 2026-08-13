
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { useRealtimeRefresh } from './realtime';
import type {
  CareerRoadmapEnrollment, CareerRoadmapProgress,
  RoadmapModuleExam,
  RoadmapModuleExamSubmission, RoadmapModuleExamSubmissionStatus,
  RoadmapModuleExamSubmissionWithContext,
  RoadmapModuleExamUpsertPayload, RoadmapTemplate,
} from '../types/database';






export async function listModuleExamsForTemplate(
  templateId: string,
): Promise<RoadmapModuleExam[]> {
  const { data, error } = await supabase
    .from('roadmap_module_exams')
    .select('*')
    .eq('template_id', templateId)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return (data as RoadmapModuleExam[]) ?? [];
}


export async function getModuleExam(
  templateId: string,
  dayNumber: number,
): Promise<RoadmapModuleExam | null> {
  const { data, error } = await supabase
    .from('roadmap_module_exams')
    .select('*')
    .eq('template_id', templateId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (error) throw error;
  return (data as RoadmapModuleExam) ?? null;
}


export async function adminUpsertModuleExam(
  payload: RoadmapModuleExamUpsertPayload,
): Promise<RoadmapModuleExam> {
  const { data, error } = await supabase.rpc('fn_admin_upsert_module_exam', {
    p_payload: payload as any,
  });
  if (error) throw new Error(error.message || 'Could not save exam configuration.');
  return data as RoadmapModuleExam;
}






export async function listEnabledExamsForTemplate(
  templateId: string,
): Promise<RoadmapModuleExam[]> {
  const { data, error } = await supabase
    .from('roadmap_module_exams')
    .select('*')
    .eq('template_id', templateId)
    .eq('exam_enabled', true)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return (data as RoadmapModuleExam[]) ?? [];
}


export async function getMyExamForDay(
  enrollmentId: string,
  dayNumber: number,
): Promise<{
  exam: RoadmapModuleExam | null;
  submission: RoadmapModuleExamSubmission | null;
}> {
  const profileId = await getMyProfileId();
  if (!profileId) return { exam: null, submission: null };

  
  const { data: enr, error: enrErr } = await supabase
    .from('career_roadmap_enrollment')
    .select('template_id')
    .eq('id', enrollmentId)
    .maybeSingle();
  if (enrErr) throw enrErr;
  if (!enr) return { exam: null, submission: null };

  const [{ data: exam, error: examErr }, { data: submission, error: subErr }] = await Promise.all([
    supabase
      .from('roadmap_module_exams')
      .select('*')
      .eq('template_id', enr.template_id)
      .eq('day_number', dayNumber)
      .maybeSingle(),
    supabase
      .from('roadmap_module_exam_submissions')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('template_day_number', dayNumber)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (examErr) throw examErr;
  if (subErr) throw subErr;

  return {
    exam: (exam as RoadmapModuleExam) ?? null,
    submission: (submission as RoadmapModuleExamSubmission) ?? null,
  };
}


export async function getAllExamsForEnrollment(
  enrollmentId: string,
): Promise<{
  exams: RoadmapModuleExam[];
  latestSubmissionsByDay: Record<number, RoadmapModuleExamSubmission>;
}> {
  const profileId = await getMyProfileId();
  if (!profileId) return { exams: [], latestSubmissionsByDay: {} };

  const { data: enr, error: enrErr } = await supabase
    .from('career_roadmap_enrollment').select('template_id')
    .eq('id', enrollmentId).maybeSingle();
  if (enrErr) throw enrErr;
  if (!enr) return { exams: [], latestSubmissionsByDay: {} };

  const [{ data: exams, error: eErr }, { data: subs, error: sErr }] = await Promise.all([
    supabase
      .from('roadmap_module_exams').select('*')
      .eq('template_id', enr.template_id)
      .order('day_number', { ascending: true }),
    supabase
      .from('roadmap_module_exam_submissions').select('*')
      .eq('enrollment_id', enrollmentId)
      .order('submitted_at', { ascending: false }),
  ]);
  if (eErr) throw eErr;
  if (sErr) throw sErr;

  const latestByDay: Record<number, RoadmapModuleExamSubmission> = {};
  for (const row of (subs ?? []) as RoadmapModuleExamSubmission[]) {
    if (!latestByDay[row.template_day_number]) latestByDay[row.template_day_number] = row;
  }
  return {
    exams: (exams as RoadmapModuleExam[]) ?? [],
    latestSubmissionsByDay: latestByDay,
  };
}


export interface ModuleExamSubmitInput {
  enrollmentId: string;
  dayNumber: number;
  answer_text?: string | null;
  submission_url?: string | null;
}

export async function submitModuleExam(
  input: ModuleExamSubmitInput,
): Promise<{ submission: RoadmapModuleExamSubmission }> {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');

  const payload = {
    answer_text: input.answer_text ?? null,
    submission_url: input.submission_url ?? null,
  };

  const { data, error } = await supabase.rpc('fn_user_submit_module_exam', {
    p_enrollment_id: input.enrollmentId,
    p_day_number: input.dayNumber,
    p_payload: payload as any,
  });
  if (error) throw new Error(error.message || 'Could not submit exam.');
  return { submission: data as RoadmapModuleExamSubmission };
}





export interface ListModuleExamSubmissionsFilter {
  status?: RoadmapModuleExamSubmissionStatus;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
}


export async function adminListModuleExamSubmissions(
  filter: ListModuleExamSubmissionsFilter = {},
): Promise<RoadmapModuleExamSubmissionWithContext[]> {
  
  
  
  let q = supabase
    .from('roadmap_module_exam_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (filter.status) q = q.eq('status', filter.status);
  const { data: rows, error } = await q;
  if (error) throw error;
  const list = (rows ?? []) as RoadmapModuleExamSubmission[];
  if (!list.length) return [];

  const examIds = Array.from(new Set(list.map((r) => r.exam_id)));
  const userIds = Array.from(new Set(list.map((r) => r.user_id)));
  const roadmapIds = Array.from(new Set(list.map((r) => r.roadmap_id)));
  const reviewerIds = Array.from(new Set(list.map((r) => r.reviewed_by).filter(Boolean) as string[]));

  const [examRes, userRes, roadmapRes, reviewerRes] = await Promise.all([
    supabase.from('roadmap_module_exams').select('*').in('id', examIds),
    supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds),
    supabase.from('roadmap_templates').select('id, title, thumbnail_url, category_id').in('id', roadmapIds),
    supabase.from('profiles').select('id, full_name').in('id', reviewerIds),
  ]);
  if (examRes.error) throw examRes.error;
  if (userRes.error) throw userRes.error;
  if (roadmapRes.error) throw roadmapRes.error;
  if (reviewerRes.error) throw reviewerRes.error;

  const examById = new Map((examRes.data ?? []).map((e: any) => [e.id, e as RoadmapModuleExam]));
  const userById = new Map((userRes.data ?? []).map((u: any) => [u.id, u]));
  const roadmapById = new Map((roadmapRes.data ?? []).map((r: any) => [r.id, r]));
  const reviewerById = new Map((reviewerRes.data ?? []).map((r: any) => [r.id, r]));

  
  const categoryIds = Array.from(new Set(
    (roadmapRes.data ?? []).map((r: any) => r.category_id).filter(Boolean) as string[],
  ));
  let categoryById = new Map<string, { id: string; name: string }>();
  if (categoryIds.length) {
    const { data: catRows, error: catErr } = await supabase
      .from('categories').select('id, name').in('id', categoryIds);
    if (catErr) throw catErr;
    categoryById = new Map((catRows ?? []).map((c: any) => [c.id, c]));
  }

  
  const search = filter.search?.trim().toLowerCase();
  return list.map((s): RoadmapModuleExamSubmissionWithContext => {
    const exam = examById.get(s.exam_id) ?? null;
    const user = userById.get(s.user_id) ?? null;
    const roadmap = roadmapById.get(s.roadmap_id) ?? null;
    const reviewer = s.reviewed_by ? reviewerById.get(s.reviewed_by) ?? null : null;
    const category = roadmap?.category_id ? categoryById.get(roadmap.category_id) ?? null : null;
    return {
      ...s,
      exam_title: exam?.exam_title ?? null,
      exam_instructions: exam?.exam_instructions ?? null,
      exam_max_marks: exam?.max_marks ?? null,
      exam_pass_marks: exam?.pass_marks ?? null,
      allow_text_answer: exam?.allow_text_answer ?? null,
      allow_submission_url: (exam as any)?.allow_submission_url ?? null,
      roadmap_title: roadmap?.title ?? null,
      roadmap_thumbnail_url: roadmap?.thumbnail_url ?? null,
      category_id: roadmap?.category_id ?? null,
      category_name: category?.name ?? null,
      user_full_name: user?.full_name ?? null,
      user_email: user?.email ?? null,
      user_avatar_url: user?.avatar_url ?? null,
      reviewer_full_name: reviewer?.full_name ?? null,
    };
  }).filter((row) => {
    if (filter.categoryId && row.category_id !== filter.categoryId) return false;
    if (filter.subCategoryId && (row as any).sub_category_id !== filter.subCategoryId) return false;
    if (search) {
      const haystack = [
        row.user_full_name, row.user_email,
        row.roadmap_title, row.exam_title,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}


export interface ReviewModuleExamInput {
  submissionId: string;
  marks: number;
  feedback: string;
  decision?: 'Pass' | 'Fail';
}

export async function adminReviewModuleExam(
  input: ReviewModuleExamInput,
): Promise<RoadmapModuleExamSubmission> {
  const { data, error } = await supabase.rpc('fn_admin_review_module_exam', {
    p_submission_id: input.submissionId,
    p_marks: input.marks,
    p_feedback: input.feedback,
    p_decision: input.decision ?? null,
  });
  if (error) throw new Error(error.message || 'Could not save exam review.');
  return data as RoadmapModuleExamSubmission;
}


export async function adminMarkModuleExamUnderReview(
  submissionId: string,
): Promise<RoadmapModuleExamSubmission> {
  const { data, error } = await supabase.rpc('fn_admin_mark_module_exam_under_review', {
    p_submission_id: submissionId,
  });
  if (error) throw new Error(error.message || 'Could not update submission status.');
  return data as RoadmapModuleExamSubmission;
}






export async function userHasPassedExam(
  enrollmentId: string,
  dayNumber: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('roadmap_module_exam_submissions')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('template_day_number', dayNumber)
    .eq('status', 'Passed')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}


export async function getMyExamStats(): Promise<{
  pending: number;
  under_review: number;
  passed: number;
  failed: number;
  active_submissions: number;
}> {
  const profileId = await getMyProfileId();
  if (!profileId) {
    return { pending: 0, under_review: 0, passed: 0, failed: 0, active_submissions: 0 };
  }
  const { data, error } = await supabase
    .from('roadmap_module_exam_submissions')
    .select('status')
    .eq('user_id', profileId);
  if (error) throw error;
  const stats = { pending: 0, under_review: 0, passed: 0, failed: 0, active_submissions: 0 };
  for (const row of (data ?? []) as { status: RoadmapModuleExamSubmissionStatus }[]) {
    if (row.status === 'Pending Review') stats.pending += 1;
    else if (row.status === 'Under Review') stats.under_review += 1;
    else if (row.status === 'Passed') stats.passed += 1;
    else if (row.status === 'Failed') stats.failed += 1;
    if (row.status === 'Pending Review' || row.status === 'Under Review') {
      stats.active_submissions += 1;
    }
  }
  return stats;
}


export async function getModuleExamSubmissionDetail(
  submissionId: string,
): Promise<RoadmapModuleExamSubmissionWithContext | null> {
  const list = await adminListModuleExamSubmissions();
  return list.find((r) => r.id === submissionId) ?? null;
}


export type {
  CareerRoadmapEnrollment, CareerRoadmapProgress,
  RoadmapModuleExam,
  RoadmapModuleExamSubmission, RoadmapModuleExamSubmissionStatus,
  RoadmapModuleExamSubmissionWithContext,
  RoadmapModuleExamUpsertPayload, RoadmapTemplate,
};






export function useAdminModuleExamSubmissions(filter: ListModuleExamSubmissionsFilter = {}): {
  rows: RoadmapModuleExamSubmissionWithContext[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<RoadmapModuleExamSubmissionWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await adminListModuleExamSubmissions(filter);
      setRows(data);
    } catch (e) {
      console.error('[roadmapExams] adminList failed', e);
    } finally {
      setLoading(false);
    }
    
  }, [
    filter.status, filter.search, filter.categoryId, filter.subCategoryId,
  ]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(
    ['roadmap_module_exam_submissions', 'roadmap_module_exams'],
    load,
  );

  return { rows, loading, refresh: load };
}


export function useMyModuleExamSubmissions(): {
  rows: RoadmapModuleExamSubmission[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<RoadmapModuleExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const profileId = await getMyProfileId();
    if (!profileId) { setRows([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('roadmap_module_exam_submissions')
        .select('*')
        .eq('user_id', profileId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setRows((data as RoadmapModuleExamSubmission[]) ?? []);
    } catch (e) {
      console.error('[roadmapExams] myList failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(
    ['roadmap_module_exam_submissions'],
    load,
  );

  return { rows, loading, refresh: load };
}