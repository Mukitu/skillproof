
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import { logActivity } from './activity';
import type {
  SkillVerificationDeleteResult, SkillVerificationSubmission,
  SkillVerificationSubmissionStatus, SkillVerificationSubmissionWithContext,
  SkillVerificationTask, SkillVerificationTaskStats, SkillVerificationTaskStatus,
  SkillVerificationMySubmission,
} from '../types/database';



export type {
  SkillVerificationDeleteResult, SkillVerificationSubmission,
  SkillVerificationSubmissionStatus, SkillVerificationSubmissionWithContext,
  SkillVerificationTask, SkillVerificationTaskStats, SkillVerificationTaskStatus,
  SkillVerificationMySubmission,
} from '../types/database';





export interface ListSkillVerificationTasksOptions {
  status?: SkillVerificationTaskStatus;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}

export async function listSkillVerificationTasks(
  opts?: ListSkillVerificationTasksOptions,
): Promise<SkillVerificationTask[]> {
  let q = supabase
    .from('skill_verification_tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts?.subCategoryId) q = q.eq('sub_category_id', opts.subCategoryId);
  if (opts?.search?.trim()) q = q.ilike('title', `%${opts.search.trim()}%`);
  const { data, error } = await q;
  if (error) {
    
    throw new Error(`Could not load verification tasks: ${error.message || 'Unknown error'}`);
  }
  return (data as SkillVerificationTask[]) ?? [];
}

export async function getSkillVerificationTask(id: string): Promise<SkillVerificationTask | null> {
  const { data, error } = await supabase
    .from('skill_verification_tasks').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load task: ${error.message || 'Unknown error'}`);
  return (data as SkillVerificationTask) ?? null;
}





export interface SkillVerificationTaskInput {
  category_id: string;
  sub_category_id: string | null;
  title: string;
  description: string;
  submission_instructions: string;
}

export async function adminCreateSkillVerificationTask(
  input: SkillVerificationTaskInput,
): Promise<SkillVerificationTask> {
  if (!input.category_id) throw new Error('Main category is required.');
  const { data, error } = await supabase.rpc('fn_admin_create_skill_verification_task', {
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id,
    p_title: input.title,
    p_description: input.description,
    p_submission_instructions: input.submission_instructions,
  });
  if (error) throw new Error(`Could not create verification task: ${error.message || 'Unknown error'}`);
  return data as SkillVerificationTask;
}

export interface SkillVerificationTaskUpdateInput extends SkillVerificationTaskInput {
  status: SkillVerificationTaskStatus;
}

export async function adminUpdateSkillVerificationTask(
  id: string,
  input: SkillVerificationTaskUpdateInput,
): Promise<SkillVerificationTask> {
  if (!input.category_id) throw new Error('Main category is required.');
  const { data, error } = await supabase.rpc('fn_admin_update_skill_verification_task', {
    p_id: id,
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id,
    p_title: input.title,
    p_description: input.description,
    p_submission_instructions: input.submission_instructions,
    p_status: input.status,
  });
  if (error) throw new Error(`Could not update verification task: ${error.message || 'Unknown error'}`);
  return data as SkillVerificationTask;
}

export async function adminPublishSkillVerificationTask(
  id: string, publish: boolean,
): Promise<SkillVerificationTask> {
  const { data, error } = await supabase.rpc('fn_admin_publish_skill_verification_task', {
    p_id: id, p_publish: publish,
  });
  if (error) throw new Error(`Could not update task status: ${error.message || 'Unknown error'}`);
  return data as SkillVerificationTask;
}


export async function adminDeleteSkillVerificationTask(
  id: string,
  cascade: boolean = false,
): Promise<SkillVerificationDeleteResult> {
  const { data, error } = await supabase.rpc('fn_admin_delete_skill_verification_task', {
    p_id: id, p_cascade: cascade,
  });
  if (error) {
    return {
      ok: false,
      code: 'TRANSPORT_ERROR',
      error: error.message || 'Could not reach the server.',
      template_id: id,
    };
  }
  const result = (data ?? {}) as SkillVerificationDeleteResult;
  return result;
}

export async function adminSkillVerificationTaskStats(
  id: string,
): Promise<SkillVerificationTaskStats> {
  const { data, error } = await supabase.rpc('fn_admin_skill_verification_task_stats', { p_id: id });
  if (error) throw new Error(`Could not load task stats: ${error.message || 'Unknown error'}`);
  return data as SkillVerificationTaskStats;
}

export interface SkillVerificationImportRowResult {
  row: number;
  status: 'created' | 'invalid';
  task_id?: string | null;
  error?: string | null;
  title?: string | null;
}

export interface SkillVerificationImportSummary {
  ok: boolean;
  inserted: number;
  failed: number;
  total: number;
  results: SkillVerificationImportRowResult[];
}

export async function adminImportSkillVerificationJson(
  payload: unknown,
  categoryId: string,
  subCategoryId: string | null,
): Promise<SkillVerificationImportSummary> {
  if (!categoryId) throw new Error('A category must be selected.');
  const { data, error } = await supabase.rpc('fn_admin_import_skill_verification_json', {
    p_payload: payload as any,
    p_category_id: categoryId,
    p_sub_category_id: subCategoryId || null,
  });
  if (error) {
    throw new Error(error.message || 'Could not import verification tasks.');
  }
  return data as SkillVerificationImportSummary;
}


export function buildSkillVerificationExportJson(
  tasks: SkillVerificationTask[],
): { tasks: Array<Record<string, unknown>> } {
  return {
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description,
      submission_instructions: t.submission_instructions,
      difficulty: t.difficulty,
      assessment_type: t.assessment_type,
      estimated_time: t.estimated_time ?? '',
      max_marks: t.max_marks,
      pass_marks: t.pass_marks,
      status: t.status,
    })),
  };
}





export interface ListSkillVerificationSubmissionsOptions {
  status?: SkillVerificationSubmissionStatus;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
}

export async function adminListSkillVerificationSubmissions(
  opts?: ListSkillVerificationSubmissionsOptions,
): Promise<SkillVerificationSubmissionWithContext[]> {
  const { data, error } = await supabase.rpc('fn_admin_list_skill_verification_submissions', {
    p_status: opts?.status ?? null,
    p_search: opts?.search ?? null,
    p_category_id: opts?.categoryId ?? null,
    p_sub_category_id: opts?.subCategoryId ?? null,
  });
  if (error) throw new Error(`Could not load submissions: ${error.message || 'Unknown error'}`);
  return (data as SkillVerificationSubmissionWithContext[]) ?? [];
}

export async function adminReviewSkillVerificationSubmission(
  submissionId: string,
  score: number,
  feedback: string,
): Promise<SkillVerificationSubmission> {
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new Error('Score must be an integer between 0 and 10.');
  }
  if (!feedback || !feedback.trim()) {
    throw new Error('Feedback is required.');
  }
  const { data, error } = await supabase.rpc('fn_admin_review_skill_verification_submission', {
    p_submission_id: submissionId,
    p_score: score,
    p_feedback: feedback,
  });
  if (error) throw new Error(`Could not review submission: ${error.message || 'Unknown error'}`);
  const row = data as SkillVerificationSubmission;
  void logActivity('assessment.reviewed', `Reviewed submission (score ${score}/10)`, {
    entityType: 'skill_verification_submission',
    entityId: row.id,
    metadata: { score, status: row.status },
  });
  return row;
}


export async function adminMarkSubmissionUnderReview(
  submissionId: string,
): Promise<SkillVerificationSubmission> {
  const { data, error } = await supabase.rpc('fn_admin_mark_submission_under_review', {
    p_submission_id: submissionId,
  });
  if (error) throw new Error(`Could not mark submission under review: ${error.message || 'Unknown error'}`);
  return data as SkillVerificationSubmission;
}





export async function submitSkillVerificationTask(
  taskId: string,
  answerText: string,
  projectUrl: string | null = null,
): Promise<SkillVerificationSubmission> {
  if (!taskId) throw new Error('Task is required.');
  const trimmedAnswer = (answerText ?? '').trim();
  const trimmedUrl = (projectUrl ?? '').trim();
  if (!trimmedAnswer && !trimmedUrl) {
    throw new Error('Please provide either a code/text answer or a project URL.');
  }
  if (trimmedUrl && !/^https?:\/\//.test(trimmedUrl)) {
    throw new Error('Project URL must start with http:// or https://.');
  }
  const { data, error } = await supabase.rpc('fn_user_submit_skill_verification', {
    p_task_id: taskId,
    p_answer_text: trimmedAnswer || null,
    p_project_url: trimmedUrl || null,
  });
  if (error) throw new Error(`Could not submit task: ${error.message || 'Unknown error'}`);
  const row = data as SkillVerificationSubmission;
  void logActivity('verification.created', `Submitted skill verification task`, {
    entityType: 'skill_verification_submission',
    entityId: row.id,
    metadata: { task_id: taskId, has_answer: Boolean(trimmedAnswer), has_url: Boolean(trimmedUrl) },
  });
  return row;
}

export async function listMySkillVerificationSubmissions(): Promise<SkillVerificationMySubmission[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase.rpc('fn_user_list_my_skill_verification_submissions');
  if (error) throw new Error(`Could not load your submissions: ${error.message || 'Unknown error'}`);
  return (data as SkillVerificationMySubmission[]) ?? [];
}
