
import { supabase } from '../lib/supabase';
import { getAccessToken, getCurrentUser } from './auth';
import { apiUrl } from '../config/api';
import { getMyProfileId } from './profile';
import type { Difficulty, EvidenceLabel, UniversalAssessment, UniversalAssessmentEvidence, UniversalSubmission } from '../types/database';

export interface GeneratedAssessment {
  title: string;
  description: string;
  assessment_type: 'coding' | 'practical';
  difficulty: Difficulty;
  requirements: string[];
  evaluation_criteria: string[];
  estimated_time: string;
  required_technologies: string[];
}

export interface AssessmentGenerateInput {
  skillId: string;
  skillName: string;
  categoryId?: string;
  subCategoryId?: string;
  categoryName?: string;
  subCategoryName?: string;
  experienceLevel?: string;
  additionalInfo?: string;
  mandatoryDescription: string;
}

export async function generateAssessment(input: AssessmentGenerateInput): Promise<UniversalAssessment> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(apiUrl('/api/generate-assessment'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 409 && body.assessment) {
      return body.assessment as UniversalAssessment;
    }
    throw new Error(body.error || 'Failed to generate assessment');
  }
  const body = await res.json();
  return body.assessment as UniversalAssessment;
}

export async function listMyAssessments(): Promise<UniversalAssessment[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('universal_assessments')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as UniversalAssessment[]) ?? [];
}

export async function getMyActiveAssessment(skillId: string): Promise<UniversalAssessment | null> {
  const profileId = await getMyProfileId();
  if (!profileId) return null;
  const { data, error } = await supabase
    .from('universal_assessments')
    .select('*')
    .eq('user_id', profileId)
    .eq('skill_id', skillId)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as UniversalAssessment) ?? null;
}

export async function getAssessment(id: string): Promise<UniversalAssessment | null> {
  const { data, error } = await supabase
    .from('universal_assessments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as UniversalAssessment) ?? null;
}

export async function cancelAssessment(id: string) {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('universal_assessments')
    .update({ status: 'Cancelled' })
    .eq('id', id)
    .eq('user_id', profileId)
    .eq('status', 'Pending');
  if (error) throw error;
}

export interface SubmissionInput {
  assessmentId: string;
  links: Partial<Record<EvidenceLabel, string>>;
  description?: string;
  files: Array<{ file: File; label: EvidenceLabel }>;
}

export async function submitAssessment(input: SubmissionInput): Promise<UniversalSubmission> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Not authenticated');

  
  const { data: submission, error: subErr } = await supabase
    .from('universal_submissions')
    .insert({
      user_id: profileId,
      assessment_id: input.assessmentId,
      submission_links: input.links,
      description: input.description ?? null,
      status: 'Pending Review',
    })
    .select()
    .single();
  if (subErr) throw subErr;

  
  await supabase
    .from('universal_assessments')
    .update({ status: 'Submitted', submitted_at: new Date().toISOString() })
    .eq('id', input.assessmentId);

  
  for (const item of input.files) {
    if (!(item.file instanceof File)) continue;
    const ctx: { fileName: string; mime: string; size: number } = {
      fileName: item.file.name,
      mime: item.file.type || 'application/octet-stream',
      size: item.file.size,
    };
    const signRes = await fetch(apiUrl('/api/storage/evidence/sign-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ submissionId: submission.id, ...ctx }),
    });
    if (!signRes.ok) {
      const body = await signRes.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to obtain upload URL');
    }
    const { path, signedUrl, token: uploadToken } = await signRes.json();

    const upload = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': ctx.mime, Authorization: `Bearer ${uploadToken}` },
      body: item.file,
    });
    if (!upload.ok) throw new Error('File upload failed');

    const { error: evErr } = await supabase.from('universal_assessment_evidence').insert({
      submission_id: submission.id,
      kind: 'file',
      label: 'file',
      storage_path: path,
      bucket: 'assessment-evidence',
      mime_type: ctx.mime,
      size_bytes: ctx.size,
      display_name: item.file.name,
    });
    if (evErr) throw evErr;
  }

  const linkRows = Object.entries(input.links)
    .filter(([, url]) => !!url && /^https?:\/\//.test(url))
    .map(([label, url]) => ({
      submission_id: submission.id,
      kind: 'link' as const,
      label,
      url,
    }));
  if (linkRows.length) {
    const { error } = await supabase.from('universal_assessment_evidence').insert(linkRows);
    if (error) throw error;
  }

  return submission as UniversalSubmission;
}

export async function listMySubmissions(): Promise<UniversalSubmission[]> {
  const profileId = await getMyProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('universal_submissions')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as UniversalSubmission[]) ?? [];
}

export async function listAllSubmissions(): Promise<UniversalSubmission[]> {
  const { data, error } = await supabase
    .from('universal_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as UniversalSubmission[]) ?? [];
}

export async function listEvidenceForSubmission(submissionId: string): Promise<UniversalAssessmentEvidence[]> {
  const { data, error } = await supabase
    .from('universal_assessment_evidence')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as UniversalAssessmentEvidence[]) ?? [];
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 300): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(apiUrl('/api/storage/signed-url'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bucket, path, expiresIn }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to get signed URL');
  }
  const body = await res.json();
  return body.url;
}

export async function adminReviewSubmission(input: {
  submissionId: string;
  status: 'Pending Review' | 'Passed' | 'Failed';
  score: number;
  strengths: string;
  weaknesses: string;
  improvement: string;
  feedback: string;
  recommendation: string;
}): Promise<UniversalSubmission> {
  const { data, error } = await supabase.rpc('fn_admin_review_universal_submission', {
    p_submission_id: input.submissionId,
    p_status: input.status,
    p_score: input.score,
    p_strengths: input.strengths,
    p_weaknesses: input.weaknesses,
    p_improvement: input.improvement,
    p_feedback: input.feedback,
    p_recommendation: input.recommendation,
  });
  if (error) throw error;
  return data as UniversalSubmission;
}
