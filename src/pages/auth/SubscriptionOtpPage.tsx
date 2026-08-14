import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SEOHead } from '../../components/public/SEOHead';
import { BrandButton, BrandCard, SkillProofLogo } from '../../components/brand';
import { useSubscription } from '../../context/SubscriptionContext';

const OTP_LENGTH = 6;


function distributeDigits(source: string): string[] {
  const next = Array(OTP_LENGTH).fill('');
  for (let i = 0; i < OTP_LENGTH && i < source.length; i++) {
    next[i] = source[i];
  }
  return next;
}

export const SubscriptionOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    pendingOtp,
    confirmOtp,
    resendOtp,
    isLoading,
    error,
    otpCooldownSeconds,
    clearOtp,
  } = useSubscription();

  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [localError, setLocalError] = useState<string>('');
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  
  

  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputsRef.current[index] = el;
    },
    [],
  );

  const setDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      
      const next = distributeDigits(cleaned);
      setDigits(next);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setLocalError(`Please enter the full ${OTP_LENGTH}-digit code.`);
      return;
    }
    const result = await confirmOtp(code);
    if (result.ok === false) {
      setLocalError(result.error);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleResend = async () => {
    setLocalError('');
    const result = await resendOtp();
    if (result.ok === false) {
      setLocalError(result.error);
    } else {
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    }
  };

  const maskedPhone = pendingOtp?.phone ? maskPhone(pendingOtp.phone) : '';

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <SEOHead
        pageKey="subscription-otp"
        path="/subscription/otp"
        title="Verify Subscription | SkillProof"
        description="Verify your SkillProof subscription with the OTP sent to your phone."
        robots="noindex,nofollow"
      />
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="mx-auto mb-3 inline-flex">
              <SkillProofLogo size={56} hideWordmark />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Verify OTP
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {maskedPhone ? (
                <>
                  Enter the {OTP_LENGTH}-digit code we just sent to{' '}
                  <span className="font-semibold text-slate-700">{maskedPhone}</span>.
                </>
              ) : (
                <>Enter the {OTP_LENGTH}-digit code we sent to your mobile number.</>
              )}
            </p>
          </div>

          <div className="relative">
            <OtpCardBackdrop />
            <BrandCard elevation="raised" accent className="relative">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    One-time password
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
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {(localError || error) && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{localError || error}</span>
                  </div>
                )}

                <BrandButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  disabled={digits.join('').length !== OTP_LENGTH}
                  rightIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Verify OTP
                </BrandButton>
              </form>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    clearOtp();
                    navigate('/subscription', { replace: true });
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={otpCooldownSeconds > 0 || isLoading}
                  className="inline-flex items-center gap-1 font-semibold text-[#E31B23] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {otpCooldownSeconds > 0
                    ? `Resend in ${otpCooldownSeconds}s`
                    : 'Resend OTP'}
                </button>
              </div>
            </BrandCard>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
            You will be charged once the OTP is verified and your subscription is
            confirmed by your operator. Need help? Reach out to our support team.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

function maskPhone(p: string): string {
  if (p.length <= 6) return p;
  return p.slice(0, 4) + '****' + p.slice(-2);
}

const OtpCardBackdrop: React.FC = () => (
  <>
    <span className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-gradient-to-br from-rose-200/60 to-orange-200/60 blur-2xl" />
    <span className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-gradient-to-tr from-orange-200/60 to-amber-200/60 blur-2xl" />
  </>
);
