import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  MapPin,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
  Building2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  COMPANY_JOB_EMPLOYMENT_LABELS,
  COMPANY_JOB_STATUS_LABELS,
  COMPANY_JOB_WORK_LABELS,
  fetchCompanyJobStats,
  deleteCompanyJob,
  listCompanyJobs,
  setCompanyJobStatus,
  type CompanyJob,
  type CompanyJobEmploymentType,
  type CompanyJobStatus,
  type CompanyJobWorkType,
} from '../../services/companyJobs';
import type { Category } from '../../types/database';
import { listActiveCategories } from '../../services/companyJobs';

const PAGE_SIZE = 10;

const STATUS_ICON: Record<CompanyJobStatus, React.ComponentType<{ className?: string }>> = {
  draft: Clock,
  published: CheckCircle2,
  paused: PauseCircle,
  closed: XCircle,
};

const STATUS_FILTERS: (CompanyJobStatus | 'all')[] = ['all', 'draft', 'published', 'paused', 'closed'];

export const CompanyJobsListPage: React.FC = () => {
  const { language } = useLanguage();
  const { isApproved } = useCompanyAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CompanyJob[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CompanyJobStatus | 'all'>('all');
  const [employmentFilter, setEmploymentFilter] = useState<CompanyJobEmploymentType | ''>('');
  const [workFilter, setWorkFilter] = useState<CompanyJobWorkType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'deadline' | 'title'>('newest');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{ total: number; draft: number; published: number; paused: number; closed: number; expired: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cats, s] = await Promise.all([
          listActiveCategories(),
          fetchCompanyJobStats(),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setStats({
          total: Number(s.total_jobs ?? 0),
          draft: Number(s.draft_jobs ?? 0),
          published: Number(s.published_jobs ?? 0),
          paused: Number(s.paused_jobs ?? 0),
          closed: Number(s.closed_jobs ?? 0),
          expired: Number(s.expired_jobs ?? 0),
        });
      } catch {
        // non-blocking — filters will still load
      }
    })();
    return () => { mounted = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCompanyJobs({
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? null : statusFilter,
        employmentType: employmentFilter || null,
        workType: workFilter || null,
        categoryId: categoryFilter || null,
        sort,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, employmentFilter, workFilter, categoryFilter, sort, page, language]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter, employmentFilter, workFilter, categoryFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatDate = (s: string | null) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatSalary = (job: CompanyJob): string => {
    if (job.salary_label) return job.salary_label;
    if (job.salary_mode === 'negotiable') return language === 'bn' ? 'আলোচনা সাপেক্ষ' : 'Negotiable';
    if (job.salary_mode === 'fixed' && job.salary_min != null) {
      return `${job.salary_min.toLocaleString('en-US')} ${job.salary_currency}`;
    }
    if (job.salary_mode === 'range' && job.salary_min != null && job.salary_max != null) {
      return `${job.salary_min.toLocaleString('en-US')} – ${job.salary_max.toLocaleString('en-US')} ${job.salary_currency}`;
    }
    return '—';
  };

  const handleStatusChange = async (job: CompanyJob, next: CompanyJobStatus) => {
    setActionError(null);
    setBusyId(job.id);
    try {
      await setCompanyJobStatus(job.id, next);
      await load();
      const s = await fetchCompanyJobStats();
      setStats({
        total: Number(s.total_jobs ?? 0),
        draft: Number(s.draft_jobs ?? 0),
        published: Number(s.published_jobs ?? 0),
        paused: Number(s.paused_jobs ?? 0),
        closed: Number(s.closed_jobs ?? 0),
        expired: Number(s.expired_jobs ?? 0),
      });
    } catch (err: any) {
      setActionError(err?.message ?? (language === 'bn' ? 'অ্যাকশন ব্যর্থ' : 'Action failed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job: CompanyJob) => {
    const confirmMsg = language === 'bn'
      ? 'এই জবটি স্থায়ীভাবে মুছে ফেলবেন? এই কাজটি ফেরানো যাবে না।'
      : 'Permanently delete this job? This cannot be undone.';
    if (!confirm(confirmMsg)) return;
    setActionError(null);
    setBusyId(job.id);
    try {
      await deleteCompanyJob(job.id);
      if (rows.length === 1 && page > 0) setPage(page - 1);
      else await load();
      const s = await fetchCompanyJobStats();
      setStats({
        total: Number(s.total_jobs ?? 0),
        draft: Number(s.draft_jobs ?? 0),
        published: Number(s.published_jobs ?? 0),
        paused: Number(s.paused_jobs ?? 0),
        closed: Number(s.closed_jobs ?? 0),
        expired: Number(s.expired_jobs ?? 0),
      });
    } catch (err: any) {
      setActionError(err?.message ?? (language === 'bn' ? 'মুছে ফেলা ব্যর্থ' : 'Delete failed'));
    } finally {
      setBusyId(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setEmploymentFilter('');
    setWorkFilter('');
    setCategoryFilter('');
    setSort('newest');
  };

  const hasActiveFilters =
    search.length > 0 ||
    statusFilter !== 'all' ||
    employmentFilter !== '' ||
    workFilter !== '' ||
    categoryFilter !== '' ||
    sort !== 'newest';

  const StatPill = useMemo(
    () => (label: string, value: number, tone: string, Icon: React.ComponentType<{ className?: string }>) => (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white ${
        tone === 'emerald' ? 'border-emerald-200 text-emerald-700' :
        tone === 'amber' ? 'border-amber-200 text-amber-700' :
        tone === 'rose' ? 'border-rose-200 text-rose-700' :
        tone === 'sky' ? 'border-sky-200 text-sky-700' :
        'border-slate-200 text-slate-700'
      }`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">{label}</span>
        <span className="text-sm font-black">{value}</span>
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {language === 'bn' ? 'জব পোস্টিং' : 'Job Posting'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {language === 'bn'
                  ? 'আপনার কোম্পানির জন্য জব পোস্ট তৈরি ও পরিচালনা করুন'
                  : 'Create and manage job postings for your company'}
              </p>
            </div>
          </div>
          {isApproved && (
            <button
              type="button"
              onClick={() => navigate('/company/jobs/create')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন জব পোস্ট' : 'Post New Job'}</span>
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {StatPill(language === 'bn' ? 'মোট' : 'Total', stats.total, 'slate', Briefcase)}
          {StatPill(language === 'bn' ? 'ড্রাফট' : 'Draft', stats.draft, 'slate', Clock)}
          {StatPill(language === 'bn' ? 'প্রকাশিত' : 'Published', stats.published, 'emerald', CheckCircle2)}
          {StatPill(language === 'bn' ? 'স্থগিত' : 'Paused', stats.paused, 'amber', PauseCircle)}
          {StatPill(language === 'bn' ? 'বন্ধ' : 'Closed', stats.closed, 'rose', XCircle)}
          {StatPill(language === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired', stats.expired, 'sky', CalendarClock)}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'শিরোনাম, ক্যাটাগরি বা লোকেশন…' : 'Search title, category, location…'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                filtersOpen || hasActiveFilters
                  ? 'bg-red-50 border-red-200 text-[#E31B23]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
            >
              <option value="newest">{language === 'bn' ? 'সর্বশেষ আগে' : 'Newest first'}</option>
              <option value="oldest">{language === 'bn' ? 'পুরাতন আগে' : 'Oldest first'}</option>
              <option value="deadline">{language === 'bn' ? 'ডেডলাইন অনুযায়ী' : 'By deadline'}</option>
              <option value="title">{language === 'bn' ? 'শিরোনাম অনুযায়ী' : 'By title'}</option>
            </select>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'স্ট্যাটাস' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all'
                      ? (language === 'bn' ? 'সব' : 'All')
                      : (language === 'bn' ? COMPANY_JOB_STATUS_LABELS[s].bn : COMPANY_JOB_STATUS_LABELS[s].en)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value="">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All categories'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'চাকরির ধরন' : 'Employment'}
              </label>
              <select
                value={employmentFilter}
                onChange={(e) => setEmploymentFilter(e.target.value as CompanyJobEmploymentType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value="">{language === 'bn' ? 'সব' : 'All'}</option>
                {(Object.keys(COMPANY_JOB_EMPLOYMENT_LABELS) as CompanyJobEmploymentType[]).map((k) => (
                  <option key={k} value={k}>
                    {language === 'bn' ? COMPANY_JOB_EMPLOYMENT_LABELS[k].bn : COMPANY_JOB_EMPLOYMENT_LABELS[k].en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'কর্মস্থল' : 'Work type'}
              </label>
              <select
                value={workFilter}
                onChange={(e) => setWorkFilter(e.target.value as CompanyJobWorkType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value="">{language === 'bn' ? 'সব' : 'All'}</option>
                {(Object.keys(COMPANY_JOB_WORK_LABELS) as CompanyJobWorkType[]).map((k) => (
                  <option key={k} value={k}>
                    {language === 'bn' ? COMPANY_JOB_WORK_LABELS[k].bn : COMPANY_JOB_WORK_LABELS[k].en}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                  <span>{language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5" />
              </div>
              <p className="text-sm font-black text-slate-700">
                {language === 'bn' ? 'কোনো জব পোস্ট করা হয়নি' : 'No jobs posted yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'নতুন জব পোস্ট করতে উপরের বাটনে ক্লিক করুন'
                  : 'Click the button above to create your first job posting'}
              </p>
              {isApproved && (
                <Link
                  to="/company/jobs/create"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs rounded-xl shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন জব পোস্ট' : 'Post New Job'}</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((job) => {
                const statusLabel = COMPANY_JOB_STATUS_LABELS[job.status];
                const StatusIcon = STATUS_ICON[job.status];
                const empLabel = COMPANY_JOB_EMPLOYMENT_LABELS[job.employment_type];
                const workLabel = COMPANY_JOB_WORK_LABELS[job.work_type];
                const toneCls =
                  statusLabel.tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  statusLabel.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  statusLabel.tone === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  'bg-slate-50 border-slate-200 text-slate-700';
                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#E31B23]/40 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/company/jobs/${job.id}`}
                            className="text-sm font-black text-slate-900 hover:text-[#E31B23] truncate"
                          >
                            {job.title}
                          </Link>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${toneCls}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{language === 'bn' ? statusLabel.bn : statusLabel.en}</span>
                          </span>
                          {job.vacancies != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold">
                              <Users className="w-3 h-3" />
                              {job.vacancies} {language === 'bn' ? 'শূন্যপদ' : 'vac'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {job.sub_category_label
                              ? `${job.category_label} › ${job.sub_category_label}`
                              : job.category_label}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {language === 'bn' ? empLabel.bn : empLabel.en}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {language === 'bn' ? workLabel.bn : workLabel.en}{job.location ? ` · ${job.location}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            {formatSalary(job)}
                          </span>
                          {job.deadline && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              {formatDate(job.deadline)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Link
                          to={`/company/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                        >
                          {language === 'bn' ? 'দেখুন' : 'View'}
                        </Link>
                        {job.status !== 'closed' && (
                          <Link
                            to={`/company/jobs/${job.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                          >
                            {language === 'bn' ? 'এডিট' : 'Edit'}
                          </Link>
                        )}
                        {job.status === 'draft' && (
                          <button
                            type="button"
                            disabled={busyId === job.id || !isApproved}
                            onClick={() => handleStatusChange(job, 'published')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold disabled:opacity-50"
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'প্রকাশ' : 'Publish'}</span>
                          </button>
                        )}
                        {job.status === 'published' && (
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => handleStatusChange(job, 'paused')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold disabled:opacity-50"
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'স্থগিত' : 'Pause'}</span>
                          </button>
                        )}
                        {job.status === 'paused' && (
                          <button
                            type="button"
                            disabled={busyId === job.id || !isApproved}
                            onClick={() => handleStatusChange(job, 'published')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold disabled:opacity-50"
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'পুনঃপ্রকাশ' : 'Resume'}</span>
                          </button>
                        )}
                        {(job.status === 'published' || job.status === 'paused') && (
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => handleStatusChange(job, 'closed')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-[11px] font-bold disabled:opacity-50"
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'বন্ধ করুন' : 'Close'}</span>
                          </button>
                        )}
                        {job.status === 'closed' && (
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => handleStatusChange(job, 'draft')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-50"
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'ড্রাফটে' : 'To Draft'}</span>
                          </button>
                        )}
                        {job.status !== 'draft' && (
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => handleDelete(job)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold disabled:opacity-50"
                            title={language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Permanently delete'}
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
                          </button>
                        )}
                        {job.status === 'draft' && (
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => handleDelete(job)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold disabled:opacity-50"
                            title={language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Permanently delete'}
                          >
                            {busyId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            <span>{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              {language === 'bn'
                ? `পৃষ্ঠা ${page + 1} / ${totalPages} · মোট ${total}`
                : `Page ${page + 1} of ${totalPages} · ${total} total`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
              >
                <span>{language === 'bn' ? 'পরবর্তী' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyJobsListPage;