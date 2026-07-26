import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

interface Translations {
  [key: string]: {
    bn: string;
    en: string;
  };
}

export const dictionary: Translations = {
  // Brand
  brandName: {
    bn: 'SKILLPROOF',
    en: 'SKILLPROOF',
  },
  tagline: {
    bn: 'আপনি সত্যি কী করতে পারেন তা প্রমাণ করুন।',
    en: 'Prove What You Can Actually Do.',
  },
  subTagline: {
    bn: 'কোনো ভুয়া কুইজ ব্যাজ বা স্ট্যাটিক পিডিএফ নয়। কোডফোর্সেস-স্টাইল প্রোগ্রামিং চ্যালেঞ্জ এবং অভিজ্ঞ ইঞ্জিনিয়ারদের প্রজেক্ট পর্যালোচনার মাধ্যমে আপনার দক্ষতা যাচাই করুন। অর্জন করুন একক ধারাবাহিক "স্কিল পাসপোর্ট"।',
    en: 'No fake quiz badges or static PDFs. Get verified through Codeforces-style programming challenges and senior human code review. Issue one continuous Skill Passport.',
  },

  // Nav
  navHome: { bn: 'হোম', en: 'Home' },
  navHowItWorks: { bn: 'কিভাবে কাজ করে', en: 'How It Works' },
  navSkillVerification: { bn: 'স্কিল ভেরিফিকেশন', en: 'Skill Verification' },
  navPassport: { bn: 'স্কিল পাসপোর্ট', en: 'Skill Passport' },
  navJobPortal: { bn: 'জব পোর্টাল', en: 'Job Portal' },
  navAbout: { bn: 'আমাদের সম্পর্কে', en: 'About Us' },
  navLogin: { bn: 'লগইন', en: 'Login' },
  navRegister: { bn: 'সাইন আপ', en: 'Sign Up' },
  navDashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  navAdminPanel: { bn: 'এডমিন প্যানেল', en: 'Admin Panel' },
  navLogout: { bn: 'লগআউট', en: 'Logout' },

  // Hero Actions
  btnStartVerify: { bn: 'দক্ষতা যাচাই শুরু করুন', en: 'Verify Skills Now' },
  btnSamplePassport: { bn: 'স্যাম্পল পাসপোর্ট দেখুন', en: 'View Sample Passport' },

  // Stats
  statDevelopers: { bn: '৫,০০০+ ভেরিফাইড ডেভেলপার', en: '5,000+ Verified Developers' },
  statChallenges: { bn: '১,২০০+ সক্রিয় কোডিং প্রশ্ন', en: '1,200+ Coding Challenges' },
  statProjects: { bn: '৪৫০+ প্রজেক্ট ভেরিফিকেশন', en: '450+ Manual Project Reviews' },
  statPartners: { bn: '২৫০+ শীর্ষ আইটি পার্টনার', en: '250+ Tech Hiring Partners' },

  // Pillars
  pillarTitle: { bn: 'কঠোর ভেরিফিকেশন আর্কিটেকচার', en: 'Strict Verification Architecture' },
  pillarSubtitle: { bn: 'আমরা কৃত্রিম কুইজ বাদ দিয়েছি। স্কিলপ্রুফ ২টি শক্তিশালী স্তম্ভের ওপর নির্ভরশীল।', en: 'We eliminated AI quizzes. SkillProof relies exclusively on two robust verification pillars.' },
  
  codingChallengeTitle: { bn: '১. কোডিং চ্যালেঞ্জ', en: '1. Coding Challenge' },
  codingChallengeDesc: {
    bn: 'কোডফোর্সেস ও কোডমামা স্টাইলের অ্যালগোরিদমিক প্রবলেম সলভিং। আপনার কোড হিডেন টেস্ট কেসের বিপরীতে স্বয়ংক্রিয়ভাবে রান করে এক্যুরেসি, রানটাইম ও মেমোরি পারফরম্যান্স নির্ধারণ করে।',
    en: 'Codeforces/CodeMama-style algorithmic problem solving. Code runs against automated test cases measuring accuracy, execution speed, and memory usage.',
  },

  projectVerifyTitle: { bn: '২. প্রজেক্ট ভেরিফিকেশন', en: '2. Project Verification' },
  projectVerifyDesc: {
    bn: 'বাস্তবধর্মী ফুলস্ট্যাক প্রজেক্ট সম্পূর্ণ করুন। আপনার গিটহাব রিপোজিটরি বা জিপ ফাইল সাবমিট করুন যা সিনিয়র সফটওয়্যার ইঞ্জিনিয়ারদের দ্বারা ম্যানুয়ালি রিভিউ ও সার্টিফাই করা হয়।',
    en: 'Complete realistic full-stack projects. Submit GitHub repository or ZIP archive for manual architectural review by senior software engineers.',
  },

  // Live Demo Section
  demoTitle: { bn: 'লাইভ আইডিই ও সাবমিশন ডেমো', en: 'Live IDE & Verdict Engine' },
  demoSub: { bn: 'সহজ ইন্টারফেস ও তাৎক্ষণিক ফিডব্যাক টেস্ট কেস সাপোর্ট।', en: 'Seamless browser execution with real-time testcase verdicts.' },

  // Passport Section
  passportHeader: { bn: 'বাংলাদেশি টেক ট্যালেন্টদের স্কিল পাসপোর্ট', en: 'Skill Passport for BD Tech Talent' },
  passportDesc: { bn: 'একটিমাত্র ডিজিটাল ভেরিফাইড কিউআর পাসপোর্ট যা সকল প্রযুক্তিগত দক্ষতা, স্কোর এবং সাবমিশন হিস্ট্রি ধারণ করে।', en: 'One digital verified QR passport carrying all proven skills, test scores, and code history.' },

  // Bangladesh Tech Ecosystem
  bdEcosystemTitle: { bn: 'বাংলাদেশের শীর্ষ টেক হাবের জন্য তৈরি', en: 'Built for Bangladesh Tech Ecosystem' },
  bdEcosystemSub: { bn: 'ঢাকা, চট্টগ্রাম, সিলেট এবং সারা দেশের ডেভলপারদের বিশ্বমানের ক্যারিয়ার গড়ে তোলার মাধ্যম।', en: 'Empowering developers from Dhaka, Chittagong, Sylhet & across Bangladesh to reach global standards.' },

  // Footer
  footerRights: { bn: 'সর্বস্বত্ব সংরক্ষিত। স্কিলপ্রুফ বাংলাদেশ।', en: 'All rights reserved. SkillProof Bangladesh.' },
  footerTagline: { bn: 'সত্যিকারের দক্ষতায় বিশ্বাসী প্ল্যাটফর্ম', en: 'Empowering BD Engineers through Proven Skills' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sp_lang');
    return (saved === 'en' || saved === 'bn') ? saved : 'bn'; // Default to Bangla!
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
