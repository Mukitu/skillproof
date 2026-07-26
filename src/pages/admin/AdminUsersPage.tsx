import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Search, Shield, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  activateUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserPremium,
  setUserRole,
  suspendUser,
} from '../../services/admin';
import { useRealtimeRefresh } from '../../services/realtime';
import type { Profile } from '../../types/database';

const SUPER_ADMIN_EMAIL = 'mukituislamnishat@gmail.com';

type Dialog =
  | { kind: 'suspend'; user: Profile }
  | { kind: 'role'; user: Profile }
  | { kind: 'premium'; user: Profile }
  | { kind: 'password'; user: Profile; link?: string }
  | { kind: 'delete'; user: Profile }
  | null;

function isPremium(user: Profile) {
  return Boolean(user.premium_until && new Date(user.premium_until) > new Date());
}

function roleBadge(role: Profile['role']) {
  if (role === 'super_admin') return 'bg-purple-100 text-purple-800';
  if (role === 'admin') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

function Initials({ user }: { user: Profile }) {
  const value = (user.full_name || user.email || '?').trim();
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{value.slice(0, 2).toUpperCase()}</div>;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [premiumUntil, setPremiumUntil] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin'
    && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listUsers();
      // Normal Admins may manage normal users but cannot view or inspect other
      // Admin/Super Admin accounts. Super Admin sees all real profile rows.
      setUsers(isSuperAdmin ? rows : rows.filter((item) => item.role === 'user'));
      setError('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not load users.');
    } finally { setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('profiles', load);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((item) => {
      if (roleFilter && item.role !== roleFilter) return false;
      if (!normalized) return true;
      return item.full_name?.toLowerCase().includes(normalized)
        || item.email.toLowerCase().includes(normalized)
        || item.role.toLowerCase().includes(normalized);
    });
  }, [users, query, roleFilter]);

  const closeDialog = () => {
    if (busy) return;
    setDialog(null); setReason(''); setPremiumUntil('');
  };

  const perform = async (work: () => Promise<unknown>, message: string, removedId?: string) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await work();
      // Optimistically drop the row so the UI updates even if the post-delete
      // load is briefly blocked by stale RLS / token rotation.
      if (removedId) setUsers((current) => current.filter((item) => item.id !== removedId));
      await load();
      setSuccess(message);
      setDialog(null); setReason(''); setPremiumUntil('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The operation failed.');
    } finally { setBusy(false); }
  };

  const openPremium = (target: Profile) => {
    setPremiumUntil(target.premium_until ? target.premium_until.slice(0, 10) : '');
    setDialog({ kind: 'premium', user: target });
  };

  const canManage = (target: Profile) => {
    if (target.role === 'super_admin' || target.email.toLowerCase() === SUPER_ADMIN_EMAIL) return false;
    return isSuperAdmin || target.role === 'user';
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage real Supabase users, access levels, premium status and account lifecycle.</p>
      </div>

      {error && <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
      {success && <div className="flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><span>{success}</span><button onClick={() => setSuccess('')}><X size={16} /></button></div>}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Visible users</p><p className="mt-1 text-2xl font-semibold text-slate-800">{users.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Admins</p><p className="mt-1 text-2xl font-semibold text-blue-700">{users.filter((item) => item.role === 'admin').length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Suspended</p><p className="mt-1 text-2xl font-semibold text-orange-700">{users.filter((item) => item.is_suspended).length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Premium</p><p className="mt-1 text-2xl font-semibold text-amber-600">{users.filter(isPremium).length}</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or role…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600" disabled={!isSuperAdmin}>
            <option value="">All visible roles</option><option value="user">User</option>{isSuperAdmin && <option value="admin">Admin</option>}{isSuperAdmin && <option value="super_admin">Super Admin</option>}
          </select>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading real Supabase users…</div> : visibleUsers.length === 0 ? <div className="p-12 text-center"><UserRound size={34} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No users found.</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Premium</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((target) => {
                  const protectedAccount = target.role === 'super_admin' || target.email.toLowerCase() === SUPER_ADMIN_EMAIL;
                  const manageable = canManage(target);
                  return <tr key={target.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Initials user={target} /><div className="min-w-0"><Link to={`/admin/users/${target.id}`} className="block truncate font-medium text-slate-800 hover:text-blue-600">{target.full_name || 'Unnamed user'}</Link><span className="block truncate text-xs text-slate-500">{target.email}</span></div></div></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${roleBadge(target.role)}`}>{target.role === 'super_admin' ? <Crown size={12} /> : target.role === 'admin' ? <ShieldCheck size={12} /> : <UserRound size={12} />}{target.role.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3">{target.is_suspended ? <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">Suspended</span> : <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Active</span>}</td>
                    <td className="px-4 py-3">{isPremium(target) ? <span className="font-medium text-amber-600">Until {new Date(target.premium_until!).toLocaleDateString()}</span> : <span className="text-slate-400">Free</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(target.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                      {protectedAccount ? <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700"><Shield size={13} /> Protected</span> : <>
                        {manageable && (target.is_suspended ? <button disabled={busy} onClick={() => void perform(() => activateUser(target.id), `${target.email} activated.`)} className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Activate</button> : <button disabled={busy} onClick={() => setDialog({ kind: 'suspend', user: target })} className="rounded-md border border-orange-200 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40">Suspend</button>)}
                        {manageable && <button disabled={busy} onClick={() => openPremium(target)} className="rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40">Premium</button>}
                        {manageable && <button disabled={busy} onClick={() => setDialog({ kind: 'password', user: target })} className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40">Reset PW</button>}
                        {isSuperAdmin && <button disabled={busy} onClick={() => setDialog({ kind: 'role', user: target })} className="rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">{target.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>}
                        {isSuperAdmin && <button disabled={busy} onClick={() => setDialog({ kind: 'delete', user: target })} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40">Delete</button>}
                      </>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{dialog.kind === 'suspend' ? 'Suspend user' : dialog.kind === 'role' ? (dialog.user.role === 'admin' ? 'Remove Admin role' : 'Promote to Admin') : dialog.kind === 'premium' ? 'Premium status' : dialog.kind === 'password' ? 'Reset password' : 'Delete user'}</h2><p className="mt-0.5 text-xs text-slate-500">{dialog.user.email}</p></div><button onClick={closeDialog} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
          <div className="space-y-4 p-5">
            {dialog.kind === 'suspend' && <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Suspension reason</span><textarea autoFocus rows={3} required value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>}
            {dialog.kind === 'role' && <p className="text-sm text-slate-600">{dialog.user.role === 'admin' ? 'This removes Admin access and returns the account to a normal user.' : 'This grants Admin Dashboard and management access. It does not grant Super Admin privileges.'}</p>}
            {dialog.kind === 'premium' && <><label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Premium until</span><input type="date" value={premiumUntil} onChange={(event) => setPremiumUntil(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><p className="text-xs text-slate-500">Leave empty to revoke Premium.</p></>}
            {dialog.kind === 'password' && (dialog.link ? <div><p className="text-sm text-slate-600">Secure recovery link generated. Share it directly with the account owner:</p><input readOnly value={dialog.link} className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs" /></div> : <p className="text-sm text-slate-600">Generate a one-time Supabase password recovery link for this user?</p>)}
            {dialog.kind === 'delete' && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><strong>Permanent action.</strong> The Supabase Auth user, profile and owned storage objects will be deleted.</div>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button disabled={busy} onClick={closeDialog} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              {dialog.kind === 'suspend' && <button disabled={busy || !reason.trim()} onClick={() => void perform(() => suspendUser(dialog.user.id, reason.trim()), `${dialog.user.email} suspended.`)} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Suspend</button>}
              {dialog.kind === 'role' && <button disabled={busy} onClick={() => void perform(() => setUserRole(dialog.user.id, dialog.user.role === 'admin' ? 'user' : 'admin'), dialog.user.role === 'admin' ? 'Admin role removed.' : 'User promoted to Admin.')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Confirm</button>}
              {dialog.kind === 'premium' && <button disabled={busy} onClick={() => void perform(() => setUserPremium(dialog.user.id, premiumUntil ? new Date(`${premiumUntil}T23:59:59.999Z`).toISOString() : null), premiumUntil ? 'Premium status updated.' : 'Premium revoked.')} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save</button>}
              {dialog.kind === 'password' && !dialog.link && <button disabled={busy} onClick={() => { setBusy(true); setError(''); resetUserPassword(dialog.user.id).then((result) => setDialog({ ...dialog, link: result.link ?? '' })).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Reset failed.')).finally(() => setBusy(false)); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Generate link</button>}
              {dialog.kind === 'delete' && <button disabled={busy} onClick={() => void perform(() => deleteUser(dialog.user.id), `${dialog.user.email} permanently deleted.`, dialog.user.id)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Delete permanently</button>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}
