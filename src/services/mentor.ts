
import { supabase } from '../lib/supabase';
import { apiUrl } from '../config/api';
import { getAccessToken } from './auth';
import { subscribeTable } from './realtime';
import { logActivity } from './activity';
import type { AIChatMessage, AIChatSession, AISessionMode } from '../types/database';

const API = '/api/mentor';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SendMentorMessageArgs {
  sessionId?: string | null;
  message: string;
  mode?: AISessionMode;
  career_goal?: string | null;
}

export interface SendMentorMessageResult {
  session: AIChatSession;
  userMessage: AIChatMessage;
  assistantMessage: AIChatMessage;
}


export async function sendMentorMessage(args: SendMentorMessageArgs): Promise<SendMentorMessageResult> {
  const headers = await authHeaders();
  const res = await fetch(`${apiUrl(API)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      sessionId: args.sessionId ?? null,
      message: args.message,
      mode: args.mode ?? 'chat',
      career_goal: args.career_goal ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Mentor request failed (HTTP ${res.status}).`);
  }
  const body = await res.json();
  if (!body?.session || !body?.userMessage || !body?.assistantMessage) {
    throw new Error('Mentor response missing required fields.');
  }
  void logActivity('ai_mentor.message_sent', 'AI mentor replied', {
    entityType: 'ai_chat_session',
    entityId: body.session.id,
    metadata: { mode: body.assistantMessage.mode ?? args.mode ?? 'chat' },
  });
  return body as SendMentorMessageResult;
}


export async function listMyMentorSessions(): Promise<AIChatSession[]> {
  const headers = await authHeaders();
  const res = await fetch(`${apiUrl(API)}/sessions`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load sessions (HTTP ${res.status}).`);
  }
  const body = await res.json();
  return Array.isArray(body?.sessions) ? body.sessions : [];
}


export async function getMentorSessionMessages(sessionId: string): Promise<AIChatMessage[]> {
  const headers = await authHeaders();
  const res = await fetch(`${apiUrl(API)}/sessions/${sessionId}/messages`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load messages (HTTP ${res.status}).`);
  }
  const body = await res.json();
  return Array.isArray(body?.messages) ? body.messages : [];
}


export function subscribeMentorMessages(sessionId: string, onChange: () => void): () => void {
  return subscribeTable('ai_chat_messages', () => onChange(), `session_id=eq.${sessionId}`);
}


export function subscribeMentorSessions(onChange: () => void): () => void {
  return subscribeTable('ai_chat_sessions', () => onChange());
}


export async function updateMentorSessionCareerGoal(
  sessionId: string,
  careerGoal: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ career_goal: careerGoal })
    .eq('id', sessionId);
  if (error) throw new Error(error.message || 'Failed to update session.');
}

export default {
  sendMentorMessage,
  listMyMentorSessions,
  getMentorSessionMessages,
  subscribeMentorMessages,
  subscribeMentorSessions,
  updateMentorSessionCareerGoal,
};
