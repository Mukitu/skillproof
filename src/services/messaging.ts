/**
 * Two-way messaging between Company ↔ User (candidate).
 *
 * Backed by `public.company_user_conversations` + `public.company_user_messages`
 * — see supabase/migrations/20260811000011_company_user_messaging.sql.
 *
 * All data access goes through SECURITY DEFINER RPCs so the company /
 * user clients don't need to know the underlying RLS contract; they
 * just call the helper functions on this module.
 *
 * No AI features. Text-only. 15-day automatic message cleanup.
 * Real-time delivery of new messages via postgres_changes subscriptions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { companySupabase } from '../lib/supabaseCompany';
import { getMyProfileId } from './profile';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import { useAuth } from '../context/AuthContext';


export type ConversationStatus = 'open' | 'closed';
export type SenderRole = 'company' | 'user';

export interface UserConversationRow {
  conversation_id: string;
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_mobile_verified?: boolean;
  user_id: string;
  application_id: string | null;
  status: ConversationStatus;
  blocked_by_company: boolean;
  blocked_by_user: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_by: SenderRole | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyConversationRow {
  conversation_id: string;
  company_id: string;
  user_id: string;
  candidate_name: string;
  candidate_avatar_url: string | null;
  application_id: string | null;
  status: ConversationStatus;
  blocked_by_company: boolean;
  blocked_by_user: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_by: SenderRole | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_role: SenderRole;
  body: string;
  read_by_company_at: string | null;
  read_by_user_at: string | null;
  created_at: string;
}

export interface StartConversationResult {
  conversation_id: string;
  company_id: string;
  user_id: string;
  application_id: string | null;
  status: ConversationStatus;
  blocked_by_company: boolean;
  blocked_by_user: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}


const USER_SCOPED_FALLBACK_CLIENT = supabase;
const COMPANY_SCOPED_FALLBACK_CLIENT = companySupabase;

function userClient() {
  return USER_SCOPED_FALLBACK_CLIENT;
}

function companyClient() {
  return COMPANY_SCOPED_FALLBACK_CLIENT;
}

/**
 * User-initiated: open or re-use a conversation with a company.
 */
export async function userStartConversation(
  companyId: string,
  applicationId?: string | null,
): Promise<StartConversationResult> {
  const profileId = await getMyProfileId();
  if (!profileId) throw new Error('Profile not found');
  const { data, error } = await userClient().rpc('fn_user_start_or_get_conversation', {
    p_company_id: companyId,
    p_application_id: applicationId ?? null,
  });
  if (error) throw error;
  return data as StartConversationResult;
}

/**
 * Company-initiated: open or re-use a conversation with a candidate.
 *
 * `userProfileId` is the candidate's `profiles.id` (NOT auth.uid).
 */
export async function companyStartConversation(
  userProfileId: string,
  applicationId?: string | null,
): Promise<StartConversationResult> {
  if (!userProfileId) throw new Error('Profile id is required');
  const { data, error } = await companyClient().rpc('fn_company_start_or_get_conversation', {
    p_user_id: userProfileId,
    p_application_id: applicationId ?? null,
  });
  if (error) throw error;
  return data as StartConversationResult;
}

/**
 * Resolve a candidate's display name + avatar (best-effort, non-fatal).
 */
async function fetchCompanyCandidateProfile(
  userProfileId: string,
): Promise<{ full_name: string; avatar_url: string | null }> {
  try {
    const { data } = await companyClient()
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userProfileId)
      .maybeSingle();
    if (!data) return { full_name: '', avatar_url: null };
    return {
      full_name: (data as { full_name?: string | null }).full_name ?? '',
      avatar_url: (data as { avatar_url?: string | null }).avatar_url ?? null,
    };
  } catch {
    return { full_name: '', avatar_url: null };
  }
}

