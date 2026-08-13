
import { supabase } from '../lib/supabase';
import { getAccessToken } from './auth';
import { subscribeTable } from './realtime';
import { listCategories, listSubCategories } from './taxonomy';
import { apiUrl } from '../config/api';
import type {
  Category,
  SubCategory,
  InterviewAnswer,
  InterviewCanStartResult,
  InterviewDifficulty,
  InterviewQuestion,
  InterviewSession,
} from '../types/database';





export const INTERVIEW_DURATION_SECONDS = 180; 

export const INTERVIEW_DAILY_LIMIT_HOURS = 24;


const API = '/api/interview';





async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function coerceDifficulty(v: any): InterviewDifficulty {
  return v === 'Hard' || v === 'Medium' ? v : 'Easy';
}

function asString(v: any, max = 4000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function isUuid(v: any): boolean {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}


export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}


export function secondsRemaining(session: Pick<InterviewSession, 'expires_at'>): number {
  const ms = new Date(session.expires_at).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}







export async function loadInterviewCategories(): Promise<Category[]> {
  return listCategories(false);
}


export async function loadInterviewSubCategories(categoryId: string): Promise<SubCategory[]> {
  if (!categoryId) return [];
  return listSubCategories(categoryId, false);
}






export async function canStartInterview(): Promise<InterviewCanStartResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      return {
        can_start: false,
        next_available_at: null,
        reason: 'not_authenticated',
        active_session_id: null,
      };
    }
    const { data, error } = await supabase.rpc('fn_interview_can_start', {
      p_user_id: userId,
    });
    if (error) {
      console.warn('[interview] canStart rpc error:', error.message);
      return {
        can_start: false,
        next_available_at: null,
        reason: 'unknown',
        active_session_id: null,
      };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      can_start: !!row?.can_start,
      next_available_at: row?.next_available_at ?? null,
      reason: (row?.reason ?? 'unknown') as InterviewCanStartResult['reason'],
      active_session_id: row?.active_session_id ?? null,
    };
  } catch (e: any) {
    console.warn('[interview] canStart threw:', e?.message);
    return {
      can_start: false,
      next_available_at: null,
      reason: 'unknown',
      active_session_id: null,
    };
  }
}






export async function startInterviewSession(args: {
  categoryId: string;
  subCategoryId?: string | null;
}): Promise<InterviewSession> {
  if (!isUuid(args.categoryId)) {
    throw new Error('A valid category is required to start an interview.');
  }
  const subId = args.subCategoryId && isUuid(args.subCategoryId) ? args.subCategoryId : null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error('You must be signed in to start an interview.');
  }

  const { data, error } = await supabase.rpc('fn_interview_create_session', {
    p_user_id: userId,
    p_category_id: args.categoryId,
    p_sub_category_id: subId,
  });
  if (error) {
    const msg = error.message || '';
    if (/active_session_exists/i.test(msg)) {
      throw new Error('You already have an interview in progress. Finish it before starting a new one.');
    }
    if (/daily_limit/i.test(msg)) {
      throw new Error('You can only start one interview every 24 hours. Try again later.');
    }
    if (/category_required/i.test(msg)) {
      throw new Error('Please choose a category before starting.');
    }
    if (/category_not_found/i.test(msg)) {
      throw new Error('The selected category is no longer available.');
    }
    throw new Error(msg || 'Could not start the interview.');
  }
  return data as InterviewSession;
}


export interface StartInterviewWithQuestionResult {
  session: InterviewSession;
  question: InterviewQuestion;
  source: 'groq' | 'fallback';
  generation_ms: number;
  personalization: GenerateQuestionResult['personalization'];
}

