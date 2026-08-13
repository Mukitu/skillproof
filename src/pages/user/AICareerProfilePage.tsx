
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Award, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Folder, GraduationCap, RefreshCw, Save, Sparkles,
  Trash2, User, Wand2, Wrench, X, Plus, Eye, Pencil, Globe, Github, Linkedin,
  MapPin, Phone, Mail, Loader2, ExternalLink, Languages as LangIcon,
  Building2, Hash,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRealtimeRefresh } from '../../services/realtime';
import { supabase } from '../../lib/supabase';
import { AppErrorBoundary } from '../../components/error/AppErrorBoundary';
import { ProfilePictureUpload } from '../../components/profile/ProfilePictureUpload';
import {
  loadEducations,
  loadExperiences,
  loadSkills,
  saveEducations,
  saveExperiences,
  saveSkills,
  isValidUrl,
  normaliseUrl,
} from '../../services/profileReview';
import type {
  ManualEducationsRow,
  ManualExperiencesRow,
  ManualSkillRow,
} from '../../services/profileReview';
import {
  listActiveJobsWithMatches,
  runJobMatching,
  getJobMatchDashboard,
  MATCH_LABEL_META,
} from '../../services/jobMatch';
import type { JobMatchRow, JobMatchResult, JobMatchDashboard } from '../../types/database';
import type { Profile } from '../../types/database';



type TabKey = 'profile' | 'jobs';
type SectionKey =
  | 'personal' | 'career' | 'education' | 'experience' | 'skills'
  | 'languages' | 'certifications' | 'links' | 'security';

const BANGLADESH_DIVISIONS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh',
];

const POPULAR_PROFESSIONS = [
  'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Mobile App Developer', 'AI & Machine Learning Engineer', 'Data Scientist',
  'UI/UX Designer', 'Graphic Designer', 'Video Editor & Motion Designer',
  'Digital Marketing Specialist', 'SEO Specialist', 'Content Writer & Copywriter',
  'Sales & Business Development', 'Customer Support Specialist',
  'Accountant & Finance Specialist', 'Banker', 'Teacher & Lecturer', 'IELTS Candidate',
  'BCS Candidate', 'Government Job Aspirant', 'Private Job Aspirant', 'Nurse',
  'Doctor & Physician', 'Pharmacist', 'Electrician', 'Civil Engineer',
  'Mechanical Engineer', 'Architect', 'Textile Engineer', 'Fashion Designer',
  'Human Resources (HR) Executive', 'Business Analyst', 'Supply Chain Manager',
  'Restaurant & Hotel Manager', 'Freelancer', 'Entrepreneur',
];


const AUTOSAVE_DEBOUNCE_MS = 1200;



const safeStr = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const safeNum = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const safeArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const nullIfEmpty = (v: string): string | null => (v && v.trim().length > 0 ? v.trim() : null);


function rowsHaveSameIds<T extends { id?: string }>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]?.id ?? '';
    const bi = b[i]?.id ?? '';
    if (ai !== bi) return false;
  }
  return true;
}


function sortByYearDesc<T extends Record<string, any>>(rows: T[], getYear: (r: T) => string | null | undefined): T[] {
  const indexed = rows.map((r, i) => ({ r, i, key: parseYearKey(getYear(r)) }));
  indexed.sort((a, b) => {
    if (a.key === b.key) return a.i - b.i;
    return b.key - a.key; 
  });
  return indexed.map((x) => x.r);
}

function parseYearKey(v: string | null | undefined): number {
  if (!v) return -Infinity;
  
  const match = String(v).match(/(\d{4})/g);
  if (!match || match.length === 0) return -Infinity;
  const last = match[match.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) ? n : -Infinity;
}


function sortByDurationDesc<T extends Record<string, any>>(rows: T[]): T[] {
  return sortByYearDesc<T>(rows, (r) => r.duration);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
}



