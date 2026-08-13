
import { apiUrl, ApiHtmlResponseError } from '../config/api';
import { getAccessToken } from './auth';
import { supabase } from '../lib/supabase';
import { subscribeOwnRows } from './realtime';



export type HiringOutlook = 'positive' | 'neutral' | 'negative';

export interface CareerSummarySection {
  headline: string;
  paragraph: string;
  readiness_label: string;
  hiring_outlook: HiringOutlook;
}

export interface StrengthSection {
  technical: Array<{ skill: string; reason: string }>;
  soft: Array<{ skill: string; reason: string }>;
  summary: string;
}

export interface WeaknessSection {
  weak_areas: Array<{ area: string; reason: string }>;
  employability_reducers: string[];
  summary: string;
}

export interface SkillGapSection {
  high: Array<{ skill: string; reason: string }>;
  medium: Array<{ skill: string; reason: string }>;
  low: Array<{ skill: string; reason: string }>;
  summary: string;
}

export interface LearningRoadmapSection {
  week_1: string[];
  week_2: string[];
  month_1: string[];
  month_2: string[];
  month_3: string[];
  rationale: string;
}

export interface CareerRecommendationSection {
  recommended_role: string;
  alternatives: string[];
  why_this_role: string;
  match_score: number;
}

export interface SalaryInsightSection {
  currency: 'BDT';
  current_potential_min: number;
  current_potential_max: number;
  future_potential_min: number;
  future_potential_max: number;
  required_improvements: string[];
  explanation: string;
}

export interface HiringAdviceSection {
  items: Array<{ title: string; action: string }>;
  summary: string;
}

export interface ProfileCompletenessSection {
  percent: number;
  missing_sections: string[];
  explanation: string;
}

export interface NextActionsSection {
  actions: Array<{ rank: number; action: string; impact: 'high' | 'medium' | 'low' }>;
}

export interface AICareerIntelligenceReport {
  id: string;
  user_id: string;
  prediction_id: string | null;
  career_summary: CareerSummarySection;
  strengths: StrengthSection;
  weaknesses: WeaknessSection;
  skill_gap: SkillGapSection;
  learning_roadmap: LearningRoadmapSection;
  career_recommendation: CareerRecommendationSection;
  salary_insight: SalaryInsightSection;
  profile_completeness: ProfileCompletenessSection;
  next_actions: NextActionsSection;
  hiring_advice: HiringAdviceSection;
  profile_signature: string;
  groq_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface AICareerIntelligenceMeta {
  cache_hit: boolean;
  signature: string;
  forced?: boolean;
  elapsed_ms: number;
  groq_elapsed_ms?: number;
  groq_model?: string;
  message?: string;
}



async function bearer(): Promise<Record<string, string>> {
  const t = await getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  
  
  
  
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
  let body: any = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text };
    }
  }
  if (!res.ok) {
    const err: any = new Error(body?.error || `Request failed (${res.status})`);
    err.code = body?.code;
    err.status = res.status;
    err.retryable = body?.retryable;
    err.details = body?.details;
    err.body = body;
    throw err;
  }
  return body as T;
}


export async function fetchLatestIntelligence(): Promise<AICareerIntelligenceReport | null> {
  const headers = { ...(await bearer()) };
  const data = await fetchJson<{ ok: boolean; report: AICareerIntelligenceReport | null }>(
    apiUrl('/api/ai-intelligence/latest'),
    { headers },
  );
  return data?.report ?? null;
}


export async function fetchIntelligenceHistory(limit = 12): Promise<Array<Partial<AICareerIntelligenceReport>>> {
  const headers = { ...(await bearer()) };
  const data = await fetchJson<{ ok: boolean; history: Array<Partial<AICareerIntelligenceReport>> }>(
    apiUrl(`/api/ai-intelligence/history?limit=${limit}`),
    { headers },
  );
  return data?.history ?? [];
}


export async function generateIntelligence(opts?: {
  force?: boolean;
}): Promise<{ report: AICareerIntelligenceReport; meta: AICareerIntelligenceMeta; cached: boolean }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await bearer()),
  };
  const data = await fetchJson<{
    ok: boolean;
    report: AICareerIntelligenceReport;
    meta: AICareerIntelligenceMeta;
    cached: boolean;
  }>(
    apiUrl('/api/ai-intelligence/generate'),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ force: opts?.force ?? false }),
    },
  );
  return data;
}


export async function refreshIntelligence(): Promise<{
  report: AICareerIntelligenceReport;
  meta: AICareerIntelligenceMeta;
  cached: boolean;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await bearer()),
  };
  const data = await fetchJson<{
    ok: boolean;
    report: AICareerIntelligenceReport;
    meta: AICareerIntelligenceMeta;
    cached: boolean;
  }>(
    apiUrl('/api/ai-intelligence/refresh'),
    { method: 'POST', headers },
  );
  return data;
}


export function subscribeMyIntelligenceReports(onChange: () => void): () => void {
  return subscribeOwnRows(['ai_career_reports'], () => onChange());
}


export { supabase };



export interface CandidateState {
  employability_score: number;
  hiring_probability: number;
  career_readiness: number;
  technical_strength: number;
  soft_skill_strength: number;
  communication_score: number | null;
  expected_salary_bdt: number;
  confidence: number;
}

export interface SimulationScenario {
  key: string;
  label_en: string;
  label_bn: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'purple' | 'orange' | 'indigo' | 'emerald';
}

export interface SimulationStep {
  scenario: SimulationScenario;
  state: CandidateState;
  employability_gain: number;
  hiring_gain_pct: number;
  readiness_gain: number;
  salary_gain: number;
}

export interface SimulationResult {
  baseline: CandidateState;
  steps: SimulationStep[];
  total_employability_gain: number;
  total_hiring_gain_pct: number;
  total_readiness_gain: number;
  total_salary_gain: number;
}

export async function fetchSimulation(opts?: {
  scenarios?: string[];
}): Promise<{ simulation: SimulationResult; scenarios: SimulationScenario[] }> {
  const headers = { ...(await bearer()) };
  const qs = opts?.scenarios && opts.scenarios.length > 0
    ? `?scenarios=${encodeURIComponent(opts.scenarios.join(','))}`
    : '';
  const data = await fetchJson<{ ok: boolean; simulation: SimulationResult; scenarios: SimulationScenario[] }>(
    apiUrl(`/api/ai-intelligence/simulation${qs}`),
    { headers },
  );
  return { simulation: data.simulation, scenarios: data.scenarios };
}

export interface WhatIfResult {
  baseline: CandidateState;
  scenario: SimulationScenario;
  predicted: CandidateState;
  deltas: Record<string, number>;
}

export async function fetchWhatIf(scenarioKey: string): Promise<WhatIfResult> {
  const headers = { ...(await bearer()) };
  const data = await fetchJson<{ ok: boolean } & WhatIfResult>(
    apiUrl(`/api/ai-intelligence/what-if?scenario=${encodeURIComponent(scenarioKey)}`),
    { headers },
  );
  return {
    baseline: data.baseline,
    scenario: data.scenario,
    predicted: data.predicted,
    deltas: data.deltas,
  };
}