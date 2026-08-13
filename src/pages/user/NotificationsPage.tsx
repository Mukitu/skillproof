
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Award, BadgeCheck, Bell, Briefcase, Check,
  CheckCircle2, FileText, GraduationCap, Loader2, Map, MessageSquare,
  RefreshCw, XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  iconForNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import { subscribeOwnRows } from '../../services/realtime';
import type { Notification } from '../../types/database';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Bell, CheckCircle2, AlertTriangle, AlertCircle, Award, BadgeCheck,
  Briefcase, FileText, GraduationCap, Map, MessageSquare, RefreshCw, XCircle,
};

function BellIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Cmp = ICONS[name] || Bell;
  return <Cmp size={size} />;
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
}

const TONE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
  passport_upgrade: 'bg-fuchsia-100 text-fuchsia-700',
  project_review: 'bg-cyan-100 text-cyan-700',
  module_exam: 'bg-indigo-100 text-indigo-700',
  module_exam_passed: 'bg-emerald-100 text-emerald-700',
  module_exam_failed: 'bg-rose-100 text-rose-700',
  course_cert_issued: 'bg-amber-100 text-amber-700',
  course_cert_revoked: 'bg-rose-100 text-rose-700',
  course_cert_restored: 'bg-emerald-100 text-emerald-700',
  roadmap_published: 'bg-indigo-100 text-indigo-700',
  roadmap_assigned: 'bg-indigo-100 text-indigo-700',
  roadmap_available: 'bg-indigo-100 text-indigo-700',
  skill_verification_published: 'bg-cyan-100 text-cyan-700',
  verification_approved: 'bg-emerald-100 text-emerald-700',
  verification_rejected: 'bg-rose-100 text-rose-700',
  verification_feedback: 'bg-amber-100 text-amber-700',
  job_published: 'bg-blue-100 text-blue-700',
  passport_approved: 'bg-emerald-100 text-emerald-700',
  passport_rejected: 'bg-rose-100 text-rose-700',
  passport_revision: 'bg-amber-100 text-amber-700',
};

export const NotificationsPage: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAll, setBusyAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMyNotifications();
      setRows(list);
    } catch (e) {
      
      console.error('[notifications page] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  
  useEffect(() => {
    const unsub = subscribeOwnRows(['notifications'], (event, _table, payload) => {
      const newRow = (payload?.new ?? null) as Notification | null;
      if (!newRow) return;
      setRows((prev) => {
        if (event === 'INSERT') {
          if (prev.some((p) => p.id === newRow.id)) return prev;
          return [newRow, ...prev];
        }
        if (event === 'UPDATE') {
          return prev.map((p) => (p.id === newRow.id ? { ...p, ...newRow } : p));
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);
  const visible = useMemo(
    () => (filter === 'unread' ? rows.filter((r) => !r.is_read) : rows),
    [rows, filter],
  );

  async function handleMarkAll() {
    if (unreadCount === 0) return;
    setBusyAll(true);
    const now = new Date().toISOString();
    const previous = rows;
    setRows((prev) => prev.map((r) => (
      r.is_read ? r : { ...r, is_read: true, read_at: r.read_at ?? now }
    )));
    try {
      await markAllNotificationsRead();
      void load();
    } catch (e) {
      setRows(previous);
      void load();
    } finally {
      setBusyAll(false);
    }
  }

  async function handleOpen(row: Notification) {
    const targetUrl = row.action_url || row.link || null;
    if (!row.is_read) {
      
      setRows((prev) => prev.map((r) => (
        r.id === row.id ? { ...r, is_read: true, read_at: r.read_at ?? new Date().toISOString() } : r
      )));
      try { await markNotificationRead(row.id); }
      catch { void load(); }
    }
    if (targetUrl) {
      navigate(targetUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-200 px-3 py-1 text-blue-700 text-[10px] font-black uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" />
              <span>{bn ? 'নোটিফিকেশন' : 'Notifications'}</span>
            </div>
            <h1 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {bn ? 'আপনার সব নোটিফিকেশন' : 'All your notifications'}
            </h1>
            <p className="mt-1 break-words text-xs text-slate-500">
              {unreadCount > 0
                ? (bn ? `${unreadCount}টি অপঠিত` : `${unreadCount} unread`)
                : (bn ? 'আপনি সব আপ টু ডেট' : 'You are all caught up')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
              <button
                onClick={() => setFilter('all')}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 transition ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {bn ? 'সব' : 'All'}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 transition ${filter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {bn ? 'অপঠিত' : 'Unread'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount === 0 || busyAll}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
            >
              {busyAll ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {bn ? 'সব পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all read'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && rows.length === 0 && (
          <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" /> {bn ? 'লোড হচ্ছে…' : 'Loading…'}
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            {filter === 'unread'
              ? (bn ? 'কোনো অপঠিত নোটিফিকেশন নেই।' : 'No unread notifications.')
              : (bn ? 'কোনো নোটিফিকেশন নেই।' : 'No notifications yet.')}
          </div>
        )}
        <ul>
          {visible.map((row) => {
            const tone = TONE[row.type] ?? 'bg-slate-100 text-slate-700';
            const iconName = iconForNotification(row);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(row)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-3 py-4 text-left transition hover:bg-slate-50 sm:px-5 ${!row.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
                    <BellIcon name={iconName} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className={`min-w-0 break-words text-sm ${!row.is_read ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {row.title}
                      </p>
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-400">
                        {formatAbsolute(row.created_at)}
                      </span>
                    </div>
                    {row.message && (
                      <p className="mt-1 break-words text-[13px] text-slate-600">{row.message}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                        {row.type}
                      </span>
                      {row.is_read && row.read_at && (
                        <span>{bn ? 'পঠিত' : 'Read'} {formatAbsolute(row.read_at)}</span>
                      )}
                      {!row.is_read && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-700">
                          {bn ? 'নতুন' : 'New'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default NotificationsPage;