const AICareerProfilePageInner: React.FC = () => {
  const { user, updateProfile: authUpdateProfile, updatePassword, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const authId = user?.user_id ?? null;

  const t = useCallback(
    (en: string, bn: string) => (language === 'bn' ? bn : en),
    [language],
  );

  
  
  
  const initialTab = ((): TabKey => {
    if (typeof window === 'undefined') return 'profile';
    const raw = new URLSearchParams(window.location.search).get('tab');
    return raw === 'jobs' ? raw : 'profile';
  })();
  const [activeTab, setActiveTabRaw] = useState<TabKey>(initialTab);
  const setActiveTab = useCallback((next: TabKey): void => {
    setActiveTabRaw(next);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (next === 'profile') url.searchParams.delete('tab');
        else url.searchParams.set('tab', next);
        window.history.replaceState({}, '', url.toString());
      } catch {  }
    }
  }, []);

  
  const [profile, setProfile] = useState<Profile | null>(user ?? null);
  const [educations, setEducations] = useState<ManualEducationsRow[]>([]);
  const [experiences, setExperiences] = useState<ManualExperiencesRow[]>([]);
  const [skills, setSkills] = useState<ManualSkillRow[]>([]);

  // Live Profile Completeness — same 10 buckets as the SQL fn_public_candidate_verification
  // so the dashboard score always matches the public Passport score. Each bucket = 10 pts.
  const profileCompleteness = useMemo(() => {
    const has = (v: any) => typeof v === 'string' && v.trim().length > 0;
    const buckets: Array<{ key: string; label: string; done: boolean }> = [
      { key: 'identity',  label: t('Name & avatar',         'নাম ও ছবি'),          done: has(profile?.full_name) && !!profile?.avatar_url },
      { key: 'bio',       label: t('Professional bio',      'পেশাদার বায়ো'),       done: has(profile?.bio) },
      { key: 'position',  label: t('Current position',     'বর্তমান পদবি'),        done: has(profile?.current_position) || has(profile?.profession) },
      { key: 'contact',   label: t('Phone & location',     'ফোন ও ঠিকানা'),       done: has(profile?.phone) && (has(profile?.division) || has(profile?.district) || has(profile?.address)) },
      { key: 'education', label: t('Education (1+)',         'শিক্ষা (১+)'),          done: educations.length >= 1 },
      { key: 'experience',label: t('Experience (1+)',        'অভিজ্ঞতা (১+)'),       done: experiences.length >= 1 },
      { key: 'skills',    label: t('Skills (3+)',            'স্কিল (৩+)'),          done: skills.length >= 3 },
      { key: 'portfolio', label: t('Portfolio / social',     'পোর্টফোলিও / সোশ্যাল'), done: has(profile?.github_url) || has(profile?.linkedin_url) || has(profile?.portfolio_url) || has(profile?.website_url) },
      { key: 'location',  label: t('Country / division',     'দেশ / বিভাগ'),        done: has(profile?.division) || has(profile?.district) || has((profile as any)?.country) },
      { key: 'languages', label: t('Languages (1+)',         'ভাষা (১+)'),          done: Array.isArray((profile as any)?.languages) && ((profile as any).languages.length >= 1) },
    ];
    const doneCount = buckets.filter(b => b.done).length;
    const score = doneCount * 10;
    const level = score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'Building';
    return { buckets, score, level, doneCount };
  }, [profile, educations, experiences, skills, t]);

  
  const [bootDone, setBootDone] = useState(false);
  const [bootError, setBootError] = useState<string>('');

  
  const [sectionSaving, setSectionSaving] = useState<SectionKey | null>(null);
  const [sectionSavedAt, setSectionSavedAt] = useState<Partial<Record<SectionKey, number>>>({});
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<SectionKey, string>>>({});

  
  const [jobMatches, setJobMatches] = useState<JobMatchRow[] | null>(null);
  const [jobDashboard, setJobDashboard] = useState<JobMatchDashboard | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string>('');
  const [jobRunPending, setJobRunPending] = useState(false);

  
  const loadAll = useCallback(async (): Promise<void> => {
    if (!authId) {
      setBootDone(true);
      return;
    }
    try {
      const [profileRow, eduRows, expRows, skillRows] = await Promise.all([
        user ? Promise.resolve(user) : getProfileFallback(),
        loadEducations().catch(() => []),
        loadExperiences().catch(() => []),
        loadSkills().catch(() => []),
      ]);
      if (profileRow) setProfile(profileRow as Profile);
      setEducations(eduRows);
      setExperiences(expRows);
      setSkills(skillRows);
    } catch (e: any) {
      
      console.warn('[AICareerProfilePage] boot load failed', e);
      setBootError(e?.message || 'Failed to load your profile.');
    } finally {
      setBootDone(true);
    }
  }, [authId, user]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  
  
  
  
  
  
  
  
  useRealtimeRefresh(['profiles'], () => {
    if (!authId) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authId)
          .maybeSingle();
        if (data) setProfile(data as Profile);
      } catch {  }
    })();
  });
  useRealtimeRefresh(['educations', 'experiences', 'user_skills'], () => {
    
    
    
    
    if (sectionSaving) return;
    
    setTimeout(() => {
      if (sectionSaving) return;
      void loadAll();
    }, 250);
  });

  
  
  const saveSection = useCallback(async (
    section: SectionKey,
    patch: {
      profile?: Partial<Profile>;
      educations?: ManualEducationsRow[];
      experiences?: ManualExperiencesRow[];
      skills?: ManualSkillRow[];
    },
  ): Promise<void> => {
    if (sectionSaving) {
      
      
      
      return;
    }
    setSectionSaving(section);
    setSectionErrors((prev) => ({ ...prev, [section]: '' }));
    try {
      if (patch.profile) {
        // authUpdateProfile returns Promise<void>; refresh profile state
        // from the underlying service so the UI reflects the saved row.
        await authUpdateProfile(patch.profile);
        try {
          const refreshed = await getProfileFallback();
          if (refreshed) setProfile(refreshed);
        } catch {}
      }
      if (patch.educations) {
        const fresh = await saveEducations(patch.educations);
        setEducations(fresh);
      }
      if (patch.experiences) {
        const fresh = await saveExperiences(patch.experiences);
        setExperiences(fresh);
      }
      if (patch.skills) {
        const fresh = await saveSkills(patch.skills);
        setSkills(fresh);
      }
      setSectionSavedAt((prev) => ({ ...prev, [section]: Date.now() }));
    } catch (e: any) {
      setSectionErrors((prev) => ({ ...prev, [section]: e?.message || 'Save failed.' }));
    } finally {
      setSectionSaving(null);
    }
  }, [authUpdateProfile, profile, educations, experiences, skills, sectionSaving]);

  
  const loadJobMatches = useCallback(async (): Promise<void> => {
    if (!authId) return;
    setJobLoading(true);
    setJobError('');
    try {
      const rows = await listActiveJobsWithMatches();
      setJobMatches(rows);
      const dash = await getJobMatchDashboard(rows);
      setJobDashboard(dash);
    } catch (e: any) {
      setJobError(e?.message || 'Job matches could not be loaded.');
    } finally {
      setJobLoading(false);
    }
  }, [authId]);

  useEffect(() => {
    if (activeTab === 'jobs' && authId) void loadJobMatches();
  }, [activeTab, authId, loadJobMatches]);

  useRealtimeRefresh(['job_match_results'], () => {
    if (activeTab === 'jobs') void loadJobMatches();
  });

  const runMatchNow = useCallback(async (): Promise<void> => {
    if (!authId) return;
    setJobRunPending(true);
    setJobError('');
    try {
      await runJobMatching();
      await loadJobMatches();
    } catch (e: any) {
      setJobError(e?.message || 'AI matching failed.');
    } finally {
      setJobRunPending(false);
    }
  }, [authId, loadJobMatches]);

  
  if (!bootDone) return <CenterSpinner label={t('Loading your profile…', 'আপনার প্রোফাইল লোড হচ্ছে…')} />;

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 sm:p-7 text-white shadow-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)' }}
        />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-[#E31B23]/15 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 flex items-start gap-4">
            {}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20 transition hover:ring-[#F97316] sm:block"
              aria-label={t('Edit profile picture', 'প্রোফাইল ছবি এডিট করুন')}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-lg font-black text-white">
                  {(profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
                <span>{t('SkillProof AI Profile', 'SkillProof AI প্রোফাইল')}</span>
              </div>
              <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl break-words">
                <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                  {t('Your career profile', 'আপনার ক্যারিয়ার প্রোফাইল')}
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 break-words">
                {t(
                  'Complete your profile manually. Your Education, Experience, Skills, Languages, Certifications, and Portfolio links all sync to your public Skill Passport. No CV needed.',
                  'প্রোফাইল ম্যানুয়ালি পূরণ করুন। আপনার শিক্ষা, অভিজ্ঞতা, স্কিল, ভাষা, সার্টিফিকেশন ও পোর্টফোলিও লিংক আপনার পাবলিক স্কিল পাসপোর্টে সিঙ্ক হবে। কোনো CV লাগবে না।',
                )}
              </p>
            </div>
          </div>

        </div>

        <TabBar activeTab={activeTab} onChange={setActiveTab} t={t} />
      </div>

      {bootError && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{bootError}</span>
        </div>
      )}

      {}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          <ProfilePictureUpload t={t} />

          {}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {t('Profile Completeness', 'প্রোফাইল সম্পূর্ণতা')}
                </h3>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (profileCompleteness.score >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : profileCompleteness.score >= 50
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800')
                  }
                >
                  {profileCompleteness.level}
                </span>
              </div>
              <div className="text-sm font-black text-slate-900">
                {profileCompleteness.score}%
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  ({profileCompleteness.doneCount}/10)
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={
                  'h-full rounded-full transition-all ' +
                  (profileCompleteness.score >= 80
                    ? 'bg-emerald-500'
                    : profileCompleteness.score >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500')
                }
                style={{ width: `${profileCompleteness.score}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {profileCompleteness.buckets.map((b) => (
                <div
                  key={b.key}
                  className={
                    'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ' +
                    (b.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-500')
                  }
                >
                  <span className={b.done ? 'text-emerald-600' : 'text-slate-400'}>
                    {b.done ? '✓' : '○'}
                  </span>
                  <span className="truncate">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <SectionHeader
            icon={<User size={16} />}
            title={t('Personal information', 'ব্যক্তিগত তথ্য')}
            savedAt={sectionSavedAt.personal}
            saving={sectionSaving === 'personal'}
            t={t}
          />
          <PersonalSection
            profile={profile}
            saving={sectionSaving === 'personal'}
            error={sectionErrors.personal}
            onSave={(patch) => saveSection('personal', { profile: patch })}
            t={t}
          />

          <SectionHeader
            icon={<Briefcase size={16} />}
            title={t('Career information', 'পেশা সংক্রান্ত তথ্য')}
            savedAt={sectionSavedAt.career}
            saving={sectionSaving === 'career'}
            t={t}
          />
          <CareerSection
            profile={profile}
            saving={sectionSaving === 'career'}
            error={sectionErrors.career}
            onSave={(patch) => saveSection('career', { profile: patch })}
            t={t}
          />

          <SectionHeader
            icon={<GraduationCap size={16} />}
            title={t('Education', 'শিক্ষাগত যোগ্যতা')}
            savedAt={sectionSavedAt.education}
            saving={sectionSaving === 'education'}
            t={t}
          />
          <EducationSection
            rows={educations}
            saving={sectionSaving === 'education'}
            error={sectionErrors.education}
            onSave={(rows) => saveSection('education', { educations: rows })}
            t={t}
          />

          <SectionHeader
            icon={<Building2 size={16} />}
            title={t('Experience', 'অভিজ্ঞতা')}
            savedAt={sectionSavedAt.experience}
            saving={sectionSaving === 'experience'}
            t={t}
          />
          <ExperienceSection
            rows={experiences}
            saving={sectionSaving === 'experience'}
            error={sectionErrors.experience}
            onSave={(rows) => saveSection('experience', { experiences: rows })}
            t={t}
          />

          <SectionHeader
            icon={<Wrench size={16} />}
            title={t('Skills', 'দক্ষতাসমূহ')}
            savedAt={sectionSavedAt.skills}
            saving={sectionSaving === 'skills'}
            t={t}
          />
          <SkillsSection
            rows={skills.filter(
              (s) => s.category !== 'language' && s.category !== 'certification',
            )}
            saving={sectionSaving === 'skills'}
            error={sectionErrors.skills}
            onSave={async (rows) => {





              const others = skills.filter(
                (s) => s.category === 'language' || s.category === 'certification',
              );
              await saveSection(
                'skills',
                { skills: [...rows, ...others] },
              );
            }}
            t={t}
          />

          <SectionHeader
            icon={<LangIcon size={16} />}
            title={t('Languages', 'ভাষাসমূহ')}
            savedAt={sectionSavedAt.languages}
            saving={sectionSaving === 'languages'}
            t={t}
          />
          <LanguagesSection
            rows={skills.filter((s) => s.category === 'language')}
            saving={sectionSaving === 'languages'}
            error={sectionErrors.languages}
            onSave={async (rows) => {
              const others = skills.filter((s) => s.category !== 'language');
              await saveSection('languages', { skills: [...others, ...rows] });
            }}
            t={t}
          />

          <SectionHeader
            icon={<Award size={16} />}
            title={t('Certifications', 'সার্টিফিকেশন')}
            savedAt={sectionSavedAt.certifications}
            saving={sectionSaving === 'certifications'}
            t={t}
          />
          <CertificationsSection
            rows={skills.filter((s) => s.category === 'certification')}
            saving={sectionSaving === 'certifications'}
            error={sectionErrors.certifications}
            onSave={async (rows) => {
              const others = skills.filter((s) => s.category !== 'certification');
              await saveSection('certifications', { skills: [...others, ...rows] });
            }}
            t={t}
          />

          <SectionHeader
            icon={<Globe size={16} />}
            title={t('Portfolio & social links', 'পোর্টফোলিও ও সোশ্যাল লিঙ্ক')}
            savedAt={sectionSavedAt.links}
            saving={sectionSaving === 'links'}
            t={t}
          />
          <LinksSection
            profile={profile}
            saving={sectionSaving === 'links'}
            error={sectionErrors.links}
            onSave={(patch) => saveSection('links', { profile: patch })}
            t={t}
          />
        </div>
      )}

      {}
      {activeTab === 'jobs' && (
        <JobMatchesPanel
          rows={jobMatches}
          dashboard={jobDashboard}
          loading={jobLoading}
          error={jobError}
          runPending={jobRunPending}
          onRun={runMatchNow}
          onViewAllJobs={() => navigate('/dashboard/jobs')}
          onEditProfile={() => setActiveTab('profile')}
          language={language}
        />
      )}
    </div>
  );
};





const TabBar: React.FC<{
  activeTab: TabKey;
  onChange: (next: TabKey) => void;
  t: (en: string, bn: string) => string;
}> = ({ activeTab, onChange, t }) => {
  const tabs: { key: TabKey; label: string; labelBn: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'My profile',      labelBn: 'আমার প্রোফাইল',  icon: <User size={14} /> },
    { key: 'jobs',    label: 'Job matches',     labelBn: 'জব ম্যাচ',         icon: <Briefcase size={14} /> },
  ];
  return (
    <div className="relative z-10 mt-5 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-black transition-all ${
              active
                ? 'border-white/30 bg-white text-[#E31B23] shadow-md'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            }`}
            aria-pressed={active}
          >
            {tab.icon}
            <span>{t(tab.label, tab.labelBn)}</span>
          </button>
        );
      })}
    </div>
  );
};

const CenterSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
    <div className="relative mx-auto mb-4 h-16 w-16">
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-500/10 border-t-[#F97316]" />
      <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-[#F97316] animate-pulse" />
    </div>
    <p className="text-sm font-black text-slate-900">{label ?? 'Loading…'}</p>
  </div>
);

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  saving?: boolean;
  savedAt?: number;
  t: (en: string, bn: string) => string;
}> = ({ icon, title, saving, savedAt, t }) => {
  const justSaved = savedAt && Date.now() - savedAt < 4000;
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/15 to-[#F97316]/15 text-[#E31B23]">{icon}</span>
        {title}
      </h3>
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
        {saving && <span className="inline-flex items-center gap-1 text-amber-600"><Loader2 size={11} className="animate-spin" /> {t('Saving…', 'সেভ হচ্ছে…')}</span>}
        {!saving && justSaved && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> {t('Saved', 'সংরক্ষিত')}</span>}
      </div>
    </div>
  );
};



const PersonalSection: React.FC<{
  profile: Profile | null;
  saving: boolean;
  error?: string;
  onSave: (patch: Partial<Profile>) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ profile, saving, error, onSave, t }) => {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [dob, setDob] = useState(profile?.date_of_birth || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [district, setDistrict] = useState(profile?.district || '');
  const [division, setDivision] = useState(profile?.division || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return; 
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setGender(profile?.gender || '');
    setDob(profile?.date_of_birth || '');
    setAddress(profile?.address || '');
    setDistrict(profile?.district || '');
    setDivision(profile?.division || '');
    setBio(profile?.bio || '');
    setDirty(false);
  }, [profile, dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T): void => { setter(v); setDirty(true); };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Full name', 'সম্পূর্ণ নাম')} *</label>
          <input className={inputCls} value={fullName} onChange={(e) => mark(setFullName)(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Phone', 'ফোন')}</label>
          <div className="relative">
            <Phone size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-8`} value={phone} onChange={(e) => mark(setPhone)(e.target.value)} placeholder="+880 1700 000000" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Gender', 'লিঙ্গ')}</label>
          <select className={inputCls} value={gender} onChange={(e) => mark(setGender)(e.target.value)}>
            <option value="">{t('— Select —', '— নির্বাচন —')}</option>
            <option value="Male">{t('Male', 'পুরুষ')}</option>
            <option value="Female">{t('Female', 'মহিলা')}</option>
            <option value="Other">{t('Other', 'অন্যান্য')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Date of birth', 'জন্ম তারিখ')}</label>
          <input className={inputCls} type="date" value={dob} onChange={(e) => mark(setDob)(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Division', 'বিভাগ')}</label>
          <select className={inputCls} value={division} onChange={(e) => mark(setDivision)(e.target.value)}>
            <option value="">{t('— Select —', '— নির্বাচন —')}</option>
            {BANGLADESH_DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('District', 'জেলা')}</label>
          <input className={inputCls} value={district} onChange={(e) => mark(setDistrict)(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Street address', 'ঠিকানা')}</label>
          <input className={inputCls} value={address} onChange={(e) => mark(setAddress)(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Professional bio', 'পেশাগত বায়ো')}</label>
          <textarea className={inputCls} rows={3} value={bio} onChange={(e) => mark(setBio)(e.target.value)} />
        </div>
      </div>

      <SectionError error={error} />

      <div className="mt-5 flex justify-end">
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            await onSave({
              full_name: nullIfEmpty(fullName),
              phone: nullIfEmpty(phone),
              gender: (gender && gender.length > 0 ? gender : null) as any,
              date_of_birth: nullIfEmpty(dob),
              address: nullIfEmpty(address),
              district: nullIfEmpty(district),
              division: nullIfEmpty(division),
              bio: nullIfEmpty(bio),
            });
            setDirty(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
};



const CareerSection: React.FC<{
  profile: Profile | null;
  saving: boolean;
  error?: string;
  onSave: (patch: Partial<Profile>) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ profile, saving, error, onSave, t }) => {
  const [profession, setProfession] = useState(profile?.profession || '');
  const [currentPosition, setCurrentPosition] = useState(profile?.current_position || '');
  const [experienceYears, setExperienceYears] = useState<number>(profile?.experience_years ?? 0);
  const [experienceSummary, setExperienceSummary] = useState(profile?.experience_summary || '');
  const [educationDegree, setEducationDegree] = useState(profile?.education_degree || '');
  const [educationInstitution, setEducationInstitution] = useState(profile?.education_institution || '');
  const [educationYear, setEducationYear] = useState(profile?.education_year || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return; 
    setProfession(profile?.profession || '');
    setCurrentPosition(profile?.current_position || '');
    setExperienceYears(profile?.experience_years ?? 0);
    setExperienceSummary(profile?.experience_summary || '');
    setEducationDegree(profile?.education_degree || '');
    setEducationInstitution(profile?.education_institution || '');
    setEducationYear(profile?.education_year || '');
    setDirty(false);
  }, [profile, dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T): void => { setter(v); setDirty(true); };
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Profession category', 'পেশা / ক্যাটাগরি')} *</label>
          <select className={inputCls} value={profession} onChange={(e) => mark(setProfession)(e.target.value)}>
            <option value="">{t('— Select —', '— নির্বাচন —')}</option>
            {POPULAR_PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Current job title & company', 'বর্তমান পদবী ও প্রতিষ্ঠান')}</label>
          <input className={inputCls} value={currentPosition} onChange={(e) => mark(setCurrentPosition)(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Years of experience', 'মোট অভিজ্ঞতা (বছর)')}</label>
          <input className={inputCls} type="number" min={0} max={50} value={experienceYears} onChange={(e) => mark(setExperienceYears)(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Highest degree', 'সর্বোচ্চ শিক্ষাগত যোগ্যতা')}</label>
          <input className={inputCls} value={educationDegree} onChange={(e) => mark(setEducationDegree)(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Institution / University', 'শিক্ষা প্রতিষ্ঠান')}</label>
          <input className={inputCls} value={educationInstitution} onChange={(e) => mark(setEducationInstitution)(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Graduation year', 'পাস করার বছর')}</label>
          <input className={inputCls} value={educationYear} onChange={(e) => mark(setEducationYear)(e.target.value)} placeholder="2023" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-[11px] font-bold text-slate-700">{t('Work experience highlights', 'অভিজ্ঞতার সংক্ষিপ্ত বিবরণ')}</label>
          <textarea className={inputCls} rows={3} value={experienceSummary} onChange={(e) => mark(setExperienceSummary)(e.target.value)} />
        </div>
      </div>

      <SectionError error={error} />

      <div className="mt-5 flex justify-end">
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            await onSave({
              profession: nullIfEmpty(profession),
              current_position: nullIfEmpty(currentPosition),
              experience_years: Number(experienceYears) || 0,
              experience_summary: nullIfEmpty(experienceSummary),
              education_degree: nullIfEmpty(educationDegree),
              education_institution: nullIfEmpty(educationInstitution),
              education_year: nullIfEmpty(educationYear),
            });
            setDirty(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
};



const EducationSection: React.FC<{
  rows: ManualEducationsRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualEducationsRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ rows, saving, error, onSave, t }) => {
  
  
  
  
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const [local, setLocal] = useState<ManualEducationsRow[]>(rows);
  const [dirty, setDirty] = useState(false);

  
  
  
  useEffect(() => {
    if (dirty) return; 
    if (!rowsHaveSameIds(rows, local)) {
      setLocal(rows);
    }
  }, [rows, dirty]);

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none';

  const add = (): void => {
    setLocal((p) => [...p, { degree: '', institution: '', year: '', cgpa: '' }]);
    setDirty(true);
  };
  const remove = (i: number): void => {
    setLocal((p) => p.filter((_, idx) => idx !== i));
    setDirty(true);
  };
  const update = (i: number, key: keyof ManualEducationsRow, v: string): void => {
    setLocal((p) => p.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
    setDirty(true);
  };

  
  const display = sortByYearDesc(local, (r) => r.year);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        {display.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500">
            {t('Add your degrees — most recent first.', 'আপনার ডিগ্রি যোগ করুন — সর্বশেষটি আগে।')}
          </p>
        )}
        {display.map((row, i) => {
          
          const realIdx = local.indexOf(row);
          return (
            <div key={row.id ?? `__${realIdx}`} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <Hash size={11} /> {t('Entry', 'এন্ট্রি')} {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(realIdx)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={11} /> {t('Remove', 'মুছুন')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Degree', 'ডিগ্রি')} *</label>
                  <input className={inputCls} value={row.degree} onChange={(e) => update(realIdx, 'degree', e.target.value)} placeholder="B.Sc. in CSE" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Institution', 'প্রতিষ্ঠান')} *</label>
                  <input className={inputCls} value={row.institution} onChange={(e) => update(realIdx, 'institution', e.target.value)} placeholder="BUET" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Year', 'বছর')}</label>
                  <input className={inputCls} value={row.year ?? ''} onChange={(e) => update(realIdx, 'year', e.target.value)} placeholder="2023" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">CGPA</label>
                  <input className={inputCls} value={row.cgpa ?? ''} onChange={(e) => update(realIdx, 'cgpa', e.target.value)} placeholder="3.75 / 4.00" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
        >
          <Plus size={12} /> {t('Add education', 'শিক্ষা যোগ করুন')}
        </button>
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            
            
            const cleaned = local
              .map((r) => ({
                ...r,
                degree: (r.degree ?? '').replace(/\s+/g, ' ').trim(),
                institution: (r.institution ?? '').replace(/\s+/g, ' ').trim(),
                year: (r.year ?? '').replace(/\s+/g, ' ').trim() || null,
                cgpa: (r.cgpa ?? '').replace(/\s+/g, ' ').trim() || null,
              }))
              .filter((r) => r.degree.length > 0 || r.institution.length > 0);
            await onSave(cleaned);
            setDirty(false);
          }}
          t={t}
        />
      </div>
      <SectionError error={error} />
    </div>
  );
};



const ExperienceSection: React.FC<{
  rows: ManualExperiencesRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualExperiencesRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ rows, saving, error, onSave, t }) => {
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const [local, setLocal] = useState<ManualExperiencesRow[]>(rows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    if (!rowsHaveSameIds(rows, local)) {
      setLocal(rows);
    }
  }, [rows, dirty]);

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none';

  const add = (): void => {
    setLocal((p) => [...p, { role: '', company: '', duration: '', summary: '' }]);
    setDirty(true);
  };
  const remove = (i: number): void => {
    setLocal((p) => p.filter((_, idx) => idx !== i));
    setDirty(true);
  };
  const update = (i: number, key: keyof ManualExperiencesRow, v: string): void => {
    setLocal((p) => p.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
    setDirty(true);
  };

  
  
  
  const display = sortByDurationDesc(local);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        {display.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[12px] text-slate-500">
            {t('Add work experience — most recent first.', 'কাজের অভিজ্ঞতা যোগ করুন — সর্বশেষটি আগে।')}
          </p>
        )}
        {display.map((row, i) => {
          const realIdx = local.indexOf(row);
          return (
            <div key={row.id ?? `__${realIdx}`} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <Hash size={11} /> {t('Role', 'ভূমিকা')} {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(realIdx)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={11} /> {t('Remove', 'মুছুন')}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Job title', 'পদবী')} *</label>
                  <input className={inputCls} value={row.role} onChange={(e) => update(realIdx, 'role', e.target.value)} placeholder="Frontend Engineer" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Company', 'প্রতিষ্ঠান')} *</label>
                  <input className={inputCls} value={row.company} onChange={(e) => update(realIdx, 'company', e.target.value)} placeholder="Robi" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Duration', 'সময়কাল')}</label>
                  <input className={inputCls} value={row.duration ?? ''} onChange={(e) => update(realIdx, 'duration', e.target.value)} placeholder="Jan 2022 — Present" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold text-slate-600">{t('Highlights', 'হাইলাইটস')}</label>
                  <textarea className={inputCls} rows={3} value={row.summary ?? ''} onChange={(e) => update(realIdx, 'summary', e.target.value)} placeholder={t('Key responsibilities, achievements, technologies…', 'মূল দায়িত্ব, অর্জন, ব্যবহৃত প্রযুক্তি…')} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
        >
          <Plus size={12} /> {t('Add experience', 'অভিজ্ঞতা যোগ করুন')}
        </button>
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            const cleaned = local
              .map((r) => ({
                ...r,
                role: (r.role ?? '').replace(/\s+/g, ' ').trim(),
                company: (r.company ?? '').replace(/\s+/g, ' ').trim(),
                duration: (r.duration ?? '').replace(/\s+/g, ' ').trim() || null,
                summary: (r.summary ?? '').replace(/\s+/g, ' ').trim() || null,
              }))
              .filter((r) => r.role.length > 0 || r.company.length > 0);
            await onSave(cleaned);
            setDirty(false);
          }}
          t={t}
        />
      </div>
      <SectionError error={error} />
    </div>
  );
};



const SkillsSection: React.FC<{
  rows: ManualSkillRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualSkillRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ rows, saving, error, onSave, t }) => {
  
  
  
  
  
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const [input, setInput] = useState('');
  const [cat, setCat] = useState<'technical' | 'soft' | 'tools'>('technical');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [local, setLocal] = useState<ManualSkillRow[]>(rows);
  const [dirty, setDirty] = useState(false);

  
  useEffect(() => {
    if (dirty) return;
    if (!rowsHaveSameIds(rows, local)) {
      setLocal(rows);
    }
  }, [rows, dirty]);

  
  
  
  
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback((next: ManualSkillRow[]) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      void onSaveRef.current(next);
      setDirty(false);
    }, 350);
  }, []);
  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  const add = (): void => {
    const name = input.replace(/\s+/g, ' ').trim();
    if (!name) return;
    
    const exists = local.some(
      (s) => s.category === cat && s.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      setInput('');
      return;
    }
    const next = [...local, { name, category: cat }];
    setLocal(next);
    setInput('');
    setDirty(true);
    commit(next);
  };

  const remove = (i: number): void => {
    const next = local.filter((_, idx) => idx !== i);
    setLocal(next);
    setDirty(true);
    commit(next);
  };

  const startEdit = (i: number): void => {
    const r = local[i];
    if (!r) return;
    setEditingId(r.id ?? `__${i}`);
    setEditingValue(r.name);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = (i: number): void => {
    const r = local[i];
    if (!r) return;
    const name = editingValue.replace(/\s+/g, ' ').trim();
    if (!name) {
      cancelEdit();
      return;
    }
    const next = local.map((row, idx) => idx === i ? { ...row, name } : row);
    setLocal(next);
    setDirty(true);
    commit(next);
    cancelEdit();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          
          
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              
              
              if (e.key === ',') {
                setInput((cur) => cur.replace(/,\s*$/, ''));
              }
              add();
            }
          }}
          onPaste={(e) => {
            
            
            
            const pasted = e.clipboardData.getData('text') ?? '';
            if (pasted.includes(',') && pasted.split(',').some((p) => p.trim().length > 0)) {
              e.preventDefault();
              const parts = pasted.split(',').map((p) => p.trim()).filter(Boolean);
              if (parts.length === 0) return;
              
              
              
              const first = input.trim().length > 0
                ? input.trim() + ' ' + parts[0]
                : parts[0];
              const rest = parts.slice(1);
              let next = [...local];
              const seen = new Set(next.map((s) => `${s.category}::${s.name.toLowerCase()}`));
              const push = (n: string): void => {
                const cleaned = n.replace(/\s+/g, ' ').trim();
                if (!cleaned) return;
                const key = `${cat}::${cleaned.toLowerCase()}`;
                if (seen.has(key)) return;
                seen.add(key);
                next = [...next, { name: cleaned, category: cat }];
              };
              push(first);
              rest.forEach(push);
              setLocal(next);
              setInput('');
              setDirty(true);
              commit(next);
            }
          }}
          placeholder={t('Add a skill — e.g. React, SEO, Financial Analysis', 'একটি দক্ষতা যোগ করুন — যেমন: React, SEO, Financial Analysis')}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as any)}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#E31B23] focus:bg-white focus:outline-none"
        >
          <option value="technical">{t('Technical', 'টেকনিক্যাল')}</option>
          <option value="soft">{t('Soft', 'সফট')}</option>
          <option value="tools">{t('Tools', 'টুলস')}</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          + {t('Add', 'যোগ')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {local.length === 0 && (
          <p className="text-[12px] text-slate-400">{t('No skills yet.', 'এখনো কোনো দক্ষতা নেই।')}</p>
        )}
        {local.map((s, i) => {
          const editing = editingId === (s.id ?? `__${i}`);
          const tone =
            s.category === 'soft'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : s.category === 'tools'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-blue-200 bg-blue-50 text-blue-700';
          if (editing) {
            return (
              <span
                key={s.id ?? `__${i}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}
              >
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(i); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                  onBlur={() => saveEdit(i)}
                  className="w-24 bg-transparent text-[11px] font-bold outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => saveEdit(i)} className="hover:opacity-70" aria-label="Save">
                  <CheckCircle2 size={11} />
                </button>
                <button type="button" onClick={cancelEdit} className="hover:opacity-70" aria-label="Cancel">
                  <X size={11} />
                </button>
              </span>
            );
          }
          return (
            <span
              key={s.id ?? `__${i}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}
            >
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="hover:underline"
                title={t('Click to edit', 'এডিট করতে ক্লিক করুন')}
              >
                {s.name}
              </button>
              <button type="button" onClick={() => remove(i)} className="hover:opacity-70" aria-label="Delete">
                <X size={11} />
              </button>
            </span>
          );
        })}
      </div>

      <SectionError error={error} />

      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {saving ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : t('Auto-saved', 'স্বয়ংক্রিয়ভাবে সংরক্ষিত')}
        </span>
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            
            if (commitTimer.current) clearTimeout(commitTimer.current);
            await onSave(local);
            setDirty(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
};



const LanguagesSection: React.FC<{
  rows: ManualSkillRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualSkillRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ rows, saving, error, onSave, t }) => {
  return <LangCertSection category="language" rows={rows} saving={saving} error={error} onSave={onSave} t={t} />;
};

const CertificationsSection: React.FC<{
  rows: ManualSkillRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualSkillRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ rows, saving, error, onSave, t }) => {
  return <LangCertSection category="certification" rows={rows} saving={saving} error={error} onSave={onSave} t={t} />;
};



const LangCertSection: React.FC<{
  category: 'language' | 'certification';
  rows: ManualSkillRow[];
  saving: boolean;
  error?: string;
  onSave: (rows: ManualSkillRow[]) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ category, rows, saving, error, onSave, t }) => {
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [local, setLocal] = useState<ManualSkillRow[]>(rows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    if (!rowsHaveSameIds(rows, local)) {
      setLocal(rows);
    }
  }, [rows, dirty]);

  
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback((next: ManualSkillRow[]) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      void onSaveRef.current(next);
      setDirty(false);
    }, 350);
  }, []);
  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  const isLang = category === 'language';
  const label = isLang ? t('Add a language — e.g. Bangla, English, Hindi', 'একটি ভাষা যোগ করুন — যেমন: বাংলা, ইংরেজি, হিন্দি')
                       : t('Add a certification — e.g. AWS Solutions Architect', 'একটি সার্টিফিকেশন যোগ করুন — যেমন: AWS Solutions Architect');

  const add = (): void => {
    const name = input.replace(/\s+/g, ' ').trim();
    if (!name) return;
    if (local.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setInput('');
      return;
    }
    const next = [...local, { name, category }];
    setLocal(next);
    setInput('');
    setDirty(true);
    commit(next);
  };
  const remove = (i: number): void => {
    const next = local.filter((_, idx) => idx !== i);
    setLocal(next);
    setDirty(true);
    commit(next);
  };

  const startEdit = (i: number): void => {
    const r = local[i];
    if (!r) return;
    setEditingId(r.id ?? `__${i}`);
    setEditingValue(r.name);
  };
  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingValue('');
  };
  const saveEdit = (i: number): void => {
    const name = editingValue.replace(/\s+/g, ' ').trim();
    if (!name) { cancelEdit(); return; }
    const next = local.map((row, idx) => idx === i ? { ...row, name } : row);
    setLocal(next);
    setDirty(true);
    commit(next);
    cancelEdit();
  };

  const tone = isLang
    ? 'border-purple-200 bg-purple-50 text-purple-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              if (e.key === ',') setInput((cur) => cur.replace(/,\s*$/, ''));
              add();
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text') ?? '';
            if (pasted.includes(',') && pasted.split(',').some((p) => p.trim().length > 0)) {
              e.preventDefault();
              const parts = pasted.split(',').map((p) => p.trim()).filter(Boolean);
              if (parts.length === 0) return;
              const first = input.trim().length > 0
                ? input.trim() + ' ' + parts[0]
                : parts[0];
              const rest = parts.slice(1);
              let next = [...local];
              const seen = new Set(next.map((s) => s.name.toLowerCase()));
              const push = (n: string): void => {
                const cleaned = n.replace(/\s+/g, ' ').trim();
                if (!cleaned) return;
                const k = cleaned.toLowerCase();
                if (seen.has(k)) return;
                seen.add(k);
                next = [...next, { name: cleaned, category }];
              };
              push(first);
              rest.forEach(push);
              setLocal(next);
              setInput('');
              setDirty(true);
              commit(next);
            }
          }}
          placeholder={label}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          + {t('Add', 'যোগ')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {local.length === 0 && <p className="text-[12px] text-slate-400">{t('Nothing added yet.', 'এখনো কিছু যোগ হয়নি।')}</p>}
        {local.map((s, i) => {
          const editing = editingId === (s.id ?? `__${i}`);
          if (editing) {
            return (
              <span key={s.id ?? `__${i}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}>
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(i); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                  onBlur={() => saveEdit(i)}
                  className="w-24 bg-transparent text-[11px] font-bold outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => saveEdit(i)} aria-label="Save" className="hover:opacity-70">
                  <CheckCircle2 size={11} />
                </button>
                <button type="button" onClick={cancelEdit} aria-label="Cancel" className="hover:opacity-70">
                  <X size={11} />
                </button>
              </span>
            );
          }
          return (
            <span key={s.id ?? `__${i}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}>
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="hover:underline"
                title={t('Click to edit', 'এডিট করতে ক্লিক করুন')}
              >
                {s.name}
              </button>
              <button type="button" onClick={() => remove(i)} aria-label="Delete" className="hover:opacity-70">
                <X size={11} />
              </button>
            </span>
          );
        })}
      </div>

      <SectionError error={error} />

      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {saving ? t('Saving…', 'সংরক্ষণ হচ্ছে…') : t('Auto-saved', 'স্বয়ংক্রিয়ভাবে সংরক্ষিত')}
        </span>
        <SaveButton
          dirty={dirty}
          saving={saving}
          onClick={async () => {
            if (commitTimer.current) clearTimeout(commitTimer.current);
            await onSave(local);
            setDirty(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
};



const LinksSection: React.FC<{
  profile: Profile | null;
  saving: boolean;
  error?: string;
  onSave: (patch: Partial<Profile>) => Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ profile, saving, error, onSave, t }) => {
  const [github, setGithub] = useState(profile?.github_url || '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url || '');
  const [portfolio, setPortfolio] = useState(profile?.portfolio_url || '');
  const [website, setWebsite] = useState(profile?.website_url || '');
  const [dirty, setDirty] = useState(false);

  
  
  
  
  
  useEffect(() => {
    if (dirty) return;
    const nextGithub = profile?.github_url || '';
    const nextLinkedin = profile?.linkedin_url || '';
    const nextPortfolio = profile?.portfolio_url || '';
    const nextWebsite = profile?.website_url || '';
    if (
      github !== nextGithub ||
      linkedin !== nextLinkedin ||
      portfolio !== nextPortfolio ||
      website !== nextWebsite
    ) {
      setGithub(nextGithub);
      setLinkedin(nextLinkedin);
      setPortfolio(nextPortfolio);
      setWebsite(nextWebsite);
    }
  
  }, [profile, dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T): void => { setter(v); setDirty(true); };
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none';
  const errCls = 'w-full rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 focus:border-rose-400 focus:bg-white focus:outline-none';

  
  const urlErrors = {
    linkedin: linkedin && !isValidUrl(linkedin) ? t('Must start with http:// or https://', 'http:// অথবা https:// দিয়ে শুরু হতে হবে') : '',
    github: github && !isValidUrl(github) ? t('Must start with http:// or https://', 'http:// অথবা https:// দিয়ে শুরু হতে হবে') : '',
    portfolio: portfolio && !isValidUrl(portfolio) ? t('Must start with http:// or https://', 'http:// অথবা https:// দিয়ে শুরু হতে হবে') : '',
    website: website && !isValidUrl(website) ? t('Must start with http:// or https://', 'http:// অথবা https:// দিয়ে শুরু হতে হবে') : '',
  };
  const hasUrlError =
    !!urlErrors.linkedin || !!urlErrors.github || !!urlErrors.portfolio || !!urlErrors.website;

  const openLink = (raw: string): React.ReactElement | null => {
    const u = normaliseUrl(raw);
    if (!u) return null;
    return (
      <a
        href={u}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[10px] font-bold text-blue-600 hover:underline"
      >
        {t('Open', 'ওপেন')} ↗
      </a>
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Linkedin size={12} className="text-blue-600" /> LinkedIn
            </span>
            {openLink(linkedin)}
          </label>
          <input
            className={urlErrors.linkedin ? errCls : inputCls}
            value={linkedin}
            onChange={(e) => mark(setLinkedin)(e.target.value)}
            onBlur={() => linkedin && mark(setLinkedin)(normaliseUrl(linkedin))}
            placeholder="https://linkedin.com/in/..."
          />
          {urlErrors.linkedin && <p className="mt-1 text-[10px] font-bold text-rose-600">{urlErrors.linkedin}</p>}
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Github size={12} className="text-slate-800" /> GitHub / Behance / Dribbble
            </span>
            {openLink(github)}
          </label>
          <input
            className={urlErrors.github ? errCls : inputCls}
            value={github}
            onChange={(e) => mark(setGithub)(e.target.value)}
            onBlur={() => github && mark(setGithub)(normaliseUrl(github))}
            placeholder="https://github.com/..."
          />
          {urlErrors.github && <p className="mt-1 text-[10px] font-bold text-rose-600">{urlErrors.github}</p>}
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Globe size={12} className="text-emerald-600" /> Portfolio website
            </span>
            {openLink(portfolio)}
          </label>
          <input
            className={urlErrors.portfolio ? errCls : inputCls}
            value={portfolio}
            onChange={(e) => mark(setPortfolio)(e.target.value)}
            onBlur={() => portfolio && mark(setPortfolio)(normaliseUrl(portfolio))}
            placeholder="https://myportfolio.com"
          />
          {urlErrors.portfolio && <p className="mt-1 text-[10px] font-bold text-rose-600">{urlErrors.portfolio}</p>}
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Globe size={12} className="text-purple-600" /> Personal blog / company
            </span>
            {openLink(website)}
          </label>
          <input
            className={urlErrors.website ? errCls : inputCls}
            value={website}
            onChange={(e) => mark(setWebsite)(e.target.value)}
            onBlur={() => website && mark(setWebsite)(normaliseUrl(website))}
            placeholder="https://mycompany.com"
          />
          {urlErrors.website && <p className="mt-1 text-[10px] font-bold text-rose-600">{urlErrors.website}</p>}
        </div>
      </div>

      <SectionError error={error} />

      <div className="mt-5 flex justify-end">
        <SaveButton
          dirty={dirty && !hasUrlError}
          saving={saving}
          onClick={async () => {
            
            const norm = (v: string): string | null => {
              const trimmed = v.trim();
              if (!trimmed) return null;
              return normaliseUrl(trimmed);
            };
            await onSave({
              github_url: norm(github),
              linkedin_url: norm(linkedin),
              portfolio_url: norm(portfolio),
              website_url: norm(website),
            });
            setDirty(false);
          }}
          t={t}
        />
      </div>
    </div>
  );
};



const SaveButton: React.FC<{
  dirty: boolean;
  saving: boolean;
  onClick: () => void | Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ dirty, saving, onClick, t }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!dirty || saving}
    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-xs font-black text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
    {t('Save changes', 'পরিবর্তন সেভ করুন')}
  </button>
);

const SectionError: React.FC<{ error?: string }> = ({ error }) => {
  if (!error) return null;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
};




const JobMatchesPanel: React.FC<{
  rows: JobMatchRow[] | null;
  dashboard: JobMatchDashboard | null;
  loading: boolean;
  error: string;
  runPending: boolean;
  onRun: () => Promise<void>;
  onViewAllJobs: () => void;
  onEditProfile: () => void;
  language: 'en' | 'bn';
}> = ({ rows, dashboard, loading, error, runPending, onRun, onViewAllJobs, onEditProfile, language }) => {
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const scored = (rows ?? [])
    .filter((r): r is { job: typeof r.job; match: JobMatchResult } => !!r.match)
    .sort((a, b) => (b.match.overall_match ?? 0) - (a.match.overall_match ?? 0));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DashTile label={t('Average match', 'গড় ম্যাচ')} value={dashboard?.average_match ?? 0} suffix="%" tone="from-[#E31B23] to-[#F97316]" />
        <DashTile label={t('Ready to apply', 'আবেদনযোগ্য')} value={dashboard?.jobs_ready_to_apply ?? 0} tone="from-emerald-500 to-emerald-700" />
        <DashTile label={t('Need more skills', 'আরো স্কিল দরকার')} value={dashboard?.need_more_skills ?? 0} tone="from-amber-500 to-amber-700" />
        <DashTile label={t('Recommended today', 'আজকের সুপারিশ')} value={dashboard?.recommended_today ?? 0} tone="from-blue-500 to-blue-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900">{t('AI Recommended Jobs', 'AI সুপারিশকৃত চাকরি')}</h2>
            <p className="text-[11px] text-slate-500">
              {t(
                'Match scores are computed from your AI Profile data (skills, education, experience, career level).',
                'ম্যাচ স্কোর আপনার AI প্রোফাইল ডেটা (দক্ষতা, শিক্ষা, অভিজ্ঞতা, ক্যারিয়ার লেভেল) থেকে হিসাব করা হয়।',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEditProfile} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Pencil size={14} /> {t('Edit profile', 'প্রোফাইল এডিট')}
            </button>
            <button type="button" onClick={onRun} disabled={runPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-xs font-black text-white shadow hover:opacity-95 disabled:opacity-50">
              {runPending ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {t('Re-run AI matching', 'AI ম্যাচিং আবার চালান')}
            </button>
            <button type="button" onClick={onViewAllJobs} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
              <ExternalLink size={14} /> {t('Open Job Portal', 'জব পোর্টাল দেখুন')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500 shadow-sm">
          <Loader2 size={14} className="mx-auto mb-1 animate-spin text-[#E31B23]" />
          {t('Loading job matches…', 'জব ম্যাচ লোড হচ্ছে…')}
        </div>
      )}

      {!loading && scored.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-sm font-bold text-slate-800">{t('No job matches yet', 'এখনো কোনো জব ম্যাচ নেই')}</p>
          <p className="mt-1 text-[11px] text-slate-500">{t('Click "Re-run AI matching" to score your profile.', '"AI ম্যাচিং আবার চালান" এ ক্লিক করুন।')}</p>
        </div>
      )}

      {!loading && scored.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Award size={14} className="text-emerald-500" />
            {t('AI Recommended for you', 'আপনার জন্য AI সুপারিশ')}
          </h3>
          {scored.slice(0, 6).map(({ job, match }) => (
            <MatchCard key={job.id} job={job} match={match} language={language} />
          ))}
        </div>
      )}
    </div>
  );
};



const DashTile: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  tone: string;
}> = ({ label, value, suffix = '', tone }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`bg-gradient-to-r ${tone} bg-clip-text text-2xl font-black text-transparent`}>{value}{suffix}</p>
    </div>
  );
};

const InfoTile: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value || '—'}</p>
    </div>
  );
};

const SkillList: React.FC<{
  label: string;
  items: string[];
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}> = ({ label, items, tone }) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    rose: 'bg-rose-50 text-rose-800 ring-rose-100',
    purple: 'bg-purple-50 text-purple-800 ring-purple-100',
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <span key={`${s}-${i}`} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone]}`}>{s}</span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">—</p>
      )}
    </div>
  );
};


