import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Ban,
  CheckCheck,
  ChevronLeft,
  Loader2,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  companyBlockUser,
  companyCloseConversation,
  companyReopenConversation,
  companySendMessage,
  companyUnblockUser,
  userBlockCompany,
  userCloseConversation,
  userReopenConversation,
  userSendMessage,
  userUnblockCompany,
  type MessageRow,
} from '../../services/messaging';
import { useConversationMessages } from '../../services/messaging';

interface ConversationThreadProps {
  conversationId: string | null;
  viewer: 'user' | 'company';
  counterpart: {
    name: string;
    avatarUrl?: string | null;
    subtitle?: string | null;
  };
  status: 'open' | 'closed';
  blockedByMe: boolean;
  blockedByOther: boolean;
  /** Hide the list pane on mobile (Messenger-style "chat full-screen"). */
  mobileChatOnly?: boolean;
  onBack?: () => void;
  onStateChanged?: () => void;
}

function initials(name: string): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || '?';
}

function fmtTime(iso: string, lang: 'bn' | 'en'): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const within7d = (now.getTime() - d.getTime()) < 7 * 24 * 3600 * 1000;
    if (within7d) {
      return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })
        + ' ' + d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: '2-digit', month: 'short' })
      + ' ' + d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Pixel threshold under which we consider the user "near bottom" and
 *  auto-scroll on new messages. ~1.5 lines of text — comfortable buffer
 *  for emoji-sized bubbles while keeping manual scroll-back intent intact. */
