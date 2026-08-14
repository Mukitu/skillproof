import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SEOHead } from '../../components/public/SEOHead';
import { useLanguage } from '../../context/LanguageContext';

export const HowItWorksPage: React.FC = () => {
  const { language } = useLanguage();
  const steps = language === 'bn'
    ? [
        ['১', 'আপনার ক্ষেত্র নির্বাচন করুন', 'প্রযুক্তি, ক্রিয়েটিভ, ব্যবসা, পেশাগত বা শিক্ষা — যেকোনো ক্ষেত্র থেকে নিজের লক্ষ্যের সাথে মিল রেখে যাত্রা শুরু করুন।'],
        ['২', 'ক্যারিয়ার প্রোফাইল তৈরি করুন', 'আপনার বর্তমান সিভি আপলোড করুন। SkillProof AI আপনার অভিজ্ঞতা ও দক্ষতা সাজিয়ে দেবে এবং প্রয়োজনীয় দক্ষতার ঘাটতি চিহ্নিত করবে।'],
        ['৩', 'ক্যারিয়ার রোডম্যাপ অনুসরণ করুন', 'নির্বাচিত ক্যাটাগরির জন্য প্রতি ২৪ ঘণ্টায় একটি করে মডিউল আনলক হবে — ধারাবাহিক ও পরিমিত গতিতে শেখার নিশ্চয়তা।'],
        ['৪', 'অ্যাসেসমেন্ট ও কাজ জমা দিন', 'আপনার ক্ষেত্রের জন্য তৈরি বাস্তবসম্মত অ্যাসেসমেন্ট সম্পন্ন করুন অথবা আসল কাজের নমুনা জমা দিন। সিনিয়র রিভিউয়ার সেগুলো যাচাই করবেন।'],
        ['৫', 'স্কিল পাসপোর্ট অর্জন করুন', 'প্রতিটি দক্ষতার জন্য একটিমাত্র স্কিল পাসপোর্ট লেভেল ১, ২ বা ৩ এ আপডেট হবে — যা আপনার আসল যোগ্যতার প্রমাণ।'],
        ['৬', 'চাকরিদাতার সাথে শেয়ার করুন', 'আপনার পাবলিক পাসপোর্ট লিংক যেকোনো নিয়োগকারীর সাথে শেয়ার করুন — তারা অ্যাকাউন্ট ছাড়াই যাচাই করতে পারবেন।'],
      ]
    : [
        ['1', 'Choose Your Field', 'Pick your field — Technology, Creative, Business, Professional or Education — and start a journey aligned with your career goal.'],
        ['2', 'Build Your Career Profile', 'Upload your CV/resume. SkillProof AI organises your experience and skills and identifies gaps that need attention.'],
        ['3', 'Follow a Career Roadmap', 'Modules unlock one by one every 24 hours so you build skills with consistent, sustainable momentum.'],
        ['4', 'Complete Assessments & Submit Work', 'Complete realistic assessments for your field or submit actual work samples. Senior reviewers verify every submission.'],
        ['5', 'Earn Your Skill Passport', 'A single Skill Passport per skill upgrades to Level 1, 2, or 3 — proof of your real ability, not a paper certificate.'],
        ['6', 'Share with Employers', 'Share your public passport link with any employer — they can verify it instantly, no account required.'],
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SEOHead
        pageKey="how-it-works"
        path="/how-it-works"
        title="How SkillProof Works — Verify Your Real Skills"
        description="A step-by-step guide to how SkillProof verifies real skills in Bangladesh. Pick a field, build your career profile, follow a roadmap, complete assessments, and earn a verified Skill Passport."
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'How It Works', url: '/how-it-works' },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How SkillProof works',
          description:
            'A transparent process that proves what you can really do through real work — for every career, in every field.',
          step: [
            { '@type': 'HowToStep', position: 1, name: 'Choose Your Field', text: 'Pick a field — Technology, Creative, Business, Professional, or Education.' },
            { '@type': 'HowToStep', position: 2, name: 'Build Your Career Profile', text: 'Upload your CV/resume and let SkillProof AI organise your skills.' },
            { '@type': 'HowToStep', position: 3, name: 'Follow a Career Roadmap', text: 'Modules unlock one by one every 24 hours.' },
            { '@type': 'HowToStep', position: 4, name: 'Complete Assessments', text: 'Complete realistic assessments or submit work samples for senior review.' },
            { '@type': 'HowToStep', position: 5, name: 'Earn Your Skill Passport', text: 'A single Skill Passport per skill upgrades to Level 1, 2, or 3.' },
            { '@type': 'HowToStep', position: 6, name: 'Share with Employers', text: 'Share your public passport link — anyone can verify it instantly.' },
          ],
        }}
      />
      <Navbar />
      <main className="flex-1 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'bn' ? 'স্বচ্ছতা ও ভেরিফিকেশন নীতিমালা' : 'Transparency & Verification Principles'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {language === 'bn' ? 'স্কিলপ্রুফ কীভাবে কাজ করে' : 'How SkillProof Works'}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {language === 'bn'
                ? 'ভুয়া সিভি ও সার্টিফিকেট দূর করে আপনার আসল কাজের মাধ্যমে যোগ্যতা প্রমাণ করার একটি স্বচ্ছ প্রক্রিয়া।'
                : 'A transparent process that proves what you can really do through real work — for every career, in every field.'}
            </p>
          </div>
          <div className="space-y-6">
            {steps.map(([number, title, description]) => (
              <div key={number} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#FF8A00]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#FF8A00]/20 text-[#FF8A00] font-extrabold flex items-center justify-center text-sm">{number}</span>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-11">{description}</p>
              </div>
            ))}
          </div>
          <div className="pt-6 text-center">
            <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:opacity-95 transition-all">
              {language === 'bn' ? 'আপনার যাত্রা শুরু করুন' : 'Start your journey'}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
