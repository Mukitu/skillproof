import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CalendarClock,
  ChevronRight,
  ChevronLeft,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  COMPANY_JOB_EMPLOYMENT_LABELS,
  COMPANY_JOB_SKILL_LEVEL_LABELS,
  COMPANY_JOB_WORK_LABELS,
  listPublishedCompanyJobs,
  formatSalaryLabel,
  type CompanyJobEmploymentType,
  type CompanyJobWorkType,
  type PublishedCompanyJob,
} from '../../services/companyJobs';
import { listActiveCategories } from '../../services/companyJobs';
import type { Category } from '../../types/database';

const PAGE_SIZE = 12;

export const CompanyJobsPublicPage: React.FC = () => {
  const { language } = useLanguage();
  const [rows, setRows] = useState<PublishedCompanyJob[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [employmentFilter, setEmploymentFilter] = useState<CompanyJobEmploymentType | ''>('');
  const [workFilter, setWorkFilter] = useState<CompanyJobWorkType | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await listActiveCategories();
        if (mounted) setCategories(cats);
      } catch {
        if (mounted) setCategories([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPublishedCompanyJobs({
        search: debouncedSearch || undefined,
        categoryId: categoryFilter || null,
        employmentType: employmentFilter || null,
        workType: workFilter || null,
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
  }, [debouncedSearch, categoryFilter, employmentFilter, workFilter, page, language]);

  useEffect(() => { setPage(0); }, [debouncedSearch, categoryFilter, employmentFilter, workFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setEmploymentFilter('');
    setWorkFilter('');
  };

  const hasActiveFilters = search.length > 0 || categoryFilter !== '' || employmentFilter !== '' || workFilter !== '';

  const formatDate = (s: string | null) => {
    if (!s) return null;
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return null;
    }
  };

  const daysUntil = (s: string | null): number | null => {
    if (!s) return null;
    const ms = new Date(s).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const empLabels = useMemo(() => COMPANY_JOB_EMPLOYMENT_LABELS, []);
  const workLabels = useMemo(() => COMPANY_JOB_WORK_LABELS, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {language === 'bn' ? 'ভেরিফাইড কোম্পানির জব' : 'Verified Company Jobs'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {language === 'bn'
                  ? 'SkillProof অনুমোদিত কোম্পানিগুলোর কাছ থেকে সরাসরি জব'
                  : 'Jobs posted directly by SkillProof-approved companies'}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/jobs"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
          >
            <span>{language === 'bn' ? 'এআই ম্যাচ পোর্টাল' : 'AI Match Portal'}</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'শিরোনাম, কোম্পানি, লোকেশন…' : 'Search title, company, location…'}
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
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
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
                {(Object.keys(empLabels) as CompanyJobEmploymentType[]).map((k) => (
                  <option key={k} value={k}>
                    {language === 'bn' ? empLabels[k].bn : empLabels[k].en}
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
                {(Object.keys(workLabels) as CompanyJobWorkType[]).map((k) => (
                  <option key={k} value={k}>
                    {language === 'bn' ? workLabels[k].bn : workLabels[k].en}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-3 flex justify-end">
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

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <Briefcase className="w-6 h-6 mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-black text-slate-700">
                {language === 'bn' ? 'কোনো জব পাওয়া যায়নি' : 'No jobs found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' ? 'ফিল্টার পরিবর্তন করে দেখুন' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((job) => {
                const empLabel = empLabels[job.employment_type];
                const workLabel = workLabels[job.work_type];
                const days = daysUntil(job.deadline);
                const deadlineLabel = days != null ? (days < 0 ? '—' : `${days}d`) : null;
                const cardInner = (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#E31B23]/40 hover:shadow-sm transition flex flex-col h-full"
                  >
                    <div className="flex items-start gap-2.5">
                      {job.company_logo_url ? (
                        <img
                          src={job.company_logo_url}
                          alt={job.company_name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black">
                          {job.company_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold text-slate-500 truncate">
                          {job.company_name}
                        </p>
                        <p className="text-sm font-black text-slate-900 truncate">{job.title}</p>
                      </div>
                      {job.company_mobile_verified && (
                        <span className="inline-flex items-center gap-1 text-emerald-700" title={language === 'bn' ? 'যাচাইকৃত' : 'Verified'}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                        <Briefcase className="w-3 h-3" />
                        {language === 'bn' ? empLabel.bn : empLabel.en}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                        <MapPin className="w-3 h-3" />
                        {language === 'bn' ? workLabel.bn : workLabel.en}
                      </span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-semibold">
                          {job.location}
                        </span>
                      )}
                      {job.vacancies != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-semibold">
                          <Users className="w-3 h-3" />
                          {job.vacancies} {language === 'bn' ? 'টি শূন্যপদ' : job.vacancies === 1 ? 'vacancy' : 'vacancies'}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {job.sub_category_label
                            ? `${job.category_label} › ${job.sub_category_label}`
                            : job.category_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{formatSalaryLabel(job)}</span>
                      </div>
                      {job.deadline && (
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {formatDate(job.deadline)}
                            {deadlineLabel && (
                              <span className={`ml-1 font-bold ${days! <= 7 ? 'text-amber-700' : 'text-slate-500'}`}>
                                ({deadlineLabel})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {job.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((s) => (
                          <span
                            key={s.skill_id}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              s.priority === 'required'
                                ? 'bg-rose-50 border-rose-100 text-rose-700'
                                : 'bg-sky-50 border-sky-100 text-sky-700'
                            }`}
                            title={language === 'bn' ? COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].bn : COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].en}
                          >
                            {s.name}
                          </span>
                        ))}
                        {job.skills.length > 4 && (
                          <span className="text-[10px] text-slate-500">+{job.skills.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
                return (
                  <Link
                    key={job.id}
                    to={`/company-jobs/detail?id=${encodeURIComponent(job.id)}`}
                    className="block focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 rounded-2xl"
                    aria-label={`${language === 'bn' ? 'বিস্তারিত দেখুন' : 'View details'}: ${job.title}`}
                  >
                    {cardInner}
                  </Link>
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

export default CompanyJobsPublicPage;
