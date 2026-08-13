import { useMemo, useState } from 'react';
import {
  Award, ChevronDown, ClipboardCheck, Eye, Filter, Flag, Map as MapIcon,
  Shield, Sparkles, Star, User as UserIcon,
} from 'lucide-react';
import {
  countByCategory, filterByView, groupTimelineByMonth, statusTone,
  visualFor, type TimelineViewMode,
} from '../../services/careerTimeline';
import type {
  CareerTimelineEvent, PublicCareerTimelineEvent,
} from '../../types/database';



export type TimelineRow = CareerTimelineEvent | PublicCareerTimelineEvent;

interface Props {
  events: TimelineRow[];
  variant?: 'user' | 'public';
  defaultView?: TimelineViewMode;
  
  heading?: string;
  emptyHint?: string;
  
  compact?: boolean;
}



const _SAFE = [
  'bg-slate-100', 'text-slate-700',
  'bg-emerald-50', 'text-emerald-800',
  'bg-amber-50', 'text-amber-800',
  'bg-blue-50', 'text-blue-800',
  'bg-rose-50', 'text-rose-800',
  'bg-fuchsia-50', 'text-fuchsia-800',
  'bg-cyan-50', 'text-cyan-800',
  'bg-yellow-50', 'text-yellow-800',
];

export function CareerTimeline({
  events,
  variant = 'user',
  defaultView = 'all',
  heading,
  emptyHint,
  compact = false,
}: Props) {
  const [view, setView] = useState<TimelineViewMode>(defaultView);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => countByCategory(events as CareerTimelineEvent[]), [events]);
  const filtered = useMemo(
    () => filterByView(events as CareerTimelineEvent[], view),
    [events, view],
  );
  const groups = useMemo(() => groupTimelineByMonth(filtered), [filtered]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Flag className="mx-auto mb-2 text-slate-400" size={28} />
        <p className="text-sm font-semibold text-slate-700">No timeline events yet</p>
        <p className="mt-1 text-xs text-slate-500">
          {emptyHint ?? 'Your career achievements will appear here as you complete roadmaps and verifications.'}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Flag className="h-4 w-4 text-[#E31B23]" />
            {heading ?? (variant === 'user' ? 'Permanent Achievement Ledger' : 'Career Timeline')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {variant === 'user'
              ? 'Snapshot-first, append-only, content-hash verified. Admin edits never alter your achievements.'
              : 'Verified, immutable career history anchored to the SkillProof database.'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { key: 'all', label: 'All', count: events.length },
            { key: 'skill', label: 'Skills', count: counts.skill },
            { key: 'roadmap', label: 'Roadmaps', count: counts.roadmap },
            { key: 'assessment', label: 'Assessments', count: counts.assessment },
            { key: 'certificate', label: 'Certificates', count: counts.certificate },
            { key: 'passport', label: 'Passport', count: counts.passport },
            { key: 'employer_verification', label: 'Verified', count: counts.employer_verification },
          ]
            .filter((t) => t.key === 'all' || t.count > 0)
            .map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key as TimelineViewMode)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  view === t.key
                    ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Filter className="h-3 w-3" /> {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${view === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {t.count}
                </span>
              </button>
            ))}
        </div>
      </div>

      <ol className="space-y-4">
        {groups.map((g) => {
          const open = groupOpen[`${g.year}-${g.month}`] ?? true;
          return (
            <li key={`${g.year}-${g.month}`} className="relative">
              <button
                onClick={() => setGroupOpen((prev) => ({
                  ...prev,
                  [`${g.year}-${g.month}`]: !(prev[`${g.year}-${g.month}`] ?? true),
                }))}
                className="sticky top-0 z-10 -ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`} />
                {g.label}
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-700">
                  {g.events.length}
                </span>
              </button>

              {open && (
                <ol className="relative ml-2 mt-2 border-l-2 border-slate-200 pl-5 space-y-3">
                  {g.events.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-amber-400">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      <TimelineRowCard event={e} variant={variant} compact={compact} />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}





function TimelineRowCard({
  event,
  variant: _v,
  compact,
}: {
  event: TimelineRow;
  variant: 'user' | 'public';
  compact: boolean;
}) {
  const meta = visualFor(event.category);
  const statusMeta = statusTone(event.status);
  const Icon = ICONS[meta.iconKey] ?? Flag;
  const date = new Date(event.event_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.toneBg} ${meta.toneFg}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 break-words">{event.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
              <span className="font-semibold">{date}</span>
              <span className="text-slate-300">·</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.toneBg} ${meta.toneFg}`}>
                {meta.categoryLabel}
              </span>
              {event.skill_label && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-700">{event.skill_label}</span>
                </>
              )}
              {event.sub_category_label && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{event.sub_category_label}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.fg}`}>
          {statusMeta.label}
        </span>
      </header>

      {!compact && event.description && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed break-words">
          {event.description}
        </p>
      )}

      {!compact && (
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <Detail label="Result" value={event.result_label} />
          {event.score != null && <Detail label="Score" value={`${Number(event.score).toFixed(1)}%`} />}
          {event.marks != null && <Detail label="Marks" value={`${Number(event.marks).toFixed(1)} / 10`} />}
          {event.source_version && <Detail label="Version" value={event.source_version} />}
          {event.verification_source && (
            <Detail label="Verified by" value={event.verification_source} className="col-span-2" />
          )}
          {event.certificate_number && (
            <Detail
              label="Certificate"
              value={event.certificate_number}
              href={event.source_url ?? `/verify/${encodeURIComponent(event.certificate_number)}`}
              className="col-span-2"
            />
          )}
          {event.source_url && !event.certificate_number && (
            <Detail label="Source" value={event.source_url} href={event.source_url} className="col-span-2" />
          )}
        </dl>
      )}

      {!compact && isSuperseded(event) && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <Shield className="h-3 w-3" /> Superseded by newer version
        </p>
      )}
    </article>
  );
}

function Detail({
  label, value, className, href,
}: {
  label: string;
  value: string;
  className?: string;
  href?: string;
}) {
  const body = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block truncate font-mono text-[11px] font-bold text-[#E31B23] hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="block truncate text-[11px] font-bold text-slate-900">{value}</span>
  );
  return (
    <div className={`rounded-lg bg-slate-50 px-2.5 py-1.5 ${className ?? ''}`}>
      <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5">{body}</dd>
    </div>
  );
}

const ICONS: Record<string, typeof Flag> = {
  user: UserIcon,
  award: Award,
  map: MapIcon,
  clipboard: ClipboardCheck,
  shield: Shield,
  sparkles: Sparkles,
  eye: Eye,
  star: Star,
  flag: Flag,
};

function isSuperseded(e: TimelineRow): boolean {
  return e.status === 'superseded' || e.status === 'archived';
}

export default CareerTimeline;
