import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { Loader2 } from 'lucide-react';

function resolveUserHome(role: string | undefined): string {
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/subscription';
}

function resolveCompanyHome(): string {
  return '/company/dashboard';
}

/**
 * Public-only route gate. While either auth context is still resolving its
 * initial session, we render a spinner — never an early redirect. This
 * stops the race where a logged-out visitor gets bounced to
 * `/login` on a hard refresh because the company storage key
 * briefly read a stale session.
 */
export const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { company, isLoading: isCompanyLoading } = useCompanyAuth();
  const location = useLocation();

  if (isLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#E31B23]" />
          <p className="text-xs font-semibold">Loading…</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const fromPath = (location.state as any)?.from?.pathname as string | undefined;
    const safeFrom =
      fromPath && fromPath !== '/' && fromPath !== '/login' && fromPath !== '/register' && !fromPath.startsWith('/company')
        ? fromPath
        : null;
    return <Navigate to={safeFrom ?? resolveUserHome(user.role)} replace />;
  }

  if (company) {
    const fromPath = (location.state as any)?.from?.pathname as string | undefined;
    const safeFrom =
      fromPath && fromPath.startsWith('/company') && !fromPath.includes('/login') && !fromPath.includes('/register')
        ? fromPath
        : null;
    return <Navigate to={safeFrom ?? resolveCompanyHome()} replace />;
  }

  return <Outlet />;
};