export async function startInterviewWithQuestion(args: {
  categoryId: string;
  subCategoryId?: string | null;
  difficulty: InterviewDifficulty;
  locale?: 'bn' | 'en';
}): Promise<StartInterviewWithQuestionResult> {
  if (!isUuid(args.categoryId)) {
    throw new Error('A valid category is required to start an interview.');
  }
  const headers = await authHeaders();
  const res = await fetch(apiUrl('/api/interview/start'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: args.categoryId,
      subCategoryId: args.subCategoryId ?? null,
      difficulty: args.difficulty,
      locale: args.locale ?? 'en',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    const code = err?.code as string | undefined;
    if (code === 'daily_limit') {
      throw new Error('You can only start one interview every 24 hours. Try again later.');
    }
    if (code === 'active_session_exists') {
      throw new Error('You already have an interview in progress. Finish it before starting a new one.');
    }
    if (code === 'category_not_found' || code === 'sub_category_not_found') {
      throw new Error('The selected category is no longer available.');
    }
    if (code === 'ai_unavailable') {
      throw new Error('SkillProof AI is preparing your question. Please try again in a moment.');
    }
    throw new Error(err?.error || `Failed to start interview (HTTP ${res.status}).`);
  }
  const body = await res.json();
  if (!body?.session || !body?.question) {
    throw new Error('Interview start returned an incomplete response.');
  }
  
  
  (body.question as any).personalization = body.personalization;
  (body.question as any).source = body.source;
  return body as StartInterviewWithQuestionResult;
}


export async function completeInterviewSession(args: {
  sessionId: string;
  score?: number | null;
  feedback?: Record<string, any>;
  reason?: 'timer' | 'user_submitted' | 'manual_abandon';
}): Promise<InterviewSession> {
  if (!isUuid(args.sessionId)) {
    throw new Error('Invalid interview session.');
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error('You must be signed in.');
  }
  const { data, error } = await supabase.rpc('fn_interview_complete_session', {
    p_session_id: args.sessionId,
    p_score: typeof args.score === 'number' ? args.score : null,
    p_feedback: args.feedback ?? {},
    p_reason: args.reason ?? 'user_submitted',
  });
  if (error) {
    throw new Error(error.message || 'Could not complete the interview.');
  }
  return data as InterviewSession;
}


export async function cancelInterviewSession(args: {
  sessionId: string;
  reason?: 'cancelled_pre_question' | 'cancelled_user_navigated' | 'cancelled_browser_event';
}): Promise<InterviewSession | null> {
  if (!isUuid(args.sessionId)) {
    return null;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  try {
    const { data, error } = await supabase.rpc('fn_interview_cancel_session', {
      p_session_id: args.sessionId,
      p_reason: args.reason ?? 'cancelled_pre_question',
    });
    if (error) {
      
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('session_not_active') || msg.includes('session_not_found')) {
        return null;
      }
      if (msg.includes('session_has_questions')) {
        
        return null;
      }
      throw new Error(error.message || 'Could not cancel the interview.');
    }
    return data as InterviewSession;
  } catch (e: any) {
    console.warn('[interview] cancel failed:', e?.message || e);
    return null;
  }
}





export async function recordInterviewQuestion(args: {
  sessionId: string;
  questionIndex: number;
  difficulty: InterviewDifficulty;
  questionText: string;
  hint?: string | null;
  generationMs?: number | null;
}): Promise<InterviewQuestion> {
  if (!isUuid(args.sessionId)) {
    throw new Error('Invalid interview session.');
  }
  if (!args.questionText.trim()) {
    throw new Error('Question text is required.');
  }
  const { data, error } = await supabase.rpc('fn_interview_record_question', {
    p_session_id: args.sessionId,
    p_question_index: args.questionIndex,
    p_difficulty: args.difficulty,
    p_question_text: args.questionText,
    p_hint: args.hint ?? null,
    p_generation_ms: args.generationMs ?? null,
  });
  if (error) {
    throw new Error(error.message || 'Could not save the question.');
  }
  return data as InterviewQuestion;
}

export async function recordInterviewAnswer(args: {
  questionId: string;
  answerText?: string | null;
  voiceTranscript?: string | null;
  responseMs?: number | null;
  score?: number | null;
}): Promise<InterviewAnswer> {
  if (!isUuid(args.questionId)) {
    throw new Error('Invalid question.');
  }
  const { data, error } = await supabase.rpc('fn_interview_record_answer', {
    p_question_id: args.questionId,
    p_answer_text: args.answerText ?? null,
    p_voice_transcript: args.voiceTranscript ?? null,
    p_response_ms: args.responseMs ?? null,
    p_score: typeof args.score === 'number' ? args.score : null,
  });
  if (error) {
    throw new Error(error.message || 'Could not save the answer.');
  }
  return data as InterviewAnswer;
}





export interface InterviewHistoryRow extends InterviewSession {
  category: { id: string; name: string } | null;
  sub_category: { id: string; name: string } | null;
  question_count: number;
  answered_count: number;
}


export async function listMyInterviewHistory(limit = 50): Promise<InterviewHistoryRow[]> {
  const headers = await authHeaders();
  const res = await fetch(`${apiUrl(API)}/history?limit=${limit}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load history (HTTP ${res.status}).`);
  }
  const body = await res.json();
  return Array.isArray(body?.sessions) ? (body.sessions as InterviewHistoryRow[]) : [];
}


