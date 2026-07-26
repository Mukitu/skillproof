import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, Github, Linkedin, MapPin, Award } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const [passportQuery, setPassportQuery] = useState('');
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const handleVerifySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (passportQuery.trim()) {
      navigate(`/passport/${passportQuery.trim()}`);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 relative overflow-hidden">
      {/* Top Robi Brand Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ED1C24] via-[#F58220] to-[#FFB000] flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-black text-white tracking-wide">
                SKILL<span className="text-[#ED1C24]">PROOF</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'বাংলাদেশের ১ নম্বর স্কিল ভেরিফিকেশন ও ক্যারিয়ার ডেভেলপমেন্ট প্ল্যাটফর্ম। কোডিং প্রবলেম সলভিং ও প্রজেক্ট রিভিউয়ের মাধ্যমে নিজের আসল দক্ষতা প্রমাণ করুন।'
                : "Bangladesh's premier Skill Verification and Career Development Platform. Prove your actual coding abilities and project execution without resume fluff."}
            </p>
            <div className="text-xs text-[#F58220] font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {language === 'bn' ? 'ঢাকা, বাংলাদেশ' : 'Dhaka, Bangladesh'}
            </div>
          </div>

          {/* Verification Quick Lookup */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#ED1C24]" />
              {language === 'bn' ? 'পাসপোর্ট ভেরিফাই করুন' : 'Verify Passport'}
            </h4>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'আইডি নম্বর (যেমন SP-BD-829104) লিখে যেকোনো পাসপোর্ট সাথে সাথে ভেরিফাই করুন:'
                : 'Enter a Skill Passport ID (e.g. SP-BD-829104) to verify candidate credentials instantly:'}
            </p>
            <form onSubmit={handleVerifySearch} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="SP-BD-829104"
                value={passportQuery}
                onChange={(e) => setPassportQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ED1C24]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-gradient-to-r from-[#ED1C24] to-[#F58220] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-red-500/20"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'bn' ? 'প্ল্যাটফর্ম' : 'Platform'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/how-it-works" className="hover:text-[#ED1C24] transition-colors">
                  {t('navHowItWorks')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard/jobs" className="hover:text-[#ED1C24] transition-colors">
                  {t('navJobPortal')}
                </Link>
              </li>
              <li>
                <Link to="/passport/SP-BD-829104" className="hover:text-[#ED1C24] transition-colors">
                  {t('navPassport')}
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-[#ED1C24] transition-colors">
                  {language === 'bn' ? 'এমপ্লয়ার ভেরিফিকেশন' : 'Employer Verification'}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#ED1C24] transition-colors">
                  {t('navAbout')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'bn' ? 'ভেরিফিকেশন স্ট্যান্ডার্ড' : 'Verification Standards'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'শুধুমাত্র স্বয়ংক্রিয় হিডেন টেস্ট কেস রানটাইম এবং সিনিয়র সফটওয়্যার ইঞ্জিনিয়ার ম্যানুয়াল কোড রিভিউ দ্বারা ভেরিফাইড।'
                : 'Verified purely through test case execution and manual human code review.'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="text-slate-400 hover:text-[#ED1C24] transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#ED1C24] transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {t('footerRights')}</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">{language === 'bn' ? 'প্রাইভেসি পলিসি' : 'Privacy Policy'}</span>
            <span className="hover:text-slate-300 cursor-pointer">{language === 'bn' ? 'শর্তাবলী' : 'Terms of Service'}</span>
            <span className="hover:text-slate-300 cursor-pointer">{language === 'bn' ? 'সিকিউরিটি' : 'Security'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
