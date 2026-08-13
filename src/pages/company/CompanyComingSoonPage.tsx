import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  ScrollText,
  Bookmark,
  CalendarClock,
  MessageSquare,
  ArrowLeft,
  Construction,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

type VariantKey = 'jobs' | 'candidates' | 'applications' | 'shortlisted' | 'interviews' | 'messages';

interface Variant {
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  icon: React.ComponentType<{ className?: string }>;
}

const VARIANTS: Record<VariantKey, Variant> = {
  jobs: {
    titleEn: 'Job Posting',
    titleBn: 'জব পোস্টিং',
    descEn: 'Create and manage job postings for your company. Verified candidates will be able to apply once this module ships.',
    descBn: 'আপনার কোম্পানির জন্য জব পোস্ট তৈরি ও পরিচালনা করুন। এই মডিউল চালু হলে যাচাইকৃত প্রার্থীরা আবেদন করতে পারবেন।',
    icon: Briefcase,
  },
  candidates: {
    titleEn: 'Candidate Search',
    titleBn: 'ক্যান্ডিডেট অনুসন্ধান',
    descEn: 'Search and connect with verified SkillProof professionals. Available in an upcoming release.',
    descBn: 'SkillProof-এর যাচাইকৃত পেশাদার প্রার্থীদের খুঁজুন এবং যোগাযোগ করুন। শীঘ্রই উপলব্ধ হবে।',
    icon: Users,
  },
  applications: {
    titleEn: 'Applications',
    titleBn: 'আবেদনসমূহ',
    descEn: 'Review and manage applications received for your posted jobs. Lands in the next module.',
    descBn: 'আপনার পোস্ট করা চাকরিতে প্রাপ্ত আবেদনগুলি দেখুন ও পরিচালনা করুন। পরবর্তী মডিউলে আসছে।',
    icon: ScrollText,
  },
  shortlisted: {
    titleEn: 'Shortlisted Candidates',
    titleBn: 'শর্টলিস্টেড প্রার্থী',
    descEn: 'Track your shortlist and pipeline progress. Coming with the hiring module.',
    descBn: 'শর্টলিস্ট ও পাইপলাইন অগ্রগতি ট্র্যাক করুন। হায়ারিং মডিউলের সাথে আসছে।',
    icon: Bookmark,
  },
  interviews: {
    titleEn: 'Interviews',
    titleBn: 'ইন্টারভিউ',
    descEn: 'Schedule and run interviews with candidates. Calendar, video, and notifications coming soon.',
    descBn: 'প্রার্থীদের সাথে ইন্টারভিউ সময়সূচী ও পরিচালনা করুন। ক্যালেন্ডার, ভিডিও ও নোটিফিকেশন শীঘ্রই আসছে।',
    icon: CalendarClock,
  },
  messages: {
    titleEn: 'Messages',
    titleBn: 'মেসেজ',
    descEn: 'Direct messaging with candidates and your hiring team. Arriving with the communications module.',
    descBn: 'প্রার্থী ও আপনার হায়ারিং টিমের সাথে সরাসরি মেসেজ। কমিউনিকেশন মডিউলে আসছে।',
    icon: MessageSquare,
  },
};

export const CompanyComingSoonPage: React.FC<{ variant: VariantKey }> = ({ variant }) => {
  const { language } = useLanguage();
  const v = VARIANTS[variant];
  const Icon = v.icon;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900">
              {language === 'bn' ? v.titleBn : v.titleEn}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn' ? v.descBn : v.descEn}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-8 sm:p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900">
          {language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming soon'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
          {language === 'bn'
            ? 'এই ফিচারটি পরবর্তী প্রম্পটে তৈরি হবে। আপনার কোম্পানি ড্যাশবোর্ডের বাকি অংশ এখনই ব্যবহার করতে পারেন।'
            : 'This feature ships in the next prompt. You can use the rest of your company dashboard today.'}
        </p>
        <div className="mt-6">
          <Link
            to="/company/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {language === 'bn' ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to dashboard'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompanyComingSoonPage;