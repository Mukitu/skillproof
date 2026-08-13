import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Mail, ArrowRight, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import { SupportContactCard } from '../../components/common/SupportContactCard';
import type { NormalizedAuthError } from '../../services/authErrors';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState<NormalizedAuthError['code'] | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode(null);
    setSuccessMsg('');
    if (!email) return;

    setIsSubmitting(true);
    try {
      const res = await resetPassword(email);
      if (res.error) {
        setErrorMsg(res.error.message);
        setErrorCode(res.error.code);
      } else {
        setSuccessMsg(
          language === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে! অনুগ্রহ করে ইনবক্স চেক করুন।'
            : 'Password reset link has been sent to your email address! Please check your inbox.',
        );
      }
    } catch (err: any) {
      setErrorCode(err?.code ?? 'unknown');
      setErrorMsg(err?.message || 'Password reset request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNetworkHint = errorCode === 'network_error' || errorCode === 'timeout' || errorCode === 'offline';

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto">
              <SkillProofLogo size={56} hideWordmark />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'bn'
                ? 'আপনার ইমেইল দিন, আমরা আপনাকে পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব'
                : 'Enter your email address and we will send you a link to reset your password.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {showNetworkHint && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed">
              {language === 'bn'
                ? 'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং কিছুক্ষণ পর আবার চেষ্টা করুন।'
                : 'Please check your internet connection and try again in a moment.'}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  <span>{language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending Link...'}</span>
                </>
              ) : (
                <>
                  <span>{language === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <SupportContactCard
            variant="amber"
            language={language}
            titleBn="ইমেইল পাচ্ছেন না?"
            titleEn="Not getting the email?"
            descriptionBn="রিসেট লিঙ্ক না পেলে বা অন্য কোনো সমস্যা হলে সরাসরি আমাদের সাথে যোগাযোগ করুন — আমরা সাহায্য করতে প্রস্তুত।"
            descriptionEn="If you don't receive the reset link or run into any other issue, contact us directly — we're ready to help."
          />

          <p className="text-center text-xs text-slate-500">
            {language === 'bn' ? 'মনে পড়েছে? ' : 'Remember your password? '}
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