export async function getInterviewSessionDetail(sessionId: string): Promise<{
  session: InterviewSession;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
}> {
  if (!isUuid(sessionId)) {
    throw new Error('interview_session_invalid_id');
  }
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${apiUrl(API)}/sessions/${sessionId}`, { headers });
  } catch (e: any) {
    
    console.warn('[interview] session detail network error:', e?.message || e);
    throw new Error('interview_session_unavailable');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('[interview] session detail http', res.status, err?.error || err?.code || '');
    if (res.status === 404) {
      
      
      
      throw new Error('interview_session_not_found');
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('interview_session_forbidden');
    }
    throw new Error('interview_session_failed');
  }
  return res.json();
}






export function subscribeMyInterviewSessions(onChange: () => void): () => void {
  return subscribeTable('interview_sessions', () => onChange());
}


export function subscribeInterviewQuestions(onChange: () => void): () => void {
  return subscribeTable('interview_questions', () => onChange());
}


export function subscribeInterviewAnswers(onChange: () => void): () => void {
  return subscribeTable('interview_answers', () => onChange());
}





















export interface GenerateQuestionArgs {
  sessionId: string;
  categoryName: string;
  subCategoryName?: string | null;
  difficulty: InterviewDifficulty;
  questionIndex: number;
  previousQuestions?: string[];
  previousAnswers?: string[];
  locale?: 'bn' | 'en';
}

export interface GenerateQuestionResult {
  question_text: string;
  hint?: string | null;
  difficulty: InterviewDifficulty;
  generation_ms: number;
  
  source?: 'groq' | 'fallback';
  personalization: {
    has_cv: boolean;
    has_ai_profile: boolean;
    has_verifications: boolean;
    has_roadmaps: boolean;
    has_passports: boolean;
    context_source: 'full_profile' | 'partial_profile' | 'category_only';
  };
}


function friendlyAiPreparingCopy(locale: 'bn' | 'en'): string {
  return locale === 'bn'
    ? 'SkillProof AI তোমার পরবর্তী প্রশ্ন প্রস্তুত করছে…'
    : 'SkillProof AI is preparing your next interview question…';
}


export async function generateInterviewQuestion(
  args: GenerateQuestionArgs
): Promise<GenerateQuestionResult> {
  if (!isUuid(args.sessionId)) {
    throw new Error('Invalid interview session.');
  }
  const locale = args.locale ?? 'en';

  const attempt = async (): Promise<Response> => {
    const headers = await authHeaders();
    return fetch(`${apiUrl(API)}/generate-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        sessionId: args.sessionId,
        categoryName: args.categoryName,
        subCategoryName: args.subCategoryName ?? null,
        difficulty: args.difficulty,
        questionIndex: args.questionIndex,
        previousQuestions: args.previousQuestions ?? [],
        previousAnswers: args.previousAnswers ?? [],
        locale: args.locale ?? 'en',
      }),
    });
  };

  let res: Response;
  try {
    res = await attempt();
  } catch (e: any) {
    
    try {
      await sleep(600);
      res = await attempt();
    } catch (e2: any) {
      throw new Error(friendlyAiPreparingCopy(locale));
    }
  }

  if (!res.ok) {
    
    if (res.status === 429 || res.status >= 500) {
      try {
        await sleep(900);
        res = await attempt();
      } catch (e2) {
        
      }
    }
    if (!res.ok) {
      throw new Error(friendlyAiPreparingCopy(locale));
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!body || typeof body !== 'object') {
    throw new Error(friendlyAiPreparingCopy(locale));
  }

  const questionText = asString(body?.question_text, 1500);
  if (!questionText || questionText.length < 10) {
    throw new Error(friendlyAiPreparingCopy(locale));
  }

  return {
    question_text: questionText,
    hint: asString(body?.hint, 500) || null,
    difficulty: coerceDifficulty(body?.difficulty),
    generation_ms: typeof body?.generation_ms === 'number' ? body.generation_ms : 0,
    source: body?.source === 'fallback' ? 'fallback' : 'groq',
    personalization: body?.personalization ?? {
      has_cv: false,
      has_ai_profile: false,
      has_verifications: false,
      has_roadmaps: false,
      has_passports: false,
      context_source: 'category_only',
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GradeAnswerArgs {
  sessionId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  categoryName: string;
  subCategoryName?: string | null;
  locale?: 'bn' | 'en';
}

export interface GradeAnswerResult {
  score: number; 
  feedback: Record<string, any>;
  
  encouragement?: string | null;
  
  source?: 'groq' | 'fallback';
}


export async function gradeInterviewAnswer(args: GradeAnswerArgs): Promise<GradeAnswerResult> {
  if (!isUuid(args.sessionId) || !isUuid(args.questionId)) {
    throw new Error('Invalid interview identifiers.');
  }
  const locale = args.locale ?? 'en';
  let res: Response;
  try {
    const headers = await authHeaders();
    res = await fetch(`${apiUrl(API)}/grade-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        sessionId: args.sessionId,
        questionId: args.questionId,
        questionText: args.questionText,
        answerText: args.answerText,
        categoryName: args.categoryName,
        subCategoryName: args.subCategoryName ?? null,
        locale: args.locale ?? 'en',
      }),
    });
  } catch {
    throw new Error(friendlyAiPreparingCopy(locale));
  }
  if (!res.ok) {
    throw new Error(friendlyAiPreparingCopy(locale));
  }
  const body = await res.json().catch(() => ({}));
  const score = typeof body?.score === 'number' ? Math.max(0, Math.min(100, body.score)) : 0;
  return {
    score,
    feedback: body?.feedback ?? {},
    encouragement: typeof body?.encouragement === 'string' ? body.encouragement : null,
    source: body?.source === 'fallback' ? 'fallback' : 'groq',
  };
}

export interface GradeFinalArgs {
  sessionId: string;
  categoryName: string;
  subCategoryName?: string | null;
  answers: Array<{
    questionText: string;
    answerText: string;
    score: number;
  }>;
  locale?: 'bn' | 'en';
}

export interface GradeFinalResult {
  score: number; 
  feedback: Record<string, any>;
}





export interface EvaluationResult {
  overall: number;
  communication: number;
  technical: number;
  problem_solving: number;
  confidence: number;
  grammar: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  career_advice: string;
  recommended_skills: string[];
  recommended_roadmap: { title: string; reason: string };
  recommended_verification: { title: string; reason: string };
  persistence_error?: string | null;
}

export interface InterviewStats {
  total_sessions: number;
  completed_count: number;
  average_score: number | null;
  best_score: number | null;
  last_score: number | null;
  last_evaluated_at: string | null;
  pass_count: number;
}

export interface AdminInterviewAnalytics {
  total_sessions: number;
  completed_count: number;
  total_unique_users: number;
  average_score: number | null;
  pass_count: number;
  fail_count: number;
  category_breakdown: Array<{
    category_id: string;
    category_name: string;
    count: number;
    avg_score: number | null;
    pass_count: number;
  }>;
  most_selected_categories: Array<{
    category_id: string;
    category_name: string;
    count: number;
  }>;
  pass_fail_breakdown: { pass: number; fail: number };
}


export async function evaluateInterviewFinal(args: GradeFinalArgs): Promise<EvaluationResult> {
  if (!isUuid(args.sessionId)) {
    throw new Error('Invalid interview session.');
  }
  const locale = args.locale ?? 'en';
  let res: Response;
  try {
    const headers = await authHeaders();
    res = await fetch(`${apiUrl(API)}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        sessionId: args.sessionId,
        categoryName: args.categoryName,
        subCategoryName: args.subCategoryName ?? null,
        answers: args.answers,
        locale: args.locale ?? 'en',
      }),
    });
  } catch {
    throw new Error(friendlyAiPreparingCopy(locale));
  }
  if (!res.ok) {
    throw new Error(friendlyAiPreparingCopy(locale));
  }
  const body = await res.json();
  const clamp = (v: any, fallback = 0) =>
    typeof v === 'number' ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
  return {
    overall: clamp(body?.overall),
    communication: clamp(body?.communication),
    technical: clamp(body?.technical),
    problem_solving: clamp(body?.problem_solving),
    confidence: clamp(body?.confidence),
    grammar: clamp(body?.grammar),
    summary: asString(body?.summary, 1500),
    strengths: Array.isArray(body?.strengths) ? body.strengths : [],
    weaknesses: Array.isArray(body?.weaknesses) ? body.weaknesses : [],
    recommendations: Array.isArray(body?.recommendations) ? body.recommendations : [],
    career_advice: asString(body?.career_advice, 800),
    recommended_skills: Array.isArray(body?.recommended_skills) ? body.recommended_skills : [],
    recommended_roadmap:
      body?.recommended_roadmap && typeof body.recommended_roadmap === 'object'
        ? {
            title: asString(body.recommended_roadmap.title, 200),
            reason: asString(body.recommended_roadmap.reason, 400),
          }
        : { title: '', reason: '' },
    recommended_verification:
      body?.recommended_verification && typeof body.recommended_verification === 'object'
        ? {
            title: asString(body.recommended_verification.title, 200),
            reason: asString(body.recommended_verification.reason, 400),
          }
        : { title: '', reason: '' },
    persistence_error: typeof body?.persistence_error === 'string' ? body.persistence_error : null,
  };
}


