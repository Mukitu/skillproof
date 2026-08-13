
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Eye, Github, Globe, Loader2, Plus, Save, Trash2,
} from 'lucide-react';
import {
  addPublicEvidence, listMyPublicEvidence, normalizePassportPrivacy,
  removePublicEvidence, updatePassportPrivacy,
} from '../../services/passports';
import type { PassportPrivacySettings } from '../../services/passports';
import type { ProfilePublicEvidence, PublicEvidenceType } from '../../types/database';

interface Props {
  initialPrivacy?: Record<string, boolean> | null;
  onSaved?: (next: PassportPrivacySettings) => void;
}

const TOGGLE_META: Array<{
  key: keyof PassportPrivacySettings;
  label: string;
  description: string;
}> = [
  {
    key: 'public_employer_view',
    label: 'Allow employer verification',
    description:
      'Master switch — when off, employers see a 🔒 Private Passport message instead of any of your data.',
  },
  {
    key: 'show_assessment_history',
    label: 'Show assessment history',
    description: 'Lets employers see your passed/failed assessments and a per-category score summary.',
  },
  {
    key: 'show_ai_career_profile',
    label: 'Show AI Career Profile',
    description:
      'Lets employers see your AI-generated career readiness, ATS score, and skill recommendations.',
  },
  {
    key: 'show_evidence',
    label: 'Show public evidence links',
    description: 'Lets employers click through to your GitHub, portfolio, and live demos.',
  },
];

const EVIDENCE_TYPES: { value: PublicEvidenceType; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'live_site', label: 'Live site' },
  { value: 'demo', label: 'Live demo' },
  { value: 'other', label: 'Other' },
];

export function PublicVisibilitySection({ initialPrivacy, onSaved }: Props) {
  const [privacy, setPrivacy] = useState<PassportPrivacySettings>(() =>
    normalizePassportPrivacy(initialPrivacy),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  
  const [evidence, setEvidence] = useState<ProfilePublicEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftType, setDraftType] = useState<PublicEvidenceType>('github');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    setPrivacy(normalizePassportPrivacy(initialPrivacy));
  }, [initialPrivacy]);

  useEffect(() => {
    void (async () => {
      try {
        setEvidenceLoading(true);
        const rows = await listMyPublicEvidence();
        setEvidence(rows);
      } catch (err) {
        
        console.warn('[PublicVisibilitySection] listMyPublicEvidence failed:', err);
      } finally {
        setEvidenceLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const next = await updatePassportPrivacy(privacy);
      setPrivacy(next);
      setSaved(true);
      onSaved?.(next);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error('[PublicVisibilitySection] updatePassportPrivacy failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const addEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvidenceError(null);
    if (!draftTitle.trim() || !draftUrl.trim()) {
      setEvidenceError('Title and URL are required.');
      return;
    }
    if (!/^https?:\/\//.test(draftUrl.trim())) {
      setEvidenceError('URL must start with http:// or https://');
      return;
    }
    setEvidenceBusy(true);
    try {
      const row = await addPublicEvidence(draftTitle.trim(), draftUrl.trim(), draftType);
      setEvidence((prev) => [row, ...prev]);
      setDraftTitle('');
      setDraftUrl('');
      setDraftType('github');
    } catch (err: any) {
      setEvidenceError(err?.message ?? 'Could not save evidence link.');
    } finally {
      setEvidenceBusy(false);
    }
  };

  const removeEvidence = async (id: string) => {
    setEvidenceBusy(true);
    try {
      await removePublicEvidence(id);
      setEvidence((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.warn('[PublicVisibilitySection] removePublicEvidence failed:', err);
    } finally {
      setEvidenceBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Eye className="w-4 h-4 text-[#E31B23]" /> Public Employer Visibility
      </h2>
      <p className="text-xs text-slate-500">
        Choose what employers see when they look up your Skill Passport on the
        public verification portal. Defaults are public — toggle off anything
        you don't want to share.
      </p>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Visibility settings saved.
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-3">
        {TOGGLE_META.map((t) => (
          <label
            key={t.key}
            className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={!!privacy[t.key]}
              onChange={(e) => setPrivacy({ ...privacy, [t.key]: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900 break-words">
                {t.label}
              </span>
              <span className="block text-[11px] text-slate-500 break-words">
                {t.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      {/* Public evidence CRUD */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Public Evidence Links</h3>
        <p className="mb-3 text-[11px] text-slate-500">
          Add GitHub repos, portfolios, live sites, or demo URLs. These are
          shown on the public verification page only when &ldquo;Show public
          evidence links&rdquo; is enabled above.
        </p>

        <form onSubmit={addEvidence} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-2 mb-3">
          <input
            type="text"
            placeholder="Title (e.g. Portfolio site)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none"
          />
          <input
            type="url"
            placeholder="https://github.com/you"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none"
          />
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as PublicEvidenceType)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none"
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={evidenceBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {evidenceBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </form>

        {evidenceError && (
          <p className="mb-2 text-[11px] font-semibold text-rose-600">{evidenceError}</p>
        )}

        {evidenceLoading ? (
          <p className="text-[11px] text-slate-500">Loading…</p>
        ) : evidence.length === 0 ? (
          <p className="text-[11px] italic text-slate-500">No evidence links yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {evidence.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    {row.type === 'github' ? (
                      <Github className="h-3.5 w-3.5 text-slate-600" />
                    ) : (
                      <Globe className="h-3.5 w-3.5 text-slate-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{row.title}</p>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-[10px] font-mono text-slate-500 hover:underline"
                    >
                      {row.url}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => removeEvidence(row.id)}
                  disabled={evidenceBusy}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Visibility'}
        </button>
      </div>
    </div>
  );
}

export default PublicVisibilitySection;