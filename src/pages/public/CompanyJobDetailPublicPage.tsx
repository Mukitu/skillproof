import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  GraduationCap,
  Lock,
  Loader2,
  LogIn,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  COMPANY_JOB_EMPLOYMENT_LABELS,
  COMPANY_JOB_SALARY_MODE_LABELS,
  COMPANY_JOB_SKILL_LEVEL_LABELS,
  COMPANY_JOB_WORK_LABELS,
  formatSalaryLabel,
  getPublishedCompanyJob,
  type CompanyJob,
  type CompanyJobSkillLevel,
} from '../../services/companyJobs';
import { getMatchForJob } from '../../services/jobMatch';
import { supabase } from '../../lib/supabase';
import type { JobMatchResult } from '../../types/database';

interface SkillSummary {
  skill_id: string;
  name: string;
  level: CompanyJobSkillLevel;
  priority: 'required' | 'preferred';
}

interface DetailResult {
  job: CompanyJob;
  skills: SkillSummary[];
  company: {
    id: string;
    company_name: string;
    logo_url: string | null;
    category: string;
    address: string;
    mobile_verified: boolean;
  };
}

export const CompanyJobDetailPublicPage: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id')?.trim() ?? '';

  const [detail, setDetail] = useState<DetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Match score — only meaningful for logged-in users. Anonymous visitors
  // see a "Login to see your match score" CTA instead.
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [match, setMatch] = useState<JobMatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (!jobId) {
      setError(language === 'bn' ? 'অবৈধ জব আইডি' : 'Invalid job id');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await getPublishedCompanyJob(jobId);
        if (!mounted) return;
        if (!res) {
          setError(language === 'bn' ? 'জব পাওয়া যায়নি' : 'Job not found');
        } else {
          setDetail(res as unknown as DetailResult);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [jobId, language]);

  // Detect auth + fetch match score for this job. We re-check on every job
  // change so logging in inside the same tab refreshes the card.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        const authed = !!user;
        setIsAuthed(authed);
        if (!authed || !jobId) {
          setMatch(null);
          return;
        }
        setMatchLoading(true);
        try {
          const m = await getMatchForJob(jobId);
          if (mounted) setMatch(m);
        } catch {
          if (mounted) setMatch(null);
        } finally {
          if (mounted) setMatchLoading(false);
        }
      } catch {
        if (mounted) {
          setIsAuthed(false);
          setMatch(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
          <Link
            to="/company-jobs"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{language === 'bn' ? 'জব লিস্টে ফিরে যান' : 'Back to jobs list'}</span>
          </Link>
        </div>
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error ?? (language === 'bn' ? 'জব পাওয়া যায়নি' : 'Job not found')}</span>
        </div>
      </div>
    );
  }

  const { job, skills, company } = detail;
  const empLabel = COMPANY_JOB_EMPLOYMENT_LABELS[job.employment_type];
  const workLabel = COMPANY_JOB_WORK_LABELS[job.work_type];
  const salaryModeLabel = COMPANY_JOB_SALARY_MODE_LABELS[job.salary_mode];
  const formatDate = (s: string | null): string => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/company-jobs"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
            </Link>
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 truncate">{job.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {company.company_name}
                </span>
                {company.mobile_verified && (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="w-3 h-3" />
                    {language === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                  </span>
                )}
                <span>· {formatDate(job.published_at ?? job.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title={language === 'bn' ? 'বিবরণ' : 'Description'}>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </Section>
          <Section title={language === 'bn' ? 'দায়িত্ব' : 'Responsibilities'}>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
          </Section>
          <Section title={language === 'bn' ? 'যোগ্যতা' : 'Requirements'}>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
          </Section>
          {job.benefits && (
            <Section title={language === 'bn' ? 'সুবিধা' : 'Benefits'}>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.benefits}</p>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title={language === 'bn' ? 'জবের সারসংক্ষেপ' : 'Job Summary'}>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    {language === 'bn' ? 'চাকরির ধরন' : 'Employment'}
                  </span>
                  <span className="font-semibold">{language === 'bn' ? empLabel.bn : empLabel.en}</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    {language === 'bn' ? 'কর্মস্থল' : 'Work type'}
                  </span>
                  <span className="font-semibold">{language === 'bn' ? workLabel.bn : workLabel.en}</span>
                  {job.location && (
                    <span className="block text-[11px] text-slate-500">· {job.location}</span>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Wallet className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    {language === 'bn' ? 'বেতন' : 'Salary'}
                  </span>
                  <span className="font-semibold">{formatSalaryLabel(job)}</span>
                  <span className="block text-[11px] text-slate-500">
                    {language === 'bn' ? salaryModeLabel.bn : salaryModeLabel.en}
                  </span>
                </span>
              </li>
              {job.experience_label && (
                <li className="flex items-start gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      {language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}
                    </span>
                    <span className="font-semibold">{job.experience_label}</span>
                  </span>
                </li>
              )}
              {job.education_label && (
                <li className="flex items-start gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      {language === 'bn' ? 'শিক্ষা' : 'Education'}
                    </span>
                    <span className="font-semibold">{job.education_label}</span>
                  </span>
                </li>
              )}
              {job.deadline && (
                <li className="flex items-start gap-2">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      {language === 'bn' ? 'আবেদনের শেষ তারিখ' : 'Deadline'}
                    </span>
                    <span className="font-semibold">{formatDate(job.deadline)}</span>
                  </span>
                </li>
              )}
              {job.vacancies != null && (
                <li className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      {language === 'bn' ? 'শূন্যপদ' : 'Vacancies'}
                    </span>
                    <span className="font-semibold">
                      {job.vacancies} {language === 'bn' ? 'টি' : job.vacancies === 1 ? 'opening' : 'openings'}
                    </span>
                  </span>
                </li>
              )}
            </ul>
          </Section>

          {skills.length > 0 && (
            <Section title={language === 'bn' ? 'দক্ষতা' : 'Required Skills'} icon={Sparkles}>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s.skill_id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
                      s.priority === 'required'
                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                        : 'bg-sky-50 border-sky-100 text-sky-700'
                    }`}
                    title={language === 'bn' ? COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].bn : COMPANY_JOB_SKILL_LEVEL_LABELS[s.level].en}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <PublicMatchScoreCard
            language={language}
            isAuthed={isAuthed}
            match={match}
            matchLoading={matchLoading}
            jobId={jobId}
          />

          <Section title={language === 'bn' ? 'কোম্পানি' : 'Company'}>
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black">
                  {company.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate flex items-center gap-1">
                  {company.company_name}
                  {company.mobile_verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{company.category}</div>
                {company.address && (
                  <div className="text-[11px] text-slate-500 truncate">· {company.address}</div>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
    <h2 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[#E31B23]" />}
      {title}
    </h2>
    {children}
  </div>
);

interface PublicMatchScoreCardProps {
  language: 'en' | 'bn';
  isAuthed: boolean;
  match: JobMatchResult | null;
  matchLoading: boolean;
  jobId: string;
}

type MatchTone = 'emerald' | 'amber' | 'rose';

function matchTone(score: number): { tone: MatchTone; label_en: string; label_bn: string } {
  if (score >= 90) return { tone: 'emerald', label_en: 'Excellent Match', label_bn: 'চমৎকার ম্যাচ' };
  if (score >= 80) return { tone: 'emerald', label_en: 'Strong Match',     label_bn: 'শক্তিশালী ম্যাচ' };
  if (score >= 70) return { tone: 'amber',   label_en: 'Good Match',       label_bn: 'ভালো ম্যাচ' };
  if (score >= 60) return { tone: 'amber',   label_en: 'Potential Match',  label_bn: 'সম্ভাব্য ম্যাচ' };
  return                  { tone: 'rose',    label_en: 'Low Match',        label_bn: 'কম ম্যাচ' };
}

function toneClasses(tone: 'emerald' | 'amber' | 'rose', kind: 'border' | 'bg' | 'text' | 'pill') {
  const map = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50',  text: 'text-emerald-700', pill: 'bg-emerald-600'  },
    amber:   { border: 'border-amber-200',   bg: 'bg-amber-50',    text: 'text-amber-700',   pill: 'bg-amber-500'    },
    rose:    { border: 'border-rose-200',    bg: 'bg-rose-50',     text: 'text-rose-700',    pill: 'bg-rose-500'     },
  } as const;
  return map[tone][kind];
}

const PublicMatchScoreCard: React.FC<PublicMatchScoreCardProps> = ({
  language, isAuthed, match, matchLoading, jobId,
}) => {
  // Anonymous visitor — encourage signup with a one-click deep link.
  if (!isAuthed) {
    const next = `/company-jobs/detail?id=${encodeURIComponent(jobId)}`;
    return (
      <div className="bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFF1F2] border border-amber-100 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'স্কিলপ্রুফ AI ম্যাচ স্কোর' : 'SkillProof AI Match Score'}
        </h2>
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-white border border-amber-100">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] text-slate-700 leading-relaxed">
            <p className="font-bold mb-1 text-slate-900">
              {language === 'bn' ? 'আপনার পার্সোনালাইজড ম্যাচ স্কোর দেখতে লগইন করুন' : 'Login to see your personalized match score'}
            </p>
            <p>
              {language === 'bn'
                ? 'আপনার স্কিল, অভিজ্ঞতা এবং ক্যারিয়ার গোলের সাথে এই জবের রিয়েল-টাইম তুলনা।'
                : 'A real-time comparison of this job against your verified skills, experience, and career goals.'}
            </p>
            <Link
              to={`/login?next=${encodeURIComponent(next)}`}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-[11px] font-bold shadow-sm hover:opacity-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লগইন করুন' : 'Login'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authed — show loading / score / fallback states.
  return (
    <div className="bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFF1F2] border border-amber-100 rounded-3xl shadow-brand-sm p-5 sm:p-6">
      <h2 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#E31B23]" />
        {language === 'bn' ? 'স্কিলপ্রুফ AI ম্যাচ স্কোর' : 'SkillProof AI Match Score'}
      </h2>

      {matchLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{language === 'bn' ? 'হিসাব করা হচ্ছে…' : 'Calculating your match…'}</span>
        </div>
      )}

      {!matchLoading && !match && (
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-white border border-slate-200">
          <Sparkles className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {language === 'bn'
              ? 'প্রোফাইল ডেটা এখনো পাওয়া যায়নি। আপনার স্কিল ও অভিজ্ঞতা যোগ করলে ম্যাচ স্কোর এখানে দেখা যাবে।'
              : 'No profile data yet. Add your skills and experience to see a personalised match score here.'}
          </p>
        </div>
      )}

      {!matchLoading && match && <MatchBreakdown language={language} match={match} />}
    </div>
  );
};

const MatchBreakdown: React.FC<{ language: 'en' | 'bn'; match: JobMatchResult }> = ({ language, match }) => {
  const tone = matchTone(match.overall_match);
  const matchingSkills: string[] = Array.isArray((match as any).matching_skills_json)
    ? (match as any).matching_skills_json
    : [];
  const missingSkills: string[] = Array.isArray(match.missing_skills_required) && match.missing_skills_required.length > 0
    ? match.missing_skills_required
    : Array.isArray(match.missing_skills_json) ? match.missing_skills_json : [];

  const bars: Array<{ key: string; label_en: string; label_bn: string; value: number }> = [
    { key: 'skill',      label_en: 'Skill Match',       label_bn: 'স্কিল ম্যাচ',          value: match.skill_match ?? 0 },
    { key: 'experience', label_en: 'Experience Match',  label_bn: 'অভিজ্ঞতা ম্যাচ',       value: match.experience_match ?? 0 },
    { key: 'education',  label_en: 'Education Match',   label_bn: 'শিক্ষা ম্যাচ',         value: match.education_match ?? 0 },
    { key: 'goal',       label_en: 'Career Goal Match', label_bn: 'ক্যারিয়ার গোল ম্যাচ',  value: match.career_goal_match ?? 0 },
  ];

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between gap-3 p-3 rounded-2xl border ${toneClasses(tone.tone, 'border')} ${toneClasses(tone.tone, 'bg')}`}>
        <div className="min-w-0">
          <p className={`text-[10px] uppercase tracking-wider font-extrabold ${toneClasses(tone.tone, 'text')}`}>
            {language === 'bn' ? tone.label_bn : tone.label_en}
          </p>
          <p className="text-[11px] text-slate-500">
            {language === 'bn' ? 'আপনার প্রোফাইলের ভিত্তিতে' : 'Based on your SkillProof profile'}
          </p>
        </div>
        <div className={`shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-full text-white font-black text-base shadow-sm ${toneClasses(tone.tone, 'pill')}`}>
          {Math.round(match.overall_match)}%
        </div>
      </div>

      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.key}>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
              <span className="font-semibold">{language === 'bn' ? b.label_bn : b.label_en}</span>
              <span className="font-extrabold text-slate-900">{Math.round(b.value)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E31B23] to-[#F97316]"
                style={{ width: `${Math.max(0, Math.min(100, b.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {matchingSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
            {language === 'bn' ? 'মিলে যাওয়া স্কিল' : 'Matching Skills'}
          </p>
          <div className="flex flex-wrap gap-1">
            {matchingSkills.map((s) => (
              <span key={s} className="inline-flex items-center px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
            {language === 'bn' ? 'যে স্কিলগুলো নেই' : 'Skill Gaps'}
          </p>
          <div className="flex flex-wrap gap-1">
            {missingSkills.map((s) => (
              <span key={s} className="inline-flex items-center px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {match.why_match && (
        <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
          {match.why_match}
        </p>
      )}
    </div>
  );
};

export default CompanyJobDetailPublicPage;
