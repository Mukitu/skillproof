import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import DownloadApkButton from '../../components/layout/DownloadAppModal';
import { WebsitePopup } from '../../components/public/WebsitePopup';
import { SEOHead } from '../../components/public/SEOHead';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShieldCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  Search,
  Building2,
  Sparkles,
  ChevronRight,
  Check,
  Users,
  Briefcase,
  GraduationCap,
  Compass,
  Bot,
  FileBadge,
  UserPlus,
  QrCode,
  History,
  Globe,
  PenTool,
  BarChart3,
  Wallet,
  Megaphone,
  Presentation,
  Globe2,
  Rocket,
  Zap,
  Star,
  ClipboardList,
  Brain,
  Calculator,
  Headphones,
  BookOpenCheck,
  Database,
  Lock,
  Wrench,
  Video,
  Camera,
  BookOpen,
  Languages,
  Mail,
  PhoneCall,
} from 'lucide-react';
import { SkillProofLogo } from '../../components/brand';

export const LandingPage: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [passportSearchInput, setPassportSearchInput] = useState('');

  
  const heroPrimaryUrl = '/register';
  const heroSecondaryUrl = '/verify';
  const heroIsExternal = (url: string) => /^https?:\/\//.test(url);
  const handlePassportSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (passportSearchInput.trim()) {
      navigate(`/verify?id=${encodeURIComponent(passportSearchInput.trim())}`);
    }
  };

  
  const professionCards = [
    { icon: GraduationCap, key: 'whoStudents',   color: 'from-[#E31B23] to-[#F97316]' },
    { icon: UserPlus,      key: 'whoJobSeekers', color: 'from-[#F97316] to-[#FF8A00]' },
    { icon: PenTool,       key: 'whoDesigners',  color: 'from-[#FF8A00] to-[#E31B23]' },
    { icon: BarChart3,     key: 'whoMarketers',  color: 'from-[#E31B23] to-[#F97316]' },
    { icon: Calculator,    key: 'whoAccountants', color: 'from-[#F97316] to-[#FF8A00]' },
    { icon: Presentation,  key: 'whoTeachers',   color: 'from-[#E31B23] to-[#F97316]' },
    { icon: Wallet,        key: 'whoPros',       color: 'from-[#F97316] to-[#E31B23]' },
    { icon: Globe,         key: 'whoFreelancers', color: 'from-[#FF8A00] to-[#F97316]' },
    { icon: Rocket,        key: 'whoBusiness',   color: 'from-[#E31B23] to-[#F97316]' },
  ];

  const featureCards = [
    { icon: ShieldCheck,  key: 'featVerification', color: 'from-[#E31B23] to-[#F97316]' },
    { icon: Compass,      key: 'featRoadmap',      color: 'from-[#F97316] to-[#FF8A00]' },
    { icon: Bot,          key: 'featAiProfile',    color: 'from-[#E31B23] to-[#F97316]' },
    { icon: FileBadge,    key: 'featPassport',     color: 'from-[#FF8A00] to-[#E31B23]' },
    { icon: Brain,        key: 'featMentor',       color: 'from-[#F97316] to-[#E31B23]' },
    { icon: Briefcase,    key: 'featJobs',         color: 'from-[#E31B23] to-[#F97316]' },
  ];

  const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
  const whyKeys = ['why1', 'why2', 'why3', 'why4'];
  const trustKeys = ['trust1', 'trust2', 'trust3'];

  
  const categoryGroups = [
    { icon: Wrench,      key: 'catTech',         color: 'from-[#E31B23] to-[#F97316]' },
    { icon: PenTool,     key: 'catCreative',     color: 'from-[#F97316] to-[#FF8A00]' },
    { icon: Briefcase,   key: 'catBusiness',     color: 'from-[#FF8A00] to-[#E31B23]' },
    { icon: BookOpenCheck, key: 'catProfessional', color: 'from-[#E31B23] to-[#F97316]' },
    { icon: GraduationCap, key: 'catEducation',   color: 'from-[#F97316] to-[#E31B23]' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 font-sans selection:bg-[#E31B23] selection:text-white flex flex-col overflow-x-hidden">
      {}
      <SEOHead
        pageKey="global"
        defaults={{
          title: 'SkillProof — Prove Your Skills, Advance Your Career',
          description:
            'SkillProof is a skill verification and career development platform from Bangladesh. Verify your real-world skills, grow them, and present them to employers through a verified Skill Passport.',
        }}
      />
      <Navbar />

      <main className="flex-1">
        {}
        <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 border-b border-red-100 bg-gradient-to-b from-white via-[#FFF8F6] to-red-50/30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 sm:h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-200/40 via-orange-100/20 to-transparent pointer-events-none blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
              <div className="inline-flex max-w-full items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-[11px] sm:text-xs font-black tracking-wide shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E31B23] shrink-0" />
                <span className="break-words text-center leading-tight">{t('heroBadge')}</span>
              </div>

              <h1 className="text-[1.75rem] leading-[1.15] sm:text-4xl sm:leading-tight md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 text-balance">
                {language === 'bn' ? (
                  <>
                    আপনার দক্ষতা প্রমাণ করুন,<br />
                    <span className="bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] bg-clip-text text-transparent">
                      ক্যারিয়ারে এগিয়ে যান
                    </span>
                  </>
                ) : (
                  <>
                    Prove Your Skills,<br />
                    <span className="bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] bg-clip-text text-transparent">
                      Advance Your Career.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium px-1">
                {language === 'bn'
                  ? 'SkillProof হলো বাংলাদেশের একটি skill verification ও career development platform, যেখানে আপনি আপনার বাস্তব দক্ষতা যাচাই, উন্নয়ন এবং একটি verified Skill Passport-এর মাধ্যমে employer-এর সামনে উপস্থাপন করতে পারবেন।'
                  : 'SkillProof is a skill verification and career development platform from Bangladesh. Verify your real-world skills, grow them, and present them to employers through a verified Skill Passport.'}
              </p>

              {}
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                {language === 'bn'
                  ? 'শুধু CV নয় — আপনার আসল দক্ষতার প্রমাণ।'
                  : 'Not just a CV — proof of what you can really do.'}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-4 px-2 sm:px-0">
                {heroIsExternal(heroPrimaryUrl) ? (
                  <a
                    href={heroPrimaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                  >
                    <span>{t('heroPrimaryCta')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    to={heroPrimaryUrl}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                  >
                    <span>{t('heroPrimaryCta')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {heroIsExternal(heroSecondaryUrl) ? (
                  <a
                    href={heroSecondaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Award className="w-4 h-4 text-[#E31B23]" />
                    <span>{t('heroSecondaryCta')}</span>
                  </a>
                ) : (
                  <Link
                    to={heroSecondaryUrl}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Award className="w-4 h-4 text-[#E31B23]" />
                    <span>{t('heroSecondaryCta')}</span>
                  </Link>
                )}

                {}
                <DownloadApkButton
                  variant="primary"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-sm"
                />
              </div>

              <div className="pt-5 sm:pt-6 max-w-md mx-auto px-2 sm:px-0">
                <form onSubmit={handlePassportSearch} className="relative flex items-center w-full">
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'পাসপোর্ট আইডি (যেমন: SP-BD-829104)' : 'Enter Passport ID (e.g. SP-BD-829104)'}
                    value={passportSearchInput}
                    onChange={(e) => setPassportSearchInput(e.target.value)}
                    className="w-full min-w-0 bg-white border border-slate-200 focus:border-[#E31B23] rounded-2xl pl-3.5 sm:pl-4 pr-12 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-md transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 p-2 bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white rounded-xl shadow-sm transition-colors shrink-0"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200/80 max-w-5xl mx-auto">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm min-w-0">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 truncate">৫,০০০+</p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">
                  {t('statDevelopers')}
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm min-w-0">
                <p className="text-2xl sm:text-3xl font-black text-[#E31B23] truncate">১,২০০+</p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">
                  {t('statChallenges')}
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm min-w-0">
                <p className="text-2xl sm:text-3xl font-black text-[#F97316] truncate">৪৫০+</p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">
                  {t('statProjects')}
                </p>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm min-w-0">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 truncate">২৪/৭</p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">
                  {t('statPartners')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-3 space-y-4 sm:space-y-5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-[11px] font-bold uppercase tracking-wider">
                  <Zap className="w-3 h-3" />
                  {language === 'bn' ? 'পরিচিতি' : 'INTRODUCTION'}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight break-words">
                  {t('whatIsTitle')}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                  {language === 'bn'
                    ? 'SkillProof এমন একটি প্ল্যাটফর্ম যেখানে আপনি শুধু নিজের দক্ষতার কথা বলবেন না — দক্ষতার প্রমাণও তৈরি করবেন।'
                    : 'SkillProof is a platform where you do not just talk about your skills — you build the proof.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-3 sm:gap-3">
                  <Pill icon={Check} text={language === 'bn' ? 'যেকোনো পেশার জন্য' : 'For any profession'} />
                  <Pill icon={Check} text={language === 'bn' ? 'QR কোড যাচাইযোগ্য' : 'QR-verifiable passport'} />
                  <Pill icon={Check} text={language === 'bn' ? 'বাংলায় ও ইংরেজিতে' : 'Bengali & English'} />
                  <Pill icon={Check} text={language === 'bn' ? 'বাংলাদেশের জন্য তৈরি' : 'Built for Bangladesh'} />
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <SubPillar icon={ShieldCheck} label={language === 'bn' ? 'দক্ষতা যাচাই' : 'Skill Verification'} />
                  <SubPillar icon={Compass}     label={language === 'bn' ? 'ক্যারিয়ার উন্নয়ন' : 'Career Development'} />
                  <SubPillar icon={FileBadge}   label={language === 'bn' ? 'Skill Passport' : 'Skill Passport'} />
                  <SubPillar icon={Briefcase}   label={language === 'bn' ? 'চাকরির সুযোগ' : 'Job Opportunities'} />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-[#FF8A00] p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-2xl shadow-red-500/30">
                  <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
                  <div className="relative">
                    <SkillProofLogo size={56} colorMode="dark" />
                  </div>
                  <div className="relative space-y-2 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                      {language === 'bn' ? 'স্কিল পাসপোর্ট' : 'SKILL PASSPORT'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-black leading-tight">
                      {language === 'bn' ? 'বিশ্বস্ত ক্যারিয়ার পরিচিতি' : 'Trusted Career Identity'}
                    </p>
                    <p className="text-xs opacity-90">
                      {language === 'bn'
                        ? 'আপনার প্রমাণিত দক্ষতা — একটি QR কোডে।'
                        : 'Your proven skills — encoded in one QR.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'কীভাবে কাজ করে' : 'HOW IT WORKS'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('howItWorksTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('howItWorksSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 relative">
              {stepKeys.map((baseKey, idx) => {
                const icons = [UserPlus, ClipboardList, Compass, FileBadge, Award, Users];
                const Icon = icons[idx];
                return (
                  <div
                    key={baseKey}
                    className="relative rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all min-w-0"
                  >
                    <div className="absolute -top-3 left-5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white text-xs font-black shadow-md shadow-red-500/30">
                      {idx + 1}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-[#E31B23] mt-2">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900 break-words">{t(`${baseKey}Title`)}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words">{t(`${baseKey}Desc`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'দুটি ভেরিফিকেশন পদ্ধতি' : 'TWO VERIFICATION METHODS'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('pillarTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {t('pillarSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#FFF8F6] border border-red-100 hover:border-[#E31B23] transition-all space-y-5 sm:space-y-6 group shadow-sm hover:shadow-md relative overflow-hidden min-w-0">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ClipboardList className="w-24 h-24 sm:w-32 sm:h-32 text-[#E31B23]" />
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center font-black shadow-md shadow-red-500/20">
                  <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#E31B23] transition-colors break-words">
                    {t('codingChallengeTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('codingChallengeDesc')}
                  </p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 border-t border-red-100/80 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E31B23] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'আপনার পেশার জন্য বাস্তবসম্মত প্রশ্ন' : 'Realistic questions for your profession'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E31B23] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'স্বয়ংক্রিয় মূল্যায়ন ও তাৎক্ষণিক স্কোর' : 'Automated scoring with instant feedback'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E31B23] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'দক্ষতার ভিত্তিতে সঠিক মূল্যায়ন' : 'Skill-based accurate evaluation'}</span>
                  </li>
                </ul>
                <Link to="/dashboard/verify" className="inline-flex items-center gap-2 text-xs font-bold text-[#E31B23] hover:text-[#B5121B] pt-2">
                  <span>{language === 'bn' ? 'অ্যাসেসমেন্ট দেখুন' : 'Explore Assessments'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6 sm:p-8 rounded-3xl bg-[#FFF8F6] border border-orange-100 hover:border-[#F97316] transition-all space-y-5 sm:space-y-6 group shadow-sm hover:shadow-md relative overflow-hidden min-w-0">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <BookOpen className="w-24 h-24 sm:w-32 sm:h-32 text-[#F97316]" />
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#FF8A00] text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#F97316] transition-colors break-words">
                    {t('projectVerifyTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('projectVerifyDesc')}
                  </p>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 border-t border-orange-100/80 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'পোর্টফোলিও, কেস স্টাডি, ক্যাম্পেইন বা নমুনা কাজ' : 'Portfolio, case studies, campaigns, or sample work'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'বিশেষজ্ঞদের ম্যানুয়াল রিভিউ ও স্কোরিং' : 'Expert manual review and scoring'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <span>{language === 'bn' ? 'অনুমোদিত হলে স্কিল পাসপোর্ট আপগ্রেড' : 'Approved work upgrades your Skill Passport'}</span>
                  </li>
                </ul>
                <Link to="/dashboard/verify" className="inline-flex items-center gap-2 text-xs font-bold text-[#F97316] hover:text-[#d46a13] pt-2">
                  <span>{language === 'bn' ? 'কাজের নমুনা জমা দিন' : 'Submit Work Samples'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'ক্যাটাগরি' : 'CATEGORIES'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('catTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('catSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {categoryGroups.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.key}
                    className="group relative p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-[#E31B23] hover:shadow-md transition-all min-w-0 overflow-hidden"
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${c.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="mt-3 text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#E31B23] transition-colors break-words">
                      {t(c.key)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words">
                      {t(`${c.key}Items`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'আপনার জন্য' : 'WHO IT IS FOR'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('whoForTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('whoForSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {professionCards.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.key}
                    className="group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#F97316] hover:shadow-md transition-all min-w-0"
                  >
                    <div className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">{t(p.key)}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5 break-words">{t(`${p.key}Desc`)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'কোর ফিচার' : 'CORE FEATURE'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {language === 'bn' ? 'আপনার দক্ষতার শুধু দাবি নয়, প্রমাণও থাকুক' : 'Not just claims — proof of your skills'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {language === 'bn'
                  ? 'একটি দক্ষতা বেছে নিন, অ্যাসেসমেন্ট সম্পন্ন করুন, স্কোর ও ফিডব্যাক পান এবং সেই প্রমাণ আপনার Skill Passport-এ যুক্ত করুন।'
                  : 'Pick a skill, complete an assessment, get a score and feedback, and add that proof to your Skill Passport.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <VerifyStep icon={Search}         title={language === 'bn' ? 'দক্ষতা বেছে নিন' : 'Pick a skill'} desc={language === 'bn' ? 'আপনার পেশা অনুযায়ী যেকোনো দক্ষতা নির্বাচন করুন।' : 'Choose any skill from your professional area.'} />
              <VerifyStep icon={ClipboardList}  title={language === 'bn' ? 'অ্যাসেসমেন্ট দিন' : 'Take an assessment'} desc={language === 'bn' ? 'বাস্তবসম্মত প্রশ্ন বা প্রজেক্ট সম্পন্ন করুন।' : 'Complete a real-world task or assessment.'} />
              <VerifyStep icon={Star}           title={language === 'bn' ? 'স্কোর ও ফিডব্যাক পান' : 'Get a score & feedback'} desc={language === 'bn' ? 'তাৎক্ষণিক স্কোর ও উন্নতির পরামর্শ পান।' : 'Receive an instant score with constructive feedback.'} />
              <VerifyStep icon={CheckCircle2}   title={language === 'bn' ? 'যাচাই চিহ্নিত করুন' : 'Earn a verified mark'} desc={language === 'bn' ? 'পাস করলে আপনার Skill Passport আপডেট হয়।' : 'When you pass, your Skill Passport updates.'} />
              <VerifyStep icon={History}        title={language === 'bn' ? 'ইতিহাস সংরক্ষণ করুন' : 'Track your history'} desc={language === 'bn' ? 'সব verified দক্ষতার ইতিহাস সংরক্ষিত থাকে।' : 'A complete, time-stamped record of every skill.'} />
              <VerifyStep icon={ShieldCheck}    title={language === 'bn' ? 'বিশ্বাসযোগ্যতা তৈরি করুন' : 'Build credibility'} desc={language === 'bn' ? 'নিয়োগকর্তার সামনে আপনার দক্ষতার প্রমাণ উপস্থাপন করুন।' : 'Present verified proof to potential employers.'} />
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div className="space-y-5 sm:space-y-6 min-w-0">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-xs font-bold">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{language === 'bn' ? 'ডিজিটাল পরিচয়' : 'Digital Identity'}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight break-words">
                  {t('passportHeader')}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {t('passportDesc')}
                </p>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF8F6] border border-red-100 space-y-3 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#E31B23]" />
                    {language === 'bn' ? 'পাসপোর্টে যা যা থাকে:' : 'What a Skill Passport contains:'}
                  </p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'প্রোফাইল ছবি ও পরিচয়' : 'Profile photo and identity'}</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'পেশা ও ক্যাটাগরি' : 'Profession and category'}</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'ভেরিফাইড দক্ষতার তালিকা ও স্কোর' : 'Verified skills and scores'}</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'পাসপোর্ট আইডি ও QR কোড' : 'Passport ID and QR code'}</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'পাবলিক ভেরিফিকেশন লিংক' : 'Public verification link'}</span></li>
                  </ul>
                </div>

                <Link
                  to="/verify"
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md"
                >
                  <span>{language === 'bn' ? 'ভেরিফাইড স্যাম্পল পাসপোর্ট' : 'View Verified Sample Passport'}</span>
                  <ChevronRight className="w-4 h-4 text-[#F97316]" />
                </Link>
              </div>

              {}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#E31B23] shadow-2xl relative space-y-5 sm:space-y-6 min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[radial-gradient(circle,_rgba(227,27,35,0.10),_transparent_70%)] blur-2xl pointer-events-none" />
                <div className="flex flex-wrap justify-between items-start gap-3 relative">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#E31B23] font-bold">
                      OFFICIAL SKILL PASSPORT
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 break-words">
                      {language === 'bn' ? 'ডিজিটাল ক্যারিয়ার পরিচয়' : 'Digital Career Identity'}
                    </h3>
                    <p className="text-xs text-slate-500 break-words">{language === 'bn' ? 'প্রার্থীর নাম · ঢাকা, বাংলাদেশ' : 'Issued to candidate · Dhaka, Bangladesh'}</p>
                  </div>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#E31B23] via-[#F97316] to-[#FF8A00] flex items-center justify-center text-white font-black text-base sm:text-lg shadow-md shadow-red-500/30 shrink-0">
                    SP
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 py-3 sm:py-4 border-y border-slate-100 text-xs font-mono min-w-0">
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px]">PASSPORT ID</p>
                    <p className="text-[#E31B23] font-bold text-xs sm:text-sm truncate">SP-BD-829104</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px]">VERIFICATION</p>
                    <p className="text-emerald-600 font-bold flex items-center gap-1 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> VERIFIED
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500">
                  <span className="font-mono text-[10px] sm:text-[11px] truncate max-w-full">skillproof.top/passport/SP-BD-829104</span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold whitespace-nowrap">
                    ACTIVE PASSPORT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div className="order-2 lg:order-1 relative min-w-0">
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-md space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#E31B23]" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E31B23]">{language === 'bn' ? 'AI ক্যারিয়ার প্রোফাইল' : 'AI Career Profile'}</p>
                  </div>
                  <p className="text-sm text-slate-700 font-bold break-words">
                    {language === 'bn' ? 'আপনার CV আপলোড করুন — SkillProof AI একটি structured career profile তৈরি করবে।' : 'Upload your CV — SkillProof AI builds a structured career profile for you.'}
                  </p>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'যেকোনো পেশার জন্য কাজ করে — ডেভেলপার, ডিজাইনার, মার্কেটার, অ্যাকাউন্ট্যান্ট, শিক্ষক, ফ্রিল্যান্সার' : 'Works for any profession — developer, designer, marketer, accountant, teacher, freelancer'}</span></p>
                    <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'স্কিল গ্যাপ ও উন্নতির সুযোগ চিহ্নিত করে' : 'Identifies skill gaps and growth opportunities'}</span></p>
                    <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'চাকরির প্রস্তুতি ও ক্যারিয়ার দিকনির্দেশনা দেয়' : 'Provides job readiness and career guidance'}</span></p>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">{language === 'bn' ? 'SkillProof AI দ্বারা চালিত' : 'Powered by SkillProof AI'}</p>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-4 sm:space-y-5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-[11px] font-bold uppercase tracking-wider">
                  <Bot className="w-3 h-3" />
                  {language === 'bn' ? 'AI ক্যারিয়ার প্রোফাইল' : 'AI CAREER PROFILE'}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight break-words">
                  {language === 'bn' ? 'আপনার ক্যারিয়ারের পরবর্তী ধাপ কী?' : 'What is your next career step?'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {language === 'bn'
                    ? 'SkillProof AI আপনার CV বিশ্লেষণ করে একটি structured career profile তৈরি করে — আপনার দক্ষতা, অভিজ্ঞতা, শিক্ষা এবং ক্যারিয়ার লক্ষ্য এক জায়গায়।'
                    : 'SkillProof AI analyses your CV and creates a structured career profile — your skills, experience, education and career goals in one place.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <SubPillar icon={CheckCircle2} label={language === 'bn' ? 'দক্ষতা মূল্যায়ন' : 'Skill assessment'} />
                  <SubPillar icon={Compass}      label={language === 'bn' ? 'ক্যারিয়ার দিকনির্দেশনা' : 'Career guidance'} />
                  <SubPillar icon={FileBadge}    label={language === 'bn' ? 'গ্যাপ বিশ্লেষণ' : 'Gap analysis'} />
                  <SubPillar icon={Sparkles}     label={language === 'bn' ? 'উন্নতির সুপারিশ' : 'Improvement suggestions'} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'ক্যারিয়ার রোডম্যাপ' : 'CAREER ROADMAP'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {language === 'bn' ? 'আপনার ক্যারিয়ারের একটি পরিষ্কার পথ' : 'A clear path for your career'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {language === 'bn'
                  ? 'SkillProof আপনাকে বুঝতে সাহায্য করে — আপনি এখন কোথায় আছেন, কোন দক্ষতা আপনার আছে, কোনটি প্রয়োজন এবং কোন দিকে এগোবেন।'
                  : 'SkillProof helps you understand where you are, what skills you have, which ones you need, and the direction to move next.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <RoadmapStep icon={Compass}     title={language === 'bn' ? 'বর্তমান দক্ষতা' : 'Current skills'} />
              <RoadmapStep icon={Search}      title={language === 'bn' ? 'অনুপস্থিত দক্ষতা' : 'Missing skills'} />
              <RoadmapStep icon={Sparkles}    title={language === 'bn' ? 'প্রস্তাবিত শেখা' : 'Recommended learning'} />
              <RoadmapStep icon={Star}        title={language === 'bn' ? 'ক্যারিয়ার দিক' : 'Career direction'} />
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <div className="space-y-4 sm:space-y-5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[#E31B23] text-[11px] font-bold uppercase tracking-wider">
                  <Briefcase className="w-3 h-3" />
                  {language === 'bn' ? 'জব পোর্টাল' : 'JOB PORTAL'}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight break-words">
                  {language === 'bn' ? 'দক্ষতার সাথে চাকরির সুযোগের সংযোগ' : 'Connecting your skills with job opportunities'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {language === 'bn'
                    ? 'আপনার verified দক্ষতার ভিত্তিতে চাকরি খুঁজুন। নিয়োগকর্তারা আপনার স্কিল পাসপোর্ট, verified achievements এবং career profile দেখে সিদ্ধান্ত নিতে পারেন।'
                    : 'Find jobs based on your verified skills. Employers can review your Skill Passport, verified achievements and career profile to make decisions.'}
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'দক্ষতার সাথে ম্যাচিং চাকরি' : 'Jobs matched to your verified skills'}</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'নিয়োগকর্তারা আপনার verified দক্ষতা দেখতে পারেন' : 'Employers see your verified skills'}</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" /><span>{language === 'bn' ? 'প্রতিটি পেশার জন্য উপযুক্ত চাকরি' : 'Opportunities for every profession'}</span></li>
                </ul>
                <Link to="/dashboard/jobs" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs shadow-md">
                  <span>{language === 'bn' ? 'চাকরি ব্রাউজ করুন' : 'Browse Jobs'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 min-w-0">
                <JobStat label={language === 'bn' ? 'দক্ষতা' : 'Skills'} value="১০+" />
                <JobStat label={language === 'bn' ? 'ক্যারিয়ার লক্ষ্য' : 'Career goals'} value="২৪/৭" />
                <JobStat label={language === 'bn' ? 'পেশা' : 'Professions'} value="১০+" />
                <JobStat label={language === 'bn' ? 'পাসপোর্ট' : 'Passports'} value="QR" />
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'সম্পূর্ণ টুলসেট' : 'FULL TOOLKIT'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('featuresTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('featuresSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featureCards.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.key}
                    className="group relative p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-[#E31B23] hover:shadow-md transition-all min-w-0 overflow-hidden"
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${f.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="mt-3 text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#E31B23] transition-colors">
                      {t(`${f.key}Title`)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {t(`${f.key}Desc`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'কেন স্কিলপ্রুফ' : 'WHY SKILLPROOF'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('whyTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('whySub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {whyKeys.map((baseKey, idx) => {
                const icons = [Award, Users, Zap, Globe2];
                const Icon = icons[idx];
                return (
                  <div
                    key={baseKey}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-[#E31B23] hover:shadow-md transition-all space-y-2 min-w-0"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-[#E31B23]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 break-words">{t(`${baseKey}Title`)}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed break-words">{t(`${baseKey}Desc`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'নিয়োগকর্তাদের জন্য' : 'FOR EMPLOYERS'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('empTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('empSub')}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto">
                {t('empDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <EmployerCard icon={Search}     title={language === 'bn' ? 'পাসপোর্ট আইডি' : 'Passport ID lookup'} desc={language === 'bn' ? 'যেকোনো পাসপোর্ট আইডি দিয়ে candidate যাচাই করুন।' : 'Verify any candidate instantly by their Passport ID.'} />
              <EmployerCard icon={ShieldCheck} title={language === 'bn' ? 'দক্ষতার প্রমাণ' : 'Proof of skill'} desc={language === 'bn' ? 'দাবি নয়, প্রমাণিত দক্ষতা দেখুন।' : 'See verified proof — not just claims.'} />
              <EmployerCard icon={QrCode}      title={language === 'bn' ? 'QR কোড যাচাই' : 'QR verification'} desc={language === 'bn' ? 'QR স্ক্যান করে দ্রুত যাচাই সম্পন্ন করুন।' : 'Scan a QR code to verify in seconds.'} />
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-red-500/25"
              >
                <span>{t('empCta')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 bg-[#FFF8F6] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'বিশ্বাস ও স্বচ্ছতা' : 'TRUST & TRANSPARENCY'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('trustTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('trustSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {trustKeys.map((baseKey, idx) => {
                const icons = [QrCode, History, ShieldCheck];
                const Icon = icons[idx];
                return (
                  <div
                    key={baseKey}
                    className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#FFF8F6] to-red-50/50 border border-red-100 hover:border-[#E31B23] transition-all space-y-3 min-w-0"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center shadow-md shadow-red-500/20">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">{t(`${baseKey}Title`)}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{t(`${baseKey}Desc`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 border-b border-slate-200/80 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#E31B23]">
                {language === 'bn' ? 'বাংলাদেশের জন্য' : 'MADE FOR BANGLADESH'}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 break-words">
                {t('bdEcosystemTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t('bdEcosystemSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-center">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFF8F6] border border-slate-200/80 space-y-2 shadow-sm">
                <GraduationCap className="w-6 h-6 text-[#E31B23] mx-auto" />
                <h4 className="text-base sm:text-lg font-bold text-slate-900 break-words">{language === 'bn' ? 'শিক্ষার্থী' : 'Students'}</h4>
                <p className="text-xs text-slate-500 break-words">{language === 'bn' ? 'পড়াশোনার পাশাপাশি বাস্তব দক্ষতা অর্জন ও প্রমাণ করুন।' : 'Build and prove real-world skills while studying.'}</p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFF8F6] border border-slate-200/80 space-y-2 shadow-sm">
                <UserPlus className="w-6 h-6 text-[#F97316] mx-auto" />
                <h4 className="text-base sm:text-lg font-bold text-slate-900 break-words">{language === 'bn' ? 'চাকরিপ্রার্থী' : 'Job Seekers'}</h4>
                <p className="text-xs text-slate-500 break-words">{language === 'bn' ? 'প্রথম চাকরি পেতে CV-র চেয়ে শক্তিশালী প্রমাণ দেখান।' : 'Show proof stronger than a CV when applying.'}</p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFF8F6] border border-slate-200/80 space-y-2 shadow-sm">
                <Building2 className="w-6 h-6 text-[#E31B23] mx-auto" />
                <h4 className="text-base sm:text-lg font-bold text-slate-900 break-words">{language === 'bn' ? 'নিয়োগকর্তা' : 'Employers'}</h4>
                <p className="text-xs text-slate-500 break-words">{language === 'bn' ? 'প্রার্থীর দক্ষতার প্রমাণ দেখে সিদ্ধান্ত নিন।' : 'Make decisions based on verified skill proof.'}</p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-14 sm:py-20 text-center relative overflow-hidden bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.15),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,0,0,0.15),_transparent_60%)]" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-6 relative z-10">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight break-words">
              {t('finalCtaTitle')}
            </h2>
            <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto font-medium break-words">
              {t('finalCtaDesc')}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-sm sm:text-base shadow-2xl transition-all transform hover:scale-105 whitespace-nowrap"
              >
                <span>{t('finalCtaBtn')}</span>
                <ArrowRight className="w-5 h-5 text-[#E31B23]" />
              </Link>
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 font-bold text-sm sm:text-base whitespace-nowrap"
              >
                <Award className="w-4 h-4" />
                {language === 'bn' ? 'পাসপোর্ট যাচাই করুন' : 'Verify a passport'}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {}
      <WebsitePopup />
    </div>
  );
};

function Pill({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-bold text-[#E31B23]">
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
    </div>
  );
}

function SubPillar({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs font-bold text-slate-800 break-words">{label}</p>
    </div>
  );
}

function VerifyStep({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-[#E31B23] hover:shadow-md transition-all space-y-2 min-w-0">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-[#E31B23]">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-slate-900 break-words">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed break-words">{desc}</p>
    </div>
  );
}

function RoadmapStep({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-[#F97316] hover:shadow-md transition-all space-y-2 min-w-0 text-center">
      <div className="mx-auto w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-[#E31B23]">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-slate-900 break-words">{title}</h3>
    </div>
  );
}

function JobStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm min-w-0">
      <p className="text-2xl sm:text-3xl font-black text-[#E31B23] truncate">{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">{label}</p>
    </div>
  );
}

function EmployerCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#FFF8F6] border border-red-100 hover:border-[#E31B23] transition-all space-y-2 min-w-0">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 break-words">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed break-words">{desc}</p>
    </div>
  );
}