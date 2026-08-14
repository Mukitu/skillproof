import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Briefcase,
  User,
  LogOut,
  Settings,
  Award,
  Languages,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  Brain,
  Map,
  CheckCircle2,
  Layers,
  ScanSearch,
  Building2,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { dbService } from '../../services/db';
import { calculateDynamicProfileCompleteness } from '../../services/aiService'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { AICareerProfileData, Notification } from '../../types/database';
import { NotificationBell } from './NotificationBell';
import DownloadApkButton from './DownloadAppModal';
import { SkillProofLogo } from '../brand';
type CareerNotification = Notification;


export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, signOut: signOutUser } = useAuth();
  const { company, isApproved, signOut: signOutCompany } = useCompanyAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<CareerNotification[]>([]);
  const [aiProfile, setAiProfile] = useState<AICareerProfileData | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      dbService.getAICareerProfile(user.id).then((profile) => {
        if (profile) setAiProfile(profile);
      });
      dbService.getNotifications(user.id).then((notes) => {
        setNotifications(notes);
      });
    }
  }, [isAuthenticated, user, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Logout clears BOTH Supabase storage keys so back-button can never
  // resurrect a protected dashboard, then pushes the user to the landing
  // page. We use local-scope sign-out (per client) so we don't kick off
  // a chain of cross-portal SIGNED_OUT events that race the navigation.
  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    try {
      await Promise.allSettled([signOutUser(), signOutCompany()]);
    } catch (e) {
      console.warn('Sign-out warning', e);
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('skillproof.auth');
        window.localStorage.removeItem('skillproof.company.auth');
      }
    } catch {}
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
    navigate('/', { replace: true });
  };

  const isCompanyAuthed = !!company;
  const isUserAuthed = isAuthenticated && !!user;

  const homePath =
    isCompanyAuthed
      ? (isApproved ? '/company/dashboard' : '/company/pending')
      : isUserAuthed
        ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/subscription')
        : '/';

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
      {}
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{
          background:
            'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {}
        <Link to={homePath} className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
          <SkillProofLogo
            size={36}
            colorMode="light"
            className="transition-transform group-hover:scale-[1.04] sm:scale-100"
          />
          <div className="hidden lg:flex flex-col min-w-0 leading-tight">
            <span className="text-[10px] font-bold tracking-widest text-[var(--brand-muted)] uppercase truncate">
              {t('tagline')}
            </span>
          </div>
        </Link>

        {}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-0">
          <Link
            to="/dashboard"
            className={`transition-all hover:text-[#F97316] py-1 flex items-center gap-1.5 ${isActive('/dashboard') ? 'text-[#F97316] border-b-2 border-[#F97316] font-black' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#F97316]" /> {language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
          </Link>
          <Link to="/dashboard/jobs" className={`transition-all hover:text-[#F97316] py-1 flex items-center gap-1.5 ${isActive('/dashboard/jobs') ? 'text-[#F97316] border-b-2 border-[#F97316] font-black' : ''}`}>
            <Briefcase className="w-4 h-4 text-[#F97316]" /> {t('navJobPortal')}
          </Link>
          <Link to="/verify" className="transition-all hover:text-[#F97316] py-1 flex items-center gap-1.5">
            <ScanSearch className="w-4 h-4 text-[#F97316]" /> {t('navEmployerVerify')}
          </Link>
        </nav>

        {}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {}
          {isAuthenticated && <NotificationBell />}

          {}
          <button
            onClick={toggleTheme}
            className="hidden sm:inline-flex p-2 text-slate-500 hover:text-[#F97316] hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all shrink-0"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {}
          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
            <button
              onClick={() => setLanguage('bn')}
              className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                language === 'bn'
                  ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                language === 'en'
                  ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {}
          <div className="hidden md:inline-flex shrink-0">
            <DownloadApkButton variant="compact" />
          </div>

          {}
          {isCompanyAuthed ? (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex items-center gap-1 sm:gap-1.5 focus:outline-none group rounded-xl p-1 transition-all"
                aria-expanded={isDropdownOpen}
              >
                <div className="relative">
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company?.company_name || 'Company'}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-800 group-hover:border-[#F97316] transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#E31B23]" aria-label="Company photo">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 shadow-sm" />
                </div>
                <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute right-0 mt-3 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 py-3 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-2">
                        {company?.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company?.company_name || 'Company'}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#E31B23]">
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1">
                            {company?.company_name}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{company?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Link
                        to="/company/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'কোম্পানি ড্যাশবোর্ড' : 'Company Dashboard'}</span>
                      </Link>
                      <Link
                        to="/company/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'কোম্পানি প্রোফাইল' : 'Company Profile'}</span>
                      </Link>
                      <Link
                        to="/company/settings"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : isUserAuthed ? (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex items-center gap-1 sm:gap-1.5 focus:outline-none group rounded-xl p-1 transition-all"
                aria-expanded={isDropdownOpen}
              >
                <div className="relative">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.full_name || 'Profile'}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-800 group-hover:border-[#F97316] transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800" aria-label="Profile photo" />
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 shadow-sm" />
                </div>
                <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute right-0 mt-3 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 py-3 z-50 overflow-hidden"
                  >
                    {}
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-2">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user?.full_name || 'Profile'}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800" aria-label="Profile photo" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1">
                            {user?.full_name}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                        </div>
                      </div>

                      {}
                    </div>

                    {}
                    <div className="pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
                      </Link>
                      <Link
                        to="/dashboard/profile?tab=edit"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400 group-hover:text-[#F97316]" />
                        <span>{language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile'}</span>
                      </Link>
                      <Link
                        to="/dashboard/roadmap"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <Map className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'আমার রোডম্যাপ' : 'My Career Roadmap'}</span>
                      </Link>
                      <Link
                        to="/dashboard/passport"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <Award className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'আমার স্কিল পাসপোর্ট' : 'My Skill Passport'}</span>
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F97316] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 md:gap-1.5 lg:gap-2 shrink-0">
              <Link
                to="/login"
                className="px-2 md:px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#F97316] transition-colors whitespace-nowrap"
                title={language === 'bn' ? 'লগইন' : 'Sign in'}
              >
                {t('navLogin')}
              </Link>
              <Link
                to="/register"
                className="px-2.5 md:px-3 py-2 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] text-white hover:opacity-95 font-extrabold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap"
              >
                {t('navRegister')}
              </Link>
            </div>
          )}

          {}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-[#F97316] hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all shrink-0"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 shadow-xl overflow-hidden"
          >
            {}
            <div className="flex flex-wrap items-center gap-2 sm:hidden">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <button
                  onClick={() => setLanguage('bn')}
                  className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                    language === 'bn'
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                    language === 'en'
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 font-bold text-slate-700 dark:text-slate-300">
              <Link
                to="/dashboard"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F97316] flex items-center gap-2 transition-colors ${isActive('/dashboard') ? 'bg-orange-500/10 text-[#F97316]' : ''}`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#F97316]" />
                <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
              </Link>
              <Link to="/dashboard/jobs" className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F97316] flex items-center gap-2 transition-colors ${isActive('/dashboard/jobs') ? 'bg-orange-500/10 text-[#F97316]' : ''}`}>
                <Briefcase className="w-4 h-4 text-[#F97316]" />
                <span>{t('navJobPortal')}</span>
              </Link>
              <Link to="/verify" className="px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F97316] flex items-center gap-2 transition-colors">
                <ScanSearch className="w-4 h-4 text-[#F97316]" />
                <span>{t('navEmployerVerify')}</span>
              </Link>
              <div className="px-3 py-2.5">
                <DownloadApkButton variant="ghost" className="w-full justify-start" />
              </div>
            </div>
            {!isAuthenticated && !isCompanyAuthed && (
              <div className="pt-2 flex flex-col gap-2 sm:hidden">
                <Link
                  to="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] rounded-xl"
                >
                  {t('navRegister')}
                </Link>
              </div>
            )}
            {(isUserAuthed || isCompanyAuthed) && (
              <div className="pt-2 flex flex-col gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-center py-2.5 text-xs font-black text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl"
                >
                  {language === 'bn' ? 'লগআউট' : 'Logout'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {}
    </header>
  );
};