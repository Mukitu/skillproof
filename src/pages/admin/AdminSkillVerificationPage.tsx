/**
 * Admin Universal Skill Verification Manager.
 *
 * Mirrors `AdminRoadmapTemplatesPage.tsx`:
 *   * List view with search + status filter.
 *   * TaskCard with category / sub-category badges and
 *     publish / edit / delete actions.
 *   * EditorView with the canonical SelectField / TextField / TextAreaField
 *     pattern and `whitespace-pre-line` description.
 *   * DeleteTaskModal with the same preflight + cascade confirmation as
 *     `DeleteRoadmapModal`. Never surfaces raw PostgreSQL errors.
 *
 * Marks per the spec are fixed: max=10, pass=6. These are surfaced as
 * read-only badges so admins understand the scoring rules.
 */
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { Key as ReactKey } from 'react';
import {
  AlertCircle, ArrowLeft, Check, ClipboardCheck, Copy, Download, Edit, Eye, EyeOff,
  FileJson, Info, Loader2, Plus, Save, Search, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import {
  adminCreateSkillVerificationTask, adminDeleteSkillVerificationTask,
  adminImportSkillVerificationJson, adminPublishSkillVerificationTask,
  adminSkillVerificationTaskStats, adminUpdateSkillVerificationTask,
  buildSkillVerificationExportJson,
  listSkillVerificationTasks,
} from '../../services/skillVerification';
import type {
  SkillVerificationDeleteResult, SkillVerificationTaskStats,
} from '../../services/skillVerification';
import { listCategories, listSubCategories } from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  Category, SkillVerificationTask, SkillVerificationTaskStatus, SubCategory,
} from '../../types/database';
import {
  VERIFICATION_TASK_FIELDS, VERIFICATION_TASK_JSON_TEMPLATE, validateVerificationTasks,
  type ValidationResult,
} from '../../components/admin/verificationJsonTemplate';

type View = 'list' | 'create' | 'edit';

const MAX_MARKS = 10;
const PASS_MARKS = 6;

