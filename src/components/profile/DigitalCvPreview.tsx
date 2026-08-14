/**
 * DigitalCvPreview
 * ----------------
 * A polished, "digitalized CV" surface that renders a candidate's full
 * Skill Passport inside the user-facing AI Career Profile page. It
 * shows exactly what the public /verify portal will surface, so users
 * can preview their CV without leaving the dashboard.
 *
 * Sections:
 *   - Identity header (avatar, name, profession, location, passport #)
 *   - Verified Passports (level + main category + QR)
 *   - Verified Skills (badges)
 *   - Manual Skills / Languages / Certifications (with verify URL chips)
 *   - Roadmap progress (completion %)
 *   - Public Evidence (live / demo / portfolio links)
 *
 * This component is intentionally read-only — edits happen in the
 * sections above it on the same page.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Award, BadgeCheck, Calendar, ExternalLink, Globe,
  Hash, MapPin, ShieldCheck, Sparkles, Target,
  TrendingUp, Loader2, ExternalLink as LinkIcon, Mail, Phone,
  Wrench, Languages as LangIcon,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { listMyProfileEvidence, type ProfileEvidenceRow } from '../../services/profileEvidence';
import type { Profile, SkillPassport } from '../../types/database';

interface EnrolmentRow {
  id: string;
  roadmap_id: string;
  completion_pct: number;
  roadmap: { title: string | null } | null;
}

interface CertificateRow {
  id: string;
  credential_number: string;
  issue_date: string | null;
  roadmap_title: string;
  category_name: string | null;
}

interface VerifiedSkillRow {
  id: string;
  skill_name: string;
  score: number | null;
}

interface ManualSkillRow {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'tools' | 'language' | 'certification';
  url: string | null;
}

type SkillPassportWithMeta = SkillPassport;

const TYPE_ICON: Record<string, ReactNode> = {
  live_site:  <Globe className="h-3.5 w-3.5" />,
  demo:       <ExternalLink className="h-3.5 w-3.5" />,
  portfolio:  <LinkIcon className="h-3.5 w-3.5" />,
  github:     <ExternalLink className="h-3.5 w-3.5" />,
  other:      <LinkIcon className="h-3.5 w-3.5" />,
};

const TYPE_LABEL_EN: Record<string, string> = {
  live_site:  'Live site',
  demo:       'Demo',
  portfolio:  'Portfolio',
  github:     'GitHub',
  other:      'Link',
};
const TYPE_LABEL_BN: Record<string, string> = {
  live_site:  'লাইভ সাইট',
  demo:       'ডেমো',
  portfolio:  'পোর্টফোলিও',
  github:     'গিটহাব',
  other:      'লিঙ্ক',
};

export const DigitalCvPreview: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const profile = (user ?? null) as Profile | null;

  const [passports, setPassports] = useState<SkillPassportWithMeta[]>([]);
  const [enrolments, setEnrolments] = useState<EnrolmentRow[]>([]);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [verified, setVerified] = useState<VerifiedSkillRow[]>([]);
  const [evidence, setEvidence] = useState<ProfileEvidenceRow[]>([]);
  const [manualSkills, setManualSkills] = useState<ManualSkillRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const t = useMemo(
    () => (en: string, bn: string) => (language === 'bn' ? bn : en),
    [language],
  );

  useEffect(() => {
    if (!profile?.user_id) return;
    let cancelled = false;
    (async () => {
      try {
        const [ppRows, enrRows, certRows, verRows, evRows, skillsRows] = await Promise.all([
          supabase
            .from('skill_passports')
            .select('*')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('career_roadmap_enrollment')
            .select('id, roadmap_id, completion_pct, roadmap:roadmaps(title)')
            .eq('user_id', profile.user_id)
            .order('updated_at', { ascending: false })
            .limit(8),
          supabase
            .from('course_certificates')
            .select('id, credential_number, issue_date, roadmap_title, category_name')
            .eq('user_id', profile.user_id)
            .order('issue_date', { ascending: false })
            .limit(8),
          supabase
            .from('skill_verification_submissions')
            .select('id, skill_name_snapshot, final_score')
            .eq('user_id', profile.user_id)
            .eq('status', 'Passed')
            .order('created_at', { ascending: false })
            .limit(20),
          listMyProfileEvidence().catch(() => [] as ProfileEvidenceRow[]),
          supabase
            .from('user_skills')
            .select('id, name, category, url')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: true })
            .limit(200),
        ]);

        if (cancelled) return;
        setPassports(((ppRows.data as any[]) ?? []) as SkillPassportWithMeta[]);
        setEnrolments(((enrRows.data as any[]) ?? []).map((r) => ({
          id: r.id,
          roadmap_id: r.roadmap_id,
          completion_pct: Number(r.completion_pct ?? 0),
          roadmap: Array.isArray(r.roadmap) ? r.roadmap[0] : r.roadmap,
        })));
        setCertificates(((certRows.data as any[]) ?? []) as CertificateRow[]);
        setVerified(((verRows.data as any[]) ?? []).map((r) => ({
          id: r.id,
          skill_name: r.skill_name_snapshot,
          score: r.final_score,
        })));
        setEvidence(evRows ?? []);
        setManualSkills(((skillsRows.data as any[]) ?? []) as ManualSkillRow[]);
      } catch (e) {
        console.warn('[DigitalCvPreview] load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.user_id]);

  if (!profile) return null;

  const fullName = profile.full_name || 'SkillProof Member';
  const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
  const location = [profile.district, profile.division, profile.country].filter(Boolean).join(', ');
  const shareUrl = profile.public_profile_id
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(profile.public_profile_id)}`
    : null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-400" />
        <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-[#F97316]/40 sm:h-20 sm:w-20"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-xl font-black text-white sm:h-20 sm:w-20">
              {initials || '?'}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight text-slate-900 break-words">
              {fullName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600 break-words">
              {profile.current_position || profile.profession || t('No title set', 'পদবী নেই')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              )}
              {profile.email && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" /> <span className="truncate">{profile.email}</span>
                </span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {profile.phone}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {shareUrl && (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-2 text-[11px] font-black text-white shadow hover:opacity-95"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t('Open public CV', 'পাবলিক CV দেখুন')}
              </a>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t('Digital CV Preview', 'ডিজিটাল CV প্রিভিউ')}
            </p>
          </div>
        </div>

        {profile.bio && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[12px] leading-relaxed text-slate-700">
            {profile.bio}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-6 text-[12px] text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('Loading CV…', 'CV লোড হচ্ছে…')}
        </div>
      ) : (
        <>
          {/* Verified Passports */}
          {passports.length > 0 && (
            <CvSection
              title={t('Verified Passports', 'যাচাইকৃত পাসপোর্ট')}
              icon={<BadgeCheck className="h-4 w-4" />}
              subtitle={`${passports.length} ${t('active passport(s)', 'টি সক্রিয় পাসপোর্ট')}`}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {passports.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900 break-words">
                        {p.main_category_name || t('Skill Passport', 'স্কিল পাসপোর্ট')}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Hash className="h-3 w-3" /> {p.passport_number}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                      {t('Level', 'লেভেল')}: {p.level}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                      <Mini label={t('Passed', 'পাস')} value={String(p.passed_count ?? 0)} />
                      <Mini label={t('Avg', 'গড়')} value={p.average_marks ? Number(p.average_marks).toFixed(1) : '—'} />
                      <Mini label={t('Overall', 'মোট')} value={p.overall_score ? `${p.overall_score}/100` : '—'} />
                    </div>
                  </div>
                ))}
              </div>
            </CvSection>
          )}

          {/* Verified Skills */}
          {verified.length > 0 && (
            <CvSection
              title={t('Verified Skills', 'যাচাইকৃত দক্ষতা')}
              icon={<ShieldCheck className="h-4 w-4" />}
              subtitle={`${verified.length} ${t('verified skill(s)', 'টি যাচাইকৃত দক্ষতা')}`}
            >
              <div className="flex flex-wrap gap-1.5">
                {verified.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"
                  >
                    <ShieldCheck className="h-3 w-3" /> {s.skill_name}
                    {s.score != null && <span className="opacity-70">·{Math.round(Number(s.score))}</span>}
                  </span>
                ))}
              </div>
            </CvSection>
          )}

          {/* The grouped "Skills & Certifications" block (Skills · Tools ·
              Soft skills · Languages · Certifications) was intentionally
              removed from the public CV per spec. Categories are surfaced
              in dedicated sections elsewhere on the public profile view. */}

          {/* Roadmap progress */}
          {enrolments.length > 0 && (
            <CvSection
              title={t('Roadmap progress', 'রোডম্যাপ অগ্রগতি')}
              icon={<Target className="h-4 w-4" />}
              subtitle={`${enrolments.length} ${t('enrolment(s)', 'টি এনরোলমেন্ট')}`}
            >
              <div className="space-y-2">
                {enrolments.map((e) => {
                  const pct = Math.max(0, Math.min(100, Math.round(e.completion_pct ?? 0)));
                  const done = pct >= 100;
                  return (
                    <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {e.roadmap?.title ?? t('Roadmap', 'রোডম্যাপ')}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${done ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {done ? <BadgeCheck className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${done ? 'bg-gradient-to-r from-emerald-500 to-emerald-700' : 'bg-gradient-to-r from-[#E31B23] to-[#F97316]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CvSection>
          )}

          {/* Certificates */}
          {certificates.length > 0 && (
            <CvSection
              title={t('Certificates', 'সার্টিফিকেট')}
              icon={<Award className="h-4 w-4" />}
              subtitle={`${certificates.length} ${t('certificate(s)', 'টি সার্টিফিকেট')}`}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {certificates.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-black text-slate-900 truncate">{c.roadmap_title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-amber-700 truncate">{c.credential_number}</p>
                    {c.issue_date && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.issue_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CvSection>
          )}

          {/* Public Evidence — projects / live / demos */}
          {evidence.length > 0 && (
            <CvSection
              title={t('Public Evidence', 'পাবলিক প্রমাণ')}
              icon={<LinkIcon className="h-4 w-4" />}
              subtitle={`${evidence.length} ${t('public link(s)', 'টি পাবলিক লিঙ্ক')}`}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-[#E31B23] hover:shadow"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {TYPE_ICON[ev.type] ?? TYPE_ICON.other}
                        {language === 'bn' ? TYPE_LABEL_BN[ev.type] : TYPE_LABEL_EN[ev.type]}
                      </span>
                      <ExternalLink className="ml-auto h-3 w-3 text-slate-400 transition group-hover:text-[#E31B23]" />
                    </div>
                    <p className="text-sm font-black text-slate-900 break-words">{ev.title}</p>
                    {ev.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed break-words">{ev.description}</p>
                    )}
                    <p className="truncate text-[10px] font-mono text-slate-400">{ev.url}</p>
                  </a>
                ))}
              </div>
            </CvSection>
          )}
        </>
      )}

      {/* Empty-state nudge */}
      {!loading && passports.length === 0 && verified.length === 0 && enrolments.length === 0 && evidence.length === 0 && manualSkills.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-sm font-bold text-slate-800">
            {t('Your digital CV will appear here once you add data.', 'আপনার ডিজিটাল CV এখানে দেখা যাবে একবার আপনি ডেটা যোগ করলে।')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {t(
              'Complete your education, experience, skills and add at least one live project link above to unlock a polished verified CV.',
              'একটি পরিশীলিত যাচাইকৃত CV আনলক করতে উপরে আপনার শিক্ষা, অভিজ্ঞতা, দক্ষতা এবং কমপক্ষে একটি লাইভ প্রজেক্ট লিঙ্ক যোগ করুন।',
            )}
          </p>
        </div>
      )}
    </div>
  );
};

const CvSection: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/15 to-[#F97316]/15 text-[#E31B23]">
          {icon}
        </span>
        {title}
      </h3>
      {subtitle && <span className="text-[10px] font-bold text-slate-500">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const Mini: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white/70 px-2 py-1 text-center">
    <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-0.5 text-[11px] font-black text-slate-900">{value}</p>
  </div>
);

export default DigitalCvPreview;
