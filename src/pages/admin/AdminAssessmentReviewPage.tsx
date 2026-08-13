import { useCallback, useEffect, useMemo, useState, type FormEvent, type Key as ReactKey } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Search } from 'lucide-react';
import {
  adminListSkillVerificationSubmissions,
  adminMarkSubmissionUnderReview,
  adminReviewSkillVerificationSubmission,
} from '../../services/skillVerification';
import { listCategories, listSubCategories } from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  Category, SkillVerificationSubmissionStatus,
  SkillVerificationSubmissionWithContext, SubCategory,
} from '../../types/database';

const STATUS_OPTIONS: Array<{ value: SkillVerificationSubmissionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Passed', label: 'Passed' },
  { value: 'Failed', label: 'Failed' },
];

export default function AdminAssessmentReviewPage() {
  const [submissions, setSubmissions] = useState<SkillVerificationSubmissionWithContext[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [status, setStatus] = useState<SkillVerificationSubmissionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SkillVerificationSubmissionWithContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTaxonomy = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([listCategories(true), listSubCategories(undefined, true)]);
      setCategories(c);
      setSubs(s);
    } catch (e: any) {
      setError(e?.message || 'Could not load categories.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminListSkillVerificationSubmissions({
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        subCategoryId: subFilter === 'all' ? undefined : subFilter,
      });
      setSubmissions(rows);
      setError('');
      setSelected((current) => current ? rows.find((row) => row.id === current.id) ?? null : null);
    } catch (e: any) {
      setError(e?.message || 'Could not load verification submissions.');
    } finally {
      setLoading(false);
    }
  }, [search, status, categoryFilter, subFilter]);

  useEffect(() => { void loadTaxonomy(); }, [loadTaxonomy]);
  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('skill_verification_submissions', load);

  const filteredSubs = useMemo(
    () => categoryFilter === 'all' ? subs : subs.filter((s) => s.category_id === categoryFilter),
    [subs, categoryFilter],
  );

  const pendingCount = useMemo(
    () => submissions.filter((submission) =>
      submission.status === 'Submitted' || submission.status === 'Under Review',
    ).length,
    [submissions],
  );

  const review = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const score = Number(form.get('score'));
    const feedback = String(form.get('feedback') || '').trim();

    const maxScore = selected.task_max_marks ?? 10;
    const passScore = selected.task_pass_marks ?? 6;
    if (!Number.isInteger(score) || score < 0 || score > maxScore) {
      setError(`Score must be an integer between 0 and ${maxScore}.`);
      return;
    }
    if (!feedback) {
      setError('Feedback is required.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    const reviewedId = selected.id;
    try {
      await adminReviewSkillVerificationSubmission(reviewedId, score, feedback);
      const outcome = score >= passScore ? 'Passed' : 'Failed';
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
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminMarkSubmissionUnderReview(selected.id);
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
          <h1 className="text-3xl font-bold text-gray-900">Universal Assessment Review</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review user-submitted skill verification tasks and assign a score out of 10.
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
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user or task..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setSubFilter('all'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">All main categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subFilter} onChange={(event) => setSubFilter(event.target.value)} disabled={categoryFilter === 'all'} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
          <option value="all">All sub-categories</option>
          {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as SkillVerificationSubmissionStatus | 'all')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {loading && <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading submissions...</div>}
      {!loading && !submissions.length && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No skill verification submissions found.</div>}

      {!loading && !!submissions.length && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Answer</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((submission) => <SubmissionRow key={submission.id} submission={submission} selected={selected?.id === submission.id} onSelect={() => { setSelected(submission); setSuccess(''); setError(''); }} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!selected ? <p className="text-sm text-slate-500">Select a submission to review.</p> : <ReviewPanel submission={selected} busy={busy} onSubmit={review} onMarkUnderReview={() => void markUnderReview()} />}
      </div>
    </div>
  );
}

function SubmissionRow({ submission, selected, onSelect }: { submission: SkillVerificationSubmissionWithContext; selected: boolean; onSelect: () => void; key?: ReactKey }) {
  const statusClass =
    submission.status === 'Passed' ? 'bg-emerald-100 text-emerald-700'
      : submission.status === 'Failed' ? 'bg-red-100 text-red-700'
      : submission.status === 'Under Review' ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';
  return (
    <tr className={selected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}>
      <td className="max-w-[190px] px-4 py-3"><p className="truncate font-medium text-slate-900">{submission.user_full_name || 'Unnamed user'}</p><p className="truncate text-xs text-slate-500">{submission.user_email || '—'}</p></td>
      <td className="px-4 py-3"><div className="flex flex-col gap-0.5 text-xs"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{submission.category_name || '—'}</span>{submission.sub_category_name && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{submission.sub_category_name}</span>}</div></td>
      <td className="max-w-[210px] px-4 py-3 font-medium text-slate-800"><span className="line-clamp-2">{submission.task_title || 'Untitled task'}</span></td>
      <td className="max-w-[230px] px-4 py-3 text-slate-600"><span className="line-clamp-2">{submission.answer_text?.trim() ? submission.answer_text : <span className="italic text-slate-400">URL only</span>}</span></td>
      <td className="px-4 py-3">{submission.project_url ? <a href={submission.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"><ExternalLink size={12} /> Open link</a> : <span className="text-slate-400">—</span>}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(submission.created_at).toLocaleString()}</td>
      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>{submission.status}</span></td>
      <td className="px-4 py-3 font-semibold tabular-nums">{submission.score ?? '—'}/10</td>
      <td className="px-4 py-3"><button onClick={onSelect} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Review</button></td>
    </tr>
  );
}

function ReviewPanel({ submission, busy, onSubmit, onMarkUnderReview }: {
  submission: SkillVerificationSubmissionWithContext;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMarkUnderReview: () => void;
}) {
  const canMarkUnderReview = submission.status === 'Submitted';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">Review submission</h2><p className="text-xs text-slate-500">Submitted {new Date(submission.created_at).toLocaleString()}</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Task max: {submission.task_max_marks ?? 10} · Pass: {submission.task_pass_marks ?? 6}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="User" value={`${submission.user_full_name || 'Unnamed user'}${submission.user_email ? ` · ${submission.user_email}` : ''}`} />
        <Info label="Category / sub-category" value={`${submission.category_name || '—'}${submission.sub_category_name ? ` · ${submission.sub_category_name}` : ''}`} />
        <Info label="Task title" value={submission.task_title || '—'} />
        <Info label="Current status" value={submission.status} />
        <Info label="Reviewed by" value={submission.reviewed_by_full_name || '—'} />
        <Info label="Reviewed at" value={submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : '—'} />
      </div>
      <div><h3 className="mb-1 text-sm font-semibold text-slate-700">Original task</h3><p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{submission.task_description || 'No description.'}</p></div>
      <div><h3 className="mb-1 text-sm font-semibold text-slate-700">User answer</h3>{submission.answer_text?.trim() ? (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-sm text-slate-100">{submission.answer_text}</pre>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-500">No text answer was provided. The user submitted only a project link.</p>
      )}</div>
      {submission.project_url && <div><h3 className="mb-1 text-sm font-semibold text-slate-700">Submitted project link</h3><a href={submission.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 break-all text-sm text-blue-600 hover:underline"><ExternalLink size={14} />{submission.project_url}</a></div>}

      {canMarkUnderReview && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <p className="text-blue-900">Pick this submission up for review before scoring?</p>
          <button type="button" onClick={onMarkUnderReview} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">Mark Under Review</button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Score (0–10)<input name="score" type="number" min={0} max={10} step={1} required defaultValue={submission.score ?? ''} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Scores <strong>6–10</strong> are automatically marked Passed. Scores <strong>0–5</strong> are marked Failed.</div>
        </div>
        <label className="block text-sm font-medium text-slate-700">Feedback (required)<textarea name="feedback" required minLength={1} defaultValue={submission.feedback || ''} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Explain the result and any improvements the user should make." /></label>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? <><Loader2 size={16} className="animate-spin" /> Saving review...</> : 'Save review'}</button>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm text-slate-800">{value}</p></div>; }