const NEAR_BOTTOM_PX = 120;

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  conversationId,
  viewer,
  counterpart,
  status,
  blockedByMe,
  blockedByOther,
  mobileChatOnly = false,
  onBack,
  onStateChanged,
}) => {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const { messages, loading, error, refresh, setMessages } =
    useConversationMessages(conversationId, viewer);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).slice(2, 10));

  // ---- Smart-scroll state --------------------------------------------------
  // `stuckToBottom` reflects whether the user is currently reading the bottom.
  // It is read by the auto-scroll effect AND by the realtime/send paths to
  // decide whether to jump-to-bottom vs. show the "New messages" pill.
  const [stuckToBottom, setStuckToBottom] = useState<boolean>(true);
  // Number of NEW messages (not yet seen by the viewer) waiting below the
  // current viewport. Used to badge the "New messages" pill.
  const [pendingBelow, setPendingBelow] = useState<number>(0);
  // Tracks the last message id we *acted* on for stuckToBottom tracking.
  const lastMsgIdRef = useRef<string | null>(null);

  // ---- Mobile-keyboard state ----------------------------------------------
  // The mobile soft keyboard shrinks the visualViewport but not always the
  // layout viewport. We compute the inset and push it onto the composer via
  // a CSS variable so the textarea + Send button stay above the keyboard.
  const [keyboardInset, setKeyboardInset] = useState<number>(0);

  // ---- Scroll handlers ----------------------------------------------------
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - el.clientHeight - el.scrollTop;
    return remaining <= NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    // Use scrollTop directly — scrollIntoView() plays badly with nested
    // overflow containers and we'd rather set the exact pixel target.
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const near = isNearBottom();
    setStuckToBottom((prev) => (prev === near ? prev : near));
    if (near) {
      // Crossing the threshold into "near bottom" drains the pending count.
      setPendingBelow(0);
    }
  }, [isNearBottom]);

  // Auto-scroll behavior:
  //   - when the conversation switches, jump to bottom instantly (no smooth
  //     jump, to avoid the jitter of scrolling an empty container).
  //   - when messages length grows AND the user is (still) at the bottom,
  //     smoothly scroll to the new tail.
  //   - when messages length grows AND the user has scrolled up, count the
  //     new message into `pendingBelow` but do NOT force-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
    const isConvSwitch = lastMsgIdRef.current !== conversationId;
    if (isConvSwitch) {
      // Wait one frame for layout, then jump to bottom.
      requestAnimationFrame(() => scrollToBottom('auto'));
      lastMsgIdRef.current = lastId;
      setStuckToBottom(true);
      setPendingBelow(0);
      return;
    }

    const grew = lastId !== lastMsgIdRef.current;
    if (!grew) return;
    lastMsgIdRef.current = lastId;
    if (stuckToBottom) {
      // Smooth-scroll only if there's enough new content; instantaneous
      // when the container hasn't been resized recently.
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } else {
      // Compute how many new messages arrived below the current viewport.
      // `prev` length == messages.length - delta; we increment by 1 per new
      // tail message we encounter while not stuck. For multi-message bursts
      // this accumulates correctly because the effect runs per-state-change.
      setPendingBelow((n) => n + 1);
    }
  }, [messages, conversationId, stuckToBottom, scrollToBottom]);

  // Reset local state when switching threads — clear stuckToBottom optimism.
  useEffect(() => {
    setDraft('');
    setActionErr(null);
    setConfirmBlock(false);
    setPendingBelow(0);
  }, [conversationId]);

  // ---- Mobile keyboard tracking -------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      // When the keyboard opens, layout viewport typically stays the same
      // and vv.height shrinks. The "inset" is the amount of layout viewport
      // that is now hidden behind the keyboard.
      const inset = Math.max(0, window.innerHeight - vv.height);
      setKeyboardInset(inset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // After a keyboard inset change, keep the focused textarea visible by
  // scrolling it into view (browser default focus() handling).
  useEffect(() => {
    if (!keyboardInset) return;
    if (document.activeElement === taRef.current) {
      requestAnimationFrame(() => taRef.current?.scrollIntoView({ block: 'nearest' }));
    }
  }, [keyboardInset]);

  const blocked = blockedByMe || blockedByOther || status === 'closed';

  const send = async () => {
    const body = draft.trim();
    if (!body || !conversationId || blocked) return;
    setSending(true);
    setActionErr(null);
    // Instance-scoped placeholder id — guards against collisions when two
    // StrictMode mounts coexist briefly or when the same component remounts.
    const optimisticId = `optimistic-${instanceIdRef.current}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_role: viewer,
      body,
      read_by_company_at: viewer === 'company' ? new Date().toISOString() : null,
      read_by_user_at: viewer === 'user' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    // Force-scroll on send: the user is intentionally pushing a message.
    setStuckToBottom(true);
    setPendingBelow(0);
    requestAnimationFrame(() => scrollToBottom('smooth'));
    try {
      const fn = viewer === 'company' ? companySendMessage : userSendMessage;
      const real = await fn(conversationId, body);
      // Atomic: drop the placeholder and ensure the real row is present
      // exactly once — handles the StrictMode race where realtime INSERT
      // and RPC ack both arrive.
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimisticId);
        if (without.some((m) => m.id === real.id)) return without;
        return [...without, real];
      });
      // Refresh inbox preview/unread counters after the sender's own send.
      onStateChanged?.();
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(body);
      setActionErr(e?.message ?? t('Failed to send', 'পাঠাতে ব্যর্থ'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!conversationId) return;
    setBusyAction('close');
    setActionErr(null);
    try {
      const fn = viewer === 'company' ? companyCloseConversation : userCloseConversation;
      await fn(conversationId);
      onStateChanged?.();
    } catch (e: any) {
      setActionErr(e?.message ?? t('Failed to close', 'বন্ধ করতে ব্যর্থ'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleReopen = async () => {
    if (!conversationId) return;
    setBusyAction('reopen');
    setActionErr(null);
    try {
      const fn = viewer === 'company' ? companyReopenConversation : userReopenConversation;
      await fn(conversationId);
      onStateChanged?.();
    } catch (e: any) {
      setActionErr(e?.message ?? t('Failed to reopen', 'আবার খুলতে ব্যর্থ'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlock = async () => {
    if (!conversationId) return;
    setBusyAction('block');
    setActionErr(null);
    try {
      const fn = viewer === 'company' ? companyBlockUser : userBlockCompany;
      await fn(conversationId);
      setConfirmBlock(false);
      onStateChanged?.();
    } catch (e: any) {
      setActionErr(e?.message ?? t('Failed to block', 'ব্লক করতে ব্যর্থ'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnblock = async () => {
    if (!conversationId) return;
    setBusyAction('unblock');
    setActionErr(null);
    try {
      const fn = viewer === 'company' ? companyUnblockUser : userUnblockCompany;
      await fn(conversationId);
      onStateChanged?.();
    } catch (e: any) {
      setActionErr(e?.message ?? t('Failed to unblock', 'আনব্লক করতে ব্যর্থ'));
    } finally {
      setBusyAction(null);
    }
  };

  const jumpToLatest = useCallback(() => {
    setStuckToBottom(true);
    setPendingBelow(0);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center px-6 py-12 text-slate-500">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-bold text-slate-700">
          {t('Select a conversation', 'একটি কথোপকথন নির্বাচন করুন')}
        </p>
        <p className="text-xs mt-1 max-w-sm">
          {t(
            'Pick a chat from the list, or start a new conversation with a company or candidate.',
            'তালিকা থেকে একটি চ্যাট বেছে নিন অথবা কোনো কোম্পানি বা প্রার্থীর সাথে নতুন কথোপকথন শুরু করুন।',
          )}
        </p>
      </div>
    );
  }

  // Hide right-side action buttons on mobile chat-only mode to leave room
  // for the back arrow.
  const showBackOnHeader = !!(mobileChatOnly && onBack);

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col h-full min-h-0 w-full bg-white"
      style={{
        // CSS variable consumed by the composer to lift above the soft
        // keyboard. Falls back to env(safe-area-inset-bottom) on iOS.
        ['--kb-inset' as any]: `${keyboardInset}px`,
      }}
    >
      <header className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50 shrink-0 min-h-[56px] sm:min-h-[64px]">
        {showBackOnHeader && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('Back', 'ফিরে যান')}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white border border-slate-200 text-slate-600 shrink-0 active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {counterpart.avatarUrl ? (
          <img
            src={counterpart.avatarUrl}
            alt={counterpart.name}
            className="w-9 h-9 rounded-2xl object-cover border border-white shadow-sm shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
            {initials(counterpart.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 truncate">{counterpart.name}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            {status === 'closed' ? (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Lock className="w-3 h-3" />
                {t('Closed', 'বন্ধ')}
              </span>
            ) : blockedByMe ? (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <Ban className="w-3 h-3" />
                {t('You blocked this chat', 'আপনি এই চ্যাট ব্লক করেছেন')}
              </span>
            ) : blockedByOther ? (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <Ban className="w-3 h-3" />
                {t('You are blocked', 'আপনাকে ব্লক করা হয়েছে')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="w-3 h-3" />
                {t('Active', 'সক্রিয়')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {status === 'closed' ? (
            <button
              type="button"
              onClick={handleReopen}
              disabled={!!busyAction || blockedByMe || blockedByOther}
              className="inline-flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:px-2 sm:py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-[10px] disabled:opacity-50 active:scale-95 transition"
              title={t('Reopen chat', 'চ্যাট আবার খুলুন')}
              aria-label={t('Reopen chat', 'চ্যাট আবার খুলুন')}
            >
              {busyAction === 'reopen' ? <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" /> : <RotateCcw className="w-4 h-4 sm:w-3 sm:h-3" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={!!busyAction}
              className="inline-flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:px-2 sm:py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-[10px] disabled:opacity-50 active:scale-95 transition"
              title={t('Close chat', 'চ্যাট বন্ধ করুন')}
              aria-label={t('Close chat', 'চ্যাট বন্ধ করুন')}
            >
              {busyAction === 'close' ? <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" /> : <Lock className="w-4 h-4 sm:w-3 sm:h-3" />}
            </button>
          )}
          {blockedByMe ? (
            <button
              type="button"
              onClick={handleUnblock}
              disabled={!!busyAction}
              className="inline-flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:px-2 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] disabled:opacity-50 active:scale-95 transition"
              title={t('Unblock', 'আনব্লক')}
              aria-label={t('Unblock', 'আনব্লক')}
            >
              {busyAction === 'unblock' ? <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" /> : <RotateCcw className="w-4 h-4 sm:w-3 sm:h-3" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmBlock(true)}
              disabled={!!busyAction || (status === 'closed' && blockedByMe)}
              className="inline-flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:px-2 sm:py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[10px] disabled:opacity-50 active:scale-95 transition"
              title={t('Block', 'ব্লক')}
              aria-label={t('Block', 'ব্লক')}
            >
              <Ban className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 sm:px-4 py-3 sm:py-4 space-y-1.5 bg-slate-50/40"
      >
        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('Loading messages…', 'বার্তা লোড হচ্ছে…')}
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs py-12">
            <MessageSquare className="w-6 h-6 mb-2 text-slate-400" />
            <p className="font-bold text-slate-700">
              {viewer === 'company'
                ? t('Start a conversation with this candidate', 'প্রার্থীর সাথে কথোপকথন শুরু করুন')
                : t('Start a conversation with this company', 'কোম্পানির সাথে কথোপকথন শুরু করুন')}
            </p>
            <p className="mt-1 max-w-xs text-center">
              {viewer === 'company'
                ? t(
                    'Type a brief intro and your hiring context below. The candidate will be notified instantly.',
                    'নিচে সংক্ষিপ্ত পরিচয় ও নিয়োগ প্রসঙ্গ লিখুন। প্রার্থী তাৎক্ষণিকভাবে জানতে পারবেন।',
                  )
                : t(
                    'Reply with any questions about the role or your application. Keep it professional.',
                    'পদ বা আবেদন সম্পর্কে যেকোনো প্রশ্নের উত্তর দিন। পেশাদার ভাব রাখুন।',
                  )}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === viewer;
          return (
            <div key={m.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                  mine
                    ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                }`}
              >
                <p
                  className="whitespace-pre-wrap break-words"
                  // wordBreak: 'break-word' is the modern, Bangla-safe wrapper
                  // around overflow-wrap:anywhere + word-wrap fallback.
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {m.body}
                </p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${
                    mine ? 'text-white/80 justify-end' : 'text-slate-500'
                  }`}
                >
                  <span>{fmtTime(m.created_at, language === 'bn' ? 'bn' : 'en')}</span>
                  {mine && (
                    <CheckCheck
                      className={`w-3 h-3 ${
                        m.sender_role === 'company'
                          ? m.read_by_user_at
                            ? 'text-white'
                            : 'text-white/60'
                          : m.read_by_company_at
                            ? 'text-white'
                            : 'text-white/60'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {actionErr && (
        <div className="px-3 sm:px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-[11px] flex items-start gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{actionErr}</span>
          <button type="button" onClick={() => setActionErr(null)} aria-label="Dismiss" className="shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating "New messages" indicator — only when scrolled away from
          bottom. Sits above the composer, centered. */}
      {!stuckToBottom && pendingBelow > 0 && (
        <div className="absolute inset-x-0 bottom-[84px] sm:bottom-[88px] z-10 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-[11px] shadow-lg ring-1 ring-white/40 animate-[fadeIn_120ms_ease-out]"
            aria-label={t('Jump to latest', 'সর্বশেষ বার্তায় যান')}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>
              {pendingBelow === 1
                ? t('New message', 'নতুন বার্তা')
                : t(`${pendingBelow} new messages`, `${pendingBelow}টি নতুন বার্তা`)}
            </span>
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-slate-200 px-2.5 sm:px-4 py-2 bg-white flex items-end gap-2 shrink-0"
        // Lift composer above the mobile soft keyboard. --kb-inset is set
        // in the parent style; on iOS we also account for the home indicator.
        style={{
          paddingBottom:
            keyboardInset > 0
              ? `max(calc(env(safe-area-inset-bottom) + 4px), 8px)`
              : `max(calc(env(safe-area-inset-bottom) + 6px), 12px)`,
          marginBottom: keyboardInset > 0 ? `var(--kb-inset)` : undefined,
        }}
      >
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            // When the textarea is focused the soft keyboard opens and we
            // want the latest content visible. After the keyboard inset
            // effect updates, we'll scroll the textarea into view.
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={
            blocked
              ? status === 'closed'
                ? t('This chat is closed', 'এই চ্যাট বন্ধ আছে')
                : blockedByMe
                  ? t('You blocked this chat', 'আপনি এই চ্যাট ব্লক করেছেন')
                  : t('You are blocked', 'আপনাকে ব্লক করা হয়েছে')
              : t('Type a message…', 'একটি বার্তা লিখুন…')
          }
          disabled={blocked || sending}
          rows={1}
          // Auto-grow textarea up to a sensible cap. Cap on rows (browser
          // supports maxHeight via style) keeps the composer compact on
          // small phones when users paste long text.
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            const max = 140; // px — roughly 5 lines on a 13px font
            const next = Math.min(el.scrollHeight, max);
            el.style.height = `${next}px`;
            el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
          }}
          className="flex-1 min-w-0 resize-none rounded-xl border border-slate-200 focus:border-[#E31B23]/60 focus:ring-1 focus:ring-[#E31B23]/20 px-3 py-2 text-[13px] sm:text-sm placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400 leading-snug"
          style={{ minHeight: '40px', maxHeight: '140px' }}
        />
        <button
          type="submit"
          disabled={blocked || sending || !draft.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end active:scale-95 transition whitespace-nowrap"
          style={{ height: '40px', minWidth: '76px' }}
          aria-label={t('Send message', 'বার্তা পাঠান')}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="inline">{t('Send', 'পাঠান')}</span>
            </>
          )}
        </button>
      </form>

      {confirmBlock && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmBlock(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <p className="text-sm font-black text-rose-700">
                {t('Block this chat?', 'এই চ্যাট ব্লক করবেন?')}
              </p>
            </div>
            <div className="px-5 py-4 text-xs text-slate-700">
              <p>
                {t(
                  'Blocking will close the chat and prevent both sides from sending new messages. You can unblock later.',
                  'ব্লক করলে চ্যাট বন্ধ হয়ে যাবে এবং কেউ নতুন বার্তা পাঠাতে পারবে না। আপনি পরে আনব্লক করতে পারবেন।',
                )}
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBlock(false)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs"
              >
                {t('Cancel', 'বাতিল')}
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={!!busyAction}
                className="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm disabled:opacity-50 inline-flex items-center gap-1"
              >
                {busyAction === 'block' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                {t('Block', 'ব্লক')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationThread;
