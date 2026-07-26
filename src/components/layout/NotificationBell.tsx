/**
 * NotificationBell — realtime enterprise notifications.
 *
 * Pops a counter badge on unread count and flashes when a new notification
 * arrives via realtime. Clicking opens a dropdown with the latest 12 rows.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listMyNotifications, markAllNotificationsRead, markNotificationRead,
  useRealtimeNotificationsBell,
} from '../../services/notifications';
import type { Notification } from '../../types/database';

const TYPE_STYLE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
  passport_upgrade: 'bg-fuchsia-100 text-fuchsia-700',
  project_review: 'bg-cyan-100 text-cyan-700',
};

export function NotificationBell() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const pulse = useRealtimeNotificationsBell();
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const list = await listMyNotifications();
      setRows(list);
    } catch (e) {
      console.error('[notification bell] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { void load(); }, [load]);

  // Flash animation when realtime fires
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 1200);
    void load();
    return () => clearTimeout(t);
  }, [pulse, load]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const unread = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

  async function handleMarkRead(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
    try { await markNotificationRead(id); } catch { /* swallow */ }
  }

  async function handleMarkAll() {
    setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
    try { await markAllNotificationsRead(); } catch { /* swallow */ }
  }

  if (!profile?.id) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 ${flashing ? 'ring-2 ring-blue-300 ring-offset-2 animate-pulse' : ''}`}
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button onClick={() => void handleMarkAll()} disabled={unread === 0} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-40">
              <Check size={12} /> Mark all read
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && rows.length === 0 && (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" />Loading...</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
            )}
            {rows.slice(0, 12).map((row) => (
              <button
                key={row.id}
                onClick={() => { void handleMarkRead(row.id); if (row.link) window.location.assign(row.link); }}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${!row.is_read ? 'bg-blue-50/40' : ''}`}
              >
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TYPE_STYLE[row.type ?? 'info'] ?? TYPE_STYLE.info}`}>
                  {row.is_read ? <CheckCircle2 size={12} /> : <Bell size={12} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-sm ${!row.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{row.title}</p>
                  {row.message && <p className="line-clamp-2 text-xs text-slate-500">{row.message}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center">
            <a href="/dashboard/notifications" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => setOpen(false)}>View all notifications</a>
          </div>
        </div>
      )}
    </div>
  );
}