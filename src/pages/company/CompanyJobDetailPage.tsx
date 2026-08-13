import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  PauseCircle,
  Sparkles,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  COMPANY_JOB_EMPLOYMENT_LABELS,
  COMPANY_JOB_SALARY_MODE_LABELS,
  COMPANY_JOB_SKILL_LEVEL_LABELS,
  COMPANY_JOB_STATUS_LABELS,
  COMPANY_JOB_WORK_LABELS,
  deleteCompanyJob,
  getCompanyJob,
  setCompanyJobStatus,
  type CompanyJobDetail,
  type CompanyJobStatus,
} from '../../services/companyJobs';

const STATUS_ICON: Record<CompanyJobStatus, React.ComponentType<{ className?: string }>> = {
  draft: Clock,
  published: CheckCircle2,
  paused: PauseCircle,
  closed: XCircle,
};

const PRIORITY_TONE: Record<string, string> = {
  required: 'bg-rose-50 border-rose-200 text-rose-700',
  preferred: 'bg-sky-50 border-sky-200 text-sky-700',
};

export const CompanyJobDetailPage: React.FC = () => {
  const { language } = useLanguage();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { isApproved } = useCompanyAuth();

  const [detail, setDetail] = useState<CompanyJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) {
      setError(language === 'bn' ? 'অবৈধ জব আইডি' : 'Invalid job id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await getCompanyJob(jobId);
      if (!d) setError(language === 'bn' ? 'জব পাওয়া যায়নি' : 'Job not found');
      else setDetail(d);
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [jobId, language]);

  useEffect(() => { void load(); }, [load]);

  const handleStatusChange = async (next: CompanyJobStatus) => {
    if (!detail) return;
    setActionError(null);
    setBusy(true);
    try {
      await setCompanyJobStatus(detail.id, next);
      await load();
    } catch (err: any) {
      setActionError(err?.message ?? (language === 'bn' ? 'অ্যাকশন ব্যর্থ' : 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const confirmMsg = language === 'bn'
      ? 'এই জবটি স্থায়ীভাবে মুছে ফেলবেন? এই কাজটি ফেরানো যাবে না।'
      : 'Permanently delete this job? This cannot be undone.';
    if (!confirm(confirmMsg)) return;
    setActionError(null);
    setBusy(true);
    try {
      await deleteCompanyJob(detail.id);
      navigate('/company/jobs', { replace: true });
    } catch (err: any) {
      setActionError(err?.message ?? (language === 'bn' ? 'মুছে ফেলা ব্যর্থ' : 'Delete failed'));
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (s: string | null): string => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatSalary = (): string => {
    if (!detail) return '—';
    if (detail.salary_label) return detail.salary_label;
    if (detail.salary_mode === 'negotiable') return language === 'bn' ? 'আলোচনা সাপেক্ষ' : 'Negotiable';
    if (detail.salary_mode === 'fixed' && detail.salary_min != null) {
      return `${detail.salary_min.toLocaleString('en-US')} ${detail.salary_currency}`;
    }
    if (detail.salary_mode === 'range' && detail.salary_min != null && detail.salary_max != null) {
      return `${detail.salary_min.toLocaleString('en-US')} – ${detail.salary_max.toLocaleString('en-US')} ${detail.salary_currency}`;
    }
    return '—';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
          <Link
            to="/company/jobs"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{language === 'bn' ? 'জব লিস্টে ফিরে যান' : 'Back to jobs list'}</span>
          </Link>
        </div>
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error ?? (language === 'bn' ? 'জব পাওয়া যায়নি' : 'Job not found')}</span>
        </div>
      </div>
    );
  }

  const statusLabel = COMPANY_JOB_STATUS_LABELS[detail.status];
  const StatusIcon = STATUS_ICON[detail.status];
  const empLabel = COMPANY_JOB_EMPLOYMENT_LABELS[detail.employment_type];
  const workLabel = COMPANY_JOB_WORK_LABELS[detail.work_type];
  const salaryModeLabel = COMPANY_JOB_SALARY_MODE_LABELS[detail.salary_mode];
  const isClosed = detail.status === 'closed';
  const isDraft = detail.status === 'draft';
  const toneCls =
    statusLabel.tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
    statusLabel.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
    statusLabel.tone === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-700' :
    'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/company/jobs"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
            </Link>
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 truncate">{detail.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${toneCls}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{language === 'bn' ? statusLabel.bn : statusLabel.en}</span>
                </span>
                <span>· {language === 'bn' ? 'কোম্পানি' : 'Company'}: {detail.company.company_name}</span>
                <span>· {language === 'bn' ? 'তৈরি' : 'Created'}: {formatDate(detail.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {!isClosed && (
              <Link
                to={`/company/jobs/${detail.id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
              >
                <Edit3 className="w-3 h-3" />
                <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
              </Link>
            )}
            {isDraft && isApproved && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange('published')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                <span>{language === 'bn' ? 'প্রকাশ' : 'Publish'}</span>
              </button>
            )}
            {detail.status === 'published' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange('paused')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
                <span>{language === 'bn' ? 'স্থগিত' : 'Pause'}</span>
              </button>
            )}
            {detail.status === 'paused' && isApproved && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange('published')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                <span>{language === 'bn' ? 'পুনঃপ্রকাশ' : 'Resume'}</span>
              </button>
            )}
            {(detail.status === 'published' || detail.status === 'paused') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange('closed')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-[11px] font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                <span>{language === 'bn' ? 'বন্ধ করুন' : 'Close'}</span>
              </button>
            )}
            {isClosed && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange('draft')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                <span>{language === 'bn' ? 'ড্রাফটে' : 'To Draft'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold disabled:opacity-50"
              title={language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Permanently delete'}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span>{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
            <h2 className="text-sm font-black text-slate-900 mb-3">
              {language === 'bn' ? 'বিবরণ' : 'Description'}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.description}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
            <h2 className="text-sm font-black text-slate-900 mb-3">
              {language === 'bn' ? 'দায়িত্ব' : 'Responsibilities'}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.responsibilities}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
            <h2 className="text-sm font-black text-slate-900 mb-3">
              {language === 'bn' ? 'যোগ্যতা' : 'Requirements'}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.requirements}</p>
          </div>

          {detail.benefits && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
              <h2 className="text-sm font-black text-slate-900 mb-3">
                {language === 'bn' ? 'সুবিধা' : 'Benefits'}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.benefits}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5">
            <h3 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#E31B23]" />
              {language === 'bn' ? 'দক্ষতা' : 'Skills'}
            </h3>
            {detail.skills.length === 0 ? (
              <p className="text-xs text-slate-500">{language === 'bn' ? 'কোনো দক্ষতা যোগ করা হয়নি।' : 'No skills attached.'}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detail.skills.map((s) => (
                  <span
                    key={s.skill_id}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-bold ${PRIORITY_TONE[s.priority] || 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-70">
                      {language === 'bn' ? COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].bn : COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].en}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 space-y-2.5 text-xs">
            <Row
              icon={Building2}
              label={language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              value={detail.sub_category_label
                ? `${detail.category_label} › ${detail.sub_category_label}`
                : detail.category_label}
            />
            <Row
              icon={Briefcase}
              label={language === 'bn' ? 'চাকরির ধরন' : 'Employment'}
              value={language === 'bn' ? empLabel.bn : empLabel.en}
            />
            <Row
              icon={MapPin}
              label={language === 'bn' ? 'কর্মস্থল' : 'Work type'}
              value={`${language === 'bn' ? workLabel.bn : workLabel.en}${detail.location ? ` · ${detail.location}` : ''}`}
            />
            <Row
              icon={Wallet}
              label={language === 'bn' ? 'বেতন' : 'Salary'}
              value={`${formatSalary()}${detail.salary_mode !== 'negotiable' ? ` (${language === 'bn' ? salaryModeLabel.bn : salaryModeLabel.en})` : ''}`}
            />
            {detail.experience_label && (
              <Row
                icon={Clock}
                label={language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}
                value={detail.experience_label}
              />
            )}
            {detail.education_label && (
              <Row
                icon={GraduationCap}
                label={language === 'bn' ? 'শিক্ষা' : 'Education'}
                value={detail.education_label}
              />
            )}
            {detail.deadline && (
              <Row
                icon={CalendarClock}
                label={language === 'bn' ? 'আবেদনের শেষ তারিখ' : 'Deadline'}
                value={formatDate(detail.deadline)}
              />
            )}
            <Row
              icon={Clock}
              label={language === 'bn' ? 'তৈরি' : 'Created'}
              value={formatDate(detail.created_at)}
            />
            {detail.published_at && (
              <Row
                icon={CheckCircle2}
                label={language === 'bn' ? 'প্রকাশিত' : 'Published'}
                value={formatDate(detail.published_at)}
              />
            )}
            {detail.closed_at && (
              <Row
                icon={XCircle}
                label={language === 'bn' ? 'বন্ধ' : 'Closed'}
                value={formatDate(detail.closed_at)}
              />
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5">
            <h3 className="text-xs font-black text-slate-900 mb-2 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-[#E31B23]" />
              {language === 'bn' ? 'কোম্পানি' : 'Company'}
            </h3>
            <div className="flex items-center gap-2">
              {detail.company.logo_url ? (
                <img src={detail.company.logo_url} alt={detail.company.company_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black">
                  {detail.company.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{detail.company.company_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{detail.company.category}</p>
              </div>
            </div>
          </div>

          {detail.status === 'published' && (
            <div className="bg-white border border-emerald-200 rounded-3xl shadow-brand-sm p-5">
              <h3 className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                {language === 'bn' ? 'পাবলিক ভিউ' : 'Public view'}
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'এই জব প্রকাশিত এবং যোগ্য প্রার্থীদের কাছে দৃশ্যমান হবে।'
                  : 'This job is published and visible to qualified candidates.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <ChevronRight className="w-3 h-3" />
        <span>
          {language === 'bn' ? 'অ্যাপ্লিকেশন ম্যানেজমেন্ট শীঘ্রই আসছে' : 'Application management coming soon'}
        </span>
      </div>
    </div>
  );
};

const Row: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs font-bold text-slate-800 break-words">{value}</p>
    </div>
  </div>
);

export default CompanyJobDetailPage;