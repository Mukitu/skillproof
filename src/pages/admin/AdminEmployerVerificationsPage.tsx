
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Loader2,
  RefreshCcw, Search, X,
} from 'lucide-react';
import {
  getEmployerVerificationDetail,
  useEmployerVerifications,
  type EmployerVerificationListRow,
} from '../../services/employerVerifications';

const RESULT_OPTIONS: Array<{ value: 'all' | EmployerVerificationListRow['result']; label: string }> = [
  { value: 'all', label: 'All results' },
  { value: 'verified', label: 'Verified' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function resultBadgeClass(result: string) {
  switch (result) {
    case 'verified': return 'bg-emerald-100 text-emerald-700';
    case 'expired':  return 'bg-amber-100 text-amber-700';
    case 'suspended':return 'bg-rose-100 text-rose-700';
    default:         return 'bg-slate-100 text-slate-700';
  }
}

export default function AdminEmployerVerificationsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | EmployerVerificationListRow['result']>('all');
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<EmployerVerificationListRow | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search]);

  const { rows, loading, error, total, offset, next, prev, refresh } = useEmployerVerifications({
    search: debouncedSearch || undefined,
    result: resultFilter === 'all' ? undefined : resultFilter,
    pageSize,
  });

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetailLoading(true);
    getEmployerVerificationDetail(selected.id)
      .then((d) => setDetail(d))
      .catch((e) => console.error('[employer-verifications] detail failed', e))
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const stats = useMemo(() => {
    const verified = rows.filter((r) => r.result === 'verified').length;
    const invalid = rows.filter((r) => r.result === 'invalid').length;
    return { verified, invalid };
  }, [rows]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = total === 0 ? 0 : Math.min(offset + rows.length, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Verification History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every public passport check performed via /verify. Audit-safe, paginated, realtime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">{total.toLocaleString()} total</span>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">{stats.verified.toLocaleString()} verified (this page)</span>
          <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">{stats.invalid.toLocaleString()} invalid (this page)</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IP, passport, browser, city, country…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}/page</option>)}
        </select>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Passport</th>
                <th className="px-4 py-3">Verifier</th>
                <th className="px-4 py-3">Holder</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Browser / Device</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-sm text-slate-500"><Loader2 className="inline animate-spin mr-2" size={14} /> Loading verifications…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="p-10 text-center text-sm text-slate-500">No employer verifications match the current filter.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultBadgeClass(row.result)}`}>{row.result}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">
                    {row.passport_number ? (
                      <span className="inline-flex items-center gap-1">
                        {row.passport_number}
                        <a href={`/verify/${row.passport_number}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={10} />
                        </a>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.verification_id ? row.verification_id.slice(0, 12) + '…' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {row.passport_full_name || row.passport_email ? (
                      <div>
                        <p className="font-medium text-slate-800">{row.passport_full_name || '—'}</p>
                        <p className="text-[10px] text-slate-500">{row.passport_email || ''}</p>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{row.country || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{row.city || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{row.browser || '—'} <span className="text-slate-400">/ {row.device || '—'}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing <span className="font-mono">{pageStart.toLocaleString()}</span>–<span className="font-mono">{pageEnd.toLocaleString()}</span> of <span className="font-mono">{total.toLocaleString()}</span>
          </span>
          <div className="inline-flex items-center gap-2">
            <button onClick={() => prev()} disabled={offset === 0 || loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <ChevronLeft size={14} /> Prev
            </button>
            <span>Page <span className="font-mono">{currentPage.toLocaleString()}</span> / <span className="font-mono">{pageCount.toLocaleString()}</span></span>
            <button onClick={() => next()} disabled={offset + pageSize >= total || loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {}
      {selected && (
        <DetailDrawer
          row={selected}
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DetailDrawer({
  row, detail, loading, onClose,
}: {
  row: EmployerVerificationListRow;
  detail: any | null;
  loading: boolean;
  onClose: () => void;
}) {
  const verification = detail?.verification ?? null;
  const passport = detail?.passport ?? null;
  const user = detail?.user ?? null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Verification</p>
            <h3 className="text-base font-semibold text-slate-900">{row.passport_number || row.id.slice(0, 8)}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-700">
          {loading && (
            <p className="flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading detail…</p>
          )}
          {!loading && (
            <>
              <Section title="Outcome">
                <Field label="Result" value={
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultBadgeClass(row.result)}`}>{row.result}</span>
                } />
                <Field label="Verification ID" value={<span className="font-mono text-xs">{row.verification_id ?? '—'}</span>} />
                <Field label="Created at" value={new Date(row.created_at).toLocaleString()} />
                <Field label="IP address" value={<span className="font-mono text-xs">{verification?.ip_address ?? row.ip_address ?? '—'}</span>} />
              </Section>

              <Section title="Network">
                <Field label="Country" value={row.country ?? '—'} />
                <Field label="Region" value={row.region ?? '—'} />
                <Field label="City" value={row.city ?? '—'} />
                <Field label="Browser" value={row.browser ?? '—'} />
                <Field label="Device" value={row.device ?? '—'} />
                <Field label="User agent" value={<span className="break-all font-mono text-[11px]">{row.user_agent ?? '—'}</span>} />
                <Field label="Referer" value={<span className="break-all font-mono text-[11px]">{row.referer ?? '—'}</span>} />
              </Section>

              <Section title="Passport">
                <Field label="Passport #" value={row.passport_number ?? '—'} />
                <Field label="Status" value={passport?.status ?? row.passport_status ?? '—'} />
                <Field label="Title" value={passport?.title ?? row.passport_title ?? '—'} />
                <Field label="Holder" value={[user?.full_name, user?.email].filter(Boolean).join(' — ') || '—'} />
                <Field label="Skill" value={passport?.skill_id ?? '—'} />
                <Field label="Category" value={passport?.category_id ?? '—'} />
              </Section>

              {user && (
                <Section title="Account">
                  <Field label="ID" value={<span className="font-mono text-xs">{user.id}</span>} />
                  <Field label="Email" value={user.email ?? '—'} />
                  <Field label="Full name" value={user.full_name ?? '—'} />
                  <Field label="Role" value={user.role ?? '—'} />
                  <Field label="Suspended" value={user.is_suspended ? 'Yes' : 'No'} />
                </Section>
              )}
            </>
          )}
        </div>
        <div className="border-t border-slate-200 p-3 text-right">
          {row.passport_number && (
            <a href={`/verify/${row.passport_number}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Open public verification <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 text-sm">
      <span className="w-32 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex-1 break-all text-slate-800">{value}</span>
    </div>
  );
}
