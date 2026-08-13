import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown, CirclePlus, Copy,
  Download, FileJson, FolderTree, GripVertical, Info, Loader2, Pencil, Search,
  Trash2, Upload, X,
} from 'lucide-react';
import {
  adminCreateCategory, adminCreateSkill, adminCreateSubCategory,
  adminDeleteCategorySafe, adminDeleteSkillSafe, adminDeleteSubCategorySafe,
  adminImportTaxonomyJson, adminMoveSkill, adminMoveSubCategory,
  adminReorderTaxonomy, adminSetTaxonomyStatus, adminSubCategoryStats,
  adminTaxonomyStats, adminUpdateCategory, adminUpdateSkill, adminUpdateSubCategory,
  listCategories, listSkills, listSubCategories,
} from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import type { Category, Difficulty, Skill, SubCategory, TaxonomyStatus } from '../../types/database';

const ICONS = ['Code2', 'Palette', 'TrendingUp', 'PenTool', 'GraduationCap', 'HeartPulse', 'Wrench', 'Briefcase', 'BookOpen', 'Layers', 'Award', 'Atom', 'Server', 'Megaphone', 'Camera'];
const STATUSES: TaxonomyStatus[] = ['Active', 'Draft', 'Archived'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

type NodeKind = 'category' | 'sub' | 'skill';
type EditorMode = 'create' | 'edit' | 'move';
type EditorState = { kind: NodeKind; mode: EditorMode; parentId?: string; item?: Category | SubCategory | Skill } | null;

type FormState = {
  name: string;
  description: string;
  icon: string;
  status: TaxonomyStatus;
  displayOrder: number;
  categoryId: string;
  subCategoryId: string;
  maxLevel: number;
  difficulty: Difficulty;
};

const emptyForm: FormState = {
  name: '', description: '', icon: 'Layers', status: 'Active', displayOrder: 0,
  categoryId: '', subCategoryId: '', maxLevel: 3, difficulty: 'Medium',
};

const SAMPLE_TAXONOMY_JSON = [
  {
    "main_category": "Software Development",
    "description": "Build, ship and maintain modern software products end to end.",
    "icon": "Code2",
    "status": "Active",
    "display_order": 1,
    "sub_categories": [
      {
        "name": "Frontend Development",
        "description": "Build user interfaces for the web and mobile.",
        "status": "Active",
        "display_order": 1,
        "skills": ["HTML", "CSS", "JavaScript", "React", "TypeScript"]
      },
      {
        "name": "Backend Development",
        "description": "Design APIs, services and data pipelines.",
        "status": "Active",
        "display_order": 2,
        "skills": ["Node.js", "Express", "PostgreSQL", "REST APIs"]
      },
      {
        "name": "Mobile Development",
        "description": "Build native and cross-platform mobile apps.",
        "status": "Draft",
        "display_order": 3,
        "skills": ["React Native", "Flutter", "Swift", "Kotlin"]
      }
    ]
  },
  {
    "main_category": "Design",
    "description": "Visual, product and motion design skills.",
    "icon": "Palette",
    "status": "Active",
    "display_order": 2,
    "sub_categories": [
      {
        "name": "UI Design",
        "description": "Design interfaces for web and mobile apps.",
        "status": "Active",
        "display_order": 1,
        "skills": ["Figma", "UI Design", "Wireframing"]
      },
      {
        "name": "UX Research",
        "description": "Plan and run user research and validation.",
        "status": "Active",
        "display_order": 2,
        "skills": ["User Interviews", "Usability Testing", "Surveys"]
      }
    ]
  },
  {
    "main_category": "Data & AI",
    "description": "Analytics, data engineering and applied AI.",
    "icon": "Atom",
    "status": "Draft",
    "display_order": 3,
    "sub_categories": [
      {
        "name": "Data Analysis",
        "description": "Analyse data with spreadsheets, SQL and BI tools.",
        "status": "Active",
        "display_order": 1,
        "skills": ["Excel", "SQL", "Power BI", "Tableau"]
      }
    ]
  }
];

function statusClasses(status: TaxonomyStatus) {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (status === 'Draft') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  return 'bg-slate-100 text-slate-600 ring-slate-500/20';
}
function StatusBadge({ status }: { status: TaxonomyStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses(status)}`}>{status}</span>;
}
function ActionButton({ title, onClick, disabled, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={`rounded-md p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
      {children}
    </button>
  );
}