async function fetchUserCompanyProfile(
  companyId: string,
): Promise<{ company_name: string; company_logo_url: string | null; mobile_verified: boolean }> {
  try {
    const { data } = await userClient()
      .from('companies')
      .select('company_name, company_logo_url, mobile_verified')
      .eq('id', companyId)
      .maybeSingle();
    if (!data) return { company_name: '', company_logo_url: null, mobile_verified: false };
    return {
      company_name: (data as { company_name?: string | null }).company_name ?? '',
      company_logo_url: (data as { company_logo_url?: string | null }).company_logo_url ?? null,
      mobile_verified: !!(data as { mobile_verified?: boolean }).mobile_verified,
    };
  } catch {
    return { company_name: '', company_logo_url: null, mobile_verified: false };
  }
}

/**
 * Get-or-create a Company ↔ Candidate conversation AND return it as a
 * fully-populated `CompanyConversationRow`. Hydrates candidate name + avatar
 * from `profiles` so the UI can render the thread instantly — no empty
 * placeholders, no race with realtime refresh.
 *
 * This is the single entry point for "Message Candidate" buttons across the
 * app (Candidate Search, Candidate Profile Modal, Applications, Shortlisted,
 * Interviews).
 */
export async function getOrCreateCompanyUserConversation(
  userProfileId: string,
  applicationId?: string | null,
): Promise<CompanyConversationRow> {
  const start = await companyStartConversation(userProfileId, applicationId);
  const profile = await fetchCompanyCandidateProfile(userProfileId);
  return {
    conversation_id: start.conversation_id,
    company_id: start.company_id,
    user_id: start.user_id,
    candidate_name: profile.full_name,
    candidate_avatar_url: profile.avatar_url,
    application_id: start.application_id,
    status: (start.status as 'open' | 'closed') ?? 'open',
    blocked_by_company: !!start.blocked_by_company,
    blocked_by_user: !!start.blocked_by_user,
    last_message_at: start.last_message_at,
    last_message_preview: start.last_message_preview,
    last_message_by: null,
    unread_count: start.unread_count ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * User-side mirror: get-or-create a User ↔ Company conversation, hydrated
 * with company name + logo so the thread renders with full context.
 */
export async function getOrCreateUserCompanyConversation(
  companyId: string,
  applicationId?: string | null,
): Promise<UserConversationRow> {
  const start = await userStartConversation(companyId, applicationId);
  const company = await fetchUserCompanyProfile(companyId);
  return {
    conversation_id: start.conversation_id,
    company_id: start.company_id,
    company_name: company.company_name,
    company_logo_url: company.company_logo_url,
    company_mobile_verified: company.mobile_verified,
    user_id: start.user_id,
    application_id: start.application_id,
    status: (start.status as 'open' | 'closed') ?? 'open',
    blocked_by_company: !!start.blocked_by_company,
    blocked_by_user: !!start.blocked_by_user,
    last_message_at: start.last_message_at,
    last_message_preview: start.last_message_preview,
    last_message_by: null,
    unread_count: start.unread_count ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * List the signed-in user's conversations (most recent first).
 */
export async function listUserConversations(): Promise<UserConversationRow[]> {
  const profileId = await getMyProfileId();
  if (!profileId) {
    console.warn('[messaging] listUserConversations: no profile id for current auth user — conversations will be empty');
    return [];
  }
  const { data, error } = await userClient().rpc('fn_user_list_conversations');
  if (error) throw error;
  return (data as UserConversationRow[]) ?? [];
}

/**
 * List the signed-in company's conversations.
 */
export async function listCompanyConversations(): Promise<CompanyConversationRow[]> {
  const { data, error } = await companyClient().rpc('fn_company_list_conversations');
  if (error) throw error;
  return (data as CompanyConversationRow[]) ?? [];
}

/**
 * Send a message from the signed-in user. Returns the inserted row.
 */
export async function userSendMessage(
  conversationId: string,
  body: string,
): Promise<MessageRow> {
  const { data, error } = await userClient().rpc('fn_user_send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw error;
  const res = data as { message_id: string; created_at: string };
  return {
    id: res.message_id,
    conversation_id: conversationId,
    sender_role: 'user',
    body,
    read_by_company_at: null,
    read_by_user_at: new Date().toISOString(),
    created_at: res.created_at,
  };
}

/**
 * Send a message from the signed-in company.
 */
export async function companySendMessage(
  conversationId: string,
  body: string,
): Promise<MessageRow> {
  const { data, error } = await companyClient().rpc('fn_company_send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw error;
  const res = data as { message_id: string; created_at: string };
  return {
    id: res.message_id,
    conversation_id: conversationId,
    sender_role: 'company',
    body,
    read_by_company_at: new Date().toISOString(),
    read_by_user_at: null,
    created_at: res.created_at,
  };
}

/**
 * Load messages for a conversation. The corresponding list RPC also
 * marks them read by the viewer.
 */
export async function listUserMessages(
  conversationId: string,
  limit = 200,
): Promise<MessageRow[]> {
  const { data, error } = await userClient().rpc('fn_user_list_messages', {
    p_conversation_id: conversationId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as MessageRow[]) ?? [];
}

export async function listCompanyMessages(
  conversationId: string,
  limit = 200,
): Promise<MessageRow[]> {
  const { data, error } = await companyClient().rpc('fn_company_list_messages', {
    p_conversation_id: conversationId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as MessageRow[]) ?? [];
}

/**
 * Close / reopen conversation — both sides.
 */
export async function userCloseConversation(conversationId: string): Promise<void> {
  const { error } = await userClient().rpc('fn_user_close_conversation', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function userReopenConversation(conversationId: string): Promise<void> {
  const { error } = await userClient().rpc('fn_user_reopen_conversation', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function companyCloseConversation(conversationId: string): Promise<void> {
  const { error } = await companyClient().rpc('fn_company_close_conversation', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function companyReopenConversation(conversationId: string): Promise<void> {
  const { error } = await companyClient().rpc('fn_company_reopen_conversation', { p_conversation_id: conversationId });
  if (error) throw error;
}

/**
 * Block / unblock counterparts. Blocking closes the chat and lifts
 * unread counts; unblocking reopens it.
 */
export async function userBlockCompany(conversationId: string): Promise<void> {
  const { error } = await userClient().rpc('fn_user_block_company', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function userUnblockCompany(conversationId: string): Promise<void> {
  const { error } = await userClient().rpc('fn_user_unblock_company', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function companyBlockUser(conversationId: string): Promise<void> {
  const { error } = await companyClient().rpc('fn_company_block_user', { p_conversation_id: conversationId });
  if (error) throw error;
}
export async function companyUnblockUser(conversationId: string): Promise<void> {
  const { error } = await companyClient().rpc('fn_company_unblock_user', { p_conversation_id: conversationId });
  if (error) throw error;
}

/**
 * Total unread across all conversations for the signed-in user/company.
 */
export async function userUnreadMessageCount(): Promise<number> {
  try {
    const { data, error } = await userClient().rpc('fn_user_unread_message_count');
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

export async function companyUnreadMessageCount(): Promise<number> {
  try {
    const { data, error } = await companyClient().rpc('fn_company_unread_message_count');
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

/**
 * Fire-and-forget 15-day cleanup ping. Safe to call from the browser — the
 * RPC is SECURITY INVOKER and only deletes messages older than 15 days.
 * Returns the number of rows deleted, or 0 on error.
 */
export async function cleanupExpiredMessagesSafe(): Promise<number> {
  try {
    const { data, error } = await userClient().rpc('fn_cleanup_expired_messages_safe');
    if (error) return 0;
    return typeof data === 'number' ? data : 0;
  } catch {
    return 0;
  }
}

/* =========================================================================
 *  React hooks
 * ========================================================================= */

/**
 * User-side inbox: list of conversations. Re-fetches whenever a
 * conversation or message is touched via realtime.
 */
export function useUserConversations() {
  const [rows, setRows] = useState<UserConversationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unread, setUnread] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch list and count independently so a count-fetch failure doesn't
      // wipe the inbox list. Both fail-silent individually so the user
      // always sees the most recent valid state.
      let list: UserConversationRow[] = [];
      try {
        list = await listUserConversations();
      } catch (e) {
        console.error('[messaging] user list load failed', e);
      }
      setRows(list);

      try {
        const count = await userUnreadMessageCount();
        setUnread(count);
      } catch (e) {
        console.error('[messaging] user unread count failed', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channelName = `user-conversations:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'company_user_conversations' },
        () => { void load(); },
      )
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'company_user_messages' },
        (payload: any) => {
          // In-place merge: only update the affected conversation row.
          // Avoids the wipe risk of refetching the whole list on every event.
          const row = payload?.new as MessageRow | undefined;
          if (!row) return;
          const incomingFromCompany = row.sender_role === 'company';
          const unreadForMe = incomingFromCompany && row.read_by_user_at == null;
          setRows((prev) => prev.map((r) => (
            r.conversation_id === row.conversation_id
              ? {
                  ...r,
                  last_message_preview: row.body,
                  last_message_at: row.created_at,
                  last_message_by: row.sender_role,
                  unread_count: unreadForMe
                    ? (r.unread_count || 0) + 1
                    : r.unread_count,
                }
              : r
          )));
          if (unreadForMe) setUnread((n) => n + 1);
        },
      )
      .on(
        'system' as any,
        { event: '*' },
        (payload: any) => {
          if (payload?.type && payload.type !== 'ok') {
            console.warn('[messaging] user realtime channel event', channelName, payload);
          }
        },
      )
      .subscribe((status: any) => {
        if (status && status !== 'SUBSCRIBED') {
          console.warn('[messaging] user realtime subscribe', channelName, status);
        }
      });
    return () => { try { supabase.removeChannel(channel); } catch { /* */ } };
  }, [load]);

  return { rows, loading, unread, refresh: load, setRows, setUnread };
}

/**
 * Company-side inbox.
 */
export function useCompanyConversations() {
  const [rows, setRows] = useState<CompanyConversationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unread, setUnread] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let list: CompanyConversationRow[] = [];
      try {
        list = await listCompanyConversations();
      } catch (e) {
        console.error('[messaging] company list load failed', e);
      }
      setRows(list);

      try {
        const count = await companyUnreadMessageCount();
        setUnread(count);
      } catch (e) {
        console.error('[messaging] company unread count failed', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channelName = `company-conversations:${Math.random().toString(36).slice(2)}`;
    const channel = companySupabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'company_user_conversations' },
        () => { void load(); },
      )
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'company_user_messages' },
        (payload: any) => {
          // In-place merge: update only the affected conversation row, no full refetch.
          const row = payload?.new as MessageRow | undefined;
          if (!row) return;
          const incomingFromUser = row.sender_role === 'user';
          const unreadForMe = incomingFromUser && row.read_by_company_at == null;
          setRows((prev) => prev.map((r) => (
            r.conversation_id === row.conversation_id
              ? {
                  ...r,
                  last_message_preview: row.body,
                  last_message_at: row.created_at,
                  last_message_by: row.sender_role,
                  unread_count: unreadForMe
                    ? (r.unread_count || 0) + 1
                    : r.unread_count,
                }
              : r
          )));
          if (unreadForMe) setUnread((n) => n + 1);
        },
      )
      .on(
        'system' as any,
        { event: '*' },
        (payload: any) => {
          if (payload?.type && payload.type !== 'ok') {
            console.warn('[messaging] company realtime channel event', channelName, payload);
          }
        },
      )
      .subscribe((status: any) => {
        if (status && status !== 'SUBSCRIBED') {
          console.warn('[messaging] company realtime subscribe', channelName, status);
        }
      });
    return () => { try { companySupabase.removeChannel(channel); } catch { /* */ } };
  }, [load]);

  return { rows, loading, unread, refresh: load, setRows, setUnread };
}

/**
 * Live messages for a single conversation. Subscribes to INSERTs on
 * `company_user_messages` so the new message appears instantly with
 * no refresh — uses the same scoped client (user or company) so the
 * RLS filter applies automatically.
 */

/**
 * Singleton channel registry keyed by conversationId. Multiple hook
 * instances (e.g. StrictMode double-mount, multiple pages open at once)
 * share one realtime channel — ref-counted, removed when the last
 * subscriber unmounts. Prevents the duplicate-message race where two
 * concurrent INSERT handlers each fire setMessages on the same row.
 */
type ConversationChannelEntry = {
  channel: any;
  refs: number;
  onInsert: Set<(row: MessageRow) => void>;
  onUpdate: Set<(row: MessageRow) => void>;
};
const conversationChannelRegistry = new Map<string, ConversationChannelEntry>();

function acquireConversationChannel(
  client: typeof supabase,
  conversationId: string,
  onInsert: (row: MessageRow) => void,
  onUpdate: (row: MessageRow) => void,
): () => void {
  let entry = conversationChannelRegistry.get(conversationId);
  if (!entry) {
    const channel = client.channel(`conversation-${conversationId}`);
    channel
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'company_user_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const row = payload?.new as MessageRow | undefined;
          if (!row) return;
          entry?.onInsert.forEach((cb) => {
            try { cb(row); } catch (e) { console.error('[messaging] conversation onInsert', e); }
          });
        },
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'company_user_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const row = payload?.new as MessageRow | undefined;
          if (!row) return;
          entry?.onUpdate.forEach((cb) => {
            try { cb(row); } catch (e) { console.error('[messaging] conversation onUpdate', e); }
          });
        },
      )
      .subscribe((status: any) => {
        if (status && status !== 'SUBSCRIBED') {
          console.warn('[messaging] conversation realtime subscribe', `conversation-${conversationId}`, status);
        }
      });
    entry = { channel, refs: 0, onInsert: new Set(), onUpdate: new Set() };
    conversationChannelRegistry.set(conversationId, entry);
  }
  entry.refs += 1;
  entry.onInsert.add(onInsert);
  entry.onUpdate.add(onUpdate);
  return () => {
    const e = conversationChannelRegistry.get(conversationId);
    if (!e) return;
    e.onInsert.delete(onInsert);
    e.onUpdate.delete(onUpdate);
    e.refs -= 1;
    if (e.refs <= 0) {
      try { (e.channel as any).unsubscribe?.(); } catch { /* */ }
      try { client.removeChannel(e.channel); } catch { /* */ }
      conversationChannelRegistry.delete(conversationId);
    }
  };
}

export function useConversationMessages(
  conversationId: string | null,
  viewer: 'user' | 'company',
) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const client = viewer === 'company' ? companySupabase : supabase;
  const idRef = useRef<string | null>(conversationId);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = viewer === 'company'
        ? await listCompanyMessages(conversationId, 200)
        : await listUserMessages(conversationId, 200);
      setMessages(list);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, viewer]);

  useEffect(() => {
    idRef.current = conversationId;
    void load();
  }, [conversationId, load]);

  useEffect(() => {
    if (!conversationId) return;
    const release = acquireConversationChannel(
      client,
      conversationId,
      (row) => {
        // Atomic dedup + optimistic replace + append in a single
        // setMessages call. Multiple concurrent broadcasts (e.g.
        // StrictMode double-mount) all funnel through this reducer,
        // so each row is appended at most once.
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          const placeholderIdx = prev.findIndex(
            (m) => m.id.startsWith('optimistic-') && m.sender_role === row.sender_role && m.body === row.body,
          );
          if (placeholderIdx >= 0) {
            const next = prev.slice();
            next[placeholderIdx] = row;
            return next;
          }
          return [...prev, row];
        });
      },
      (row) => {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
      },
    );
    return release;
  }, [conversationId, client]);

  return { messages, loading, error, refresh: load, setMessages };
}

export default {
  userStartConversation,
  companyStartConversation,
  getOrCreateCompanyUserConversation,
  getOrCreateUserCompanyConversation,
  listUserConversations,
  listCompanyConversations,
  userSendMessage,
  companySendMessage,
  listUserMessages,
  listCompanyMessages,
  userCloseConversation,
  userReopenConversation,
  companyCloseConversation,
  companyReopenConversation,
  userBlockCompany,
  userUnblockCompany,
  companyBlockUser,
  companyUnblockUser,
  userUnreadMessageCount,
  companyUnreadMessageCount,
  cleanupExpiredMessagesSafe,
  useUserConversations,
  useCompanyConversations,
  useConversationMessages,
};
