import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import type { NormalizedAuthError } from '../../services/authErrors';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState<NormalizedAuthError['code'] | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updatePassword, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  React.useEffect(() => {
    
    
    if (!user && !success) {
      
      
      const id = window.setTimeout(() => {
        if (!user) navigate('/login', { replace: true });
      }, 800);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [user, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode(null);

    if (password.length < 6) {
      setErrorMsg(language === 'bn' ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(language === 'bn' ? 'পাসওয়ার্ড দুটি মিলছে না' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updatePassword(password);
      if (res.error) {
        setErrorMsg(res.error.message);
        setErrorCode(res.error.code);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    } catch (err: any) {
      setErrorCode(err?.code ?? 'unknown');
      setErrorMsg(err?.message || 'Password update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {language === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন' : 'Enter your new secure account password below'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {(errorCode === 'session_expired' || errorCode === 'session_missing') && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed">
              {language === 'bn'
                ? 'আপনার রিসেট লিঙ্কের মেয়াদ শেষ হয়ে গেছে বা একবারই ব্যবহার করা হয়েছে। অনুগ্রহ করে আবার নতুন লিঙ্ক চান।'
                : 'Your reset link has expired or already been used. Please request a new one.'}
              <div className="mt-2">
                <Link to="/forgot-password" className="text-[#E31B23] font-bold hover:underline">
                  {language === 'bn' ? 'নতুন লিঙ্ক চান' : 'Request new link'}
                </Link>
              </div>
            </div>
          )}

          {success ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-emerald-900">
                  {language === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : 'Password Updated Successfully!'}
                </h3>
                <p className="text-xs text-emerald-700">
                  {language === 'bn' ? 'আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...' : 'Redirecting to login page...'}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
              >
                {language === 'bn' ? 'এখনই লগইন করুন' : 'Sign In Now'}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
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
                  {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
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
                    <span>{language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};