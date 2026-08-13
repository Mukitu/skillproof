
import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { listAuditLogs, listAuditActions, listAuditEntityTypes } from '../../services/audit';
import { useRealtimeRefresh } from '../../services/realtime';
import type { AuditLog } from '../../types/database';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const pageSize = 25;

  const [actionsList, setActionsList] = useState<string[]>([]);
  const [entityTypesList, setEntityTypesList] = useState<string[]>([]);

  const load = async () => {
    try { setLogs(await listAuditLogs({
      action: action || undefined,
      entityType: entityType || undefined,
      actorEmail: actorEmail || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    })); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let cancelled = false;
    // Pull the full set of distinct actions/entity_types from the DB so the
    // dropdowns are stable even after the user filters down to a single
    // action. Falls back to deriving from the loaded page on error.
    Promise.all([listAuditActions().catch(() => []), listAuditEntityTypes().catch(() => [])])
      .then(([a, t]) => {
        if (cancelled) return;
        setActionsList(Array.isArray(a) ? a.filter(Boolean) : []);
        setEntityTypesList(Array.isArray(t) ? t.filter(Boolean) : []);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void load(); }, [action, entityType, actorEmail, fromDate, toDate]);
  useRealtimeRefresh('audit_logs', load);

  // Use the metadata-derived lists when the DB list is empty (e.g. RPC not
  // present in this env). This keeps the dropdowns usable in both cases.
  const actions = actionsList.length
    ? actionsList
    : Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort();
  const entityTypes = entityTypesList.length
    ? entityTypesList
    : Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean))).sort();

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.actor_email || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.entity_type || '').toLowerCase().includes(q) ||
      (l.entity_id || '').toLowerCase().includes(q) ||
      (l.ip || '').toString().includes(q) ||
      (l.user_agent || '').toLowerCase().includes(q) ||
      JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
        <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500 break-words">Enterprise audit trail of every admin and user action.</p>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">{filtered.length.toLocaleString()} entries</span>
        </div>
      </div>

      {}
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anywhere…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100" />
        </div>
        <input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} placeholder="Actor email contains…" className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100" />
        <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100">
          <option value="">All tables</option>
          {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-1">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Table</th>
              <th className="p-3">Record</th>
              <th className="p-3">Old → New</th>
              <th className="p-3">IP</th>
              <th className="p-3">Browser</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {slice.map((l) => {
              const isOpen = expanded.has(l.id);
              const hasDiff = l.old_value || l.new_value;
              return (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3 text-xs">{l.actor_email || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{l.action}</span></td>
                  <td className="p-3 text-xs">{l.entity_type}</td>
                  <td className="p-3 text-xs font-mono text-gray-500">{l.entity_id ? String(l.entity_id).slice(0, 12) : '—'}</td>
                  <td className="p-3 text-xs">
                    {hasDiff ? (
                      <button onClick={() => toggleExpand(l.id)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-gray-50">
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        View diff
                      </button>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3 text-xs font-mono text-gray-600">{l.ip || <span className="text-gray-400">—</span>}</td>
                  <td className="p-3 text-xs">{l.browser || <span className="text-gray-400">—</span>}</td>
                </tr>
              );
            })}
            {!slice.length && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">No audit entries match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      {expanded.size > 0 && (
        <div className="space-y-2">
          {slice.filter((l) => expanded.has(l.id)).map((l) => (
            <div key={l.id} className="rounded-lg border bg-gray-50 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{l.action} · {l.entity_type} · {l.entity_id}</span>
                <button onClick={() => toggleExpand(l.id)} className="text-blue-600 hover:underline">Close</button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-red-700">Old value</div>
                  <pre className="overflow-x-auto rounded bg-white p-2">{l.old_value ? JSON.stringify(l.old_value, null, 2) : '—'}</pre>
                </div>
                <div>
                  <div className="mb-1 text-green-700">New value</div>
                  <pre className="overflow-x-auto rounded bg-white p-2">{l.new_value ? JSON.stringify(l.new_value, null, 2) : '—'}</pre>
                </div>
              </div>
              {l.metadata && Object.keys(l.metadata).length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-gray-700">Metadata</div>
                  <pre className="overflow-x-auto rounded bg-white p-2">{JSON.stringify(l.metadata, null, 2)}</pre>
                </div>
              )}
              {l.user_agent && (
                <div className="mt-2 text-gray-500">UA: {l.user_agent}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length === 0
            ? 'No entries to display'
            : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Prev</button>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}