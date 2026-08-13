
import { supabase } from '../lib/supabase';
import { getMyProfileId } from './profile';
import type {
  CareerTimelineCategory, CareerTimelineEvent, CareerTimelineStatus,
} from '../types/database';

const USER_RPC = 'fn_list_user_career_timeline';
const PUBLIC_RPC = 'fn_list_public_career_timeline';


export async function listMyCareerTimeline(
  profileId?: string,
  limit = 200,
): Promise<CareerTimelineEvent[]> {
  const pid = profileId ?? (await getMyProfileId());
  if (!pid) return [];
  const { data, error } = await supabase.rpc(USER_RPC, {
    p_profile_id: pid,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as CareerTimelineEvent[]) ?? [];
}


export async function listPublicCareerTimeline(
  query: string,
  limit = 100,
): Promise<CareerTimelineEvent[]> {
  const q = (query ?? '').trim();
  if (!q) return [];
  const { data, error } = await supabase.rpc(PUBLIC_RPC, {
    p_query: q,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as CareerTimelineEvent[]) ?? [];
}





export interface TimelineGroup {
  year: number;
  month: number;          
  label: string;          
  events: CareerTimelineEvent[];
}


export function groupTimelineByMonth(
  events: CareerTimelineEvent[],
): TimelineGroup[] {
  const buckets = new Map<string, TimelineGroup>();
  for (const e of events) {
    const d = new Date(e.event_at);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${month}`;
    let g = buckets.get(key);
    if (!g) {
      g = {
        year,
        month,
        label: d.toLocaleString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' }),
        events: [],
      };
      buckets.set(key, g);
    }
    g.events.push(e);
  }
  return Array.from(buckets.values())
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
    .map((g) => ({
      ...g,
      events: [...g.events].sort(
        (x, y) => new Date(y.event_at).getTime() - new Date(x.event_at).getTime(),
      ),
    }));
}


export function countByCategory(events: CareerTimelineEvent[]): Record<CareerTimelineCategory, number> {
  const out: Record<CareerTimelineCategory, number> = {
    profile: 0, skill: 0, roadmap: 0, assessment: 0,
    certificate: 0, passport: 0, employer_verification: 0, achievement: 0,
  };
  for (const e of events) {
    if (e.category in out) out[e.category as CareerTimelineCategory]++;
  }
  return out;
}


export type TimelineViewMode = 'all' | CareerTimelineCategory;

export function filterByView(
  events: CareerTimelineEvent[],
  view: TimelineViewMode,
): CareerTimelineEvent[] {
  if (view === 'all') return events;
  return events.filter((e) => e.category === view);
}





export interface TimelineVisualMeta {
  
  iconKey:
    | 'user' | 'award' | 'map' | 'clipboard' | 'shield'
    | 'sparkles' | 'eye' | 'star' | 'flag';
  
  toneBg: string;
  toneFg: string;
  
  categoryLabel: string;
}

const VISUAL: Record<CareerTimelineCategory, TimelineVisualMeta> = {
  profile:              { iconKey: 'user',      toneBg: 'bg-slate-100',    toneFg: 'text-slate-700',    categoryLabel: 'Profile' },
  skill:                { iconKey: 'award',     toneBg: 'bg-emerald-50',   toneFg: 'text-emerald-800',  categoryLabel: 'Skill' },
  roadmap:              { iconKey: 'map',       toneBg: 'bg-amber-50',     toneFg: 'text-amber-800',    categoryLabel: 'Roadmap' },
  assessment:           { iconKey: 'clipboard', toneBg: 'bg-blue-50',      toneFg: 'text-blue-800',     categoryLabel: 'Assessment' },
  certificate:          { iconKey: 'shield',    toneBg: 'bg-rose-50',      toneFg: 'text-rose-800',     categoryLabel: 'Certificate' },
  passport:             { iconKey: 'sparkles',  toneBg: 'bg-fuchsia-50',   toneFg: 'text-fuchsia-800',  categoryLabel: 'Passport' },
  employer_verification:{ iconKey: 'eye',       toneBg: 'bg-cyan-50',      toneFg: 'text-cyan-800',     categoryLabel: 'Verified' },
  achievement:          { iconKey: 'star',      toneBg: 'bg-yellow-50',    toneFg: 'text-yellow-800',   categoryLabel: 'Achievement' },
};

export function visualFor(category: CareerTimelineCategory): TimelineVisualMeta {
  return VISUAL[category] ?? VISUAL.achievement;
}


export function statusTone(status: CareerTimelineStatus): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'completed':
    case 'passed':
    case 'verified':
    case 'issued':
    case 'renewed':
    case 'upgraded':
      return { bg: 'bg-emerald-100', fg: 'text-emerald-800', label: statusLabel(status) };
    case 'failed':
    case 'revoked':
    case 'suspended':
      return { bg: 'bg-rose-100', fg: 'text-rose-800', label: statusLabel(status) };
    case 'created':
    case 'started':
    case 'in_progress':
      return { bg: 'bg-blue-100', fg: 'text-blue-800', label: statusLabel(status) };
    case 'archived':
    case 'superseded':
      return { bg: 'bg-slate-100', fg: 'text-slate-700', label: statusLabel(status) };
    default:
      return { bg: 'bg-slate-100', fg: 'text-slate-700', label: statusLabel(status) };
  }
}

function statusLabel(status: CareerTimelineStatus): string {
  switch (status) {
    case 'created': return 'Created';
    case 'started': return 'Started';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'passed': return 'Passed';
    case 'failed': return 'Failed';
    case 'verified': return 'Verified';
    case 'issued': return 'Issued';
    case 'renewed': return 'Renewed';
    case 'upgraded': return 'Upgraded';
    case 'revoked': return 'Revoked';
    case 'suspended': return 'Suspended';
    case 'archived': return 'Archived';
    case 'superseded': return 'Superseded';
  }
}
