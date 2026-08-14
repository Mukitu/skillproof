import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bookmark,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import {
  CANDIDATE_SKILL_CATEGORY_LABELS,
  CANDIDATE_SORT_LABELS,
  searchCompanyCandidates,
  type CandidateListRow,
  type CandidateSort,
} from '../../services/candidateSearch';
import {
  listCompanyJobs,
  listActiveCategories,
  listActiveSubCategories,
  type CompanyJob,
} from '../../services/companyJobs';
import {
  createCandidateInvite,
  listCompanyInvites,
  type CandidateInviteStatus,
} from '../../services/candidateInvites';
import { CandidateProfileModal } from '../../components/company/CandidateProfileModal';

const PAGE_SIZE = 12;

const SORT_OPTIONS: CandidateSort[] = [
  'best_match',
  'ai_score',
  'verified_skills',
  'most_experience',
  'newest_profile',
  'relevance',
];

const SKILL_CATEGORIES: { key: string; en: string; bn: string }[] = [
  { key: 'technical', en: 'Technical', bn: 'টেকনিক্যাল' },
  { key: 'tools',     en: 'Tools',     bn: 'টুলস' },
  { key: 'soft',      en: 'Soft Skills', bn: 'সফট স্কিলস' },
  { key: 'language',  en: 'Language',  bn: 'ভাষা' },
];

function clampScore(score: number | null): number {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function formatLocation(row: CandidateListRow): string {
  const parts = [row.district, row.division, row.country]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);
  return parts.join(', ');
}

