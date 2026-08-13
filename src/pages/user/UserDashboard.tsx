import React, { useEffect, useState, type Key as ReactKey } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, Bot, Calendar, ClipboardList, ExternalLink, FileText, GraduationCap,
  Hash, Lock, ShieldCheck, Sparkles, Star, TrendingUp, Rocket, ArrowRight, X, AlertTriangle,
} from 'lucide-react';
import { PassportCard } from '../../components/passport/PassportCard';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { listMyAssessments } from '../../services/assessments';
import {
  daysUntilPassportExpiry, getActivePassportForUser, getMyPassports,
  isPassportExpired,
} from '../../services/passports';
import { listMyRoadmapEnrollments } from '../../services/roadmaps';
import { listActiveJobs, listMyApplications } from '../../services/jobs';
import { listMySkillVerificationSubmissions } from '../../services/skillVerification';
import { getMyCertificates } from '../../services/courseCertificates';
import { useRealtimeRefresh } from '../../services/realtime';
import {
  getMyInterviewStats,
  type InterviewStats,
} from '../../services/interview';
import type {
  CareerRoadmapEnrollment, CourseCertificate, Job, JobApplication, Profile,
  SkillPassport, SkillVerificationMySubmission, UniversalAssessment,
} from '../../types/database';
import { getMyProfile } from '../../services/profile';
import { ActivityTimeline } from '../../components/layout/ActivityTimeline';
import { AICareerMentorCard } from '../../components/dashboard/AICareerMentorCard';
import { BrandBadge } from '../../components/brand';

