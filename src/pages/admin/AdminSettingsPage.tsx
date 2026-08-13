import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  getGovernanceContext, setSuperAdminEmail,
} from '../../services/rbac';
import { listAdminProfiles } from '../../services/admin';

export default function AdminSettingsPage() {
  const [ctx, setCtx] = useState<{
    is_super_admin: boolean; super_admin_email: string; current_user_email: string | null;
  } | null>(null);
  const [admins, setAdmins] = useState<{ id: string; email: string; is_suspended: boolean; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, profiles] = await Promise.all([getGovernanceContext(), listAdminProfiles()]);
      setCtx({
        is_super_admin: g.is_super_admin,
        super_admin_email: g.super_admin_email,
        current_user_email: g.current_user_email,
      });
      setAdmins(profiles);
      setEmail(g.super_admin_email);
    } catch (e: any) {
      setError(e?.message || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const candidates = useMemo(() => admins.filter((a) => !a.is_suspended && a.email.toLowerCase() !== (ctx?.super_admin_email ?? '')), [admins, ctx]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (email.toLowerCase() === (ctx?.super_admin_email ?? '').toLowerCase()) {
      setError('Pick a different email — that is already the current Super Admin.');
      return;
    }
    setError('');
    setConfirmText('');
    setConfirmOpen(true);
  }

  async function performTransfer() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setSuperAdminEmail(email);
      setSuccess(`Super Admin transferred to ${email}.`);
      setConfirmOpen(false);
      setConfirmText('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not transfer Super Admin.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !ctx) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  if (ctx && !ctx.is_super_admin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">Admin Settings are restricted</h1>
        <p className="mt-2 text-sm text-amber-800">
          Only the configured Super Admin (<span className="font-mono">{ctx.super_admin_email}</span>) can manage these settings.
        </p>
      </div>
    );
  }

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
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-[11px] font-bold uppercase tracking-wider text-fuchsia-700">
            <ShieldCheck className="w-3 h-3" /> Super Admin Only
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Admin Settings</h1>
          <p className="mt-1 text-sm text-slate-500 break-words">Platform-wide Super Admin configuration. Every action is enforced server-side.</p>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="shrink-0" />{success}</div>}

      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 text-fuchsia-700" />
          <div>
            <h2 className="text-lg font-semibold text-fuchsia-900">Super Admin account</h2>
            <p className="mt-1 text-sm text-fuchsia-800">
              Currently configured as <span className="font-mono">{ctx?.super_admin_email ?? '—'}</span>. Signed in as <span className="font-mono">{ctx?.current_user_email ?? '—'}</span>.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new-super-admin@example.com"
            className="rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Pick an existing admin…</option>
            {candidates.map((c) => <option key={c.id} value={c.email}>{c.email} — {c.role}</option>)}
          </select>
          <button
            type="submit"
            disabled={busy || !email || email.toLowerCase() === (ctx?.super_admin_email ?? '')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
            Transfer
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Admins in this org</h2>
        <p className="mt-1 text-sm text-slate-500">Suspended admins cannot be promoted to Super Admin.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-800">{a.email}</span>
              <span className="text-xs text-slate-500">{a.role}{a.is_suspended ? ' · suspended' : ''}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Super Admin transfer confirmation */}
      {confirmOpen && ctx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 px-5 py-4">
              <ShieldOff size={18} className="mt-0.5 shrink-0 text-rose-700" />
              <div>
                <h2 className="font-semibold text-rose-900">Confirm Super Admin transfer</h2>
                <p className="mt-1 text-xs text-rose-800">
                  This is <strong>irreversible from the UI</strong>. <span className="font-mono">{ctx.super_admin_email}</span> will be demoted to admin, and <span className="font-mono">{email}</span> will become the sole Super Admin.
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-700">To proceed, type the word <strong className="font-mono">TRANSFER</strong> below:</p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="TRANSFER"
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button type="button" onClick={() => { setConfirmOpen(false); setConfirmText(''); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={busy || confirmText.trim().toUpperCase() !== 'TRANSFER'}
                onClick={() => void performTransfer()}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 disabled:opacity-40"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                I understand, transfer Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}