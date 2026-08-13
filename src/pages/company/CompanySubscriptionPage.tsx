import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import {
  BrandButton,
  BrandCard,
  BrandField,
  BrandInput,
  SkillProofLogo,
} from '../../components/brand';
import { useCompanySubscription } from '../../context/CompanySubscriptionContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  BDAPPS_CONSTANTS,
  isSupportedOperatorSubscriber,
  normalizeBdappsSubscriberId,
} from '../../services/bdapps';

/**
 * Company-side mirror of `SubscriptionPage`.
 *
 * Flow:
 *   /login  →  /company/subscription  (this page)
 *           →  /company/subscription/otp  (verify)
 *           →  /company/dashboard
 *
 * Admin-granted premium (`company.premium_until > now()`) short-circuits to
 * the dashboard with the same `AdminPremiumBanner` / `AdminPremiumCard`
 * UX as the user side, so a company owner who has already been given
 * premium never sees the BDApps form.
 *
 * The page reuses the existing `bdapps.ts` service via
 * `useCompanySubscription()` — that service is operator-level and is
 * identical to the user flow.
 */
export const CompanySubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { company, isLoading: authLoading } = useCompanyAuth();
  const {
    verifyStatus,
    isLoading,
    error,
    session,
    clearSubscription,
    isPremiumActive,
    premiumUntil,
  } = useCompanySubscription();

  const [phone, setPhone] = useState<string>(session?.phone ?? '');
  const [localError, setLocalError] = useState<string>('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const subscriberId = normalizeBdappsSubscriberId(phone);
    if (!subscriberId) {
      setLocalError('Please enter a valid Bangladeshi mobile number.');
      return;
    }
    if (!isSupportedOperatorSubscriber(subscriberId)) {
      setLocalError('Supported operators are Robi (018) and Airtel (016) only.');
      return;
    }

    const result = await verifyStatus(phone);
    if (result.ok === false) {
      setLocalError(result.error);
      return;
    }
    if (result.subscribed) {
      navigate('/company/dashboard', { replace: true });
      return;
    }
    navigate('/company/subscription/otp', { replace: true });
  };

  const showError = localError || error;

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
              Verify Your Company Subscription
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Confirm your BDApps subscription to unlock the full Company dashboard.
            </p>
          </div>

          {isPremiumActive && premiumUntil && (
            <AdminPremiumBanner premiumUntil={premiumUntil} />
          )}

          <div className="relative">
            <CardBackdrop />
            <BrandCard elevation="raised" accent className="relative">
              {isPremiumActive ? (
                <AdminPremiumCard
                  premiumUntil={premiumUntil}
                  onContinue={() => navigate('/company/dashboard', { replace: true })}
                  isLoading={isLoading || authLoading}
                />
              ) : (
                <>
                  {company && (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                      <span className="font-semibold truncate">{company.company_name}</span>
                    </div>
                  )}

                  <SubscriptionInfoCard />

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <BenefitCap label="Verified biz" />
                    <BenefitCap label="Jobs listed" />
                    <BenefitCap label="Trusted" />
                  </div>

                  <form onSubmit={handleContinue} className="mt-5 space-y-3">
                    <BrandField label="Mobile Number" required>
                      <BrandInput
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        autoFocus
                        required
                        placeholder={BDAPPS_CONSTANTS.MOBILE_PLACEHOLDER}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        leftIcon={<Phone className="h-4 w-4" />}
                        inputSize="lg"
                        invalid={!!showError}
                      />
                    </BrandField>

                    {showError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                        <span>{showError}</span>
                      </div>
                    )}

                    <BrandButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={isLoading}
                      disabled={phone.trim().length < 11}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue
                    </BrandButton>
                  </form>

                  {session && (
                    <button
                      type="button"
                      onClick={clearSubscription}
                      className="block mx-auto mt-3 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
                    >
                      Use a different number
                    </button>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Charged securely via your operator
                  </div>
                </>
              )}
            </BrandCard>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500">
            Subscriptions are managed by your mobile operator. To unsubscribe, dial
            the operator's short code or contact support.
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

const SubscriptionInfoCard: React.FC = () => (
  <div
    className="relative overflow-hidden rounded-2xl border border-[#E31B23]/15 bg-gradient-to-br from-white via-[#FFF8F6] to-[#FFF1ED] p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    role="region"
    aria-label="Subscription details"
  >
    <span
      aria-hidden
      className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-[#E31B23]/8 to-[#F97316]/8 blur-2xl"
    />

    <div className="relative flex items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
          Subscription Details
        </span>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <ShieldCheck className="h-3 w-3" />
        Operator billed
      </span>
    </div>

    <div className="relative my-3.5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

    <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E31B23]/8 text-[#E31B23] ring-1 ring-[#E31B23]/15">
          <CreditCard className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Subscription Charge
          </p>
          <p className="mt-0.5 text-xl sm:text-[22px] font-extrabold leading-tight tracking-tight text-[#E31B23]">
            2.78 BDT<span className="text-[#E31B23]/80 font-bold">/day</span>
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            including VAT + SD + SC
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E31B23]/8 text-[#E31B23] ring-1 ring-[#E31B23]/15">
          <Smartphone className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Supported Operators
          </p>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-800 shadow-sm">
              <Smartphone className="h-3 w-3 text-[#E31B23]" strokeWidth={2.5} />
              Robi &amp; Airtel Only
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            018 &amp; 016 prefixes
          </p>
        </div>
      </div>
    </div>
  </div>
);

const BenefitCap: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 py-2.5">
    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    <span className="text-[11px] font-semibold text-slate-700">{label}</span>
  </div>
);

function formatPremiumUntil(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const AdminPremiumBanner: React.FC<{ premiumUntil: string | null }> = ({
  premiumUntil,
}) => (
  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
        <BadgeCheck className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
          Admin-Granted Premium
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-emerald-900">
          Your company already has full SkillProof access — no BDApps subscription needed.
        </p>
        {premiumUntil && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-800">
            <CalendarClock className="h-3.5 h-3.5" />
            Active until {formatPremiumUntil(premiumUntil)}
          </p>
        )}
      </div>
    </div>
  </div>
);

const AdminPremiumCard: React.FC<{
  premiumUntil: string | null;
  onContinue: () => void;
  isLoading: boolean;
}> = ({ premiumUntil, onContinue, isLoading }) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
            Premium Active
          </p>
          <p className="text-base font-black text-slate-900">
            Your admin-granted premium is on
          </p>
        </div>
      </div>
      {premiumUntil && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-[12px] font-semibold text-slate-700">
          <CalendarClock className="h-4 w-4 text-emerald-600" />
          Valid until {formatPremiumUntil(premiumUntil)}
        </div>
      )}
      <ul className="mt-4 space-y-2 text-[13px] text-slate-700">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Full company dashboard and jobs workflows unlocked
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          No BDApps charge will apply while your premium is active
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Once the premium expires, BDApps subscription will be required again
        </li>
      </ul>
    </div>

    <BrandButton
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      onClick={onContinue}
      loading={isLoading}
      rightIcon={<ArrowRight className="w-4 h-4" />}
    >
      Continue to Dashboard
    </BrandButton>

    <p className="text-center text-[11px] text-slate-500">
      Need to extend this? Ask your admin to update your premium date from the
      Company Management page.
    </p>
  </div>
);

export default CompanySubscriptionPage;
