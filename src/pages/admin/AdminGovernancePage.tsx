/**
 * AdminGovernancePage — Super Admin only.
 *
 *  - Create new admins (by email)
 *  - Promote / demote / suspend / unsuspend admin accounts
 *  - Grant / revoke granular permissions per admin
 *  - View the full set of permissions in a matrix layout
 *
 * The page is gated to the designated Super Admin email on the server
 * (see server/routes/governance.ts). The UI also hides itself from other
 * admins.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Shield, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ALL_PERMISSIONS, PERMISSION_LABELS, createAdmin, listAdminPermissions,
  removeAdmin, setAdminPermission, setAdminSuspended,
} from '../../services/rbac';
import { listAdminProfiles } from '../../services/admin';
import { useRealtimeRefresh } from '../../services/realtime';
import type { AdminPermission, AdminPermissionKey, Profile } from '../../types/database';

const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mukituislamnishat@gmail.com').toLowerCase();

export default function AdminGovernancePage() {
  const { profile, role } = useAuth();
  const isSuperAdmin = (role === 'super_admin') && profile?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const [admins, setAdmins] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Record<string, AdminPermission[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminProfiles();
      setAdmins(rows);
      const map: Record<string, AdminPermission[]> = {};
      await Promise.all(rows.map(async (row) => {
        map[row.id] = await listAdminPermissions(row.id);
      }));
      setPermissions(map);
    } catch (e: any) {
      setError(e?.message || 'Could not load admins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('admin_permissions', load);
  useRealtimeRefresh('profiles', load);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, AdminPermissionKey[]> = {};
    for (const perm of ALL_PERMISSIONS) {
      const meta = PERMISSION_LABELS[perm];
      if (!groups[meta.group]) groups[meta.group] = [];
      groups[meta.group].push(perm);
    }
    return groups;
  }, []);

  const groupEntries = useMemo(
    () => Object.entries(groupedPermissions) as Array<[string, AdminPermissionKey[]]>,
    [groupedPermissions],
  );

  async function handleCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const fullName = String(form.get('full_name') || '').trim();
    if (!email) {
      setError('Email is required.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await createAdmin(email, fullName || undefined);
      setSuccess(`Admin created for ${email}.`);
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not create admin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(admin: Profile) {
    if (!confirm(`Remove admin status from ${admin.email}?`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await removeAdmin(admin.id);
      setSuccess(`Admin status removed for ${admin.email}.`);
      if (selected?.id === admin.id) setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not remove admin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend(admin: Profile, suspended: boolean) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setAdminSuspended(admin.id, suspended);
      setSuccess(`Admin ${suspended ? 'suspended' : 'activated'}: ${admin.email}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not update admin status.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePermission(admin: Profile, permission: AdminPermissionKey, grant: boolean) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await setAdminPermission(admin.id, permission, grant);
      setSuccess(`Permission ${grant ? 'granted' : 'revoked'}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not update permission.');
    } finally {
      setBusy(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">Governance panel is restricted</h1>
        <p className="mt-2 text-sm text-amber-800">
          Only the designated Super Admin (<span className="font-mono">{SUPER_ADMIN_EMAIL}</span>) can manage admins and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governance & RBAC</h1>
          <p className="mt-1 text-sm text-gray-500">
            Promote admins, manage permissions, and audit every privileged action.
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {admins.length} admin{admins.length === 1 ? '' : 's'} in this org
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="shrink-0" />{success}</div>}

      {/* Create admin */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create new admin</h2>
        <p className="mt-1 text-sm text-slate-500">Promote an existing user to admin by email. The user must already have an account.</p>
        <form onSubmit={handleCreateAdmin} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="email" type="email" required placeholder="admin@example.com" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="full_name" type="text" placeholder="Full name (optional)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create admin
          </button>
        </form>
      </div>

      {/* Admin list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !admins.length && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500"><Loader2 className="inline animate-spin mr-2" size={14} /> Loading admins...</td></tr>
              )}
              {!loading && admins.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500">No admins found. Use the form above to create one.</td></tr>
              )}
              {admins.map((admin) => {
                const granted = (permissions[admin.id] ?? []).map((p) => p.permission);
                const isSelected = selected?.id === admin.id;
                const isSuper = admin.role === 'super_admin';
                return (
                  <tr key={admin.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{admin.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{admin.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isSuper ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-blue-100 text-blue-700'}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${admin.is_suspended ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {admin.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {isSuper ? <span className="font-semibold text-fuchsia-700">All (super admin)</span> : <span>{granted.length} granted</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelected(admin)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Permissions</button>
                        {!isSuper && !admin.is_suspended && (
                          <button onClick={() => void handleSuspend(admin, true)} disabled={busy} className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"><UserX size={12} className="inline mr-1" />Suspend</button>
                        )}
                        {!isSuper && admin.is_suspended && (
                          <button onClick={() => void handleSuspend(admin, false)} disabled={busy} className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><UserCheck size={12} className="inline mr-1" />Activate</button>
                        )}
                        {!isSuper && (
                          <button onClick={() => void handleRemove(admin)} disabled={busy} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><ShieldOff size={12} className="inline mr-1" />Demote</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission matrix */}
      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Permissions for {selected.full_name || selected.email}</h2>
              <p className="text-xs text-slate-500">Toggle permissions on/off. Audit row is written for every change.</p>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Close</button>
          </div>
          {selected.role === 'super_admin' ? (
            <div className="flex items-center gap-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-800">
              <ShieldCheck size={18} /> Super Admin implicitly has all permissions.
            </div>
          ) : (
            <div className="space-y-5">
              {groupEntries.map(([group, perms]) => (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm) => {
                      const granted = (permissions[selected.id] ?? []).some((p) => p.permission === perm);
                      return (
                        <button
                          key={perm}
                          onClick={() => void handleTogglePermission(selected, perm, !granted)}
                          disabled={busy}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all disabled:opacity-50 ${granted ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            {granted ? <ShieldCheck size={16} className="text-emerald-600" /> : <Shield size={16} className="text-slate-400" />}
                            {PERMISSION_LABELS[perm].label}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${granted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {granted ? 'Granted' : 'Off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}