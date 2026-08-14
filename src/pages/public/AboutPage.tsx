import React from 'react';
import { ShieldCheck, HelpCircle, CheckCircle, Mail, MapPin } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { SEOHead } from '../../components/public/SEOHead';
import { useLanguage } from '../../context/LanguageContext';

export const AboutPage: React.FC = () => {
  const { language } = useLanguage();

  const faqs = [
    {
      q: language === 'bn'
        ? 'স্কিলপ্রুফে কেন শুধু কুইজ নয়, বাস্তব কাজ যাচাই করা হয়?'
        : 'Why does SkillProof verify real work instead of relying on quizzes?',
      a: language === 'bn'
        ? 'মাল্টিপল চয়েস প্রশ্ন মূলত স্মৃতিশক্তি পরীক্ষা করে, আসল দক্ষতা নয়। স্কিলপ্রুফে অ্যাসেসমেন্টে সরাসরি কাজ সম্পন্ন করতে হয় এবং সিনিয়র রিভিউয়ার সেই কাজ যাচাই করেন।'
        : 'Multiple-choice questions measure recall rather than real ability. SkillProof evaluates the actual work you submit and senior reviewers verify it.',
    },
    {
      q: language === 'bn' ? 'একক স্কিল পাসপোর্ট নিয়ম কীভাবে কাজ করে?' : 'How does the Single Skill Passport rule work?',
      a: language === 'bn'
        ? 'প্রতিটি দক্ষতার জন্য একজন ব্যবহারকারীর একটিমাত্র স্কিল পাসপোর্ট থাকে। আপনি লেভেল ১ থেকে লেভেল ২ তে উন্নীত হলে একই পাসপোর্ট আইডি দিয়ে স্ট্যাটাস আপগ্রেড হয়, কোনো আলাদা ভুয়া সার্টিফিকেট তৈরি হয় না।'
        : 'Each user has at most ONE Skill Passport per skill. When you pass Level 2, that same passport updates rather than creating duplicate certificates.',
    },
    {
      q: language === 'bn' ? 'ক্যারিয়ার রোডম্যাপ মডিউল কীভাবে আনলক হয়?' : 'How do Career Roadmaps unlock?',
      a: language === 'bn'
        ? 'মডিউলগুলো আপনার শুরু করার সময় থেকে ঠিক ২৪ ঘণ্টা পর পর আনলক হয়। এটি তাড়াহুড়ো না করে প্রতিদিন নিয়মিত শিক্ষার ধারাবাহিকতা বজায় রাখতে সাহায্য করে।'
        : 'Roadmap modules unlock strictly one by one every 24 hours from your start date. This prevents rushing and ensures consistent daily progress.',
    },
    {
      q: language === 'bn' ? 'নিয়োগকারীরা কি অ্যাকাউন্ট ছাড়াই ভেরিফাই করতে পারবেন?' : 'Can employers verify a candidate passport without signing up?',
      a: language === 'bn'
        ? 'হ্যাঁ! যে কেউ সাইন আপ ছাড়াই পাসপোর্ট আইডি দিয়ে প্রার্থীর আসল যোগ্যতা অনলাইনে যাচাই করতে পারবেন।'
        : 'Yes! Anyone can visit the verification link to check candidate credentials instantly without creating an account.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SEOHead
        pageKey="about"
        path="/about"
        title="About SkillProof — Bangladesh's Skill Verification Platform"
        description="Learn about SkillProof, Bangladesh's AI-powered skill verification and career development platform. Discover our mission, FAQs, and how we verify real skills."
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'About', url: '/about' },
        ]}
      />
      <Navbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'bn' ? 'স্কিলপ্রুফ বাংলাদেশ সম্পর্কে' : 'About SkillProof Bangladesh'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white break-words">
              {language === 'bn'
                ? 'বিশ্বস্ত দক্ষতার ডিজিটাল পরিচয়'
                : 'High-Trust Digital Skill Identity'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto break-words">
              {language === 'bn'
                ? 'আমাদের লক্ষ্য হলো বাংলাদেশের প্রতিটি দক্ষ মানুষকে — যেকোনো ক্যারিয়ারের জন্য — তাদের আসল যোগ্যতা বিশ্বস্তভাবে তুলে ধরার সুযোগ তৈরি করা।'
                : 'Our mission is to give every skilled person in Bangladesh — in every career — a trusted way to prove their real ability.'}
            </p>
          </div>

          {}
          <div className="space-y-5 sm:space-y-6 pt-4 sm:pt-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 break-words">
              <HelpCircle className="w-5 h-5 text-[#F97316] shrink-0" />
              <span>{language === 'bn' ? 'সাধারণ প্রশ্নাবলী (FAQ)' : 'Frequently Asked Questions'}</span>
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-[#F97316]/50 transition-colors">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 break-words">
                    <CheckCircle className="w-4 h-4 text-[#F97316] shrink-0" /> {faq.q}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6 break-words">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2 text-center">
            <p className="font-bold text-white text-sm">{language === 'bn' ? 'স্কিলপ্রুফ কার্যালয়' : 'SkillProof Headquarters'}</p>
            <p className="flex items-center justify-center gap-1.5 break-words">
              <MapPin className="w-4 h-4 text-[#F97316] shrink-0" /> {language === 'bn' ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh'}
            </p>
            <p className="flex items-center justify-center gap-1.5 break-words">
              <Mail className="w-4 h-4 text-[#F97316] shrink-0" /> support@skillproof.com.bd
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};