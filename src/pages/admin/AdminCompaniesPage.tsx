import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Download,
  FileText,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  Info,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  adminListCompanies,
  adminGetCompany,
  adminApproveCompany,
  adminRejectCompany,
  adminSuspendCompany,
  adminSetCompanyPremium,
  createCompanySignedDocumentUrl,
  adminListCompanyFeatures,
  adminSetCompanyFeature,
  isCompanyPremium,
  COMPANY_STATUS_LABELS,
  COMPANY_DOCUMENT_TYPE_LABELS,
  type CompanyStatus,
  type CompanyAdminListRow,
  type CompanyWithDocuments,
  type CompanyFeatureToggle,
  adminDeleteCompany,
  adminDeleteCompanyStoragePaths,
  type AdminDeleteCompanyResult,
} from '../../services/companies';

const STATUS_FILTERS: Array<{ value: CompanyStatus | 'all'; en: string; bn: string }> = [
  { value: 'all',              en: 'All',                 bn: 'সব' },
  { value: 'PENDING_OTP',      en: 'Awaiting OTP',        bn: 'OTP অপেক্ষমাণ' },
  { value: 'PENDING_APPROVAL', en: 'Awaiting Review',     bn: 'অনুমোদনের অপেক্ষায়' },
  { value: 'APPROVED',         en: 'Approved',            bn: 'অনুমোদিত' },
  { value: 'REJECTED',         en: 'Rejected',            bn: 'প্রত্যাখ্যাত' },
  { value: 'SUSPENDED',        en: 'Suspended',           bn: 'স্থগিত' },
];

