import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderTree, ShieldCheck, Briefcase, History, Map, ClipboardCheck, RefreshCcw,
  BarChart3, Shield, ScanSearch,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const AdminSidebar: React.FC = () => {
  const { language } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: language === 'bn' ? 'এডমিন ড্যাশবোর্ড' : 'Admin Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: language === 'bn' ? 'রোডম্যাপ টেমপ্লেট' : 'Roadmap Templates', path: '/admin/roadmap-templates', icon: Map },
    { label: language === 'bn' ? 'স্কিল ভেরিফিকেশন ম্যানেজার' : 'Skill Verification Manager', path: '/admin/skill-verification', icon: ClipboardCheck },
    { label: language === 'bn' ? 'অ্যাসেসমেন্ট রিভিউ' : 'Assessment Review', path: '/admin/assessment-review', icon: ClipboardCheck },
    { label: language === 'bn' ? 'পাসপোর্ট রিভিউ' : 'Passport Review', path: '/admin/passport-review', icon: ShieldCheck },
    { label: language === 'bn' ? 'পাসপোর্ট রিনিউয়াল' : 'Passport Renewals', path: '/admin/passport-renewals', icon: RefreshCcw },
    { label: language === 'bn' ? 'ব্যবহারকারী ব্যবস্থাপনা' : 'Users Management', path: '/admin/users', icon: Users },
    { label: language === 'bn' ? 'ক্যাটাগরি ও স্কিল' : 'Categories & Skills', path: '/admin/taxonomy', icon: FolderTree },
    { label: language === 'bn' ? 'জব ম্যানেজমেন্ট' : 'Jobs Management', path: '/admin/jobs', icon: Briefcase },
    { label: language === 'bn' ? 'অডিট লগ' : 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { label: language === 'bn' ? 'অ্যানালিটিক্স' : 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: language === 'bn' ? 'নিয়োগকর্তা যাচাইকরণ' : 'Employer Verifications', path: '/admin/employer-verifications', icon: ScanSearch },
    { label: language === 'bn' ? 'গভর্নেন্স ও আরবিএসি' : 'Governance & RBAC', path: '/admin/governance', icon: Shield },
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
                  ? 'bg-white text-[#ED1C24] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User View
            </button>
            <button
              onClick={() => navigate('/admin')}
              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin View
            </button>
          </div>
        )}

        <div className="px-3.5 py-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl">
          <p className="text-[10px] font-extrabold text-[#ED1C24] uppercase tracking-wider">
            {language === 'bn' ? 'এডমিন প্যানেল' : 'Admin Portal'}
          </p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">
            {language === 'bn' ? 'প্ল্যাটফর্ম সুপারভাইজার' : 'Platform Supervisor'}
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
    </aside>
  );
};
