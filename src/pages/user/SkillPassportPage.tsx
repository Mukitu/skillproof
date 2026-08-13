import { useCallback, useEffect, useMemo, useState, type FormEvent, type Key as ReactKey } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, Award, Check, CheckCircle2, ChevronDown, Clock, Copy, ExternalLink, Flag, Link2, Loader2, Lock, Plus, RefreshCcw, Send, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { PassportCard } from '../../components/passport/PassportCard';
import { ShareToolbar } from '../../components/passport/ShareToolbar';
import { CertificateCard } from '../../components/certificate/CertificateCard';
import { CareerTimeline } from '../../components/passport/CareerTimeline';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  daysUntilPassportExpiry, getMyPassports, isPassportExpired,
  listEligibleCategoriesForUser, listMyPassportRenewals, requestPassportManually,
  requestPassportRenewal,
} from '../../services/passports';
import { getMyProfile, getMyProfileId, getMyPublicProfileId } from '../../services/profile';
import { listMyCareerTimeline } from '../../services/careerTimeline';
import {
  getMyCertificates,
} from '../../services/courseCertificates';
import { useRealtimeRefresh } from '../../services/realtime';
import { getPublicProfileUrl } from '../../utils/passportUrl';
import type {
  CareerTimelineEvent, CourseCertificate, PassportCategoryEligibility,
  PassportRenewalHistory, Profile, SkillPassport,
} from '../../types/database';

/** Pagination size for the Passport / Certificate lists. */
const PAGE_SIZE = 6;


