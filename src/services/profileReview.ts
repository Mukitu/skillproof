
import { supabase } from '../lib/supabase';
import { apiUrl, authHeaders } from '../config/api';
import { getAccessToken } from './auth';
import type { Profile } from '../types/database';



export interface ManualEducationsRow {
  id?: string;
  degree: string;
  institution: string;
  year?: string | null;
  cgpa?: string | null;
  created_at?: string | null;
}
export interface ManualExperiencesRow {
  id?: string;
  role: string;
  company: string;
  duration?: string | null;
  summary?: string | null;
  created_at?: string | null;
}
export interface ManualSkillRow {
  id?: string;
  name: string;
  
  category: string;
  created_at?: string | null;
}

export interface ProfileReviewPayload {
  personal: Partial<Pick<Profile,
    'full_name' | 'phone' | 'gender' | 'date_of_birth' |
    'address' | 'district' | 'division' | 'country' | 'bio'
  >>;
  career: Partial<Pick<Profile,
    'profession' | 'current_position' | 'experience_years' |
    'experience_summary' | 'education_degree' |
    'education_institution' | 'education_year'
  >>;
  links: Partial<Pick<Profile,
    'github_url' | 'linkedin_url' | 'portfolio_url' | 'website_url'
  >>;
  educations: ManualEducationsRow[];
  experiences: ManualExperiencesRow[];
  skills: ManualSkillRow[];
}

export interface ProfileReviewRow {
  id: string;
  user_id: string;
  created_at: string;
  career_score: number | null;
  ats_compatibility_score: number | null;
  job_readiness_score: number | null;
  profile_completion: number | null;
  resume_strength_score: number | null;
  career_level: string | null;
  experience_level: string | null;
  salary_estimate_bd: string | null;
  strong_skills: string[] | null;
  weak_skills: string[] | null;
  missing_skills: string[] | null;
  recommended_skills: string[] | null;
  recommendations: string[] | null;
  ai_summary_bn: string | null;
  career_report_bn: string | null;
  ai_recommended_career_path: string | null;
  best_job_roles: string[] | null;
  priority_checklist: string[] | null;
  learning_roadmap: { next_steps?: string[]; weekly_plan?: LearningPlanWeek[] } | null;
  improvement_plan: Record<string, string[] | number> | null;
  input_snapshot: Record<string, unknown> | null;
  
  skill_strength: number | null;
  health_label: 'excellent' | 'good' | 'needs_improvement' | 'poor' | null;
  health_reasoning: string | null;
}




export interface LearningPlanItem {
  skill: string;
  note?: string;
  roadmap_id?: string | null;
  verification_task_id?: string | null;
}
export interface LearningPlanWeek {
  week: number;
  items: LearningPlanItem[];
}

export interface ProfileReviewResult {
  success: boolean;
  from_cache?: boolean;
  unchanged?: boolean;
  partial?: boolean;
  cached_at?: string;
  fallback_reason?: string;
  review?: ProfileReviewRow | null;
  history?: ProfileReviewRow[];
  error?: string;
  code?: string;
  retryable?: boolean;
  elapsed_ms?: number;
}




export async function computeProfileHash(payload: ProfileReviewPayload): Promise<string> {
  const normalised = normaliseForHash(payload);
  const json = JSON.stringify(normalised);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(json);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  }
  return 'djb2-' + (h >>> 0).toString(16);
}

function normaliseForHash(payload: ProfileReviewPayload): unknown {
  const sortStr = (a: string | null | undefined, b: string | null | undefined): number =>
    String(a ?? '').localeCompare(String(b ?? ''));

  return {
    personal: payload.personal,
    career: payload.career,
    links: payload.links,
    educations: [...payload.educations]
      .map((e) => ({
        degree: e.degree.trim(),
        institution: e.institution.trim(),
        year: (e.year ?? '').trim(),
        cgpa: (e.cgpa ?? '').trim(),
      }))
      .sort((a, b) =>
        sortStr(a.degree + a.institution, b.degree + b.institution)
      ),
    experiences: [...payload.experiences]
      .map((e) => ({
        role: e.role.trim(),
        company: e.company.trim(),
        duration: (e.duration ?? '').trim(),
        summary: (e.summary ?? '').trim(),
      }))
      .sort((a, b) =>
        sortStr(a.role + a.company, b.role + a.company)
      ),
    skills: [...payload.skills]
      .map((s) => ({
        name: s.name.trim(),
        category: (s.category || 'technical').toLowerCase().trim(),
      }))
      .filter((s) => s.name.length > 0)
      .sort((a, b) =>
        a.name.localeCompare(b.name) || a.category.localeCompare(b.category)
      ),
  };
}




