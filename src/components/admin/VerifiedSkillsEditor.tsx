
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2, X, Loader2,
} from 'lucide-react';
import type { VerifiedSkill, VerifiedSkillCategory } from '../../types/database';

const CATEGORY_OPTIONS: Array<{ value: VerifiedSkillCategory; label: string }> = [
  { value: 'skill', label: 'Skill' },
  { value: 'technology', label: 'Technology' },
  { value: 'tool', label: 'Tool' },
  { value: 'core_competency', label: 'Core Competency' },
];

interface VerifiedSkillsEditorProps {
  skills: VerifiedSkill[];
  
  onSave: (next: VerifiedSkill[]) => Promise<void> | void;
  
  disabled?: boolean;
}

export function VerifiedSkillsEditor({ skills, onSave, disabled }: VerifiedSkillsEditorProps) {
  const [items, setItems] = useState<VerifiedSkill[]>(skills ?? []);
  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState<VerifiedSkillCategory>('skill');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [editingCategory, setEditingCategory] = useState<VerifiedSkillCategory>('skill');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<number | null>(null);

  
  
  useEffect(() => {
    if (!dirty) {
      setItems(skills ?? []);
    }
  }, [skills, dirty]);

  const grouped = useMemo(() => {
    const out: Record<VerifiedSkillCategory, Array<{ skill: VerifiedSkill; index: number }>> = {
      skill: [], technology: [], tool: [], core_competency: [],
    };
    items.forEach((s, idx) => {
      const cat: VerifiedSkillCategory =
        (['skill', 'technology', 'tool', 'core_competency'] as VerifiedSkillCategory[]).includes(s.category)
          ? s.category
          : 'skill';
      out[cat].push({ skill: s, index: idx });
    });
    return out;
  }, [items]);

  const renumber = (arr: VerifiedSkill[]): VerifiedSkill[] =>
    arr.map((s, i) => ({ ...s, order: i + 1 }));

  const addDraft = () => {
    const name = draftName.trim();
    if (!name) return;
    const exists = items.some((s) => s.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      setError(`"${name}" is already on this passport.`);
      return;
    }
    setError('');
    const next = renumber([...items, { name, category: draftCategory, order: items.length + 1 }]);
    setItems(next);
    setDraftName('');
    setDirty(true);
  };

  const removeAt = (idx: number) => {
    setItems(renumber(items.filter((_, i) => i !== idx)));
    setDirty(true);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setItems(renumber(next));
    setDirty(true);
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditingDraft(items[idx].name);
    setEditingCategory(items[idx].category);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    const name = editingDraft.trim();
    if (!name) { setError('Skill name cannot be empty.'); return; }
    const collision = items.some((s, i) =>
      i !== editingIndex && s.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (collision) { setError(`"${name}" is already on this passport.`); return; }
    setError('');
    const next = items.slice();
    next[editingIndex] = { ...next[editingIndex], name, category: editingCategory };
    setItems(renumber(next));
    setEditingIndex(null);
    setDirty(true);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingDraft('');
    setEditingCategory('skill');
    setError('');
  };

  const flushSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(items);
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || 'Could not save verified skills.');
    } finally {
      setSaving(false);
    }
  };

  
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void flushSave();
    }, 700);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    
  }, [items, dirty]);

  return (
    <div className="space-y-4" data-testid="verified-skills-editor">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Verified Skills</p>
          <p className="text-xs text-slate-500">
            Add the four category groups that appear on the passport card, public verification page, PDF, and PNG.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          <button
            onClick={() => void flushSave()}
            disabled={disabled || !dirty || saving}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={12} /> Save now
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X size={12} />
          </button>
        </div>
      )}

      {}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
          placeholder="e.g. React, AWS, Figma"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <select
          value={draftCategory}
          onChange={(e) => setDraftCategory(e.target.value as VerifiedSkillCategory)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={addDraft}
          disabled={!draftName.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {}
      {(['skill', 'technology', 'tool', 'core_competency'] as VerifiedSkillCategory[]).map((cat) => {
        const entries = grouped[cat];
        if (entries.length === 0) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${meta.text}`}>{meta.label}</p>
            <ul className="space-y-1.5">
              {entries.map(({ skill, index }) => {
                const isEditing = editingIndex === index;
                return (
                  <li
                    key={`${index}-${skill.name}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                  >
                    {isEditing ? (
                      <>
                        <input
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); }}
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                          autoFocus
                        />
                        <select
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value as VerifiedSkillCategory)}
                          className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={commitEdit}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          OK
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}>
                          {skill.name}
                        </span>
                        <button
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => move(index, 1)}
                          disabled={index === items.length - 1}
                          title="Move down"
                          className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          onClick={() => startEdit(index)}
                          title="Edit"
                          className="rounded p-1 text-slate-500 hover:bg-slate-200"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeAt(index)}
                          title="Remove"
                          className="rounded p-1 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          No verified skills yet. Add the first one above.
        </p>
      )}
    </div>
  );
}

const CATEGORY_META: Record<VerifiedSkillCategory, {
  label: string;
  text: string;
  chip: string;
}> = {
  skill: {
    label: 'Skills',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  technology: {
    label: 'Technologies',
    text: 'text-indigo-700',
    chip: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  tool: {
    label: 'Tools',
    text: 'text-cyan-700',
    chip: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  core_competency: {
    label: 'Core Competencies',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

export default VerifiedSkillsEditor;