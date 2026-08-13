
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, ExternalLink, Eye, FileText, Hash, History, Image as ImageIcon,
  Loader2, RotateCcw, Search, ShieldCheck, ShieldOff, Sparkles, X, XCircle, Zap,
} from 'lucide-react';
import { useRealtimeRefresh } from '../../services/realtime';
import {
  adminListCertificates, adminReissueCertificate, adminRestoreCertificate,
  adminRevokeCertificate, getCertificateAnalytics, getCertificateHistory,
  type AdminListCertificatesResult,
} from '../../services/courseCertificates';
import { downloadCertificatePng, downloadCertificatePdf } from '../../services/certificateDownload';
import { getPublicCertificateUrl } from '../../utils/certificateUrl';
import type {
  CertificateActionHistory, CertificateAnalytics, CourseCertificate,
  CourseCertificateStatus, CourseCertificateWithContext, PublicCertificateBundle,
} from '../../types/database';

type StatusFilter = 'all' | 'Active' | 'Revoked' | 'Superseded';

export default function AdminCourseCertificatesPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [result, setResult] = useState<AdminListCertificatesResult>({ rows: [], total: 0 });
  const [analytics, setAnalytics] = useState<CertificateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [active, setActive] = useState<CourseCertificateWithContext | null>(null);
  const [history, setHistory] = useState<CertificateActionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, ana] = await Promise.all([
        adminListCertificates({
          search: search.trim() || undefined,
          status: filter,
          page,
          pageSize,
        }),
        getCertificateAnalytics().catch(() => null),
      ]);
      setResult(list);
      setAnalytics(ana);
    } catch (e: any) {
      setError(e?.message || 'Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  }, [search, filter, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  
  useRealtimeRefresh(
    ['course_certificates', 'certificate_action_history'],
    () => { void load(); },
  );

  
  useEffect(() => {
    if (!active) { setHistory([]); return; }
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      try {
        const rows = await getCertificateHistory(active.id);
        if (!cancelled) setHistory(rows);
      } catch (e) {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active?.id]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((result.total || 0) / pageSize)),
    [result.total, pageSize],
  );

  const onReissue = async (cert: CourseCertificate) => {
    const reason = window.prompt(`Reissue ${cert.credential_number}? Reason:`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await adminReissueCertificate(cert.id, reason.trim());
      setSuccess(`Certificate reissued. New credential: ${updated.credential_number}.`);
      setActive(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reissue failed.');
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (cert: CourseCertificateWithContext) => {
    const reason = window.prompt(`Revoke ${cert.credential_number}? Reason:`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await adminRevokeCertificate(cert.id, reason.trim());
      setSuccess(`Certificate revoked.`);
      setActive(mergeContext(cert, updated));
      await load();
    } catch (e: any) {
      setError(e?.message || 'Revoke failed.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async (cert: CourseCertificateWithContext) => {
    const reason = window.prompt(`Restore ${cert.credential_number}? Reason:`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await adminRestoreCertificate(cert.id, reason.trim());
      setSuccess(`Certificate restored.`);
      setActive(mergeContext(cert, updated));
      await load();
    } catch (e: any) {
      setError(e?.message || 'Restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (cert: CourseCertificate, format: 'pdf' | 'png') => {
    try {
      const bundle = toBundle(cert);
      if (format === 'pdf') await downloadCertificatePdf(bundle);
      else await downloadCertificatePng(bundle);
      setSuccess(`Downloaded ${format.toUpperCase()}.`);
      setTimeout(() => setSuccess(''), 1800);
    } catch (e: any) {
      setError(e?.message || 'Download failed.');
    }
  };

  
  
  
  
  const mergeContext = (
    prev: CourseCertificateWithContext,
    next: CourseCertificate,
  ): CourseCertificateWithContext => ({
    ...prev,
    ...next,
  });

  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Course Certificates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Issued automatically when an admin approves a roadmap completion. Manage reissues, revocations, and restores.
        </p>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0" />{success}
        </div>
      )}

      {}
      {analytics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Tile icon={Award} label="Total" value={analytics.total_certificates} color="bg-blue-500" />
          <Tile icon={CheckCircle2} label="Active" value={analytics.active_certificates} color="bg-emerald-500" />
          <Tile icon={XCircle} label="Revoked" value={analytics.revoked_certificates} color="bg-rose-500" />
          <Tile icon={Sparkles} label="This Month" value={analytics.certificates_this_month} color="bg-amber-500" />
          <Tile icon={Download} label="Downloads" value={analytics.total_downloads} color="bg-indigo-500" />
          <Tile icon={Eye} label="Verifications" value={analytics.total_verifications} color="bg-purple-500" />
          <Tile icon={ShieldCheck} label="Verified" value={analytics.verified_verifications} color="bg-teal-500" />
        </div>
      )}

      {}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search credential, name, roadmap, category..."
            className="w-64 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['all', 'Active', 'Revoked', 'Superseded'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                filter === f ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">
          {result.total} total · page {page + 1} of {totalPages}
        </span>
      </div>

      {}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Loading certificates...
          </div>
        ) : result.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No certificates match the current filter.
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Credential</th>
                <th className="px-4 py-2 text-left">Holder</th>
                <th className="px-4 py-2 text-left">Roadmap</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Issued</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setActive(row)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Hash size={11} className="text-slate-400" /> {row.credential_number}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {row.user_avatar_url ? (
                        <img src={row.user_avatar_url} alt={row.user_full_name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-600 text-xs font-bold text-white">
                          {initials(row.user_full_name)}
                        </div>
                      )}
                      <span className="font-medium text-slate-900">{row.user_full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{row.roadmap_title}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {row.category_name ?? '—'}
                    {row.sub_category_name ? <span className="text-slate-400"> · {row.sub_category_name}</span> : null}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600">{fmtDate(row.issue_date)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActive(row); }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={12} /> Previous
          </button>
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, result.total)} of {result.total}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}

      {}
      {active && (
        <DetailDrawer
          cert={active}
          history={history}
          historyLoading={historyLoading}
          busy={busy}
          onClose={() => setActive(null)}
          onReissue={() => onReissue(active)}
          onRevoke={() => onRevoke(active)}
          onRestore={() => onRestore(active)}
          onDownload={(fmt) => onDownload(active, fmt)}
        />
      )}
    </div>
  );
}





function DetailDrawer({
  cert, history, historyLoading, busy, onClose, onReissue, onRevoke, onRestore, onDownload,
}: {
  cert: CourseCertificateWithContext;
  history: CertificateActionHistory[];
  historyLoading: boolean;
  busy: boolean;
  onClose: () => void;
  onReissue: () => void;
  onRevoke: () => void;
  onRestore: () => void;
  onDownload: (fmt: 'pdf' | 'png') => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificate</p>
            <h2 className="font-mono text-sm font-bold text-slate-900">{cert.credential_number}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {cert.user_avatar_url ? (
              <img src={cert.user_avatar_url} alt={cert.user_full_name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-600 text-base font-bold text-white">
                {initials(cert.user_full_name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{cert.user_full_name}</p>
              <p className="text-xs text-slate-500">{cert.roadmap_title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <StatusBadge status={cert.status} />
                {cert.category_name && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    {cert.category_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 gap-2">
            <Info label="Roadmap Started" value={fmtDate(cert.roadmap_started_at)} />
            <Info label="Completed" value={fmtDate(cert.completion_date)} />
            <Info label="Issued" value={fmtDate(cert.issue_date)} />
            <Info label="Duration" value={`${cert.completion_duration_days} days`} />
            <Info label="Downloads" value={String(cert.download_count ?? 0)} />
            <Info label="Verifications" value={String(cert.verification_count ?? 0)} />
          </div>

          {}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verification Anchor</p>
            <Info label="UUID" value={cert.verification_uuid} mono />
            <Info label="Verification Hash" value={cert.verification_hash} mono />
            <Info label="Certificate Hash" value={cert.certificate_hash} mono />
          </div>

          {}
          {cert.admin_name_snapshot && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved By</p>
              <p className="mt-1 font-bold text-slate-900">{cert.admin_name_snapshot}</p>
              {cert.admin_feedback && (
                <p className="mt-1 italic text-slate-600">"{cert.admin_feedback}"</p>
              )}
            </div>
          )}

          {}
          {cert.status === 'Revoked' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Revoked</p>
              <p className="mt-1 text-rose-800">{cert.revoked_reason ?? '—'}</p>
              {cert.revoked_at && (
                <p className="mt-1 text-[11px] text-rose-600">{fmtDate(cert.revoked_at)}</p>
              )}
            </div>
          )}

          {}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <a
              href={`/certificate/${encodeURIComponent(cert.credential_number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow hover:opacity-95"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public Page
            </a>
            <button
              disabled={busy}
              onClick={() => onDownload('pdf')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              disabled={busy}
              onClick={() => onDownload('png')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" /> PNG
            </button>
            {cert.status === 'Active' && (
              <>
                <button
                  disabled={busy}
                  onClick={onReissue}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" /> Reissue
                </button>
                <button
                  disabled={busy}
                  onClick={onRevoke}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Revoke
                </button>
              </>
            )}
            {cert.status === 'Revoked' && (
              <button
                disabled={busy}
                onClick={onRestore}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
            )}
          </div>

          {}
          <section className="border-t border-slate-200 pt-3">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <History className="w-4 h-4" /> Action History ({history.length})
            </h3>
            {historyLoading ? (
              <p className="text-xs text-slate-500"><Loader2 size={12} className="inline animate-spin" /> Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500">No actions recorded yet.</p>
            ) : (
              <ol className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.action}</span>
                      <span className="text-[10px] text-slate-500">{fmtDate(h.created_at)}</span>
                    </div>
                    {h.actor_name_snapshot && (
                      <p className="text-[11px] text-slate-600">by {h.actor_name_snapshot}</p>
                    )}
                    {h.reason && (
                      <p className="mt-1 text-[11px] text-slate-600">"{h.reason}"</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}





function Tile({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`rounded-lg p-2 ${color}`}><Icon size={16} className="text-white" /></div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xs font-bold text-slate-900 break-all ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CourseCertificateStatus }) {
  const cls = status === 'Active'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'Revoked'
    ? 'bg-rose-100 text-rose-700'
    : 'bg-slate-200 text-slate-700';
  const Icon = status === 'Active' ? CheckCircle2 : status === 'Revoked' ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return '—'; }
}

function initials(name: string): string {
  return (name ?? 'SP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}


function toBundle(cert: CourseCertificate): PublicCertificateBundle {
  return {
    result: cert.status === 'Active' ? 'verified' : 'revoked',
    credential_number: cert.credential_number,
    verification_token: cert.verification_token,
    verification_uuid: cert.verification_uuid,
    verification_hash: cert.verification_hash,
    certificate_hash: cert.certificate_hash,
    status: cert.status,
    user_full_name: cert.user_full_name,
    user_avatar_url: cert.user_avatar_url,
    roadmap_title: cert.roadmap_title,
    category_name: cert.category_name,
    sub_category_name: cert.sub_category_name,
    roadmap_started_at: cert.roadmap_started_at,
    completion_date: cert.completion_date,
    issue_date: cert.issue_date,
    completion_duration_days: cert.completion_duration_days,
    admin_name_snapshot: cert.admin_name_snapshot,
    admin_feedback: cert.admin_feedback,
    revoked_reason: cert.revoked_reason,
    revoked_at: cert.revoked_at,
  };
}