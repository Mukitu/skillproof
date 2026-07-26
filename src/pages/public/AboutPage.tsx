import React from 'react';
import { ShieldCheck, HelpCircle, CheckCircle, Mail, MapPin } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useLanguage } from '../../context/LanguageContext';

export const AboutPage: React.FC = () => {
  const { language } = useLanguage();

  const faqs = [
    {
      q: language === 'bn' ? 'স্কিলপ্রুফে কেন কোনো কৃত্রিম কুইজ নেই?' : 'Why does SkillProof NOT have AI Quizzes or Multiple-Choice Questions?',
      a: language === 'bn'
        ? 'মাল্টিপল চয়েস কুইজ দিয়ে সত্যিকারের কোডিং ক্যাপাসিটি পরিমাপ করা যায় না। স্কিলপ্রুফে আপনাকে সরাসরি রানটাইম টেস্ট কেস পাস করতে হয় অথবা গিটহাবের রিয়েল কোড সাবমিট করতে হয়।'
        : 'Multiple-choice quizzes measure memorization rather than actual engineering execution. SkillProof requires running code through test cases or real GitHub repositories.',
    },
    {
      q: language === 'bn' ? 'একক স্কিল পাসপোর্ট নিয়ম কীভাবে কাজ করে?' : 'How does the Single Skill Passport rule work?',
      a: language === 'bn'
        ? 'প্রতিটি প্রযুক্তির জন্য একজন ব্যবহারকারীর একটিমাত্র স্কিল পাসপোর্ট থাকে। আপনি লেভেল ১ থেকে লেভেল ২ তে উন্নীত হলে একই পাসপোর্ট আইডি দিয়ে স্ট্যাটাস আপগ্রেড হয়, কোনো আলাদা ভুয়া সার্টিফিকেট তৈরি হয় না।'
        : 'Each user has at most ONE Skill Passport per technology. When you pass Level 2, that same passport updates rather than creating duplicate certificates.',
    },
    {
      q: language === 'bn' ? 'ক্যারিয়ার রোডম্যাপ মডিউল কীভাবে আনলক হয়?' : 'How do Career Roadmaps unlock?',
      a: language === 'bn'
        ? 'মডিউলগুলো আপনার শুরু করার সময় থেকে ঠিক ২৪ ঘণ্টা পর পর আনলক হয়। এটি তাড়াহুড়ো না করে প্রতিদিন নিয়মিত শিক্ষার ধারাবাহিকতা বজায় রাখতে সাহায্য করে।'
        : 'Roadmap modules unlock strictly one by one every 24 hours from your start date. This prevents rushing and ensures consistent daily progress.',
    },
    {
      q: language === 'bn' ? 'নিয়োগকারীরা কি অ্যাকাউন্ট ছাড়াই ভেরিফাই করতে পারবেন?' : 'Can employers verify a candidate passport without signing up?',
      a: language === 'bn'
        ? 'হ্যাঁ! যে কেউ সাইন আপ ছাড়াই পাসপোর্ট আইডি দিয়ে প্রার্থীর আসল যোগ্যতা অনলাইনে যাচাই করতে পারবেন।'
        : 'Yes! Anyone can visit the verification link to check candidate credentials instantly without creating an account.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2136E]/15 border border-[#E2136E]/30 text-[#E2136E] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'bn' ? 'স্কিলপ্রুফ বাংলাদেশ সম্পর্কে' : 'About SkillProof Bangladesh'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              {language === 'bn' ? 'বিশ্বস্ত ডিজিটাল টেক ক্রেডেনশিয়াল' : 'Building High-Trust Tech Credentials'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              {language === 'bn'
                ? 'আমাদের লক্ষ্য হলো বাংলাদেশের সফটওয়্যার ইঞ্জিনিয়ারদের নিজেদের আসল যোগ্যতা শীর্ষ কোম্পানির কাছে বিশ্বস্ততার সাথে তুলে ধরার সুযোগ তৈরি করা।'
                : 'Our mission is to empower developers across Bangladesh to demonstrate their genuine technical capacity to top hiring companies.'}
            </p>
          </div>

          {/* FAQs */}
          <div className="space-y-6 pt-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#E2136E]" />
              <span>{language === 'bn' ? 'সাধারণ প্রশ্নাবলী (FAQ)' : 'Frequently Asked Questions'}</span>
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-[#E2136E]/40 transition-colors">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#E2136E] shrink-0" /> {faq.q}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2 text-center">
            <p className="font-bold text-white text-sm">SkillProof Headquarters</p>
            <p className="flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#E2136E]" /> Gulshan 2, Dhaka 1212, Bangladesh
            </p>
            <p className="flex items-center justify-center gap-1.5">
              <Mail className="w-4 h-4 text-[#E2136E]" /> support@skillproof.top
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
