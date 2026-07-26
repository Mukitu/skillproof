import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Code2, FolderGit2, Map, Brain, CheckCircle2, ArrowRight } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useLanguage } from '../../context/LanguageContext';

export const HowItWorksPage: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2136E]/15 border border-[#E2136E]/30 text-[#E2136E] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'bn' ? 'স্বচ্ছতা ও ভেরিফিকেশন নীতিমালা' : 'Transparency & Verification Principles'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {language === 'bn' ? 'স্কিলপ্রুফ কীভাবে কাজ করে' : 'How SkillProof Operates'}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {language === 'bn'
                ? 'বাংলাদেশের আইটি শিল্পে ভুয়া সিভি ও কুইজ সার্টিফিকেট দূর করে সরাসরি কোড রান ও ম্যানুয়াল রিভিউয়ের মাধ্যমে যোগ্যতাকে প্রতিষ্ঠিত করা।'
                : 'Eliminating resume inflation in the Bangladeshi tech industry through automated code execution and human peer review.'}
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#E2136E]/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#E2136E]/20 text-[#E2136E] font-extrabold flex items-center justify-center text-sm">
                  ১
                </span>
                <h3 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'এআই ক্যারিয়ার প্রোফাইল তৈরি করুন' : 'Create AI Career Profile'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-11">
                {language === 'bn'
                  ? 'আপনার বর্তমান সিভি আপলোড করুন। আমাদের এআই পার্কসার আপনার অভিজ্ঞতা ও দক্ষতা স্বয়ংক্রিয়ভাবে সাজাবে এবং প্রয়োজনীয় ল্যাকিং চিহ্নিত করবে।'
                  : 'Upload your existing CV/resume. Our AI parser extracts your experience, education, and skills. Identify missing skills and map out your targets without manual typing.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#E2136E]/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#E2136E]/20 text-[#E2136E] font-extrabold flex items-center justify-center text-sm">
                  ২
                </span>
                <h3 className="text-lg font-bold text-white">
                  {language === 'bn' ? '২৪ ঘণ্টা মডিউল ক্যারিয়ার রোডম্যাপ অনুসরণ করুন' : 'Follow 24-Hour Module Career Roadmap'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-11">
                {language === 'bn'
                  ? 'আপনার টার্গেট ক্যাটাগরি (যেমন ফুলস্ট্যাক বা ব্যাকএন্ড) নির্বাচন করুন। প্রতি ২৪ ঘণ্টায় একটি করে মডিউল আনলক হবে যা ধারাবাহিক শেখার নিশ্চয়তা দেয়।'
                  : 'Pick your target category (e.g. Frontend or Backend) and duration (15, 30, 60 days). Modules unlock exactly one by one every 24 hours to enforce structured daily learning.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#E2136E]/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#E2136E]/20 text-[#E2136E] font-extrabold flex items-center justify-center text-sm">
                  ৩
                </span>
                <h3 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'কোডিং চ্যালেঞ্জ অথবা প্রজেক্ট সাবমিট করুন' : 'Pass Coding Challenges or Project Reviews'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-11">
                {language === 'bn'
                  ? 'কোডফোর্সেস স্টাইল প্রবলেম সলভ করুন অথবা বাস্তব প্রজেক্ট তৈরি করে আপনার গিটহাব লিংক বা জিপ ফাইল সাবমিট করুন।'
                  : 'Solve Codeforces/CodeMama-style algorithmic problems or build practical projects from scratch. Submit your GitHub URL or ZIP file for manual admin evaluation.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#E2136E]/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#E2136E]/20 text-[#E2136E] font-extrabold flex items-center justify-center text-sm">
                  ৪
                </span>
                <h3 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'স্কিল পাসপোর্ট অর্জন ও আপগ্রেড করুন' : 'Receive & Upgrade Skill Passports'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-11">
                {language === 'bn'
                  ? 'আপনার একক স্কিল পাসপোর্ট অনুযায়ী লেভেল ১, ২ বা ৩ স্ট্যাটাস আপডেট হবে যা যেকোনো নিয়োগকারীর সাথে শেয়ার করা যায়।'
                  : 'Your single Skill Passport for that technology updates to Level 1, Level 2, or Level 3. Share your public passport URL directly with employers and recruiters.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
