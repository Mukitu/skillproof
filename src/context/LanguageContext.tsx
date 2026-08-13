import React, { createContext, useContext, useState, useEffect } from 'react';
import { landingDictionary } from './landingTranslations';

export type Language = 'bn' | 'en';

interface Translations {
  [key: string]: {
    bn: string;
    en: string;
  };
}


export const dictionary: Translations = {
  
  brandName: {
    bn: 'SKILLPROOF',
    en: 'SKILLPROOF',
  },
  tagline: {
    bn: 'আপনি সত্যি কী করতে পারেন তা প্রমাণ করুন।',
    en: 'Prove What You Can Actually Do.',
  },
  subTagline: {
    bn: 'শুধু CV নয় — আপনার আসল দক্ষতার প্রমাণ।',
    en: 'Not just a CV — proof of what you can really do.',
  },

  
  navHome: { bn: 'হোম', en: 'Home' },
  navHowItWorks: { bn: 'কিভাবে কাজ করে', en: 'How It Works' },
  navSkillVerification: { bn: 'স্কিল ভেরিফিকেশন', en: 'Skill Verification' },
  navPassport: { bn: 'স্কিল পাসপোর্ট', en: 'Skill Passport' },
  navJobPortal: { bn: 'জব পোর্টাল', en: 'Job Portal' },
  navEmployerVerify: { bn: 'এমপ্লয়ার ভেরিফিকেশন', en: 'Employer Verification' },
  navPlatform: { bn: 'প্ল্যাটফর্ম', en: 'Platform' },
  navAbout: { bn: 'আমাদের সম্পর্কে', en: 'About Us' },
  navLogin: { bn: 'লগইন', en: 'Login' },
  navRegister: { bn: 'সাইন আপ', en: 'Sign Up' },
  navDashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  navAdminPanel: { bn: 'এডমিন প্যানেল', en: 'Admin Panel' },
  navLogout: { bn: 'লগআউট', en: 'Logout' },
  navDownloadApp: { bn: 'APK ডাউনলোড', en: 'Download APK' },

  
  btnStartVerify: { bn: 'দক্ষতা যাচাই শুরু করুন', en: 'Verify Skills Now' },
  btnSamplePassport: { bn: 'স্যাম্পল পাসপোর্ট দেখুন', en: 'View Sample Passport' },

  
  statDevelopers: {
    bn: '৫,০০০+ ভেরিফাইড দক্ষতা',
    en: '5,000+ Verified Skills',
  },
  statChallenges: {
    bn: '১,২০০+ অ্যাসেসমেন্ট সম্পন্ন',
    en: '1,200+ Assessments Completed',
  },
  statProjects: {
    bn: '৪৫০+ ক্যারিয়ার প্রোফাইল',
    en: '450+ Career Profiles Built',
  },
  statPartners: {
    bn: 'প্রতিটি ক্যারিয়ার লক্ষ্যের জন্য',
    en: 'Built for every career goal',
  },

  
  pillarTitle: {
    bn: 'আপনার দক্ষতা যাচাইয়ের দুটি শক্তিশালী পদ্ধতি',
    en: 'Two powerful ways to verify your skills',
  },
  pillarSubtitle: {
    bn: 'আমরা শুধু কথা বলি না — আমরা আপনার দক্ষতার প্রমাণ চাই।',
    en: 'We do not just listen to claims — we verify what you can actually do.',
  },
  
  codingChallengeTitle: {
    bn: '১. দক্ষতার অ্যাসেসমেন্ট',
    en: '1. Skill Assessment',
  },
  codingChallengeDesc: {
    bn: 'আপনার পেশার জন্য তৈরি বাস্তবসম্মত অ্যাসেসমেন্ট সম্পন্ন করুন। টেকনিক্যাল, ডিজাইন, মার্কেটিং, অ্যাকাউন্টিং বা যেকোনো দক্ষতা — স্বয়ংক্রিয় মূল্যায়ন ও তাৎক্ষণিক স্কোর।',
    en: 'Complete realistic assessments tailored to your profession — technical, design, marketing, accounting or any other skill. Get automated evaluation with instant scoring.',
  },

  projectVerifyTitle: {
    bn: '২. প্রজেক্ট / কাজের যাচাই',
    en: '2. Project / Work Review',
  },
  projectVerifyDesc: {
    bn: 'আপনার বাস্তব কাজ সাবমিট করুন — গিটহাব লিংক, পোর্টফোলিও, ক্যাম্পেইন রিপোর্ট, কেস স্টাডি বা নমুনা কাজ। বিশেষজ্ঞ রিভিউয়াররা যাচাই করে আপনার দক্ষতার সত্যতা নিশ্চিত করেন।',
    en: 'Submit your actual work — a GitHub link, portfolio, campaign report, case study or sample. Expert reviewers verify the authenticity and quality of your real-world skills.',
  },

  
  demoTitle: {
    bn: 'দক্ষতা যাচাই প্রক্রিয়া',
    en: 'How Skill Verification Works',
  },
  demoSub: {
    bn: 'একটি সহজ উদাহরণ দিয়ে দেখুন — অ্যাসেসমেন্ট, মূল্যায়ন এবং প্রমাণ।',
    en: 'See a simple example of assessment, evaluation, and proof.',
  },

  
  passportHeader: {
    bn: 'আপনার দক্ষতার ডিজিটাল পরিচয় — Skill Passport',
    en: 'Your digital identity of skill — Skill Passport',
  },
  passportDesc: {
    bn: 'আপনার verified skills, achievements এবং professional identity এক জায়গায় তুলে ধরুন। QR কোড সহ ডিজিটাল স্কিল পাসপোর্ট — চাকরিদাতারা যেকোনো সময় যাচাই করতে পারেন।',
    en: 'Showcase your verified skills, achievements, and professional identity in one place. A QR-coded digital Skill Passport that employers can verify instantly.',
  },

  
  bdEcosystemTitle: {
    bn: 'বাংলাদেশের প্রতিটি দক্ষ মানুষের জন্য',
    en: 'For every skilled person in Bangladesh',
  },
  bdEcosystemSub: {
    bn: 'শিক্ষার্থী থেকে অভিজ্ঞ পেশাজীবী — আপনার দক্ষতা যেকোনো ক্ষেত্রের হোক, SkillProof আপনাকে তা যাচাই, উন্নয়ন ও প্রমাণ করতে সাহায্য করবে।',
    en: 'From students to experienced professionals — whatever your field, SkillProof helps you verify, improve, and prove your real skills.',
  },

  
  footerRights: { bn: 'সর্বস্বত্ব সংরক্ষিত। স্কিলপ্রুফ বাংলাদেশ।', en: 'All rights reserved. SkillProof Bangladesh.' },
  footerVerifyLabel: { bn: 'পাসপোর্ট ভেরিফাই করুন', en: 'Verify Passport' },
  footerPlatform: { bn: 'প্ল্যাটফর্ম', en: 'Platform' },
  footerStandards: { bn: 'ভেরিফিকেশন স্ট্যান্ডার্ড', en: 'Verification Standards' },
  footerTagline: {
    bn: 'বাংলাদেশের skill verification ও career development প্ল্যাটফর্ম',
    en: 'Bangladesh’s skill verification and career development platform',
  },
};



for (const key of Object.keys(landingDictionary)) {
  if (!dictionary[key]) {
    dictionary[key] = landingDictionary[key];
  }
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sp_lang');
    return (saved === 'en' || saved === 'bn') ? saved : 'bn'; 
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sp_lang', lang);
  };

  const t = (key: string): string => {
    if (dictionary[key]) {
      return dictionary[key][language] || dictionary[key].en;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
