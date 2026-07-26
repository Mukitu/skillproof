/**
 * AdminAnalyticsPage — Enterprise KPI dashboard.
 *
 * Single source of truth = `fn_analytics_dashboard` RPC.
 * Realtime refresh is wired by the analytics hook.
 *
 * Sections:
 *   1. KPI tiles (users, passports, verifications, jobs, roadmaps)
 *   2. Pass-rate + average score (derived)
 *   3. Popular categories (bar chart)
 *   4. Popular skills (bar chart)
 *   5. Monthly growth (line chart)
 *   6. Daily activity (line chart)
 */
import { useMemo } from 'react';
import { AlertCircle, Loader2, RefreshCcw, TrendingUp } from 'lucide-react';
import { useAnalyticsDashboard, passRate } from '../../services/analytics';

interface BarProps { value: number; max: number; label: string; color?: string; subLabel?: string; key?: string; }
function Bar({ value, max, label, color = 'bg-blue-500', subLabel }: BarProps) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{value.toLocaleString()}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {subLabel && <p className="mt-0.5 text-[10px] text-slate-400">{subLabel}</p>}
    </div>
  );
}

interface LineChartProps { data: Array<{ label: string; value: number }>; color?: string; }
function LineChart({ data, color = '#2563eb' }: LineChartProps) {
  const { points, max, w, h, padX, padY } = useMemo(() => {
    const w = 720, h = 220, padX = 32, padY = 24;
    const max = Math.max(1, ...data.map((d) => d.value));
    const stepX = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: padX + i * stepX,
      y: h - padY - (d.value / max) * (h - padY * 2),
      label: d.label, value: d.value,
    }));
    return { points, max, w, h, padX, padY };
  }, [data]);
  if (!data.length) {
    return <p className="p-6 text-center text-sm text-slate-500">No data yet.</p>;
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full">
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text x={p.x} y={h - 6} fontSize={9} textAnchor="middle" fill="#64748b">{p.label}</text>
            <text x={p.x} y={p.y - 8} fontSize={9} textAnchor="middle" fill="#94a3b8">{p.value}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface KpiCardProps { label: string; value: number; subLabel?: string; color: string; }
function KpiCard({ label, value, subLabel, color }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        <TrendingUp className="h-4 w-4 text-white" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</p>
      {subLabel && <p className="mt-0.5 text-xs text-slate-400">{subLabel}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, loading, error, refresh } = useAnalyticsDashboard();
  const rate = passRate(data);

  const monthly = data.monthly_growth.map((m) => ({ label: m.month.slice(5), value: m.users }));
  const daily = data.daily_activity.map((d) => ({ label: d.day.slice(5), value: d.events }));
  const maxCategory = Math.max(1, ...data.popular_categories.map((c) => c.passed));
  const maxSkill = Math.max(1, ...data.popular_skills.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Server-aggregated KPIs updated in realtime. Last computed{' '}
            <span className="font-mono">{data.computed_at ? new Date(data.computed_at).toLocaleString() : '—'}</span>.
          </p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {loading && !data.totals.total_users && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading analytics...</div>}

      {/* KPI tiles — 4 columns */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Users" value={data.totals.total_users} subLabel={`${data.totals.active_users.toLocaleString()} active`} color="bg-blue-500" />
        <KpiCard label="Verified Users" value={data.totals.verified_users} subLabel={`${data.totals.premium_users.toLocaleString()} premium`} color="bg-emerald-500" />
        <KpiCard label="Total Passports" value={data.totals.total_passports} subLabel={`${data.totals.active_passports.toLocaleString()} active`} color="bg-indigo-500" />
        <KpiCard label="Pending Passports" value={data.totals.pending_passports} subLabel={`${data.totals.renewed_passports.toLocaleString()} renewed`} color="bg-amber-500" />
        <KpiCard label="Suspended Passports" value={data.totals.suspended_passports} subLabel={`${data.totals.rejected_passports.toLocaleString()} rejected`} color="bg-rose-500" />
        <KpiCard label="Submissions" value={data.totals.total_submissions} subLabel={`${data.totals.passed_verifications.toLocaleString()} passed`} color="bg-cyan-500" />
        <KpiCard label="Pass Rate" value={Math.round(rate * 100)} subLabel="passed / total" color="bg-fuchsia-500" />
        <KpiCard label="Employer Verifications" value={data.totals.employer_verifications} subLabel={`${data.totals.verifications_24h.toLocaleString()} last 24h`} color="bg-violet-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Monthly user growth</h2>
          <LineChart data={monthly} color="#2563eb" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Daily activity (events)</h2>
          <LineChart data={daily} color="#10b981" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Most popular categories</h2>
          <div className="space-y-2">
            {data.popular_categories.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {data.popular_categories.map((c, i) => (
              <Bar key={`${c.category_id ?? 'none'}-${i}`} value={c.passed} max={maxCategory} label={c.category_name || 'Uncategorized'} color="bg-indigo-500" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Most verified skills</h2>
          <div className="space-y-2">
            {data.popular_skills.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {data.popular_skills.map((s, i) => (
              <Bar key={`${s.skill_id ?? 'none'}-${i}`} value={s.count} max={maxSkill} label={s.skill_name || 'Unnamed skill'} color="bg-pink-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Active Jobs" value={data.totals.active_jobs} color="bg-teal-500" />
        <KpiCard label="Roadmaps" value={data.totals.total_roadmaps} color="bg-purple-500" />
        <KpiCard label="Admin Users" value={data.totals.admin_users} color="bg-slate-700" />
        <KpiCard label="Notifications (7d)" value={data.totals.notifications_7d} color="bg-orange-500" />
      </div>
    </div>
  );
}