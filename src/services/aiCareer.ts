
import { supabase } from '../lib/supabase';
import { apiUrl, ApiHtmlResponseError, ApiNetworkError } from '../config/api';
import { getAccessToken, getCurrentUser, getCurrentSession } from './auth';
import { updateProfile, uploadResume, getMyProfile } from './profile';
import { logActivity } from './activity';
import { getMyPassports } from './passports';
import { getVerifiedSkills } from './verifiedSkills';
import { listMySkillVerificationSubmissions } from './skillVerification';
import { listMyRoadmapEnrollments } from './roadmaps';
import type {
  ParsedCVProfile, ConfidenceScore, ResumeParsedData, Profile,
  CareerAIReport, VerifiedSkill, SkillVerificationMySubmission,
  CareerRoadmapEnrollment,
} from '../types/database';


export async function getAuthUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}


export const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/msword', 
  'text/plain', 
] as const;
export const MAX_RESUME_BYTES = 10 * 1024 * 1024; 


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}


export function validateResumeFile(file: File): { ok: boolean; error: string } {
  const lower = file.name.toLowerCase();
  const okExt = lower.endsWith('.pdf') || lower.endsWith('.docx') || lower.endsWith('.doc') || lower.endsWith('.txt');
  const okMime = ALLOWED_RESUME_TYPES.includes(file.type as any) || file.type === '';
  if (!okExt && !okMime) {
    return { ok: false, error: 'Only PDF, DOCX, DOC, and TXT files are accepted.' };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, error: `Resume is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` };
  }
  if (file.size === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }
  return { ok: true, error: '' };
}


export interface ParseResumeResult {
  profile: ParsedCVProfile;
  confidence: ConfidenceScore;
  
  applied: string[];
  
  appliedProfile: Profile | null;
  
  appliedOverwrite: boolean;
  parseId: string | null;
  service: string | null;
  elapsedMs: number | null;
}

