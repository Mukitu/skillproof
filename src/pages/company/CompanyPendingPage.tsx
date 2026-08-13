import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Building2,
  FileText,
  RefreshCw,
  LogOut,
  Mail,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { COMPANY_STATUS_LABELS, type CompanyStatus } from '../../services/companies';

export const CompanyPendingPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { company, isAuthenticated, isApproved, signOut, refresh } = useCompanyAuth();

  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (isApproved) {
      navigate('/company/dashboard', { replace: true });
    }
  }, [isAuthenticated, isApproved, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    try { window.history.replaceState(null, '', '/'); } catch {}
    navigate('/', { replace: true });
  };

  const status: CompanyStatus = company?.status ?? 'PENDING_APPROVAL';
  const statusInfo = COMPANY_STATUS_LABELS[status];

  const isAwaitingOtp = status === 'PENDING_OTP';
  const isPending = status === 'PENDING_APPROVAL';
  const isRejected = status === 'REJECTED';
  const isSuspended = status === 'SUSPENDED';

  const StatusIcon = isAwaitingOtp ? ShieldCheck
    : isPending ? Clock
    : isRejected ? XCircle
    : isSuspended ? AlertTriangle
    : CheckCircle2;
  const statusIconBg =
    isAwaitingOtp ? 'bg-blue-100 text-blue-600'
    : isPending ? 'bg-amber-100 text-amber-600'
    : isRejected ? 'bg-rose-100 text-rose-600'
    : isSuspended ? 'bg-orange-100 text-orange-600'
    : 'bg-emerald-100 text-emerald-600';

  const heading = isAwaitingOtp
    ? (language === 'bn' ? 'মোবাইল যাচাই প্রক্রিয়াধীন' : 'Mobile Verification Pending')
    : isPending
    ? (language === 'bn' ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Awaiting Admin Approval')
    : isRejected
    ? (language === 'bn' ? 'আবেদন প্রত্যাখ্যাত হয়েছে' : 'Application Rejected')
    : isSuspended
    ? (language === 'bn' ? 'অ্যাকাউন্ট স্থগিত করা হয়েছে' : 'Account Suspended')
    : (language === 'bn' ? 'অনুমোদন সম্পন্ন' : 'Approval Complete');

  const subtitle = isAwaitingOtp
    ? (language === 'bn'
        ? 'আপনার মোবাইল নম্বর এখনও যাচাই করা হয়নি। যাচাই সম্পন্ন হলে অ্যাডমিন অনুমোদনের জন্য আবেদন জমা হবে।'
        : 'Your mobile number is not verified yet. Once verified, the application will be submitted for admin review.')
    : isPending
    ? (language === 'bn'
        ? 'আপনার কোম্পানি অ্যাকাউন্ট এখন অ্যাডমিন পর্যালোচনায় আছে। অনুমোদনের পর আপনি স্বয়ংক্রিয়ভাবে Company Dashboard-এ প্রবেশ করতে পারবেন।'
        : 'Your company account is currently under admin review. Once approved, you will automatically get access to the Company Dashboard.')
    : isRejected
    ? (language === 'bn'
        ? 'আপনার কোম্পানি অ্যাকাউন্টের আবেদন প্রত্যাখ্যাত হয়েছে। বিস্তারিত জানতে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।'
        : 'Your company account application has been rejected. Please contact our support team for more details.')
    : isSuspended
    ? (language === 'bn'
        ? 'আপনার কোম্পানি অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। আবার সক্রিয় করতে সাপোর্টের সাথে যোগাযোগ করুন।'
        : 'Your company account has been temporarily suspended. Contact support to reactivate.')
    : '';

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="mx-auto inline-flex">
              <SkillProofLogo size={56} hideWordmark />
            </div>
          </div>

          <div className="bg-white border border-red-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />

            <div className="p-6 sm:p-8 text-center space-y-5">
              <div className={`mx-auto w-16 h-16 rounded-full ${statusIconBg} flex items-center justify-center`}>
                <StatusIcon className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{heading}</h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                  {subtitle}
                </p>
              </div>

              {company && (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <Building2 className="w-4 h-4 text-[#E31B23]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {language === 'bn' ? 'কোম্পানি তথ্য' : 'Company Information'}
                    </span>
                  </div>

                  <DetailRow
                    label={language === 'bn' ? 'কোম্পানির নাম' : 'Company Name'}
                    value={company.company_name}
                  />
                  <DetailRow
                    label={language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                    value={company.category}
                  />
                  <DetailRow
                    label={language === 'bn' ? 'ঠিকানা' : 'Address'}
                    value={company.address}
                  />
                  <DetailRow
                    label={language === 'bn' ? 'যোগাযোগ' : 'Contact'}
                    value={`${company.email} · ${company.phone}`}
                  />
                  <DetailRow
                    label={language === 'bn' ? 'ডকুমেন্ট স্ট্যাটাস' : 'Submitted Document'}
                    value={
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <FileText className="w-3.5 h-3.5" />
                        {language === 'bn' ? 'জমা দেওয়া হয়েছে' : 'Submitted for review'}
                      </span>
                    }
                  />
                  <DetailRow
                    label={language === 'bn' ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}
                    value={
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        statusInfo.tone === 'emerald' ? 'text-emerald-700'
                          : statusInfo.tone === 'amber' ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {language === 'bn' ? statusInfo.bn : statusInfo.en}
                      </span>
                    }
                  />
                  <DetailRow
                    label={language === 'bn' ? 'জমা দেওয়ার তারিখ' : 'Submitted Date'}
                    value={new Date(company.created_at).toLocaleString()}
                  />

                  {isRejected && company.rejection_reason && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                        {language === 'bn' ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {company.rejection_reason}
                      </p>
                    </div>
                  )}

                  {isSuspended && company.suspended_reason && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 mb-1">
                        {language === 'bn' ? 'স্থগিতের কারণ' : 'Suspension Reason'}
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {company.suspended_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                {isAwaitingOtp && (
                  <button
                    type="button"
                    onClick={() => navigate('/company/verify', { replace: true })}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'মোবাইল যাচাই করুন' : 'Verify Mobile Now'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'bn' ? 'আপডেট হচ্ছে...' : 'Refreshing...'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'স্ট্যাটাস আপডেট করুন' : 'Refresh Status'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সাইন আউট' : 'Sign out'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Mail className="w-3.5 h-3.3 text-slate-500 shrink-0" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? 'অনুমোদনের পর আপনার নিবন্ধিত ইমেইলে একটি নোটিফিকেশন পাঠানো হবে।'
                    : 'You will receive a notification email once your account is approved.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-[11px] text-slate-500 hover:text-[#E31B23] font-semibold">
              ← {language === 'bn' ? 'অন্য অ্যাকাউন্ট' : 'Use a different account'}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-slate-500 font-semibold shrink-0">{label}</span>
    <span className="text-slate-900 font-bold text-right min-w-0 break-words">{value}</span>
  </div>
);

export default CompanyPendingPage;