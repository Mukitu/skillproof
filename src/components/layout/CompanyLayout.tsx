import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CompanySidebar } from './CompanySidebar';
import { MobileSidebar } from './MobileSidebar';

export const CompanyLayout: React.FC = () => {
  const { language } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 font-sans selection:bg-[#E31B23] selection:text-white flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="lg:hidden sticky top-14 sm:top-16 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open company menu"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-9 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow-sm shadow-red-500/20 hover:opacity-95 transition-all shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span className="text-xs font-black tracking-wide uppercase whitespace-nowrap">
              {language === 'bn' ? 'মেনু' : 'Menu'}
            </span>
          </button>
          <div className="flex-1 min-w-0 text-xs sm:text-sm font-bold text-slate-700 truncate">
            {language === 'bn' ? 'কোম্পানি ড্যাশবোর্ড' : 'Company Dashboard'}
          </div>
        </div>
      </div>

      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={language === 'bn' ? 'কোম্পানি নেভিগেশন' : 'Company Navigation'}
      >
        <div className="w-full">
          <CompanySidebar />
        </div>
      </MobileSidebar>

      <aside className="hidden lg:block fixed top-16 left-0 z-20 w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 overflow-y-auto overscroll-contain">
        <CompanySidebar />
      </aside>

      <main className="flex-1 min-w-0 lg:pl-64">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Outlet />
        </div>
      </main>

      <div className="lg:pl-64">
        <Footer />
      </div>
    </div>
  );
};