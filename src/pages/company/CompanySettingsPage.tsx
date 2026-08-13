import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  Building2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { COMPANY_STATUS_LABELS } from '../../services/companies';
import { changeCompanyPassword } from '../../services/companies';

export const CompanySettingsPage: React.FC = () => {
  const { language } = useLanguage();
  const { company, isApproved, signOut } = useCompanyAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 8) {
      setPwError(language === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(language === 'bn' ? 'নতুন পাসওয়ার্ড মিলছে না' : 'New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      setPwError(language === 'bn' ? 'নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ডের মতো হতে পারবে না' : 'New password must differ from the current one');
      return;
    }

    setPwSaving(true);
    try {
      await changeCompanyPassword(newPassword);
      setPwSuccess(language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন সম্পন্ন' : 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.message ?? (language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Could not change password'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    if (!confirm(language === 'bn' ? 'সাইন আ�ট করবেন?' : 'Sign out now?')) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  if (!company) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const statusInfo = COMPANY_STATUS_LABELS[company.status];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900">
              {language === 'bn' ? 'কোম্পানি সেটিংস' : 'Company Settings'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn' ? 'অ্যাকাউন্ট নিরাপত্তা এবং কোম্�ানির সারসংক্ষেপ পরিচালনা করুন' : 'Manage your account security and company summary'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'কোম্পানি তথ্য' : 'Company Information'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {language === 'bn'
            ? 'কোম্পানির নাম, ঠিকানা এবং যোগাযোগের তথ্য সম্পাদনা করতে Company Profile পেজে যান।'
            : 'To edit your company name, address, or contact details, visit the Company Profile page.'}
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <InfoRow icon={Building2} label={language === 'bn' ? 'নাম' : 'Name'} value={company.company_name} />
          <InfoRow icon={Sparkles} label={language === 'bn' ? 'ক্যাটাগরি' : 'Category'} value={company.category} />
          <InfoRow icon={Mail} label={language === 'bn' ? 'ইমেইল' : 'Email'} value={company.email} />
          <InfoRow icon={Phone} label={language === 'bn' ? 'ফোন' : 'Phone'} value={company.phone} />
          <InfoRow icon={User} label={language === 'bn' ? '�োগাযোগ ব্যক্তি' : 'Contact Person'} value={company.contact_name ?? '—'} />
          <InfoRow icon={Globe} label={language === 'bn' ? 'ওয়েবসাইট' : 'Website'} value={company.website_url ?? '—'} />
          <InfoRow
            icon={MapPin}
            label={language === 'bn' ? 'ঠিকানা' : 'Address'}
            value={company.address}
            fullWidth
          />
        </dl>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'পাসওয়ার্ড / নিরাপত্তা' : 'Password & Security'}
        </h2>

        {pwError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{pwError}</span>
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{pwSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordField
            label={language === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            icon={Lock}
            autoComplete="current-password"
          />
          <PasswordField
            label={language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            icon={KeyRound}
            autoComplete="new-password"
          />
          <PasswordField
            label={language === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            icon={KeyRound}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={pwSaving || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
          >
            {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{language === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'অ্যাকা�ন্ট স্ট্যাটাস' : 'Account Status'}
        </h2>
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
          statusInfo.tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : statusInfo.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
              {language === 'bn' ? 'বর্তমান অবস্থা' : 'Current State'}
            </p>
            <p className="text-sm font-black mt-0.5">
              {language === 'bn' ? statusInfo.bn : statusInfo.en}
            </p>
            <p className="text-[11px] mt-1 leading-relaxed">
              {isApproved
                ? (language === 'bn' ? 'আপনার কোম্পানির সব ফিচারে প্রবেশাধিকার রয়েছে।' : 'You have full access to company features.')
                : (language === 'bn' ? 'অনুমোদনের আগে কোম্পানি ড্যাশবোর্ড সীমিত।' : 'Company Dashboard access is limited until approval.')}
            </p>
            <p className="text-[10px] mt-2 leading-relaxed inline-flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'অনুমোদন, প্রত্যা�্যান বা স্থগিতকরণ শুধুমাত্র অ্যাডমিন করতে পারেন।'
                  : 'Approval, rejection, or suspension is managed by admins only.'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <LogOut className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'সেশন' : 'Session'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          {language === 'bn' ? 'আপনার বর্তমান সেশন শেষ করতে নিচের বোতাম চা�ুন।' : 'End your current session by clicking below.'}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl disabled:opacity-60"
        >
          {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>{language === 'bn' ? 'সাইন আউট' : 'Sign out'}</span>
        </button>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}> = ({ icon: Icon, label, value, fullWidth }) => (
  <div className={`flex items-start gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl ${fullWidth ? 'sm:col-span-2' : ''}`}>
    <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs font-bold text-slate-900 mt-0.5 break-words">{value}</p>
    </div>
  </div>
);

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
}> = ({ label, value, onChange, show, onToggle, icon: Icon, autoComplete }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

export default CompanySettingsPage;