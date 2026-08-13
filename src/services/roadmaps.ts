
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import type {
  CareerRoadmapEnrollment, CareerRoadmapModule, CareerRoadmapProgress,
  Difficulty, RoadmapTemplate, RoadmapTemplateDay, RoadmapTemplateStatus,
} from '../types/database';





export async function listRoadmapTemplates(opts?: {
  status?: RoadmapTemplateStatus;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
  
  includeDeleted?: boolean;
}): Promise<RoadmapTemplate[]> {
  let q = supabase
    .from('roadmap_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts?.subCategoryId) q = q.eq('sub_category_id', opts.subCategoryId);
  if (opts?.search?.trim()) q = q.ilike('title', `%${opts.search.trim()}%`);
  if (!opts?.includeDeleted) q = q.is('deleted_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return (data as RoadmapTemplate[]) ?? [];
}

export async function getRoadmapTemplate(id: string): Promise<RoadmapTemplate | null> {
  const { data, error } = await supabase
    .from('roadmap_templates').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as RoadmapTemplate) ?? null;
}

export async function getRoadmapTemplateDays(templateId: string): Promise<RoadmapTemplateDay[]> {
  const { data, error } = await supabase
    .from('roadmap_template_days').select('*')
    .eq('template_id', templateId).order('day_number', { ascending: true });
  if (error) throw error;
  return (data as RoadmapTemplateDay[]) ?? [];
}

export async function getRoadmapTemplateDay(
  templateId: string, dayNumber: number,
): Promise<RoadmapTemplateDay | null> {
  const { data, error } = await supabase
    .from('roadmap_template_days').select('*')
    .eq('template_id', templateId).eq('day_number', dayNumber).maybeSingle();
  if (error) throw error;
  return (data as RoadmapTemplateDay) ?? null;
}

export async function adminCreateRoadmapTemplate(input: {
  category_id: string;
  sub_category_id: string | null;
  title: string;
  description: string;
  total_days: number;
  difficulty: Difficulty;
  status: RoadmapTemplateStatus;
  thumbnail_url?: string | null;
}): Promise<RoadmapTemplate> {
  if (!input.category_id) throw new Error('Main category is required.');
  const { data, error } = await supabase.rpc('fn_admin_create_roadmap_template', {
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id,
    p_title: input.title,
    p_description: input.description,
    p_total_days: input.total_days,
    p_difficulty: input.difficulty,
    p_status: input.status,
  });
  if (error) throw new Error(`Could not create roadmap template: ${error.message || 'Unknown error'}`);
  if (input.thumbnail_url) return adminSetRoadmapThumbnail(data.id, input.thumbnail_url);
  return data as RoadmapTemplate;
}

export async function adminUpdateRoadmapTemplate(id: string, input: {
  category_id: string;
  sub_category_id: string | null;
  title: string;
  description: string;
  total_days: number;
  difficulty: Difficulty;
  status: RoadmapTemplateStatus;
  thumbnail_url?: string | null;
}): Promise<RoadmapTemplate> {
  if (!input.category_id) throw new Error('Main category is required.');
  const { data, error } = await supabase.rpc('fn_admin_update_roadmap_template', {
    p_id: id,
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id,
    p_title: input.title,
    p_description: input.description,
    p_total_days: input.total_days,
    p_difficulty: input.difficulty,
    p_status: input.status,
  });
  if (error) throw new Error(`Could not update roadmap template: ${error.message || 'Unknown error'}`);
  if (input.thumbnail_url !== undefined && input.thumbnail_url !== null) {
    return adminSetRoadmapThumbnail(id, input.thumbnail_url);
  }
  return data as RoadmapTemplate;
}

export async function adminSetRoadmapThumbnail(id: string, thumbnail_url: string) {
  const { data, error } = await supabase.rpc('fn_admin_set_roadmap_thumbnail', {
    p_template_id: id, p_thumbnail_url: thumbnail_url,
  });
  if (error) throw new Error(`Could not set thumbnail: ${error.message || 'Unknown error'}`);
  return data as RoadmapTemplate;
}


export interface RoadmapDeleteOptions {
  
  preserveUserData?: boolean;
  
  cascade?: boolean;
}

export interface RoadmapDeleteResult {
  ok: boolean;
  cascaded?: boolean;
  blocked?: boolean;
  mode?: 'preserve' | 'hard_delete';
  code?: string;
  error?: string;
  template_id?: string;
  dependents?: {
    legacy_assignments: number;
    enrollments: number;
    progress_rows: number;
    module_rows: number;
    template_days: number;
    affected_user_count: number;
  };
  deleted?: {
    legacy_assignments: number;
    enrollments: number;
    progress_rows: number;
    module_rows: number;
    template_days: number;
    affected_user_count: number;
  };
  preserved?: {
    enrollments: number;
    progress: number;
    certificates: number;
  };
  message?: string;
}

export async function adminDeleteRoadmapTemplate(
  id: string,
  options: RoadmapDeleteOptions = {},
): Promise<RoadmapDeleteResult> {
  const { data, error } = await supabase.rpc('fn_admin_delete_roadmap_template', {
    p_id: id,
    p_cascade: options.cascade ?? false,
    p_preserve_user_data: options.preserveUserData ?? true,
  });
  if (error) {
    
    return {
      ok: false,
      code: 'TRANSPORT_ERROR',
      error: error.message || 'Could not reach the server.',
      template_id: id,
    };
  }
  return (data ?? {}) as RoadmapDeleteResult;
}

export interface RoadmapTemplateStats {
  template_id: string;
  template_title: string;
  has_dependents: boolean;
  dependents: {
    legacy_assignments: number;
    enrollments: number;
    progress_rows: number;
    module_rows: number;
    template_days: number;
    affected_user_count: number;
  };
}

export async function adminRoadmapTemplateStats(id: string): Promise<RoadmapTemplateStats> {
  const { data, error } = await supabase.rpc('fn_admin_roadmap_template_stats', { p_id: id });
  if (error) throw new Error(`Could not load roadmap stats: ${error.message || 'Unknown error'}`);
  return data as RoadmapTemplateStats;
}

export async function adminPublishRoadmapTemplate(id: string, publish: boolean) {
  const { data, error } = await supabase.rpc('fn_admin_publish_roadmap_template', {
    p_id: id, p_publish: publish,
  });
  if (error) throw new Error(`Could not publish roadmap: ${error.message || 'Unknown error'}`);
  return data as RoadmapTemplate;
}

export interface TemplateDayInput {
  template_id: string;
  day_number: number;
  title: string;
  description?: string | null;
  estimated_minutes?: number;
  learning_objectives?: string[];
  
  instructions?: string[];
  practice_tasks?: string[];
  notes?: string | null;
  
  resources?: Array<{ label?: string; url?: string; description?: string }>;
  video_title?: string | null;
  video_url?: string | null;
  video_provider?: 'youtube' | 'embed' | null;
  
  study_materials?: string[];
  extra_resources?: Array<{ label?: string; url?: string; description?: string }>;
  video_links?: string[];
  pdfs?: string[];
  mini_project?: string | null;
  assignment?: string | null;
}

export async function adminUpsertTemplateDay(input: TemplateDayInput): Promise<RoadmapTemplateDay> {
  const payload = {
    template_id: input.template_id,
    day_number: input.day_number,
    title: input.title,
    description: input.description ?? null,
    estimated_minutes: input.estimated_minutes ?? 60,
    learning_objectives: input.learning_objectives ?? [],
    instructions: input.instructions ?? input.study_materials ?? [],
    practice_tasks: input.practice_tasks ?? [],
    notes: input.notes ?? null,
    resources: input.resources ?? input.extra_resources ?? [],
    video_title: input.video_title ?? null,
    video_url: input.video_url ?? null,
    video_provider: input.video_provider ?? (input.video_url ? 'youtube' : null),
  };
  const { data, error } = await supabase.rpc('fn_admin_upsert_roadmap_day_lesson', {
    p_payload: payload,
  });
  if (error) throw new Error(`Could not save template day: ${error.message || 'Unknown error'}`);
  return data as RoadmapTemplateDay;
}

export async function adminDeleteTemplateDay(id: string) {
  const { error } = await supabase.from('roadmap_template_days').delete().eq('id', id);
  if (error) throw new Error(`Could not delete template day: ${error.message || 'Unknown error'}`);
}

export interface ImportRoadmapJsonResult {
  template_id: string;
  inserted_days: number;
  total_days_in_payload: number;
}

export async function adminImportRoadmapJson(
  templateId: string, payload: unknown,
): Promise<ImportRoadmapJsonResult> {
  const { data, error } = await supabase.rpc('fn_admin_import_roadmap_json', {
    p_template_id: templateId, p_payload: payload as any,
  });
  if (error) throw new Error(`Could not import JSON: ${error.message || 'Unknown error'}`);
  return data as ImportRoadmapJsonResult;
}





export async function listPublishedRoadmapLibrary(opts?: {
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}): Promise<RoadmapTemplate[]> {
  return listRoadmapTemplates({ ...opts, status: 'Published' });
}

export async function listMyRoadmapEnrollments(): Promise<CareerRoadmapEnrollment[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('career_roadmap_enrollment').select('*')
    .eq('user_id', profileId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CareerRoadmapEnrollment[]) ?? [];
}


export interface EnrollmentWithTemplateStatus extends CareerRoadmapEnrollment {
  template_deleted: boolean;
  template_status: RoadmapTemplateStatus | null;
}

export async function listMyRoadmapEnrollmentsWithTemplateStatus(): Promise<EnrollmentWithTemplateStatus[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];

  
  
  
  
  
  let data: any[] | null = null;
  let lastError: any = null;

  const rich = await supabase
    .from('career_roadmap_enrollment')
    .select('*, roadmap_templates!career_roadmap_enrollment_template_id_fkey(status, deleted_at)')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (!rich.error) {
    data = rich.data as any[];
  } else {
    lastError = rich.error;
    const fallback = await supabase
      .from('career_roadmap_enrollment')
      .select('*, roadmap_templates!career_roadmap_enrollment_template_id_fkey(status)')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });
    if (fallback.error) {
      
      throw fallback.error || lastError;
    }
    data = fallback.data as any[];
  }

  return (data ?? []).map((row) => {
    const tpl = row.roadmap_templates;
    return {
      ...row,
      
      
      template_deleted: !!tpl?.deleted_at,
      template_status: tpl?.status ?? null,
    } as EnrollmentWithTemplateStatus;
  });
}

