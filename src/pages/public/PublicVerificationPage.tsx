import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Award, BadgeCheck, Briefcase, Building2, Calendar, CheckCircle2,
  ClipboardCheck, Clock, Download, ExternalLink, Eye, Globe, GraduationCap,
  Hash, History, Image as ImageIcon, Linkedin, MapPin, QrCode, Search,
  ShieldCheck, Sparkles, Star, Target, TrendingUp, User as UserIcon, XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PassportCard } from '../../components/passport/PassportCard';
import { PassportSeal } from '../../components/passport/PassportSeal';
import { LevelBadge } from '../../components/passport/LevelBadge';
import { ShareToolbar } from '../../components/passport/ShareToolbar';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import {
  getPublicPassportBundle, subscribeToPublicPassport,
  type PublicPassportBundle, type PublicProfile,
} from '../../services/publicPassport';
import { getPublicPassportUrl, getEmployerVerificationUrl } from '../../utils/passportUrl';
import { buildSharePayload } from '../../utils/share';
import { downloadPassportPng, downloadPassportPdf } from '../../services/passportDownload';
import { isPassportExpired } from '../../services/passports';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import type { PassportLevel, SkillPassport } from '../../types/database';

/**
 * Public Passport Verification Page — `/passport/:passportNumber`
 *
 * PHASE 2 — Enterprise surface for employers, recruiters and the
 * public. Renders only public info (NEVER email/phone/address/etc)
 * and supports realtime sync via Supabase.
 *
 * Sections:
 *   • Hero (status pill, verified badge, QR, seal, share toolbar)
 *   • Verified Skills (skill tags, levels)
 *   • Professional Summary (bio, role, location, links)
 *   • Verification Timeline (approval + renewals + level changes)
 *   • Latest Assessment Score
 *   • Passport Validity (issue / expiry)
 *   • Employer Action Bar (download PDF/PNG, "I'm an employer" CTA)
 */