function normKey(s: string): string {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normField(s: string | null | undefined): string {
  return s == null ? '' : String(s).replace(/\s+/g, ' ').trim();
}

async function requireAuth(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}


function dedupeByKey<T extends { id?: string }>(rows: T[], keyOf: (r: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    if (!seen.has(k)) seen.set(k, r);
  }
  return Array.from(seen.values());
}




export async function loadEducations(): Promise<ManualEducationsRow[]> {
  const userId = await requireAuth();
  const { data, error } = await supabase
    .from('educations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManualEducationsRow[];
}


export async function saveEducations(rows: ManualEducationsRow[]): Promise<ManualEducationsRow[]> {
  const userId = await requireAuth();

  
  const { data: existing, error: readErr } = await supabase
    .from('educations')
    .select('*')
    .eq('user_id', userId);
  if (readErr) throw readErr;
  const existingRows = (existing ?? []) as ManualEducationsRow[];
  const existingById = new Map<string, ManualEducationsRow>();
  for (const r of existingRows) if (r.id) existingById.set(r.id, r);

  
  const incoming: ManualEducationsRow[] = rows
    .map((r) => ({
      id: r.id && r.id.length > 0 ? r.id : undefined,
      degree: normField(r.degree),
      institution: normField(r.institution),
      year: normField(r.year) || null,
      cgpa: normField(r.cgpa) || null,
    }))
    
    
    .filter((r) => r.degree.length > 0 || r.institution.length > 0);

  
  const incomingById = new Map<string, ManualEducationsRow>();
  for (const r of incoming) {
    if (r.id) incomingById.set(r.id, r);
  }

  
  const toInsert: ManualEducationsRow[] = [];
  const toUpdate: Array<{ id: string; patch: Partial<ManualEducationsRow> }> = [];
  const seenIds = new Set<string>();

  for (const r of incoming) {
    if (!r.id) {
      toInsert.push(r);
    } else {
      seenIds.add(r.id);
      const prev = existingById.get(r.id);
      if (!prev) {
        
        toInsert.push(r);
      } else if (
        prev.degree !== r.degree ||
        prev.institution !== r.institution ||
        (prev.year ?? '') !== (r.year ?? '') ||
        (prev.cgpa ?? '') !== (r.cgpa ?? '')
      ) {
        toUpdate.push({ id: r.id, patch: {
          degree: r.degree,
          institution: r.institution,
          year: r.year,
          cgpa: r.cgpa,
        } });
      }
    }
  }
  const toDelete = existingRows.filter((r) => r.id && !seenIds.has(r.id)).map((r) => r.id as string);

  
  if (toInsert.length > 0) {
    const inserts = toInsert.map((r) => ({
      user_id: userId,
      degree: r.degree,
      institution: r.institution,
      year: r.year,
      cgpa: r.cgpa,
    }));
    const { error } = await supabase.from('educations').insert(inserts);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('educations')
      .update(u.patch)
      .eq('id', u.id)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('educations')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
    if (error) throw error;
  }

  
  return loadEducations();
}



export async function loadExperiences(): Promise<ManualExperiencesRow[]> {
  const userId = await requireAuth();
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManualExperiencesRow[];
}

export async function saveExperiences(rows: ManualExperiencesRow[]): Promise<ManualExperiencesRow[]> {
  const userId = await requireAuth();
  const { data: existing, error: readErr } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', userId);
  if (readErr) throw readErr;
  const existingRows = (existing ?? []) as ManualExperiencesRow[];
  const existingById = new Map<string, ManualExperiencesRow>();
  for (const r of existingRows) if (r.id) existingById.set(r.id, r);

  const incoming: ManualExperiencesRow[] = rows
    .map((r) => ({
      id: r.id && r.id.length > 0 ? r.id : undefined,
      role: normField(r.role),
      company: normField(r.company),
      duration: normField(r.duration) || null,
      summary: normField(r.summary) || null,
    }))
    .filter((r) => r.role.length > 0 || r.company.length > 0);

  const toInsert: ManualExperiencesRow[] = [];
  const toUpdate: Array<{ id: string; patch: Partial<ManualExperiencesRow> }> = [];
  const seenIds = new Set<string>();

  for (const r of incoming) {
    if (!r.id) {
      toInsert.push(r);
    } else {
      seenIds.add(r.id);
      const prev = existingById.get(r.id);
      if (!prev) {
        toInsert.push(r);
      } else if (
        prev.role !== r.role ||
        prev.company !== r.company ||
        (prev.duration ?? '') !== (r.duration ?? '') ||
        (prev.summary ?? '') !== (r.summary ?? '')
      ) {
        toUpdate.push({ id: r.id, patch: {
          role: r.role,
          company: r.company,
          duration: r.duration,
          summary: r.summary,
        } });
      }
    }
  }
  const toDelete = existingRows.filter((r) => r.id && !seenIds.has(r.id)).map((r) => r.id as string);

  if (toInsert.length > 0) {
    const inserts = toInsert.map((r) => ({
      user_id: userId,
      role: r.role,
      company: r.company,
      duration: r.duration,
      summary: r.summary,
    }));
    const { error } = await supabase.from('experiences').insert(inserts);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('experiences')
      .update(u.patch)
      .eq('id', u.id)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('experiences')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
    if (error) throw error;
  }

  return loadExperiences();
}



export async function loadSkills(): Promise<ManualSkillRow[]> {
  const userId = await requireAuth();
  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ManualSkillRow[];
}


export async function saveSkills(rows: ManualSkillRow[]): Promise<ManualSkillRow[]> {
  const userId = await requireAuth();

  
  const { data: existing, error: readErr } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId);
  if (readErr) throw readErr;
  const existingRows = (existing ?? []) as ManualSkillRow[];
  const existingById = new Map<string, ManualSkillRow>();
  for (const r of existingRows) if (r.id) existingById.set(r.id, r);

  
  
  const dedup = new Map<string, ManualSkillRow>();
  for (const r of rows) {
    const name = normField(r.name);
    if (!name) continue;
    const category = normField(r.category) || 'technical';
    const key = `${category.toLowerCase()}::${normKey(name)}`;
    if (!key) continue;
    dedup.set(key, {
      id: r.id && r.id.length > 0 ? r.id : undefined,
      name,
      category: category.toLowerCase(),
    });
  }
  const incoming = Array.from(dedup.values());

  const toInsert: ManualSkillRow[] = [];
  const toUpdate: Array<{ id: string; patch: Partial<ManualSkillRow> }> = [];
  const seenIds = new Set<string>();

  for (const r of incoming) {
    if (!r.id) {
      toInsert.push(r);
    } else {
      seenIds.add(r.id);
      const prev = existingById.get(r.id);
      if (!prev) {
        toInsert.push(r);
      } else if (
        normKey(prev.name) !== normKey(r.name) ||
        normField(prev.category).toLowerCase() !== normField(r.category).toLowerCase()
      ) {
        toUpdate.push({ id: r.id, patch: { name: r.name, category: r.category } });
      }
    }
  }
  const toDelete = existingRows.filter((r) => r.id && !seenIds.has(r.id)).map((r) => r.id as string);

  if (toInsert.length > 0) {
    const inserts = toInsert.map((r) => ({
      user_id: userId,
      name: r.name,
      category: r.category,
    }));
    const { error } = await supabase.from('user_skills').insert(inserts);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('user_skills')
      .update(u.patch)
      .eq('id', u.id)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('user_skills')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
    if (error) throw error;
  }

  return loadSkills();
}



export async function getLatestReview(): Promise<ProfileReviewRow | null> {
  const userId = await requireAuth();
  const { data, error } = await supabase
    .from('career_ai_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileReviewRow) ?? null;
}

export async function getReviewHistory(limit = 20): Promise<ProfileReviewRow[]> {
  const userId = await requireAuth();
  const { data, error } = await supabase
    .from('career_ai_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ProfileReviewRow[]) ?? [];
}


export async function generateProfileReview(
  payload: ProfileReviewPayload,
  opts: { profileHash?: string; force?: boolean } = {},
): Promise<ProfileReviewResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(apiUrl('/api/profile-review'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token).headers,
    },
    body: JSON.stringify({
      profile: payload,                
                                       
      profile_hash: opts.profileHash ?? '',
      force: !!opts.force,
    }),
  });

  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch {
    throw new Error(`Server returned non-JSON (status ${res.status}): ${text.slice(0, 160)}`);
  }
  return body as ProfileReviewResult;
}