export default function AdminSkillVerificationPage() {
  const [view, setView] = useState<View>('list');
  const [tasks, setTasks] = useState<SkillVerificationTask[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SkillVerificationTaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SkillVerificationTask | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showJsonFormat, setShowJsonFormat] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, s] = await Promise.all([
        listSkillVerificationTasks(),
        listCategories(true),
        listSubCategories(undefined, true),
      ]);
      setTasks(t);
      setCategories(c);
      setSubs(s);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load verification tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = () => {
    try {
      const payload = buildSkillVerificationExportJson(tasks);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `skill-verification-tasks-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not export verification tasks.');
    }
  };

  useEffect(() => { void reload(); }, [reload]);
  useRealtimeRefresh(['skill_verification_tasks', 'skill_verification_submissions'], reload);

  const filteredSubs = useMemo(
    () => categoryFilter === 'all' ? subs : subs.filter((s) => s.category_id === categoryFilter),
    [subs, categoryFilter],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
      if (subFilter !== 'all' && t.sub_category_id !== subFilter) return false;
      return !s || t.title.toLowerCase().includes(s);
    });
  }, [tasks, statusFilter, categoryFilter, subFilter, search]);

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6">
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <EditorView
          mode={view}
          task={editing}
          categories={categories}
          subCategories={subs}
          saving={saving}
          onCancel={() => { setView('list'); setEditing(null); setError(''); }}
          onSaved={() => { setView('list'); setEditing(null); void reload(); }}
          onError={setError}
          setSaving={setSaving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Skill Verification Manager</h1>
          <p className="text-sm text-slate-500">
            Create, edit and publish admin-authored skill verification tasks.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            onClick={() => setShowJsonFormat(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Info size={15} /> View JSON Format
          </button>
          <button
            onClick={() => setShowJsonImport(true)}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <FileJson size={15} /> Bulk JSON Import
          </button>
          <button
            onClick={handleExport}
            disabled={!tasks.length}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} /> Export JSON
          </button>
          <button
            onClick={() => { setEditing(null); setView('create'); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Manual task
          </button>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search verification tasks by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setSubFilter('all'); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All main categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value)}
          disabled={categoryFilter === 'all'}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
        >
          <option value="all">All sub-categories</option>
          {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SkillVerificationTaskStatus | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading tasks...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ClipboardCheck size={28} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            No verification tasks yet. Create your first one.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              categories={categories}
              subCategories={subs}
              onEdit={() => { setEditing(t); setView('edit'); }}
              onRefresh={reload}
              saving={saving}
            />
          ))}
        </div>
      )}

      {showJsonFormat && <VerificationJsonFormatModal onClose={() => setShowJsonFormat(false)} />}
      {showJsonImport && (
        <VerificationJsonImportModal
          categories={categories}
          subCategories={subs}
          existingTasks={tasks}
          onClose={() => setShowJsonImport(false)}
          onImported={async () => { setShowJsonImport(false); await reload(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ============================================================================
// TaskCard
// ============================================================================
function TaskCard({
  task: t, categories, subCategories, onEdit, onRefresh, saving,
}: {
  task: SkillVerificationTask;
  categories: Category[];
  subCategories: SubCategory[];
  onEdit: () => void;
  onRefresh: () => Promise<void>;
  saving: boolean;
  key?: ReactKey;
}) {
  const category = categories.find((c) => c.id === t.category_id);
  const sub = subCategories.find((s) => s.id === t.sub_category_id);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const togglePublish = async () => {
    setBusy(true);
    try {
      await adminPublishSkillVerificationTask(t.id, t.status !== 'Published');
      await onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const statusCls =
    t.status === 'Published'
      ? 'bg-emerald-100 text-emerald-700'
      : t.status === 'Draft'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-200 text-slate-600';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
        <ClipboardCheck size={28} className="text-white/80" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{t.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusCls}`}>{t.status}</span>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          {category && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{category.name}</span>}
          {sub && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{sub.name}</span>}
        </div>

        <div className="whitespace-pre-line text-xs text-slate-500 line-clamp-3">{t.description}</div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5">
            <Sparkles size={12} /> Pass {PASS_MARKS}/{MAX_MARKS}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onEdit}
            disabled={busy || saving}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <Edit size={12} /> Edit
          </button>
          <button
            onClick={togglePublish}
            disabled={busy || saving}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            {t.status === 'Published'
              ? <><EyeOff size={12} /> Unpublish</>
              : <><Eye size={12} /> Publish</>}
          </button>
          <button
            onClick={() => setDeleting(true)}
            disabled={busy || saving}
            className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            title="Delete task"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {deleting && (
        <DeleteTaskModal
          task={t}
          onClose={() => setDeleting(false)}
          onDeleted={async () => { setDeleting(false); await onRefresh(); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// DeleteTaskModal
// ============================================================================
function DeleteTaskModal({
  task,
  onClose,
  onDeleted,
}: {
  task: SkillVerificationTask;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const [stats, setStats] = useState<SkillVerificationTaskStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [cascade, setCascade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await adminSkillVerificationTaskStats(task.id);
        if (!cancelled) {
          setStats(s);
          setCascade(false);
        }
      } catch (e: any) {
        if (!cancelled) setStatsError(e?.message || 'Could not load dependent counts.');
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => { cancelled = true; };
  }, [task.id]);

  const hasDependents = !!stats?.has_dependents;
  const canDelete = !busy && !loadingStats && (!hasDependents || cascade);

  const submit = async () => {
    if (!canDelete) return;
    setBusy(true);
    setResultMsg(null);
    try {
      const result: SkillVerificationDeleteResult =
        await adminDeleteSkillVerificationTask(task.id, cascade);
      if (result.ok) {
        const d = result.deleted;
        const summary = d
          ? `Removed ${d.submissions} submission${d.submissions === 1 ? '' : 's'} for "${task.title}".`
          : `Removed "${task.title}".`;
        setResultMsg({ kind: 'success', text: summary });
        await onDeleted();
      } else if (result.blocked) {
        setResultMsg({
          kind: 'error',
          text: result.error || 'Cannot delete task because it has submissions. Enable cascade to proceed.',
        });
        setCascade(true);
      } else {
        setResultMsg({ kind: 'error', text: result.error || 'Could not delete task.' });
      }
    } catch (e: any) {
      setResultMsg({ kind: 'error', text: e?.message || 'Unexpected error.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Trash2 size={18} className="text-red-600" /> Delete verification task
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              "{task.title}" — this action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loadingStats && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Checking dependent records...
            </div>
          )}

          {statsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {statsError}
            </div>
          )}

          {stats && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-700">Dependent records</div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>User submissions: <span className="font-semibold">{stats.dependents.submissions}</span></li>
              </ul>
            </div>
          )}

          {stats && hasDependents && (
            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={cascade}
                  onChange={(event) => setCascade(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  <span className="font-semibold">Cascade delete</span> — permanently remove every user submission for this task. This cannot be undone.
                </span>
              </label>
              {!cascade && (
                <p className="text-xs text-slate-500">
                  Enable cascade to allow deletion. Submissions will be lost.
                </p>
              )}
            </div>
          )}

          {resultMsg && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                resultMsg.kind === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {resultMsg.text}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {hasDependents ? (cascade ? 'Cascade delete' : 'Cascade required') : 'Delete task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EditorView
// ============================================================================
function EditorView({
  mode, task, categories, subCategories, saving,
  onCancel, onSaved, onError, setSaving,
}: {
  mode: View;
  task: SkillVerificationTask | null;
  categories: Category[];
  subCategories: SubCategory[];
  saving: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  setSaving: (saving: boolean) => void;
}) {
  const [categoryId, setCategoryId] = useState(task?.category_id ?? '');
  const [subCategoryId, setSubCategoryId] = useState(task?.sub_category_id ?? '');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [submissionInstructions, setSubmissionInstructions] = useState(task?.submission_instructions ?? '');
  const [status, setStatus] = useState<SkillVerificationTaskStatus>(task?.status ?? 'Draft');
  const [savedId, setSavedId] = useState<string | null>(task?.id ?? null);

  useEffect(() => {
    if (mode === 'edit' && task) {
      setSavedId(task.id);
      setCategoryId(task.category_id);
      setSubCategoryId(task.sub_category_id ?? '');
      setTitle(task.title);
      setDescription(task.description);
      setSubmissionInstructions(task.submission_instructions);
      setStatus(task.status);
    }
    if (mode === 'create') {
      setSavedId(null);
      setCategoryId('');
      setSubCategoryId('');
      setTitle('');
      setDescription('');
      setSubmissionInstructions('');
      setStatus('Draft');
    }
  }, [mode, task]);

  const filteredSubs = useMemo(
    () => subCategories.filter((s) => s.category_id === categoryId),
    [subCategories, categoryId],
  );
  useEffect(() => {
    if (subCategoryId && !filteredSubs.some((s) => s.id === subCategoryId)) {
      setSubCategoryId('');
    }
  }, [subCategoryId, filteredSubs]);

  const canSave =
    !!categoryId &&
    !!title.trim() &&
    description.trim().length >= 10 &&
    submissionInstructions.trim().length >= 10;

  const onChangeFile = (_e: ChangeEvent<HTMLInputElement>) => { /* no file uploads here */ };

  const save = async () => {
    if (!canSave) {
      onError('Main category, title (min 3 chars), description (min 10 chars) and submission instructions (min 10 chars) are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category_id: categoryId,
        sub_category_id: subCategoryId || null,
        title: title.trim(),
        description: description.trim(),
        submission_instructions: submissionInstructions.trim(),
        status,
      };
      const saved = mode === 'create'
        ? await adminCreateSkillVerificationTask(payload)
        : await adminUpdateSkillVerificationTask(savedId!, payload);
      setSavedId(saved.id);
      onError('');
      if (mode === 'create') {
        onSaved();
      } else {
        onSaved();
      }
    } catch (e: any) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to list
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">1</span>
          Verification task
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Main category *" value={categoryId} onChange={setCategoryId}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>

          <SelectField label="Sub category (optional)" value={subCategoryId} onChange={setSubCategoryId} disabled={!categoryId}>
            <option value="">None</option>
            {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectField>

          <SelectField label="Status" value={status} onChange={(v) => setStatus(v as SkillVerificationTaskStatus)}>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </SelectField>

          <TextField
            label="Task title *"
            value={title}
            onChange={setTitle}
            placeholder="Build a responsive landing page"
            full
          />

          <div className="sm:col-span-2">
            <TextAreaField
              label="Task description *"
              value={description}
              onChange={setDescription}
              full
              rows={5}
              hint="Markdown-style text is supported; rendered with whitespace preserved."
            />
          </div>

          <div className="sm:col-span-2">
            <TextAreaField
              label="Submission instructions *"
              value={submissionInstructions}
              onChange={setSubmissionInstructions}
              full
              rows={4}
              hint="Tell users how to submit (small code → text box, larger project → link)."
            />
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="font-semibold text-emerald-800">Maximum Marks</div>
              <div className="text-2xl font-bold text-emerald-700">{MAX_MARKS}</div>
              <div className="text-xs text-emerald-700">Fixed by the verification system.</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <div className="font-semibold text-blue-800">Pass Marks</div>
              <div className="text-2xl font-bold text-blue-700">{PASS_MARKS}</div>
              <div className="text-xs text-blue-700">Score ≥ {PASS_MARKS} → Passed. Below → Failed.</div>
            </div>
          </div>

          {/* Hidden file input kept so a future thumbnail field is trivial to add. */}
          <input type="file" className="hidden" onChange={onChangeFile} />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void save()}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === 'create' ? 'Create task' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Field components (shared with the roadmap page)
// ============================================================================
function SelectField({
  label, value, onChange, disabled, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: any;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  );
}

function TextField({
  label, value, onChange, placeholder, full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextAreaField({
  label, value, onChange, full, rows, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 3}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ============================================================================
// JSON Format modal (schema viewer + template copy)
// ============================================================================
function VerificationJsonFormatModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(VERIFICATION_TASK_JSON_TEMPLATE);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = VERIFICATION_TASK_JSON_TEMPLATE;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Info size={18} className="text-blue-600" /> Skill Verification JSON Format
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              One official flat task schema. The selected category and sub-category come from the import header — JSON never carries per-task UUIDs. The importer validates against this same template.
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Complete JSON template</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? <><Check size={12} className="text-emerald-600" /> Copied</> : <><Copy size={12} /> Copy JSON Template</>}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-4 text-xs leading-5 text-slate-100">
              {VERIFICATION_TASK_JSON_TEMPLATE}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Field reference</h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Required</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VERIFICATION_TASK_FIELDS.map((field) => (
                    <tr key={field.key}>
                      <td className="px-3 py-2 font-mono text-slate-800">{field.key}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${field.required ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {field.type === 'enum' && field.enum ? `${field.enum.join(' / ')}` : field.type}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{field.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// JSON Import modal (category/subcategory header + validate + preview + import)
// ============================================================================
function VerificationJsonImportModal({
  categories, subCategories, existingTasks, onClose, onImported, onError,
}: {
  categories: Category[];
  subCategories: SubCategory[];
  existingTasks?: SkillVerificationTask[];
  onClose: () => void;
  onImported: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [text, setText] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [summary, setSummary] = useState<{ inserted: number; failed: number; total: number } | null>(null);

  const filteredSubs = useMemo(() => subCategories.filter((s) => s.category_id === categoryId), [subCategories, categoryId]);

  const existingTaskTitles = useMemo(
    () => new Set(
      (existingTasks ?? [])
        .filter((t) => t.category_id === categoryId && (subCategoryId ? t.sub_category_id === subCategoryId : true))
        .map((t) => t.title.toLowerCase().trim()),
    ),
    [existingTasks, categoryId, subCategoryId],
  );

  useEffect(() => {
    if (subCategoryId && !filteredSubs.some((s) => s.id === subCategoryId)) setSubCategoryId('');
  }, [filteredSubs, subCategoryId]);

  useEffect(() => {
    if (!text.trim()) { setValidation(null); return; }
    setValidation(validateVerificationTasks(text, { existingTaskTitles }));
  }, [text, existingTaskTitles]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setText(await file.text()); }
    catch (e: any) { setServerMsg({ kind: 'error', text: `Could not read file: ${e.message || 'unknown error'}` }); }
    finally { event.target.value = ''; }
  };

  const handleImport = async () => {
    if (!validation?.ok || !categoryId) return;
    setBusy(true); setServerMsg(null); setSummary(null);
    let payload: any;
    try {
      payload = JSON.parse(text);
      const result = await adminImportSkillVerificationJson(payload, categoryId, subCategoryId || null);
      setSummary({ inserted: result.inserted, failed: result.failed, total: result.total });
      setServerMsg({ kind: 'success', text: `Imported ${result.inserted} task${result.inserted === 1 ? '' : 's'} successfully. All records were committed atomically.` });
      window.setTimeout(() => { void onImported(); }, 1000);
    } catch (e: any) {
      const message = e?.message || 'Could not import verification tasks.';
      setServerMsg({ kind: 'error', text: message });
      onError(message);
    } finally { setBusy(false); }
  };

  const canImport = !!categoryId && !!validation?.ok && !busy;
  const invalidRows = validation?.rows.filter((r) => r.status === 'invalid') ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FileJson size={18} className="text-indigo-600" /> Bulk Task JSON Import</h2>
            <p className="mt-0.5 text-xs text-slate-500">Upload one JSON file containing many tasks. The selected category and sub-category are applied to every task — do not write UUIDs inside the JSON.</p>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-slate-700">Main category *</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-slate-700">Sub category (optional)</label><select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)} disabled={!categoryId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50"><option value="">All sub-categories</option>{filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">JSON file or pasted text</label>
            <div className="flex items-center gap-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Upload size={14} /> Choose file<input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" /></label><button onClick={() => setText(VERIFICATION_TASK_JSON_TEMPLATE)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><FileJson size={14} /> Load template</button></div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste a JSON file or click 'Load template' to start." className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs" />
          </div>
          {validation?.parseError && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{validation.parseError}</div>}
          {validation && !validation.parseError && validation.ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><p className="font-semibold">{validation.totalRows} task{validation.totalRows === 1 ? '' : 's'} ready.</p><p className="text-xs">Each task will be attached to the selected category{subCategoryId ? ' and sub-category' : ''}. The whole batch will be committed atomically.</p></div>}
          {validation && !validation.parseError && !validation.ok && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">{invalidRows.length} validation issue{invalidRows.length === 1 ? '' : 's'} found.</p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                {invalidRows.map((row) => (
                  <li key={row.row}>
                    <span className="font-semibold">Row {row.row}</span>
                    {row.title ? ` · ${row.title}` : ''} — {row.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary && <div className="grid grid-cols-2 gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:grid-cols-3"><div><div className="text-xs">Inserted</div><strong className="text-xl">{summary.inserted}</strong></div><div><div className="text-xs">Failed</div><strong className="text-xl">{summary.failed}</strong></div><div><div className="text-xs">Total</div><strong className="text-xl">{summary.total}</strong></div></div>}
          {serverMsg && <div className={`rounded-lg border p-3 text-sm ${serverMsg.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{serverMsg.text}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3"><button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button onClick={handleImport} disabled={!canImport} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : <><Sparkles size={14} /> Import tasks</>}</button></div>
      </div>
    </div>
  );
}

