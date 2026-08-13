import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Loader2 } from 'lucide-react';


export const SubscriptionGuard: React.FC = () => {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();
  const { isSubscribed, isPremiumActive, isHydrating } = useSubscription();
  const location = useLocation();

  if (authLoading || isHydrating) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#E31B23]" />
          <p className="text-xs font-semibold">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = role === 'admin' || role === 'super_admin';
  const onSubscriptionPath =
    location.pathname === '/subscription' || location.pathname === '/subscription/otp';

  if (isAdmin) {
    if (onSubscriptionPath) return <Navigate to="/admin" replace />;
    return <Outlet />;
  }

  // Admin-granted premium (premium_until in the future) bypasses the
  // BDApps subscription check entirely. The user gets the full dashboard
  // experience without the OTP flow, and the SubscriptionPage surfaces the
  // premium status so they don't get bounced back into it.
  const hasEntitlement = isPremiumActive || isSubscribed;

  if (!hasEntitlement) {
    if (onSubscriptionPath) return <Outlet />;
    return <Navigate to="/subscription" replace />;
  }

  if (onSubscriptionPath) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
