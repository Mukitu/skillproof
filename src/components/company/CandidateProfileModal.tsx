import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getCompanyCandidateProfile,
  type CandidateProfileDetail,
} from '../../services/candidateSearch';

interface CandidateProfileModalProps {
  profileId: string | null;
  fullName: string | null;
  jobMatchScore?: number | null;
  aiMatchScore?: number | null;
  aiMatchSource?: string | null;
  onClose: () => void;
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

const ProfileStat: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'slate';
}> = ({ label, value, icon: Icon, tone = 'slate' }) => {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    rose:    'bg-rose-50 border-rose-200 text-rose-700',
    violet:  'bg-violet-50 border-violet-200 text-violet-700',
    sky:     'bg-sky-50 border-sky-200 text-sky-700',
    slate:   'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
};

const Section: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <section>
    <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider mb-2">
      <Icon className="w-3.5 h-3.5 text-[#E31B23]" />
      {title}
    </h3>
    {children}
  </section>
);

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  profileId,
  fullName,
  jobMatchScore = null,
  aiMatchScore = null,
  aiMatchSource = null,
  onClose,
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CandidateProfileDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const d = await getCompanyCandidateProfile(profileId);
        if (cancelled) return;
        setDetail(d);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? (language === 'bn' ? 'প্রোফাইল লোড ব্যর্থ' : 'Failed to load profile'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileId, language]);

  useEffect(() => {
    if (!profileId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileId, onClose]);

  if (!profileId) return null;

  const c = detail?.candidate;
  const completeness = detail?.profile_completeness ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {c?.avatar_url ? (
              <img src={c.avatar_url} alt={c.full_name} className="shrink-0 w-12 h-12 rounded-2xl object-cover border border-white shadow" />
            ) : (
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center font-black shadow">
                {(c?.full_name || fullName || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#E31B23]">
                {language === 'bn' ? 'প্রার্থীর প্রোফাইল' : 'Candidate Profile'}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {c?.full_name || fullName || (language === 'bn' ? 'প্রার্থী' : 'Candidate')}
              </h2>
              <p className="text-[11px] text-slate-600 truncate">
                {c?.current_position || c?.profession || (language === 'bn' ? 'পেশা উল্লেখ নেই' : 'No title')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {language === 'bn' ? 'প্রোফাইল লোড হচ্ছে…' : 'Loading profile…'}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{language === 'bn' ? 'ত্রুটি' : 'Error'}</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && detail?.result === 'not_found' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-bold">{language === 'bn' ? 'প্রার্থী পাওয়া যায়নি' : 'Candidate not found'}</p>
            </div>
          )}

          {!loading && !error && detail?.result === 'forbidden' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
              <Lock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-bold">{language === 'bn' ? 'অনুমতি নেই' : 'Access denied'}</p>
              <p className="text-xs mt-1">{language === 'bn' ? 'আপনার কোম্পানি যাচাইকৃত নয়।' : 'Your company is not verified.'}</p>
            </div>
          )}

          {!loading && !error && detail && detail.result === 'ok' && c && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <ProfileStat
                  label={language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}
                  value={`${c.experience_years ?? 0} ${language === 'bn' ? 'বছর' : 'yrs'}`}
                  icon={Briefcase}
                />
                <ProfileStat
                  label={language === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                  value={`${detail.verified_skills?.length ?? 0}`}
                  icon={ShieldCheck}
                  tone={(detail.verified_skills?.length ?? 0) > 0 ? 'emerald' : 'slate'}
                />
                <ProfileStat
                  label={language === 'bn' ? 'সার্টিফিকেট' : 'Certs'}
                  value={`${detail.certificates?.length ?? 0}`}
                  icon={Award}
                  tone={(detail.certificates?.length ?? 0) > 0 ? 'amber' : 'slate'}
                />
              </div>

              <Section
                title={language === 'bn' ? 'যোগাযোগ ও লিংক' : 'Contact & Links'}
                icon={Mail}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* PRIVACY: Phone numbers are gated on profiles.show_phone_on_verified_profile. */}
                  <div className="flex items-start gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        {language === 'bn' ? 'ফোন' : 'Phone'}
                      </p>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-slate-900 font-bold truncate block hover:underline">{c.phone}</a>
                      ) : (
                        <p className="text-slate-500 italic">
                          {c.show_phone_on_verified_profile
                            ? (language === 'bn' ? 'ফোন নম্বর যোগ করা হয়নি' : 'No phone number on file')
                            : (language === 'bn' ? 'প্রার্থী ফোন নম্বর লুকিয়ে রেখেছেন' : 'Hidden by candidate')}
                        </p>
                      )}
                    </div>
                  </div>
                  {(c.github_url || c.linkedin_url || c.website_url || c.portfolio_url) && (
                    <div className="flex items-start gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {language === 'bn' ? 'লিংক' : 'Links'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {c.github_url && (
                            <a href={c.github_url} target="_blank" rel="noreferrer" className="text-[#E31B23] hover:underline font-bold">GitHub</a>
                          )}
                          {c.linkedin_url && (
                            <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-[#E31B23] hover:underline font-bold">LinkedIn</a>
                          )}
                          {c.website_url && (
                            <a href={c.website_url} target="_blank" rel="noreferrer" className="text-[#E31B23] hover:underline font-bold">Website</a>
                          )}
                          {c.portfolio_url && (
                            <a href={c.portfolio_url} target="_blank" rel="noreferrer" className="text-[#E31B23] hover:underline font-bold">Portfolio</a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {(c.country || c.division || c.district) && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {language === 'bn' ? 'লোকেশন' : 'Location'}
                        </p>
                        <p className="text-slate-900 font-semibold">
                          {[c.district, c.division, c.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {c.bio && (
                <Section title={language === 'bn' ? 'বায়ো' : 'Bio'} icon={Users}>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{c.bio}</p>
                </Section>
              )}

              {(detail.verified_skills?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'যাচাইকৃত দক্ষতা' : 'Verified Skills'} icon={ShieldCheck}>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.verified_skills.map((s, i) => (
                      <span key={`v-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">
                        <ShieldCheck className="w-3 h-3" />
                        {titleCase(s.skill_name)}
                        {s.score != null && <span className="opacity-80">·{s.score}</span>}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {(detail.declared_skills?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'প্রোফাইল দক্ষতা' : 'Declared Skills'} icon={Star}>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.declared_skills.map((s, i) => (
                      <span key={`d-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-50 border-slate-200 text-slate-700">
                        {titleCase(s.name)}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {(detail.completed_roadmaps?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'সম্পন্ন রোডম্যাপ' : 'Completed Roadmaps'} icon={Target}>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detail.completed_roadmaps.map((r, i) => (
                      <li key={`r-${i}`} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate">{r.title}</p>
                          <p className="text-slate-500 truncate">{r.category_name ?? ''}{r.sub_category_name ? ` · ${r.sub_category_name}` : ''}</p>
                          <p className="text-emerald-700 font-bold mt-0.5">{r.completion_pct}%</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {(detail.certificates?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'সার্টিফিকেট' : 'Certificates'} icon={Award}>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detail.certificates.map((cert, i) => (
                      <li key={`cert-${i}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px]">
                        <p className="font-black text-slate-900 truncate">{cert.roadmap_title}</p>
                        <p className="font-mono text-amber-700 mt-0.5 truncate">{cert.credential_number}</p>
                        {cert.issue_date && (
                          <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(cert.issue_date).toLocaleDateString()}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {(detail.education?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'শিক্ষা' : 'Education'} icon={GraduationCap}>
                  <ul className="space-y-2">
                    {detail.education.map((e, i) => (
                      <li key={`edu-${i}`} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate">{e.degree}</p>
                          <p className="text-slate-600 truncate">{e.institution}</p>
                          {(e.year || e.cgpa) && (
                            <p className="text-slate-500 mt-0.5">
                              {[e.year, e.cgpa ? `CGPA ${e.cgpa}` : null].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {(detail.experience?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'অভিজ্ঞতা' : 'Experience'} icon={Briefcase}>
                  <ul className="space-y-2">
                    {detail.experience.map((x, i) => (
                      <li key={`exp-${i}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]">
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-900 truncate">{x.role} · <span className="text-slate-600">{x.company}</span></p>
                            {x.duration && <p className="text-slate-500 mt-0.5">{x.duration}</p>}
                            {x.summary && <p className="text-slate-700 mt-1 leading-relaxed">{x.summary}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Privacy-gated sections below render empty-state copy
                  when the candidate has opted out. The backend already
                  strips the data, we just mirror the state. */}
              {c.hide_ai_on_verified_profile && (
                <Section title={language === 'bn' ? 'ক্যারিয়ার ইন্টেলিজেন্স' : 'Career Intelligence'} icon={Sparkles}>
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-500 flex items-center gap-2">
                    <EyeOff className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'প্রার্থী এই অংশটি লুকিয়ে রেখেছেন।' : 'Hidden by candidate.'}
                  </div>
                </Section>
              )}

              {!c.hide_evidence_on_verified_profile && (detail.public_evidence?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'পাবলিক প্রমাণ' : 'Public Evidence'} icon={ExternalLink}>
                  <ul className="space-y-2">
                    {detail.public_evidence.map((ev, i) => (
                      <li key={`ev-${i}`} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{ev.title || ev.kind || 'Evidence'}</p>
                          {ev.url && <a href={ev.url} target="_blank" rel="noreferrer" className="text-[#E31B23] hover:underline break-all">{ev.url}</a>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {!c.hide_timeline_on_verified_profile && (detail.activity_timeline?.length ?? 0) > 0 && (
                <Section title={language === 'bn' ? 'ক্যারিয়ার টাইমলাইন' : 'Career Timeline'} icon={Clock}>
                  <ol className="relative pl-4 border-l border-slate-200 space-y-2">
                    {detail.activity_timeline.map((t, i) => (
                      <li key={`tl-${i}`} className="text-[11px]">
                        <div className="absolute -left-[5px] mt-1.5 w-2 h-2 rounded-full bg-[#E31B23]" />
                        <p className="font-bold text-slate-900">{t.title || t.category_label || t.category}</p>
                        {t.event_at && <p className="text-slate-500">{new Date(t.event_at).toLocaleDateString()}</p>}
                        {t.description && <p className="text-slate-600 mt-0.5 leading-relaxed">{t.description}</p>}
                      </li>
                    ))}
                  </ol>
                </Section>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50 shrink-0">
          <p className="text-[10px] text-slate-500 truncate">
            {language === 'bn' ? 'প্রোফাইল Privacy নিয়ম মেনে দেখানো হচ্ছে।' : 'Profile shown respecting candidate privacy.'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {profileId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/company/messages?with=${encodeURIComponent(profileId)}`);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs shadow-sm"
                title={language === 'bn' ? 'প্রার্থীকে বার্তা পাঠান' : 'Message the candidate'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'বার্তা' : 'Message'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileModal;
