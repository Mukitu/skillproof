
import { useMemo } from 'react';
import type React from 'react';
import {
  Activity, AlertCircle, BarChart3, Bot, Briefcase, ClipboardCheck, FolderTree,
  Layers, Loader2, RefreshCcw, ScanSearch, ShieldCheck, TrendingUp, UserCheck, Users,
} from 'lucide-react';
import { useAnalyticsDashboard, passRate } from '../../services/analytics';
import { useAdminInterviewAnalytics } from '../../hooks/useAdminInterviewAnalytics';

type BarProps = { key?: React.Key; value: number; max: number; label: string; color?: string; subLabel?: string };
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

type LineChartProps = { data: Array<{ label: string; value: number }>; color?: string };
function LineChart({ data, color = '#2563eb' }: LineChartProps) {
  const { points, max, w, h } = useMemo(() => {
    const w = 720, h = 220;
    const max = Math.max(1, ...data.map((d) => d.value));
    const stepX = data.length > 1 ? (w - 64) / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: 32 + i * stepX,
      y: h - 24 - (d.value / max) * (h - 48),
      label: d.label, value: d.value,
    }));
    return { points, max, w, h };
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

type KpiCardProps = { label: string; value: number; subLabel?: string; color: string; icon?: React.ComponentType<{ size?: number; className?: string }> };
function KpiCard({ label, value, subLabel, color, icon: Icon }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        {Icon ? <Icon size={16} className="text-white" /> : <TrendingUp className="h-4 w-4 text-white" />}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</p>
      {subLabel && <p className="mt-0.5 text-xs text-slate-400">{subLabel}</p>}
    </div>
  );
}


type PassFailDonutProps = { pass: number; fail: number };
function PassFailDonut({ pass, fail }: PassFailDonutProps) {
  const total = Math.max(0, pass) + Math.max(0, fail);
  const r = 70;
  const cx = 100;
  const cy = 100;
  const C = 2 * Math.PI * r;
  const passPct = total > 0 ? Math.max(0, pass) / total : 0;
  const failPct = total > 0 ? Math.max(0, fail) / total : 0;
  
  const gap = total > 0 ? C * 0.01 : 0;
  const passDash = Math.max(0, passPct * C - gap);
  const failDash = Math.max(0, failPct * C - gap);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <svg viewBox="0 0 200 200" className="h-40 w-40">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={18} />
        </svg>
        <p className="-mt-20 text-[11px] font-medium text-slate-400">No data yet</p>
      </div>
    );
  }

  
  const rotateTransform = `rotate(-90 ${cx} ${cy})`;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-40 w-40">
        {}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={18} />
        {passPct > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#10b981"
            strokeWidth={18}
            strokeDasharray={`${passDash} ${C - passDash}`}
            strokeDashoffset={0}
            transform={rotateTransform}
            strokeLinecap="butt"
          />
        )}
        {failPct > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={18}
            strokeDasharray={`${failDash} ${C - failDash}`}
            strokeDashoffset={-passPct * C}
            transform={rotateTransform}
            strokeLinecap="butt"
          />
        )}
        <text x={cx} y={cy - 4} fontSize={26} fontWeight={700} textAnchor="middle" fill="#0f172a">
          {Math.round(passPct * 100)}%
        </text>
        <text x={cx} y={cy + 16} fontSize={10} textAnchor="middle" fill="#64748b">
          pass rate
        </text>
      </svg>
      <div className="mt-3 flex gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-700">{pass.toLocaleString()} pass</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="font-semibold text-slate-700">{fail.toLocaleString()} fail</span>
        </div>
      </div>
    </div>
  );
}