export async function getRoadmapEnrollment(id: string): Promise<CareerRoadmapEnrollment | null> {
  const { data, error } = await supabase
    .from('career_roadmap_enrollment').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as CareerRoadmapEnrollment) ?? null;
}

export async function enrollInRoadmap(templateId: string): Promise<CareerRoadmapEnrollment> {
  const { data, error } = await supabase.rpc('fn_user_enroll_roadmap', {
    p_template_id: templateId,
  });
  if (error) throw new Error(`Could not enroll in roadmap: ${error.message || 'Unknown error'}`);
  return data as CareerRoadmapEnrollment;
}

export async function getEnrollmentModules(enrollmentId: string): Promise<CareerRoadmapModule[]> {
  const { data, error } = await supabase
    .from('career_roadmap_modules').select('*')
    .eq('enrollment_id', enrollmentId).order('day_number', { ascending: true });
  if (error) throw error;
  return (data as CareerRoadmapModule[]) ?? [];
}

export async function getEnrollmentProgress(enrollmentId: string): Promise<CareerRoadmapProgress[]> {
  const { data, error } = await supabase
    .from('career_roadmap_progress').select('*')
    .eq('enrollment_id', enrollmentId).order('day_number', { ascending: true });
  if (error) throw error;
  return (data as CareerRoadmapProgress[]) ?? [];
}