export const PublicVerificationPage = () => {
  const { passportNumber } = useParams<{ passportNumber: string }>();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PublicPassportBundle | null>(null);
  const [searchQuery, setSearchQuery] = useState(passportNumber ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<'pdf' | 'png' | null>(null);
  const [downloadedToast, setDownloadedToast] = useState<string | null>(null);
  const [realtimeFlash, setRealtimeFlash] = useState(false);

  const load = useCallback(async (query: string) => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const found = await getPublicPassportBundle(query);
      if (!found) {
        setBundle(null);
        setError(`No verified Skill Passport matches "${query}".`);
        return;
      }
      setBundle(found);
    } catch (e: any) {
      console.error('[public-passport] load error', e);
      setError(e?.message || 'Failed to load passport.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + parameter-driven navigation.
  useEffect(() => {
    if (!passportNumber) return;
    load(passportNumber);
  }, [passportNumber, load]);

  // Realtime: re-bundle on any change to this passport's row. When an
  // admin approves / suspends / rejects / renews a passport, the public
  // page now reflects the change instantly without reload.
  useEffect(() => {
    if (!bundle?.passport?.passport_number) return;
    const unsub = subscribeToPublicPassport(bundle.passport.passport_number, () => {
      setRealtimeFlash(true);
      load(bundle.passport.passport_number);
      setTimeout(() => setRealtimeFlash(false), 2500);
    });
    return unsub;
  }, [bundle?.passport?.passport_number, load]);

  useEffect(() => {
    setSearchQuery(passportNumber ?? '');
  }, [passportNumber]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/passport/${encodeURIComponent(q)}`);
  };

  const passport = bundle?.passport ?? null;
  const profile = bundle?.profile as PublicProfile | null;
  const publicUrl = useMemo(
    () => (passport ? getPublicPassportUrl(passport.passport_number) : ''),
    [passport?.passport_number],
  );
  const verifyUrl = useMemo(() => getEmployerVerificationUrl(), []);

  // SEO/OG meta + page title — updated as soon as the bundle arrives.
  useDocumentMeta({
    title: passport
      ? `${profile?.full_name ?? 'Skill Passport'} · ${passport.level} · ${passport.passport_number}`
      : 'Verify Skill Passport · SkillProof',
    description: passport
      ? `Official SkillProof public passport for ${profile?.full_name ?? 'a verified member'} — ${passport.level} level · ${passport.main_category_name ?? 'Verified skills'}. Verified by SkillProof Bangladesh.`
      : 'Verify a candidate\'s SkillProof passport by Passport ID or QR code.',
    passport,
    profile: passport ? ({ full_name: profile?.full_name ?? '', avatar_url: profile?.avatar_url ?? null } as any) : null,
    url: publicUrl || undefined,
  });

  const onDownloadPdf = async () => {
    if (!bundle) return;
    setDownloadBusy('pdf');
    try {
      await downloadPassportPdf(bundle);
      setDownloadedToast('Premium PDF downloaded');
      setTimeout(() => setDownloadedToast(null), 2200);
    } catch (e: any) {
      console.error(e);
      setDownloadedToast('PDF download failed');
      setTimeout(() => setDownloadedToast(null), 2200);
    } finally {
      setDownloadBusy(null);
    }
  };

  const onDownloadPng = async () => {
    if (!bundle) return;
    setDownloadBusy('png');
    try {
      await downloadPassportPng(bundle);
      setDownloadedToast('Premium PNG downloaded');
      setTimeout(() => setDownloadedToast(null), 2200);
    } catch (e: any) {
      console.error(e);
      setDownloadedToast('PNG download failed');
      setTimeout(() => setDownloadedToast(null), 2200);
    } finally {
      setDownloadBusy(null);
    }
  };

  const verificationStatus = useMemo(() => computeStatus(passport), [passport]);
  const timeline = useMemo(() => buildTimeline(bundle), [bundle]);

  return (
    <div className="min-h-screen bg-[#FFF8F6] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#ED1C24] text-[11px] font-extrabold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Official Public Skill Passport Verification
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Verify a Skill Passport
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Enter a Passport ID or scan a QR code. SkillProof passports are signed
              digital credentials issued and renewed by admins. No login required.
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex items-center gap-2 mb-10">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Passport ID — e.g. SP-BD-2026-000001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ED1C24] shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] hover:opacity-95 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-red-500/20 shrink-0"
            >
              Verify
            </button>
          </form>

          {/* Loading skeleton */}
          {loading && (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Sparkles className="inline-block w-5 h-5 mr-2 animate-pulse text-amber-500" />
              Looking up passport in the SkillProof database…
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 max-w-2xl mx-auto">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-semibold">Invalid Passport</p>
                <p className="mt-1 text-rose-700">{error}</p>
                <p className="mt-2 text-xs text-rose-600">
                  Please confirm the passport number with the candidate, or visit the{' '}
                  <button
                    onClick={() => navigate('/verify')}
                    className="underline font-semibold hover:text-rose-800"
                  >
                    Employer Verification Portal
                  </button>{' '}
                  to perform a fresh verification.
                </p>
              </div>
            </div>
          )}

          {/* Realtime flash banner */}
          {realtimeFlash && passport && (
            <div className="mb-4 mx-auto max-w-2xl flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 animate-pulse">
              <Sparkles className="w-4 h-4" /> Passport updated in real time — freshest data from SkillProof.
            </div>
          )}

          {/* Download toast */}
          {downloadedToast && (
            <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-xl">
              <CheckCircle2 className="w-4 h-4" /> {downloadedToast}
            </div>
          )}

          {/* Passport bundle */}
          {bundle && passport && profile && !loading && (
            <div className="space-y-10">
              {/* ==== Hero: status + identity + QR + share ==== */}
              <section className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-rose-50 px-5 py-3 sm:px-7">
                  <div className="flex items-center gap-2">
                    <StatusPill status={verificationStatus} />
                    <LevelBadge level={passport.level} size="md" />
                  </div>
                  <div className="flex items-center gap-3">
                    <PassportSeal size={56} animated={passport.status === 'active' && !isPassportExpired(passport)} />
                    <div className="hidden sm:block text-right text-[10px] text-slate-500 uppercase tracking-wider font-bold leading-tight">
                      SkillProof<br />Official Seal
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 px-5 py-7 sm:px-7 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0 space-y-4">
                    <div className="flex items-start gap-4">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl object-cover ring-2 ring-amber-300/60 shadow"
                        />
                      ) : (
                        <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-3xl font-black ring-2 ring-amber-300/60">
                          {initials(profile.full_name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                            {profile.full_name}
                          </h2>
                          <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        </div>
                        {profile.current_position && (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <Briefcase className="w-3.5 h-3.5" /> {profile.current_position}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono font-semibold text-slate-700">
                            <Hash className="w-3 h-3" /> {passport.passport_number}
                          </span>
                          {passport.main_category_name && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                              <Award className="w-3 h-3" /> {passport.main_category_name}
                            </span>
                          )}
                          {profile.district && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                              <MapPin className="w-3 h-3" /> {profile.district}, {profile.country ?? 'Bangladesh'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Skill tags */}
                    {passport.skill_tags && passport.skill_tags.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          <Target className="w-3 h-3" /> Verified Skill Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {passport.skill_tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <Stat label="Passed Assessments" value={String(passport.passed_count)} />
                      <Stat label="Avg Score / 10" value={Number(passport.average_marks ?? 0).toFixed(1)} />
                      <Stat label="Overall / 100" value={passport.overall_score ? String(passport.overall_score) : '—'} />
                      <Stat label="Latest Score" value={bundle.latestAssessmentScore != null ? `${bundle.latestAssessmentScore.toFixed(1)} / 10` : '—'} />
                    </div>

                    {/* Share toolbar */}
                    <div className="pt-3 border-t border-slate-100">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <ShareIcon /> Share this passport
                      </p>
                      <ShareToolbar passport={passport} profile={profile as any} variant="full" />
                    </div>
                  </div>

                  {/* QR + download panel */}
                  <aside className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:min-w-[220px]">
                    <PassportSeal size={84} variant="compact" animated={false} />
                    <div className="rounded-2xl bg-white p-3 shadow ring-1 ring-slate-200">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                        title={publicUrl}
                      >
                        <QRCodeSVG
                          value={publicUrl}
                          size={156}
                          bgColor="#ffffff"
                          fgColor="#0f172a"
                          level="M"
                          includeMargin={false}
                        />
                      </a>
                    </div>
                    <p className="text-center text-[10px] text-slate-500 font-mono break-all max-w-[180px]">
                      {publicUrl}
                    </p>
                    <div className="w-full grid grid-cols-2 gap-2">
                      <button
                        onClick={onDownloadPdf}
                        disabled={downloadBusy !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ED1C24] to-[#F58220] px-3 py-2 text-[11px] font-bold text-white shadow disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloadBusy === 'pdf' ? '…' : 'PDF'}
                      </button>
                      <button
                        onClick={onDownloadPng}
                        disabled={downloadBusy !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {downloadBusy === 'png' ? '…' : 'PNG'}
                      </button>
                    </div>
                  </aside>
                </div>
              </section>

              {/* ==== Sections: employer-friendly layout ==== */}
              <div className="grid gap-6 lg:grid-cols-3">
                <SectionCard title="Professional Summary" icon={<UserIcon className="w-4 h-4" />}>
                  {profile.experience_summary ? (
                    <p className="text-sm text-slate-700 leading-relaxed">{profile.experience_summary}</p>
                  ) : profile.bio ? (
                    <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No professional summary provided.</p>
                  )}
                  {profile.profession && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> {profile.profession}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.linkedin_url && (
                      <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0A66C2]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/20">
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                    {profile.github_url && (
                      <a href={profile.github_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
                        <Globe className="w-3 h-3" /> GitHub
                      </a>
                    )}
                    {profile.portfolio_url && (
                      <a href={profile.portfolio_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
                        <ExternalLink className="w-3 h-3" /> Portfolio
                      </a>
                    )}
                    {profile.website_url && (
                      <a href={profile.website_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">
                        <ExternalLink className="w-3 h-3" /> Website
                      </a>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Verified Skills" icon={<Award className="w-4 h-4" />}>
                  <ul className="space-y-2">
                    {(passport.skill_tags ?? []).map((tag) => (
                      <li key={tag} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="text-slate-700">{tag}</span>
                      </li>
                    ))}
                    {(!passport.skill_tags || passport.skill_tags.length === 0) && (
                      <li className="text-sm text-slate-500 italic">No skill tags registered.</li>
                    )}
                  </ul>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MiniMetric label="Passed" value={String(passport.passed_count)} />
                    <MiniMetric label="Avg / 10" value={Number(passport.average_marks ?? 0).toFixed(1)} />
                  </div>
                </SectionCard>

                <SectionCard title="Latest Assessment Score" icon={<TrendingUp className="w-4 h-4" />}>
                  {bundle.latestAssessmentScore != null ? (
                    <div>
                      <p className="text-4xl font-black tracking-tight text-slate-900">
                        {bundle.latestAssessmentScore.toFixed(1)}<span className="text-base font-semibold text-slate-400"> / 10</span>
                      </p>
                      {bundle.latestAssessmentTitle && (
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {bundle.latestAssessmentTitle}
                        </p>
                      )}
                      {bundle.latestAssessmentAt && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" /> {new Date(bundle.latestAssessmentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No assessment score recorded yet.</p>
                  )}
                </SectionCard>

                <SectionCard title="Admin Verification Date" icon={<ClipboardCheck className="w-4 h-4" />}>
                  {passport.signed_at ? (
                    <div>
                      <p className="text-2xl font-black text-slate-900">
                        {new Date(passport.signed_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Signed by SkillProof admin · {passport.signed_at ? new Date(passport.signed_at).toLocaleTimeString() : ''}
                      </p>
                      {passport.digital_signature && (
                        <p className="mt-3 break-all rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-[10px] text-slate-600">
                          {passport.digital_signature}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Not yet verified by an admin.</p>
                  )}
                </SectionCard>

                <SectionCard title="Passport Level" icon={<Star className="w-4 h-4" />}>
                  <div className="flex items-center gap-3">
                    <LevelBadge level={passport.level} size="lg" />
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    {levelDescription(passport.level)}
                  </p>
                </SectionCard>

                <SectionCard title="Passport Validity" icon={<Calendar className="w-4 h-4" />}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Issued</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {passport.issue_date ? new Date(passport.issue_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {isPassportExpired(passport) ? 'Expired' : 'Expires'}
                      </p>
                      <p className={`mt-1 text-sm font-bold ${isPassportExpired(passport) ? 'text-rose-600' : 'text-slate-900'}`}>
                        {passport.expiry_date ? new Date(passport.expiry_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                  {passport.renewal_status === 'requested' && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
                      <Clock className="w-3.5 h-3.5" /> Renewal requested by holder
                    </p>
                  )}
                </SectionCard>
              </div>

              {/* ==== Verification Timeline ==== */}
              <SectionCard title="Verification Timeline" icon={<History className="w-4 h-4" />} full>
                {timeline.length > 0 ? (
                  <ol className="relative ml-2 border-l-2 border-slate-200 pl-5 space-y-4">
                    {timeline.map((t) => (
                      <li key={`${t.kind}-${t.id}`} className="relative">
                        <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-amber-400">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                        <p className="text-xs font-bold text-slate-900">{t.label}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(t.at).toLocaleString()}
                        </p>
                        {t.detail && <p className="mt-1 text-xs text-slate-600">{t.detail}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-500 italic">No timeline events recorded yet.</p>
                )}
              </SectionCard>

              {/* ==== Visa-style enterprise card ==== */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <Eye className="w-4 h-4" /> VIP Card Preview
                </h3>
                <PassportCard passport={passport} profile={profile as any} mode="full" />
              </section>

              {/* ==== Employer CTA ==== */}
              <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      <Building2 className="w-3 h-3" /> For Employers & Recruiters
                    </div>
                    <h3 className="mt-3 text-xl sm:text-2xl font-black tracking-tight">
                      Validate this candidate from your hiring dashboard.
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Use the SkillProof Employer Verification Portal to look up any
                      Passport ID or scan a QR — no signup required.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ED1C24] to-[#F58220] px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-95"
                    >
                      <Search className="w-4 h-4" /> Open Verification Portal
                    </a>
                    <button
                      onClick={onDownloadPdf}
                      disabled={downloadBusy !== null}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> Premium PDF
                    </button>
                  </div>
                </div>
              </section>

              {/* ==== Trust footer ==== */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="flex items-center gap-2 font-semibold">
                  <Sparkles size={16} /> This passport is genuine and verified by SkillProof.
                </p>
                <p className="mt-1 text-emerald-700">
                  The signature, QR and Passport ID are anchored to the SkillProof
                  database. This page is read-only and never exposes contact details.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// ----- Helpers & subcomponents -----

function StatusPill({ status }: { status: { tone: string; icon: any; label: string } }) {
  const Icon = status.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${status.tone}`}>
      <Icon className="w-3.5 h-3.5" /> {status.label}
    </span>
  );
}

function SectionCard({
  title, icon, children, full = false,
}: { title: string; icon: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${full ? 'sm:p-6' : ''}`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-[#ED1C24]">{icon}</span> {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function computeStatus(passport: SkillPassport | null): {
  tone: string;
  icon: any;
  label: string;
} {
  if (!passport) return { tone: 'bg-slate-100 text-slate-700', icon: ShieldCheck, label: 'Unknown' };
  if (passport.status === 'active' && !isPassportExpired(passport)) {
    return { tone: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, label: 'Verified' };
  }
  if (passport.status === 'active' && isPassportExpired(passport)) {
    return { tone: 'bg-rose-100 text-rose-800', icon: Clock, label: 'Expired' };
  }
  if (passport.status === 'suspended' || passport.status === 'archived') {
    return { tone: 'bg-amber-100 text-amber-800', icon: AlertTriangle, label: 'Suspended' };
  }
  if (passport.status === 'pending_approval') {
    return { tone: 'bg-amber-100 text-amber-800', icon: Clock, label: 'Pending' };
  }
  if (passport.status === 'rejected') {
    return { tone: 'bg-rose-100 text-rose-800', icon: XCircle, label: 'Rejected' };
  }
  return { tone: 'bg-slate-100 text-slate-700', icon: ShieldCheck, label: passport.status };
}

function levelDescription(l: PassportLevel): string {
  switch (l) {
    case 'Bronze':
      return 'Foundational level — holder has passed at least 5 verified assessments.';
    case 'Silver':
      return 'Intermediate — strong evidence across the holder\'s category.';
    case 'Gold':
      return 'Advanced — distinguished performance with consistent high scores.';
    case 'Platinum':
      return 'Top tier — exceptional, sustained verified expertise in the field.';
    default:
      return 'Verified SkillProof passport tier.';
  }
}

type TimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
  kind: 'approval' | 'renewal' | 'level' | 'request';
};

function buildTimeline(bundle: PublicPassportBundle | null): TimelineEvent[] {
  if (!bundle) return [];
  const events: TimelineEvent[] = [];
  const { passport, levelHistory, renewalHistory } = bundle;
  if (passport.signed_at) {
    events.push({
      id: `sign-${passport.id}`,
      at: passport.signed_at,
      kind: 'approval',
      label: `Verified by SkillProof admin`,
      detail: passport.digital_signature
        ? `Digital signature: ${passport.digital_signature.slice(0, 22)}…`
        : undefined,
    });
  }
  if (passport.issue_date) {
    events.push({
      id: `issue-${passport.id}`,
      at: passport.issue_date,
      kind: 'approval',
      label: 'Passport issued',
    });
  }
  for (const r of renewalHistory) {
    if (r.decided_at) {
      events.push({
        id: `ren-${r.id}`,
        at: r.decided_at,
        kind: 'renewal',
        label: r.decision === 'renewed' ? 'Passport renewed' : 'Renewal decision recorded',
        detail: r.admin_notes ?? undefined,
      });
    } else {
      events.push({
        id: `ren-${r.id}`,
        at: r.requested_at,
        kind: 'request',
        label: 'Renewal requested by holder',
      });
    }
  }
  for (const l of levelHistory) {
    events.push({
      id: `lvl-${l.id}`,
      at: l.changed_at,
      kind: 'level',
      label: `Level updated: ${l.old_level} → ${l.new_level}`,
      detail: l.reason ?? undefined,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

export default PublicVerificationPage;