const KIND_COLORS: Record<string, string> = {
  'account.created': 'bg-blue-100 text-blue-700',
  'profile.updated': 'bg-cyan-100 text-cyan-700',
  'avatar.uploaded': 'bg-violet-100 text-violet-700',
  'resume.uploaded': 'bg-violet-100 text-violet-700',
  'ai_career.generated': 'bg-indigo-100 text-indigo-700',
  'roadmap.started': 'bg-emerald-100 text-emerald-700',
  'roadmap.day_completed': 'bg-emerald-100 text-emerald-700',
  'roadmap.completed': 'bg-emerald-100 text-emerald-700',
  'assessment.created': 'bg-amber-100 text-amber-700',
  'assessment.submitted': 'bg-amber-100 text-amber-700',
  'assessment.passed': 'bg-emerald-100 text-emerald-700',
  'assessment.failed': 'bg-rose-100 text-rose-700',
  'assessment.reviewed': 'bg-emerald-100 text-emerald-700',
  'verification.created': 'bg-cyan-100 text-cyan-700',
  'verification.passed': 'bg-emerald-100 text-emerald-700',
  'verification.failed': 'bg-rose-100 text-rose-700',
  'passport.requested': 'bg-amber-100 text-amber-700',
  'passport.approved': 'bg-emerald-100 text-emerald-700',
  'passport.rejected': 'bg-rose-100 text-rose-700',
  'passport.renewed': 'bg-cyan-100 text-cyan-700',
  'passport.downloaded': 'bg-slate-100 text-slate-700',
  'job.applied': 'bg-blue-100 text-blue-700',
  'job.saved': 'bg-blue-100 text-blue-700',
  'notification.sent': 'bg-slate-100 text-slate-700',
  'login.success': 'bg-slate-100 text-slate-700',
  'login.failed': 'bg-rose-100 text-rose-700',
  'password.changed': 'bg-slate-100 text-slate-700',
  'admin.role_changed': 'bg-fuchsia-100 text-fuchsia-700',
};

