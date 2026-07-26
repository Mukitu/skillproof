/**
 * Career roadmap service — Supabase is the only source of truth.
 *
 * This service supports a library of published templates, multiple independent
 * enrollments per user, rich day details and server-enforced completion.
 */
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import type {
  CareerRoadmapEnrollment, CareerRoadmapModule, CareerRoadmapProgress,
  Difficulty, RoadmapTemplate, RoadmapTemplateDay, RoadmapTemplateStatus,
} from '../types/database';

// ============================================================================
// Admin: templates, days and JSON import
// ============================================================================

export async function listRoadmapTemplates(opts?: {
  status?: RoadmapTemplateStatus;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}): Promise<RoadmapTemplate[]> {
  let q = supabase
    .from('roadmap_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts?.subCategoryId) q = q.eq('sub_category_id', opts.subCategoryId);
  if (opts?.search?.trim()) q = q.ilike('title', `%${opts.search.trim()}%`);
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

/**
 * Cascade-aware roadmap template deletion.
 *
 * The server RPC returns JSONB describing either:
 *   { ok: true,  cascaded, deleted: { ... counts ... } }   — success
 *   { ok: false, blocked: true, dependents: { ... counts ... } }
 *                                                            — dependents exist,
 *                                                              caller must confirm
 *                                                              cascade=true
 *   { ok: false, code, error }                              — any other failure
 *
 * We never surface raw PostgreSQL errors to the UI.
 */
export interface RoadmapDeleteResult {
  ok: boolean;
  cascaded?: boolean;
  blocked?: boolean;
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
}

export async function adminDeleteRoadmapTemplate(
  id: string,
  cascade: boolean = false,
): Promise<RoadmapDeleteResult> {
  const { data, error } = await supabase.rpc('fn_admin_delete_roadmap_template', {
    p_id: id,
    p_cascade: cascade,
  });
  if (error) {
    // The RPC itself uses an EXCEPTION handler, but a transport-level error
    // (e.g. network) still comes through here. Return a clean JSONB shape so
    // callers don't have to special-case it.
    return {
      ok: false,
      code: 'TRANSPORT_ERROR',
      error: error.message || 'Could not reach the server.',
      template_id: id,
    };
  }
  const result = (data ?? {}) as RoadmapDeleteResult;
  if (!result.ok) {
    // Surface the server's friendly message — never the raw PostgreSQL text.
    return result;
  }
  return result;
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
  /** Ordered step-by-step lesson instructions. */
  instructions?: string[];
  practice_tasks?: string[];
  notes?: string | null;
  /** Structured external learning resources. */
  resources?: Array<{ label?: string; url?: string; description?: string }>;
  video_title?: string | null;
  video_url?: string | null;
  video_provider?: 'youtube' | 'embed' | null;
  // Legacy fields retained for existing callers/imports.
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

// ============================================================================
// User: library + enrollments
// ============================================================================

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

/**
 * Rich details are loaded only via the server-enforced RPC — users can never
 * read public roadmap_template_days directly because the RLS policy is gated
 * to admins only. The function checks enrollment ownership + 24h unlock.
 */
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

// Backwards-compatible aliases for pages that still import the old names.
export const getActiveRoadmapAssignment = async () => {
  const enrollments = await listMyRoadmapEnrollments();
  return enrollments.find((e) => e.status === 'active') ?? null;
};
export const getAssignmentModules = getEnrollmentModules;
export const getAssignmentProgress = getEnrollmentProgress;
export const startRoadmapFromTemplate = enrollInRoadmap;
export const completeRoadmapDay = completeEnrollmentDay;

// ============================================================================
// Thumbnail upload
// ============================================================================
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
