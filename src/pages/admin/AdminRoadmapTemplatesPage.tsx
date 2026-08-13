
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import type { Key as ReactKey } from 'react';
import {
  ArrowLeft, Archive, Award, BookOpen, Calendar, Check, ChevronDown, ChevronRight, Copy, Edit, Eye,
  EyeOff, FileJson, Image as ImageIcon, Info, Link2, Loader2, Plus, Save, Search,
  Sparkles, Trash2, Upload, X, Youtube, AlertCircle,
} from 'lucide-react';
import {
  adminCreateRoadmapTemplate, adminDeleteRoadmapTemplate, adminDeleteTemplateDay,
  adminImportRoadmapJson, adminPublishRoadmapTemplate, adminRoadmapTemplateStats,
  adminSetRoadmapThumbnail, adminUpdateRoadmapTemplate, adminUpsertTemplateDay,
  getRoadmapTemplateDays, listRoadmapTemplates, uploadRoadmapThumbnail,
} from '../../services/roadmaps';
import type { RoadmapDeleteResult, RoadmapTemplateStats } from '../../services/roadmaps';
import { adminUpsertModuleExam, listModuleExamsForTemplate } from '../../services/roadmapExams';
import type { RoadmapModuleExam } from '../../types/database';
import { listCategories, listSubCategories } from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import {
  ROADMAP_JSON_FIELDS, ROADMAP_JSON_TEMPLATE, validateRoadmapJson,
  type RoadmapValidationResult,
} from '../../components/admin/roadmapJsonTemplate';
import type {
  Category, Difficulty, RoadmapTemplate, RoadmapTemplateDay, RoadmapTemplateStatus, SubCategory,
} from '../../types/database';

type View = 'list' | 'create' | 'edit';

interface ResourceDraft {
  label: string;
  url: string;
  description: string;
}

interface DayDraft {
  day_number: number;
  title: string;
  description: string;
  estimated_minutes: number;
  learning_objectives: string;
  instructions: string;
  practice_tasks: string;
  notes: string;
  video_title: string;
  video_url: string;
  video_provider: '' | 'youtube' | 'embed';
  resources: ResourceDraft[];
}

function emptyDay(n: number): DayDraft {
  return {
    day_number: n,
    title: '',
    description: '',
    estimated_minutes: 60,
    learning_objectives: '',
    instructions: '',
    practice_tasks: '',
    notes: '',
    video_title: '',
    video_url: '',
    video_provider: '',
    resources: [],
  };
}

