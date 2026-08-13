
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Award, BadgeCheck, Bell, Briefcase, Check,
  CheckCircle2, FileText, GraduationCap, Loader2, Map, MessageSquare,
  RefreshCw, XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  iconForNotification,
  markAllNotificationsRead,
  markNotificationRead,
  useMyNotifications,
  useRealtimeNotificationsBell,
} from '../../services/notifications';
import type { Notification } from '../../types/database';




const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Bell, CheckCircle2, AlertTriangle, AlertCircle, Award, BadgeCheck,
  Briefcase, FileText, GraduationCap, Map, MessageSquare, RefreshCw, XCircle,
};

function BellIcon({ name, size = 12 }: { name: string; size?: number }) {
  const Cmp = ICONS[name] || Bell;
  return <Cmp size={size} />;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const { rows, loading, unread, refresh, setRows, setUnread } = useMyNotifications();
  const [open, setOpen] = useState(false);
  const pulse = useRealtimeNotificationsBell();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  
  
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 1200);
    void refresh();
    return () => clearTimeout(t);
  }, [pulse, refresh]);

  
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  
  async function handleMarkRead(id: string, navigateTo?: string | null) {
    const previous = rows;
    setRows((prev) => prev.map((r) => (
      r.id === id ? { ...r, is_read: true, read_at: r.read_at ?? new Date().toISOString() } : r
    )));
    setUnread((u) => Math.max(0, u - (previous.find((r) => r.id === id && !r.is_read) ? 1 : 0)));
    try {
      await markNotificationRead(id);
      if (navigateTo) {
        setOpen(false);
        navigate(navigateTo);
      }
    } catch (e) {
      
      setRows(previous);
      void refresh();
    }
  }

  
  async function handleMarkAll() {
    if (unread === 0) return;
    const now = new Date().toISOString();
    const previous = rows;
    setRows((prev) => prev.map((r) => (
      r.is_read ? r : { ...r, is_read: true, read_at: r.read_at ?? now }
    )));
    setUnread(0);
    try {
      await markAllNotificationsRead();
      void refresh();
    } catch (e) {
      
      setRows(previous);
      void refresh();
    }
  }

  const visibleRows = useMemo(() => rows.slice(0, 12), [rows]);

  if (!user?.id) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 ${flashing ? 'ring-2 ring-blue-300 ring-offset-2 animate-pulse' : ''}`}
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">
                {unread > 0 ? `${unread} unread` : 'You are all caught up'}
              </p>
            </div>
            <button
              onClick={() => void handleMarkAll()}
              disabled={unread === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} /> Mark all read
            </button>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading && rows.length === 0 && (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
            )}
            {visibleRows.map((row) => {
              const iconName = iconForNotification(row);
              const targetUrl = row.action_url || row.link || null;
              const accent = row.is_read
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-100 text-blue-700';
              return (
                <button
                  key={row.id}
                  onClick={() => { void handleMarkRead(row.id, targetUrl); }}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${!row.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accent}`}
                    aria-hidden="true"
                  >
                    <BellIcon name={iconName} size={13} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${!row.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {row.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatRelative(row.created_at)}
                      </span>
                    </div>
                    {row.message && (
                      <p className="line-clamp-2 text-xs text-slate-500">{row.message}</p>
                    )}
                    {row.is_read && row.read_at && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Read {formatRelative(row.read_at)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center">
            <a
              href="/dashboard/notifications"
              className="text-xs font-medium text-blue-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
