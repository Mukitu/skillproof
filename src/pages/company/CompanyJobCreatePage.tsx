import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Briefcase } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { createCompanyJob } from '../../services/companyJobs';
import { CompanyJobForm, EMPTY_JOB_FORM, jobFormToPayload, type JobFormValues } from '../../components/company/CompanyJobForm';

export const CompanyJobCreatePage: React.FC = () => {
  const { language } = useLanguage();
  const { isApproved } = useCompanyAuth();
  const navigate = useNavigate();

  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApproved) {
      setPageError(
        language === 'bn'
          ? 'শুধুমাত্র অনুমোদিত কোম্পানি জব পোস্ট করতে পারবে।'
          : 'Only approved companies can post jobs.',
      );
    }
  }, [isApproved, language]);

  const handleSubmit = async (values: JobFormValues) => {
    const payload = jobFormToPayload(values);
    const created = await createCompanyJob(payload);
    navigate(`/company/jobs/${created.id}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex items-center gap-3">
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
            <h1 className="text-lg font-black text-slate-900 truncate">
              {language === 'bn' ? 'নতুন জব পোস্ট' : 'Post New Job'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {language === 'bn'
                ? 'জবের বিবরণ পূরণ করুন এবং ড্রাফট হিসেবে সংরক্ষণ করুন'
                : 'Fill in the job details and save as a draft'}
            </p>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{pageError}</span>
        </div>
      )}

      <CompanyJobForm
        initialValues={EMPTY_JOB_FORM}
        submitLabel={language === 'bn' ? 'ড্রাফট সংরক্ষণ' : 'Save Draft'}
        submitLabelLoading={language === 'bn' ? 'সংরক্ষণ হচ্ছে…' : 'Saving…'}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/company/jobs')}
        blockedClosedEdit={!isApproved}
      />
    </div>
  );
};

export default CompanyJobCreatePage;