export function profileToPayload(profile: Profile | null): ProfileReviewPayload {
  if (!profile) {
    return {
      personal: {},
      career: {},
      links: {},
      educations: [],
      experiences: [],
      skills: [],
    };
  }
  return {
    personal: {
      full_name: profile.full_name ?? null,
      phone: profile.phone ?? null,
      gender: profile.gender ?? null,
      date_of_birth: profile.date_of_birth ?? null,
      address: profile.address ?? null,
      district: profile.district ?? null,
      division: profile.division ?? null,
      country: profile.country ?? null,
      bio: profile.bio ?? null,
    },
    career: {
      profession: profile.profession ?? null,
      current_position: profile.current_position ?? null,
      experience_years: profile.experience_years ?? null,
      experience_summary: profile.experience_summary ?? null,
      education_degree: profile.education_degree ?? null,
      education_institution: profile.education_institution ?? null,
      education_year: profile.education_year ?? null,
    },
    links: {
      github_url: profile.github_url ?? null,
      linkedin_url: profile.linkedin_url ?? null,
      portfolio_url: profile.portfolio_url ?? null,
      website_url: profile.website_url ?? null,
    },
    educations: [],
    experiences: [],
    skills: [],
  };
}




export function isValidUrl(value: string): boolean {
  if (!value) return true;
  const s = value.trim();
  if (!/^https?:\/\//.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}


export function normaliseUrl(value: string): string {
  let s = (value || '').trim();
  if (!/^https?:\/\//.test(s)) {
    s = 'https://' + s;
  }
  return s;
}
