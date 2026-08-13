
import { useCallback, useEffect, useMemo, useState, type FormEvent, type Key as ReactKey } from 'react';
import {
  AlertCircle, Award, CheckCircle2, ExternalLink, Loader2, Search,
} from 'lucide-react';
import {
  adminListModuleExamSubmissions, adminMarkModuleExamUnderReview,
  adminReviewModuleExam, type ListModuleExamSubmissionsFilter,
} from '../../services/roadmapExams';
import { listCategories } from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  Category, RoadmapModuleExamSubmissionStatus,
  RoadmapModuleExamSubmissionWithContext,
} from '../../types/database';

const STATUS_OPTIONS: Array<{ value: RoadmapModuleExamSubmissionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Passed', label: 'Passed' },
  { value: 'Failed', label: 'Failed' },
];

export default function AdminRoadmapModuleExamReviewPage() {
  const [submissions, setSubmissions] = useState<RoadmapModuleExamSubmissionWithContext[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<RoadmapModuleExamSubmissionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RoadmapModuleExamSubmissionWithContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filter: ListModuleExamSubmissionsFilter = useMemo(() => ({
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
  }), [status, search, categoryFilter]);

  const loadTaxonomy = useCallback(async () => {
    try { setCategories(await listCategories(true)); }
    catch (e: any) { setError(e?.message || 'Could not load categories.'); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminListModuleExamSubmissions(filter);
      setSubmissions(rows);
      setSelected((current) => current ? rows.find((row) => row.id === current.id) ?? null : null);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load exam submissions.');
    } finally {
      setLoading(false);
    }
    
  }, [filter.status, filter.search, filter.categoryId]);

  useEffect(() => { void loadTaxonomy(); }, [loadTaxonomy]);
  useEffect(() => { void load(); }, [load]);

  
  useRealtimeRefresh(
    ['roadmap_module_exam_submissions', 'roadmap_module_exams'],
    load,
  );

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === 'Pending Review' || s.status === 'Under Review').length,
    [submissions],
  );

  const review = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const marks = Number(form.get('marks'));
    const feedback = String(form.get('feedback') || '').trim();
    const decision = (form.get('decision') as 'Pass' | 'Fail' | null) || undefined;

    const maxMarks = selected.exam_max_marks ?? 100;
    if (!Number.isInteger(marks) || marks < 0 || marks > maxMarks) {
      setError(`Marks must be an integer between 0 and ${maxMarks}.`);
      return;
    }
    if (!feedback) {
      setError('Feedback is required.');
      return;
    }
    if (!decision) {
      // When the admin does not explicitly decide, derive a Pass/Fail from
      // the marks vs. exam_pass_marks so the submission moves out of
      // "Pending Review" instead of staying review-pending forever.
      // (No change here — backend uses marks vs. threshold automatically.)
    }

    setBusy(true); setError(''); setSuccess('');
    try {
      await adminReviewModuleExam({ submissionId: selected.id, marks, feedback, decision });
      const outcome = decision
        ? (decision === 'Pass' ? 'Passed' : 'Failed')
        : (marks >= (selected.exam_pass_marks ?? 6) ? 'Passed' : 'Failed');
      setSuccess(`Review saved. The submission is now ${outcome}.`);
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save review.');
    } finally {
      setBusy(false);
    }
  };

  const markUnderReview = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await adminMarkModuleExamUnderReview(selected.id);
      setSuccess('Submission marked as Under Review.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <Award className="text-amber-500" /> Roadmap Module Exam Review
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Grade user submissions for per-module roadmap exams. Each exam has its own pass marks and max marks.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pending in view: <span className="font-semibold">{pendingCount}</span>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="shrink-0" />{success}</div>}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user, roadmap or exam..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as RoadmapModuleExamSubmissionStatus | 'all')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {loading && <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading exam submissions...</div>}
      {!loading && !submissions.length && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No roadmap module exam submissions found.</div>}

      {!loading && !!submissions.length && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Roadmap / Day</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Answers</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((submission) => (
                  <SubmissionRow key={submission.id} submission={submission}
                    selected={selected?.id === submission.id}
                    onSelect={() => { setSelected(submission); setSuccess(''); setError(''); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!selected ? <p className="text-sm text-slate-500">Select a submission to review.</p>
          : <ReviewPanel submission={selected} busy={busy} onSubmit={review} onMarkUnderReview={() => void markUnderReview()} />}
      </div>
    </div>
  );
}

function SubmissionRow({ submission, selected, onSelect }: { submission: RoadmapModuleExamSubmissionWithContext; selected: boolean; onSelect: () => void; key?: ReactKey }) {
  const statusClass =
    submission.status === 'Passed' ? 'bg-emerald-100 text-emerald-700'
    : submission.status === 'Failed' ? 'bg-rose-100 text-rose-700'
    : submission.status === 'Under Review' ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700';
  const hasText = !!submission.answer_text?.trim();
  const hasUrl = !!submission.submission_url?.trim();
  const hasAny = hasText || hasUrl;
  return (
    <tr className={selected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}>
      <td className="max-w-[190px] px-4 py-3"><p className="truncate font-medium text-slate-900">{submission.user_full_name || 'Unnamed user'}</p><p className="truncate text-xs text-slate-500">{submission.user_email || '—'}</p></td>
      <td className="max-w-[220px] px-4 py-3">
        <p className="line-clamp-1 font-medium text-slate-800">{submission.roadmap_title || '—'}</p>
        <p className="text-[11px] text-slate-500">Day {submission.template_day_number}</p>
      </td>
      <td className="max-w-[210px] px-4 py-3 text-slate-700">
        <span className="line-clamp-2">{submission.exam_title || `Day ${submission.template_day_number} exam`}</span>
      </td>
      <td className="max-w-[230px] px-4 py-3 text-slate-600">
        <div className="space-y-1 text-xs">
          {hasText && <span className="line-clamp-2 block">Text answer supplied</span>}
          {hasUrl && <a href={submission.submission_url ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100"><ExternalLink size={10} /> URL</a>}
          {!hasAny && (
            <span className="italic text-slate-400">No content</span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(submission.submitted_at).toLocaleString()}</td>
      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>{submission.status}</span></td>
      <td className="px-4 py-3 font-semibold tabular-nums">{submission.marks ?? '—'}/{submission.exam_max_marks ?? '—'}</td>
      <td className="px-4 py-3"><button onClick={onSelect} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Review</button></td>
    </tr>
  );
}

function ReviewPanel({ submission, busy, onSubmit, onMarkUnderReview }: {
  submission: RoadmapModuleExamSubmissionWithContext;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMarkUnderReview: () => void;
}) {
  
  
  
  const canPickUp = submission.status === 'Pending Review' || submission.status === 'Under Review';
  const canReview = canPickUp;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Review module exam submission</h2>
          <p className="text-xs text-slate-500">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          Max: {submission.exam_max_marks ?? '—'} · Pass: {submission.exam_pass_marks ?? '—'}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="User" value={`${submission.user_full_name || 'Unnamed user'}${submission.user_email ? ` · ${submission.user_email}` : ''}`} />
        <Info label="Roadmap" value={`${submission.roadmap_title || '—'} · Day ${submission.template_day_number}`} />
        <Info label="Exam title" value={submission.exam_title || '—'} />
        <Info label="Current status" value={submission.status} />
        <Info label="Reviewed by" value={submission.reviewer_full_name || '—'} />
        <Info label="Reviewed at" value={submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : '—'} />
      </div>
      {submission.exam_instructions && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Exam instructions</h3>
          <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{submission.exam_instructions}</p>
        </div>
      )}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">User answer</h3>
        {submission.answer_text?.trim() ? (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-sm text-slate-100">{submission.answer_text}</pre>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-500">No text answer was provided.</p>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Submission URL</h3>
        {submission.submission_url?.trim() ? (
          <a href={submission.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 break-all rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100">
            <ExternalLink size={14} />
            {submission.submission_url}
          </a>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-500">No submission URL was provided.</p>
        )}
      </div>

      {canPickUp && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <p className="text-blue-900">Pick this submission up for review before scoring?</p>
          <button type="button" onClick={onMarkUnderReview} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submission.status === 'Under Review' ? 'Refresh Under Review' : 'Mark Under Review'}
          </button>
        </div>
      )}

      {canReview ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Marks (0–{submission.exam_max_marks ?? 100})
              <input name="marks" type="number" min={0} max={submission.exam_max_marks ?? 100} step={1} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium text-slate-700">Decision
              <select name="decision" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Auto from marks vs pass marks</option>
                <option value="Pass">Force Pass</option>
                <option value="Fail">Force Fail</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">Feedback (required)
            <textarea name="feedback" required minLength={1} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Explain the result and any improvements the user should make." />
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Saving review...</> : 'Save review'}
          </button>
        </form>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          This submission has already been reviewed. Open another submission from the list to continue.
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm text-slate-800">{value}</p></div>;
}