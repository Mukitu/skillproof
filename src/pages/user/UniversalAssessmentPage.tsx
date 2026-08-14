
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ClipboardCheck, ExternalLink, HelpCircle, Loader2, Lock, Send, Sparkles, X,
} from 'lucide-react';
import { listCategories, listSubCategories } from '../../services/taxonomy';
import {
  listMySkillVerificationSubmissions, listSkillVerificationTasks,
  submitSkillVerificationTask,
} from '../../services/skillVerification';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  Category, SkillVerificationMySubmission, SkillVerificationTask,
  SkillVerificationTaskStatus, SubCategory,
} from '../../types/database';

const STATUS_CLASS: Record<SkillVerificationTaskStatus, string> = {
  Draft: 'bg-amber-100 text-amber-700',
  Published: 'bg-emerald-100 text-emerald-700',
  Archived: 'bg-slate-200 text-slate-600',
};

export const UniversalAssessmentPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [tasks, setTasks] = useState<SkillVerificationTask[]>([]);
  const [mySubs, setMySubs] = useState<SkillVerificationMySubmission[]>([]);

  const [catId, setCatId] = useState('');
  const [subId, setSubId] = useState('');
  const [activeTask, setActiveTask] = useState<SkillVerificationTask | null>(null);
  const [answer, setAnswer] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState<'verify' | 'mine'>('verify');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredSubs = useMemo(() => subs.filter((sub) => sub.category_id === catId), [subs, catId]);

  const publishedTasks = useMemo(() => tasks.filter((task) => task.status === 'Published'), [tasks]);

  const mySubmissionForTask = useCallback(
    (taskId: string) => mySubs.find((sub) => sub.task_id === taskId) ?? null,
    [mySubs],
  );

  const loadTaxonomy = useCallback(async () => {
    try {
      const [categoriesResult, subResult] = await Promise.all([
        listCategories(),
        listSubCategories(),
      ]);
      setCategories(categoriesResult);
      setSubs(subResult);
    } catch (e: any) {
      setError(e?.message || 'Could not load taxonomy.');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!catId) { setTasks([]); return; }
    setLoadingTasks(true);
    try {
      const rows = await listSkillVerificationTasks({
        status: 'Published',
        categoryId: catId,
        subCategoryId: subId || undefined,
      });
      setTasks(rows);
    } catch (e: any) {
      setError(e?.message || 'Could not load verification tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, [catId, subId]);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const rows = await listMySkillVerificationSubmissions();
      setMySubs(rows);
    } catch (e: any) {
      setError(e?.message || 'Could not load your submissions.');
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => { void loadTaxonomy(); void loadMine(); }, [loadTaxonomy, loadMine]);
  useRealtimeRefresh('skill_verification_tasks', () => { void loadTasks(); void loadMine(); });
  useRealtimeRefresh('skill_verification_submissions', () => { void loadMine(); });
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  
  useEffect(() => {
    const existing = activeTask ? mySubmissionForTask(activeTask.id) : null;
    setAnswer(existing?.answer_text ?? '');
    setProjectUrl(existing?.project_url ?? '');
    setError('');
    setSuccess('');
  }, [activeTask, mySubmissionForTask]);

  const handleSelectTask = (task: SkillVerificationTask) => {
    setActiveTask(task);
    setTab('verify');
  };

  const handleSubmit = async () => {
    if (!activeTask) return;
    const trimmedAnswer = answer.trim();
    const trimmedUrl = projectUrl.trim();
    if (!trimmedAnswer && !trimmedUrl) {
      setError('Please provide either a code/text answer or a project URL.');
      return;
    }
    if (trimmedUrl && !/^https?:\/\//.test(trimmedUrl)) {
      setError('Project URL must start with http:// or https://');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await submitSkillVerificationTask(activeTask.id, trimmedAnswer, trimmedUrl || null);
      setSuccess('Submission sent for review. Track its status in the "My Verifications" tab.');
      setAnswer('');
      setProjectUrl('');
      await loadMine();
      setTab('mine');
    } catch (e: any) {
      setError(e?.message || 'Could not submit your answer.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
              <Sparkles className="w-3 h-3" /> Skill Verification
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Universal Skill Verification</h1>
            <p className="mt-1 text-sm text-slate-500 break-words">
              Pick a category, choose an admin-published verification task, and submit your answer.
            </p>
          </div>
          <SkillVerificationUserManualButton />
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="shrink-0" />{success}</div>}

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex items-center gap-2 border-b border-slate-200 overflow-x-auto overscroll-contain">
        <button onClick={() => setTab('verify')} className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold ${tab === 'verify' ? 'border-b-2 border-[#E31B23] text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Verify your skill</button>
        <button onClick={() => setTab('mine')} className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold ${tab === 'mine' ? 'border-b-2 border-[#E31B23] text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>My verifications ({mySubs.length})</button>
      </div>

      {tab === 'verify' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><Sparkles size={18} className="text-blue-600" /> 1. Select category</h2>
            <div className="space-y-3">
              <select value={catId} onChange={(event) => { setCatId(event.target.value); setSubId(''); setActiveTask(null); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <select value={subId} onChange={(event) => { setSubId(event.target.value); setActiveTask(null); }} disabled={!catId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
                <option value="">Select sub-category (optional)</option>
                {filteredSubs.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">2. Available verification tasks</h3>
              {!catId && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Select a category to see admin-published verification tasks.</p>}
              {catId && loadingTasks && <div className="flex items-center gap-2 p-3 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading tasks...</div>}
              {catId && !loadingTasks && publishedTasks.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No published verification tasks for this category yet.</p>}
              {catId && !loadingTasks && publishedTasks.length > 0 && (
                <ul className="space-y-2">
                  {publishedTasks.map((task) => {
                    const submitted = mySubmissionForTask(task.id);
                    const isActive = activeTask?.id === task.id;
                    return (
                      <li key={task.id}>
                        <button type="button" onClick={() => handleSelectTask(task)} className={`w-full rounded-lg border p-3 text-left transition ${isActive ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-900">{task.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[task.status]}`}>{task.status}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-slate-500">{task.description}</p>
                          {submitted && <p className="mt-2 text-[11px] font-semibold text-blue-700">Submitted · {submitted.status}{submitted.score != null ? ` · ${submitted.score}/10` : ''}</p>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            {!activeTask ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-slate-400">
                <ClipboardCheck size={48} className="text-slate-300" />
                <p className="mt-3 text-sm">Select a verification task to view the details and submit your answer.</p>
              </div>
            ) : (
              <TaskSubmissionPanel
                task={activeTask}
                existing={mySubmissionForTask(activeTask.id)}
                answer={answer}
                setAnswer={setAnswer}
                projectUrl={projectUrl}
                setProjectUrl={setProjectUrl}
                submitting={submitting}
                onSubmit={() => void handleSubmit()}
              />
            )}
          </div>
        </div>
      ) : (
        <MyVerificationsList loading={loadingMine} rows={mySubs} />
      )}
    </div>
  );
};

function TaskSubmissionPanel({ task, existing, answer, setAnswer, projectUrl, setProjectUrl, submitting, onSubmit }: {
  task: SkillVerificationTask;
  existing: SkillVerificationMySubmission | null;
  answer: string;
  setAnswer: (value: string) => void;
  projectUrl: string;
  setProjectUrl: (value: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const isLocked = !!existing && existing.status === 'Submitted';
  const isUnderReview = !!existing && existing.status === 'Under Review';
  const canResubmit = !!existing && (existing.status === 'Passed' || existing.status === 'Failed');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl break-words">{task.title}</h2>
          <p className="mt-1 text-xs text-slate-500 break-words">Max {task.max_marks} marks · Pass at {task.pass_marks}+</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[task.status]}`}>{task.status}</span>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Task description</h3>
        <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">{task.description}</p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Submission instructions</h3>
        <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">{task.submission_instructions}</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">নোট:</p>
        <p>
          যেকোনো ক্যাটাগরিতে (কোড, পিডিএফ, এক্সেল, জিপ ইত্যাদি) জমা দিতে পারবেন। ছোট কোড বা টেক্সট হলে নিচের টেক্সট বক্সে লিখুন। বড় প্রজেক্ট বা ফাইল হলে
          প্রথমে আপনার Google Drive-এ ফাইলটি আপলোড করে শেয়ার লিংক তৈরি করুন, তারপর সেই Google Drive লিংক অথবা GitHub রিপোজিটরি লিংক নিচের Project URL ফিল্ডে জমা দিন।
          অন্তত একটি ফিল্ড (টেক্সট অথবা URL) পূরণ করা আবশ্যক।
        </p>
      </div>

      {existing && (
        <div className={`rounded-lg border p-3 text-sm ${
          existing.status === 'Submitted' ? 'border-amber-200 bg-amber-50 text-amber-900'
            : existing.status === 'Under Review' ? 'border-blue-200 bg-blue-50 text-blue-900'
            : existing.status === 'Passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-red-200 bg-red-50 text-red-900'
        }`}>
          <p className="font-semibold">Previous submission · {existing.status}</p>
          {existing.score != null && <p>Score: {existing.score}/{task.max_marks}</p>}
          {existing.feedback && <p className="mt-1 whitespace-pre-line">Feedback: {existing.feedback}</p>}
          {isLocked && <p className="mt-1 text-xs">You can update your submission while it is in Submitted status.</p>}
          {isUnderReview && <p className="mt-1 text-xs">An admin is reviewing your submission. Updates are locked until the review completes.</p>}
          {canResubmit && <p className="mt-1 text-xs">You may submit a new attempt for this task.</p>}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Code / text answer <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={8}
          placeholder="Write or paste your answer here..."
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-slate-500">{answer.length} characters.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project URL <span className="font-normal text-slate-400">(optional)</span></label>
        <input
          value={projectUrl}
          onChange={(event) => setProjectUrl(event.target.value)}
          type="url"
          placeholder="https://github.com/your-name/your-project"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-slate-500">Submit a GitHub or Google Drive link for larger projects. You can fill either this field or the answer above — at least one is required.</p>
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><Lock size={16} /> Your previous submission is awaiting review. Updates will replace it.</div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting || (answer.trim().length === 0 && projectUrl.trim().length === 0)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : existing ? <><Send size={18} /> Resubmit answer</> : <><Send size={18} /> Submit for review</>}
      </button>
    </div>
  );
}

function MyVerificationsList({ loading, rows }: { loading: boolean; rows: SkillVerificationMySubmission[] }) {
  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading your submissions...</div>;
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">You have not submitted any verification task yet.</div>;
  return (
    <div className="space-y-3">
      {rows.map((submission) => {
        const max = submission.task_max_marks ?? 10;
        const pass = submission.task_pass_marks ?? 6;
        return (
          <div key={submission.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{submission.task_title || 'Untitled task'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{submission.category_name || 'Uncategorised'}</span>
                  {submission.sub_category_name && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{submission.sub_category_name}</span>}
                </div>
              </div>
              <StatusBadge status={submission.status} score={submission.score} max={max} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:grid-cols-4">
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400">Submitted</dt>
                <dd className="mt-0.5 text-slate-800">{new Date(submission.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400">Marks</dt>
                <dd className="mt-0.5 text-slate-800">{submission.score != null ? `${submission.score} / ${max}` : '—'}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400">Pass Marks</dt>
                <dd className="mt-0.5 text-slate-800">{pass} / {max}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-slate-400">Reviewed</dt>
                <dd className="mt-0.5 text-slate-800">{submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : '—'}</dd>
              </div>
            </dl>

            {submission.reviewed_by_full_name && (
              <p className="mt-2 text-xs text-slate-500">Reviewed by <span className="font-medium text-slate-700">{submission.reviewed_by_full_name}</span></p>
            )}

            {submission.feedback && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Feedback</p>
                <p className="mt-1 whitespace-pre-line text-slate-800">{submission.feedback}</p>
              </div>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">View your answer</summary>
              {submission.answer_text?.trim() ? (
                <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{submission.answer_text}</p>
              ) : (
                <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-500">No text answer was provided for this submission.</p>
              )}
              {submission.project_url && (
                <a href={submission.project_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ExternalLink size={14} /> {submission.project_url}</a>
              )}
            </details>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, score, max }: { status: SkillVerificationMySubmission['status']; score: number | null; max: number }) {
  const cls =
    status === 'Passed' ? 'bg-emerald-100 text-emerald-700'
      : status === 'Failed' ? 'bg-red-100 text-red-700'
      : status === 'Under Review' ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';
  const label = score != null && (status === 'Passed' || status === 'Failed')
    ? `${status} · ${score}/${max}`
    : status;
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default UniversalAssessmentPage;


// ============================================================================
// Skill Verification — animated User Manual popover (Bangla instructions)
// ============================================================================
function SkillVerificationUserManualButton() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'bottom' | 'top' }>({ top: 0, left: 0, placement: 'bottom' });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popW = 320;
    const popH = popoverRef.current?.offsetHeight ?? 220;
    const margin = 12;

    let left = rect.right - popW;
    if (left < margin) left = margin;
    if (left + popW > window.innerWidth - margin) left = window.innerWidth - popW - margin;

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + margin;
    let placement: 'bottom' | 'top' = 'bottom';
    if (spaceBelow < popH + margin && rect.top - popH - margin > margin) {
      top = rect.top - popH - margin;
      placement = 'top';
    }

    setPos({ top, left, placement });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div className="shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="User manual"
          aria-expanded={open}
          className="group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow-md ring-1 ring-orange-300/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 sm:text-sm"
        >
          <span className="absolute inset-0 -z-10 rounded-full bg-orange-300 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-60" />
          <span className="relative inline-flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
            <HelpCircle
              size={16}
              className="transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 sm:hidden"
            />
            <HelpCircle
              size={18}
              className="hidden transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 sm:block"
            />
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
          </span>
          <span className="hidden sm:inline">User Manual</span>
          <span className="inline sm:hidden">Manual</span>
        </button>
      </div>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="ব্যবহার নির্দেশিকা"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100] w-[min(20rem,calc(100vw-1.5rem))] animate-[fadeSlideIn_0.25s_ease-out] rounded-2xl border border-orange-200 bg-white/95 p-4 text-slate-800 shadow-2xl shadow-orange-900/20 backdrop-blur sm:w-80"
        >
          <span
            className={`absolute h-3 w-3 rotate-45 border-l border-t border-orange-200 bg-white/95 ${
              pos.placement === 'bottom' ? '-top-2 right-6' : '-bottom-2 right-6 border-b border-r border-l-0 border-t-0'
            }`}
          />
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow">
                <HelpCircle size={14} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">User Manual</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
          <ol className="space-y-2 text-xs leading-relaxed text-slate-700">
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">১</span>
              <span><span className="font-semibold text-slate-900">ক্যাটাগরি</span> সিলেক্ট করুন। চাইলে <span className="font-semibold text-slate-900">সাব-ক্যাটাগরি</span> ও সিলেক্ট করতে পারেন।</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">২</span>
              <span>আপনার পছন্দমতো যেকোনো <span className="font-semibold text-slate-900">টাস্কের উপরে ক্লিক</span> করুন — টাস্কটি সুন্দরভাবে পড়ুন।</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">৩</span>
              <span>যদি ছোট <span className="font-semibold text-slate-900">কোড বা উত্তর</span> জাতীয় কিছু চায়, তাহলে বক্সে লিখুন।</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">৪</span>
              <span>আর যদি <span className="font-semibold text-slate-900">প্রজেক্ট টাইপের</span> কিছু হয়, তাহলে <span className="font-semibold text-blue-600">GitHub</span>, <span className="font-semibold text-blue-600">Google Drive</span> বা অন্য যেকোনো <span className="font-semibold text-slate-900">বৈধ প্ল্যাটফর্মের লিংক</span> শেয়ার করুন।</span>
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] leading-relaxed text-rose-800">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">!</span>
            <span><span className="font-bold">সতর্কতা:</span> কোনো <span className="font-bold">ফিশিং/ভুয়া লিংক</span> শেয়ার করলে আপনার অ্যাকাউন্ট <span className="font-bold">সারাজীবনের জন্য সাসপেন্ড</span> করে দেওয়া হবে।</span>
          </div>
        </div>
      )}
    </>
  );
}
