
import { useCallback, useEffect, useMemo, useState, type Key as ReactKey } from 'react';
import {
  AlertCircle, BookOpen, Calendar, CheckCircle2, ChevronRight, Clock,
  FileText, Loader2, MessageSquare, RefreshCw, ShieldCheck,
  Sparkles, Target, ThumbsDown, ThumbsUp, User as UserIcon, X, XCircle,
} from 'lucide-react';
import {
  getCompletionProgressDetail, getCompletionRoadmapTemplate,
  reviewRoadmapCompletionWithCertificate, useCompletionRequests,
} from '../../services/roadmapCompletion';
import { listUserActivity } from '../../services/activity';
import { useRealtimeRefresh } from '../../services/realtime';
import { getPublicCertificateUrl } from '../../utils/certificateUrl';
import type {
  ActivityEvent, CareerRoadmapEnrollment, RoadmapCompletionModuleProgress,
  RoadmapCompletionRequest, RoadmapCompletionRequestWithContext,
  RoadmapTemplate,
} from '../../types/database';

type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Rejected';

export default function AdminRoadmapCompletionReviewPage() {
  const { rows, loading, refresh } = useCompletionRequests();
  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [active, setActive] = useState<RoadmapCompletionRequestWithContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feedback, setFeedback] = useState('');

  
  const [template, setTemplate] = useState<RoadmapTemplate | null>(null);
  const [enrollment, setEnrollment] = useState<CareerRoadmapEnrollment | null>(null);
  const [modules, setModules] = useState<RoadmapCompletionModuleProgress[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [openModuleDay, setOpenModuleDay] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const arr = rows ?? [];
    if (filter === 'all') return arr;
    return arr.filter((r) => r.request_status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      all: all.length,
      Pending: all.filter((r) => r.request_status === 'Pending').length,
      Approved: all.filter((r) => r.request_status === 'Approved').length,
      Rejected: all.filter((r) => r.request_status === 'Rejected').length,
    };
  }, [rows]);

  const loadDetail = useCallback(async (activeId: string, userId: string) => {
    try {
      setError('');
      const { template: tplRow, enrollment: enrRow } = await getCompletionRoadmapTemplate(activeId);
      setTemplate(tplRow);
      setEnrollment(enrRow);
      if (enrRow) {
        const [modsRows, actsRows] = await Promise.all([
          getCompletionProgressDetail(enrRow.id),
          listUserActivity(userId, 30).catch(() => []),
        ]);
        setModules(modsRows);
        setActivity(actsRows);
      } else {
        setModules([]);
        setActivity([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load request details.');
    }
  }, []);

  
  useEffect(() => {
    if (!active) {
      setTemplate(null);
      setEnrollment(null);
      setModules([]);
      setActivity([]);
      setOpenModuleDay(null);
      setFeedback('');
      return;
    }
    let mounted = true;
    (async () => {
      await loadDetail(active.id, active.user_id);
    })();
    return () => { mounted = false; };
  }, [active, loadDetail]);

  
  useRealtimeRefresh(
    ['roadmap_completion_requests', 'career_roadmap_progress', 'career_roadmap_modules', 'career_roadmap_enrollment'],
    () => { if (active) void loadDetail(active.id, active.user_id); },
  );

  const decide = async (decision: 'approve' | 'reject') => {
    if (!active) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await reviewRoadmapCompletionWithCertificate(
        active.id, decision, feedback.trim() || undefined,
      );
      const updated = result.request;
      if (decision === 'approve') {
        const cred = result.certificate?.credential_number;
        const verifyUrl = result.certificate
          ? getPublicCertificateUrl(result.certificate.credential_number)
          : null;
        setSuccess(
          cred
            ? `Request approved. Course Completion Certificate issued: ${cred}.${verifyUrl ? ` Public page: ${verifyUrl}` : ''}`
            : 'Request approved, but the certificate could not be confirmed. Check debug_log / course_certificates.',
        );
      } else {
        setSuccess('Request rejected.');
      }
      setActive((cur) => cur ? { ...cur, ...updated } : cur);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Could not save decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roadmap Completion Review</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real Supabase-backed workflow · {counts.Pending} pending · {counts.Approved} approved · {counts.Rejected} rejected
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" /> {success}
        </div>
      )}

      {}
      <div className="flex flex-wrap gap-2">
        {(['Pending', 'Approved', 'Rejected', 'all'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'All' : f} <span className="ml-1 text-[10px] opacity-80">{counts[f === 'all' ? 'all' : f]}</span>
          </button>
        ))}
      </div>

      {}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Roadmap</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-center">Completion</th>
              <th className="px-4 py-3 text-center">Days</th>
              <th className="px-4 py-3 text-left">Requested</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  <Loader2 size={16} className="mx-auto mb-2 animate-spin" /> Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No completion requests in this view.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <CompletionRow
                  key={r.id}
                  row={r}
                  isActive={active?.id === r.id}
                  onOpen={() => setActive(r)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {}
      {active && (
        <CompletionDetailPanel
          row={active}
          template={template}
          enrollment={enrollment}
          modules={modules}
          activity={activity}
          openModuleDay={openModuleDay}
          setOpenModuleDay={setOpenModuleDay}
          busy={busy}
          feedback={feedback}
          setFeedback={setFeedback}
          onDecide={decide}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}




function CompletionRow({
  row, isActive, onOpen, key: _ignoredKey,
}: {
  row: RoadmapCompletionRequestWithContext;
  isActive: boolean;
  onOpen: () => void;
  key?: ReactKey;
}) {
  const pct = row.completion_percentage;
  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer border-t border-slate-100 transition ${
        isActive ? 'bg-red-50/50' : 'hover:bg-slate-50'
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {row.profile_avatar_url
            ? <img src={row.profile_avatar_url} alt={row.profile_full_name ?? 'user'} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
            : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-600 text-xs font-black text-white">
                {initials(row.profile_full_name || row.profile_email || '?')}
              </div>}
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">{row.profile_full_name || '—'}</div>
            <div className="truncate text-xs text-slate-500">{row.profile_email || ''}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {row.roadmap_thumbnail_url
            ? <img src={row.roadmap_thumbnail_url} alt={row.roadmap_title ?? ''} className="h-9 w-12 shrink-0 rounded object-cover ring-1 ring-slate-200" />
            : <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <BookOpen size={14} />
              </div>}
          <div className="min-w-0 truncate font-medium text-slate-800">{row.roadmap_title || '—'}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {row.category_name
          ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{row.category_name}</span>
          : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <CompletionPill pct={pct} />
      </td>
      <td className="px-4 py-3 text-center tabular-nums text-xs">
        {row.completed_days}/{row.total_days}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {new Date(row.requested_at).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={row.request_status} />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Review <ChevronRight size={12} />
        </button>
      </td>
    </tr>
  );
}




function CompletionDetailPanel({
  row, template, enrollment, modules, activity,
  openModuleDay, setOpenModuleDay,
  busy, feedback, setFeedback, onDecide, onClose,
}: {
  row: RoadmapCompletionRequestWithContext;
  template: RoadmapTemplate | null;
  enrollment: CareerRoadmapEnrollment | null;
  modules: RoadmapCompletionModuleProgress[];
  activity: ActivityEvent[];
  openModuleDay: number | null;
  setOpenModuleDay: (n: number | null) => void;
  busy: boolean;
  feedback: string;
  setFeedback: (s: string) => void;
  onDecide: (d: 'approve' | 'reject') => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'progress' | 'activity' | 'decision'>('progress');
  const pct = row.completion_percentage;
  const completedModules = modules.filter((m) => m.is_completed);
  const examModules = modules.filter((m) => m.has_exam);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {row.roadmap_thumbnail_url
              ? <img src={row.roadmap_thumbnail_url} alt={row.roadmap_title ?? ''} className="h-full w-full rounded-xl object-cover" />
              : <BookOpen size={24} />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reviewing · {new Date(row.requested_at).toLocaleString()}
            </p>
            <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{row.roadmap_title || 'Untitled roadmap'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {row.category_name && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{row.category_name}</span>}
              <span className="inline-flex items-center gap-1"><Calendar size={12} /> {row.completed_days}/{row.total_days} days</span>
              <span className="inline-flex items-center gap-1"><Sparkles size={12} /> {pct}% complete</span>
              {row.exams_total > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                  Exams {row.exams_passed}/{row.exams_total}
                </span>
              )}
              <StatusBadge status={row.request_status} />
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
          <X size={16} />
        </button>
      </div>

      {}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {row.profile_avatar_url
          ? <img src={row.profile_avatar_url} alt={row.profile_full_name ?? ''} className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-200" />
          : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-600 text-base font-black text-white">
              {initials(row.profile_full_name || row.profile_email || '?')}
            </div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <UserIcon size={14} /> {row.profile_full_name || '—'}
          </div>
          <div className="text-xs text-slate-500">{row.profile_email}</div>
          {enrollment && (
            <div className="mt-0.5 text-xs text-slate-500">
              Enrolled {new Date(enrollment.started_at).toLocaleDateString()} · status <span className="font-semibold">{enrollment.status}</span>
            </div>
          )}
        </div>
      </div>

      {}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap gap-1">
          {[
            { key: 'progress' as const, label: 'Full Progress', icon: <Target size={14} /> },
            { key: 'activity' as const, label: 'User Activity', icon: <FileText size={14} /> },
            { key: 'decision' as const, label: 'Review Form', icon: <ShieldCheck size={14} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                tab === t.key ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-2">
        {tab === 'progress' && (
          <ProgressTab
            modules={modules}
            completedModules={completedModules}
            examModules={examModules}
            openModuleDay={openModuleDay}
            setOpenModuleDay={setOpenModuleDay}
          />
        )}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'decision' && (
          <DecisionTab
            row={row}
            busy={busy}
            feedback={feedback}
            setFeedback={setFeedback}
            onDecide={onDecide}
          />
        )}
      </div>
    </div>
  );
}

function ProgressTab({
  modules, completedModules, examModules,
  openModuleDay, setOpenModuleDay,
}: {
  modules: RoadmapCompletionModuleProgress[];
  completedModules: RoadmapCompletionModuleProgress[];
  examModules: RoadmapCompletionModuleProgress[];
  openModuleDay: number | null;
  setOpenModuleDay: (n: number | null) => void;
}) {
  if (modules.length === 0) {
    return <Empty msg="No module data found for this enrollment." />;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <Stat label="Modules completed" value={`${completedModules.length} / ${modules.length}`} />
        <Stat label="Exam modules" value={`${examModules.length}`} />
        <Stat label="Exam modules passed" value={`${examModules.filter((m) => m.is_completed).length} / ${examModules.length}`} />
      </div>
      <ul className="space-y-2">
        {modules.map((m) => (
          <li key={m.module_id} className="overflow-hidden rounded-lg border border-slate-200">
            <button
              onClick={() => setOpenModuleDay(openModuleDay === m.day_number ? null : m.day_number)}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                m.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {m.is_completed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Day {m.day_number}</span>
                  {m.has_exam && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Exam</span>}
                  {m.is_completed && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Completed</span>}
                </div>
                <div className="truncate text-sm font-semibold text-slate-800">{m.title}</div>
              </div>
              <ChevronRight size={14} className={`text-slate-400 transition ${openModuleDay === m.day_number ? 'rotate-90' : ''}`} />
            </button>
            {openModuleDay === m.day_number && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 text-xs">
                {m.description && <p className="mb-2 whitespace-pre-line text-slate-700">{m.description}</p>}
                <div className="grid gap-2 sm:grid-cols-3">
                  <Info label="Estimated time" value={`${m.estimated_minutes} min`} />
                  <Info label="Completed at" value={m.completed_at ? new Date(m.completed_at).toLocaleString() : '—'} />
                  <Info label="Unlocked at" value={m.unlocked_at ? new Date(m.unlocked_at).toLocaleString() : '—'} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEvent[] }) {
  if (activity.length === 0) {
    return <Empty msg="No activity recorded yet for this user." />;
  }
  return (
    <ol className="space-y-2">
      {activity.map((e) => (
        <li key={e.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <FileText size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{e.title}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">{e.kind}</span>
            </div>
            {e.description && <p className="mt-0.5 text-slate-700">{e.description}</p>}
            <div className="mt-0.5 text-[10px] text-slate-500">{new Date(e.created_at).toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DecisionTab({
  row, busy, feedback, setFeedback, onDecide,
}: {
  row: RoadmapCompletionRequest;
  busy: boolean;
  feedback: string;
  setFeedback: (s: string) => void;
  onDecide: (d: 'approve' | 'reject') => void;
}) {
  const isPending = row.request_status === 'Pending';
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p><strong>Completion:</strong> {row.completion_percentage}% ({row.completed_days}/{row.total_days} days)</p>
        <p><strong>Exams:</strong> {row.exams_passed}/{row.exams_total}</p>
        <p><strong>Requested at:</strong> {new Date(row.requested_at).toLocaleString()}</p>
        {row.reviewed_at && (
          <p><strong>Reviewed at:</strong> {new Date(row.reviewed_at).toLocaleString()}</p>
        )}
        {row.reviewer_id && <p><strong>Reviewer:</strong> {row.reviewer_id}</p>}
      </div>
      {!isPending ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
          <p className="font-semibold">
            Decision: <span className={row.request_status === 'Approved' ? 'text-emerald-700' : 'text-rose-700'}>{row.request_status}</span>
          </p>
          {row.feedback && (
            <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 italic">"{row.feedback}"</p>
          )}
          <p className="mt-2 text-[10px] text-slate-500">
            This request has already been decided and cannot be changed again.
          </p>
        </div>
      ) : (
        <>
          <label className="block text-sm font-semibold text-slate-700">
            Feedback (optional)
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Leave a short note that will be shown to the user."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => onDecide('approve')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <ThumbsUp size={14} /> Approve & trigger certificate
            </button>
            <button
              disabled={busy}
              onClick={() => onDecide('reject')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <ThumbsDown size={14} /> Reject
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            <MessageSquare size={11} className="mr-0.5 inline" />
            Approval automatically issues a verified Course Completion Certificate (with a
            globally-unique credential number and a public verification page). The user
            is notified instantly.
          </p>
        </>
      )}
    </div>
  );
}




function StatusBadge({ status }: { status: 'Pending' | 'Approved' | 'Rejected' }) {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-rose-100 text-rose-800',
  } as const;
  const icons = {
    Pending: <Clock size={10} className="mr-1 inline" />,
    Approved: <CheckCircle2 size={10} className="mr-1 inline" />,
    Rejected: <XCircle size={10} className="mr-1 inline" />,
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {icons[status]} {status}
    </span>
  );
}

function CompletionPill({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="tabular-nums text-[11px] font-semibold text-slate-700">{pct}%</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{msg}</p>;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
}