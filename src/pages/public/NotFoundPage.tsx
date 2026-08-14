import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ShieldCheck } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { usePageSEO } from '../../hooks/usePageSEO';

export const NotFoundPage: React.FC = () => {
  usePageSEO({
    title: 'Page Not Found',
    description:
      "The page you are looking for does not exist. Return to SkillProof's homepage to verify skills, browse jobs, or build your career.",
    path: '/404',
    robots: 'noindex,nofollow',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>404 — Not Found</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight">Lost in the Passport Queue</h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
            The page you tried to open doesn't exist on SkillProof. It may have been moved, renamed, or the link is broken.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:opacity-95 transition-all"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold hover:border-[#F97316]/50 transition-all"
            >
              <Search className="w-4 h-4" />
              Verify a Passport
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFoundPage;
