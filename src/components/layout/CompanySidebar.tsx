import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  ScrollText,
  Bookmark,
  CalendarClock,
  MessageSquare,
  Settings,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { COMPANY_STATUS_LABELS } from '../../services/companies';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  comingSoon?: boolean;
}

export const CompanySidebar: React.FC = () => {
  const { language } = useLanguage();
  const { company, signOut, isApproved } = useCompanyAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const liveItems: NavItem[] = [
    {
      label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard',
      path: '/company/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: language === 'bn' ? 'কোম্পানি প্রোফাইল' : 'Company Profile',
      path: '/company/profile',
      icon: Building2,
    },
    {
      label: language === 'bn' ? 'জব পোস্টিং' : 'Job Posting',
      path: '/company/jobs',
      icon: Briefcase,
    },
    {
      label: language === 'bn' ? 'ক্যান্ডিডেট অনুসন্ধান' : 'Candidate Search',
      path: '/company/candidates',
      icon: Users,
    },
    {
      label: language === 'bn' ? 'আবেদনসমূহ' : 'Applications',
      path: '/company/applications',
      icon: ScrollText,
    },
    {
      label: language === 'bn' ? 'শর্টলিস্টেড' : 'Shortlisted',
      path: '/company/shortlisted',
      icon: Bookmark,
    },
    {
      label: language === 'bn' ? 'ইন্টারভিউ' : 'Interviews',
      path: '/company/interviews',
      icon: CalendarClock,
    },
    {
      label: language === 'bn' ? 'মেসেজ' : 'Messages',
      path: '/company/messages',
      icon: MessageSquare,
    },
  ];

  const upcomingItems: NavItem[] = [];

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      try { window.history.replaceState(null, '', '/'); } catch {}
      navigate('/', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const status = company?.status ?? null;
  const statusInfo = status ? COMPANY_STATUS_LABELS[status] : null;
  const statusIcon =
    status === 'APPROVED' ? CheckCircle2 :
    status === 'PENDING_APPROVAL' ? Clock :
    status === 'PENDING_OTP' ? ShieldCheck :
    status === 'REJECTED' ? XCircle :
    status === 'SUSPENDED' ? AlertTriangle : null;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    if (item.comingSoon && !isApproved) return null;
    if (item.comingSoon) {
      return (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50/60'
            }`
          }
          title={language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming soon'}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
            {language === 'bn' ? 'শীঘ্রই' : 'Soon'}
          </span>
        </NavLink>
      );
    }
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.exact}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            isActive
              ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-md shadow-red-500/20 font-bold'
              : 'text-slate-600 hover:text-[#E31B23] hover:bg-red-50/60'
          }`
        }
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="w-full bg-white flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        <div className="px-3.5 py-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl">
          <p className="text-[10px] font-extrabold text-[#E31B23] uppercase tracking-wider">
            {language === 'bn' ? 'কোম্পানি পোর্টাল' : 'Company Portal'}
          </p>
          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#E31B23]" />
            {company?.company_name ?? (language === 'bn' ? 'কোম্পানি' : 'Company')}
          </p>
        </div>

        {statusInfo && (
          <div className={`rounded-2xl border px-3 py-2.5 flex items-center gap-2 ${
            statusInfo.tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            statusInfo.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {statusIcon && (() => {
              const Icon = statusIcon;
              return <Icon className="w-4 h-4 shrink-0" />;
            })()}
            <span className="text-[11px] font-bold">
              {language === 'bn' ? statusInfo.bn : statusInfo.en}
            </span>
          </div>
        )}

        <nav className="space-y-1">
          {liveItems.map(renderItem)}

          {isApproved && upcomingItems.length > 0 && (
            <>
              <div className="pt-3 mt-3 border-t border-slate-100">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  {language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming soon'}
                </p>
                {upcomingItems.map(renderItem)}
              </div>
            </>
          )}

          <div className="pt-2 mt-2 border-t border-slate-100">
            <NavLink
              to="/company/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-md shadow-red-500/20 font-bold'
                    : 'text-slate-600 hover:text-[#E31B23] hover:bg-red-50/60'
                }`
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
            </NavLink>
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition-all disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {language === 'bn' ? 'সাইন আউট' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
};