import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Sparkles,
  Map,
  Award,
  ShieldCheck,
  Briefcase,
  Bot,
  Settings,
  Clock,
  LineChart,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SkillProofLogo } from '../brand';
import { ApkDownloadMenuItem } from './ApkDownloadMenuItem';

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
      label: language === 'bn' ? 'SkillProof AI ক্যারিয়ার প্রোফাইল' : 'SkillProof AI Profile',
      path: '/dashboard/profile',
      icon: Brain,
    },
    {
      label: language === 'bn' ? 'ক্যারিয়ার ইন্টেলিজেন্স' : 'Career Intelligence',
      path: '/dashboard/skillproof-ml',
      icon: Sparkles,
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
      label: language === 'bn' ? 'SkillProof AI ইন্টারভিউ' : 'SkillProof AI Interview',
      path: '/dashboard/mentor',
      icon: Bot,
    },
    
    
    
    
    
    
    
    
    
    
    {
      label: language === 'bn' ? 'জব পোর্টাল' : 'Job Portal',
      path: '/dashboard/jobs',
      icon: Briefcase,
    },
    {
      label: language === 'bn' ? 'ইন্টারভিউ' : 'Interviews',
      path: '/dashboard/interviews',
      icon: CalendarClock,
    },
    {
      label: language === 'bn' ? 'বার্তা' : 'Messages',
      path: '/dashboard/messages',
      icon: MessageSquare,
    },
    {
      label: language === 'bn' ? 'সেটিংস' : 'Account Settings',
      path: '/dashboard/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full bg-white flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        {(role === 'admin' || role === 'super_admin') && (
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all ${
                location.pathname.startsWith('/dashboard')
                  ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User View
            </button>
            <button
              onClick={() => navigate('/admin')}
              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'bg-white text-[#E31B23] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin View
            </button>
          </div>
        )}

        <div className="px-3.5 py-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl">
          <p className="text-[10px] font-extrabold text-[#E31B23] uppercase tracking-wider">
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
            const disabled = (item as any).disabled === true;
            if (disabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400"
                  aria-disabled="true"
                  title={language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming soon'}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                    {language === 'bn' ? 'শীঘ্রই' : 'Soon'}
                  </span>
                </div>
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
          })}

          {}
          <div className="pt-2 mt-2 border-t border-slate-100">
            <ApkDownloadMenuItem />
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <SkillProofLogo size={28} variant="icon" />
          <p className="mt-2 text-[11px] font-bold text-slate-900">
            {language === 'bn' ? 'পেশাদার স্কিল ভেরিফিকেশন' : 'Professional Skill Verification'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {language === 'bn' ? 'বাংলাদেশের জন্য নির্মিত' : 'Made for Bangladesh'}
          </p>
        </div>
      </div>
    </aside>
  );
};
