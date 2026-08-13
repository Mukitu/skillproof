import React, { useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { UserSidebar } from './UserSidebar';
import { MobileSidebar } from './MobileSidebar';
import { SkillProofLogo } from '../brand';


function useSubRouteTitle(pathname: string, lang: 'bn' | 'en'): string {
  return useMemo(() => {
    
    const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
    if (segments.length === 0) return lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard';
    const key = segments[0];
    const labels: Record<string, { en: string; bn: string }> = {
      profile:           { en: 'AI Career Profile',     bn: 'AI ক্যারিয়ার প্রোফাইল' },
      roadmap:           { en: 'Career Roadmap',        bn: 'ক্যারিয়ার রোডম্যাপ' },
      verify:            { en: 'Skill Verification',    bn: 'স্কিল ভেরিফিকেশন' },
      passport:          { en: 'Skill Passport',        bn: 'স্কিল পাসপোর্ট' },
      mentor:            { en: 'AI Interview Simulator',bn: 'AI ইন্টারভিউ সিমুলেটর' },
      jobs:              { en: 'Job Portal',            bn: 'জব পোর্টাল' },
      settings:          { en: 'Settings',              bn: 'সেটিংস' },
      notifications:     { en: 'Notifications',         bn: 'নোটিফিকেশন' },
    };
    return (labels[key]?.[lang]) ?? (lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard');
  }, [pathname, lang]);
}


export const UserLayout: React.FC = () => {
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const subTitle = useSubRouteTitle(location.pathname, language);

  
  
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  
  
  
  const SUB_HEADER_TOP = 'top-14 sm:top-16';

  return (
    <div className="min-h-screen bg-brand-background text-slate-900 font-sans selection:bg-brand-primary selection:text-white flex flex-col overflow-x-hidden">
      {}
      <Navbar />

      {}
      <div className={`lg:hidden sticky ${SUB_HEADER_TOP} z-30 bg-white/85 backdrop-blur-md border-b border-slate-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-9 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-sm shadow-red-500/20 hover:opacity-95 transition-all shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span className="text-xs font-black tracking-wide uppercase whitespace-nowrap">
              {language === 'bn' ? 'মেনু' : 'Menu'}
            </span>
          </button>
          <div className="flex-1 min-w-0 text-xs sm:text-sm font-bold text-slate-700 truncate">
            {subTitle}
          </div>
        </div>
      </div>

      {}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={language === 'bn' ? 'নেভিগেশন' : 'Navigation'}
      >
        <div className="w-full">
          <UserSidebar />
        </div>
      </MobileSidebar>

      {}
      <aside
        className="hidden lg:block fixed top-16 left-0 z-20 w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 overflow-y-auto overscroll-contain"
      >
        <UserSidebar />
      </aside>

      {}
      <main className="flex-1 min-w-0 lg:pl-64">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Outlet />
        </div>
      </main>

      {}
      <div className="lg:pl-64">
        <Footer />
      </div>
    </div>
  );
};