function emptyResource(): ResourceDraft {
  return { label: '', url: '', description: '' };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function dayFromTemplate(d: RoadmapTemplateDay): DayDraft {
  return {
    day_number: d.day_number,
    title: d.title,
    description: d.description ?? '',
    estimated_minutes: d.estimated_minutes,
    learning_objectives: (d.learning_objectives ?? []).join('\n'),
    instructions: (d.instructions ?? (d as any).study_materials ?? []).join('\n'),
    practice_tasks: (d.practice_tasks ?? []).join('\n'),
    notes: d.notes ?? '',
    video_title: d.video_title ?? '',
    video_url: d.video_url ?? '',
    video_provider: (d.video_provider as DayDraft['video_provider']) ?? '',
    resources: (d.extra_resources ?? []).map((r) => ({
      label: r.label ?? '',
      url: r.url ?? '',
      description: r.description ?? '',
    })),
  };
}

export default function AdminRoadmapTemplatesPage() {
  const [view, setView] = useState<View>('list');
  const [templates, setTemplates] = useState<RoadmapTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RoadmapTemplateStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RoadmapTemplate | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showJsonFormat, setShowJsonFormat] = useState(false);

  
  const reloadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const t = await listRoadmapTemplates({ includeDeleted: showDeleted });
      setTemplates(t); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [showDeleted]);

  useEffect(() => {
    void reloadTemplates();
  }, [reloadTemplates]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([listCategories(true), listSubCategories(undefined, true)]);
        if (!cancelled) { setCategories(c); setSubs(s); }
      } catch (e: any) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, []);

  
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => { refreshRef.current = () => { void reloadTemplates(); }; }, [reloadTemplates]);
  useRealtimeRefresh(['roadmap_templates', 'roadmap_template_days'], () => refreshRef.current());

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
      if (subCategoryFilter !== 'all' && t.sub_category_id !== subCategoryFilter) return false;
      return !s || t.title.toLowerCase().includes(s);
    });
  }, [templates, statusFilter, search, categoryFilter, subCategoryFilter]);

  
  const subsForFilter = useMemo(
    () => (categoryFilter === 'all' ? [] : subs.filter((s) => s.category_id === categoryFilter)),
    [subs, categoryFilter],
  );
  
  useEffect(() => {
    if (subCategoryFilter === 'all') return;
    if (categoryFilter === 'all' || !subsForFilter.some((s) => s.id === subCategoryFilter)) {
      setSubCategoryFilter('all');
    }
  }, [categoryFilter, subsForFilter, subCategoryFilter]);

  
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const subById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const deletedCount = useMemo(() => templates.filter((t) => !!t.deleted_at).length, [templates]);

  if (view === 'create' || view === 'edit') {
    return <div className="space-y-6">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <EditorView mode={view} template={editing} categories={categories} subCategories={subs} onCancel={() => { setView('list'); setEditing(null); setError(''); }} onSaved={() => { setView('list'); setEditing(null); void reloadTemplates(); }} onError={setError} setSaving={setSaving} onShowJsonFormat={() => setShowJsonFormat(true)} />
      {showJsonFormat && <RoadmapJsonFormatModal onClose={() => setShowJsonFormat(false)} />}
    </div>;
  }

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Roadmap Manager</h1><p className="text-sm text-slate-500">Create, edit and publish learning roadmaps.</p></div>
      <button
        onClick={() => setShowJsonFormat(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Info size={15} /> View JSON Format
      </button>
    </div>
    {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search roadmaps..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm" /></div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RoadmapTemplateStatus | 'all')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="Draft">Draft</option><option value="Published">Published</option></select>
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        title="Filter by category"
      >
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select
        value={subCategoryFilter}
        onChange={(e) => setSubCategoryFilter(e.target.value)}
        disabled={categoryFilter === 'all'}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
        title="Filter by sub-category"
      >
        <option value="all">All sub-categories</option>
        {subsForFilter.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" title="Include soft-deleted roadmaps (admin audits only)">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => setShowDeleted(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Show deleted
        {deletedCount > 0 && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{deletedCount}</span>}
      </label>
      <button onClick={() => { setEditing(null); setView('create'); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} /> New roadmap</button>
    </div>
    {loading && <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading roadmaps...</div>}
    {!loading && filtered.length === 0 && (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <BookOpen size={28} className="mx-auto text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">
          {templates.length === 0
            ? 'No roadmaps yet. Create your first one.'
            : showDeleted
              ? 'No roadmaps match your filters.'
              : 'No active roadmaps. Soft-deleted roadmaps are hidden — tick "Show deleted" to view them.'}
        </p>
      </div>
    )}
    {!loading && filtered.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((t) => <TemplateCard key={t.id} template={t} categoryMap={categoryById} subMap={subById} onEdit={() => { setEditing(t); setView('edit'); }} onRefresh={reloadTemplates} saving={saving} />)}</div>}
    {showJsonFormat && <RoadmapJsonFormatModal onClose={() => setShowJsonFormat(false)} />}
  </div>;
}

const ROADMAP_STATUS_BADGE: Record<RoadmapTemplateStatus | 'Deleted', string> = {
  Deleted:   'bg-rose-100 text-rose-700',
  Published: 'bg-emerald-100 text-emerald-700',
  Draft:     'bg-amber-100 text-amber-700',
  Archived:  'bg-slate-200 text-slate-600',
};

function TemplateCard({ template: t, categoryMap, subMap, onEdit, onRefresh, saving }: { template: RoadmapTemplate; categoryMap: Map<string, Category>; subMap: Map<string, SubCategory>; onEdit: () => void; onRefresh: () => Promise<void>; saving: boolean; key?: ReactKey }) {
  const category = t.category_id ? categoryMap.get(t.category_id) : undefined;
  const sub = t.sub_category_id ? subMap.get(t.sub_category_id) : undefined;
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isDeleted = !!t.deleted_at;
  const togglePublish = async () => { setBusy(true); try { await adminPublishRoadmapTemplate(t.id, t.status !== 'Published'); await onRefresh(); } catch (e: any) { alert(e.message); } finally { setBusy(false); } };
  const statusCls = ROADMAP_STATUS_BADGE[isDeleted ? 'Deleted' : t.status];
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${isDeleted ? 'border-rose-200 opacity-90' : 'border-slate-200'}`}>
      <div className={`flex h-32 items-center justify-center overflow-hidden ${isDeleted ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
        {t.thumbnail_url ? <img src={t.thumbnail_url} alt={t.title} className="h-full w-full object-cover" /> : <BookOpen size={32} className="text-white/80" />}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{t.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusCls}`}>
            {isDeleted ? 'Deleted' : t.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {category && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{category.name}</span>}
          {sub && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{sub.name}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={12} /> {t.total_days} days</span>
          <span className="flex items-center gap-1"><Sparkles size={12} /> {t.difficulty}</span>
          {isDeleted && t.deleted_at && (
            <span className="text-[10px] text-rose-600" title={t.deleted_at}>
              archived {new Date(t.deleted_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {isDeleted && (
          <p className="rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
            Soft-deleted. Removed from the public library. Existing user enrollments, progress, and certificates are preserved.
          </p>
        )}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={onEdit} disabled={busy || saving || isDeleted} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"><Edit size={12} /> Edit</button>
          <button onClick={togglePublish} disabled={busy || saving || isDeleted} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
            {t.status === 'Published' ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
          </button>
          <button
            onClick={() => setDeleting(true)}
            disabled={busy || saving}
            className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            title={isDeleted ? 'Hard-delete (cascade wipe — permanent)' : 'Delete roadmap'}
          ><Trash2 size={12} /></button>
        </div>
      </div>
      {deleting && (
        <DeleteRoadmapModal
          template={t}
          onClose={() => setDeleting(false)}
          onDeleted={async () => { setDeleting(false); await onRefresh(); }}
        />
      )}
    </div>
  );
}


function DeleteRoadmapModal({
  template,
  onClose,
  onDeleted,
}: {
  template: RoadmapTemplate;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const [stats, setStats] = useState<RoadmapTemplateStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  
  
  
  const [mode, setMode] = useState<'preserve' | 'hard'>('preserve');
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await adminRoadmapTemplateStats(template.id);
        if (!cancelled) {
          setStats(s);
          setMode(s.has_dependents ? 'hard' : 'preserve');
        }
      } catch (e: any) {
        if (!cancelled) setStatsError(e?.message || 'Could not load dependent counts.');
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => { cancelled = true; };
  }, [template.id]);

  const hasDependents = !!stats?.has_dependents;
  const canDelete = !busy && !loadingStats;

  const submit = async () => {
    if (!canDelete) return;
    setBusy(true);
    setResultMsg(null);
    try {
      const result: RoadmapDeleteResult = await adminDeleteRoadmapTemplate(template.id, {
        preserveUserData: mode === 'preserve',
        cascade: mode === 'hard',
      });
      if (result.ok) {
        if (result.mode === 'preserve' && result.preserved) {
          const p = result.preserved;
          setResultMsg({
            kind: 'success',
            text:
              `Roadmap archived. ${plural(p.enrollments, 'enrollment')}, ` +
              `${plural(p.progress, 'progress row')}, and ` +
              `${plural(p.certificates, 'certificate')} preserved. ` +
              `The roadmap is now hidden from the library — existing users keep their progress.`,
          });
        } else if (result.deleted) {
          const d = result.deleted;
          setResultMsg({
            kind: 'success',
            text:
              `Roadmap and all data permanently removed: ${plural(d.enrollments, 'enrollment')}, ` +
              `${plural(d.progress_rows, 'progress row')}, ` +
              `${plural(d.module_rows, 'module')}, ` +
              `${plural(d.template_days, 'day')}.`,
          });
        } else {
          setResultMsg({ kind: 'success', text: 'Roadmap deleted.' });
        }
        await onDeleted();
      } else if (result.blocked) {
        setResultMsg({
          kind: 'error',
          text:
            result.error ||
            'Delete was blocked by active user data. Pick either "Hard delete (cascade)" to wipe everything, or "Archive & preserve user data" to keep user records.',
        });
      } else {
        setResultMsg({ kind: 'error', text: result.error || 'Could not delete roadmap.' });
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
              <Trash2 size={18} className="text-red-600" /> Delete roadmap
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              "{template.title}"
              {template.deleted_at
                ? ' — already soft-deleted. You can hard-delete to wipe every dependent record.'
                : ' — choose how user data should be handled.'}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Close">
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
                <li>Active enrollments: <span className="font-semibold">{stats.dependents.enrollments}</span></li>
                <li>Legacy assignments: <span className="font-semibold">{stats.dependents.legacy_assignments}</span></li>
                <li>Progress rows: <span className="font-semibold">{stats.dependents.progress_rows}</span></li>
                <li>Per-enrollment modules: <span className="font-semibold">{stats.dependents.module_rows}</span></li>
                <li>Template days: <span className="font-semibold">{stats.dependents.template_days}</span></li>
                <li>Affected users: <span className="font-semibold">{stats.dependents.affected_user_count}</span></li>
              </ul>
            </div>
          )}

          {stats && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deletion mode</div>

              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                mode === 'preserve'
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="delete-mode"
                  className="mt-0.5"
                  checked={mode === 'preserve'}
                  onChange={() => setMode('preserve')}
                  disabled={busy}
                />
                <span>
                  <span className="font-semibold text-emerald-900">Archive &amp; preserve user data</span>
                  <span className="mt-1 block text-xs text-emerald-800">
                    Recommended. The roadmap is removed from the library but every user keeps their
                    enrollment, completed days, and completion certificate. Users see a
                    "Roadmap archived by admin" badge and can still view their progress.
                  </span>
                </span>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                mode === 'hard'
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="delete-mode"
                  className="mt-0.5"
                  checked={mode === 'hard'}
                  onChange={() => setMode('hard')}
                  disabled={busy}
                />
                <span>
                  <span className="font-semibold text-red-900">Hard delete (cascade)</span>
                  <span className="mt-1 block text-xs text-red-800">
                    Permanently removes the roadmap row AND every dependent enrollment, progress
                    row, module copy, and certificate. Unlike Archive, the template row is fully
                    gone — no archived record remains. Cannot be undone.
                  </span>
                </span>
              </label>
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
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canDelete}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : (mode === 'hard' ? <Trash2 size={14} /> : <Archive size={14} />)}
            {mode === 'hard' ? 'Hard delete' : 'Archive roadmap'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorView({ mode, template, categories, subCategories, onCancel, onSaved, onError, setSaving, onShowJsonFormat }: { mode: View; template: RoadmapTemplate | null; categories: Category[]; subCategories: SubCategory[]; onCancel: () => void; onSaved: () => void; onError: (msg: string) => void; setSaving: (saving: boolean) => void; onShowJsonFormat?: () => void }) {
  const [categoryId, setCategoryId] = useState(template?.category_id ?? ''); const [subCategoryId, setSubCategoryId] = useState(template?.sub_category_id ?? ''); const [title, setTitle] = useState(template?.title ?? ''); const [description, setDescription] = useState(template?.description ?? ''); const [totalDays, setTotalDays] = useState(template?.total_days ?? 30); const [difficulty, setDifficulty] = useState<Difficulty>(template?.difficulty ?? 'Medium'); const [status, setStatus] = useState<RoadmapTemplateStatus>(template?.status ?? 'Draft'); const [thumbnailUrl, setThumbnailUrl] = useState(template?.thumbnail_url ?? ''); const [thumbnailTab, setThumbnailTab] = useState<'upload' | 'url'>('upload'); const [uploading, setUploading] = useState(false); const fileInputRef = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState<DayDraft[]>([]); const [loadingDays, setLoadingDays] = useState(false); const [activeDay, setActiveDay] = useState<number | null>(null); const [showJson, setShowJson] = useState(false); const [savedId, setSavedId] = useState<string | null>(template?.id ?? null);
  const [examByDay, setExamByDay] = useState<Record<number, RoadmapModuleExam>>({});

  useEffect(() => { if (mode === 'edit' && template) { setSavedId(template.id); setCategoryId(template.category_id ?? ''); setSubCategoryId(template.sub_category_id ?? ''); setTitle(template.title); setDescription(template.description ?? ''); setTotalDays(template.total_days); setDifficulty(template.difficulty); setStatus(template.status); setThumbnailUrl(template.thumbnail_url ?? ''); } if (mode === 'create') { setSavedId(null); setCategoryId(''); setSubCategoryId(''); setTitle(''); setDescription(''); setTotalDays(30); setDifficulty('Medium'); setStatus('Draft'); setThumbnailUrl(''); setDays([]); setExamByDay({}); } }, [mode, template]);
  useEffect(() => { if (!savedId) return; (async () => { setLoadingDays(true); try { const [list, exams] = await Promise.all([getRoadmapTemplateDays(savedId), listModuleExamsForTemplate(savedId)]); setDays(list.map(dayFromTemplate)); const byDay: Record<number, RoadmapModuleExam> = {}; for (const e of exams) byDay[e.day_number] = e; setExamByDay(byDay); } catch (e: any) { onError(e.message); } finally { setLoadingDays(false); } })(); }, [savedId, onError]);
  const ensureDays = useCallback((n: number) => setDays((prev) => { const r = [...prev]; while (r.length < n) r.push(emptyDay(r.length + 1)); return r.slice(0, n); }), []);
  useEffect(() => { ensureDays(totalDays); }, [totalDays, ensureDays]);
  const filteredSubs = useMemo(() => subCategories.filter((s) => s.category_id === categoryId), [subCategories, categoryId]);
  useEffect(() => { if (subCategoryId && !filteredSubs.some((s) => s.id === subCategoryId)) setSubCategoryId(''); }, [subCategoryId, filteredSubs]);
  const canSave = !!categoryId && !!title.trim() && totalDays > 0;
  const list = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  const onThumbnailFile = async (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (!savedId) { onError('Save the header first, then upload a thumbnail.'); return; } setUploading(true); try { setThumbnailUrl(await uploadRoadmapThumbnail(savedId, f)); } catch (e: any) { onError(e.message); } finally { setUploading(false); e.target.value = ''; } };
  const headerPayload = () => ({ category_id: categoryId, sub_category_id: subCategoryId || null, title: title.trim(), description, total_days: totalDays, difficulty, status, thumbnail_url: thumbnailUrl || null });
  const saveHeader = async () => { if (!canSave) { onError('Main category and title are required.'); return null; } setSaving(true); try { const saved = mode === 'create' ? await adminCreateRoadmapTemplate(headerPayload()) : await adminUpdateRoadmapTemplate(savedId!, headerPayload()); setSavedId(saved.id); if (thumbnailUrl && saved.thumbnail_url !== thumbnailUrl) await adminSetRoadmapThumbnail(saved.id, thumbnailUrl); onError(''); return saved; } catch (e: any) { onError(e.message); return null; } finally { setSaving(false); } };
  const sanitizeResources = (rows: ResourceDraft[]) => rows
    .map((r) => ({ label: r.label.trim(), url: r.url.trim(), description: r.description.trim() }))
    .filter((r) => r.label !== '' || r.url !== '');

  const buildDayInput = (id: string, day: DayDraft) => ({
    template_id: id,
    day_number: day.day_number,
    title: day.title.trim(),
    description: day.description.trim() || null,
    estimated_minutes: Math.max(5, Number(day.estimated_minutes) || 60),
    learning_objectives: list(day.learning_objectives),
    instructions: list(day.instructions),
    practice_tasks: list(day.practice_tasks),
    notes: day.notes.trim() || null,
    resources: sanitizeResources(day.resources),
    video_title: day.video_title.trim() || null,
    video_url: day.video_url.trim() || null,
    video_provider: (day.video_provider || null) as 'youtube' | 'embed' | null,
  });

  const validateDay = (day: DayDraft): string | null => {
    if (!day.title.trim()) return 'Day title is required.';
    if (!Number.isFinite(day.estimated_minutes) || day.estimated_minutes < 5) return 'Estimated minutes must be 5 or more.';
    if (day.video_url.trim() && !day.video_provider) return 'Choose a video provider when video URL is set.';
    if (!day.video_url.trim() && day.video_provider) return 'Add a video URL when the provider is set.';
    return null;
  };

  const onSaveDay = async (day: DayDraft) => {
    const err = validateDay(day);
    if (err) { onError(err); return; }
    let id = savedId;
    if (!id) { const h = await saveHeader(); id = h?.id ?? null; }
    if (!id) return;
    setSaving(true);
    try {
      await adminUpsertTemplateDay(buildDayInput(id, day));
      onError('');
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  };

  const onDeleteDay = async (n: number) => {
    if (!savedId) return;
    setSaving(true);
    try {
      const existing = await getRoadmapTemplateDays(savedId);
      const target = existing.find((d) => d.day_number === n);
      if (target) await adminDeleteTemplateDay(target.id);
      setDays((p) => p.filter((d) => d.day_number !== n));
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  };

  const onSaveAll = async () => {
    let id = savedId;
    if (!id) { const h = await saveHeader(); id = h?.id ?? null; }
    if (!id) return;
    const firstErr = days.map((d) => validateDay(d)).find(Boolean);
    if (firstErr) { onError(firstErr); return; }
    setSaving(true);
    try {
      for (const d of days) await adminUpsertTemplateDay(buildDayInput(id, d));
      onSaved();
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6"><button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back to list</button>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">1</span> Roadmap header</h2><div className="grid gap-4 sm:grid-cols-2">
      <SelectField label="Main category *" value={categoryId} onChange={setCategoryId}><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
      <SelectField label="Sub category (optional)" value={subCategoryId} onChange={setSubCategoryId} disabled={!categoryId}><option value="">None</option>{filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</SelectField>
      <TextField label="Title *" value={title} onChange={setTitle} placeholder="Frontend Developer Roadmap" full />
      <TextAreaField label="Short description" value={description} onChange={setDescription} full rows={2} />
      <div><label className="mb-1 block text-xs font-medium text-slate-700">Total days</label><div className="flex flex-wrap gap-2">{[15, 30, 60, 90].map((n) => <button key={n} onClick={() => setTotalDays(n)} className={`rounded-lg border px-3 py-1.5 text-xs ${totalDays === n ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}>{n} days</button>)}<input type="number" min={1} max={365} value={totalDays} onChange={(e) => setTotalDays(Math.max(1, parseInt(e.target.value || '1', 10)))} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" /></div></div>
      <SelectField label="Difficulty" value={difficulty} onChange={(v) => setDifficulty(v as Difficulty)}><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></SelectField>
      <SelectField label="Status" value={status} onChange={(v) => setStatus(v as RoadmapTemplateStatus)}><option value="Draft">Draft</option><option value="Published">Published</option><option value="Archived">Archived</option></SelectField>
      <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-slate-700">Thumbnail (optional)</label><div className="flex flex-wrap items-center gap-3"><div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50">{thumbnailUrl ? <img src={thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}</div><div className="flex-1 min-w-[220px] space-y-2"><div className="flex gap-2"><button onClick={() => setThumbnailTab('upload')} className={`rounded px-3 py-1 text-xs ${thumbnailTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Upload</button><button onClick={() => setThumbnailTab('url')} className={`rounded px-3 py-1 text-xs ${thumbnailTab === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Image URL</button></div>{thumbnailTab === 'upload' ? <><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onThumbnailFile} className="hidden" /><button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">{uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Choose image</button></> : <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs" />}{thumbnailUrl && <button onClick={() => setThumbnailUrl('')} className="text-xs text-red-600 hover:underline">Remove</button>}</div></div></div>
    </div><div className="mt-4 flex justify-end"><button onClick={() => void saveHeader()} disabled={!canSave} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><Save size={14} /> Save header</button></div></div>

    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">2</span> Daily lessons ({days.length})</h2><div className="flex items-center gap-2"><button onClick={onShowJsonFormat} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><Info size={14} /> View JSON Format</button><button onClick={() => setShowJson(true)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><FileJson size={14} /> JSON import</button></div></div>{loadingDays && <div className="flex items-center gap-2 p-3 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading days...</div>}<div className="space-y-2">{days.map((d) => <DayRow key={d.day_number} day={d} exam={examByDay[d.day_number] ?? null} templateId={savedId} isActive={activeDay === d.day_number} onToggle={() => setActiveDay(activeDay === d.day_number ? null : d.day_number)} onChange={(patch) => setDays((prev) => prev.map((x) => x.day_number === d.day_number ? { ...x, ...patch } : x))} onSave={() => void onSaveDay(d)} onExamSaved={(exam) => setExamByDay((prev) => ({ ...prev, [exam.day_number]: exam }))} onDelete={() => void onDeleteDay(d.day_number)} canDelete={!!savedId} onError={onError} />)}</div><div className="mt-4 flex justify-end"><button onClick={() => void onSaveAll()} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"><Save size={14} /> Save all days</button></div></div>
    {showJson && <JsonImportModal templateId={savedId} onClose={() => setShowJson(false)} onImported={() => { setShowJson(false); onSaved(); }} onError={onError} setSaving={setSaving} existingDayNumbers={new Set(days.filter((d) => d.day_number > 0).map((d) => d.day_number))} />}
  </div>;
}

function SelectField({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; children: any }) { return <div><label className="mb-1 block text-xs font-medium text-slate-700">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">{children}</select></div>; }
function TextField({ label, value, onChange, placeholder, full }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean }) { return <div className={full ? 'sm:col-span-2' : ''}><label className="mb-1 block text-xs font-medium text-slate-700">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>; }
function TextAreaField({ label, value, onChange, full, rows }: { label: string; value: string; onChange: (v: string) => void; full?: boolean; rows?: number }) { return <div className={full ? 'sm:col-span-2' : ''}><label className="mb-1 block text-xs font-medium text-slate-700">{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows ?? 3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>; }

function DayRow({
  day, exam, templateId, isActive, onToggle, onChange, onSave, onExamSaved, onDelete, canDelete, onError,
}: {
  day: DayDraft;
  exam: RoadmapModuleExam | null;
  templateId: string | null;
  isActive: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<DayDraft>) => void;
  onSave: () => void;
  onExamSaved: (exam: RoadmapModuleExam) => void;
  onDelete: () => void;
  canDelete: boolean;
  onError: (msg: string) => void;
  key?: ReactKey;
}) {
  const updateResource = (i: number, patch: Partial<ResourceDraft>) => onChange({
    resources: day.resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
  });
  return (
    <div className={`overflow-hidden rounded-xl border ${isActive ? 'border-blue-300 shadow-sm' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">{day.day_number}</div>
        <input placeholder="Day title" value={day.title} onChange={(e) => onChange({ title: e.target.value })} className="min-w-[170px] flex-1 rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="number" min={5} value={day.estimated_minutes} onChange={(e) => onChange({ estimated_minutes: Math.max(5, parseInt(e.target.value || '60', 10)) })} className="w-20 rounded border border-slate-200 px-2 py-1.5 text-xs" />
        <span className="text-xs text-slate-500">min</span>
        {exam?.exam_enabled && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Award size={11} /> Exam · {exam.exam_title || `Day ${day.day_number}`}
          </span>
        )}
        <button onClick={onSave} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"><Save size={12} /> Save</button>
        <button onClick={onToggle} className="rounded p-1 text-slate-400 hover:bg-slate-100">{isActive ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
      </div>
      {isActive && (
        <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">
          <TextAreaField label="Full description (rich text, multi-line supported)" value={day.description} onChange={(v) => onChange({ description: v })} full rows={4} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Learning objectives (one per line)" value={day.learning_objectives} onChange={(v) => onChange({ learning_objectives: v })} />
            <Field label="Step-by-step instructions (one per line)" value={day.instructions} onChange={(v) => onChange({ instructions: v })} />
            <Field label="Practice tasks (one per line)" value={day.practice_tasks} onChange={(v) => onChange({ practice_tasks: v })} />
            <Field label="Admin notes" value={day.notes} onChange={(v) => onChange({ notes: v })} />
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Youtube size={14} className="text-red-500" /> Lesson video (optional)</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Video title" value={day.video_title} onChange={(v) => onChange({ video_title: v })} placeholder="Lesson overview" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Provider</label>
                <select value={day.video_provider} onChange={(e) => onChange({ video_provider: e.target.value as DayDraft['video_provider'] })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">No video</option>
                  <option value="youtube">YouTube (we will add ?embed=true)</option>
                  <option value="embed">Direct embed URL</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <TextField label="Video URL" value={day.video_url} onChange={(v) => onChange({ video_url: v })} placeholder="https://www.youtube.com/watch?v=..." full />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2"><Link2 size={14} /> External resources</span>
              <button type="button" onClick={() => onChange({ resources: [...day.resources, emptyResource()] })} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"><Plus size={12} /> Add resource</button>
            </div>
            {day.resources.length === 0 && <p className="text-xs text-slate-500">No resources yet.</p>}
            {day.resources.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
                <input placeholder="Label" value={r.label} onChange={(e) => updateResource(i, { label: e.target.value })} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                <input placeholder="https://..." value={r.url} onChange={(e) => updateResource(i, { url: e.target.value })} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                <input placeholder="Optional description" value={r.description} onChange={(e) => updateResource(i, { description: e.target.value })} className="rounded border border-slate-200 px-2 py-1 text-xs" />
                <button type="button" onClick={() => onChange({ resources: day.resources.filter((_, idx) => idx !== i) })} className="rounded p-1 text-red-600 hover:bg-red-50" title="Remove resource"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          <ExamSection
            templateId={templateId}
            dayNumber={day.day_number}
            exam={exam}
            onSaved={onExamSaved}
            onError={onError}
          />

          {canDelete && <div className="flex justify-end"><button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 size={12} /> Delete day</button></div>}
        </div>
      )}
    </div>
  );
}


function ExamSection({
  templateId, dayNumber, exam, onSaved, onError,
}: {
  templateId: string | null;
  dayNumber: number;
  exam: RoadmapModuleExam | null;
  onSaved: (exam: RoadmapModuleExam) => void;
  onError: (msg: string) => void;
}) {
  const [draft, setDraft] = useState<RoadmapModuleExam | null>(exam);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { setDraft(exam); }, [exam]);

  if (!templateId) {
    return <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">Save the roadmap header first to enable exam configuration.</div>;
  }

  const d = draft ?? {
    id: '', template_id: templateId, day_number: dayNumber,
    exam_enabled: false, exam_title: null, exam_instructions: null,
    max_marks: 10, pass_marks: 6,
    allow_text_answer: true, allow_submission_url: true,
    created_at: '', updated_at: '',
  } as RoadmapModuleExam;

  const update = (patch: Partial<RoadmapModuleExam>) => setDraft((prev) => ({ ...(prev ?? d), ...patch }) as RoadmapModuleExam);

  const onSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const saved = await adminUpsertModuleExam({
        template_id: templateId,
        day_number: dayNumber,
        exam_enabled: d.exam_enabled,
        exam_title: d.exam_title ?? null,
        exam_instructions: d.exam_instructions ?? null,
        max_marks: d.max_marks,
        pass_marks: d.pass_marks,
        allow_text_answer: d.allow_text_answer,
        allow_submission_url: (d as any).allow_submission_url ?? true,
      });
      setDraft(saved); onSaved(saved);
      setMsg({ kind: 'success', text: saved.exam_enabled ? 'Exam enabled.' : 'Exam disabled.' });
      onError('');
    } catch (e: any) {
      const text = e?.message || 'Could not save exam.';
      setMsg({ kind: 'error', text });
      onError(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-amber-900">
          <Award size={14} />
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-amber-300"
            checked={d.exam_enabled}
            onChange={(event) => update({ exam_enabled: event.target.checked })}
          />
          Enable Module Exam
        </label>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save exam
        </button>
      </div>

      <TextField
        label="Exam title (required when enabled)"
        value={d.exam_title ?? ''}
        onChange={(v) => update({ exam_title: v.trim() || null })}
        placeholder="Day 1 practical exam"
      />
      <TextAreaField
        label="Instructions for the learner"
        value={d.exam_instructions ?? ''}
        onChange={(v) => update({ exam_instructions: v.trim() || null })}
        full rows={2}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Max marks (1-100)" value={d.max_marks} min={1} max={100} onChange={(v) => update({ max_marks: v })} />
        <NumberField label="Pass marks (1-100)" value={d.pass_marks} min={1} max={100} onChange={(v) => update({ pass_marks: v })} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleField label="Allow text answer" value={d.allow_text_answer} onChange={(v) => update({ allow_text_answer: v })} />
        <ToggleField
          label="Allow submission URL (GitHub, live site, Drive)"
          value={(d as any).allow_submission_url ?? true}
          onChange={(v) => update({ allow_submission_url: v } as any)}
        />
      </div>

      <p className="text-[11px] text-amber-900/80">
        File uploads are not supported. Users may submit a text answer and a single http(s) URL.
      </p>

      {msg && (
        <div className={`rounded-lg border p-2 text-xs ${
          msg.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}>{msg.text}</div>
      )}
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const n = parseInt(event.target.value || String(min), 10);
          onChange(Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)));
        }}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={value} onChange={(event) => onChange(event.target.checked)} />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
    </div>
  );
}