export default function AdminTaxonomyPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    try {
      const [categoryRows, subRows, skillRows] = await Promise.all([
        listCategories(true), listSubCategories(undefined, true), listSkills({ includeArchived: true }),
      ]);
      setCategories(categoryRows); setSubCategories(subRows); setSkills(skillRows);
      setError('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load taxonomy.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(['categories', 'sub_categories', 'skills'], load);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), [categories]);
  const subsFor = useCallback((categoryId: string) => subCategories.filter((item) => item.category_id === categoryId).sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), [subCategories]);
  const skillsFor = useCallback((subId: string) => skills.filter((item) => item.sub_category_id === subId).sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), [skills]);
  const directSkillsFor = useCallback((categoryId: string) => skills.filter((item) => item.category_id === categoryId && !item.sub_category_id).sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)), [skills]);

  const visibleCategoryIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return new Set(sortedCategories.map((item) => item.id));
    return new Set(sortedCategories.filter((category) => {
      if (category.name.toLowerCase().includes(normalized) || category.description?.toLowerCase().includes(normalized)) return true;
      const relatedSubs = subCategories.filter((item) => item.category_id === category.id);
      if (relatedSubs.some((item) => item.name.toLowerCase().includes(normalized))) return true;
      const relatedSubIds = new Set(relatedSubs.map((item) => item.id));
      return skills.some((item) => (item.category_id === category.id || (item.sub_category_id && relatedSubIds.has(item.sub_category_id))) && item.name.toLowerCase().includes(normalized));
    }).map((item) => item.id));
  }, [query, sortedCategories, subCategories, skills]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openEditor = (kind: NodeKind, mode: EditorMode, item?: Category | SubCategory | Skill, parentId?: string) => {
    let next: FormState = { ...emptyForm };
    if (kind === 'category') {
      const category = item as Category | undefined;
      next = { ...next, name: category?.name ?? '', description: category?.description ?? '', icon: category?.icon ?? 'Layers', status: category?.status ?? 'Active', displayOrder: category?.display_order ?? categories.length * 10 };
    } else if (kind === 'sub') {
      const sub = item as SubCategory | undefined;
      next = { ...next, name: sub?.name ?? '', description: sub?.description ?? '', status: sub?.status ?? 'Active', displayOrder: sub?.display_order ?? subsFor(parentId ?? '').length * 10, categoryId: sub?.category_id ?? parentId ?? categories[0]?.id ?? '' };
    } else {
      const skill = item as Skill | undefined;
      const sub = parentId ? subCategories.find((row) => row.id === parentId) : undefined;
      next = { ...next, name: skill?.name ?? '', description: skill?.description ?? '', icon: skill?.icon ?? 'Award', status: skill?.status ?? 'Active', displayOrder: skill?.display_order ?? skillsFor(parentId ?? '').length * 10, categoryId: skill?.category_id ?? sub?.category_id ?? categories[0]?.id ?? '', subCategoryId: skill?.sub_category_id ?? parentId ?? '', maxLevel: skill?.max_level ?? 3, difficulty: skill?.difficulty ?? 'Medium' };
    }
    setForm(next); setEditor({ kind, mode, item, parentId }); setError(''); setSuccess('');
  };
  const closeEditor = () => { if (!busy) setEditor(null); };

  const saveEditor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const name = form.name.trim();
    if (editor.mode !== 'move' && !name) { setError('Name is required.'); return; }
    if (editor.kind !== 'category' && !form.categoryId) { setError('A parent category is required.'); return; }
    if (editor.kind === 'skill' && form.subCategoryId) {
      const parent = subCategories.find((item) => item.id === form.subCategoryId);
      if (!parent || parent.category_id !== form.categoryId) { setError('Selected sub-category does not belong to the selected category.'); return; }
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      if (editor.mode === 'move') {
        if (editor.kind === 'sub') await adminMoveSubCategory((editor.item as SubCategory).id, form.categoryId);
        if (editor.kind === 'skill') await adminMoveSkill((editor.item as Skill).id, form.categoryId, form.subCategoryId || null);
      } else if (editor.kind === 'category') {
        const payload = { name, description: form.description.trim() || undefined, icon: form.icon, display_order: form.displayOrder, status: form.status };
        if (editor.mode === 'edit') await adminUpdateCategory((editor.item as Category).id, payload); else await adminCreateCategory(payload);
      } else if (editor.kind === 'sub') {
        const payload = { category_id: form.categoryId, name, description: form.description.trim() || undefined, display_order: form.displayOrder, status: form.status };
        if (editor.mode === 'edit') await adminUpdateSubCategory((editor.item as SubCategory).id, payload); else await adminCreateSubCategory(payload);
      } else {
        const payload = { category_id: form.categoryId, sub_category_id: form.subCategoryId || null, name, description: form.description.trim() || undefined, icon: form.icon, max_level: form.maxLevel, difficulty: form.difficulty, display_order: form.displayOrder, status: form.status };
        if (editor.mode === 'edit') await adminUpdateSkill((editor.item as Skill).id, payload); else await adminCreateSkill(payload);
      }
      await load(); setEditor(null);
      setSuccess(editor.mode === 'create' ? 'Created successfully.' : editor.mode === 'move' ? 'Moved successfully.' : 'Updated successfully.');
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'The operation failed.'); }
    finally { setBusy(false); }
  };

  const setStatus = async (level: 'categories' | 'sub_categories' | 'skills', id: string, current: TaxonomyStatus) => {
    setBusy(true); setError(''); setSuccess('');
    try { await adminSetTaxonomyStatus(level, id, current === 'Active' ? 'Archived' : 'Active'); await load(); setSuccess(current === 'Active' ? 'Deactivated successfully.' : 'Activated successfully.'); }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Status update failed.'); }
    finally { setBusy(false); }
  };

  const reorder = async (kind: NodeKind, items: Array<Category | SubCategory | Skill>, index: number, direction: -1 | 1, categoryId?: string, subId?: string) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ordered = items.map((item) => item.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const level = kind === 'category' ? 'categories' : kind === 'sub' ? 'sub_categories' : 'skills';
    setBusy(true); setError('');
    try { await adminReorderTaxonomy(level, ordered, categoryId ?? null, subId ?? null); await load(); }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Reorder failed.'); }
    finally { setBusy(false); }
  };

  const deleteCategory = async (category: Category) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const stats = await adminTaxonomyStats(category.id);
      const skillCount = stats.skills_direct + stats.skills_via_sub;
      if (!window.confirm(`Delete category “${category.name}”?\n\nThis permanently deletes ${stats.sub_categories} sub-categor${stats.sub_categories === 1 ? 'y' : 'ies'} and ${skillCount} skill${skillCount === 1 ? '' : 's'}. This cannot be undone.`)) return;
      const result = await adminDeleteCategorySafe(category.id);
      await load();
      setSuccess(`Deleted “${category.name}”, ${result.deleted_sub_categories} sub-categories and ${result.deleted_skills} skills.`);
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };

  const deleteSub = async (sub: SubCategory) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const stats = await adminSubCategoryStats(sub.id);
      if (!window.confirm(`Delete sub-category “${sub.name}”?\n\nThis permanently deletes ${stats.skills} child skill${stats.skills === 1 ? '' : 's'}. This cannot be undone.`)) return;
      const result = await adminDeleteSubCategorySafe(sub.id);
      await load();
      setSuccess(`Deleted “${sub.name}” and ${result.deleted_skills} child skills.`);
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };

  const deleteSkill = async (skill: Skill) => {
    if (!window.confirm(`Delete skill “${skill.name}”? This cannot be undone.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try { await adminDeleteSkillSafe(skill.id); await load(); setSuccess(`Deleted “${skill.name}”.`); }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };

  const onImportComplete = async (summary: { categories: number; sub_categories: number; skills: number }) => {
    setShowImport(false);
    await load();
    setSuccess(`Imported ${summary.categories} categories, ${summary.sub_categories} sub-categories and ${summary.skills} skills.`);
  };

  const renderSkill = (skill: Skill, siblings: Skill[], index: number, categoryId: string, subId: string) => (
    <div key={skill.id} className="group flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 pl-14 hover:bg-slate-50/80">
      <GripVertical size={15} className="shrink-0 text-slate-300" />
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium text-slate-700">{skill.name}</span><StatusBadge status={skill.status} /><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">{skill.difficulty}</span></div>
        {skill.description && <p className="mt-0.5 truncate text-xs text-slate-400">{skill.description}</p>}
      </div>
      <span className="hidden text-xs text-slate-400 sm:inline">Order {skill.display_order}</span>
      <div className="flex shrink-0 items-center">
        <ActionButton title="Move up" disabled={busy || index === 0} onClick={() => void reorder('skill', siblings, index, -1, categoryId, subId)}><ChevronDown size={15} className="rotate-180" /></ActionButton>
        <ActionButton title="Move down" disabled={busy || index === siblings.length - 1} onClick={() => void reorder('skill', siblings, index, 1, categoryId, subId)}><ChevronDown size={15} /></ActionButton>
        <ActionButton title="Move skill" disabled={busy} onClick={() => openEditor('skill', 'move', skill)}><ChevronsUpDown size={15} /></ActionButton>
        <ActionButton title="Edit skill" disabled={busy} onClick={() => openEditor('skill', 'edit', skill)}><Pencil size={15} /></ActionButton>
        <button type="button" disabled={busy} onClick={() => void setStatus('skills', skill.id, skill.status)} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">{skill.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
        <ActionButton title="Delete skill" danger disabled={busy} onClick={() => void deleteSkill(skill)}><Trash2 size={15} /></ActionButton>
      </div>
    </div>
  );

  const filteredCategories = sortedCategories.filter((item) => visibleCategoryIds.has(item.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Category & Skill Manager</h1><p className="mt-1 text-sm text-slate-500">Manage the full Category → Sub-category → Skill hierarchy.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowFormat(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Info size={16} /> View JSON Format</button>
          <button type="button" onClick={() => setShowImport(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><FileJson size={16} /> Import JSON</button>
          <button type="button" onClick={() => openEditor('category', 'create')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><CirclePlus size={17} /> Add category</button>
        </div>
      </div>

      {error && <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
      {success && <div className="flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><span>{success}</span><button onClick={() => setSuccess('')}><X size={16} /></button></div>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[['Categories', categories.length], ['Sub-categories', subCategories.length], ['Skills', skills.length]].map(([label, count]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-800">{count}</p></div>)}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories, sub-categories or skills…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div>
          <button type="button" onClick={() => { const allExpanded = expandedCategories.size === categories.length; setExpandedCategories(allExpanded ? new Set() : new Set(categories.map((item) => item.id))); setExpandedSubs(allExpanded ? new Set() : new Set(subCategories.map((item) => item.id))); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><FolderTree size={16} /> {expandedCategories.size === categories.length && categories.length ? 'Collapse all' : 'Expand all'}</button>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading taxonomy…</div> : filteredCategories.length === 0 ? <div className="p-12 text-center"><FolderTree className="mx-auto text-slate-300" size={34} /><p className="mt-3 text-sm text-slate-500">No taxonomy items found.</p></div> : (
          <div className="divide-y divide-slate-200">
            {filteredCategories.map((category, categoryIndex) => {
              const categorySubs = subsFor(category.id);
              const directSkills = directSkillsFor(category.id);
              const categoryExpanded = expandedCategories.has(category.id) || Boolean(query);
              const totalSkills = directSkills.length + categorySubs.reduce((sum, item) => sum + skillsFor(item.id).length, 0);
              return <div key={category.id}>
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70">
                  <button type="button" onClick={() => toggleSet(setExpandedCategories, category.id)} className="rounded p-1 text-slate-500 hover:bg-slate-100">{categoryExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-slate-900">{category.name}</span><StatusBadge status={category.status} /><span className="text-xs text-slate-400">{categorySubs.length} sub · {totalSkills} skills</span></div>{category.description && <p className="mt-0.5 truncate text-xs text-slate-500">{category.description}</p>}</div>
                  <span className="hidden text-xs text-slate-400 md:inline">Order {category.display_order}</span>
                  <div className="flex shrink-0 items-center">
                    <ActionButton title="Move up" disabled={busy || categoryIndex === 0} onClick={() => void reorder('category', sortedCategories, categoryIndex, -1)}><ChevronDown size={16} className="rotate-180" /></ActionButton>
                    <ActionButton title="Move down" disabled={busy || categoryIndex === sortedCategories.length - 1} onClick={() => void reorder('category', sortedCategories, categoryIndex, 1)}><ChevronDown size={16} /></ActionButton>
                    <ActionButton title="Add sub-category" disabled={busy} onClick={() => openEditor('sub', 'create', undefined, category.id)}><CirclePlus size={16} /></ActionButton>
                    <ActionButton title="Edit category" disabled={busy} onClick={() => openEditor('category', 'edit', category)}><Pencil size={16} /></ActionButton>
                    <button type="button" disabled={busy} onClick={() => void setStatus('categories', category.id, category.status)} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">{category.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                    <ActionButton title="Delete category" danger disabled={busy} onClick={() => void deleteCategory(category)}><Trash2 size={16} /></ActionButton>
                  </div>
                </div>
                {categoryExpanded && <div className="border-t border-slate-100 bg-slate-50/30">
                  {categorySubs.map((sub, subIndex) => {
                    const subSkills = skillsFor(sub.id);
                    const subExpanded = expandedSubs.has(sub.id) || Boolean(query);
                    return <div key={sub.id} className="border-t border-slate-100 first:border-t-0">
                      <div className="flex items-center gap-3 px-4 py-3 pl-9 hover:bg-slate-50">
                        <button type="button" onClick={() => toggleSet(setExpandedSubs, sub.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100">{subExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-slate-700">{sub.name}</span><StatusBadge status={sub.status} /><span className="text-xs text-slate-400">{subSkills.length} skills</span></div>{sub.description && <p className="mt-0.5 truncate text-xs text-slate-400">{sub.description}</p>}</div>
                        <span className="hidden text-xs text-slate-400 md:inline">Order {sub.display_order}</span>
                        <div className="flex shrink-0 items-center">
                          <ActionButton title="Move up" disabled={busy || subIndex === 0} onClick={() => void reorder('sub', categorySubs, subIndex, -1, category.id)}><ChevronDown size={15} className="rotate-180" /></ActionButton>
                          <ActionButton title="Move down" disabled={busy || subIndex === categorySubs.length - 1} onClick={() => void reorder('sub', categorySubs, subIndex, 1, category.id)}><ChevronDown size={15} /></ActionButton>
                          <ActionButton title="Move sub-category" disabled={busy} onClick={() => openEditor('sub', 'move', sub)}><ChevronsUpDown size={15} /></ActionButton>
                          <ActionButton title="Add skill" disabled={busy} onClick={() => openEditor('skill', 'create', undefined, sub.id)}><CirclePlus size={15} /></ActionButton>
                          <ActionButton title="Edit sub-category" disabled={busy} onClick={() => openEditor('sub', 'edit', sub)}><Pencil size={15} /></ActionButton>
                          <button type="button" disabled={busy} onClick={() => void setStatus('sub_categories', sub.id, sub.status)} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">{sub.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                          <ActionButton title="Delete sub-category" danger disabled={busy} onClick={() => void deleteSub(sub)}><Trash2 size={15} /></ActionButton>
                        </div>
                      </div>
                      {subExpanded && (subSkills.length ? subSkills.map((skill, skillIndex) => renderSkill(skill, subSkills, skillIndex, category.id, sub.id)) : <div className="border-t border-slate-100 px-4 py-3 pl-16 text-xs text-slate-400">No skills in this sub-category.</div>)}
                    </div>;
                  })}
                  {directSkills.length > 0 && <div className="border-t border-dashed border-slate-200"><div className="px-4 py-2 pl-12 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Direct skills (no sub-category)</div>{directSkills.map((skill) => <div key={skill.id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 pl-14"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /><div className="min-w-0 flex-1"><span className="text-sm font-medium text-slate-700">{skill.name}</span></div><StatusBadge status={skill.status} /><ActionButton title="Move skill" onClick={() => openEditor('skill', 'move', skill)}><ChevronsUpDown size={15} /></ActionButton><ActionButton title="Edit skill" onClick={() => openEditor('skill', 'edit', skill)}><Pencil size={15} /></ActionButton><ActionButton title="Delete skill" danger onClick={() => void deleteSkill(skill)}><Trash2 size={15} /></ActionButton></div>)}</div>}
                  {categorySubs.length === 0 && directSkills.length === 0 && <div className="px-12 py-5 text-sm text-slate-400">No sub-categories or skills yet. Use “Add sub-category” to start.</div>}
                </div>}
              </div>;
            })}
          </div>
        )}
      </div>

      {editor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-semibold text-slate-900">{editor.mode === 'create' ? 'Add' : editor.mode === 'move' ? 'Move' : 'Edit'} {editor.kind === 'category' ? 'category' : editor.kind === 'sub' ? 'sub-category' : 'skill'}</h2>{editor.mode === 'move' && <p className="mt-0.5 text-xs text-slate-500">Select a new parent location.</p>}</div><button type="button" onClick={closeEditor} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
          <form onSubmit={(event) => void saveEditor(event)} className="space-y-4 p-5">
            {editor.kind !== 'category' && <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Category</span><select required value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value, subCategoryId: editor.kind === 'skill' ? '' : current.subCategoryId }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="">Select category</option>{sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
            {editor.kind === 'skill' && <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Sub-category</span><select value={form.subCategoryId} onChange={(e) => setForm((current) => ({ ...current, subCategoryId: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="">No sub-category (direct skill)</option>{subsFor(form.categoryId).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}</select></label>}
            {editor.mode !== 'move' && <>
              <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Name</span><input required maxLength={120} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Description</span><textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
              {(editor.kind === 'category' || editor.kind === 'skill') && <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Icon</span><select value={form.icon} onChange={(e) => setForm((current) => ({ ...current, icon: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{ICONS.map((icon) => <option key={icon}>{icon}</option>)}</select></label>}
              <div className="grid grid-cols-2 gap-4"><label><span className="mb-1 block text-sm font-medium text-slate-700">Status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as TaxonomyStatus }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label><span className="mb-1 block text-sm font-medium text-slate-700">Order</span><input type="number" min={0} value={form.displayOrder} onChange={(e) => setForm((current) => ({ ...current, displayOrder: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label></div>
              {editor.kind === 'skill' && <div className="grid grid-cols-2 gap-4"><label><span className="mb-1 block text-sm font-medium text-slate-700">Difficulty</span><select value={form.difficulty} onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value as Difficulty }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{DIFFICULTIES.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}</select></label><label><span className="mb-1 block text-sm font-medium text-slate-700">Max level</span><input type="number" min={1} max={5} value={form.maxLevel} onChange={(e) => setForm((current) => ({ ...current, maxLevel: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label></div>}
            </>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={closeEditor} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : editor.mode === 'move' ? 'Move' : 'Save'}</button></div>
          </form>
        </div>
      </div>}

      {showFormat && <JsonFormatModal onClose={() => setShowFormat(false)} />}
      {showImport && <JsonImportModal busy={busy} onClose={() => setShowImport(false)} onComplete={onImportComplete} onError={setError} />}
    </div>
  );
}




function JsonFormatModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pretty = useMemo(() => JSON.stringify(SAMPLE_TAXONOMY_JSON, null, 2), []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(pretty); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch {  }
  };

  const download = () => {
    const blob = new Blob([pretty], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'taxonomy-sample.json'; document.body.appendChild(a);
    a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FileJson size={18} /> Supported JSON format</h2>
            <p className="mt-0.5 text-xs text-slate-500">Use this structure when importing categories, sub-categories and skills.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            {copied ? <><CheckCircle2 size={14} className="text-emerald-600" /> Copied</> : <><Copy size={14} /> Copy JSON</>}
          </button>
          <button type="button" onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <Download size={14} /> Download Sample JSON
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-900 px-5 py-4"><pre className="font-mono text-xs leading-relaxed"><SyntaxHighlight>{pretty}</SyntaxHighlight></pre></div>
        <div className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Field reference</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            <li><code className="rounded bg-slate-100 px-1">main_category</code> — required, unique name</li>
            <li><code className="rounded bg-slate-100 px-1">description</code> — optional short description</li>
            <li><code className="rounded bg-slate-100 px-1">icon</code> — optional lucide icon name (e.g. Code2, Palette)</li>
            <li><code className="rounded bg-slate-100 px-1">status</code> — optional, Active | Draft | Archived</li>
            <li><code className="rounded bg-slate-100 px-1">display_order</code> — optional JSON number (e.g. 1, 2, 3)</li>
            <li><code className="rounded bg-slate-100 px-1">sub_categories</code> — optional array</li>
            <li><code className="rounded bg-slate-100 px-1">name</code> — required inside sub_categories</li>
            <li><code className="rounded bg-slate-100 px-1">skills</code> — optional array of names</li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Top level is an array of categories. <code className="rounded bg-slate-100 px-1">display_order</code> must be a JSON number (not a string). All names are slugified; duplicates inside the payload or against existing rows are rejected.
          </p>
        </div>
      </div>
    </div>
  );
}


function SyntaxHighlight({ children }: { children: string }) {
  const tokens = useMemo(() => {
    const input = children.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const out: Array<{ type: string; text: string }> = [];
    const regex = /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],])/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      if (match.index > last) out.push({ type: 'plain', text: input.slice(last, match.index) });
      const t = match[0];
      if (t.endsWith(':')) out.push({ type: 'key', text: t });
      else if (t.startsWith('"')) out.push({ type: 'string', text: t });
      else if (/^(true|false|null)$/.test(t)) out.push({ type: 'bool', text: t });
      else if (/^-?\d/.test(t)) out.push({ type: 'number', text: t });
      else out.push({ type: 'punct', text: t });
      last = match.index + t.length;
    }
    if (last < input.length) out.push({ type: 'plain', text: input.slice(last) });
    return out;
  }, [children]);
  return (
    <>
      {tokens.map((tk, i) => {
        const cls =
          tk.type === 'key' ? 'text-sky-300'
          : tk.type === 'string' ? 'text-emerald-300'
          : tk.type === 'bool' ? 'text-amber-300'
          : tk.type === 'number' ? 'text-orange-300'
          : tk.type === 'punct' ? 'text-slate-400'
          : 'text-slate-200';
        return <span key={i} className={cls}>{tk.text}</span>;
      })}
    </>
  );
}






const ALLOWED_STATUSES = new Set(['Active', 'Archived', 'Draft']);

interface RawSubCategory {
  name?: unknown;
  description?: unknown;
  icon?: unknown;
  status?: unknown;
  display_order?: unknown;
  skills?: unknown;
}

interface RawCategory {
  main_category?: unknown;
  description?: unknown;
  icon?: unknown;
  status?: unknown;
  display_order?: unknown;
  sub_categories?: unknown;
}

type SanitizedSubCategory = {
  name: string;
  description: string | null;
  status: 'Active' | 'Archived' | 'Draft';
  display_order: number;
  skills: string[];
};

type SanitizedCategory = {
  main_category: string;
  description: string | null;
  icon: string | null;
  status: 'Active' | 'Archived' | 'Draft';
  display_order: number;
  sub_categories: SanitizedSubCategory[];
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}


function coerceDisplayOrder(value: unknown, rowLabel: string, field = 'display_order'): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`${rowLabel}: field "${field}" must be an integer (got number ${value}).`);
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(`${rowLabel}: field "${field}" must be an integer (got string "${trimmed}").`);
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new Error(`${rowLabel}: field "${field}" must be an integer (got "${trimmed}").`);
    }
    return n;
  }
  throw new Error(`${rowLabel}: field "${field}" must be a number (got ${typeof value}).`);
}

function coerceStatus(value: unknown, rowLabel: string, field = 'status'): 'Active' | 'Archived' | 'Draft' {
  if (value === undefined || value === null) return 'Active';
  if (typeof value !== 'string') {
    throw new Error(`${rowLabel}: field "${field}" must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed === '') return 'Active';
  if (!ALLOWED_STATUSES.has(trimmed)) {
    throw new Error(`${rowLabel}: field "${field}" must be one of Active, Archived, Draft (got "${trimmed}").`);
  }
  return trimmed as 'Active' | 'Archived' | 'Draft';
}

function sanitizeSkills(rawSkills: unknown, rowLabel: string): string[] {
  if (rawSkills === undefined || rawSkills === null) return [];
  if (!Array.isArray(rawSkills)) {
    throw new Error(`${rowLabel}: field "skills" must be an array.`);
  }
  const out: string[] = [];
  for (const [idx, skill] of rawSkills.entries()) {
    const skillLabel = `${rowLabel}, skill #${idx + 1}`;
    if (typeof skill !== 'string') {
      throw new Error(`${skillLabel} must be a string.`);
    }
    const trimmed = skill.trim();
    if (!trimmed) {
      throw new Error(`${skillLabel} is empty.`);
    }
    out.push(trimmed);
  }
  return out;
}

function sanitizeSubCategory(raw: RawSubCategory, mainLabel: string, subIdx: number): SanitizedSubCategory {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`${mainLabel}, sub-category #${subIdx + 1}: must be an object.`);
  }
  const rowLabel = `${mainLabel}, sub-category #${subIdx + 1}`;
  const name = asTrimmedString(raw.name);
  if (!name) {
    throw new Error(`${rowLabel} is missing required field "name".`);
  }
  const subRowLabel = `${rowLabel} ("${name}")`;
  return {
    name,
    description: asTrimmedString(raw.description),
    status: coerceStatus(raw.status, subRowLabel),
    display_order: coerceDisplayOrder(raw.display_order, subRowLabel),
    skills: sanitizeSkills(raw.skills, subRowLabel),
  };
}