function skillToneClass(pct: number): { pill: string; bar: string; text: string } {
  if (pct >= 80) return { pill: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-emerald-600', text: 'text-emerald-700' };
  if (pct >= 60) return { pill: 'bg-teal-100 text-teal-700',       bar: 'from-teal-400 to-cyan-500',      text: 'text-teal-700' };
  if (pct >= 40) return { pill: 'bg-amber-100 text-amber-700',     bar: 'from-amber-400 to-orange-500',   text: 'text-amber-700' };
  if (pct >= 20) return { pill: 'bg-orange-100 text-orange-700',   bar: 'from-orange-400 to-rose-500',    text: 'text-orange-700' };
  return            { pill: 'bg-rose-100 text-rose-700',           bar: 'from-rose-400 to-rose-600',      text: 'text-rose-700' };
}

interface CandidateCardProps {
  row: CandidateListRow;
  language: 'bn' | 'en';
  selectedJob: CompanyJob | null;
  inviteStatus: CandidateInviteStatus | null;
  inviting: boolean;
  onView: (row: CandidateListRow) => void;
  onViewMore: (row: CandidateListRow) => void;
  onInvite: (row: CandidateListRow) => void;
  onMessage: (row: CandidateListRow) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  row,
  language,
  selectedJob,
  inviteStatus,
  inviting,
  onView,
  onViewMore,
  onInvite,
  onMessage,
}) => {
  const aiScore = row.ai_match_score;
  const matchScore = clampScore(row.match_score);
  const skills = (row.verified_skills && row.verified_skills.length > 0)
    ? row.verified_skills.slice(0, 4)
    : (row.declared_skills ?? []).slice(0, 4);
  const declaredTopup = ((row.declared_skills ?? []).filter(
    (s) => !(row.verified_skills ?? []).some((v) => v.toLowerCase() === s.toLowerCase()),
  )).slice(0, Math.max(0, 4 - skills.length));

  const location = formatLocation(row);
  const initials = (row.full_name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');
  const exp = row.experience_years ?? 0;
  const edu = row.education_degree || row.education_institution;

  const inviteDone = inviteStatus === 'pending' || inviteStatus === 'accepted' || inviteStatus === 'declined';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-brand-sm hover:border-[#E31B23]/40 transition relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400" />
      <div className="flex items-start gap-3">
        {row.avatar_url ? (
          <img src={row.avatar_url} alt={row.full_name} className="shrink-0 w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm" />
        ) : (
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm">
            {initials || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 truncate">{row.full_name}</h3>
          <p className="text-[11px] font-semibold text-slate-600 truncate">
            {row.current_position || row.profession || (language === 'bn' ? 'পেশা উল্লেখ নেই' : 'No title set')}
          </p>
          {(row.current_organization || location) && (
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 truncate">
              {row.current_organization && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{row.current_organization}</span>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {selectedJob && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
          <Target className="w-3 h-3" />
          <span className="truncate">
            {language === 'bn' ? `জবের সাথে ম্যাচ: ${selectedJob.category_label}` : `Matching job: ${selectedJob.category_label}`}
          </span>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((s, i) => {
            const isVerified = (row.verified_skills ?? []).some((v) => v.toLowerCase() === s.toLowerCase());
            return (
              <span
                key={`${s}-${i}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isVerified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {isVerified && <ShieldCheck className="w-3 h-3" />}
                {titleCase(s)}
              </span>
            );
          })}
          {declaredTopup.map((s, i) => (
            <span
              key={`dec-${s}-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white border-slate-200 text-slate-600"
            >
              {titleCase(s)}
            </span>
          ))}
          {((row.verified_skills?.length ?? 0) + (row.declared_skills?.length ?? 0)) > skills.length + declaredTopup.length && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              +{Math.max(0, ((row.verified_skills?.length ?? 0) + (row.declared_skills?.length ?? 0)) - (skills.length + declaredTopup.length))}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}</p>
          <p className="text-slate-900 font-black mt-0.5">{exp} {language === 'bn' ? 'বছর' : 'yrs'}</p>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'যাচাইকৃত' : 'Verified'}</p>
          <p className="text-emerald-700 font-black mt-0.5">{row.verified_skill_count ?? 0}</p>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{language === 'bn' ? 'সার্টিফিকেট' : 'Certs'}</p>
          <p className="text-slate-900 font-black mt-0.5">{row.certificate_count ?? 0}</p>
        </div>
      </div>

      {edu && (
        <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 truncate">
          <GraduationCap className="w-3 h-3 shrink-0" />
          <span className="truncate">{edu}</span>
        </p>
      )}


      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onView(row)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-[11px] shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'প্রোফাইল' : 'View'}</span>
        </button>

        <button
          type="button"
          onClick={() => onViewMore(row)}
          title={language === 'bn' ? 'SkillProof /verify তে সম্পূর্ণ যাচাইকৃত CV দেখুন' : 'Open full verified CV on SkillProof /verify'}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-[11px]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'bn' ? 'আরও দেখুন' : 'View more'}</span>
        </button>

        <button
          type="button"
          onClick={() => onMessage(row)}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-[11px]"
          title={language === 'bn' ? 'প্রার্থীকে বার্তা পাঠান' : 'Message the candidate'}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{language === 'bn' ? 'বার্তা' : 'Message'}</span>
        </button>
        {selectedJob ? (
          inviteDone ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] cursor-default"
              title={
                inviteStatus === 'accepted'
                  ? (language === 'bn' ? 'প্রার্থী গ্রহণ করেছেন' : 'Candidate accepted')
                  : inviteStatus === 'declined'
                    ? (language === 'bn' ? 'প্রার্থী প্রত্যাখ্যান করেছেন' : 'Candidate declined')
                    : (language === 'bn' ? 'ইনভাইট পাঠানো হয়েছে' : 'Invite sent')
              }
            >
              {inviting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {inviteStatus === 'accepted'
                  ? (language === 'bn' ? 'গৃহীত' : 'Accepted')
                  : inviteStatus === 'declined'
                    ? (language === 'bn' ? 'প্রত্যাখ্যান' : 'Declined')
                    : (language === 'bn' ? 'পাঠানো হয়েছে' : 'Sent')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={inviting}
              onClick={() => onInvite(row)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-[#E31B23]/40 hover:bg-red-50 text-[#E31B23] font-bold text-[11px] disabled:opacity-60"
              title={language === 'bn' ? 'প্রার্থীকে ইনভাইট পাঠান' : 'Send invite to candidate'}
            >
              {inviting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{language === 'bn' ? 'ইনভাইট' : 'Invite'}</span>
            </button>
          )
        ) : (
          <button
            type="button"
            disabled
            title={language === 'bn' ? 'জব নির্বাচন করুন' : 'Select a job first'}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-[11px] cursor-not-allowed opacity-80"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইনভাইট' : 'Invite'}</span>
          </button>
        )}
      </div>
    </div>
  );
};


export const CompanyCandidatesPage: React.FC = () => {
  const { language } = useLanguage();
  const { isApproved } = useCompanyAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [skill, setSkill] = useState<string>('');
  const [skillCategory, setSkillCategory] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [minExperience, setMinExperience] = useState<number>(0);
  const [education, setEducation] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subCategories, setSubCategories] = useState<Array<{ id: string; name: string; category_id: string }>>([]);
  const [sort, setSort] = useState<CandidateSort>('best_match');
  const [page, setPage] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  const [rows, setRows] = useState<CandidateListRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null);
  const [activeJobMatch, setActiveJobMatch] = useState<number | null>(null);
  const [activeAiScore, setActiveAiScore] = useState<number | null>(null);
  const [activeAiSource, setActiveAiSource] = useState<string | null>(null);

  const [inviteMap, setInviteMap] = useState<Record<string, CandidateInviteStatus>>({});
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteToast, setInviteToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isApproved) return;
    let cancelled = false;
    (async () => {
      try {
        const [res, cats] = await Promise.all([
          listCompanyJobs({ status: 'published', limit: 100 }),
          listActiveCategories(),
        ]);
        if (cancelled) return;
        setJobs(res.rows);
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      } catch {
        if (!cancelled) {
          setJobs([]);
          setCategories([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isApproved]);

  useEffect(() => {
    if (!category) {
      setSubCategories([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const subs = await listActiveSubCategories(category);
        if (cancelled) return;
        setSubCategories(subs.map((s) => ({ id: s.id, name: s.name, category_id: s.category_id })));
      } catch {
        if (!cancelled) setSubCategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, [category]);

  const loadInvitesForJob = useCallback(async (currentJobId: string | null) => {
    if (!currentJobId) {
      setInviteMap({});
      return;
    }
    try {
      const { rows: inviteRows } = await listCompanyInvites(null, 200, 0);
      const filtered = inviteRows.filter((r) => r.job_id === currentJobId);
      const next: Record<string, CandidateInviteStatus> = {};
      filtered.forEach((r) => {
        next[r.candidate_profile_id] = r.status;
      });
      setInviteMap(next);
    } catch {
      setInviteMap({});
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchCompanyCandidates({
        search: debouncedSearch,
        skill: skill.trim(),
        skillCategory: skillCategory || '',
        category: category.trim(),
        location: location.trim(),
        minExperience,
        education: education.trim(),
        jobId: jobId || null,
        sort,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRows(res.rows);
      setTotal(res.total);
      void loadInvitesForJob(jobId || null);
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'লোড ব্যর্থ' : 'Failed to load candidates'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch, skill, skillCategory, category, location,
    minExperience, education, jobId, sort, page, language, loadInvitesForJob,
  ]);

  useEffect(() => { setPage(0); }, [debouncedSearch, skill, skillCategory, category, subCategory, location, minExperience, education, jobId, sort]);

  useEffect(() => { void load(); }, [load]);

  const clearFilters = () => {
    setSearch('');
    setSkill('');
    setSkillCategory('');
    setCategory('');
    setSubCategory('');
    setLocation('');
    setMinExperience(0);
    setEducation('');
    setSort('best_match');
  };

  const hasActiveFilters =
    !!search || !!skill || !!skillCategory || !!category || !!subCategory || !!location || minExperience > 0 || !!education;

  const openProfile = (row: CandidateListRow) => {
    setActiveProfileId(row.profile_id);
    setActiveProfileName(row.full_name);
    setActiveJobMatch(row.match_score ?? null);
    setActiveAiScore(row.ai_match_score ?? null);
    setActiveAiSource(row.ai_match_source ?? null);
  };
  const closeProfile = () => {
    setActiveProfileId(null);
    setActiveProfileName(null);
    setActiveJobMatch(null);
    setActiveAiScore(null);
    setActiveAiSource(null);
  };

  const handleMessage = (row: CandidateListRow) => {
    navigate(`/company/messages?with=${encodeURIComponent(row.profile_id)}`);
  };

  const jobOptions = useMemo(() => {
    const active = jobs.filter((j) => j.status !== 'closed');
    return active;
  }, [jobs]);

  const selectedJob = useMemo(() => {
    if (!jobId) return null;
    return jobOptions.find((j) => j.id === jobId) ?? null;
  }, [jobOptions, jobId]);

  const hasJobSelected = !!jobId;

  const handleInvite = async (row: CandidateListRow) => {
    if (!jobId) {
      setInviteToast({
        kind: 'err',
        text: language === 'bn'
          ? 'ইনভাইট পাঠাতে আগে একটি জব নির্বাচন করুন।'
          : 'Select a job before sending an invite.',
      });
      return;
    }
    setInvitingId(row.profile_id);
    try {
      const result = await createCandidateInvite(jobId, row.profile_id);
      if (result.result === 'ok') {
        setInviteMap((prev) => ({ ...prev, [row.profile_id]: (result.status ?? 'pending') as CandidateInviteStatus }));
        setInviteToast({
          kind: 'ok',
          text: result.already_pending
            ? (language === 'bn' ? 'ইনভাইট ইতোমধ্যে পাঠানো আছে' : 'Invite already sent')
            : (language === 'bn' ? 'ইনভাইট পাঠানো হয়েছে' : 'Invite sent'),
        });
      } else if (result.result === 'forbidden') {
        setInviteToast({
          kind: 'err',
          text: language === 'bn'
            ? 'আপনার কোম্পানি এই জবটির মালিক নয়।'
            : 'Your company does not own this job.',
        });
      } else {
        setInviteToast({
          kind: 'err',
          text: language === 'bn'
            ? 'ইনভাইট পাঠানো যায়নি — আবার চেষ্টা করুন।'
            : 'Could not send invite — please try again.',
        });
      }
    } catch (e: any) {
      setInviteToast({
        kind: 'err',
        text: e?.message ?? (language === 'bn' ? 'ইনভাইট ব্যর্থ' : 'Invite failed'),
      });
    } finally {
      setInvitingId(null);
      setTimeout(() => setInviteToast(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {language === 'bn' ? 'ক্যান্ডিডেট অনুসন্ধান' : 'Candidate Search'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {language === 'bn'
                  ? 'SkillProof-এর যাচাইকৃত পেশাদার প্রার্থীদের খুঁজুন'
                  : 'Search verified SkillProof professional candidates'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {inviteToast && (
        <div
          role="status"
          className={`rounded-2xl border px-3 py-2 text-[11px] flex items-center gap-2 ${
            inviteToast.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {inviteToast.kind === 'ok' ? (
            <Award className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          <span>{inviteToast.text}</span>
        </div>
      )}

      {!isApproved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          {language === 'bn' ? 'ক্যান্ডিডেট অনুসন্ধান শুধুমাত্র যাচাইকৃত কোম্পানির জন্য উপলব্ধ।' : 'Candidate Search is only available to approved companies.'}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'নাম, পেশা, সংক্ষেপ…' : 'Search name, profession, summary…'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition"
            />
            {search.length > 0 && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
            >
              <option value="">{language === 'bn' ? 'সব প্রার্থী' : 'All Candidates'}</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {language === 'bn' ? `জব: ${j.title}` : `Job: ${j.title}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                filtersOpen || hasActiveFilters
                  ? 'bg-red-50 border-red-200 text-[#E31B23]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CandidateSort)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23]"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {language === 'bn' ? CANDIDATE_SORT_LABELS[s].bn : CANDIDATE_SORT_LABELS[s].en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasJobSelected && selectedJob && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-800">
            <Target className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">
                {language === 'bn'
                  ? `জব নির্বাচিত: ${selectedJob.title}`
                  : `Job selected: ${selectedJob.title}`}
              </p>
              <p className="mt-0.5">
                {language === 'bn'
                  ? `ক্যাটাগরি ${selectedJob.category_label}${selectedJob.sub_category_label ? ` › ${selectedJob.sub_category_label}` : ''} — প্রার্থীদের যাচাইকৃত দক্ষতার ভিত্তিতে র‍্যাংক করা হচ্ছে।`
                  : `Category ${selectedJob.category_label}${selectedJob.sub_category_label ? ` › ${selectedJob.sub_category_label}` : ''} — ranking candidates by verified skills first.`}
              </p>
            </div>
          </div>
        )}

        {filtersOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'দক্ষতা' : 'Skill'}
              </label>
              <input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: React' : 'e.g. React'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'দক্ষতার ধরন' : 'Skill category'}
              </label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value="">{language === 'bn' ? 'সব' : 'All'}</option>
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {language === 'bn' ? c.bn : c.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'ক্যারিয়ার ক্যাটাগরি' : 'Career category'}
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubCategory('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value="">{language === 'bn' ? 'সব' : 'All'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'সাব-ক্যাটাগরি' : 'Sub-category'}
              </label>
              <select
                value={subCategory}
                disabled={!category || subCategories.length === 0}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] disabled:opacity-50"
              >
                <option value="">{language === 'bn' ? 'সব' : 'All'}</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.name}>{sc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'লোকেশন' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={language === 'bn' ? 'জেলা / বিভাগ / দেশ' : 'District / division / country'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'সর্বনিম্ন অভিজ্ঞতা' : 'Min experience'}
              </label>
              <select
                value={minExperience}
                onChange={(e) => setMinExperience(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              >
                <option value={0}>{language === 'bn' ? 'যেকোনো' : 'Any'}</option>
                <option value={1}>1+</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={5}>5+</option>
                <option value={8}>8+</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'bn' ? 'শিক্ষা' : 'Education'}
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder={language === 'bn' ? 'ডিগ্রি / প্রতিষ্ঠান' : 'Degree / institution'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
              />
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                  <span>{language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-black text-slate-700">
              {language === 'bn' ? 'কোনো প্রার্থী পাওয়া যায়নি' : 'No matching candidates found.'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {language === 'bn'
                ? 'ফিল্টার বা সার্চ কমিয়ে আবার চেষ্টা করুন।'
                : 'Try removing some filters or broadening your search.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
              >
                <X className="w-3.5 h-3.5" />
                {language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 mb-3">
              {language === 'bn'
                ? `মোট ${total} জন প্রার্থী${hasJobSelected ? ' — যাচাইকৃত দক্ষতা অনুযায়ী র‍্যাংক করা হয়েছে' : ''}`
                : `${total} candidate${total === 1 ? '' : 's'} found${hasJobSelected ? ' — ranked by verified skills first' : ''}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => (
                <CandidateCard
                  key={row.profile_id}
                  row={row}
                  language={language}
                  selectedJob={selectedJob}
                  inviteStatus={inviteMap[row.profile_id] ?? null}
                  inviting={invitingId === row.profile_id}
                  onView={(r) => openProfile(r)}
                  onViewMore={(r) => openProfile(r)}
                  onInvite={(r) => handleInvite(r)}
                  onMessage={handleMessage}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {language === 'bn'
                    ? `পৃষ্ঠা ${page + 1} / ${totalPages} · মোট ${total}`
                    : `Page ${page + 1} of ${totalPages} · ${total} total`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পূর্ববর্তী' : 'Prev'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40"
                  >
                    <span>{language === 'bn' ? 'পরবর্তী' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CandidateProfileModal
        profileId={activeProfileId}
        fullName={activeProfileName}
        jobMatchScore={activeJobMatch}
        aiMatchScore={activeAiScore}
        aiMatchSource={activeAiSource}
        onClose={closeProfile}
      />

      {isApproved && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#E31B23] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-700">
              {language === 'bn' ? 'র‍্যাংকিং নিয়ম' : 'Ranking rules'}
            </p>
            <p className="mt-0.5">
              {language === 'bn'
                ? 'জব নির্বাচন করলে প্রার্থীদের র‍্যাংকিং: (১) যাচাইকৃত দক্ষতার সাথে মিল, (২) ঘোষিত দক্ষতার সাথে মিল, (৩) একই ক্যাটাগরিতে যাচাইকৃত দক্ষতার সংখ্যা, (৪) গড় যাচাই স্কোর, (৫) মোট যাচাইকৃত দক্ষতার সংখ্যা।'
                : 'With a job selected, candidates rank by: (1) verified skill matches, (2) declared skill matches, (3) verified skills inside the job category/sub-category, (4) average verification score, (5) total verified skill count.'}
            </p>
            <p className="mt-1">
              <Link to="/company/dashboard" className="text-[#E31B23] hover:underline font-bold">
                {language === 'bn' ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to dashboard'}
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyCandidatesPage;