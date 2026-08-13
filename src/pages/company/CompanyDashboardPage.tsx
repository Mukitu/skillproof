import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Users,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Calendar,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_STATUS_LABELS,
  fetchCompanyDashboardStats,
  listMyCompanyDocuments,
  type CompanyDashboardStats,
  type CompanyDocument,
  type CompanyStatus,
} from '../../services/companies';
import { CompanyBdappsManagement } from '../../components/company/CompanyBdappsManagement';

const STATUS_BANNER: Record<CompanyStatus, { en: string; bn: string }> = {
  PENDING_OTP:      { en: 'Mobile Verification Pending',            bn: 'মোবাইল যাচাই চলছে' },
  PENDING_APPROVAL: { en: 'Awaiting Admin Approval',                bn: 'অ্যাডমিন অনুমোদনের অপেক্ষায়' },
  APPROVED:         { en: 'Company Verified',                       bn: 'কোম্পানি যাচাইকৃত' },
  REJECTED:         { en: 'Company Registration Rejected',          bn: 'কোম্পানি নিবন্ধন প্রত্যাখ্যাত' },
  SUSPENDED:        { en: 'Company Account Suspended',              bn: 'কোম্পানি অ্যাকাউন্ট স্থগিত' },
};

export const CompanyDashboardPage: React.FC = () => {
  const { language } = useLanguage();
  const { company, isApproved, refresh } = useCompanyAuth();

  const [stats, setStats] = useState<CompanyDashboardStats>({
    active_jobs: 0,
    total_applications: 0,
    shortlisted: 0,
    upcoming_interviews: 0,
    applied_today: 0,
    applied_this_week: 0,
    by_status: {},
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await fetchCompanyDashboardStats();
      setStats(s);
    } catch {
      setStats({
        active_jobs: 0,
        total_applications: 0,
        shortlisted: 0,
        upcoming_interviews: 0,
        applied_today: 0,
        applied_this_week: 0,
        by_status: {},
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!company) return;
      try {
        const docs = await listMyCompanyDocuments(company.id);
        if (mounted) setDocuments(docs);
      } catch {
        if (mounted) setDocuments([]);
      } finally {
        if (mounted) setDocsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [company]);

  if (!company) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const status: CompanyStatus = company.status;
  const statusInfo = COMPANY_STATUS_LABELS[status];
  const banner = STATUS_BANNER[status];
  const memberSince = new Date(company.created_at).toLocaleDateString();
  const approvedOn = company.approved_at ? new Date(company.approved_at).toLocaleDateString() : null;

  const StatusIcon = status === 'APPROVED' ? CheckCircle2
    : status === 'PENDING_APPROVAL' ? Clock
    : status === 'SUSPENDED' ? AlertTriangle
    : XCircle;

  const bannerTone =
    statusInfo.tone === 'emerald' ? 'from-emerald-50 via-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800'
    : statusInfo.tone === 'amber' ? 'from-amber-50 via-amber-50 to-amber-100 border-amber-200 text-amber-800'
    : 'from-rose-50 via-rose-50 to-rose-100 border-rose-200 text-rose-800';

  return (
    <div className="space-y-6">
      <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${bannerTone} shadow-brand-sm p-5 sm:p-6`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-white/80 border border-white text-[#E31B23] flex items-center justify-center shadow-sm">
            <StatusIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-current/80">
              {language === 'bn' ? 'কোম্পানি স্ট্যাটাস' : 'Company Status'}
            </p>
            <h2 className="text-base sm:text-lg font-black leading-tight mt-0.5">
              {language === 'bn' ? banner.bn : banner.en}
            </h2>
            <p className="text-[11px] mt-1 leading-relaxed">
              {language === 'bn' ? statusInfo.bn : statusInfo.en}
            </p>

            {status === 'REJECTED' && company.rejection_reason && (
              <div className="mt-3 px-3 py-2 bg-white/80 border border-white rounded-xl">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  {language === 'bn' ? 'প্রত্যাখ্যানের কারণ' : 'Rejection reason'}
                </p>
                <p className="text-xs leading-relaxed mt-0.5">{company.rejection_reason}</p>
              </div>
            )}
            {status === 'SUSPENDED' && company.suspended_reason && (
              <div className="mt-3 px-3 py-2 bg-white/80 border border-white rounded-xl">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                  {language === 'bn' ? 'স্থগিতের কারণ' : 'Suspension reason'}
                </p>
                <p className="text-xs leading-relaxed mt-0.5">{company.suspended_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-red-100 bg-white shadow-brand-sm px-5 sm:px-7 py-6 sm:py-7">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)' }}
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[radial-gradient(circle,_rgba(227,27,35,0.10),_transparent_70%)] blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.10),_transparent_70%)] blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.company_name}
                className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 bg-white shadow-md"
              />
            ) : (
              <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md text-2xl font-black">
                {company.company_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                {language === 'bn' ? statusInfo.bn : statusInfo.en}
              </span>
              <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 break-words">
                {company.company_name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {company.category}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/company/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/25 transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {language === 'bn' ? 'প্রোফাইল আপডেট' : 'Update Profile'}
            </Link>
          </div>
        </div>
      </div>

      {/* BDApps Subscription Management — let the company inspect and
          (optionally) cancel its own BDApps subscription from the dashboard.
          When the admin master toggle is OFF the component renders an
          informational "BDApps bypassed" notice instead of any controls. */}
      <CompanyBdappsManagement />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label={language === 'bn' ? 'সক্রিয় জব' : 'Active Jobs'}
          value={stats.active_jobs}
          loading={statsLoading}
          tone="brand"
        />
        <StatCard
          icon={ScrollText}
          label={language === 'bn' ? 'মোট আবেদন' : 'Total Applications'}
          value={stats.total_applications}
          loading={statsLoading}
          tone="violet"
        />
        <StatCard
          icon={Users}
          label={language === 'bn' ? 'শর্টলিস্টেড প্রার্থী' : 'Shortlisted'}
          value={stats.shortlisted}
          loading={statsLoading}
          tone="emerald"
        />
        <StatCard
          icon={Calendar}
          label={language === 'bn' ? 'আসন্ন ইন্টারভিউ' : 'Upcoming Interviews'}
          value={stats.upcoming_interviews}
          loading={statsLoading}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EntryCard
          to="/company/jobs"
          icon={Briefcase}
          title={language === 'bn' ? 'জব পোস্টিং' : 'Job Posting'}
          description={language === 'bn'
            ? 'আপনার কোম্পানির জন্য নতুন চাকরির পোস্ট তৈরি করুন এবং যাচাইকৃত প্রার্থীদের কাছে পৌঁছান।'
            : 'Create new job postings for your company and reach verified candidates.'}
          disabled={!isApproved}
        />
        <EntryCard
          to="/company/candidates"
          icon={Users}
          title={language === 'bn' ? 'ক্যান্ডিডেট অনুসন্ধান' : 'Candidate Search'}
          description={language === 'bn'
            ? 'SkillProof এর যাচাইকৃত পেশাদার প্রার্থীদের খুঁজুন এবং যোগাযোগ করুন।'
            : 'Search and connect with verified professional candidates on SkillProof.'}
          disabled={!isApproved}
        />
        <EntryCard
          to="/company/applications"
          icon={ScrollText}
          title={language === 'bn' ? 'আবেদনসমূহ' : 'Applications'}
          description={language === 'bn'
            ? 'আপনার পোস্ট করা চাকরিতে প্রাপ্ত আবেদনগুলি দেখুন ও পরিচালনা করুন।'
            : 'View and manage applications received for your posted jobs.'}
          disabled={!isApproved}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-brand-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">
              {language === 'bn' ? 'কোম্পানি সারসংক্ষেপ' : 'Company Summary'}
            </h3>
            <Link to="/company/profile" className="text-[11px] font-bold text-[#E31B23] hover:underline inline-flex items-center gap-1">
              {language === 'bn' ? 'সম্পূর্ণ দেখুন' : 'View full'} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <dl className="space-y-2 text-xs">
            <DetailRow label={language === 'bn' ? 'যোগদানের তারিখ' : 'Member Since'} value={memberSince} />
            {approvedOn && (
              <DetailRow label={language === 'bn' ? 'অনুমোদনের তারিখ' : 'Approved On'} value={approvedOn} />
            )}
            <DetailRow label={language === 'bn' ? 'ইমেইল' : 'Email'} value={company.email} />
            <DetailRow label={language === 'bn' ? 'ফোন' : 'Phone'} value={company.phone} />
            {company.contact_name && (
              <DetailRow label={language === 'bn' ? 'যোগাযোগ ব্যক্তি' : 'Contact Person'} value={company.contact_name} />
            )}
          </dl>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-brand-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">
              {language === 'bn' ? 'ভেরিফিকেশন ডকুমেন্ট' : 'Verification Documents'}
            </h3>
            <Link to="/company/profile" className="text-[11px] font-bold text-[#E31B23] hover:underline inline-flex items-center gap-1">
              {language === 'bn' ? 'পরিচালনা' : 'Manage'} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {docsLoading ? (
            <div className="space-y-2">
              <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
              <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">
                {language === 'bn' ? 'কোনো ডকুমেন্ট জমা দেওয়া হয়নি।' : 'No documents submitted yet.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => {
                const label = COMPANY_DOCUMENT_TYPE_LABELS[doc.document_type];
                return (
                  <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {language === 'bn' ? label.bn : label.en}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 ${
                      doc.verified_at ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {doc.verified_at
                        ? <><CheckCircle2 className="w-3 h-3" />{language === 'bn' ? 'যাচাইকৃত' : 'Verified'}</>
                        : <><Clock className="w-3 h-3" />{language === 'bn' ? 'অপেক্ষায়' : 'Pending'}</>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={ShieldCheck}
          label={language === 'bn' ? 'অনুমোদন স্ট্যাটাস' : 'Approval Status'}
          value={language === 'bn' ? statusInfo.bn : statusInfo.en}
          tone={statusInfo.tone === 'emerald' ? 'emerald' : statusInfo.tone === 'amber' ? 'amber' : 'rose'}
          sub={language === 'bn' ? 'কোম্পানি যাচাইকরণ' : 'Company verification'}
        />
        <MetricCard
          icon={Calendar}
          label={language === 'bn' ? 'যোগদানের তারিখ' : 'Member Since'}
          value={memberSince}
          tone="brand"
          sub={language === 'bn' ? 'অ্যাকাউন্ট তৈরি' : 'Account created'}
        />
        <MetricCard
          icon={Building2}
          label={language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
          value={company.category}
          tone="violet"
          sub={language === 'bn' ? 'শিল্প খাত' : 'Industry'}
        />
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="text-slate-500 font-semibold shrink-0">{label}</dt>
    <dd className="text-slate-900 font-bold text-right min-w-0 break-words">{value}</dd>
  </div>
);

const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
  tone: 'brand' | 'emerald' | 'amber' | 'violet';
}> = ({ icon: Icon, label, value, loading, tone }) => {
  const toneMap: Record<string, { bg: string; icon: string }> = {
    brand:   { bg: 'bg-red-50',     icon: 'bg-gradient-to-br from-[#E31B23] to-[#F97316]' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-gradient-to-br from-amber-500 to-amber-600' },
    violet:  { bg: 'bg-violet-50',  icon: 'bg-gradient-to-br from-violet-500 to-violet-600' },
  };
  const t = toneMap[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-brand-sm ${t.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : value}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl ${t.icon} text-white p-2 shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'brand' | 'slate';
}> = ({ icon: Icon, label, value, sub, tone }) => {
  const toneMap: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-gradient-to-br from-amber-500 to-amber-600' },
    rose:    { bg: 'bg-rose-50',    icon: 'bg-gradient-to-br from-rose-500 to-rose-600' },
    violet:  { bg: 'bg-violet-50',  icon: 'bg-gradient-to-br from-violet-500 to-violet-600' },
    brand:   { bg: 'bg-red-50',     icon: 'bg-gradient-to-br from-[#E31B23] to-[#F97316]' },
    slate:   { bg: 'bg-slate-50',   icon: 'bg-gradient-to-br from-slate-500 to-slate-600' },
  };
  const t = toneMap[tone] ?? toneMap.slate;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-brand-sm ${t.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
          <p className="mt-1 text-base font-black text-slate-900 break-words">{value}</p>
          {sub && <p className="mt-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-xl ${t.icon} text-white p-2 shadow-sm`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const EntryCard: React.FC<{
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  comingSoon?: boolean;
  disabled?: boolean;
}> = ({ icon: Icon, title, description, comingSoon, disabled }) => (
  <div className={`bg-white rounded-3xl border border-slate-200 p-5 shadow-brand-sm relative overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center shadow-md">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {comingSoon && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-200 whitespace-nowrap">
              Soon
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{description}</p>
        {comingSoon && (
          <p className="mt-3 text-[10px] text-slate-400 italic">
            (Foundation ready — full features coming soon.)
          </p>
        )}
      </div>
    </div>
  </div>
);

export default CompanyDashboardPage;