function sanitizeCategory(raw: RawCategory, idx: number): SanitizedCategory {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`Entry #${idx + 1} must be an object.`);
  }
  const mainName = asTrimmedString(raw.main_category);
  if (!mainName) {
    throw new Error(`Entry #${idx + 1} is missing required field "main_category".`);
  }
  const mainLabel = `Entry #${idx + 1} ("${mainName}")`;
  const subRaw: unknown = raw.sub_categories;
  let subs: SanitizedSubCategory[] = [];
  if (subRaw !== undefined && subRaw !== null) {
    if (!Array.isArray(subRaw)) {
      throw new Error(`${mainLabel}: field "sub_categories" must be an array.`);
    }
    subs = subRaw.map((s, j) => sanitizeSubCategory(s as RawSubCategory, mainLabel, j));
  }
  return {
    main_category: mainName,
    description: asTrimmedString(raw.description),
    icon: asTrimmedString(raw.icon),
    status: coerceStatus(raw.status, mainLabel),
    display_order: coerceDisplayOrder(raw.display_order, mainLabel),
    sub_categories: subs,
  };
}

export function sanitizeTaxonomyPayload(obj: unknown): SanitizedCategory[] {
  if (!Array.isArray(obj)) {
    throw new Error('Top-level JSON must be an array of categories.');
  }
  if (obj.length === 0) {
    throw new Error('The JSON array must contain at least one category.');
  }
  return (obj as RawCategory[]).map((entry, i) => sanitizeCategory(entry, i));
}