export async function getMyInterviewStats(): Promise<InterviewStats> {
  const empty: InterviewStats = {
    total_sessions: 0,
    completed_count: 0,
    average_score: null,
    best_score: null,
    last_score: null,
    last_evaluated_at: null,
    pass_count: 0,
  };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return empty;
    const { data, error } = await supabase.rpc('fn_interview_user_stats', {
      p_user_id: userId,
    });
    if (error) {
      console.warn('[interview] getMyInterviewStats rpc error:', error.message);
      return empty;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return empty;
    return {
      total_sessions: typeof row.total_sessions === 'number' ? row.total_sessions : 0,
      completed_count: typeof row.completed_count === 'number' ? row.completed_count : 0,
      average_score: row.average_score != null ? Number(row.average_score) : null,
      best_score: row.best_score != null ? Number(row.best_score) : null,
      last_score: row.last_score != null ? Number(row.last_score) : null,
      last_evaluated_at: row.last_evaluated_at ?? null,
      pass_count: typeof row.pass_count === 'number' ? row.pass_count : 0,
    };
  } catch (e: any) {
    console.warn('[interview] getMyInterviewStats threw:', e?.message);
    return empty;
  }
}


export async function getAdminInterviewAnalytics(): Promise<AdminInterviewAnalytics> {
  const empty: AdminInterviewAnalytics = {
    total_sessions: 0,
    completed_count: 0,
    total_unique_users: 0,
    average_score: null,
    pass_count: 0,
    fail_count: 0,
    category_breakdown: [],
    most_selected_categories: [],
    pass_fail_breakdown: { pass: 0, fail: 0 },
  };
  try {
    const headers = await authHeaders();
    const res = await fetch(apiUrl('/api/admin/analytics/interviews'), { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load admin analytics (HTTP ${res.status}).`);
    }
    const body = await res.json();
    return {
      total_sessions: typeof body?.total_sessions === 'number' ? body.total_sessions : 0,
      completed_count: typeof body?.completed_count === 'number' ? body.completed_count : 0,
      total_unique_users: typeof body?.total_unique_users === 'number' ? body.total_unique_users : 0,
      average_score: body?.average_score != null ? Number(body.average_score) : null,
      pass_count: typeof body?.pass_count === 'number' ? body.pass_count : 0,
      fail_count: typeof body?.fail_count === 'number' ? body.fail_count : 0,
      category_breakdown: Array.isArray(body?.category_breakdown) ? body.category_breakdown : [],
      most_selected_categories: Array.isArray(body?.most_selected_categories)
        ? body.most_selected_categories
        : [],
      pass_fail_breakdown:
        body?.pass_fail_breakdown && typeof body.pass_fail_breakdown === 'object'
          ? {
              pass: typeof body.pass_fail_breakdown.pass === 'number' ? body.pass_fail_breakdown.pass : 0,
              fail: typeof body.pass_fail_breakdown.fail === 'number' ? body.pass_fail_breakdown.fail : 0,
            }
          : { pass: 0, fail: 0 },
    };
  } catch (e: any) {
    console.warn('[interview] getAdminInterviewAnalytics failed:', e?.message);
    return empty;
  }
}





export default {
  INTERVIEW_DURATION_SECONDS,
  INTERVIEW_DAILY_LIMIT_HOURS,
  formatCountdown,
  secondsRemaining,
  loadInterviewCategories,
  loadInterviewSubCategories,
  canStartInterview,
  startInterviewSession,
  completeInterviewSession,
  recordInterviewQuestion,
  recordInterviewAnswer,
  listMyInterviewHistory,
  getInterviewSessionDetail,
  subscribeMyInterviewSessions,
  subscribeInterviewQuestions,
  subscribeInterviewAnswers,
  generateInterviewQuestion,
  gradeInterviewAnswer,
  evaluateInterviewFinal,
  getMyInterviewStats,
  getAdminInterviewAnalytics,
};