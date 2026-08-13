import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  Globe,
  FileText,
  Upload,
  X,
  Briefcase,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import type { NormalizedAuthError } from '../../services/authErrors';
import {
  createCompanyWithProfile,
  uploadCompanyDocument,
  setOwnCompanyStatus,
  markCompanyMobileVerified,
  COMPANY_DOCUMENT_TYPE_LABELS,
  type CompanyDocumentType,
} from '../../services/companies';
import { normalizeBdappsSubscriber } from '../../services/companyOtp';
import { companySupabase } from '../../lib/supabaseCompany';

type AccountType = 'user' | 'company';

const COMPANY_CATEGORIES = [
  'Information Technology',
  'Software Development',
  'Telecommunications',
  'Banking & Finance',
  'Manufacturing',
  'Retail & E-commerce',
  'Healthcare',
  'Education',
  'Marketing & Advertising',
  'Construction',
  'Hospitality & Tourism',
  'Logistics & Transportation',
  'Agriculture',
  'Energy & Utilities',
  'Media & Entertainment',
  'Consulting',
  'Real Estate',
  'NGO & Development',
  'Other',
];

const DOCUMENT_TYPES: CompanyDocumentType[] = [
  'trade_license',
  'company_registration',
  'business_certificate',
  'other',
];

export const RegisterPage: React.FC = () => {
  const [accountType, setAccountType] = useState<AccountType>('user');
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-10 sm:py-12 px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-5 sm:mb-6 space-y-2">
            <div className="mx-auto inline-flex">
              <SkillProofLogo size={56} hideWordmark />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Your Account'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {language === 'bn'
                ? 'আপনি কোন ধরনের অ্যাকাউন্ট তৈরি করতে চান?'
                : 'Choose your account type and get started in seconds.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <AccountTypeCard
              active={accountType === 'user'}
              onClick={() => setAccountType('user')}
              icon={<User className="w-5 h-5" />}
              title={language === 'bn' ? 'প্রফেশনাল ইউজার' : 'Professional User'}
              description={language === 'bn' ? 'স্কিল যাচাই ও ক্যারিয়ার' : 'Skill verification & career'}
            />
            <AccountTypeCard
              active={accountType === 'company'}
              onClick={() => setAccountType('company')}
              icon={<Building2 className="w-5 h-5" />}
              title={language === 'bn' ? 'কোম্পানি' : 'Company'}
              description={language === 'bn' ? 'রিক্রুটমেন্ট পোর্টাল' : 'Recruitment portal'}
            />
          </div>

          {accountType === 'user' ? (
            <UserSignupForm language={language} />
          ) : (
            <CompanySignupForm language={language} />
          )}

          <p className="mt-5 text-center text-xs text-slate-500">
            {language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
            <Link to="/login" className="text-[#E31B23] font-bold hover:underline">
              {language === 'bn' ? 'লগইন করুন' : 'Sign in'}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const AccountTypeCard: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ active, onClick, icon, title, description }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left p-4 rounded-2xl border-2 transition-all ${
      active
        ? 'border-[#E31B23] bg-gradient-to-br from-red-50 to-orange-50 shadow-md shadow-red-500/10'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2 ${
      active ? 'bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white' : 'bg-slate-100 text-slate-600'
    }`}>
      {icon}
    </div>
    <p className={`text-xs font-black ${active ? 'text-slate-900' : 'text-slate-700'}`}>{title}</p>
    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{description}</p>
  </button>
);

const UserSignupForm: React.FC<{ language: string }> = ({ language }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsgState] = useState('');
  const [errorCode, setErrorCodeState] = useState<NormalizedAuthError['code'] | null>(null);
  const [verificationNotice, setVerificationNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      const target =
        user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/subscription';
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsgState('');
    setErrorCodeState(null);

    if (!fullName.trim()) {
      setErrorMsgState(language === 'bn' ? 'অনুগ্রহ করে আপনার পরো নাম দিন' : 'Please enter your full name');
      return;
    }
    if (password.length < 6) {
      setErrorMsgState(language === 'bn' ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsgState(language === 'bn' ? 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUp(email, password, fullName);
      if (res.error) {
        setErrorMsgState(res.error.message);
        setErrorCodeState(res.error.code);
      } else if (res.needsVerification) {
        setVerificationNotice(true);
      }
    } catch (err: any) {
      setErrorCodeState(err?.code ?? 'unknown');
      setErrorMsgState(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-red-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-5">
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {(errorCode === 'network_error' || errorCode === 'timeout' || errorCode === 'offline') && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed">
          {language === 'bn'
            ? 'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং কিছুক্ষণ পর আবার চেষ্টা করুন।'
            : 'Please check your internet connection and try again in a moment.'}
        </div>
      )}

      {verificationNotice ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-emerald-900">
              {language === 'bn' ? 'ইমেইল ভেরিফিকেশন লিংক পাঠানো হয়েছে' : 'Verification Email Sent'}
            </h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              {language === 'bn'
                ? `আমরা ${email} ইমেইলে একটি ভেরিফিকেশন লিঙ্ক পাঠিয়েছি। লিংকটি ক্লিক করে লগইন করুন।`
                : `We have sent a verification link to ${email}. Please check your inbox and confirm your email to sign in.`}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors"
          >
            {language === 'bn' ? 'লগইন পেজে যান' : 'Go to Login'}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder={language === 'bn' ? 'যেমন: তানভীর হোসেন' : 'e.g. Tanvir Hossain'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tanvir@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'bn' ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{language === 'bn' ? 'রেজিস্ট্রেশন সম্পূর্ণ করুন' : 'Register Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

const CompanySignupForm: React.FC<{ language: string }> = ({ language }) => {
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [documentType, setDocumentType] = useState<CompanyDocumentType>('trade_license');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsgState] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const { refresh } = useCompanyAuth();
  const navigate = useNavigate();

  const validateForm = (): string | null => {
    if (!companyName.trim()) {
      return language === 'bn' ? 'কোম্পানির নাম দিন' : 'Company name is required';
    }
    if (!category.trim()) {
      return language === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Please select a category';
    }
    if (!address.trim()) {
      return language === 'bn' ? 'ঠিকানা দিন' : 'Company address is required';
    }
    const subscriber = normalizeBdappsSubscriber(phone);
    if (!subscriber) {
      return language === 'bn' ? 'একটি বৈধ মোবাইল নম্বর দিন' : 'Please enter a valid mobile number';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return language === 'bn' ? 'একটি বৈধ ইমেইল দিন' : 'Please enter a valid email address';
    }
    if (password.length < 6) {
      return language === 'bn' ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return language === 'bn' ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match';
    }
    if (!documentFile) {
      return language === 'bn' ? 'অন্তত একটি ডকুমেন্ট আপলোড করুন' : 'Please upload at least one company document';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsgState('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMsgState(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const signup = await createCompanyWithProfile({
        email,
        password,
        companyName,
        category,
        address,
        phone,
        contactName,
        websiteUrl,
      });

      try {
        await markCompanyMobileVerified(signup.company.id);
      } catch (e) {
        console.warn('mobile_verified flag update failed', e);
      }

      try {
        await setOwnCompanyStatus(signup.company.id, 'PENDING_APPROVAL');
      } catch (e) {
        console.warn('status upgrade failed', e);
      }

      if (documentFile) {
        try {
          await uploadCompanyDocument(signup.company.id, documentFile, documentType);
        } catch (uploadErr) {
          console.warn('Document upload failed; admin can still review.', uploadErr);
        }
      }

      try {
        const { data: { session: coSession } } = await companySupabase.auth.getSession();
        if (coSession) await refresh();
      } catch {}

      setStep('success');
    } catch (err: any) {
      setErrorMsgState(err?.message ?? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করা যায়নি' : 'Could not create account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-white border border-emerald-200 rounded-3xl shadow-xl p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-emerald-900">
          {language === 'bn' ? 'অ্যাকাউন্ট তৈরি সম্পন্ন!' : 'Account Created!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {language === 'bn'
            ? 'আপনার কোম্পানি অ্যাকাউন্ট অনুমোদনের জন্য অপেক্ষমাণ। Admin আপনার submitted documents যাচাই করার পর dashboard access দেওয়া হবে।'
            : 'Your company account is awaiting approval. An admin will review your submitted documents, then grant dashboard access.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md"
          >
            {language === 'bn' ? 'লগইন পেজে যান' : 'Go to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-red-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-4">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'bn' ? 'কোম্পানির নাম *' : 'Company Name *'}
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder={language === 'bn' ? 'যেমন: ABC Tech Ltd.' : 'e.g. ABC Tech Ltd.'}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'bn' ? 'ক্যাটাগরি / শিল্প *' : 'Category / Industry *'}
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition appearance-none"
            >
              <option value="" disabled>{language === 'bn' ? 'একটি ক্যাটাগরি নির্বাচন করুন' : 'Select a category'}</option>
              {COMPANY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'bn' ? 'ঠিকানা *' : 'Company Address *'}
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <textarea
              required
              rows={2}
              placeholder={language === 'bn' ? 'আপনার কোম্পানির ঠিকানা লিখুন' : 'Enter your company address'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'যোগাযোগের মোবাইল *' : 'Contact Mobile *'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel"
                placeholder="e.g. 017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {language === 'bn'
                ? 'শুধুমাত্র কোম্পানির যোগাযোগের তথ্য হিসেবে সংরক্ষিত থাকবে'
                : 'Stored only as company contact information'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'যোগাযোগ ব্যক্তির নাম' : 'Contact Person'}
            </label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'bn' ? 'ওয়েবসাইট (ঐচ্ছিক)' : 'Website (Optional)'}
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'লগইন ইমেইল *' : 'Login Email *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন *' : 'Confirm Password *'}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-[#E31B23] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">
                {language === 'bn' ? 'কোম্পানি ডকুমেন্ট *' : 'Company Document *'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'ট্রেড লাইসেন্স, নিবন্ধন, বা অন্য বৈধ প্রমাণ (PDF, JPG, PNG)'
                  : 'Trade license, registration, or other valid proof (PDF, JPG, PNG)'}
              </p>
            </div>
          </div>

          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as CompanyDocumentType)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {language === 'bn' ? COMPANY_DOCUMENT_TYPE_LABELS[t].bn : COMPANY_DOCUMENT_TYPE_LABELS[t].en}
              </option>
            ))}
          </select>

          <label className="flex flex-col items-center justify-center gap-2 px-4 py-5 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-[#E31B23] hover:bg-red-50/40 transition">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              {documentFile
                ? documentFile.name
                : (language === 'bn' ? 'ডকুমেন্ট নির্বাচন করুন' : 'Choose a document')}
            </span>
            <span className="text-[10px] text-slate-500">PDF, JPG, PNG (max 10 MB)</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 10 * 1024 * 1024) {
                  setErrorMsgState(language === 'bn' ? 'ফাইল ১০ MB এর কম হতে হবে' : 'File must be under 10 MB');
                  return;
                }
                setErrorMsgState('');
                setDocumentFile(f);
              }}
            />
          </label>

          {documentFile && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-semibold truncate">
                  {documentFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDocumentFile(null)}
                className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{language === 'bn' ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...'}</span>
            </>
          ) : (
            <>
              <span>{language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;