function JsonImportModal({ onClose, onComplete, onError, busy: parentBusy }: { onClose: () => void; onComplete: (s: { categories: number; sub_categories: number; skills: number }) => Promise<void> | void; onError: (msg: string) => void; busy: boolean }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<SanitizedCategory[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [summary, setSummary] = useState<{ categories: number; sub_categories: number; skills: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    const t = await file.text();
    setText(t);
    validate(t);
  };

  const validate = (value: string) => {
    setParseError('');
    setSummary(null);
    if (!value.trim()) { setParsed(null); return; }
    let raw: unknown;
    try {
      raw = JSON.parse(value);
    } catch (e: any) {
      setParseError(`Invalid JSON: ${e.message || 'parse error'}.`);
      setParsed(null);
      return;
    }
    try {
      const sanitized = sanitizeTaxonomyPayload(raw);
      setParsed(sanitized);
    } catch (e: any) {
      setParseError(e.message || 'Invalid JSON.');
      setParsed(null);
    }
  };

  const counts = useMemo(() => {
    if (!parsed) return null;
    let subTotal = 0, skillTotal = 0;
    for (const cat of parsed) {
      subTotal += cat.sub_categories.length;
      for (const sub of cat.sub_categories) skillTotal += sub.skills.length;
    }
    return { categories: parsed.length, sub_categories: subTotal, skills: skillTotal };
  }, [parsed]);

  const submit = async () => {
    if (!parsed) { setParseError('Please provide a valid JSON first.'); return; }
    setBusy(true); onError('');
    try {
      const result = await adminImportTaxonomyJson(parsed);
      setSummary(result);
      await onComplete(result);
    } catch (e: any) { onError(e.message || 'Import failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Upload size={18} /> Import categories JSON</h2>
            <p className="mt-0.5 text-xs text-slate-500">Upload a file or paste JSON. Duplicates are rejected and the import is atomic.</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-4 overflow-auto p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Upload .json file</span>
            <input type="file" accept="application/json" onChange={(event) => { const f = event.target.files?.[0]; if (f) void onFile(f); }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700" />
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Or paste JSON</label>
            <textarea rows={12} value={text} onChange={(event) => { setText(event.target.value); validate(event.target.value); }} placeholder='[ { "main_category": "Software Development", "sub_categories": [ ... ] } ]' className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs" />
          </div>

          {parseError && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><X size={16} className="mt-0.5" /><span>{parseError}</span></div>}

          {parsed && counts && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 size={16} /> JSON is valid</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-white px-2 py-2"><div className="text-base font-semibold text-slate-900">{counts.categories}</div><div className="text-slate-500">Categories</div></div>
                <div className="rounded-md bg-white px-2 py-2"><div className="text-base font-semibold text-slate-900">{counts.sub_categories}</div><div className="text-slate-500">Sub-categories</div></div>
                <div className="rounded-md bg-white px-2 py-2"><div className="text-base font-semibold text-slate-900">{counts.skills}</div><div className="text-slate-500">Skills</div></div>
              </div>
            </div>
          )}

          {summary && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="font-medium">Import complete</div>
              <div className="mt-1 text-xs">Inserted {summary.categories} categories, {summary.sub_categories} sub-categories and {summary.skills} skills.</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
          <button type="button" onClick={submit} disabled={busy || parentBusy || !parsed} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import to Supabase
          </button>
        </div>
      </div>
    </div>
  );
}
