import { useEffect, useState, type Key as ReactKey } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, ClipboardList, ExternalLink, FileText, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { PassportCard } from '../../components/passport/PassportCard';
import { useAuth } from '../../context/AuthContext';
import { listMyAssessments } from '../../services/assessments';
import {
  daysUntilPassportExpiry, getActivePassportForUser, getMyPassports,
  isPassportExpired,
} from '../../services/passports';
import { listMyRoadmapEnrollments } from '../../services/roadmaps';
import { listActiveJobs, listMyApplications } from '../../services/jobs';
import { listMySkillVerificationSubmissions } from '../../services/skillVerification';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  CareerRoadmapEnrollment, Job, JobApplication, Profile,
  SkillPassport, SkillVerificationMySubmission, UniversalAssessment,
} from '../../types/database';
import { getMyProfile } from '../../services/profile';
import { ActivityTimeline } from '../../components/layout/ActivityTimeline';

export const UserDashboard = () => {
  const { user } = useAuth();
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [featuredPassport, setFeaturedPassport] = useState<SkillPassport | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assessments, setAssessments] = useState<UniversalAssessment[]>([]);
  const [verificationSubs, setVerificationSubs] = useState<SkillVerificationMySubmission[]>([]);
  const [enrollments, setEnrollments] = useState<CareerRoadmapEnrollment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  const load = async () => {
    if (!user) return;
    const [p, featured, prof, a, v, r, j, apps] = await Promise.all([
      getMyPassports(),
      getActivePassportForUser().catch(() => null),
      getMyProfile().catch(() => null),
      listMyAssessments(),
      listMySkillVerificationSubmissions().catch(() => []),
      listMyRoadmapEnrollments(),
      listActiveJobs(),
      listMyApplications(),
    ]);
    setPassports(p); setFeaturedPassport(featured); setProfile(prof);
    setAssessments(a);
    setVerificationSubs(v);
    setEnrollments(r); setJobs(j); setApplications(apps);
  };

  useEffect(() => { load(); }, [user]);
  useRealtimeRefresh(
    ['skill_passports', 'passport_renewal_history', 'passport_level_history',
     'universal_assessments', 'universal_submissions',
     'skill_verification_submissions', 'skill_verification_tasks',
     'career_roadmap_enrollment', 'career_roadmap_modules', 'career_roadmap_progress',
     'jobs', 'job_applications'],
    load,
  );

  const pendingAssessment = assessments.find((a) => a.status === 'Pending');
  const activePassports = passports.filter((p) => p.status === 'active' && !isPassportExpired(p));
  const pendingPassports = passports.filter((p) => p.status === 'pending_approval');
  const expiredPassports = passports.filter((p) => p.status === 'active' && isPassportExpired(p));
  const activeEnrollments = enrollments.filter((e) => e.status === 'active');
  const featured = activeEnrollments[0];

  const reviewedCount = verificationSubs.filter(
    (row) => row.status === 'Passed' || row.status === 'Failed',
  ).length;
  const pendingReviewCount = verificationSubs.filter(
    (row) => row.status === 'Submitted' || row.status === 'Under Review',
  ).length;
  const recentVerificationSubs = verificationSubs.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.full_name?.split(' ')[0] || 'there'}</h1>
        <p className="text-sm opacity-90">Build your verified skill profile. Earn industry passports. Get hired.</p>
      </div>

      {pendingAssessment && (
        <div className="flex items-center justify-between rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm">
          <div className="flex items-center gap-2"><Lock size={18} className="text-yellow-700" /><span>You have an active assessment for <strong>{pendingAssessment.skill_name}</strong>.</span></div>
          <Link to="/dashboard/verify" className="rounded bg-yellow-600 px-3 py-1 text-white">Resume</Link>
        </div>
      )}

      {featuredPassport && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <ShieldCheck className="text-amber-500" size={18} />
              {featuredPassport.status === 'pending_approval' ? 'Passport Pending Approval' : 'Your Skill Passport'}
            </h2>
            <Link to="/dashboard/passport" className="text-xs text-blue-600 hover:underline">View full passport →</Link>
          </div>
          <PassportCard passport={featuredPassport} profile={profile} mode="compact" />
          {featuredPassport.expiry_date && (
            <PassportExpiryStrip passport={featuredPassport} />
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Award} label="Active Passports" value={activePassports.length} color="bg-emerald-500" />
        <Card icon={FileText} label="Pending Passports" value={pendingPassports.length} color="bg-amber-500" />
        <Card icon={ClipboardList} label="My Verifications" value={verificationSubs.length} color="bg-blue-500" />
        <Card icon={BookOpen} label="Active Roadmaps" value={activeEnrollments.length} color="bg-purple-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">My Skill Verifications</h2>
            <Link to="/dashboard/verify" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            {reviewedCount} reviewed · {pendingReviewCount} awaiting review
          </p>
          <div className="space-y-2">
            {recentVerificationSubs.length === 0 && (
              <div className="rounded border border-dashed bg-gray-50 p-4 text-sm text-gray-500">
                No skill verification submissions yet. <Link to="/dashboard/verify" className="text-blue-600 hover:underline">Start one →</Link>
              </div>
            )}
            {recentVerificationSubs.map((row) => (
              <VerificationCard key={row.id} row={row} />
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-3 font-semibold">Top Career Matches</h2>
          <div className="space-y-2">
            {jobs.slice(0, 5).map((j) => (
              <Link key={j.id} to="/dashboard/jobs" className="flex items-center justify-between rounded border bg-gray-50 p-3 hover:bg-gray-100">
                <div><p className="font-medium">{j.title}</p><p className="text-xs text-gray-500">{j.company_name} · {j.location}</p></div>
                <span className="text-xs text-gray-500">{applications.some((a) => a.job_id === j.id) ? 'Applied' : 'View'}</span>
              </Link>
            ))}
            {!jobs.length && <p className="text-sm text-gray-500">No active jobs yet.</p>}
          </div>

          <h2 className="mb-3 mt-6 font-semibold">My Roadmaps</h2>
          {featured ? (
            <div>
              <p className="font-medium">{featured.title}</p>
              <p className="text-xs text-gray-500">{featured.completed_count}/{featured.total_days} days complete</p>
              <div className="mt-2 h-2 rounded bg-gray-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${featured.total_days ? (featured.completed_count / featured.total_days) * 100 : 0}%` }} /></div>
              {activeEnrollments.length > 1 && <p className="mt-2 text-xs text-slate-500">+ {activeEnrollments.length - 1} more active</p>}
              <Link to="/dashboard/roadmap" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Open roadmap →</Link>
            </div>
          ) : (
            <div className="text-sm text-gray-500"><p>No active roadmap.</p><Link to="/dashboard/roadmap" className="mt-2 inline-block text-blue-600 hover:underline">Browse the library</Link></div>
          )}
        </div>
      </div>

      <ActivityTimeline limit={20} title="Your activity" />
    </div>
  );
};

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
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${tone}`}>
      <span>
        {expired
          ? `Passport expired ${Math.abs(days)} days ago on ${new Date(passport.expiry_date!).toLocaleDateString()}.`
          : `${days} days until expiry on ${new Date(passport.expiry_date!).toLocaleDateString()}.`}
      </span>
      {expired ? (
        <Link to="/dashboard/passport" className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">
          <Sparkles size={12} /> Request Renewal
        </Link>
      ) : days < 30 ? (
        <Link to="/dashboard/passport" className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600">
          <Sparkles size={12} /> Renew soon
        </Link>
      ) : null}
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
        <div className={`rounded p-2 ${color}`}><Icon size={18} className="text-white" /></div>
      </div>
    </div>
  );
}

function VerificationCard({ row, key: _key }: { row: SkillVerificationMySubmission; key?: ReactKey }) {
  const max = row.task_max_marks ?? 10;
  const statusClass =
    row.status === 'Passed' ? 'bg-emerald-100 text-emerald-700'
      : row.status === 'Failed' ? 'bg-red-100 text-red-700'
      : row.status === 'Under Review' ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';
  const reviewed = row.status === 'Passed' || row.status === 'Failed';
  const label = reviewed && row.score != null ? `${row.status} · ${row.score}/${max}` : row.status;
  return (
    <div className="rounded border bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.task_title || 'Untitled assessment'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            {row.category_name && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700">{row.category_name}</span>}
            {row.sub_category_name && <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-indigo-700">{row.sub_category_name}</span>}
            <span>{new Date(row.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass}`}>{label}</span>
      </div>
      {reviewed && (
        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs text-gray-600">
          {row.feedback && <p className="line-clamp-2"><span className="font-semibold">Feedback:</span> {row.feedback}</p>}
          {row.reviewed_at && (
            <p className="text-[11px] text-gray-500">
              Reviewed {new Date(row.reviewed_at).toLocaleDateString()}
              {row.reviewed_by_full_name ? ` by ${row.reviewed_by_full_name}` : ''}
            </p>
          )}
          {row.project_url && (
            <a href={row.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
              <ExternalLink size={10} /> Project link
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