export const SkillPassportPage = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: 'passports' | 'certificates' | 'timeline' =
    (['passports','certificates','timeline'].includes(searchParams.get('tab') ?? '')
      ? (searchParams.get('tab') as 'passports' | 'certificates' | 'timeline')
      : 'passports');

  const setActiveTab = useCallback((tab: 'passports' | 'certificates' | 'timeline') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'passports') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [eligibility, setEligibility] = useState<PassportCategoryEligibility[]>([]);
  const [renewals, setRenewals] = useState<PassportRenewalHistory[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<CareerTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [publicProfileCopied, setPublicProfileCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, prof, elig, ren, certs, publicPid] = await Promise.all([
        getMyPassports(),
        getMyProfile(),
        listEligibleCategoriesForUser().catch(() => []),
        listMyPassportRenewals().catch(() => []),
        getMyCertificates().catch(() => []),
        getMyPublicProfileId().catch(() => null),
      ]);
      setPassports(p);
      setProfile(prof);
      setEligibility(elig);
      setRenewals(ren);
      setCertificates(certs);
      setPublicProfileId(publicPid ?? ((prof as any)?.public_profile_id ?? null));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Could not load passport data.');
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    const pid = await getMyProfileId().catch(() => null);
    if (!pid) {
      setTimelineEvents([]);
      return;
    }
    setTimelineLoading(true);
    try {
      const events = await listMyCareerTimeline(pid);
      setTimelineEvents(events);
    } catch (err) {
      console.warn('[SkillPassportPage] timeline load failed:', err);
      setTimelineEvents([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (activeTab === 'timeline') void loadTimeline();
  }, [activeTab, loadTimeline]);
  useRealtimeRefresh(
    ['skill_passports', 'passport_renewal_history', 'passport_level_history',
     'skill_verification_submissions', 'roadmap_completion_requests',
     'roadmap_module_exams', 'roadmap_module_exam_submissions', 'roadmap_module_exam_attachments',
     'course_certificates', 'certificate_action_history',
     'career_timeline_events'],
    load,
  );
  useRealtimeRefresh(
    ['career_timeline_events'],
    loadTimeline,
  );

  // Deduplicate by passport.id (Supabase realtime can deliver the same row
  // twice in quick succession when both INSERT and UPDATE fire on the same
  // record). Then sort by created_at DESC (latest first) — services already
  // return that order, but we re-sort defensively.
  const sortedPassports = useMemo(() => {
    const seen = new Set<string>();
    const out: SkillPassport[] = [];
    for (const p of passports) {
      if (!p?.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    out.sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });
    return out;
  }, [passports]);

  // Active passports — every row that is `active` and NOT past expiry.
  const active = useMemo(
    () => sortedPassports.filter((p) => p.status === 'active' && !isPassportExpired(p)),
    [sortedPassports],
  );
  // Expired — still marked active in DB but past expiry_date.
  const expired = useMemo(
    () => sortedPassports.filter((p) => p.status === 'active' && isPassportExpired(p)),
    [sortedPassports],
  );
  // Pending approvals — newest first.
  const pending = useMemo(
    () => sortedPassports.filter((p) => p.status === 'pending_approval'),
    [sortedPassports],
  );
  // Rejected — newest first.
  const rejected = useMemo(
    () => sortedPassports.filter((p) => p.status === 'rejected'),
    [sortedPassports],
  );
  // Archived — newest first.
  const archived = useMemo(
    () => sortedPassports.filter(
      (p) => p.status !== 'active' && p.status !== 'pending_approval' && p.status !== 'rejected',
    ),
    [sortedPassports],
  );

  // Total visible passports (count chip on the tab)
  const totalPassports = sortedPassports.length;

  // The candidate's "primary" passport = most recent active Passport. Used
  // for the certificate card QR codes so scanning a course certificate's
  // QR lands on the candidate's full verified CV on /verify.
  const primaryPassportNumber = useMemo(() => {
    const live = sortedPassports.filter((p) => p.status === 'active' && !isPassportExpired(p));
    return (live[0] ?? sortedPassports[0])?.passport_number ?? null;
  }, [sortedPassports]);

  const request = async (categoryId: string, motivation: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await requestPassportManually(categoryId, motivation);
      // Multi-category semantics: the backend creates a NEW pending passport
      // for the requested category every time. The only time we should see
      // status === 'active' (and NOT 'pending_approval') is when the user
      // already has an active passport for this exact category.
      if (result.status === 'active') {
        setSuccess(
          `You already have an active ${result.main_category_name || ''} passport. ` +
          `You can request other categories instead.`,
        );
      } else {
        setSuccess(
          `Passport request submitted for ${result.main_category_name || 'this category'}. ` +
          `An admin will review it shortly.`,
        );
      }
      setShowRequest(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit passport request.');
    } finally {
      setBusy(false);
    }
  };

  const requestRenewal = async (passportId: string, notes: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await requestPassportRenewal(passportId, notes);
      setSuccess('Renewal request submitted. An admin will review it shortly.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not submit renewal request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-brand-lg border border-brand-border bg-white px-5 sm:px-6 py-5 shadow-brand-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
              <ShieldCheck className="w-3 h-3" /> Verified Passport
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">My Skill Passport</h1>
            <p className="mt-1 text-sm text-slate-500 break-words">
              Build a verified industry passport. Earn levels. Share with employers.
            </p>
          </div>
          {activeTab === 'passports' && (
            <button
              onClick={() => setShowRequest(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 whitespace-nowrap"
            >
              <Plus size={16} /> Request Passport
            </button>
          )}
        </div>
      </div>

      {}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex items-center gap-2 border-b border-slate-200 overflow-x-auto overscroll-contain">
        <button
          onClick={() => setActiveTab('passports')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'passports'
              ? 'border-[#E31B23] text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck size={16} /> Skill Passports
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {totalPassports}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'border-[#E31B23] text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award size={16} /> Course Certificates
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {certificates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-[#E31B23] text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Flag size={16} /> Career Timeline
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            {timelineEvents.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0" />{success}
        </div>
      )}

      {}
      {false && publicProfileId && activeTab === 'passports' ? (
        <ProfileIdBanner
          publicProfileId={publicProfileId}
          passportCount={totalPassports}
          copied={publicProfileCopied}
          onCopy={async () => {
            const url = getPublicProfileUrl(publicProfileId);
            try {
              if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
              } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
              setPublicProfileCopied(true);
              window.setTimeout(() => setPublicProfileCopied(false), 2000);
            } catch {
              setPublicProfileCopied(false);
            }
          }}
        />
      ) : null}

      {}
      {activeTab === 'passports' && (
        <>
      {}
      <PassportSection
        title={t('Active Passports', 'সক্রিয় পাসপোর্ট')}
        titleTone="text-emerald-700"
        passports={active}
        profile={profile}
        renewals={renewals}
        onRequestRenewal={requestRenewal}
        showShare
        showRenewalAction
        showExpiry
      />

      {}
      {expired.length > 0 && (
        <PassportSection
          title={t('Expired', 'মেয়াদোত্তীর্ণ')}
          titleTone="text-rose-700"
          tone="rose"
          passports={expired}
          profile={profile}
          renewals={renewals}
          onRequestRenewal={requestRenewal}
          showExpiry
          showRenewalAction
        />
      )}

      {}
      {pending.length > 0 && (
        <PassportSection
          title={t(`Pending Approval (${pending.length})`, `অনুমোদনের অপেক্ষায় (${pending.length})`)}
          titleTone="text-amber-700"
          tone="amber"
          passports={pending}
          profile={profile}
          renewals={renewals}
          onRequestRenewal={requestRenewal}
        />
      )}

      {}
      {rejected.length > 0 && (
        <PassportSection
          title={t(`Rejected (${rejected.length})`, `প্রত্যাখ্যাত (${rejected.length})`)}
          titleTone="text-rose-700"
          tone="rose"
          passports={rejected}
          profile={profile}
          renewals={renewals}
          onRequestRenewal={requestRenewal}
        />
      )}

      {}
      {archived.length > 0 && (
        <PassportSection
          title={t(`Archived (${archived.length})`, `আর্কাইভ (${archived.length})`)}
          titleTone="text-slate-500"
          tone="slate"
          passports={archived}
          profile={profile}
          renewals={renewals}
          onRequestRenewal={requestRenewal}
        />
      )}

      {}
      {!passports.length && !eligibility.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-10">
          <Sparkles className="mx-auto mb-3 text-amber-500" size={32} />
          <p className="font-semibold text-gray-900">No passports yet</p>
          <p className="mt-1 text-sm text-gray-500 break-words">
            Pass 5 verifications in one main category to unlock auto-eligibility, or request manually.
          </p>
          <button
            onClick={() => setShowRequest(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap"
          >
            <Plus size={16} /> Request Passport
          </button>
        </div>
      )}
        </>
      )}

      {}
      {activeTab === 'certificates' && (
        <CertificatesTab
          certificates={certificates}
          publicProfileId={publicProfileId}
          ownerPassportNumber={primaryPassportNumber}
        />
      )}

      {}
      {activeTab === 'timeline' && (
        <CareerTimelineTab
          events={timelineEvents}
          loading={timelineLoading}
          onRefresh={loadTimeline}
        />
      )}

      {}
      {showRequest && (
        <RequestModal
          eligibility={eligibility}
          passports={passports}
          busy={busy}
          onClose={() => setShowRequest(false)}
          onSubmit={request}
        />
      )}

      {}
      {user && (
        <p className="text-[11px] text-gray-400">
          Signed in as <strong>{user.email}</strong>
        </p>
      )}
    </div>
  );
};


/**
 * ProfileIdBanner
 * ---------------
 * Removed in the v2 single-portal refactor. The shared link is now the
 * candidate's Passport ID — the /verify portal accepts both Passport IDs
 * and emails, so there is no separate "Profile ID" share surface.
 */
function ProfileIdBanner(_props: {
  publicProfileId: string;
  passportCount: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return null;
}


function CertificatesTab({ certificates, publicProfileId, ownerPassportNumber }: { certificates: CourseCertificate[]; publicProfileId?: string | null; ownerPassportNumber?: string | null }) {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  // Deduplicate by id, then sort by issue_date DESC (latest first). Services
  // already return that order, but we re-sort defensively in case realtime
  // delivers a row with the same id twice.
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const out: CourseCertificate[] = [];
    for (const c of certificates) {
      if (!c?.id) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    out.sort((a, b) => {
      const ta = new Date(a.issue_date ?? a.completion_date ?? 0).getTime();
      const tb = new Date(b.issue_date ?? b.completion_date ?? 0).getTime();
      return tb - ta;
    });
    return out;
  }, [certificates]);

  const active = sorted.filter((c) => c.status === 'Active');
  const revoked = sorted.filter((c) => c.status === 'Revoked');
  const superseded = sorted.filter((c) => c.status === 'Superseded');

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Award className="mx-auto mb-3 text-amber-500" size={32} />
        <p className="font-semibold text-gray-900">
          {t('No certificates yet', 'এখনো কোনো সার্টিফিকেট নেই')}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {t(
            'Complete a SkillProof career roadmap to earn a verified Course Completion Certificate.',
            'একটি SkillProof ক্যারিয়ার রোডম্যাপ সম্পন্ন করুন এবং যাচাইকৃত সার্টিফিকেট অর্জন করুন।',
          )}
        </p>
        <Link
          to="/dashboard/roadmap"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white"
        >
          {t('Browse roadmaps', 'রোডম্যাপ ব্রাউজ করুন')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        {t(
          'Issued automatically when an admin approves a roadmap completion request. Each certificate is signed with a unique credential number and verification hashes.',
          'একজন অ্যাডমিন রোডম্যাপ সম্পন্নের অনুরোধ অনুমোদন করলে স্বয়ংক্রিয়ভাবে সার্টিফিকেট ইস্যু হয়। প্রতিটি সার্টিফিকেট একটি ইউনিক ক্রেডেনশিয়াল নম্বর এবং যাচাই হ্যাশ দিয়ে স্বাক্ষরিত।',
        )}
      </p>

      {active.length > 0 && (
        <CertificateSection
          title={t(`Active Certificates (${active.length})`, `সক্রিয় সার্টিফিকেট (${active.length})`)}
          titleTone="text-emerald-700"
          certificates={active}
          publicProfileId={publicProfileId}
          ownerPassportNumber={ownerPassportNumber}
        />
      )}

      {revoked.length > 0 && (
        <CertificateSection
          title={t(`Revoked (${revoked.length})`, `বাতিল (${revoked.length})`)}
          titleTone="text-rose-700"
          tone="rose"
          certificates={revoked}
          publicProfileId={publicProfileId}
          ownerPassportNumber={ownerPassportNumber}
        />
      )}

      {superseded.length > 0 && (
        <CertificateSection
          title={t(`Superseded (${superseded.length})`, `প্রতিস্থাপিত (${superseded.length})`)}
          titleTone="text-slate-500"
          tone="slate"
          certificates={superseded}
          publicProfileId={publicProfileId}
          ownerPassportNumber={ownerPassportNumber}
        />
      )}
    </div>
  );
}

/**
 * Renders a list of `PassportCard`s grouped under a heading, with View
 * /Download buttons, Verified + Expired badges, expiry countdown, renewal
 * action, share toolbar (active only), and Load More pagination.
 *
 * The list is already sorted latest-first by the parent.
 */
function PassportSection({
  title,
  titleTone,
  tone = 'slate',
  passports,
  profile,
  renewals,
  onRequestRenewal,
  showShare = false,
  showRenewalAction = false,
  showExpiry = false,
}: {
  title: string;
  titleTone: string;
  tone?: 'slate' | 'rose' | 'amber' | 'emerald';
  passports: SkillPassport[];
  profile: Profile | null;
  renewals: PassportRenewalHistory[];
  onRequestRenewal: (id: string, notes: string) => Promise<void>;
  showShare?: boolean;
  showRenewalAction?: boolean;
  showExpiry?: boolean;
}) {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Reset pagination when the underlying list shrinks (e.g. user deleted
  // a passport). The clamp keeps the visible page <= total.
  useEffect(() => {
    setPageSize((s) => Math.min(s, Math.max(PAGE_SIZE, passports.length)));
  }, [passports.length]);

  if (passports.length === 0) return null;

  const visible = passports.slice(0, pageSize);
  const remaining = passports.length - visible.length;

  const toneContainer =
    tone === 'rose' ? 'border-rose-300 bg-rose-50/30'
    : tone === 'amber' ? 'border-amber-200 bg-amber-50/20'
    : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/20'
    : 'border-slate-200 bg-white';

  return (
    <section className={`rounded-3xl border ${toneContainer} p-4 sm:p-5 shadow-sm`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${titleTone}`}>
          {tone === 'rose' ? <X size={14} /> : <ShieldCheck size={14} />}
          {title}
        </h2>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
          {t(`Showing ${visible.length} of ${passports.length}`, `${passports.length} এর মধ্যে ${visible.length} দেখাচ্ছে`)}
        </span>
      </header>

      <div className="space-y-4">
        {visible.map((p) => (
          <PassportCardRow
            key={p.id}
            passport={p}
            profile={profile}
            renewals={renewals.filter((r) => r.passport_id === p.id)}
            showShare={showShare}
            showRenewalAction={showRenewalAction}
            showExpiry={showExpiry}
            onRequestRenewal={onRequestRenewal}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setPageSize((s) => s + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ChevronDown size={14} /> {t(`Load more (${remaining})`, `আরও দেখুন (${remaining})`)}
          </button>
        </div>
      )}
    </section>
  );
}

function PassportCardRow({
  passport, profile, renewals, showShare, showRenewalAction, showExpiry, onRequestRenewal,
}: {
  passport: SkillPassport;
  profile: Profile | null;
  renewals: PassportRenewalHistory[];
  showShare: boolean;
  showRenewalAction: boolean;
  showExpiry: boolean;
  onRequestRenewal: (id: string, notes: string) => Promise<void>;
}) {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const expired = isPassportExpired(passport);
  const isActive = passport.status === 'active' && !expired;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header strip — Status + Passport ID + Verified/Expired badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-rose-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <PassportStatusBadge status={passport.status} expired={expired} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 font-mono font-bold text-amber-100">
            #{passport.passport_number}
          </span>
          {isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 size={11} /> {t('Verified', 'যাচাইকৃত')}
            </span>
          )}
          {expired && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              <X size={11} /> {t('Expired', 'মেয়াদোত্তীর্ণ')}
            </span>
          )}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t('Issued', 'ইস্যু')} {new Date(passport.created_at ?? passport.issue_date ?? Date.now()).toLocaleDateString()}
        </div>
      </div>

      {/* The reusable visual card */}
      <div className="px-4 py-4 sm:px-5">
        <PassportCard passport={passport} profile={profile} mode="full" />
      </div>

      {/* Action row: View, Download (PDF), Renewal, Expiry, Share */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        {showExpiry && (
          <ExpiryCountdown passport={passport} />
        )}

        <Link
          to={`/verify?id=${encodeURIComponent(passport.passport_number)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow hover:opacity-95"
        >
          <ExternalLink size={12} /> {t('View Public Page', 'পাবলিক পেজ দেখুন')}
        </Link>

        {showRenewalAction && passport.renewal_status !== 'requested' && (
          <button
            onClick={() =>
              onRequestRenewal(
                passport.id,
                expired
                  ? 'Renewal for expired passport.'
                  : 'User-initiated renewal request.',
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
              expired
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <RefreshCcw size={12} /> {t('Request Renewal', 'নবায়নের অনুরোধ')}
          </button>
        )}
        {passport.renewal_status === 'requested' && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Clock size={12} /> {t('Renewal pending', 'নবায়নের অপেক্ষায়')}
          </span>
        )}
      </div>

      {showShare && isActive && (
        <div className="border-t border-slate-100 bg-white px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t('Share this passport', 'এই পাসপোর্ট শেয়ার করুন')}
          </p>
          <ShareToolbar passport={passport} profile={profile} variant="full" />
        </div>
      )}

      {renewals.length > 0 && <RenewalHistory renewals={renewals} />}
    </article>
  );
}

function PassportStatusBadge({ status, expired }: { status: string; expired: boolean }) {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  if (status === 'active' && !expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
        <ShieldCheck size={12} /> {t('Active', 'সক্রিয়')}
      </span>
    );
  }
  if (status === 'active' && expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">
        <X size={12} /> {t('Expired', 'মেয়াদোত্তীর্ণ')}
      </span>
    );
  }
  if (status === 'pending_approval') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
        <Clock size={12} /> {t('Pending', 'অপেক্ষমান')}
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">
        <X size={12} /> {t('Rejected', 'প্রত্যাখ্যাত')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
      <Clock size={12} /> {status}
    </span>
  );
}

/**
 * Renders a list of `CertificateCard`s grouped under a heading with
 * Load More pagination. The list is already sorted latest-first by the
 * parent. The card already shows Title, Issue Date, Status, Verified badge,
 * Credential ID, View/Download buttons — we just wrap + paginate.
 */
function CertificateSection({
  title, titleTone, tone = 'slate', certificates, publicProfileId, ownerPassportNumber,
}: {
  title: string;
  titleTone: string;
  tone?: 'slate' | 'rose' | 'emerald';
  certificates: CourseCertificate[];
  publicProfileId?: string | null;
  ownerPassportNumber?: string | null;
}) {
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    setPageSize((s) => Math.min(s, Math.max(PAGE_SIZE, certificates.length)));
  }, [certificates.length]);

  if (certificates.length === 0) return null;

  const visible = certificates.slice(0, pageSize);
  const remaining = certificates.length - visible.length;

  const containerTone =
    tone === 'rose' ? 'border-rose-200 bg-rose-50/30'
    : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/20'
    : 'border-slate-200 bg-white';

  return (
    <section className={`rounded-3xl border ${containerTone} p-4 sm:p-5 shadow-sm`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${titleTone}`}>
          {tone === 'rose' ? <X size={14} /> : tone === 'emerald' ? <CheckCircle2 size={14} /> : <Award size={14} />}
          {title}
        </h2>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
          {t(`Showing ${visible.length} of ${certificates.length}`, `${certificates.length} এর মধ্যে ${visible.length} দেখাচ্ছে`)}
        </span>
      </header>

      <div className="space-y-4">
        {visible.map((c) => (
          <CertificateCard
            key={c.id}
            certificate={c}
            ownerPassportNumber={ownerPassportNumber}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setPageSize((s) => s + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ChevronDown size={14} /> {t(`Load more (${remaining})`, `আরও দেখুন (${remaining})`)}
          </button>
        </div>
      )}
    </section>
  );
}

function CareerTimelineTab({
  events,
  loading,
  onRefresh,
}: {
  events: CareerTimelineEvent[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Permanent Achievement Ledger
          </p>
          <p className="text-sm text-slate-700">
            Every skill, roadmaps, assessment, certificate, passport, and
            verification event — anchored to the SkillProof database with a
            SHA-256 content hash. <strong>Admin edits never alter your
            history.</strong>
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-amber-500" />
          Loading your career timeline…
        </div>
      ) : (
        <CareerTimeline
          events={events}
          variant="user"
          heading="Permanent Achievement Ledger"
          emptyHint="Complete a roadmap or skill verification to start your timeline."
        />
      )}
    </div>
  );
}

function ExpiryCountdown({ passport }: { passport: SkillPassport }) {
  const days = daysUntilPassportExpiry(passport);
  if (days == null) return null;
  const expired = days < 0;
  const tone = expired
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : days < 30
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${tone}`}>
      <Clock size={12} /> {expired ? `Expired ${Math.abs(days)} days ago` : `${days} days until expiry`}
    </div>
  );
}

function RenewalHistory({ renewals }: { renewals: PassportRenewalHistory[] }) {
  if (!renewals.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Renewal History</p>
      <ul className="space-y-1.5">
        {renewals.map((r) => {
          const tone =
            r.decision === 'renewed' ? 'bg-emerald-100 text-emerald-700'
            : r.decision === 'rejected' ? 'bg-rose-100 text-rose-700'
            : 'bg-amber-100 text-amber-700';
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 text-gray-600 break-words">
                Requested {new Date(r.requested_at).toLocaleDateString()}
                {r.decided_at && ` · Decided ${new Date(r.decided_at).toLocaleDateString()}`}
              </span>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${tone}`}>
                {r.decision ?? 'Pending'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RequestModal({
  eligibility, passports, busy, onClose, onSubmit,
}: {
  eligibility: PassportCategoryEligibility[];
  passports: SkillPassport[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (categoryId: string, motivation: string) => void;
}) {
  const [selected, setSelected] = useState<string>('');
  const [motivation, setMotivation] = useState('');

  // Per-category states: a category can be (a) eligible, (b) ineligible,
  // (c) already-active for this user, or (d) already pending. Multi-category
  // is fine — having a passport in Programming does NOT block Graphic Design.
  const existingActiveByCat = new Map<string, SkillPassport>();
  const existingPendingByCat = new Map<string, SkillPassport>();
  for (const p of passports) {
    if (!p.category_id) continue;
    if (p.status === 'active') existingActiveByCat.set(p.category_id, p);
    else if (p.status === 'pending_approval') existingPendingByCat.set(p.category_id, p);
  }

  const eligibleRows = eligibility.filter((e) => e.is_eligible);
  const nonEligibleRows = eligibility.filter((e) => !e.is_eligible);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !motivation.trim()) return;
    onSubmit(selected, motivation.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-base font-bold text-gray-900 sm:text-lg break-words">
            <ShieldCheck className="shrink-0 text-amber-500" size={20} /> Request Passport
          </h3>
          <button onClick={onClose} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible categories</p>
            {eligibleRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                No categories have reached 5 Passed verifications yet. You can still request manually below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {eligibleRows.map((e) => (
                  <CategoryOption
                    key={e.category_id}
                    row={e}
                    selected={selected === e.category_id}
                    onSelect={() => setSelected(e.category_id)}
                    existingActive={existingActiveByCat.has(e.category_id)}
                    existingPending={existingPendingByCat.has(e.category_id)}
                  />
                ))}
              </div>
            )}
          </div>
          {nonEligibleRows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Not yet eligible</p>
              <div className="space-y-1.5">
                {nonEligibleRows.map((e) => (
                  <CategoryOption
                    key={e.category_id}
                    row={e}
                    selected={selected === e.category_id}
                    onSelect={() => setSelected(e.category_id)}
                    existingActive={existingActiveByCat.has(e.category_id)}
                    existingPending={existingPendingByCat.has(e.category_id)}
                  />
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-700">Motivation</span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              required
              minLength={10}
              rows={3}
              placeholder="Tell us why you deserve this passport..."
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </label>
          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <p className="flex items-center gap-1 text-[11px] text-gray-500 break-words min-w-0">
              <Lock size={11} className="shrink-0" /> One pending passport per category — you can hold passports in many categories.
            </p>
            <button
              type="submit"
              disabled={busy || !selected || !motivation.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto whitespace-nowrap"
            >
              <Send size={14} /> {busy ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryOption({
  row, selected, onSelect, existingActive, existingPending, key: _key,
}: {
  row: PassportCategoryEligibility;
  selected: boolean;
  onSelect: () => void;
  existingActive?: boolean;
  existingPending?: boolean;
  key?: ReactKey;
}) {
  const disabled = Boolean(existingActive || existingPending);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left transition ${
        selected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 break-words">{row.category_name}</p>
        <p className="text-[11px] text-gray-500 break-words">
          {row.passed_count} passed · avg {Number(row.average_marks).toFixed(1)}/10
        </p>
      </div>
      {existingActive && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Already Active
        </span>
      )}
      {!existingActive && existingPending && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Pending Review
        </span>
      )}
      {!existingActive && !existingPending && row.is_eligible && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Eligible
        </span>
      )}
    </button>
  );
}

export default SkillPassportPage;