function JsonImportModal({ templateId, onClose, onImported, onError, setSaving, existingDayNumbers }: { templateId: string | null; onClose: () => void; onImported: () => void; onError: (msg: string) => void; setSaving: (saving: boolean) => void; existingDayNumbers?: Set<number> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<RoadmapValidationResult | null>(null);
  const [serverMsg, setServerMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!text.trim()) { setValidation(null); return; }
    setValidation(validateRoadmapJson(text, existingDayNumbers));
  }, [text, existingDayNumbers]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setText(await file.text()); }
    catch (e: any) { setServerMsg({ kind: 'error', text: `Could not read file: ${e.message || 'unknown error'}` }); }
    finally { event.target.value = ''; }
  };

  const handleImport = async () => {
    if (!templateId) { onError('Save the header first to enable JSON import.'); return; }
    if (!validation || !validation.ok) return;
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch (e: any) { onError(`Invalid JSON: ${e.message}`); return; }
    setSaving(true); setBusy(true); setServerMsg(null);
    try { await adminImportRoadmapJson(templateId, parsed); onImported(); }
    catch (e: any) { onError(e.message); setServerMsg({ kind: 'error', text: e.message }); }
    finally { setBusy(false); setSaving(false); }
  };

  const canImport = !!templateId && !!validation?.ok && !busy;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><h3 className="flex items-center gap-2 text-lg font-semibold"><FileJson size={18} className="text-blue-600" /> JSON import</h3><p className="mt-0.5 text-xs text-slate-500">Paste a roadmap JSON with a <code>days</code> array. The same template is shown in the "View JSON Format" modal.</p></div>
        <button onClick={onClose} disabled={busy} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={14} /> Choose file
            <input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
          </label>
          <button onClick={() => setText(ROADMAP_JSON_TEMPLATE)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <FileJson size={14} /> Load template
          </button>
        </div>
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "days": [ { "day_number": 1, "title": "HTML basics" } ] }' className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs" />

        {validation?.parseError && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{validation.parseError}</div>}

        {validation && !validation.parseError && validation.ok && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <p className="font-semibold">{validation.totalDays} day{validation.totalDays === 1 ? '' : 's'} ready to import.</p>
            <p className="text-xs">All rows passed validation. Click Import to save them onto this roadmap.</p>
          </div>
        )}

        {validation && !validation.parseError && !validation.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">{validation.invalidCount} of {validation.totalDays} row{validation.totalDays === 1 ? '' : 's'} are invalid.</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validation.rows.filter((row) => row.status === 'invalid').map((row) => (
                <li key={row.row}>
                  <span className="font-semibold">Day {row.dayNumber ?? row.row}</span>
                  {row.title ? <span className="text-slate-600"> · {row.title}</span> : null}
                  <span> — {row.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {serverMsg && <div className={`rounded-lg border p-3 text-sm ${serverMsg.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{serverMsg.text}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
        <button onClick={() => void handleImport()} disabled={!canImport} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : <><FileJson size={14} /> Import {validation?.totalDays ?? 0} day{validation?.totalDays === 1 ? '' : 's'}</>}
        </button>
      </div>
    </div>
  </div>;
}

function RoadmapJsonFormatModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(ROADMAP_JSON_TEMPLATE);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = ROADMAP_JSON_TEMPLATE;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Info size={18} className="text-blue-600" /> Roadmap JSON Format</h2><p className="mt-0.5 text-xs text-slate-500">Use this template when bulk-importing days. The JSON import modal validates against the same schema.</p></div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Close"><X size={20} /></button>
      </div>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Complete JSON template</h3>
            <button onClick={handleCopy} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {copied ? <><Check size={12} className="text-emerald-600" /> Copied</> : <><Copy size={12} /> Copy JSON Template</>}
            </button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-4 text-xs leading-5 text-slate-100">{ROADMAP_JSON_TEMPLATE}</pre>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Day field reference</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Required</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Notes</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROADMAP_JSON_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td className="px-3 py-2 font-mono text-slate-800">{field.key}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${field.required ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{field.required ? 'Required' : 'Optional'}</span></td>
                    <td className="px-3 py-2 text-slate-700">{field.type}</td>
                    <td className="px-3 py-2 text-slate-600">{field.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
      </div>
    </div>
  </div>;
}
