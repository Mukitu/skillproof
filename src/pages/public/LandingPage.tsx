import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShieldCheck,
  Code2,
  FolderGit2,
  Award,
  ArrowRight,
  CheckCircle2,
  Search,
  Play,
  Terminal,
  Building2,
  MapPin,
  Sparkles,
  ChevronRight,
  Check,
  Users,
  Briefcase,
  Layers,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Interactive Code Demo State
  const [selectedLanguage, setSelectedLanguage] = useState<'cpp' | 'python' | 'javascript'>('python');
  const [code, setCode] = useState<string>(
    `# Two Sum Problem - SkillProof Verification
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test Execution
print(two_sum([2, 7, 11, 15], 9))`
  );
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'running' | 'passed' | 'failed';
    message?: string;
    runtime?: string;
    memory?: string;
  }>({ status: 'idle' });

  const [passportSearchInput, setPassportSearchInput] = useState('');

  const runCodeDemo = () => {
    setTestResult({ status: 'running' });
    setTimeout(() => {
      setTestResult({
        status: 'passed',
        message: language === 'bn' ? 'সকল ৪টি টেস্ট কেস সফলভাবে উত্তীর্ণ হয়েছে (Accepted)' : 'All 4/4 Test Cases Passed (ACCEPTED)',
        runtime: '12ms',
        memory: '14.2 MB',
      });
    }, 1200);
  };

  const handlePassportSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (passportSearchInput.trim()) {
      navigate(`/passport/${passportSearchInput.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 font-sans selection:bg-[#ED1C24] selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION - LIGHT BACKGROUND WITH ROBI RED-ORANGE GRADIENT ACCENTS */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-red-100 bg-gradient-to-b from-white via-[#FFF8F6] to-red-50/30">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-200/40 via-orange-100/20 to-transparent pointer-events-none blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#ED1C24] text-xs font-black tracking-wide shadow-sm animate-pulse">
                <ShieldCheck className="w-4 h-4 text-[#ED1C24]" />
                <span>
                  {language === 'bn'
                    ? 'বাংলাদেশের প্রথম প্র্যাকটিক্যাল স্কিল ভেরিফিকেশন প্ল্যাটফর্ম'
                    : 'The #1 Practical Skill Verification Platform in Bangladesh'}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                {language === 'bn' ? (
                  <>
                    আপনি সত্যি কী করতে পারেন <br />
                    <span className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] bg-clip-text text-transparent">
                      তা প্রমাণ করুন।
                    </span>
                  </>
                ) : (
                  <>
                    Prove What You <br />
                    <span className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] bg-clip-text text-transparent">
                      Can Actually Do.
                    </span>
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
                {language === 'bn'
                  ? 'কোনো ফেক কুইজ বা স্ট্যাটিক সার্টিফিকেট নয়। কোডফোর্সেস স্টাইল প্রবলেম সলভিং ও অভিজ্ঞ সিনিয়র ইঞ্জিনিয়ারদের ম্যানুয়াল প্রজেক্ট কোড রিভিউয়ের মাধ্যমে অর্জন করুন বিশ্বমানের "স্কিল পাসপোর্ট"।'
                  : 'No fake quiz badges or static PDFs. Get verified through Codeforces-style programming challenges and senior human code review. Issue one continuous Skill Passport.'}
              </p>

              {/* Primary Call to Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  to="/dashboard/verify"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <span>{t('btnStartVerify')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/passport/SP-BD-829104"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Award className="w-4 h-4 text-[#ED1C24]" />
                  <span>{t('btnSamplePassport')}</span>
                </Link>
              </div>

              {/* Search Passport Bar */}
              <div className="pt-6 max-w-md mx-auto">
                <form onSubmit={handlePassportSearch} className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'পাসপোর্ট আইডি টাইপ করুন (যেমন: SP-BD-829104)' : 'Enter Passport ID (e.g. SP-BD-829104)'}
                    value={passportSearchInput}
                    onChange={(e) => setPassportSearchInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#ED1C24] rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-md transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 p-2 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white rounded-xl shadow-sm transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>

            {/* LIVE STATS COUNTER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 pt-8 border-t border-slate-200/80 max-w-5xl mx-auto">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm">
                <p className="text-3xl font-black text-slate-900">৫,০০০+</p>
                <p className="text-xs text-slate-500 font-semibold">
                  {language === 'bn' ? 'ভেরিফাইড ডেভলপার' : 'Verified Developers'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm">
                <p className="text-3xl font-black text-[#ED1C24]">১,২০০+</p>
                <p className="text-xs text-slate-500 font-semibold">
                  {language === 'bn' ? 'কোডিং চ্যালেঞ্জ' : 'Coding Challenges'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm">
                <p className="text-3xl font-black text-[#F58220]">৪৫০+</p>
                <p className="text-xs text-slate-500 font-semibold">
                  {language === 'bn' ? 'প্রজেক্ট কোড রিভিউ' : 'Project Code Reviews'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm">
                <p className="text-3xl font-black text-slate-900">২৫০+</p>
                <p className="text-xs text-slate-500 font-semibold">
                  {language === 'bn' ? 'হায়ারিং পার্টনার' : 'Hiring Partners'}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 2 CORE VERIFICATION PILLARS SECTION */}
        <section className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ED1C24]">
                {language === 'bn' ? 'একমাত্র দুটি ভেরিফিকেশন মেথড' : 'STRICTLY TWO VERIFICATION METHODS'}
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {t('pillarTitle')}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {t('pillarSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Method 1: Coding Challenge */}
              <div className="p-8 rounded-3xl bg-[#FFF8F6] border border-red-100 hover:border-[#ED1C24] transition-all space-y-6 group shadow-sm hover:shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Code2 className="w-32 h-32 text-[#ED1C24]" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ED1C24] to-[#F58220] text-white flex items-center justify-center font-black shadow-md shadow-red-500/20">
                  <Code2 className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-[#ED1C24] transition-colors">
                    {t('codingChallengeTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('codingChallengeDesc')}
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 border-t border-red-100/80 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ED1C24]" />
                    <span>{language === 'bn' ? 'স্বয়ংক্রিয় হিডেন টেস্ট কেস প্রসেসিং' : 'Automated hidden testcase processing'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ED1C24]" />
                    <span>{language === 'bn' ? 'তাৎক্ষণিক রায়: Accepted, Time Limit Exceeded (TLE), Wrong Answer' : 'Real-time verdicts: Accepted, TLE, Wrong Answer'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ED1C24]" />
                    <span>{language === 'bn' ? 'মেমোরি ও এক্সিকিউশন টাইম অ্যানালিটিক্স' : 'Runtime memory and millisecond analytics'}</span>
                  </li>
                </ul>

                <Link
                  to="/dashboard/verify"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#ED1C24] hover:text-[#B5121B] pt-2"
                >
                  <span>{language === 'bn' ? 'কোডিং চ্যালেঞ্জ ট্রাই করুন' : 'Try Coding Challenge'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Method 2: Project Verification */}
              <div className="p-8 rounded-3xl bg-[#FFF8F6] border border-orange-100 hover:border-[#F58220] transition-all space-y-6 group shadow-sm hover:shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <FolderGit2 className="w-32 h-32 text-[#F58220]" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F58220] to-[#FFB000] text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
                  <FolderGit2 className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-[#F58220] transition-colors">
                    {t('projectVerifyTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('projectVerifyDesc')}
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 border-t border-orange-100/80 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F58220]" />
                    <span>{language === 'bn' ? 'সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার দ্বারা গিটহাব ফাইল অ্যান্ড কোড রিভিউ' : 'GitHub Repository & ZIP codebase review by senior engineer'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F58220]" />
                    <span>{language === 'bn' ? 'আর্কিটেকচার, সিকিউরিটি ও ক্লিন কোড স্ট্যান্ডার্ড ইভালুয়েশন' : 'Architecture, security, and clean code scoring'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F58220]" />
                    <span>{language === 'bn' ? 'অনুমোদিত হলে তাৎক্ষণিক স্কিল লেভেল আপগ্রেড' : 'Instant passport level upgrade upon approval'}</span>
                  </li>
                </ul>

                <Link
                  to="/dashboard/verify"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#F58220] hover:text-[#d46a13] pt-2"
                >
                  <span>{language === 'bn' ? 'প্রজেক্ট সাবমিশন দেখুন' : 'Explore Project Challenges'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CODE IDE DEMO PREVIEW */}
        <section className="py-20 border-b border-slate-200/80 bg-[#FFF8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ED1C24]">
                {language === 'bn' ? 'লাইভ প্ল্যাটফর্ম টেস্ট' : 'LIVE CODE JUDGE ENGINE'}
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {t('demoTitle')}
              </h2>
              <p className="text-sm text-slate-600">
                {t('demoSub')}
              </p>
            </div>

            {/* Interactive Browser Code Editor Box */}
            <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              {/* Editor Header Bar */}
              <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="ml-4 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#ED1C24]" /> solution.py
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 text-[11px] font-mono">
                    <button
                      onClick={() => setSelectedLanguage('python')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        selectedLanguage === 'python' ? 'bg-[#ED1C24] text-white' : 'text-slate-400'
                      }`}
                    >
                      Python 3
                    </button>
                    <button
                      onClick={() => setSelectedLanguage('javascript')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        selectedLanguage === 'javascript' ? 'bg-[#ED1C24] text-white' : 'text-slate-400'
                      }`}
                    >
                      JavaScript
                    </button>
                    <button
                      onClick={() => setSelectedLanguage('cpp')}
                      className={`px-2 py-0.5 rounded font-bold ${
                        selectedLanguage === 'cpp' ? 'bg-[#ED1C24] text-white' : 'text-slate-400'
                      }`}
                    >
                      C++20
                    </button>
                  </div>

                  <button
                    onClick={runCodeDemo}
                    disabled={testResult.status === 'running'}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-red-500/20 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {testResult.status === 'running'
                        ? (language === 'bn' ? 'রান হচ্ছে...' : 'Executing...')
                        : (language === 'bn' ? 'কোড সাবমিট করুন' : 'Submit Code')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Code Textarea Input */}
              <div className="p-6 bg-slate-950/90 font-mono text-xs leading-relaxed text-slate-200">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={8}
                  className="w-full bg-transparent resize-none focus:outline-none font-mono text-xs text-rose-200/90"
                />
              </div>

              {/* Verdict Result Display */}
              <div className="bg-slate-900 border-t border-slate-800 p-6">
                {testResult.status === 'idle' && (
                  <p className="text-xs text-slate-400 font-mono">
                    {language === 'bn'
                      ? '💡 উপরের কোড সাবমিট বোতামে চাপ দিয়ে স্বয়ংক্রিয় টেস্ট কেস চেক করুন।'
                      : '💡 Click "Submit Code" to test hidden assertion cases and view runtime metrics.'}
                  </p>
                )}

                {testResult.status === 'running' && (
                  <div className="flex items-center gap-3 text-xs text-amber-400 font-mono">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>{language === 'bn' ? 'টেস্ট কেস এক্সিকিউট হচ্ছে...' : 'Running hidden test cases on sandbox runtime...'}</span>
                  </div>
                )}

                {testResult.status === 'passed' && (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> ACCEPTED
                      </span>
                      <div className="flex gap-4 text-xs font-mono text-slate-300">
                        <span>Runtime: <strong className="text-emerald-400">{testResult.runtime}</strong></span>
                        <span>Memory: <strong className="text-emerald-400">{testResult.memory}</strong></span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {testResult.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SINGLE SKILL PASSPORT SHOWCASE */}
        <section className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#ED1C24] text-xs font-bold">
                  <Award className="w-4 h-4" />
                  <span>{language === 'bn' ? 'একক প্রযুক্তি স্কিল পাসপোর্ট নিযম' : 'Continuous Upgrade System'}</span>
                </div>

                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {t('passportHeader')}
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {t('passportDesc')}
                </p>

                <div className="p-5 rounded-2xl bg-[#FFF8F6] border border-red-100 space-y-3 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#ED1C24]" />
                    {language === 'bn' ? 'কীভাবে স্কিল আপডেট হয়?' : 'How Upgrade Works:'}
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <p className="text-slate-500">১. React.js Level 1 Verified → (ফেব্রুয়ারি ২০২৬)</p>
                    <p className="text-[#ED1C24] font-bold">২. React.js Level 2 Challenge Passed → (জুলাই ২০২৬ - স্বয়ংক্রিয় আপগ্রেড)</p>
                  </div>
                </div>

                <Link
                  to="/passport/SP-BD-829104"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md"
                >
                  <span>{language === 'bn' ? 'ভেরিফাইড স্যাম্পল পাসপোর্ট লিংকে প্রবেশ করুন' : 'View Verified Sample Passport'}</span>
                  <ChevronRight className="w-4 h-4 text-[#F58220]" />
                </Link>
              </div>

              {/* MOCKUP DIGITAL PASSPORT CARD */}
              <div className="p-8 rounded-3xl bg-white border-2 border-[#ED1C24] shadow-2xl relative space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#ED1C24] font-bold">
                      OFFICIAL SKILL PASSPORT
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      Full-Stack Web Dev (Level 2)
                    </h3>
                    <p className="text-xs text-slate-500">Issued to Tanvir Hossain • Mirpur, Dhaka</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ED1C24] via-[#F58220] to-[#FFB000] flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-500/30">
                    SP
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 text-xs font-mono">
                  <div>
                    <p className="text-slate-400 text-[10px]">PASSPORT ID</p>
                    <p className="text-[#ED1C24] font-bold text-sm">SP-BD-829104</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px]">VERIFICATION</p>
                    <p className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED (100%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px]">skillproof.top/passport/SP-BD-829104</span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold">
                    ACTIVE PASSPORT
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* BANGLADESH TECH ECOSYSTEM & HIRING PARTNERS */}
        <section className="py-20 border-b border-slate-200/80 bg-[#FFF8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ED1C24]">
                {language === 'bn' ? 'বাংলাদেশের আইটি সেক্টর' : 'BANGLADESH TECH ECOSYSTEM'}
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {t('bdEcosystemTitle')}
              </h2>
              <p className="text-sm text-slate-600">
                {t('bdEcosystemSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-sm">
                <MapPin className="w-6 h-6 text-[#ED1C24] mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">Dhaka Tech Hubs</h4>
                <p className="text-xs text-slate-500">Gulshan, Banani, Uttara, Mirpur software companies.</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-sm">
                <MapPin className="w-6 h-6 text-[#F58220] mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">Chittagong & Sylhet</h4>
                <p className="text-xs text-slate-500">Leading offshore development agencies & remote devs.</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-sm">
                <Building2 className="w-6 h-6 text-[#ED1C24] mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">Global Remote Teams</h4>
                <p className="text-xs text-slate-500">Direct hiring for USA, EU, and Asian enterprise clients.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER IN ROBI RED-ORANGE GRADIENT */}
        <section className="py-20 text-center relative overflow-hidden bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] text-white">
          <div className="max-w-4xl mx-auto px-4 space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              {language === 'bn'
                ? 'আপনার সফটওয়্যার ইঞ্জিনিয়ারিং ক্যারিয়ার ভেরিফাই করতে প্রস্তুত?'
                : 'Ready to Prove Your Engineering Skills in Bangladesh?'}
            </h2>
            <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto font-medium">
              {language === 'bn'
                ? 'আজই আপনার বিনামূল্যে ফ্রি একাউন্ট তৈরি করুন এবং প্রথম কোডিং প্রবলেম সাবমিট করে স্কিল পাসপোর্ট অর্জন করুন।'
                : 'Create your free account today, complete your first challenge, and issue your verified passport.'}
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-base shadow-2xl transition-all transform hover:scale-105"
              >
                <span>{language === 'bn' ? 'ফ্রি সাইন আপ করুন' : 'Get Started Free'}</span>
                <ArrowRight className="w-5 h-5 text-[#ED1C24]" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};
