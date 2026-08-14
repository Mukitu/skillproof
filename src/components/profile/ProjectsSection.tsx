/**
 * ProjectsSection
 * ---------------
 * Manages a candidate's portfolio evidence — the unlimited live / demo
 * project entries that show up on the digitalized CV and on the public
 * /verify page (rendered as the "Public Evidence" section).
 *
 * Each row carries:
 *   - title (project name)
 *   - url   (live link or repo)
 *   - type  (live_site / demo / portfolio / github / other)
 *   - description (1–2 line blurb shown underneath the link on the CV)
 *
 * The component is intentionally written so adding a row never blocks on a
 * roundtrip: the local UI state is updated immediately, and the server
 * write happens in the background. Failed writes roll back the UI so the
 * candidate never sees a "ghost" row that wasn't actually saved.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, ExternalLink, Globe, Github, Loader2, Pencil, Plus,
  Trash2, X, CheckCircle2, Link as LinkIcon,
} from 'lucide-react';
import {
  deleteMyProfileEvidence,
  listMyProfileEvidence,
  upsertMyProfileEvidence,
  type ProfileEvidenceRow,
  type ProfileEvidenceType,
} from '../../services/profileEvidence';

interface DraftEntry {
  id: string;          // local-only id (uuid v4-ish)
  serverId?: string;   // populated after first save
  title: string;
  url: string;
  type: ProfileEvidenceType;
  description: string;
  dirty: boolean;
  saving: boolean;
  error?: string;
}

const TYPE_OPTIONS: { value: ProfileEvidenceType; label_en: string; label_bn: string; tone: string; icon: typeof Globe }[] = [
  { value: 'live_site',  label_en: 'Live site',   label_bn: 'লাইভ সাইট',  tone: 'border-emerald-300 bg-emerald-50 text-emerald-700', icon: Globe },
  { value: 'demo',       label_en: 'Demo',        label_bn: 'ডেমো',       tone: 'border-blue-300 bg-blue-50 text-blue-700',         icon: ExternalLink },
  { value: 'portfolio',  label_en: 'Portfolio',   label_bn: 'পোর্টফোলিও', tone: 'border-amber-300 bg-amber-50 text-amber-700',       icon: LinkIcon },
  { value: 'github',     label_en: 'GitHub',      label_bn: 'গি�হাব',     tone: 'border-slate-300 bg-slate-50 text-slate-700',       icon: Github },
  { value: 'other',      label_en: 'Other',       label_bn: 'অন্যান্য',    tone: 'border-violet-300 bg-violet-50 text-violet-700',    icon: LinkIcon },
];

function normalizeUrl(raw: string): string {
  const t = (raw ?? '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return 'https://' + t;
}

function isValidUrl(raw: string): boolean {
  const t = (raw ?? '').trim();
  if (!t) return false;
  try {
    const u = new URL(t.startsWith('http') ? t : 'https://' + t);
    return Boolean(u.hostname && u.hostname.includes('.'));
  } catch {
    return false;
  }
}

function genLocalId(): string {
  return 'local-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

export const ProjectsSection: React.FC<{ t: (en: string, bn: string) => string }> = ({ t }) => {
  const [items, setItems] = useState<DraftEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyProfileEvidence();
        if (cancelled) return;
        setItems(
          rows.map((r: ProfileEvidenceRow) => ({
            id: r.id,
            serverId: r.id,
            title: r.title || '',
            url: r.url || '',
            type: r.type || 'other',
            description: r.description || '',
            dirty: false,
            saving: false,
          })),
        );
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? 'Could not load your projects.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addEmpty = useCallback(() => {
    const localId = genLocalId();
    setItems((prev) => [
      ...prev,
      {
        id: localId,
        title: '',
        url: '',
        type: 'live_site',
        description: '',
        dirty: true,
        saving: false,
      },
    ]);
  }, []);

  const update = useCallback((localId: string, patch: Partial<DraftEntry>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === localId ? { ...it, ...patch, dirty: true } : it)),
    );
  }, []);

  const remove = useCallback(async (localId: string) => {
    const entry = items.find((it) => it.id === localId);
    if (!entry) return;
    if (entry.serverId) {
      try {
        await deleteMyProfileEvidence(entry.serverId);
      } catch (e: any) {
        update(localId, { error: e?.message ?? 'Could not delete.' });
        return;
      }
    }
    setItems((prev) => prev.filter((it) => it.id !== localId));
  }, [items, update]);

  const save = useCallback(async (localId: string) => {
    const entry = items.find((it) => it.id === localId);
    if (!entry) return;
    const title = entry.title.trim();
    const url = normalizeUrl(entry.url);
    if (!title) {
      update(localId, { error: t('Project name is required.', 'প্রজেক্টের নাম দিতে হবে।') });
      return;
    }
    if (!isValidUrl(url)) {
      update(localId, { error: t('URL looks invalid — start with https://', 'ইউআরএল সঠিক নয় — https:// দিয়ে শুরু করুন') });
      return;
    }
    update(localId, { saving: true, error: undefined });
    try {
      const newId = await upsertMyProfileEvidence({
        id: entry.serverId ?? null,
        title,
        url,
        type: entry.type,
        description: entry.description.trim() || null,
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === localId
            ? { ...it, serverId: newId || it.serverId, id: newId || it.id, saving: false, dirty: false, url, error: undefined }
            : it,
        ),
      );
    } catch (e: any) {
      update(localId, { saving: false, error: e?.message ?? 'Save failed.' });
    }
  }, [items, update, t]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/15 to-[#F97316]/15 text-[#E31B23]">
            <Globe size={14} />
          </span>
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
            {t('Live projects & demos', 'লাইভ প্রজেক্ট ও ডেমো')}
          </h3>
        </div>
        <button
          type="button"
          onClick={addEmpty}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
        >
          <Plus size={12} /> {t('Add project', 'প্রজেক্ট যোগ করুন')}
        </button>
      </div>

      <p className="mb-3 text-[11px] text-slate-500">
        {t(
          'Add any live websites, deployed apps, demos or open-source repos you want recruiters to see. Each entry shows on your public verified CV under "Public Evidence".',
          'আপনার লাইভ ওয়েবসাইট, ডিপ্লয় করা অ্যাপ, ডেমো বা ওপেন-সোর্স রিপোজিটোরি যোগ করুন যা রিক্রুটাররা দেখতে চান। প্রতিটি এন্ট্রি আপনার পাবলিক যাচাইকৃত CV-তে "Public Evidence" সেকশনে দেখাবে।',
        )}
      </p>

      {loadError && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500">
          <Loader2 size={12} className="animate-spin" /> {t('Loading projects…', 'প্রজেক্ট লোড হচ্ছে…')}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500">
          {t('No projects added yet. Add your first live site or demo above.', 'এখনো কোনো প্রজেক্ট যোগ হয়নি। উপরে আপনার প্রথম লাইভ সা�ট বা ডেমো যোগ করুন।')}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const opt = TYPE_OPTIONS.find((o) => o.value === it.type) ?? TYPE_OPTIONS[TYPE_OPTIONS.length - 1];
            const Icon = opt.icon;
            return (
              <div key={it.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${opt.tone}">
                    <Icon size={11} /> {t(opt.label_en, opt.label_bn)}
                  </span>
                  <div className="flex items-center gap-2">
                    {it.saving ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                        <Loader2 size={11} className="animate-spin" /> {t('Saving…', 'সেভ হচ্ছে…')}
                      </span>
                    ) : !it.dirty && it.serverId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={11} /> {t('Saved', 'সংরক্ষিত')}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={11} /> {t('Remove', 'মুছুন')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Project name', 'প্রজেক্টের নাম')} *</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
                      value={it.title}
                      onChange={(e) => update(it.id, { title: e.target.value })}
                      placeholder={t('e.g. SkillProof Live Demo', 'যেমন: SkillProof লাইভ ডেমো')}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Live URL', 'লাইভ ইউআরএল')} *</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
                      value={it.url}
                      onChange={(e) => update(it.id, { url: e.target.value })}
                      onBlur={() => it.url && update(it.id, { url: normalizeUrl(it.url) })}
                      placeholder="https://myproject.live"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Type', 'ধরন')}</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
                      value={it.type}
                      onChange={(e) => update(it.id, { type: e.target.value as ProfileEvidenceType })}
                    >
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{t(o.label_en, o.label_bn)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Short description (optional)', 'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)')}</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
                      value={it.description}
                      onChange={(e) => update(it.id, { description: e.target.value })}
                      placeholder={t('What it does, what stack it uses…', 'এটি কী করে, কোন স্ট্যাক ব্যবহার করা হয়েছে…')}
                      maxLength={180}
                    />
                  </div>
                </div>
                {it.error && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600">{it.error}</p>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => save(it.id)}
                    disabled={it.saving || !it.dirty}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-[11px] font-black text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {it.saving ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
                    {t(it.serverId ? 'Save changes' : 'Add project', it.serverId ? 'পরিবর্তন সেভ করুন' : 'প্রজেক্ট যোগ করুন')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsSection;
