
import { apiUrl, ApiHtmlResponseError } from '../config/api';
import { getAccessToken } from './auth';
import { supabase } from '../lib/supabase';
import { subscribeOwnRows } from './realtime';









async function parseResponseBody(res: Response): Promise<{
  ok: boolean;
  status: number;
  data: any;
}> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }
  const trimmed = text.trimStart();
  
  if (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    (!contentType.includes('application/json') && trimmed.startsWith('<'))
  ) {
    throw new ApiHtmlResponseError({
      url: res.url,
      status: res.status,
      contentType,
      preview: text.slice(0, 160),
    });
  }
  if (!text) {
    return { ok: res.ok, status: res.status, data: {} };
  }
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    
    
    return { ok: res.ok, status: res.status, data: { _raw: text } };
  }
}

export interface AICareerPrediction {
  id: string;
  prediction_date: string;
  employability_score: number;
  hiring_probability: number;
  career_readiness: number;
  technical_strength: number;
  soft_skill_strength: number;
  communication_score?: number | null;
  verification_strength?: number | null;
  ai_interview_readiness?: number | null;
  employability_label: number;
  employability_label_name: string;
  model_version: string;
  selected_regressor?: string;
  selected_classifier?: string;
  confidence?: number | null;
  input_snapshot?: Record<string, unknown> | null;
  created_at?: string;
}

export interface AICareerRefreshMeta {
  features_used: string[];
  model_version: string;
  selected_regressor: string;
  selected_classifier: string;
  elapsed_ms: number;
  include_exam_scores: boolean;
}

async function bearer(): Promise<Record<string, string>> {
  const t = await getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchLatestPrediction(): Promise<AICareerPrediction | null> {
  const headers = { ...(await bearer()) };
  const res = await fetch(apiUrl('/api/ai-center/latest'), { headers });
  const body = await parseResponseBody(res);
  if (!body.ok) {
    const d = body.data || {};
    const err: any = new Error(d?.error || `Failed to load prediction (${body.status})`);
    err.code = d?.code;
    err.status = body.status;
    throw err;
  }
  return body.data?.prediction ?? null;
}

export async function fetchHistory(limit = 12): Promise<AICareerPrediction[]> {
  const headers = { ...(await bearer()) };
  const res = await fetch(apiUrl(`/api/ai-center/history?limit=${limit}`), { headers });
  const body = await parseResponseBody(res);
  if (!body.ok) {
    const d = body.data || {};
    const err: any = new Error(d?.error || `Failed to load history (${body.status})`);
    err.code = d?.code;
    err.status = body.status;
    throw err;
  }
  return (body.data?.history ?? []) as AICareerPrediction[];
}

export async function refreshPrediction(opts?: {
  include_exam_scores?: boolean;
}): Promise<{ prediction: AICareerPrediction; meta: AICareerRefreshMeta }> {
  // DEPRECATED — v1 Node-blend endpoint is gone. Always go through v2.
  const { predictV2 } = await import('./v2Prediction');
  void opts;
  const v2 = await predictV2(true);
  const prediction: AICareerPrediction = {
    id: 'v2-' + v2.input_hash,
    prediction_date: v2.prediction.prediction_date,
    employability_score: v2.prediction.employability_score,
    hiring_probability: v2.prediction.hiring_probability,
    career_readiness: v2.prediction.career_readiness,
    technical_strength: v2.prediction.technical_strength,
    soft_skill_strength: v2.prediction.soft_skill_strength,
    employability_label: v2.prediction.employability_label,
    employability_label_name: v2.prediction.employability_label_name,
    model_version: v2.model_version,
    selected_regressor: v2.selected_regressor,
    selected_classifier: v2.selected_classifier,
  };
  return {
    prediction,
    meta: {
      features_used: [],
      model_version: v2.model_version,
      selected_regressor: v2.selected_regressor,
      selected_classifier: v2.selected_classifier,
      elapsed_ms: 0,
      include_exam_scores: v2.include_exam_scores,
    },
  };
}



export interface CourseSuggestion {
  template_id: string;
  template_title: string;
  day_id: string;
  day_number: number;
  day_title: string;
  description: string | null;
  key_concepts: string[];
  deep_link: string;
  enrollment_id: string | null;
  reason: string;
  score: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface CourseSuggestionSource {
  user_skill_count: number;
  verified_skill_count: number;
  active_enrollment_count: number;
  template_pool_size: number;
  candidate_day_count: number;
  returned: number;
  scored_at: string;
  model: string;
}

export interface CourseSuggestionsResult {
  suggestions: CourseSuggestion[];
  source: CourseSuggestionSource;
}


export async function fetchCourseSuggestions(): Promise<CourseSuggestionsResult> {
  const headers = { ...(await bearer()) };
  const res = await fetch(apiUrl('/api/ai-center/course-suggestions'), { headers });
  const body = await parseResponseBody(res);
  if (!body.ok) {
    const d = body.data || {};
    const err: any = new Error(d?.error || `Failed to load course suggestions (${body.status})`);
    err.code = d?.code;
    err.status = body.status;
    throw err;
  }
  const data = body.data;
  return {
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
    source: data?.source ?? {
      user_skill_count: 0,
      verified_skill_count: 0,
      active_enrollment_count: 0,
      template_pool_size: 0,
      candidate_day_count: 0,
      returned: 0,
      scored_at: new Date().toISOString(),
      model: 'unknown',
    },
  };
}


export function subscribeMyPredictions(onChange: () => void): () => void {
  return subscribeOwnRows(['ai_career_predictions'], () => onChange());
}


export async function triggerPredictionAfterSave(opts?: {
  include_exam_scores?: boolean;
}): Promise<void> {
  try {
    const t = await getAccessToken();
    if (!t) return;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t}`,
    };
    // v2 is authoritative. Force=true so the user's new activity re-hashes
    // and re-scores immediately.
    void fetch(apiUrl('/api/ai-center/v2/predict-v2?force=true'), {
      method: 'GET',
      headers,
    }).catch(() => undefined);
    void opts;
  } catch {
    // ignore — fire-and-forget
  }
}


export { supabase };