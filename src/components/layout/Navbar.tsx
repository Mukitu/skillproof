import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Briefcase,
  User,
  LogOut,
  BookOpen,
  LayoutDashboard,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { dbService } from '../../services/db';
import { calculateDynamicProfileCompleteness } from '../../services/aiService';
import { AICareerProfileData, Notification } from '../../types/database';
import { NotificationBell } from './NotificationBell';
type CareerNotification = Notification;

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, signOut } = useAuth();
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

  // Toggle Dark Theme Class
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
    // Sync theme on load
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // Load dynamic profile and notifications if logged in
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

  // Handle click outside & escape key
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

  // Close menus on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const completeness = calculateDynamicProfileCompleteness(user, aiProfile);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
      {/* Brand Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ED1C24] via-[#F58220] to-[#FFB000] flex items-center justify-center shadow-lg shadow-orange-500/10 group-hover:scale-105 transition-all">
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                SKILL<span className="text-[#F58220]">PROOF</span>
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/10 text-[#F58220] border border-orange-500/20 uppercase tracking-widest">
                BD
              </span>
            </div>
            <span className="hidden sm:block text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              {t('tagline')}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <Link
            to="/"
            className={`transition-all hover:text-[#F58220] py-1 ${
              isActive('/') ? 'text-[#F58220] border-b-2 border-[#F58220] font-black' : ''
            }`}
          >
            {t('navHome')}
          </Link>
          <Link
            to="/how-it-works"
            className={`transition-all hover:text-[#F58220] py-1 flex items-center gap-1.5 ${
              isActive('/how-it-works') ? 'text-[#F58220] border-b-2 border-[#F58220] font-black' : ''
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#F58220]" /> {t('navHowItWorks')}
          </Link>
          <Link
            to="/dashboard/jobs"
            className={`transition-all hover:text-[#F58220] py-1 flex items-center gap-1.5 ${
              isActive('/dashboard/jobs') ? 'text-[#F58220] border-b-2 border-[#F58220] font-black' : ''
            }`}
          >
            <Briefcase className="w-4 h-4 text-[#F58220]" /> {t('navJobPortal')}
          </Link>
          <Link
            to="/dashboard/passport"
            className={`transition-all hover:text-[#F58220] py-1 flex items-center gap-1.5 ${
              isActive('/dashboard/passport') ? 'text-[#F58220] border-b-2 border-[#F58220] font-black' : ''
            }`}
          >
            <Award className="w-4 h-4 text-[#F58220]" /> {t('navPassport')}
          </Link>
          <Link
            to="/about"
            className={`transition-all hover:text-[#F58220] py-1 ${
              isActive('/about') ? 'text-[#F58220] border-b-2 border-[#F58220] font-black' : ''
            }`}
          >
            {t('navAbout')}
          </Link>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-4">
          
          {/* Notifications Center (Only authenticated) — realtime enterprise bell */}
          {isAuthenticated && <NotificationBell />}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-[#F58220] hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {/* Language Selector (Pill Toggle) */}
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => setLanguage('bn')}
              className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                language === 'bn'
                  ? 'bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                language === 'en'
                  ? 'bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {/* User/Auth Profile Dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex items-center gap-1.5 focus:outline-none group rounded-xl p-1 transition-all"
                aria-expanded={isDropdownOpen}
              >
                <div className="relative">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.full_name || 'Profile'}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-800 group-hover:border-[#F58220] transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800" aria-label="Profile photo" />
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 shadow-sm" />
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                    {/* User Info Glass Card */}
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

                      {/* Verified Badge / Progress Bar */}
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wide">
                          <span>Profile Completeness</span>
                          <span className="text-[#F58220]">{completeness}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] h-full transition-all duration-500"
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Link
                        to="/dashboard/user-profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F58220] transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400 group-hover:text-[#F58220]" />
                        <span>{language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile'}</span>
                      </Link>
                      <Link
                        to="/dashboard/roadmap"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F58220] transition-colors"
                      >
                        <Map className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'আমার রোডম্যাপ' : 'My Career Roadmap'}</span>
                      </Link>
                      <Link
                        to="/dashboard/passport"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F58220] transition-colors"
                      >
                        <Award className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'আমার স্কিল পাসপোর্ট' : 'My Skill Passport'}</span>
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-500/10 hover:text-[#F58220] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                      <button
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          await signOut();
                          navigate('/login');
                        }}
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
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#F58220] transition-colors"
              >
                {t('navLogin')}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] text-white hover:opacity-95 font-extrabold text-xs rounded-xl shadow-lg transition-all"
              >
                {t('navRegister')}
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 hover:text-[#F58220] hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl md:hidden transition-all"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col gap-2 font-bold text-slate-700 dark:text-slate-300">
              <Link
                to="/"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F58220] transition-colors ${
                  isActive('/') ? 'bg-orange-500/10 text-[#F58220]' : ''
                }`}
              >
                {t('navHome')}
              </Link>
              <Link
                to="/how-it-works"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F58220] flex items-center gap-2 transition-colors ${
                  isActive('/how-it-works') ? 'bg-orange-500/10 text-[#F58220]' : ''
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#F58220]" />
                <span>{t('navHowItWorks')}</span>
              </Link>
              <Link
                to="/dashboard/jobs"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F58220] flex items-center gap-2 transition-colors ${
                  isActive('/dashboard/jobs') ? 'bg-orange-500/10 text-[#F58220]' : ''
                }`}
              >
                <Briefcase className="w-4 h-4 text-[#F58220]" />
                <span>{t('navJobPortal')}</span>
              </Link>
              <Link
                to="/dashboard/passport"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F58220] flex items-center gap-2 transition-colors ${
                  isActive('/dashboard/passport') ? 'bg-orange-500/10 text-[#F58220]' : ''
                }`}
              >
                <Award className="w-4 h-4 text-[#F58220]" />
                <span>{t('navPassport')}</span>
              </Link>
              <Link
                to="/about"
                className={`px-3 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-[#F58220] transition-colors ${
                  isActive('/about') ? 'bg-orange-500/10 text-[#F58220]' : ''
                }`}
              >
                {t('navAbout')}
              </Link>
            </div>

            {!isAuthenticated && (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full text-center py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] rounded-xl"
                >
                  {t('navRegister')}
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