export async function parseResume(
  file: File,
  options: { autoApply?: boolean; overwrite?: boolean; resumeUrl?: string | null } = {},
): Promise<ParseResumeResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const base64Data = await fileToBase64(file);

  
  
  
  const RETRY_DELAY_MS = 800;
  const MAX_ATTEMPTS = 2;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(apiUrl('/api/parse-cv'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          autoApply: options.autoApply !== false,        
          overwrite: options.overwrite === true,        
          resumeUrl: options.resumeUrl ?? null,
        }),
      });
      
      
      const rawText = await res.text();
      const looksLikeHtml = /^\s*<(!doctype|html|HTML)/i.test(rawText);
      if (looksLikeHtml) {
        throw new Error(
          'Backend API URL misconfigured. The server returned an HTML page instead of JSON. ' +
          'Please verify that /api/parse-cv is reachable on the current origin.'
        );
      }
      let body: any = {};
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          throw new Error(`Failed to parse server response as JSON. First 160 chars: ${rawText.slice(0, 160)}`);
        }
      }
      if (!res.ok) {
        const code = body?.code || 'INTERNAL';
        
        
        
        
        
        
        const friendlyFromServer = typeof body?.error === 'string' && body.error.trim() !== '';
        const isRawCode = !friendlyFromServer || body.error === code;
        const display = friendlyFromServer && !isRawCode
          ? body.error
          : `AI parsing failed (${code}). Please try again.`;
        const err: any = new Error(display);
        err.code = code;
        err.status = res.status;
        err.details = body?.details;
        err.retryable = body?.retryable === true;
        
        
        
        
        const transient =
          err.retryable === true ||
          err.code === 'GROQ_RATE_LIMIT' ||
          res.status === 429 ||
          (res.status >= 500 && res.status < 600);
        if (!transient || attempt >= MAX_ATTEMPTS) throw err;
        lastErr = err;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      if (!body?.success || !body?.profile) {
        const err: any = new Error('AI service returned an empty result. Please try again.');
        err.code = 'EMPTY_RESULT';
        if (attempt >= MAX_ATTEMPTS) throw err;
        lastErr = err;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      return {
        profile: body.profile as ParsedCVProfile,
        confidence: (body.confidence || { overall: 0, by_field: {} }) as ConfidenceScore,
        applied: Array.isArray(body?.auto_fill?.applied) ? body.auto_fill.applied : [],
        appliedProfile: (body?.auto_fill?.profile ?? null) as Profile | null,
        appliedOverwrite: body?.auto_fill?.overwrite === true,
        parseId: body?.parse_id ?? null,
        service: body?.service ?? null,
        elapsedMs: typeof body?.elapsed_ms === 'number' ? body.elapsed_ms : null,
      };
    } catch (e: any) {
      
      
      if (e instanceof ApiHtmlResponseError) throw e;
      if (e instanceof ApiNetworkError) {
        lastErr = e;
        if (attempt >= MAX_ATTEMPTS) throw e;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      
      lastErr = e;
      const transientNetwork = e instanceof TypeError || /Network|Failed to fetch|AbortError/i.test(String(e?.message));
      if (!transientNetwork || attempt >= MAX_ATTEMPTS) {
        
        
        
        
        if (transientNetwork) {
          const friendly: any = new Error(
            'AI service is temporarily unreachable. ' +
            'The backend did not respond. ' +
            'Please try again in a minute. If this persists, the server is being restarted.'
          );
          friendly.code = 'BACKEND_UNREACHABLE';
          friendly.cause = e;
          throw friendly;
        }
        throw e;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr ?? new Error('AI parsing failed. Please try again.');
}


export async function uploadResumeToStorage(file: File): Promise<{ path: string; url: string }> {
  const path = await uploadResume(file);
  const { data } = supabase.storage.from('resumes').getPublicUrl(path);
  return { path, url: data.publicUrl };
}


export async function getMyResumeStoragePath(): Promise<{ path: string | null; url: string | null }> {
  try {
    const profile = await getMyProfile();
    const path = (profile?.resume_storage_path as string | null) ?? null;
    const url = (profile?.resume_url as string | null) ?? null;
    return { path, url };
  } catch {
    return { path: null, url: null };
  }
}


export async function deleteMyResume(): Promise<{
  deletedFile: boolean;
  clearedProfile: boolean;
  clearedParse: boolean;
  clearedReport: boolean;
  clearedJobMatches: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  let deletedFile = false;
  let clearedProfile = false;
  let clearedParse = false;
  let clearedReport = false;
  let clearedJobMatches = false;

  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const authId = user.id;
  const token = await getAccessToken();

  
  
  
  const { path } = await getMyResumeStoragePath();
  if (path) {
    if (!token) {
      warnings.push('Missing auth token for storage delete.');
    } else {
      try {
        const res = await fetch(apiUrl('/api/storage/resume/delete'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ path }),
        });
        if (res.status === 403) {
          
          throw new Error('You can only delete your own uploaded CV.');
        }
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok || !body?.success) {
          warnings.push(
            `Storage delete failed (HTTP ${res.status}): ${body?.error || 'unknown'}`,
          );
        } else {
          deletedFile = body.deletedFile === true;
          if (!deletedFile && body.warning) {
            warnings.push(`Storage warning: ${body.warning}`);
          }
        }
      } catch (e: any) {
        warnings.push(`Storage delete error: ${e?.message || String(e)}`);
      }
    }
  }

  
  
  
  
  try {
    const { data, error } = await supabase.rpc('fn_clear_my_cv_state');
    if (error) {
      warnings.push(`CV state clear RPC failed: ${error.message}`);
    } else if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        deleted_parse?: boolean;
        deleted_report?: boolean;
        cleared_profile?: boolean;
        cleared_job_matches?: boolean;
        warnings?: string[];
      };
      clearedParse = !!row.deleted_parse;
      clearedReport = !!row.deleted_report;
      clearedProfile = !!row.cleared_profile;
      clearedJobMatches = !!row.cleared_job_matches;
      if (Array.isArray(row.warnings)) {
        for (const w of row.warnings) warnings.push(`rpc: ${w}`);
      }
    }
  } catch (e: any) {
    warnings.push(`CV state clear RPC threw: ${e?.message || String(e)}`);
  }

  
  
  
  if (!clearedProfile && !clearedParse && !clearedReport) {
    try {
      const reportDel = await supabase
        .from('career_ai_reports')
        .delete()
        .eq('user_id', authId);
      if (reportDel.error) {
        warnings.push(`career_ai_reports fallback delete failed: ${reportDel.error.message}`);
      } else {
        clearedReport = true;
      }
    } catch (e: any) {
      warnings.push(`career_ai_reports fallback threw: ${e?.message || String(e)}`);
    }
    try {
      const parseDel = await supabase
        .from('resume_parsed_data')
        .delete()
        .eq('user_id', authId);
      if (parseDel.error) {
        warnings.push(`resume_parsed_data fallback delete failed: ${parseDel.error.message}`);
      } else {
        clearedParse = true;
      }
    } catch (e: any) {
      warnings.push(`resume_parsed_data fallback threw: ${e?.message || String(e)}`);
    }
    try {
      const upsertRes = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: authId,
            resume_url: null,
            resume_storage_path: null,
            ai_last_analysis: null,
          },
          { onConflict: 'user_id' },
        );
      if (upsertRes.error) {
        warnings.push(`profiles fallback upsert failed: ${upsertRes.error.message}`);
      } else {
        clearedProfile = true;
      }
    } catch (e: any) {
      warnings.push(`profiles fallback threw: ${e?.message || String(e)}`);
    }
  }

  
  
  
  if (!deletedFile && !clearedProfile && !clearedParse && !clearedReport) {
    throw new Error(
      `Delete CV failed on every layer. Warnings: ${warnings.join(' | ') || 'none'}`,
    );
  }

  return {
    deletedFile,
    clearedProfile,
    clearedParse,
    clearedReport,
    clearedJobMatches,
    warnings,
  };
}


