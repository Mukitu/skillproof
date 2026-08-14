import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { SEOHead } from '../../components/public/SEOHead';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import { SupportContactCard } from '../../components/common/SupportContactCard';
import { unifiedLogin } from '../../services/unifiedAuth';
import type { NormalizedAuthError } from '../../services/authErrors';
import { supabase } from '../../lib/supabase';
import { companySupabase } from '../../lib/supabaseCompany';

function resolvePostLoginPath(kind: 'admin' | 'user' | 'company'): string {
  if (kind === 'admin') return '/admin';
  // Company always lands in the BDApps subscription gate — `CompanyProtectedRoute`
  // decides whether to bounce them straight to /company/dashboard (premium
  // or already-subscribed) or render the /company/subscription page.
  if (kind === 'company') return '/company/subscription';
  return '/subscription';
}

async function waitForSession(client: typeof supabase, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await client.auth.getSession();
    if (data.session?.user?.id) return true;
    await new Promise((r) => setTimeout(r, 80));
  }
  return false;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState<NormalizedAuthError['code'] | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { user, resetPassword, refresh: refreshUser } = useAuth();
  const { company, refresh: refreshCompany } = useCompanyAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Defensive guard: only redirect if BOTH contexts agree on the same
    // portal. Mixed state (e.g. stale user from a previous session that
    // somehow survived a company login) should NOT trigger a bounce.
    if (user && company) return;
    if (user && !company) {
      const target =
        user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/subscription';
      navigate(target, { replace: true });
      return;
    }
    if (company && !user) {
      navigate('/company/subscription', { replace: true });
    }
  }, [user, company, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode(null);
    setResetSuccessMsg('');
    setIsSubmitting(true);

    try {
      const result = await unifiedLogin(email, password);

      // Wait for the Supabase client to commit the new session into its
      // storage key — without this, refresh() can race the persistence and
      // read a stale empty session, leaving the user signed in but the
      // context empty (and the page stuck on /login).
      const ready = await waitForSession(
        result.kind === 'company' ? companySupabase : supabase,
      );
      if (!ready) {
        setErrorMsg('Session did not finalize. Please try again in a moment.');
        return;
      }

      if (result.kind === 'company') {
        await refreshCompany();
      } else {
        await refreshUser();
      }

      const target = resolvePostLoginPath(result.kind);
      navigate(target, { replace: true });
    } catch (err: any) {
      // Map any thrown error onto a NormalizedAuthError-compatible code so
      // the page's hint banners keep working.
      const rawCode: string = err?.code ?? 'unknown';
      const message: string =
        err?.message ||
        (rawCode === 'invalid_credentials'
          ? 'Incorrect email or password.'
          : 'Login failed. Please try again.');
      let mapped: NormalizedAuthError['code'] = 'unknown';
      if (rawCode === 'invalid_credentials') mapped = 'invalid_credentials';
      else if (rawCode === 'account_suspended' || /suspended/i.test(message)) mapped = 'account_suspended';
      else if (rawCode === 'too_many_requests' || /too many/i.test(message)) mapped = 'too_many_requests';
      else if (rawCode === 'network_error' || /network|fetch/i.test(message)) mapped = 'network_error';
      else if (rawCode === 'email_not_confirmed' || /email not confirmed/i.test(message)) mapped = 'email_not_confirmed';
      else if (rawCode === 'unknown_account') mapped = 'unknown';
      setErrorCode(mapped);
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode(null);
    setResetSuccessMsg('');
    if (!resetEmail) return;

    setIsSubmitting(true);
    try {
      const res = await resetPassword(resetEmail);
      if (res.error) {
        setErrorMsg(res.error.message);
        setErrorCode(res.error.code);
      } else {
        setResetSuccessMsg(
          language === 'bn'
            ? 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে!'
            : 'Password reset link has been sent to your email address!',
        );
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (err: any) {
      setErrorCode(err?.code ?? 'unknown');
      setErrorMsg(err?.message || 'Password reset request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const networkError = errorCode === 'network_error' || errorCode === 'timeout' || errorCode === 'offline';
  const configError = errorCode === 'configuration_missing' || errorCode === 'configuration_invalid';
  const cspError = errorCode === 'csp';
  const throttled = errorCode === 'too_many_requests' || errorCode === 'rate_limited' || errorCode === 'over_email_send_rate_limit';
  const locked = errorCode === 'account_locked';
  const captcha = errorCode === 'captcha_required';
  const suspended = errorCode === 'account_suspended';
  const showRetryHint = networkError || configError || cspError || throttled || locked || captcha;
  const showSupportCard = suspended;

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <SEOHead
        pageKey="login"
        path="/login"
        title="Login | SkillProof"
        description="Sign in to your SkillProof account to manage your career profile, skill passport, and roadmap."
        robots="noindex,nofollow"
      />
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto">
              <SkillProofLogo size={56} hideWordmark />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {language === 'bn' ? 'স্কিলপ্রুফে লগইন করুন' : 'Sign In to SkillProof'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'bn'
                ? 'বাংলাদেশের বিশ্বস্ত স্কিল ভেরিফিকেশন প্ল্যাটফর্ম'
                : 'Skill Verification & Career Development for Bangladesh'}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              {language === 'bn'
                ? 'একই পেজ থেকে User এবং Company অ্যাকাউন্টে লগইন করা যায়।'
                : 'Use the same page to sign in to either a User or Company account.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="flex-1">
                {errorMsg}
                {(throttled || locked) && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setErrorMsg(''); setErrorCode(null); }}
                      className="font-bold text-[#E31B23] hover:underline"
                    >
                      {language === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset password'}
                    </button>
                  </>
                )}
              </span>
            </div>
          )}

          {showSupportCard && (
            <div className="space-y-3">
              <SupportContactCard
                variant="rose"
                language={language}
                titleBn="আপনার account suspend করা হয়েছে"
                titleEn="Your account is suspended"
                descriptionBn="admin আপনার account সাময়িকভাবে suspend করেছে। সমস্যা সমাধানের জন্য নিচের যেকোনো মাধ্যমে আমাদের সাথে যোগাযোগ করুন।"
                descriptionEn="An admin has temporarily suspended your account. Please reach us through any of the channels below to resolve the issue."
              />
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setErrorMsg(''); setErrorCode(null); }}
                className="w-full py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {language === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset password'}
              </button>
            </div>
          )}

          {showRetryHint && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed">
              {networkError
                ? (language === 'bn'
                    ? 'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং কিছুক্ষণ পর আবার চেষ্টা করুন।'
                    : 'Please check your internet connection and try again in a moment.')
                : cspError
                  ? (language === 'bn'
                      ? 'ব্রাউজার CSP নীতি সার্ভার প্রতিক্রিয়া ব্লক করছে। অ্যাডমিনিস্ট্রেটরকে জানান।'
                      : 'The browser blocked the request due to Content Security Policy. Please contact the site administrator.')
                  : throttled
                    ? (language === 'bn'
                        ? 'অনেক বেশি চেষ্টা হয়েছে — কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন, অথবা "Forgot password" ব্যবহার করে password reset করুন।'
                        : 'Too many sign-in attempts. Please wait a few minutes, or use "Forgot password" to reset.')
                    : locked
                      ? (language === 'bn'
                          ? 'নিরাপত্তার কারণে account সাময়িকভাবে lock হয়েছে। কয়েক মিনিট অপেক্ষা করুন অথবা password reset করুন।'
                          : 'Your account is temporarily locked for safety. Please wait a few minutes or reset your password.')
                      : captcha
                        ? (language === 'bn'
                            ? 'Captcha verification দরকার — পেজ reload করে আবার চেষ্টা করুন।'
                            : 'A captcha is required. Please reload the page and try again.')
                        : (language === 'bn'
                            ? 'প্রমাণীকরণ সেটআপ সম্পূর্ণ নয়। অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।'
                            : 'Authentication is not properly configured. Please contact the site administrator.')}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setErrorMsg(''); setErrorCode(null); }}
                    className="text-[11px] font-bold text-[#E31B23] hover:underline"
                  >
                    {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
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
                  {language === 'bn' ? 'পাসওয়ার্ড পুনর্নির্ধারণ' : 'Reset Password'}
                </p>
                <p>
                  {language === 'bn'
                    ? 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা প্রদান করুন। আমরা আপনাকে একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব।'
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
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setErrorMsg(''); setErrorCode(null); }}
                  className="w-1/2 py-2.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  {language === 'bn' ? 'ফিরে যান' : 'Back to Login'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{language === 'bn' ? 'ইমেইল পাঠান' : 'Send Link'}</span>}
                </button>
              </div>

              <SupportContactCard
                compact
                language={language}
                titleBn="ইমেইল পাচ্ছেন না?"
                titleEn="Not getting the email?"
                descriptionBn="রিসেট লিঙ্ক না পেলে সরাসরি আমাদের সাথে যোগাযোগ করুন।"
                descriptionEn="If you don't get the reset link, contact us directly."
              />
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            {language === 'bn' ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
            <Link to="/register" className="text-[#E31B23] font-bold hover:underline">
              {language === 'bn' ? 'সাইন আপ করুন' : 'Register now'}
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;
