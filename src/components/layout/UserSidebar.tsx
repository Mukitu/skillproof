import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Map,
  Award,
  ShieldCheck,
  Briefcase,
  User,
  Settings,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const UserSidebar: React.FC = () => {
  const { language } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: language === 'bn' ? 'ওভারভিউ ড্যাশবোর্ড' : 'Overview Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: language === 'bn' ? 'এআই ক্যারিয়ার প্রোফাইল' : 'AI Career Profile',
      path: '/dashboard/profile',
      icon: Brain,
    },
    {
      label: language === 'bn' ? 'ক্যারিয়ার রোডম্যাপ' : 'Career Roadmap',
      path: '/dashboard/roadmap',
      icon: Map,
    },
    {
      label: language === 'bn' ? 'স্কিল ভেরিফিকেশন' : 'Skill Verification',
      path: '/dashboard/verify',
      icon: ShieldCheck,
    },
    {
      label: language === 'bn' ? 'আমার স্কিল পাসপোর্ট' : 'Skill Passport',
      path: '/dashboard/passport',
      icon: Award,
    },
    {
      label: language === 'bn' ? 'জব পোর্টাল' : 'Job Portal',
      path: '/dashboard/jobs',
      icon: Briefcase,
    },
    {
      label: language === 'bn' ? 'আমার প্রোফাইল' : 'User Profile',
      path: '/dashboard/user-profile',
      icon: User,
    },
    {
      label: language === 'bn' ? 'সেটিংস' : 'Account Settings',
      path: '/dashboard/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] shadow-sm">
      <div className="p-4 space-y-6">
        {(role === 'admin' || role === 'super_admin') && (
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all ${
                location.pathname.startsWith('/dashboard')
                  ? 'bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User View
            </button>
            <button
              onClick={() => navigate('/admin')}
              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'bg-white text-[#ED1C24] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin View
            </button>
          </div>
        )}

        <div className="px-3.5 py-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl">
          <p className="text-[10px] font-extrabold text-[#ED1C24] uppercase tracking-wider">
            {language === 'bn' ? 'ভেরিফিকেশন স্ট্যাটাস' : 'Verification Status'}
          </p>
          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {language === 'bn' ? 'পেশাদার অ্যাকাউন্ট সক্রিয়' : 'Professional Account Active'}
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white shadow-md shadow-red-500/20 font-bold'
                      : 'text-slate-600 hover:text-[#ED1C24] hover:bg-red-50/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
          <p className="font-bold text-slate-900 flex items-center gap-1">
            <span className="text-[#ED1C24]">SKILLPROOF</span> BD
          </p>
          <p className="text-[11px] text-slate-500">
            {language === 'bn' ? 'পেশাদার স্কিল ভেরিফিকেশন' : 'Professional Skill Verification'}
          </p>
        </div>
      </div>
    </aside>
  );
};
