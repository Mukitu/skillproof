import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  Building2,
  ChevronLeft,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  cleanupExpiredMessagesSafe,
  getOrCreateCompanyUserConversation,
  useCompanyConversations,
  type CompanyConversationRow,
} from '../../services/messaging';
import { ConversationThread } from '../../components/messaging/ConversationThread';

const TONE_OPEN   = 'bg-gradient-to-r from-[#E31B23] to-[#F97316] border-transparent text-white shadow-sm';
const TONE_CLOSED = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
const TONE_BLOCK  = 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50';

function initials(name: string): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || '?';
}

function fmtRelative(iso: string | null, lang: 'bn' | 'en'): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return lang === 'bn' ? 'এখনই' : 'now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 24 * 3600_000) return `${Math.floor(diff / 3600_000)}h`;
    if (diff < 7 * 24 * 3600_000) return `${Math.floor(diff / (24 * 3600_000))}d`;
    return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export const CompanyMessagesPage: React.FC = () => {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const { company, isApproved } = useCompanyAuth();
  const [searchParams] = useSearchParams();

  const { rows, loading, refresh, setRows } = useCompanyConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all');
  const [autoStartBusy, setAutoStartBusy] = useState<boolean>(false);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  // Mobile-only view-mode: list (default) ↔ chat. On md+ the CSS shows
  // both panes and `mobileViewMode` is effectively ignored. Resetting to
  // 'list' is the "Back" action taken by ConversationThread.
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'chat'>('list');

  // Stable ref for `t` so the auto-start effect doesn't re-fire on every
  // render (t is recreated on every render because it closes over language).
  // Reading tRef.current inside the effect gives us the latest bilingual
  // strings without making t a useEffect dependency.
  const tRef = useRef(t);
  tRef.current = t;

  // Stable refs for values the auto-start effect reads — same reason.
  const companyRef = useRef(company);
  companyRef.current = company;
  const isApprovedRef = useRef(isApproved);
  isApprovedRef.current = isApproved;

  // Deep-link support: ?with=<profileId>&application=<appId>
  // Single deterministic effect: create/open conversation, inject it into
  // rows immediately so the thread renders with full candidate metadata,
  // then re-sync from the server in the background.
  // CRITICAL: only `searchParams` is in the dependency array. Every other
  // value used inside the effect is accessed via refs. Re-running this
  // effect on every render is what caused the "Opening conversation…"
  // spinner to get stuck — the cleanup (`cancelled = true`) would fire
  // before setRows/setActiveId could run, and `autoStartBusy` would
  // be set back to true on every re-render.
  useEffect(() => {
    const with_ = searchParams.get('with');
    const appId = searchParams.get('application');
    if (!with_) return;
    if (!companyRef.current || !isApprovedRef.current) return;
    if (activeId) return; // already have a thread selected

    let cancelled = false;
    setAutoStartBusy(true);
    setAutoStartError(null);
    (async () => {
      try {
        const row = await getOrCreateCompanyUserConversation(with_, appId);
        if (cancelled) return;
        // Optimistic insert — the thread renders instantly with name + avatar.
        setRows((prev) => {
          const others = prev.filter((r) => r.conversation_id !== row.conversation_id);
          return [row, ...others];
        });
        setActiveId(row.conversation_id);
        // Background refresh so canonical state catches up. Fire-and-forget
        // so the user can start typing immediately; the optimistic row is
        // already enough to render the thread + composer.
        void refresh();
      } catch (e: any) {
        console.error('[messaging] auto-start failed', e);
        if (!cancelled) {
          setAutoStartError(
            e?.message ??
              tRef.current('Unable to start conversation. Please try again.', 'কথোপকথন শুরু করা যাচ্ছে না। আবার চেষ্টা করুন।'),
          );
        }
      } finally {
        if (!cancelled) setAutoStartBusy(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'open' && (r.status !== 'open' || r.blocked_by_user)) return false;
      if (tab === 'closed' && r.status !== 'closed' && !r.blocked_by_user) return false;
      if (q && !(r.candidate_name ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, search]);

  // Auto-pick first row only if nothing is selected. Never reset
  // activeId to null when the row temporarily disappears — that's what
  // caused the original bug.
  useEffect(() => {
    if (autoStartBusy) return;
    if (!activeId && filtered.length > 0) {
      setActiveId(filtered[0].conversation_id);
    }
  }, [filtered, activeId, autoStartBusy]);

  // Sync mobile view-mode to activeId. On md+ we keep both panes visible
  // and `mobileViewMode` is irrelevant; we still set it for consistency.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;
    setMobileViewMode(activeId ? 'chat' : 'list');
  }, [activeId]);

  // Fire-and-forget 15-day cleanup ping — best-effort, runs once per mount.
  useEffect(() => {
    void cleanupExpiredMessagesSafe().catch(() => {});
  }, []);

  const active = useMemo(
    () => rows.find((r) => r.conversation_id === activeId) ?? null,
    [rows, activeId],
  );

  const onStateChanged = useCallback(() => { void refresh(); }, [refresh]);

  const counts = useMemo(() => ({
    all: rows.length,
    open: rows.filter((r) => r.status === 'open' && !r.blocked_by_user).length,
    closed: rows.filter((r) => r.status !== 'open' || r.blocked_by_user).length,
    unread: rows.reduce((s, r) => s + (r.unread_count || 0), 0),
  }), [rows]);

  if (!isApproved && !company) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-700">
            {t('Verification required', 'যাচাইকরণ প্রয়োজন')}
          </p>
          <p className="text-xs mt-1">
            {t(
              'Messaging is only available for verified companies.',
              'বার্তা বিনিময় শুধুমাত্র যাচাইকৃত কোম্পানির জন্য উপলব্ধ।',
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {t('Messages', 'বার্তা')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {t(
                  'Chat directly with candidates — for hiring context only.',
                  'প্রার্থীদের সাথে সরাসরি কথা বলুন — শুধুমাত্র নিয়োগ প্রসঙ্গে।',
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {counts.unread > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                <Sparkles className="w-3 h-3" />
                {counts.unread} {t('unread', 'অপঠিত')}
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('Refresh', 'রিফ্রেশ')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] md:divide-x divide-slate-100 h-[calc(100dvh-220px)] min-h-[560px] md:h-[640px] md:max-h-[80vh] md:min-h-0">
          {/* Inbox list */}
          <aside
            className={`flex flex-col min-h-0 md:max-h-none ${
              mobileViewMode === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="px-3 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('Search candidates', 'প্রার্থী খুঁজুন')}
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#E31B23]/60 focus:ring-1 focus:ring-[#E31B23]/20"
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {([
                  ['all',    t('All',     'সব'),          counts.all],
                  ['open',   t('Open',    'খোলা'),        counts.open],
                  ['closed', t('Closed',  'বন্ধ'),        counts.closed],
                ] as const).map(([k, label, n]) => {
                  const active = tab === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTab(k as 'all' | 'open' | 'closed')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-bold border transition ${
                        active
                          ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] border-transparent text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-2 py-2 space-y-1">
              {autoStartBusy && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] px-2 py-1.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('Opening conversation…', 'কথোপকথন শুরু হচ্ছে…')}
                </div>
              )}
              {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Loading…', 'লোড হচ্ছে…')}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-500 text-xs">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <p className="font-bold text-slate-700">
                    {t('No conversations', 'কোনো কথোপকথন নেই')}
                  </p>
                  <p className="mt-1">
                    {t(
                      'Open a candidate profile or shortlist and start a conversation.',
                      'প্রার্থীর প্রোফাইল বা শর্টলিস্ট থেকে কথোপকথন শুরু করুন।',
                    )}
                  </p>
                  <Link
                    to="/company/candidates"
                    className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-[10px]"
                  >
                    <Users className="w-3 h-3" />
                    {t('Browse candidates', 'প্রার্থী দেখুন')}
                  </Link>
                </div>
              ) : (
                filtered.map((r) => {
                  const isActive = r.conversation_id === activeId;
                  const tone = r.blocked_by_user
                    ? TONE_BLOCK
                    : r.status === 'open'
                      ? TONE_OPEN
                      : TONE_CLOSED;
                  return (
                    <ConversationListItem
                      key={r.conversation_id}
                      row={r}
                      active={isActive}
                      tone={tone}
                      onClick={() => setActiveId(r.conversation_id)}
                      language={language === 'bn' ? 'bn' : 'en'}
                    />
                  );
                })
              )}
            </div>
          </aside>

          {/* Thread */}
          <section
            className={`min-h-[560px] md:min-h-0 flex flex-col ${
              mobileViewMode === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {autoStartError ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-rose-700">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <p className="text-sm font-bold text-rose-700">
                  {t('Unable to open conversation', 'কথোপকথন খোলা যাচ্ছে না')}
                </p>
                <p className="text-xs mt-1 max-w-sm text-rose-600">
                  {autoStartError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAutoStartError(null);
                    setAutoStartBusy(true);
                    // re-trigger the effect by forcing searchParams to the same value
                    // via a manual retry path: simply call refresh + read with= again
                    const with_ = searchParams.get('with');
                    const appId = searchParams.get('application');
                    if (!with_) return;
                    (async () => {
                      try {
                        const row = await getOrCreateCompanyUserConversation(with_, appId);
                        setRows((prev) => {
                          const others = prev.filter((r) => r.conversation_id !== row.conversation_id);
                          return [row, ...others];
                        });
                        setActiveId(row.conversation_id);
                        await refresh();
                      } catch (e: any) {
                        setAutoStartError(
                          e?.message ??
                            t('Unable to start conversation. Please try again.', 'কথোপকথন শুরু করা যাচ্ছে না। আবার চেষ্টা করুন।'),
                        );
                      } finally {
                        setAutoStartBusy(false);
                      }
                    })();
                  }}
                  className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('Retry', 'আবার চেষ্টা করুন')}
                </button>
              </div>
            ) : autoStartBusy && !active ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-slate-500">
                <Loader2 className="w-8 h-8 text-[#E31B23] animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">
                  {t('Opening conversation…', 'কথোপকথন শুরু হচ্ছে…')}
                </p>
                <p className="text-xs mt-1">
                  {t('Please wait a moment.', 'একটু অপেক্ষা করুন।')}
                </p>
              </div>
            ) : active ? (
              <ConversationThread
                conversationId={active.conversation_id}
                viewer="company"
                counterpart={{
                  name: active.candidate_name || t('Candidate', 'প্রার্থী'),
                  avatarUrl: active.candidate_avatar_url ?? null,
                  subtitle: null,
                }}
                status={active.status}
                blockedByMe={active.blocked_by_company}
                blockedByOther={active.blocked_by_user}
                mobileChatOnly={mobileViewMode === 'chat'}
                onBack={() => setActiveId(null)}
                onStateChanged={onStateChanged}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {t('Select a conversation', 'একটি কথোপকথন নির্বাচন করুন')}
                </p>
                <p className="text-xs mt-1 max-w-sm">
                  {t(
                    'Pick a chat from the list to view messages.',
                    'বার্তা দেখতে তালিকা থেকে একটি চ্যাট বেছে নিন।',
                  )}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-700">{t('Privacy & retention', 'গোপনীয়তা ও সংরক্ষণ')}</p>
          <p className="mt-0.5">
            {t(
              'Messages auto-delete after 15 days. You can close or block any chat at any time. Phone numbers and emails stay hidden — chat inside SkillProof only.',
              'বার্তা ১৫ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়। যেকোনো সময় চ্যাট বন্ধ বা ব্লক করতে পারবেন। ফোন নম্বর ও ইমেইল লুকানো থাকে — শুধু SkillProof-এর ভিতরে চ্যাট করুন।',
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const ConversationListItem: React.FC<{
  row: CompanyConversationRow;
  active: boolean;
  tone: string;
  language: 'bn' | 'en';
  onClick: () => void;
}> = ({ row, active, tone, language, onClick }) => {
  const name = row.candidate_name || (language === 'bn' ? 'প্রার্থী' : 'Candidate');
  const preview = row.last_message_preview ?? (language === 'bn' ? 'কোনো বার্তা নেই' : 'No messages yet');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl px-2 py-2 border transition flex items-start gap-2 ${
        active
          ? 'bg-red-50 border-[#E31B23]/40'
          : 'bg-white border-transparent hover:bg-slate-50'
      }`}
    >
      {row.candidate_avatar_url ? (
        <img
          src={row.candidate_avatar_url}
          alt={name}
          className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
          {initials(name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-black text-slate-900 truncate flex-1">{name}</p>
          <span className="text-[9px] font-bold text-slate-500 shrink-0">
            {fmtRelative(row.last_message_at, language)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] text-slate-600 truncate flex-1">{preview}</p>
          {(row.unread_count ?? 0) > 0 && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black">
              {row.unread_count}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
          {row.blocked_by_user ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 border ${tone}`}>
              <Ban className="w-3 h-3" />
              {language === 'bn' ? 'ব্লক' : 'Blocked'}
            </span>
          ) : row.status === 'closed' ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 border ${tone}`}>
              <Lock className="w-3 h-3" />
              {language === 'bn' ? 'বন্ধ' : 'Closed'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-3 h-3" />
              {language === 'bn' ? 'সক্রিয়' : 'Active'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default CompanyMessagesPage;