export default function AdminAnalyticsPage() {
  const { data, loading, error, refresh } = useAnalyticsDashboard();
  const rate = passRate(data);
  
  
  
  const {
    data: interviewData,
    loading: interviewLoading,
    refresh: refreshInterview,
  } = useAdminInterviewAnalytics();

  const monthly = data.monthly_growth.map((m) => ({ label: m.month.slice(5), value: m.users }));
  const daily = data.daily_activity.map((d) => ({ label: d.day.slice(5), value: d.events }));
  const maxCategory = Math.max(1, ...data.popular_categories.map((c) => c.passed));
  const maxSkill = Math.max(1, ...data.popular_skills.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-brand-lg border border-brand-border bg-white px-5 sm:px-6 py-5 shadow-brand-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
              <BarChart3 className="w-3 h-3" /> Admin · Analytics
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Enterprise Analytics</h1>
            <p className="mt-1 text-sm text-slate-500 break-words">
              Server-aggregated KPIs updated in realtime. Last computed{' '}
              <span className="font-mono">{data.computed_at ? new Date(data.computed_at).toLocaleString() : '—'}</span>.
            </p>
          </div>
          <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {loading && !data.totals.total_users && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading analytics...</div>}

      {}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Users" value={data.totals.total_users} subLabel={`${data.totals.active_users.toLocaleString()} active`} color="bg-blue-500" icon={Users} />
        <KpiCard label="Verified Users" value={data.totals.verified_users} subLabel={`${data.totals.premium_users.toLocaleString()} premium`} color="bg-emerald-500" icon={UserCheck} />
        <KpiCard label="Skill Passports" value={data.totals.total_passports} subLabel={`${data.totals.active_passports.toLocaleString()} active`} color="bg-indigo-500" icon={ShieldCheck} />
        <KpiCard label="Pending Passports" value={data.totals.pending_passports} subLabel={`${data.totals.renewed_passports.toLocaleString()} renewed`} color="bg-amber-500" icon={ShieldCheck} />
      </div>

      {}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Assessments" value={data.totals.total_assessments} subLabel={`${data.totals.total_submissions.toLocaleString()} submissions`} color="bg-cyan-500" icon={ClipboardCheck} />
        <KpiCard label="Pass Rate" value={Math.round(rate * 100)} subLabel={`${data.totals.passed_verifications.toLocaleString()} passed / ${data.totals.failed_verifications.toLocaleString()} failed`} color="bg-fuchsia-500" icon={BarChart3} />
        <KpiCard label="Pending Review" value={data.totals.pending_verifications} subLabel="awaiting admin action" color="bg-orange-500" icon={ClipboardCheck} />
        <KpiCard label="Employer Verifications" value={data.totals.employer_verifications} subLabel={`${data.totals.verifications_24h.toLocaleString()} last 24h`} color="bg-violet-500" icon={ScanSearch} />
      </div>

      {}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Interview Analytics</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Aggregated from every SkillProof AI interview session. Powered by{' '}
                <span className="font-mono">fn_analytics_interview_overview</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshInterview()}
            disabled={interviewLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw size={12} className={interviewLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {}
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
          <KpiCard label="Total Interviews" value={interviewData.total_sessions} color="bg-indigo-500" icon={Bot} />
          <KpiCard label="Completed" value={interviewData.completed_count} subLabel={`${interviewData.total_unique_users.toLocaleString()} unique users`} color="bg-emerald-500" icon={ClipboardCheck} />
          <KpiCard label="Avg Score" value={interviewData.average_score != null ? Math.round(interviewData.average_score) : 0} subLabel="across completed sessions" color="bg-blue-500" icon={BarChart3} />
          <KpiCard
            label="Pass / Fail"
            value={interviewData.completed_count > 0
              ? Math.round((interviewData.pass_count / interviewData.completed_count) * 100)
              : 0}
            subLabel={`${interviewData.pass_count.toLocaleString()} pass · ${interviewData.fail_count.toLocaleString()} fail`}
            color="bg-fuchsia-500"
            icon={TrendingUp}
          />
        </div>

        {}
        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Category breakdown (completed)</h3>
            {interviewData.category_breakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No completed interviews yet.</p>
            ) : (
              <div className="space-y-2">
                {interviewData.category_breakdown
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((c, i) => {
                    const max = Math.max(1, ...interviewData.category_breakdown.map((x) => x.count));
                    return (
                      <Bar
                        key={`icat-${c.category_id ?? 'none'}-${i}`}
                        value={c.count}
                        max={max}
                        label={c.category_name}
                        color="bg-indigo-500"
                        subLabel={`avg ${c.avg_score != null ? Math.round(c.avg_score) : '—'}/100 · ${c.pass_count} pass`}
                      />
                    );
                  })}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Pass vs Fail (completed)</h3>
            <PassFailDonut
              pass={interviewData.pass_count}
              fail={interviewData.fail_count}
            />
            <p className="mt-3 text-center text-[11px] text-slate-500">
              Score ≥ 60 = Pass · Score &lt; 60 = Needs work
            </p>
          </div>
        </div>

        {}
        <div className="border-t border-slate-100 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Most selected categories</h3>
          {interviewData.most_selected_categories.length === 0 ? (
            <p className="text-sm text-slate-500">No interviews recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interviewData.most_selected_categories.map((c, i) => (
                    <tr key={`msc-${c.category_id ?? 'none'}-${i}`} className="bg-white">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{c.category_name}</td>
                      <td className="px-3 py-2 text-right font-mono font-extrabold text-indigo-700">{c.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {}
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
              <Bar key={`cat-${c.category_id ?? 'none'}-${i}`} value={c.passed} max={maxCategory} label={c.category_name || 'Uncategorized'} color="bg-indigo-500" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Most verified sub-categories</h2>
          <div className="space-y-2">
            {data.popular_skills.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {data.popular_skills.map((s, i) => (
              <Bar key={`sk-${s.skill_id ?? 'none'}-${i}`} value={s.count} max={maxSkill} label={s.skill_name || 'Unnamed'} color="bg-pink-500" />
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Categories" value={data.totals.total_categories} subLabel="active main categories" color="bg-teal-500" icon={FolderTree} />
        <KpiCard label="Skills" value={data.totals.total_skills} color="bg-emerald-500" icon={Layers} />
        <KpiCard label="Roadmaps" value={data.totals.total_roadmaps} subLabel={`${data.totals.published_roadmaps.toLocaleString()} published`} color="bg-purple-500" icon={Activity} />
        <KpiCard label="Active Jobs" value={data.totals.active_jobs} subLabel={`${data.totals.total_jobs.toLocaleString()} total`} color="bg-rose-500" icon={Briefcase} />
      </div>

      {}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Last 25 events written to the activity timeline.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">{data.recent_activity.length} events</span>
        </div>
        {data.recent_activity.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recent_activity.map((row) => (
              <li key={row.id} className="flex items-start gap-3 p-4 text-sm">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_COLORS[row.kind] ?? 'bg-slate-100 text-slate-700'}`}>{row.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{row.title}</p>
                  {row.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.description}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <p className="font-mono">{row.actor_email || row.actor_name || 'System'}</p>
                  <p>{new Date(row.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