export const AdminCompaniesPage: React.FC = () => {
  const { language } = useLanguage();

  const [rows, setRows] = useState<CompanyAdminListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | 'all'>('all');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize] = useState(25);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyWithDocuments | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionPending, setActionPending] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const [premiumUntilInput, setPremiumUntilInput] = useState<string>('');
  const [premiumSaving, setPremiumSaving] = useState<boolean>(false);

  const [features, setFeatures] = useState<CompanyFeatureToggle[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CompanyAdminListRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deletePending, setDeletePending] = useState<boolean>(false);
  const [deleteResult, setDeleteResult] = useState<AdminDeleteCompanyResult | null>(null);

  const load = useCallback(async (off = offset) => {
    setLoading(true);
    setError(null);
    try {
      const page = await adminListCompanies({
        search: search.trim() || undefined,
        status: filterStatus === 'all' ? null : filterStatus,
        offset: off,
        limit: pageSize,
      });
      setRows(page.rows);
      setTotal(page.total);
      setOffset(off);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, pageSize, offset]);

  useEffect(() => {
    const t = setTimeout(() => { void load(0); }, 250);
    return () => clearTimeout(t);

  }, [search, filterStatus]);

  // Auto-dismiss the success banner after a few seconds so it doesn't
  // linger across filter changes.
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    try {
      const list = await adminListCompanyFeatures();
      setFeatures(list);
    } catch {
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatures();
  }, [loadFeatures]);

  const handleToggleFeature = async (key: string, enabled: boolean) => {
    setFeatureSaving(key);
    try {
      const updated = await adminSetCompanyFeature(key, enabled);
      setFeatures((prev) => {
        const exists = prev.some((f) => f.feature_key === updated.feature_key);
        if (exists) return prev.map((f) => (f.feature_key === updated.feature_key ? updated : f));
        return [...prev, updated];
      });
    } catch (err: any) {
      alert(err?.message ?? 'Could not update feature flag.');
    } finally {
      setFeatureSaving(null);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    // Only clear premium input when switching to a different company — avoid
    // clobbering it mid-fetch when the user re-clicks the same row.
    setPremiumUntilInput((current) => current);
    setDetailLoading(true);
    try {
      const d = await adminGetCompany(id);
      setDetail(d);
      if (d?.company?.premium_until) {
        try {
          const dt = new Date(d.company.premium_until);
          if (!Number.isNaN(dt.getTime())) {
            // <input type="datetime-local"> expects YYYY-MM-DDTHH:mm in LOCAL time
            const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setPremiumUntilInput(local);
          }
        } catch {}
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load company');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setRejectReason('');
    setSuspendReason('');
    setPremiumUntilInput('');
  };

  const handleApprove = async (id: string) => {
    if (!confirm(language === 'bn' ? 'কোম্পানি অনুমোদন করবেন?' : 'Approve this company?')) return;
    setActionPending(id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApproveCompany(id);
      setSuccessMsg(language === 'bn' ? 'কোম্পানি অনুমোদিত হয়েছে।' : 'Company approved.');
      // Reset to page 0 so the just-approved row is visible (it may
      // disappear from the current filter if the user is on a non-ALL
      // status filter).
      await load(0);
      if (selectedId === id) await openDetail(id);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to approve');
    } finally {
      setActionPending(null);
    }
  };

  const handleReject = async (id: string, opts?: { reasonOverride?: string; fromModal?: boolean }) => {
    // Two entry points:
    //   1. Modal "Reject" button → use the typed `rejectReason` state.
    //   2. Row-level "Reject" button → the modal is closed so `rejectReason`
    //      is empty. We must either ask for a reason inline OR fall back to
    //      a default reason. Inline `prompt` keeps the destructive action
    //      safe even when the admin clicks from the list directly.
    const inlineReason = !opts?.fromModal && !opts?.reasonOverride
      ? window.prompt(language === 'bn' ? 'প্রত্যাখ্যানের কারণ লিখুন (ঐচ্ছিক):' : 'Reason for rejection (optional):', '') ?? undefined
      : undefined;
    const reason = (opts?.reasonOverride ?? rejectReason).trim()
      || inlineReason
      || (language === 'bn' ? 'প্রয়োজনীয় যাচাইকরণ পূরণ হয়নি' : 'Required verification not met');
    if (!confirm(language === 'bn' ? 'কোম্পানি প্রত্যাখ্যান করবেন?' : 'Reject this company?')) return;
    setActionPending(id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminRejectCompany(id, reason);
      setSuccessMsg(language === 'bn' ? 'কোম্পানি প্রত্যাখ্যাত হয়েছে।' : 'Company rejected.');
      // Reset to page 0 so the rejected row is visible in the REJECTED
      // filter and stays anchored at the top of the list.
      await load(0);
      if (selectedId === id) await openDetail(id);
      setRejectReason('');
    } catch (err: any) {
      alert(err?.message ?? 'Failed to reject');
    } finally {
      setActionPending(null);
    }
  };

  const handleSuspend = async (id: string, opts?: { reasonOverride?: string; fromModal?: boolean }) => {
    // Same rationale as handleReject — modal uses the typed state; the
    // row-level button asks for a reason inline via `prompt`.
    const inlineReason = !opts?.fromModal && !opts?.reasonOverride
      ? window.prompt(language === 'bn' ? 'স্থগিতের কারণ লিখুন (ঐচ্ছিক):' : 'Reason for suspension (optional):', '') ?? undefined
      : undefined;
    const reason = (opts?.reasonOverride ?? suspendReason).trim()
      || inlineReason
      || (language === 'bn' ? 'অ্যাডমিন কর্তৃক স্থগিত' : 'Suspended by admin');
    if (!confirm(language === 'bn' ? 'কোম্পানি স্থগিত করবেন?' : 'Suspend this company?')) return;
    setActionPending(id);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminSuspendCompany(id, reason);
      setSuccessMsg(language === 'bn' ? 'কোম্পানি স্থগিত করা হয়েছে।' : 'Company suspended.');
      // Reset to page 0 so the suspended row is visible in the SUSPENDED
      // filter and stays anchored at the top of the list.
      await load(0);
      if (selectedId === id) await openDetail(id);
      setSuspendReason('');
    } catch (err: any) {
      alert(err?.message ?? 'Failed to suspend');
    } finally {
      setActionPending(null);
    }
  };

  const handleSetPremium = async (id: string, until: string | null) => {
    setPremiumSaving(true);
    try {
      await adminSetCompanyPremium(id, until);
      await load();
      if (selectedId === id) await openDetail(id);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update premium');
    } finally {
      setPremiumSaving(false);
    }
  };

  const handleGrantPremium30Days = (id: string) => {
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    void handleSetPremium(id, until);
  };

  const handleClearPremium = (id: string) => {
    if (!confirm(language === 'bn' ? 'প্রিমিয়াম মুছে ফেলবেন?' : 'Remove premium access?')) return;
    void handleSetPremium(id, null);
  };

  const openDeleteDialog = (row: CompanyAdminListRow) => {
    setDeleteTarget(row);
    setDeleteConfirmText('');
    setDeleteResult(null);
  };

  const closeDeleteDialog = () => {
    if (deletePending) return;
    setDeleteTarget(null);
    setDeleteConfirmText('');
    setDeleteResult(null);
  };

  const handleDeleteCompany = async () => {
    if (!deleteTarget || deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) return;
    setDeletePending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await adminDeleteCompany(deleteTarget.id);
      setDeleteResult(result);
      if (result.storage_paths.length > 0) {
        await adminDeleteCompanyStoragePaths(result.storage_paths);
      }
      if (selectedId === deleteTarget.id) closeDetail();
      setSuccessMsg(
        language === 'bn'
          ? `${deleteTarget.company_name} স্থায়ীভাবে মুছে ফেলা হয়েছে।`
          : `${deleteTarget.company_name} permanently deleted.`,
      );
      setRows((current) => current.filter((row) => row.id !== deleteTarget.id));
      setTotal((current) => Math.max(0, current - 1));
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'কোম্পানি মুছতে ব্যর্থ।' : 'Failed to delete company.'));
    } finally {
      setDeletePending(false);
    }
  };

  const handleOpenDocument = async (companyId: string, filePath: string) => {
    try {
      const url = await createCompanySignedDocumentUrl(companyId, filePath);
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      alert(err?.message ?? 'Could not open document');
    }
  };

  const handleDownloadDocument = async (companyId: string, filePath: string, fileName: string) => {
    try {
      const url = await createCompanySignedDocumentUrl(companyId, filePath);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err?.message ?? 'Could not download document');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#E31B23]" />
              {language === 'bn' ? 'কোম্পানি ব্যবস্থাপনা' : 'Company Management'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'bn'
                ? 'কোম্পানি অ্যাকাউন্টের অনুমোদন, প্রত্যাখ্যান, এবং স্থগিতকরণ পরিচালনা করুন'
                : 'Approve, reject, or suspend company accounts on SkillProof.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold">{total}</span>
            <span>{language === 'bn' ? 'মোট কোম্পানি' : 'total companies'}</span>
          </div>
        </div>
      </div>

      <FeatureTogglePanel
        features={features}
        loading={featuresLoading}
        savingKey={featureSaving}
        onToggle={handleToggleFeature}
        language={language}
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-brand-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'নাম, ইমেইল, ফোন বা ক্যাটাগরি...' : 'Search by name, email, phone, category...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-[#E31B23] text-slate-700 font-bold text-xs rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                filterStatus === f.value
                  ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {language === 'bn' ? f.bn : f.en}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-brand-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'কোম্পানি' : 'Company'}
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'যোগাযোগ' : 'Contact'}
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'ডকুমেন্ট' : 'Docs'}
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'স্ট্যাটাস' : 'Status'}
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'জমার তারিখ' : 'Submitted'}
                </th>
                <th className="text-right px-4 py-3 font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">
                  {language === 'bn' ? 'অ্যাকশন' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-10 rounded-lg bg-slate-50 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    {language === 'bn' ? 'কোনো কোম্পানি পাওয়া যায়নি' : 'No companies found'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const status = COMPANY_STATUS_LABELS[row.status];
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt={row.company_name}
                              className="h-8 w-8 shrink-0 rounded-lg object-cover border border-slate-200 bg-white"
                            />
                          ) : (
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center text-[10px] font-black">
                              {row.company_name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{row.company_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{row.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 min-w-[160px]">
                        <p className="truncate">{row.email}</p>
                        <p className="text-[10px] text-slate-500">{row.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          <FileText className="w-3 h-3" />
                          {row.document_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusPill status={row.status} language={language} />
                          {isCompanyPremium(row) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              {language === 'bn' ? 'প্রিমিয়াম' : 'Premium'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openDetail(row.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-50 border border-slate-200 hover:border-[#E31B23] text-slate-700"
                          >
                            <Eye className="w-3 h-3" />
                            {language === 'bn' ? 'দেখুন' : 'View'}
                          </button>
                          {row.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(row.id)}
                              disabled={actionPending === row.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-500 text-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {language === 'bn' ? 'অনুমোদন' : 'Approve'}
                            </button>
                          )}
                          {row.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectReason('');
                                handleReject(row.id);
                              }}
                              disabled={actionPending === row.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 border border-rose-200 hover:border-rose-500 text-rose-700 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              {language === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
                            </button>
                          )}
                          {row.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspendReason('');
                                handleSuspend(row.id);
                              }}
                              disabled={actionPending === row.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-orange-50 border border-orange-200 hover:border-orange-500 text-orange-700 disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {language === 'bn' ? 'স্থগিত' : 'Suspend'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(row)}
                            disabled={actionPending === row.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-red-50 border border-red-200 hover:border-red-500 text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            {language === 'bn' ? 'মুছুন' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/60 text-xs">
            <span className="text-slate-600 font-semibold">
              {language === 'bn' ? 'দেখাচ্ছে' : 'Showing'} {offset + 1}–{Math.min(offset + pageSize, total)} {language === 'bn' ? 'এর' : 'of'} {total}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => load(Math.max(0, offset - pageSize))}
                disabled={offset === 0 || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-50 font-bold"
              >
                {language === 'bn' ? 'আগের' : 'Prev'}
              </button>
              <button
                type="button"
                onClick={() => load(offset + pageSize)}
                disabled={offset + pageSize >= total || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-50 font-bold"
              >
                {language === 'bn' ? 'পরের' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <CompanyDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
          onApprove={() => handleApprove(selectedId)}
          onReject={() => handleReject(selectedId, { fromModal: true })}
          onSuspend={() => handleSuspend(selectedId, { fromModal: true })}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          suspendReason={suspendReason}
          setSuspendReason={setSuspendReason}
          actionPending={!!actionPending}
          onOpenDoc={handleOpenDocument}
          onDownloadDoc={handleDownloadDocument}
          premiumUntilInput={premiumUntilInput}
          setPremiumUntilInput={setPremiumUntilInput}
          premiumSaving={premiumSaving}
          onSavePremium={() => {
            if (!premiumUntilInput) return;
            const dt = new Date(premiumUntilInput);
            if (Number.isNaN(dt.getTime())) {
              alert(language === 'bn' ? 'অবৈধ তারিখ।' : 'Invalid date.');
              return;
            }
            void handleSetPremium(selectedId, dt.toISOString());
          }}
          onGrantPremium30={() => handleGrantPremium30Days(selectedId)}
          onClearPremium={() => handleClearPremium(selectedId)}
          language={language}
          total={total}
          openDeleteDialog={openDeleteDialog}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900">
                    {language === 'bn' ? 'কোম্পানি স্থায়ীভাবে মুছুন' : 'Delete company permanently'}
                  </h2>
                  <p className="mt-0.5 break-all text-xs text-slate-500">{deleteTarget.email}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                <strong>{language === 'bn' ? 'সতর্কতা: ' : 'Permanent action: '}</strong>
                {language === 'bn'
                  ? 'কোম্পানি, Auth অ্যাকাউন্ট, চাকরি, আবেদন, ইন্টারভিউ এবং জমা দেওয়া ডকুমেন্টের ডেটা মুছে যাবে। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।'
                  : 'This deletes the company, its Auth account, jobs, applications, interviews, and submitted document records. This cannot be undone.'}
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {language === 'bn' ? 'নিশ্চিত করতে কোম্পানির ইমেইল লিখুন' : 'Type the company email to confirm'}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={deleteTarget.email}
                  disabled={deletePending}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-60"
                />
              </label>

              {deleteResult && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  {language === 'bn' ? 'মুছে ফেলা সম্পন্ন হয়েছে।' : 'Deletion completed.'}
                  {!deleteResult.auth_user_deleted && deleteResult.auth_user_error && (
                    <span className="mt-1 block text-amber-700">
                      {language === 'bn' ? 'Auth অ্যাকাউন্ট মুছতে সমস্যা: ' : 'Auth account cleanup warning: '}
                      {deleteResult.auth_user_error}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={deletePending}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCompany()}
                  disabled={deletePending || deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {deletePending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ status: CompanyStatus; language: 'bn' | 'en' }> = ({ status, language }) => {
  const info = COMPANY_STATUS_LABELS[status];
  const toneClass =
    info.tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : info.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-rose-50 border-rose-200 text-rose-700';
  const Icon = status === 'APPROVED' ? CheckCircle2
    : status === 'PENDING_APPROVAL' ? Clock
    : status === 'PENDING_OTP' ? ShieldCheck
    : status === 'SUSPENDED' ? AlertTriangle
    : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${toneClass}`}>
      <Icon className="w-3 h-3" />
      {language === 'bn' ? info.bn : info.en}
    </span>
  );
};

const FeatureTogglePanel: React.FC<{
  features: CompanyFeatureToggle[];
  loading: boolean;
  savingKey: string | null;
  onToggle: (key: string, enabled: boolean) => void;
  language: 'bn' | 'en';
}> = ({ features, loading, savingKey, onToggle, language }) => {
  // Single master toggle drives every company-side BDApps gate.
  const masterFeature =
    features.find((f) => f.feature_key === 'company_bdapps_required') ?? null;
  const masterEnabled = masterFeature?.enabled ?? false;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-brand-sm overflow-hidden">
      {/* Header bar — visual context of what's being controlled */}
      <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 border-b border-slate-200 flex items-center gap-2">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
            {language === 'bn' ? 'BDApps গেট নিয়ন্ত্রণ' : 'BDApps Gate Controls'}
          </p>
          <p className="text-[10px] text-slate-500 leading-snug">
            {language === 'bn'
              ? 'একটি মাস্টার টগল — কোম্পানির জন্য BDApps যাচাই বাধ্যতামূলক কি না।'
              : 'Single master toggle — Require BDApps verification for companies.'}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ---- Single Master Toggle ---- */}
        <FeatureToggleRow
          tone="amber"
          icon={ShieldCheck}
          title={language === 'bn' ? 'BDApps যাচাই বাধ্যতামূলক (কোম্পানি)' : 'Require BDApps Verification for Companies'}
          enabled={masterEnabled}
          saving={savingKey === 'company_bdapps_required'}
          disabled={loading}
          onToggle={() => onToggle('company_bdapps_required', !masterEnabled)}
          description={
            masterEnabled
              ? (language === 'bn'
                  ? 'অনুমোদিত কোম্পানিগুলোকে মোবাইল নম্বর → OTP → BDApps সাবস্ক্রিপশন সম্পন্ন করে ড্যাশবোর্ডে প্রবেশ করতে হবে। ইতিমধ্যে সম্পন্ন ধাপগুলো আবার চাওয়া হবে না।'
                  : 'Approved companies must complete Mobile → OTP → BDApps Subscription before reaching the dashboard. Already-completed steps are remembered.')
              : (language === 'bn'
                  ? 'BDApps সম্পূর্ণ বাইপাস। অনুমোদিত কোম্পানি সরাসরি ড্যাশবোর্ডে প্রবেশ করবে — কোনো মোবাইল নম্বর, OTP বা সাবস্ক্রিপশন পেজ দেখানো হবে না।'
                  : 'BDApps fully bypassed. Approved companies land directly on the dashboard — no mobile number, OTP, or subscription page is shown.')
          }
          enabledLabel={language === 'bn' ? 'চালু' : 'Enabled'}
          disabledLabel={language === 'bn' ? 'বন্ধ' : 'Disabled'}
        />

        {/* ---- Live policy preview ---- */}
        <div className={`rounded-2xl border p-3.5 transition-colors ${
          masterEnabled
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-start gap-2.5">
            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              masterEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                {language === 'bn' ? 'বর্তমান নীতি' : 'Current policy'}
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                {masterEnabled ? (
                  language === 'bn' ? (
                    <>
                      কোম্পানি ড্যাশবোর্ডে পৌঁছানোর আগে{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                        মোবাইল + OTP + BDApps সাবস্ক্রিপশন
                      </span>{' '}
                      বাধ্যতামূলক।
                    </>
                  ) : (
                    <>
                      Before reaching the dashboard, companies must satisfy{' '}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                        Mobile + OTP + BDApps subscription
                      </span>
                      .
                    </>
                  )
                ) : (
                  language === 'bn' ? (
                    <>
                      BDApps সম্পূর্ণ বাইপাস — অনুমোদিত কোম্পানি সরাসরি ড্যাশবোর্ডে প্রবেশ করবে।
                    </>
                  ) : (
                    <>
                      BDApps fully bypassed — approved companies land directly on the dashboard.
                    </>
                  )
                )}
              </p>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                {language === 'bn'
                  ? 'এই নীতি ব্যাকএন্ড ও ড্যাশবোর্ড-এন্ট্রি লেভেলে প্রয়োগ হয়।'
                  : 'This policy is enforced at the backend and dashboard-entry level.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// iOS-style Switch + paired row, used for both feature toggles.
const FeatureToggleRow: React.FC<{
  tone: 'amber' | 'blue';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
}> = ({ tone, icon: Icon, title, description, enabled, enabledLabel, disabledLabel, saving, disabled, onToggle }) => {
  const accent =
    tone === 'amber'
      ? { wrap: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200', icon: 'text-amber-600' }
      : { wrap: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200', icon: 'text-blue-600' };
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${accent.wrap}`}>
          <Icon className={`w-4 h-4 ${accent.icon}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span
          className={`hidden sm:inline-flex items-center px-2 py-1 rounded-full text-[10px] font-extrabold border tracking-wider uppercase transition-colors ${
            enabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          {enabled ? enabledLabel : disabledLabel}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          disabled={disabled || saving}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            enabled
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 focus:ring-emerald-300'
              : 'bg-slate-300 focus:ring-slate-300'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          >
            {saving && (
              <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

const CompanyDetailModal: React.FC<{
  detail: CompanyWithDocuments | null;
  loading: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  suspendReason: string;
  setSuspendReason: (v: string) => void;
  actionPending: boolean;
  onOpenDoc: (companyId: string, path: string) => void;
  onDownloadDoc: (companyId: string, path: string, name: string) => void;
  premiumUntilInput: string;
  setPremiumUntilInput: (v: string) => void;
  premiumSaving: boolean;
  onSavePremium: () => void;
  onGrantPremium30: () => void;
  onClearPremium: () => void;
  language: 'bn' | 'en';
  total: number;
  openDeleteDialog: (row: CompanyAdminListRow) => void;
}> = ({ detail, loading, onClose, onApprove, onReject, onSuspend, rejectReason, setRejectReason, suspendReason, setSuspendReason, actionPending, onOpenDoc, onDownloadDoc, premiumUntilInput, setPremiumUntilInput, premiumSaving, onSavePremium, onGrantPremium30, onClearPremium, language, total, openDeleteDialog }) => {
  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
          {loading ? <Loader2 className="w-6 h-6 animate-spin text-[#E31B23]" /> : null}
        </div>
      </div>
    );
  }

  const c = detail.company;
  const docs = detail.documents;
  const status = COMPANY_STATUS_LABELS[c.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-brand-lg border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="flex items-start gap-3 mb-4">
            {c.logo_url ? (
              <img
                src={c.logo_url}
                alt={c.company_name}
                className="shrink-0 w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-white shadow-md"
              />
            ) : (
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">{c.company_name}</h2>
              <p className="text-xs text-slate-500">{c.category}</p>
              <div className="mt-1.5">
                <StatusPill status={c.status} language={language} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto shrink-0 text-slate-400 hover:text-slate-700 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
            <InfoLine icon={Mail} label={language === 'bn' ? 'ইমেইল' : 'Email'} value={c.email} />
            <InfoLine icon={Phone} label={language === 'bn' ? 'ফোন' : 'Phone'} value={c.phone} />
            <InfoLine icon={MapPin} label={language === 'bn' ? 'ঠিকানা' : 'Address'} value={c.address} fullWidth />
            {c.contact_name && <InfoLine icon={Building2} label={language === 'bn' ? 'যোগাযোগ ব্যক্তি' : 'Contact'} value={c.contact_name} />}
            {c.website_url && (
              <InfoLine
                icon={ExternalLink}
                label={language === 'bn' ? 'ওয়েবসাইট' : 'Website'}
                value={
                  <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="text-[#E31B23] font-bold hover:underline break-all">
                    {c.website_url}
                  </a>
                }
              />
            )}
            <InfoLine icon={Calendar} label={language === 'bn' ? 'জমার তারিখ' : 'Submitted'} value={new Date(c.created_at).toLocaleString()} />
            <InfoLine
              icon={ShieldCheck}
              label={language === 'bn' ? 'মোবাইল যাচাই' : 'Mobile Verified'}
              value={
                c.mobile_verified
                  ? (language === 'bn' ? 'হ্যাঁ' : 'Yes')
                  : (language === 'bn' ? 'না' : 'No')
              }
            />
            {c.approved_at && (
              <InfoLine icon={CheckCircle2} label={language === 'bn' ? 'অনুমোদনের তারিখ' : 'Approved'} value={new Date(c.approved_at).toLocaleString()} />
            )}
          </div>

          {c.description && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                {language === 'bn' ? 'বিবরণ' : 'Description'}
              </p>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">{c.description}</p>
            </div>
          )}

          {c.rejection_reason && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 mb-1">
                {language === 'bn' ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}
              </p>
              <p className="text-xs text-slate-800">{c.rejection_reason}</p>
            </div>
          )}

          {c.suspended_reason && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 mb-1">
                {language === 'bn' ? 'স্থগিতের কারণ' : 'Suspension Reason'}
              </p>
              <p className="text-xs text-slate-800">{c.suspended_reason}</p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              {language === 'bn' ? 'জমাকৃত ডকুমেন্ট' : 'Submitted Documents'}
            </h3>
            {docs.length === 0 ? (
              <p className="text-xs text-slate-500">
                {language === 'bn' ? 'কোনো ডকুমেন্ট জমা দেওয়া হয়নি।' : 'No documents submitted.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => {
                  const label = COMPANY_DOCUMENT_TYPE_LABELS[doc.document_type];
                  return (
                    <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#E31B23] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-500">
                            {language === 'bn' ? label.bn : label.en} · {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenDoc(c.id, doc.file_path)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-slate-200 hover:border-[#E31B23] text-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          {language === 'bn' ? 'প্রিভিউ' : 'Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadDoc(c.id, doc.file_path, doc.file_name)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-slate-200 hover:border-[#E31B23] text-slate-700"
                        >
                          <Download className="w-3 h-3" />
                          {language === 'bn' ? 'ডাউনলোড' : 'Download'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mb-4 p-3 rounded-2xl border border-amber-200 bg-amber-50/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'প্রিমিয়াম অ্যাক্সেস' : 'Premium Access'}
                </p>
                {c.premium_until ? (
                  isCompanyPremium(c) ? (
                    <p className="text-xs text-slate-700 leading-snug">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {language === 'bn' ? 'সক্রিয় আছে' : 'Currently active'}
                      </span>
                      <span className="block text-[11px] text-slate-600 mt-0.5">
                        {language === 'bn' ? 'মেয়াদ শেষ:' : 'Expires:'}{' '}
                        {new Date(c.premium_until).toLocaleString()}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-700 leading-snug">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        {language === 'bn' ? 'মেয়াদ শেষ হয়েছে' : 'Expired'}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {new Date(c.premium_until).toLocaleString()}
                      </span>
                    </p>
                  )
                ) : (
                  <p className="text-xs text-slate-600 leading-snug">
                    {language === 'bn' ? 'প্রিমিয়াম সক্রিয় নয়' : 'No premium access set.'}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onGrantPremium30}
                  disabled={premiumSaving || actionPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white shadow-sm disabled:opacity-50"
                >
                  {premiumSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  {language === 'bn' ? '+৩০ দিন' : '+30 days'}
                </button>
                {c.premium_until && (
                  <button
                    type="button"
                    onClick={onClearPremium}
                    disabled={premiumSaving || actionPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-700 text-slate-600 disabled:opacity-50"
                  >
                    {language === 'bn' ? 'মুছুন' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {language === 'bn' ? 'কাস্টম মেয়াদ শেষ (ঐচ্ছিক)' : 'Custom expiry (optional)'}
                </label>
                <input
                  type="datetime-local"
                  value={premiumUntilInput}
                  onChange={(e) => setPremiumUntilInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
                />
              </div>
              <button
                type="button"
                onClick={onSavePremium}
                disabled={!premiumUntilInput || premiumSaving || actionPending}
                className="px-3 py-2 rounded-xl text-[11px] font-bold bg-[#E31B23] hover:brightness-110 text-white disabled:opacity-50"
              >
                {language === 'bn' ? 'সেট করুন' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {c.status !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={actionPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'অনুমোদন করুন' : 'Approve'}
                </button>
              )}
              {c.status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={actionPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                </button>
              )}
              {c.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={onSuspend}
                  disabled={actionPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'স্থগিত করুন' : 'Suspend'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const rowForDialog: CompanyAdminListRow = {
                    id: c.id,
                    company_name: c.company_name,
                    category: c.category,
                    description: c.description ?? null,
                    address: c.address,
                    phone: c.phone,
                    email: c.email,
                    logo_url: c.logo_url,
                    status: c.status,
                    rejection_reason: c.rejection_reason ?? null,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                    approved_at: c.approved_at ?? null,
                    approved_by: c.approved_by ?? null,
                    mobile_verified: c.mobile_verified,
                    mobile_verified_at: c.mobile_verified_at ?? null,
                    premium_until: c.premium_until,
                    premium_set_at: c.premium_set_at ?? null,
                    premium_set_by: c.premium_set_by ?? null,
                    document_count: docs.length,
                    total_count: total,
                  };
                  onClose();
                  openDeleteDialog(rowForDialog);
                }}
                disabled={actionPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-700 font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Delete permanently'}
              </button>
            </div>

            {c.status !== 'REJECTED' && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {language === 'bn' ? 'প্রত্যাখ্যানের কারণ (ঐচ্ছিক)' : 'Rejection reason (optional)'}
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={language === 'bn' ? 'কারণ লিখুন...' : 'Reason text...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
                />
              </div>
            )}

            {c.status === 'APPROVED' && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {language === 'bn' ? 'স্থগিতের কারণ (ঐচ্ছিক)' : 'Suspension reason (optional)'}
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder={language === 'bn' ? 'কারণ লিখুন...' : 'Reason text...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoLine: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}> = ({ icon: Icon, label, value, fullWidth }) => (
  <div className={`flex items-start gap-2 ${fullWidth ? 'sm:col-span-2' : ''}`}>
    <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs text-slate-900 font-semibold break-words">{value}</p>
    </div>
  </div>
);

export default AdminCompaniesPage;