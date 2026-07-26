/**
 * ActivityTimeline — vertical timeline of the current user's recent
 * activity_events. Each event renders with its icon, color, title,
 * description, and timestamp.
 */
import { useState, type Key as ReactKey } from 'react';
import { Activity, Award, BadgeCheck, Bell, Briefcase, Check, CheckCircle2, Download, Eye, FilePlus, FileText, Flag, Image as ImageIcon, Key, LogIn, Map, PlusCircle, RefreshCw, Send, Shield, Sparkles, User, UserPlus, X, XCircle } from 'lucide-react';
import { ACTIVITY_PRESET, useMyActivity } from '../../services/activity';
import type { ActivityEvent, ActivityEventKind } from '../../types/database';

const ICON_MAP: Record<string, any> = {
  'user-plus': UserPlus, user: User, image: ImageIcon, 'file-text': FileText, sparkles: Sparkles,
  map: Map, 'check-circle': CheckCircle2, flag: Flag, 'plus-circle': PlusCircle, send: Send,
  check: Check, x: X, eye: Eye, 'file-plus': FilePlus, 'badge-check': BadgeCheck,
  'x-circle': XCircle, award: Award, 'check-circle-2': CheckCircle2, 'refresh-cw': RefreshCw,
  download: Download, briefcase: Briefcase, bookmark: Bell, bell: Bell, 'log-in': LogIn, key: Key, shield: Shield,
};

interface TimelineProps {
  profileId?: string;
  limit?: number;
  title?: string;
}

export function ActivityTimeline({ profileId, limit = 50, title = 'Activity Timeline' }: TimelineProps) {
  const { events, loading } = useMyActivity(limit);
  const [filter, setFilter] = useState<ActivityEventKind | 'all'>('all');

  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter);

  const kindCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Activity size={18} className="text-blue-600" />
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Permanent record of every important action. {profileId ? '' : 'Synced in realtime.'}
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
          <option value="all">All events ({events.length})</option>
          {Object.entries(kindCounts).map(([k, n]) => (
            <option key={k} value={k}>{ACTIVITY_PRESET[k as ActivityEventKind]?.label ?? k} ({n})</option>
          ))}
        </select>
      </div>

      {loading && events.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-500">Loading activity...</div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-500">No activity yet — your events will appear here.</div>
      )}

      <ol className="relative ml-3 border-l-2 border-slate-100">
        {filtered.map((event) => (
          <TimelineRow key={event.id} event={event} />
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({ event }: { event: ActivityEvent; key?: ReactKey }) {
  const preset = ACTIVITY_PRESET[event.kind] ?? ACTIVITY_PRESET['profile.updated'];
  const Icon = ICON_MAP[preset.icon] ?? Activity;
  return (
    <li className="mb-3 ml-6">
      <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${preset.color.split(' ')[0]} ${preset.color.split(' ')[1]}`}>
        <Icon size={10} />
      </span>
      <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-2 transition hover:border-slate-200 hover:bg-white">
        <p className="text-sm font-medium text-slate-800">{preset.label}</p>
        {event.title && event.title !== preset.label && <p className="text-xs text-slate-600">{event.title}</p>}
        {event.description && <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
      </div>
    </li>
  );
}