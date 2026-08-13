import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Loader2,
  LogOut,
  MessageSquare,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SkillProofLogo } from '../../components/brand';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  sendOtp,
  verifyOtp,
  normalizeBdappsSubscriber,
} from '../../services/companyOtp';
import { fetchCompanyOtpEnabled, markCompanyMobileVerified } from '../../services/companies';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function distributeDigits(source: string): string[] {
  const next = Array(OTP_LENGTH).fill('');
  for (let i = 0; i < OTP_LENGTH && i < source.length; i++) {
    next[i] = source[i];
  }
  return next;
}

function maskPhone(p: string): string {
  if (p.length <= 6) return p;
  return p.slice(0, 4) + '****' + p.slice(-2);
}

/**
 * Company post-login mobile verification screen.
 *
 * Used for non-premium companies only — the route is gated by
 * `CompanyProtectedRoute`. Premium companies bypass this entirely
 * and land directly on the Company Dashboard.
 *
 * Re-uses the existing BDApps OTP service (`companyOtp.ts`) WITHOUT
 * modifying that file. On successful verification:
 *   1. We call `fn_company_mark_mobile_verified` to persist the flag.
 *   2. We refresh the company context so `isPremium` is recomputed.
 *   3. We redirect to the dashboard.
 *
 * If the company's status is not yet `APPROVED` (i.e. they're still
 * `PENDING_OTP` or `PENDING_APPROVAL`), we redirect to `/company/pending`
 * instead — the OTP screen is only useful once admin approval is done.
 */
