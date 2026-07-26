/**
 * AdminEmployerVerificationsPage — Super Admin only.
 *
 * Lists every public passport verification attempt made via the
 * /verify portal. Each row shows: when, who, what passport, outcome,
 * IP, browser, device, country.
 */
import { useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, Search } from 'lucide-react';
import { useEmployerVerifications } from '../../services/employerVerifications';
import type { EmployerVerification } from '../../types/database';

const RESULT_OPTIONS: Array<{ value: EmployerVerification['result'] | 'all'; label: string }> = [
  { value: 'all', label: 'All results' },
  { value: 'verified', label: 'Verified' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
];

export default function AdminEmployerVerificationsPage() {
  const { rows, loading, refresh } = useEmployerVerifications(500);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<EmployerVerification['result'] | 'all'>('all');

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (resultFilter !== 'all' && row.result !== resultFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (row.passport_number || '').toLowerCase().includes(q) ||
        (row.verification_id || '').toLowerCase().includes(q) ||
        (row.ip_address || '').toLowerCase().includes(q) ||
        (row.browser || '').toLowerCase().includes(q) ||
        (row.device || '').toLowerCase().includes(q) ||
        (row.country || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, resultFilter]);

  const stats = useMemo(() => {
    const verified = rows.filter((r) => r.result === 'verified').length;
    const invalid = rows.filter((r) => r.result === 'invalid').length;
    const last24h = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
    return { verified, invalid, last24h, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Verification History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every public passport check performed via /verify. Audit-safe: rows are permanent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">{stats.total.toLocaleString()} total</span>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">{stats.verified.toLocaleString()} verified</span>
          <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">{stats.invalid.toLocaleString()} invalid</span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">{stats.last24h.toLocaleString()} last 24h</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IP, passport, browser..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
          Refresh
        </button>
      </div>

      {loading && rows.length === 0 && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading verifications...</div>}
      {!loading && filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No employer verifications yet.</div>}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Passport</th>
                  <th className="px-4 py-3">Verifier</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Browser</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.result === 'verified' ? 'bg-emerald-100 text-emerald-700' : row.result === 'expired' ? 'bg-amber-100 text-amber-700' : row.result === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{row.result}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">
                      {row.passport_number ? (
                        <a href={`/verify/${row.passport_number}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-blue-600">
                          {row.passport_number}<ExternalLink size={10} />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.verification_id ? row.verification_id.slice(0, 12) + '…' : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.country || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.browser || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.device || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}