export async function getUnlockedDayDetails(
  enrollmentId: string, _templateId: string, dayNumber: number,
): Promise<RoadmapTemplateDay | null> {
  const { data, error } = await supabase.rpc('fn_user_get_roadmap_day_details', {
    p_enrollment_id: enrollmentId, p_day_number: dayNumber,
  });
  if (error) throw new Error(error.message || 'Could not load day details.');
  return (data as RoadmapTemplateDay) ?? null;
}

export async function completeEnrollmentDay(
  enrollmentId: string, dayNumber: number,
): Promise<CareerRoadmapProgress> {
  const { data, error } = await supabase.rpc('fn_user_complete_roadmap_day', {
    p_enrollment_id: enrollmentId, p_day_number: dayNumber,
  });
  if (error) throw new Error(`Could not complete day: ${error.message || 'Unknown error'}`);
  return data as CareerRoadmapProgress;
}


export const getActiveRoadmapAssignment = async () => {
  const enrollments = await listMyRoadmapEnrollments();
  return enrollments.find((e) => e.status === 'active') ?? null;
};
export const getAssignmentModules = getEnrollmentModules;
export const getAssignmentProgress = getEnrollmentProgress;
export const startRoadmapFromTemplate = enrollInRoadmap;
export const completeRoadmapDay = completeEnrollmentDay;




const ROADMAP_BUCKET = 'roadmap-assets';

export async function uploadRoadmapThumbnail(templateId: string, file: File): Promise<string> {
  const valid = ['image/jpeg', 'image/png', 'image/webp'];
  if (!valid.includes(file.type)) throw new Error('Thumbnail must be JPG, PNG or WEBP.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${templateId}/thumbnail-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(ROADMAP_BUCKET).upload(path, file, {
    upsert: true, contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(ROADMAP_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