export async function clearUserAnalysis(userId: string): Promise<void> {
  if (!userId) return;
  try {
    
    
    
    await supabase.from('career_ai_reports').delete().eq('user_id', userId);
    await supabase.from('resume_parsed_data').delete().eq('user_id', userId);
  } catch {
    
  }
}


export async function deleteOldResumeFile(): Promise<string | null> {
  const { path } = await getMyResumeStoragePath();
  if (!path) return null;
  const { error } = await supabase.storage.from('resumes').remove([path]);
  if (error) {
    
    
    
    console.warn('[aiCareer] failed to remove old resume file', error);
  }
  return path;
}


export async function saveResumeParsedData(
  userId: string,
  parsed: ParsedCVProfile,
  confidence: ConfidenceScore,
  sourceFileName: string | null,
): Promise<ResumeParsedData> {
  const { data, error } = await supabase
    .from('resume_parsed_data')
    .insert({
      user_id: userId,
      parsed_json: parsed as any,
      confidence_json: confidence as any,
      source_file_name: sourceFileName,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Could not save parse: ${error.message}`);
  return data as ResumeParsedData;
}


export async function getLatestResumeParsedData(userId: string): Promise<ResumeParsedData | null> {
  const { data, error } = await supabase
    .from('resume_parsed_data')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as ResumeParsedData) ?? null;
}


export async function listResumeParsedData(userId: string): Promise<ResumeParsedData[]> {
  const { data, error } = await supabase
    .from('resume_parsed_data')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return (data as ResumeParsedData[]) ?? [];
}


export async function applyResumeToCandidateProfile(
  parsed: ParsedCVProfile,
  fileUrl: string,
  options: { overwrite?: boolean; storagePath?: string | null } = {},
): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const overwrite = options.overwrite === true;
  const has = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';
  const fillOrKeep = (current: any, next: any) => {
    if (overwrite) return has(next) ? next : current ?? null;
    return has(current) ? current : (has(next) ? next : null);
  };

  const pi = parsed.personal_information || {};
  const allSkills = [
    ...(parsed.skills?.technical ?? []),
    ...(parsed.skills?.tools ?? []),
    ...(parsed.skills?.languages ?? []),
  ].filter((s) => has(s));
  const softSkills = (parsed.skills?.soft ?? []).filter((s) => has(s));
  const mergedSkills = Array.from(new Set([...allSkills, ...softSkills]));

  const firstEdu = parsed.education?.[0];
  const firstExp = parsed.experience?.[0];
  const totalExpYears = Array.isArray(parsed.experience) ? parsed.experience.length : null;

  const patch: Record<string, any> = {
    resume_url: fileUrl || (existing as any)?.resume_url || null,
    
    
    resume_storage_path: options.storagePath ?? (existing as any)?.resume_storage_path ?? null,
    ai_last_analysis: new Date().toISOString(),
  };

  patch.full_name = fillOrKeep((existing as any)?.full_name, pi.name);
  patch.phone = fillOrKeep((existing as any)?.phone, pi.phone);
  patch.location = fillOrKeep((existing as any)?.location, pi.location);
  patch.bio = fillOrKeep((existing as any)?.bio, pi.bio || parsed.resume_summary);
  patch.github_url = fillOrKeep((existing as any)?.github_url, pi.github_url);
  patch.linkedin_url = fillOrKeep((existing as any)?.linkedin_url, pi.linkedin_url);
  patch.portfolio_url = fillOrKeep((existing as any)?.portfolio_url, pi.portfolio_url);
  if (mergedSkills.length > 0 && (overwrite || !has((existing as any)?.skills))) {
    patch.skills = mergedSkills;
  }
  patch.profession = fillOrKeep((existing as any)?.profession, parsed.career_objective || null);
  patch.current_position = fillOrKeep((existing as any)?.current_position, firstExp?.role);
  if (totalExpYears != null && (overwrite || !has((existing as any)?.experience_years))) {
    patch.experience_years = totalExpYears;
  }
  patch.experience_summary = fillOrKeep((existing as any)?.experience_summary, firstExp?.summary);
  patch.education_degree = fillOrKeep((existing as any)?.education_degree, firstEdu?.degree);
  patch.education_institution = fillOrKeep((existing as any)?.education_institution, firstEdu?.institution);
  patch.education_year = fillOrKeep((existing as any)?.education_year, firstEdu?.year);

  
  const cleanPatch: Partial<Profile> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) (cleanPatch as any)[k] = v;
  }
  const updated = await updateProfile(cleanPatch);

  void logActivity('ai_career.applied', 'Applied AI-parsed resume to candidate profile', {
    entityType: 'profile',
    entityId: updated.id,
    metadata: { overwrite, source_file: parsed ? 'groq' : 'unknown' },
  });

  return updated;
}






export interface CareerAnalysisInput {
  parsed: ParsedCVProfile | null;
  profile: Pick<
    Profile,
    | 'full_name' | 'profession' | 'current_position' | 'experience_years'
    | 'bio' | 'location' | 'skills' | 'github_url' | 'linkedin_url'
    | 'portfolio_url' | 'education_degree' | 'education_institution'
  > | null;
  verifiedSkills: VerifiedSkill[];
  verifications: SkillVerificationMySubmission[];
  roadmaps: CareerRoadmapEnrollment[];
  parsed_data_id?: string | null;
}


export async function buildCareerAnalysisInput(userId: string): Promise<CareerAnalysisInput> {
  if (!userId) {
    return { parsed: null, profile: null, verifiedSkills: [], verifications: [], roadmaps: [] };
  }
  const [latest, profile, passports, verifications, roadmaps] = await Promise.all([
    getLatestResumeParsedData(userId),
    getMyProfile(),
    getMyPassports(),
    listMySkillVerificationSubmissions().catch(() => [] as SkillVerificationMySubmission[]),
    listMyRoadmapEnrollments().catch(() => [] as CareerRoadmapEnrollment[]),
  ]);

  
  const verifiedSkills: VerifiedSkill[] = [];
  for (const p of passports) {
    const list = getVerifiedSkills(p) ?? [];
    for (const v of list) {
      if (!verifiedSkills.some((x) => x.name.toLowerCase() === v.name.toLowerCase())) {
        verifiedSkills.push(v);
      }
    }
  }

  const compactProfile = profile
    ? ({
        full_name: profile.full_name,
        profession: profile.profession,
        current_position: profile.current_position,
        experience_years: profile.experience_years,
        bio: profile.bio,
        location: profile.location,
        skills: profile.skills ?? [],
        github_url: profile.github_url,
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
        education_degree: profile.education_degree,
        education_institution: profile.education_institution,
      } as CareerAnalysisInput['profile'])
    : null;

  return {
    parsed: latest?.parsed_json ?? null,
    profile: compactProfile,
    verifiedSkills,
    
    verifications: verifications.map((v) => ({
      id: v.id,
      status: v.status,
      score: v.score ?? null,
      task_title: v.task_title ?? null,
      category_name: v.category_name ?? null,
      sub_category_name: v.sub_category_name ?? null,
    })) as unknown as SkillVerificationMySubmission[],
    roadmaps: roadmaps.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      current_day: r.current_day,
      completed_count: r.completed_count,
      total_days: r.total_days,
      completion_pct: r.completion_pct,
    })) as unknown as CareerRoadmapEnrollment[],
    parsed_data_id: latest?.id ?? null,
  };
}


export async function generateCareerAnalysis(input: CareerAnalysisInput): Promise<CareerAIReport> {
  const session = await getCurrentSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  
  
  
  
  const RETRY_DELAY_MS = 1000;
  const MAX_ATTEMPTS = 2;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(apiUrl('/api/career-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      
      
      const rawText = await res.text();
      const looksLikeHtml = /^\s*<(!doctype|html|HTML)/i.test(rawText);
      if (looksLikeHtml) {
        throw new Error(
          'Backend API URL misconfigured. The server returned an HTML page instead of JSON. ' +
          'Please verify that /api/career-analysis is reachable on the current origin.'
        );
      }
      let body: any = {};
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          throw new Error(`Failed to parse server response as JSON. First 160 chars: ${rawText.slice(0, 160)}`);
        }
      }
      if (!res.ok) {
        const code = body?.code || 'INTERNAL';
        
        
        
        
        const friendlyFromServer = typeof body?.error === 'string'
          && body.error.trim() !== ''
          && body.error !== code;
        const fallback = code === 'GROQ_CONFIG_ERROR'
          ? 'AI সার্ভারে API key কনফিগার করা নেই। সাপোর্টে যোগাযোগ করুন।'
          : code === 'GROQ_AUTH_ERROR'
            ? 'AI সার্ভিস authentication ব্যর্থ হয়েছে। সাপোর্টে যোগাযোগ করুন।'
            : code === 'GROQ_RATE_LIMIT'
              ? 'AI সার্ভিস এই মুহূর্তে ব্যস্ত। একটু পরে আবার চেষ্টা করুন।'
              : code === 'GROQ_MODEL_ERROR'
                ? 'AI মডেল আর পাওয়া যাচ্ছে না। সাপোর্টে যোগাযোগ করুন।'
                : code === 'GROQ_TIMEOUT'
                  ? 'AI সার্ভিস সাড়া দিচ্ছে না (timeout)। আবার চেষ্টা করুন।'
                  : code === 'GROQ_NETWORK_ERROR'
                    ? 'AI সার্ভিসে সংযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।'
                    : code === 'GROQ_SERVER_ERROR'
                      ? 'AI সার্ভিসে সাময়িক সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।'
                      : code === 'AI_RESPONSE_INVALID'
                        ? 'AI সঠিক উত্তর দিতে পারেনি। আবার চেষ্টা করুন।'
                        : code === 'CV_DELETED'
                          ? 'এই বিশ্লেষণ যে রিজিউমের উপর ভিত্তি করে হয়েছিল সেটি মুছে ফেলা হয়েছে। নতুন রিজিউম আপলোড করুন।'
                          : `AI বিশ্লেষণ ব্যর্থ হয়েছে (${code})।`;
        const friendly = friendlyFromServer ? body.error : fallback;
        const err: any = new Error(friendly);
        err.code = code;
        err.status = res.status;
        err.details = body?.details;
        err.retryable = body?.retryable === true;
        
        
        
        const transient =
          err.retryable === true ||
          res.status === 429 ||
          (res.status >= 500 && res.status < 600);
        if (!transient || attempt >= MAX_ATTEMPTS) throw err;
        lastErr = err;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      const report = body?.report;
      if (!report) {
        const err: any = new Error('AI service returned an empty analysis. Please try again.');
        err.code = 'EMPTY_RESULT';
        if (attempt >= MAX_ATTEMPTS) throw err;
        lastErr = err;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      void logActivity('career_analysis.generated', 'Career analysis generated by Groq', {
        entityType: 'career_ai_report',
        entityId: report.id,
        metadata: { career_score: report.career_score ?? null },
      });

      return report as CareerAIReport;
    } catch (e: any) {
      lastErr = e;
      const transientNetwork = e instanceof TypeError || /Network|Failed to fetch|AbortError/i.test(String(e?.message));
      if (!transientNetwork || attempt >= MAX_ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr ?? new Error('AI career analysis failed. Please try again.');
}


export async function getLatestCareerAnalysis(userId: string): Promise<CareerAIReport | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('career_ai_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as CareerAIReport) ?? null;
}


export async function listCareerAnalyses(userId: string, limit = 10): Promise<CareerAIReport[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('career_ai_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as CareerAIReport[]) ?? [];
}


export async function isCareerAnalysisStale(userId: string, latest: CareerAIReport | null): Promise<boolean> {
  if (!latest) return true;
  try {
    const [profileResult, lastVerification, lastRoadmap, lastPassport] = await Promise.all([
      supabase.from('profiles').select('updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('skill_verification_submissions').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('career_roadmap_enrollment').select('updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('skill_passports').select('updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const cutoff = new Date(latest.created_at).getTime();
    const newer = (iso: string | null | undefined) => !!(iso && new Date(iso).getTime() > cutoff);
    if (newer(profileResult.data?.updated_at)) return true;
    if (newer(lastVerification.data?.created_at)) return true;
    if (newer(lastRoadmap.data?.updated_at)) return true;
    if (newer(lastPassport.data?.updated_at)) return true;
    return false;
  } catch {
    
    return false;
  }
}


export interface AutoRefreshOpts {
  userId: string;
  
  onAnalysis?: (report: CareerAIReport) => void;
  
  cooldownMs?: number;
}

export function createCareerAnalysisAutoRefresh(opts: AutoRefreshOpts): () => void {
  const cooldown = opts.cooldownMs ?? 30_000;
  let lastRun = 0;
  let cancelled = false;
  const triggers = [
    'profiles',
    'skill_passports',
    'skill_verification_submissions',
    'career_roadmap_enrollment',
    'career_ai_reports',
  ];
  const unsubs: Array<() => void> = [];

  const checkAndRun = async () => {
    if (cancelled || !opts.userId) return;
    const now = Date.now();
    if (now - lastRun < cooldown) return;
    lastRun = now;
    try {
      const latest = await getLatestCareerAnalysis(opts.userId);
      if (!(await isCareerAnalysisStale(opts.userId, latest))) return;
      const input = await buildCareerAnalysisInput(opts.userId);
      const fresh = await generateCareerAnalysis(input);
      if (!cancelled) opts.onAnalysis?.(fresh);
    } catch {
      
    }
  };

  for (const table of triggers) {
    const channel = supabase
      .channel(`career-auto:${table}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => {
        void checkAndRun();
      })
      .subscribe();
    unsubs.push(() => { supabase.removeChannel(channel); });
  }

  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}

export default {
  ALLOWED_RESUME_TYPES,
  MAX_RESUME_BYTES,
  validateResumeFile,
  parseResume,
  uploadResumeToStorage,
  saveResumeParsedData,
  getLatestResumeParsedData,
  listResumeParsedData,
  applyResumeToCandidateProfile,
  buildCareerAnalysisInput,
  generateCareerAnalysis,
  getLatestCareerAnalysis,
  listCareerAnalyses,
  isCareerAnalysisStale,
  createCareerAnalysisAutoRefresh,
};