const PlanCard: React.FC<{ title: string; items: string[] | undefined }> = ({ title, items }) => {
  const safeItems = safeArr<string>(items);
  if (safeItems.length === 0) return null;
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2 rounded-xl border border-slate-100 bg-slate-50/40">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-slate-700">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {title}
        </span>
        <span className="text-[10px] font-bold text-slate-500">{safeItems.length}</span>
      </button>
      {open && (
        <ul className="space-y-1 px-3 pb-3 text-[12px] text-slate-700">
          {safeItems.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const MatchCard: React.FC<{ job: any; match: JobMatchResult; language: 'en' | 'bn' }> = ({ job, match, language }) => {
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const meta = MATCH_LABEL_META[match.label] ?? MATCH_LABEL_META.good_match;
  const overall = Math.max(0, Math.min(100, Math.round(match.overall_match ?? 0)));
  const missing = Array.isArray(match.missing_skills_required)
    ? match.missing_skills_required
    : Array.isArray(match.missing_skills_json)
      ? match.missing_skills_json
      : [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-black text-slate-900">{job.title}</h4>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.chip}`}>
              {t(meta.label, meta.labelBn)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {job.company_name} · {job.location || 'Bangladesh'} · {job.job_type || 'Full-time'}
          </p>
          {match.ai_reason_bn && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-slate-50/60 p-2 text-[11px] leading-relaxed text-slate-700">
              {match.ai_reason_bn}
            </p>
          )}
        </div>
        <div className="flex w-24 shrink-0 flex-col items-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${meta.barTone} text-base font-black text-white shadow`}>
            {overall}%
          </div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('Match', 'ম্যাচ')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <ScoreBar label="Skill" value={match.skill_match ?? 0} />
        <ScoreBar label="Exp" value={match.experience_match ?? 0} />
        <ScoreBar label="Edu" value={match.education_match ?? 0} />
        <ScoreBar label="Goal" value={match.career_goal_match ?? 0} />
      </div>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>{label}</span>
        <span>{v}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-[#E31B23] to-[#F97316]" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};



async function getProfileFallback(): Promise<Profile | null> {
  
  
  
  return null;
}



export const AICareerProfilePage: React.FC = () => (
  <AppErrorBoundary label="SkillProof AI Profile">
    <AICareerProfilePageInner />
  </AppErrorBoundary>
);

export default AICareerProfilePage;
