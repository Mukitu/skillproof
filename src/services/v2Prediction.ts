/**
 * v2Prediction — typed client for the production Career Intelligence service.
 *
 * Wraps the PHP `/api/ai-center/v2/*` endpoints that drive the deterministic
 * weighted-feature scoring engine in `lib/ml_engine.php`. The engine covers
 * 95 features and is the same one used by v1 — no Python / no Node ML in
 * production.
 *
 * NO client-side rule-based blending. The user's data is fetched by the
 * server from Supabase, hashed to detect changes, and scored in pure PHP.
 * Results are persisted in `ai_career_predictions` and keyed by
 * `(user_id, model_version, input_hash)`.
 */

import { apiUrl } from '../config/api';
import { getAccessToken } from './auth';

export interface V2Scores {
  employability_score: number;
  hiring_probability: number;
  career_readiness: number;
  technical_strength: number;
  soft_skill_strength: number;
  employability_label: number;
  employability_label_name: string;
}

export interface V2Prediction {
  employability_score: number;
  hiring_probability: number;
  career_readiness: number;
  technical_strength: number;
  soft_skill_strength: number;
  employability_label: number;
  employability_label_name: string;
  model_version: string;
  selected_regressor: string;
  selected_classifier: string;
  prediction_date: string;
}

export interface V2TopFeature {
  rank: number;
  name: string;
  importance: number;
}

export interface V2CoverageCounts {
  skills: number;
  verified: number;
  assessments: number;
  interviews_completed: number;
  passport_active: number;
  certificates: number;
  roadmap_done: number;
}

export interface V2PredictSuccess {
  ok: true;
  prediction: V2Prediction;
  model_version: string;
  selected_regressor: string;
  selected_classifier: string;
  cold_start: boolean;
  include_exam_scores: boolean;
  input_hash: string;
  cached: boolean;
  counts: V2CoverageCounts;
  top_features: V2TopFeature[];
  bn: string | null;
  /** True when the response is from the cold-start / fallback path
   *  (e.g. empty profile, all-zero scores). UI may show a small notice. */
  degraded?: boolean;
}

export interface V2PredictError {
  ok: false;
  bn: string;
  code: string;
  error?: string;
}

export type V2PredictResponse = V2PredictSuccess | V2PredictError;

export interface V2HealthSuccess {
  ok: true;
  v2: true;
  ml_v2_enabled: true;
  model_version: string;
  regressor: string;
  classifier: string;
  feature_count: number;
  artifacts_present: boolean;
  bn: string;
}

export interface V2HealthError {
  ok: false;
  v2?: boolean;
  ml_v2_enabled: boolean;
  bn: string;
  en?: string;
  code: string;
  message?: string;
  runtime?: string;
  engine?: string;
  model_version?: string | null;
  regressor?: string | null;
  classifier?: string | null;
  feature_count?: number;
  artifacts_present?: boolean;
  artifacts_dir?: string;
}

export type V2HealthResponse = V2HealthSuccess | V2HealthError;


export const ML_V2_UNAVAILABLE_CODE = 'ML_V2_UNAVAILABLE';


export class V2PredictError extends Error {
  code: string;
  bn: string;
  status: number;
  constructor(opts: { code: string; bn: string; status: number; message?: string }) {
    super(opts.message || opts.bn || opts.code);
    this.name = 'V2PredictError';
    this.code = opts.code;
    this.bn = opts.bn;
    this.status = opts.status;
  }
}

async function bearer(): Promise<Record<string, string>> {
  const t = await getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function parseV2Body(res: Response): Promise<{ ok: boolean; status: number; data: any }> {
  const text = await res.text();
  if (!text) return { ok: res.ok, status: res.status, data: {} };
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: { _raw: text } };
  }
}


export async function predictV2(force = false): Promise<V2PredictSuccess> {
  const headers = { ...(await bearer()) };
  const url = apiUrl(`/api/ai-center/v2/predict-v2${force ? '?force=true' : ''}`);
  const res = await fetch(url, { headers, method: 'GET' });
  const body = await parseV2Body(res);
  if (!body.ok) {
    const d = body.data || {};
    throw new V2PredictError({
      code: d?.code || 'UNKNOWN',
      bn: d?.bn || d?.error || 'ক্যারিয়ার ইন্টেলিজেন্স ইঞ্জিনের সাথে যোগাযোগ করা যাচ্ছে না।',
      status: body.status,
      message: d?.error,
    });
  }
  if (body.data?.ok !== true) {
    throw new V2PredictError({
      code: body.data?.code || 'INVALID_RESPONSE',
      bn: body.data?.bn || 'ক্যারিয়ার ইন্টেলিজেন্স ইঞ্জিন থেকে অপ্রত্যাশিত প্রতিক্রিয়া।',
      status: body.status,
    });
  }
  // Mark a zero-score response as degraded so the UI can show a small notice
  // instead of treating the empty prediction as the user's real score.
  if (body.data?.prediction?.employability_score === 0) {
    body.data.degraded = true;
  }
  return body.data as V2PredictSuccess;
}


export function isV2Unavailable(err: unknown): boolean {
  return isV2PredictError(err) && err.code === ML_V2_UNAVAILABLE_CODE;
}


export async function getV2Health(): Promise<V2HealthResponse> {
  const res = await fetch(apiUrl('/api/ai-center/v2/health'), { method: 'GET' });
  const body = await parseV2Body(res);
  if (!body.ok) {
    const d = body.data || {};
    return {
      ok: false,
      ml_v2_enabled: Boolean(d?.ml_v2_enabled),
      bn: d?.bn || 'ক্যারিয়ার ইন্টেলিজেন্� ইঞ্জিনের সাথে যোগাযোগ করা যাচ্ছে না।',
      en: d?.en,
      code: d?.code || 'UNKNOWN',
      message: d?.message,
      runtime: d?.runtime,
      engine: d?.engine,
      model_version: d?.model_version ?? null,
      regressor: d?.regressor ?? null,
      classifier: d?.classifier ?? null,
      feature_count: d?.feature_count,
      artifacts_present: d?.artifacts_present,
      artifacts_dir: d?.artifacts_dir,
    };
  }
  return body.data as V2HealthResponse;
}


export function isV2PredictError(err: unknown): err is V2PredictError {
  return err instanceof V2PredictError;
}
