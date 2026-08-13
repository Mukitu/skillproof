import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  getCompanyJob,
  updateCompanyJob,
  type CompanyJobDetail,
} from '../../services/companyJobs';
import {
  CompanyJobForm,
  jobFormFromDetail,
  jobFormToPayload,
  type JobFormValues,
} from '../../components/company/CompanyJobForm';

export const CompanyJobEditPage: React.FC = () => {
  const { language } = useLanguage();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { isApproved } = useCompanyAuth();

  const [detail, setDetail] = useState<CompanyJobDetail | null>(null);
  const [initial, setInitial] = useState<JobFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!jobId) {
        setLoadError(language === 'bn' ? 'অবৈধ জব আইডি' : 'Invalid job id');
        setLoading(false);
        return;
      }
      try {
        const d = await getCompanyJob(jobId);
        if (!mounted) return;
        if (!d) {
          setLoadError(language === 'bn' ? 'জব পাওয়া যায়নি' : 'Job not found');
        } else {
          setDetail(d);
          setInitial(jobFormFromDetail(d));
        }
      } catch (err: any) {
        if (mounted) setLoadError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [jobId, language]);

  const handleSubmit = async (values: JobFormValues) => {
    if (!jobId) return;
    const payload = jobFormToPayload(values);
    await updateCompanyJob(jobId, payload);
    navigate(`/company/jobs/${jobId}`, { replace: true });
  };

  const isClosed = detail?.status === 'closed';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex items-center gap-3">
          <Link
            to={jobId ? `/company/jobs/${jobId}` : '/company/jobs'}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </Link>
          <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 truncate">
              {language === 'bn' ? 'জব এডিট করুন' : 'Edit Job'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {detail?.title ?? (language === 'bn' ? 'জব লোড হচ্ছে…' : 'Loading job…')}
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {isClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {language === 'bn'
              ? 'বন্ধ হওয়া জব আর এডিট করা যাবে না।'
              : 'Closed jobs cannot be edited.'}
          </span>
        </div>
      )}

      {!isApproved && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {language === 'bn'
              ? 'শুধুমাত্র অনুমোদিত কোম্পানি জব এডিট করতে পারবে।'
              : 'Only approved companies can edit jobs.'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      ) : initial ? (
        <CompanyJobForm
          initialValues={initial}
          submitLabel={language === 'bn' ? 'আপডেট করুন' : 'Update Job'}
          submitLabelLoading={language === 'bn' ? 'আপডেট হচ্ছে…' : 'Updating…'}
          onSubmit={handleSubmit}
          onCancel={() => navigate(jobId ? `/company/jobs/${jobId}` : '/company/jobs')}
          blockedClosedEdit={isClosed || !isApproved}
        />
      ) : null}

      {!loading && !initial && !loadError && (
        <div className="text-center text-xs text-slate-500 py-12">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default CompanyJobEditPage;