export const CompanyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { company, isAuthenticated, isApproved, isLoading, refresh, signOut } = useCompanyAuth();

  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [phase, setPhase] = useState<'send' | 'verify'>('send');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedPhone = company?.phone
    ? normalizeBdappsSubscriber(company.phone)
    : null;
  const maskedPhone = normalizedPhone ? maskPhone(normalizedPhone) : '';

  // null = still loading the toggle, true = enabled, false = disabled
  const [otpEnabled, setOtpEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const enabled = await fetchCompanyOtpEnabled();
        if (!cancelled) setOtpEnabled(enabled);
      } catch {
        if (!cancelled) setOtpEnabled(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // -------------------------------------------------------------------
  // Route guards
  // -------------------------------------------------------------------
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !company) {
      navigate('/login', { replace: true });
      return;
    }
    // If already mobile-verified AND approved, no need to be here.
    if (company.mobile_verified && isApproved) {
      navigate('/company/dashboard', { replace: true });
      return;
    }
    // Admin disabled BDApps OTP — bypass the gate entirely.
    if (otpEnabled === false) {
      navigate('/company/dashboard', { replace: true });
      return;
    }
    // If not yet approved at all, bounce back to the pending page so the
    // admin flow stays the source of truth.
    if (!isApproved) {
      navigate('/company/pending', { replace: true });
    }
  }, [isLoading, isAuthenticated, isApproved, company, navigate, otpEnabled]);

  // -------------------------------------------------------------------
  // Resend countdown ticker
  // -------------------------------------------------------------------
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputsRef.current[index] = el;
    },
    [],
  );

  const resetDigits = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    requestAnimationFrame(() => inputsRef.current[0]?.focus());
  };

  const triggerSend = useCallback(
    async (mobile: string) => {
      setError('');
      setIsSending(true);
      try {
        const res = await sendOtp(mobile);
        if (!res.success || !res.referenceNo) {
          setError(
            language === 'bn'
              ? 'OTP পাঠানো যায়নি। আবার চেষ্টা করুন।'
              : res.statusDetail || 'Could not send OTP. Please try again.',
          );
          return;
        }
        setReferenceNo(res.referenceNo);
        setPhase('verify');
        setResendCountdown(RESEND_COOLDOWN_SECONDS);
        resetDigits();
      } catch (err: any) {
        setError(err?.message ?? 'Failed to send OTP.');
      } finally {
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

  // Auto-send on mount once we know the company phone
  useEffect(() => {
    if (phase !== 'send') return;
    if (!normalizedPhone || isSending) return;
    void triggerSend(normalizedPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedPhone, phase]);

  // -------------------------------------------------------------------
  // OTP input handlers
  // -------------------------------------------------------------------
  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      setDigits(distributeDigits(cleaned));
      const focusIdx = Math.min(cleaned.length, OTP_LENGTH - 1);
      inputsRef.current[focusIdx]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = cleaned.slice(-1);
    setDigits(next);
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (text.length === 0) return;
    e.preventDefault();
    setDigits(distributeDigits(text));
    const focusIdx = Math.min(text.length, OTP_LENGTH - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  // -------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNo) {
      setError(
        language === 'bn'
          ? 'প্রথমে OTP পাঠান।'
          : 'Send the OTP first.',
      );
      return;
    }
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setError(
        language === 'bn'
          ? `অনুগ্রহ করে পুরো ${OTP_LENGTH}-সংখ্যার কোড দিন।`
          : `Please enter the full ${OTP_LENGTH}-digit code.`,
      );
      return;
    }
    setError('');
    setIsVerifying(true);
    try {
      const result = await verifyOtp(referenceNo, code);
      // BDApps success is signalled by statusCode === '0' OR
      // statusCode === '1100' (already-verified subscriber); both count
      // as "mobile confirmed by the operator" for our purposes.
      const ok =
        result?.statusCode === '0' ||
        result?.statusCode === '1100' ||
        result?.subscriptionStatus === '1';
      if (!ok) {
        setError(
          result?.statusDetail ||
            (language === 'bn'
              ? 'OTP যাচাই ব্যর্থ হয়েছে।'
              : 'OTP verification failed.'),
        );
        resetDigits();
        return;
      }
      // Persist the verified flag on the company row.
      if (company?.id) {
        try {
          await markCompanyMobileVerified(company.id);
        } catch (err) {
          // Soft-fail: operator already accepted the OTP, so don't block.
          console.error('Failed to persist mobile_verified', err);
        }
      }
      await refresh();
      navigate('/company/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'OTP verification failed.');
      resetDigits();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !normalizedPhone) return;
    await triggerSend(normalizedPhone);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  if (isLoading || otpEnabled === null) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E31B23]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="mx-auto mb-3 inline-flex">
              <SkillProofLogo size={56} hideWordmark />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {language === 'bn' ? 'মোবাইল নম্বর যাচাই করুন' : 'Verify Your Mobile'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {maskedPhone ? (
                language === 'bn' ? (
                  <>
                    আমরা <span className="font-semibold text-slate-700">{maskedPhone}</span>{' '}
                    নম্বরে একটি {OTP_LENGTH}-সংখ্যার কোড পাঠিয়েছি।
                  </>
                ) : (
                  <>
                    We just sent a {OTP_LENGTH}-digit code to{' '}
                    <span className="font-semibold text-slate-700">{maskedPhone}</span>.
                  </>
                )
              ) : (
                language === 'bn'
                  ? 'আপনার নিবন্ধিত মোবাইল নম্বরে একটি কোড পাঠানো হবে।'
                  : 'We will send a code to your registered mobile number.'
              )}
            </p>
          </div>

          <div className="relative">
            <CardBackdrop />
            <div className="relative bg-white border border-red-100 rounded-3xl shadow-xl p-6 sm:p-7">
              {company && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                  <span className="font-semibold truncate">{company.company_name}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {language === 'bn' ? 'ওয়ান-টাইম পাসওয়ার্ড' : 'One-time password'}
                  </label>
                  <div className="flex items-center gap-2 sm:gap-3 justify-between">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={setInputRef(i)}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        disabled={phase === 'send' || isSending}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    phase === 'send' ||
                    isSending ||
                    isVerifying ||
                    digits.join('').length !== OTP_LENGTH
                  }
                  className="w-full py-3 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {language === 'bn' ? 'OTP যাচাই করুন' : 'Verify OTP'}
                      </span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || isSending || isVerifying}
                  className="inline-flex items-center gap-1 font-semibold text-[#E31B23] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {resendCountdown > 0
                    ? (language === 'bn'
                        ? `${resendCountdown} সে. পরে আবার পাঠান`
                        : `Resend in ${resendCountdown}s`)
                    : (language === 'bn'
                        ? 'আবার OTP পাঠান'
                        : 'Resend OTP')}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-rose-600"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'সাইন আউট' : 'Sign out'}
                </button>
              </div>

              {phase === 'send' && (
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? 'OTP পাঠানো হচ্ছে...'
                      : 'Sending OTP to your registered mobile...'}
                  </span>
                </div>
              )}

              {/* Help footer */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {language === 'bn'
                      ? 'BDApps অপারেটরের মাধ্যমে OTP যাচাই করা হচ্ছে। একবার যাচাই হলে আপনার কোম্পানি অ্যাকাউন্ট সক্রিয় হয়ে যাবে।'
                      : 'OTP is verified through your mobile operator via BDApps. Once verified, your company account will remain active.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed">
            {language === 'bn'
              ? 'OTP পাচ্ছেন না? কয়েক মিনিট অপেক্ষা করুন অথবা রিসেন্ড বোতাম ব্যবহার করুন।'
              : "Didn't get the OTP? Wait a minute or use the Resend button above."}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const CardBackdrop: React.FC = () => (
  <>
    <span className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-gradient-to-br from-rose-200/60 to-orange-200/60 blur-2xl" />
    <span className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-gradient-to-tr from-orange-200/60 to-amber-200/60 blur-2xl" />
  </>
);

export default CompanyOtpPage;
