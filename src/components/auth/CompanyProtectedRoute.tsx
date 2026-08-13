import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { useCompanySubscription } from '../../context/CompanySubscriptionContext';
import { fetchCompanyBdappsRequired } from '../../services/companies';
import { Loader2 } from 'lucide-react';

// Gates /company/* routes.
// Single master admin toggle drives the gate:
//   * `company_bdapps_required`       (BDApps Master Toggle)
//   OFF (default) → BDApps is fully bypassed.
//     Approved companies land directly on the dashboard with no
//     subscription page, no mobile number, no OTP form.
//   ON → both subscription and OTP verification are required, but
//     already-completed steps are remembered — the company never
//     re-enters an already-completed step. The flow is:
//       Mobile Number → OTP Verification → BDApps Subscription Check
//                                                   ↓
//                                          Approved → Dashboard
//     If the mobile is already verified, the OTP step is skipped.
//     If the BDApps subscription is already active, the subscription
//     step is skipped.
// Premium (admin-granted) and approved+already-subscribed bypass the gate.

export const CompanyProtectedRoute: React.FC = () => {
  const { company, isAuthenticated, isLoading, isApproved, isPremium } = useCompanyAuth();
  const { isSubscribed, isHydrating: subHydrating } = useCompanySubscription();
  const location = useLocation();

  // null = still loading, true = enabled, false = disabled (bypass)
  const [bdappsRequired, setBdappsRequired] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const required = await fetchCompanyBdappsRequired();
        if (cancelled) return;
        setBdappsRequired(required);
      } catch {
        if (cancelled) return;
        // Strict default on RPC failure: OFF (bypass).
        setBdappsRequired(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || subHydrating || bdappsRequired === null) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#E31B23]" />
          <p className="text-xs font-semibold">Verifying company account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isApproved) {
    return <Navigate to="/company/pending" replace />;
  }

  const onSubscriptionPath =
    location.pathname === '/company/subscription' ||
    location.pathname === '/company/subscription/otp';

  // Premium bypasses everything.
  if (isPremium) {
    if (onSubscriptionPath) return <Navigate to="/company/dashboard" replace />;
    if (location.pathname === '/company/verify') {
      return <Navigate to="/company/dashboard" replace />;
    }
    return <Outlet />;
  }

  // Master toggle OFF → BDApps fully bypassed. Dashboard directly.
  if (!bdappsRequired) {
    if (onSubscriptionPath) return <Navigate to="/company/dashboard" replace />;
    if (location.pathname === '/company/verify') {
      return <Navigate to="/company/dashboard" replace />;
    }
    return <Outlet />;
  }

  // Master toggle ON → enforce subscription.
  // (OTP verification is handled inside the subscription flow and the
  // mobile_verified flag is checked there — once mobile is verified the
  // OTP step is skipped automatically.)
  if (isSubscribed) {
    if (onSubscriptionPath) return <Navigate to="/company/dashboard" replace />;
    if (location.pathname === '/company/verify') {
      return <Navigate to="/company/dashboard" replace />;
    }
    return <Outlet />;
  }

  if (onSubscriptionPath) return <Outlet />;
  // Legacy /company/verify still works for backward compat.
  if (location.pathname === '/company/verify') return <Outlet />;
  return <Navigate to="/company/subscription" replace />;
};
