import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { signIn, resetPassword, role } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(res.error.message);
      } else {
        // Redirect based on updated auth state/role
        navigate((role === 'admin' || role === 'super_admin' || email.toLowerCase() === 'mukituislamnishat@gmail.com') ? '/admin' : '/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccessMsg('');
    if (!resetEmail) return;

    setIsSubmitting(true);
    try {
      const res = await resetPassword(resetEmail);
      if (res.error) {
        setErrorMsg(res.error.message);
      } else {
        setResetSuccessMsg(
          language === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে!'
            : 'Password reset link has been sent to your email address!'
        );
        setShowForgotPassword(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ED1C24] via-[#F58220] to-[#FFB000] text-white flex items-center justify-center mx-auto shadow-md shadow-red-500/20">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {language === 'bn' ? 'স্কিলপ্রুফে লগইন করুন' : 'Sign In to SkillProof'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'বাংলাদেশের বিশ্বস্ত স্কিল ভেরিফিকেশন প্ল্যাটফর্ম' : 'Skill Verification & Career Development for Bangladesh'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {!showForgotPassword ? (
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
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-bold text-[#ED1C24] hover:underline"
                  >
                    {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  {language === 'bn' ? 'পাসওয়ার্ড পুনর্নির্ধারণ' : 'Reset Password'}
                </p>
                <p>
                  {language === 'bn'
                    ? 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা প্রদান করুন। আমরা আপনাকে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব।'
                    : 'Enter your account email address. We will send you an email to reset your password.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-1/2 py-2.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  {language === 'bn' ? 'ফিরে যান' : 'Back to Login'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{language === 'bn' ? 'ইমেইল পাঠান' : 'Send Link'}</span>}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            {language === 'bn' ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
            <Link to="/register" className="text-[#ED1C24] font-bold hover:underline">
              {language === 'bn' ? 'সাইন আপ করুন' : 'Register now'}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};