export const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unsubscribe: cancelSubscription, isLoading: cancellingSubscription, session } = useSubscription();
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [featuredPassport, setFeaturedPassport] = useState<SkillPassport | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assessments, setAssessments] = useState<UniversalAssessment[]>([]);
  const [verificationSubs, setVerificationSubs] = useState<SkillVerificationMySubmission[]>([]);
  const [enrollments, setEnrollments] = useState<CareerRoadmapEnrollment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [interviewStats, setInterviewStats] = useState<InterviewStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unsubscribeModalOpen, setUnsubscribeModalOpen] = useState(false);
  const [unsubscribeError, setUnsubscribeError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [p, featured, prof, a, v, r, j, apps, certs] = await Promise.all([
      getMyPassports(),
      getActivePassportForUser().catch(() => null),
      getMyProfile().catch(() => null),
      listMyAssessments(),
      listMySkillVerificationSubmissions().catch(() => []),
      listMyRoadmapEnrollments(),
      listActiveJobs(),
      listMyApplications(),
      getMyCertificates().catch(() => []),
    ]);
    setPassports(p); setFeaturedPassport(featured); setProfile(prof);
    setAssessments(a);
    setVerificationSubs(v);
    setEnrollments(r); setJobs(j); setApplications(apps);
    setCertificates(certs);
    setLoaded(true);
  };

  const loadInterviewStats = async () => {
    try {
      const s = await getMyInterviewStats();
      setInterviewStats(s);
    } catch {
      
      
    }
  };

  useEffect(() => { loadInterviewStats(); }, [user]);

  useEffect(() => { load(); }, [user]);
  useRealtimeRefresh(
    ['skill_passports', 'passport_renewal_history', 'passport_level_history',
     'universal_assessments', 'universal_submissions',
     'skill_verification_submissions', 'skill_verification_tasks',
     'career_roadmap_enrollment', 'career_roadmap_modules', 'career_roadmap_progress',
     'roadmap_completion_requests',
     'roadmap_module_exams', 'roadmap_module_exam_submissions',
     'jobs', 'job_applications',
     'course_certificates', 'certificate_action_history',
     
     
     'interview_sessions',
     
     
     
     
     
     
     'career_ai_reports', 'job_match_results'],
    load,
  );

  
  
  useRealtimeRefresh('interview_sessions', loadInterviewStats);

  const pendingAssessment = assessments.find((a) => a.status === 'Pending');
  const activePassports = passports.filter((p) => p.status === 'active' && !isPassportExpired(p));
  const pendingPassports = passports.filter((p) => p.status === 'pending_approval');
  const expiredPassports = passports.filter((p) => p.status === 'active' && isPassportExpired(p));
  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const activeCertificates = certificates.filter((c) => c.status === 'Active');
  const revokedCertificates = certificates.filter((c) => c.status === 'Revoked');
  const featured = activeEnrollments[0];
  const featuredCert = activeCertificates[0] ?? null;

  const reviewedCount = verificationSubs.filter(
    (row) => row.status === 'Passed' || row.status === 'Failed',
  ).length;
  const pendingReviewCount = verificationSubs.filter(
    (row) => row.status === 'Submitted' || row.status === 'Under Review',
  ).length;
  const recentVerificationSubs = verificationSubs.slice(0, 4);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const handleConfirmUnsubscribe = async () => {
    setUnsubscribeError(null);
    const result = await cancelSubscription();
    if (result.ok === false) {
      setUnsubscribeError(result.error);
      return;
    }
    setUnsubscribeModalOpen(false);
    navigate('/subscription', { replace: true });
  };

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-brand-lg border border-brand-border bg-white px-5 sm:px-6 py-6 sm:py-7 shadow-brand-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[radial-gradient(circle,_rgba(227,27,35,0.10),_transparent_70%)] blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.10),_transparent_70%)] blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
            <Link
              to="/dashboard/profile?tab=edit"
              className="hidden h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 transition hover:ring-[#F97316] sm:flex items-center justify-center"
              aria-label="Edit profile picture"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || 'Profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-lg font-black text-white">
                  {(user?.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
                <Sparkles className="w-3 h-3" /> Welcome back
              </span>
              <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 break-words">
                Hello, <span className="bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] bg-clip-text text-transparent">{firstName}</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-xl">
                Build your verified skill profile. Earn industry passports. Land jobs that match what you can actually do.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/dashboard/verify"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/25 transition-all whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5" />
              Continue verification
            </Link>
            <Link
              to="/dashboard/passport"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#E31B23] text-slate-800 font-bold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E31B23]" />
              My passport
            </Link>
            <Link
              to="/dashboard/skillproof-ml"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-fuchsia-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-fuchsia-500/25 transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Career Intelligence
            </Link>
            {session && (
              <button
                type="button"
                onClick={() => {
                  setUnsubscribeError(null);
                  setUnsubscribeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-rose-200 hover:border-rose-500 hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-bold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap"
                aria-label="Cancel SkillProof subscription"
              >
                <X className="w-3.5 h-3.5" />
                Unsubscribe
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingAssessment && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <Lock size={18} className="text-yellow-700 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">You have an active assessment for <strong>{pendingAssessment.skill_name}</strong>.</span>
          </div>
          <Link to="/dashboard/verify" className="rounded bg-yellow-600 px-3 py-1.5 text-white self-start sm:self-auto shrink-0">Resume</Link>
        </div>
      )}

      {featuredPassport && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldCheck className="shrink-0 text-[#E31B23]" size={18} />
              <span className="truncate">{featuredPassport.status === 'pending_approval' ? 'Passport Pending Approval' : 'Your Skill Passport'}</span>
            </h2>
            <Link to="/dashboard/passport" className="shrink-0 text-xs font-semibold text-[#E31B23] hover:underline whitespace-nowrap inline-flex items-center gap-1">
              View full passport <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <PassportCard passport={featuredPassport} profile={profile} mode="compact" />
          {featuredPassport.expiry_date && (
            <PassportExpiryStrip passport={featuredPassport} />
          )}
        </div>
      )}

      {featuredCert && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
              <GraduationCap className="shrink-0 text-[#F97316]" size={18} />
              <span className="truncate">Your Course Completion Certificate</span>
            </h2>
            <Link to="/dashboard/passport?tab=certificates" className="shrink-0 text-xs font-semibold text-[#E31B23] hover:underline whitespace-nowrap inline-flex items-center gap-1">
              View all certificates <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <FeaturedCertStrip cert={featuredCert} />
        </div>
      )}

      {}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={Award}
          label="Active Passports"
          value={activePassports.length}
          tone="emerald"
          loading={!loaded}
        />
        <MetricCard
          icon={FileText}
          label="Pending Passports"
          value={pendingPassports.length}
          tone="amber"
          loading={!loaded}
        />
        <MetricCard
          icon={GraduationCap}
          label="Active Certificates"
          value={activeCertificates.length}
          tone="violet"
          loading={!loaded}
        />
        <MetricCard
          icon={ClipboardList}
          label="My Verifications"
          value={verificationSubs.length}
          tone="brand"
          loading={!loaded}
        />
      </div>

      {}
      {false && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow">
                <Bot size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Interview Statistics</h2>
                <p className="text-[11px] text-slate-600">Your SkillProof AI interview performance at a glance.</p>
              </div>
            </div>
            <Link
              to="/dashboard/interview-history"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              View all →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatsTile
              icon={Bot}
              label="Total Interviews"
              value={interviewStats?.total_sessions ?? 0}
              tone="indigo"
            />
            <StatsTile
              icon={TrendingUp}
              label="Average Score"
              value={interviewStats?.average_score != null ? Math.round(interviewStats.average_score) : null}
              suffix={interviewStats?.average_score != null ? '/100' : ''}
              tone={scoreTone(interviewStats?.average_score ?? null)}
            />
            <StatsTile
              icon={Star}
              label="Best Score"
              value={interviewStats?.best_score ?? null}
              suffix={interviewStats?.best_score != null ? '/100' : ''}
              tone={scoreTone(interviewStats?.best_score ?? null)}
            />
            <StatsTile
              icon={Calendar}
              label="Last Interview"
              value={interviewStats?.last_evaluated_at
                ? new Date(interviewStats.last_evaluated_at).toLocaleDateString()
                : '—'}
              tone="slate"
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-1">
          <AICareerMentorCard />
        </div>
        <div className="rounded-brand-lg border border-slate-200 bg-white p-4 sm:p-6 md:col-span-1 lg:col-span-1 min-w-0 shadow-brand-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900 min-w-0 truncate">My Skill Verifications</h2>
            <Link to="/dashboard/verify" className="text-xs font-semibold text-[#E31B23] hover:underline shrink-0 whitespace-nowrap inline-flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mb-3 text-xs text-slate-500 break-words">
            {reviewedCount} reviewed · {pendingReviewCount} awaiting review
          </p>
          <div className="space-y-2">
            {!loaded ? (
              <SkeletonRows count={2} />
            ) : recentVerificationSubs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No skill verification submissions yet.{' '}
                <Link to="/dashboard/verify" className="font-semibold text-[#E31B23] hover:underline">
                  Start one →
                </Link>
              </div>
            ) : (
              recentVerificationSubs.map((row) => (
                <VerificationCard key={row.id} row={row} />
              ))
            )}
          </div>
        </div>
        <div className="rounded-brand-lg border border-slate-200 bg-white p-4 sm:p-6 md:col-span-2 lg:col-span-1 min-w-0 shadow-brand-sm">
          <h2 className="mb-3 font-bold text-slate-900 flex items-center gap-1.5">
            <BriefcaseGate />
            Top Career Matches
          </h2>
          <div className="space-y-2">
            {!loaded ? (
              <SkeletonRows count={3} />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-slate-500">No active jobs yet.</p>
            ) : (
              jobs.slice(0, 5).map((j) => (
                <Link
                  key={j.id}
                  to="/dashboard/jobs"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 p-3 min-w-0 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{j.title}</p>
                    <p className="text-xs text-slate-500 truncate">{j.company_name} · {j.location}</p>
                  </div>
                  <BrandBadge
                    variant={applications.some((a) => a.job_id === j.id) ? 'verified' : 'info'}
                    className="shrink-0"
                  >
                    {applications.some((a) => a.job_id === j.id) ? 'Applied' : 'View'}
                  </BrandBadge>
                </Link>
              ))
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h2 className="mb-3 font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#F97316]" />
              My Roadmaps
            </h2>
            {!loaded ? (
              <SkeletonRows count={1} />
            ) : featured ? (
              <div>
                <p className="font-bold text-slate-900 truncate">{featured.title}</p>
                <p className="text-xs text-slate-500">{featured.completed_count}/{featured.total_days} days complete</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#E31B23] to-[#F97316] transition-all"
                    style={{ width: `${featured.total_days ? (featured.completed_count / featured.total_days) * 100 : 0}%` }}
                  />
                </div>
                {activeEnrollments.length > 1 && (
                  <p className="mt-2 text-xs text-slate-500">+ {activeEnrollments.length - 1} more active</p>
                )}
                <Link
                  to="/dashboard/roadmap"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#E31B23] hover:underline"
                >
                  Open roadmap <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                <p>No active roadmap.</p>
                <Link to="/dashboard/roadmap" className="mt-2 inline-flex items-center gap-1 font-bold text-[#E31B23] hover:underline">
                  Browse the library <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityTimeline limit={20} title="Your activity" />

      <UnsubscribeModal
        open={unsubscribeModalOpen}
        loading={cancellingSubscription}
        error={unsubscribeError}
        onCancel={() => {
          if (cancellingSubscription) return;
          setUnsubscribeModalOpen(false);
          setUnsubscribeError(null);
        }}
        onConfirm={handleConfirmUnsubscribe}
      />
    </div>
  );
};


function UnsubscribeModal({
  open,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsubscribe-modal-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-brand-lg shadow-brand-lg border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="h-1 w-full"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="unsubscribe-modal-title"
                className="text-base sm:text-lg font-black text-slate-900"
              >
                Cancel Subscription?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Are you sure you want to cancel your SkillProof subscription?
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-rose-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Cancelling…
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Yes, Unsubscribe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function BriefcaseGate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#E31B23]" aria-hidden="true">
      <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function PassportExpiryStrip({ passport }: { passport: SkillPassport }) {
  const days = daysUntilPassportExpiry(passport);
  if (days == null) return null;
  const expired = days < 0;
  const tone = expired
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : days < 30
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border px-4 py-2 text-sm ${tone}`}>
      <span className="min-w-0 break-words">
        {expired
          ? `Passport expired ${Math.abs(days)} days ago on ${new Date(passport.expiry_date!).toLocaleDateString()}.`
          : `${days} days until expiry on ${new Date(passport.expiry_date!).toLocaleDateString()}.`}
      </span>
      {expired ? (
        <Link to="/dashboard/passport" className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 whitespace-nowrap">
          <Sparkles size={12} /> Request Renewal
        </Link>
      ) : days < 30 ? (
        <Link to="/dashboard/passport" className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 whitespace-nowrap">
          <Sparkles size={12} /> Renew soon
        </Link>
      ) : null}
    </div>
  );
}


function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'violet' | 'brand' | 'slate';
  loading?: boolean;
}) {
  const toneMap: Record<string, { bg: string; icon: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600', ring: 'ring-emerald-200' },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-gradient-to-br from-amber-500 to-amber-600',     ring: 'ring-amber-200' },
    violet:  { bg: 'bg-violet-50',  icon: 'bg-gradient-to-br from-violet-500 to-violet-600',   ring: 'ring-violet-200' },
    brand:   { bg: 'bg-red-50',     icon: 'bg-gradient-to-br from-[#E31B23] to-[#F97316]',     ring: 'ring-red-200' },
    slate:   { bg: 'bg-slate-50',   icon: 'bg-gradient-to-br from-slate-500 to-slate-600',     ring: 'ring-slate-200' },
  };
  const t = toneMap[tone] ?? toneMap.slate;
  return (
    <div className={`relative overflow-hidden rounded-brand-lg border border-slate-200 bg-white p-4 shadow-brand-sm hover:shadow-brand-md transition-shadow ${t.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {loading ? <span className="inline-block w-8 h-7 rounded bg-slate-200 animate-pulse" /> : value}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl ${t.icon} text-white p-2 shadow-sm`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}


function scoreTone(s: number | null): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (s == null) return 'slate';
  if (s >= 70) return 'emerald';
  if (s >= 40) return 'amber';
  return 'rose';
}

function StatsTile({
  icon: Icon,
  label,
  value,
  suffix = '',
  tone = 'slate',
}: {
  icon: any;
  label: string;
  value: number | string | null;
  suffix?: string;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const toneBg: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-500',
  };
  const display = value == null || value === '' ? '—' : value;
  return (
    <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`rounded p-1.5 ${toneBg[tone]}`}>
          <Icon size={12} className="text-white" />
        </div>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-extrabold leading-none text-slate-900">
        {display}
        {suffix && value != null && value !== '' ? <span className="text-xs text-slate-400">{suffix}</span> : null}
      </p>
    </div>
  );
}

function VerificationCard({ row, key: _key }: { row: SkillVerificationMySubmission; key?: ReactKey }) {
  const max = row.task_max_marks ?? 10;
  const reviewed = row.status === 'Passed' || row.status === 'Failed';
  const variant =
    row.status === 'Passed' ? 'verified' :
    row.status === 'Failed' ? 'failed' :
    row.status === 'Under Review' ? 'review' :
    'pending';
  const label = reviewed && row.score != null ? `${row.status} · ${row.score}/${max}` : row.status;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{row.task_title || 'Untitled assessment'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            {row.category_name && (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700 font-bold">{row.category_name}</span>
            )}
            {row.sub_category_name && (
              <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-indigo-700 font-bold">{row.sub_category_name}</span>
            )}
            <span>{new Date(row.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <BrandBadge variant={variant as any} className="shrink-0">
          {label}
        </BrandBadge>
      </div>
      {reviewed && (
        <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600">
          {row.feedback && <p className="line-clamp-2"><span className="font-bold">Feedback:</span> {row.feedback}</p>}
          {row.reviewed_at && (
            <p className="text-[11px] text-slate-500">
              Reviewed {new Date(row.reviewed_at).toLocaleDateString()}
              {row.reviewed_by_full_name ? ` by ${row.reviewed_by_full_name}` : ''}
            </p>
          )}
          {row.project_url && (
            <a href={row.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E31B23] hover:underline">
              <ExternalLink size={10} /> Project link
            </a>
          )}
        </div>
      )}
    </div>
  );
}


function FeaturedCertStrip({ cert }: { cert: CourseCertificate }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 text-sm shadow-sm">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {cert.user_avatar_url ? (
          <img src={cert.user_avatar_url} alt={cert.user_full_name} className="h-10 w-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-600 text-sm font-bold text-white">
            {cert.user_full_name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 truncate">{cert.roadmap_title}</p>
          <p className="text-[11px] text-slate-500 break-words sm:truncate">
            <Hash className="inline w-3 h-3" /> {cert.credential_number}
            {cert.category_name ? ` · ${cert.category_name}` : ''}
            {cert.completion_date ? ` · Completed ${new Date(cert.completion_date).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <a
          href={`/certificate/${encodeURIComponent(cert.credential_number)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1 text-[11px] font-bold text-white hover:opacity-95 whitespace-nowrap"
        >
          <ExternalLink size={11} /> View
        </a>
        <Link to="/dashboard/passport?tab=certificates" className="text-[11px] font-semibold text-[#E31B23] hover:underline whitespace-nowrap">
          All certificates →
        </Link>
      </div>
    </div>
  );
}

export default UserDashboard;
