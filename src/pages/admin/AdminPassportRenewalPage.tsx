
import { useCallback, useEffect, useMemo, useState, type Key as ReactKey } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, Search, ShieldCheck, XCircle } from 'lucide-react';
import {
  adminReviewPassportRenewal, getAllPassportRenewals,
} from '../../services/passports';
import { useRealtimeRefresh } from '../../services/realtime';
import type { PassportRenewalHistory } from '../../types/database';

type DecisionFilter = 'all' | 'pending' | 'renewed' | 'rejected';

export default function AdminPassportRenewalPage() {
  const [renewals, setRenewals] = useState<PassportRenewalHistory[]>([]);
  const [filter, setFilter] = useState<DecisionFilter>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PassportRenewalHistory | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllPassportRenewals(false);
      setRenewals(rows);
      setSelected((current) => (current ? rows.find((r) => r.id === current.id) ?? null : null));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load renewal requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh(['passport_renewal_history', 'skill_passports'], load);

  const filtered = useMemo(() => {
    return renewals
      .filter((r) => {
        if (filter === 'pending') return !r.decision;
        if (filter === 'renewed') return r.decision === 'renewed';
        if (filter === 'rejected') return r.decision === 'rejected';
        return true;
      })
      .filter((r) => !search || r.passport_id.toLowerCase().includes(search.toLowerCase()));
  }, [renewals, filter, search]);

  const pendingCount = useMemo(() => renewals.filter((r) => !r.decision).length, [renewals]);

  const decide = async (decision: 'renewed' | 'rejected') => {
    if (!selected) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminReviewPassportRenewal({
        renewalId: selected.id,
        decision,
        notes: notes.trim(),
      });
      setSuccess(`Renewal ${decision === 'renewed' ? 'approved' : 'rejected'}.`);
      setNotes('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save renewal decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <ShieldCheck className="text-amber-500" size={28} />
            Passport Renewals
          </h1>
          <p className="mt-1 text-sm text-gray-500">Review renewal requests and extend passport validity.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pending: <span className="font-semibold">{pendingCount}</span>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {success && <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="shrink-0" />{success}</div>}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by passport id..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as DecisionFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="pending">Pending only</option>
          <option value="renewed">Renewed</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading renewals...</div>
      )}
      {!loading && !filtered.length && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No renewal requests match this filter.
        </div>
      )}

      {!loading && !!filtered.length && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Passport</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Old Expiry</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  selected={selected?.id === row.id}
                  onSelect={() => { setSelected(row); setNotes(''); setError(''); setSuccess(''); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!selected ? (
          <p className="text-sm text-slate-500">Select a renewal request to review.</p>
        ) : (
          <Detail
            row={selected}
            busy={busy}
            notes={notes}
            setNotes={setNotes}
            onApprove={() => decide('renewed')}
            onReject={() => decide('rejected')}
          />
        )}
      </div>
    </div>
  );
}

function Row({ row, selected, onSelect }: { row: PassportRenewalHistory; selected: boolean; onSelect: () => void; key?: ReactKey }) {
  const tone =
    row.decision === 'renewed' ? 'bg-emerald-100 text-emerald-700'
    : row.decision === 'rejected' ? 'bg-rose-100 text-rose-700'
    : 'bg-amber-100 text-amber-700';
  return (
    <tr className={selected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}>
      <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs">{row.passport_id}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(row.requested_at).toLocaleString()}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{row.old_expiry ? new Date(row.old_expiry).toLocaleDateString() : '—'}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{row.decision ?? 'Pending'}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={onSelect} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Review</button>
      </td>
    </tr>
  );
}

function Detail({
  row, busy, notes, setNotes, onApprove, onReject,
}: {
  row: PassportRenewalHistory;
  busy: boolean;
  notes: string;
  setNotes: (s: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = !row.decision;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Renewal Review</h3>
          <p className="text-xs text-slate-500">Passport: <span className="font-mono">{row.passport_id}</span></p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          Requested {new Date(row.requested_at).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Old expiry" value={row.old_expiry ? new Date(row.old_expiry).toLocaleDateString() : '—'} />
        <Info label="New expiry (on approval)" value="Now + 2 years" />
        <Info label="Decision" value={row.decision ?? 'Pending'} />
        <Info label="Decided at" value={row.decided_at ? new Date(row.decided_at).toLocaleString() : '—'} />
      </div>

      {row.admin_notes && (
        <div>
          <p className="mb-1 text-sm font-semibold text-slate-700">Admin notes (previous)</p>
          <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{row.admin_notes}</p>
        </div>
      )}

      {isPending && (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Decision notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes the user should see."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={onApprove}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> Approve & Extend
            </button>
            <button
              disabled={busy}
              onClick={onReject}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <XCircle size={16} /> Reject
            </button>
            <div className="ml-auto inline-flex items-center gap-1 self-center text-xs text-slate-500">
              <Clock size={14} /> Approved = fresh 2-year validity.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}