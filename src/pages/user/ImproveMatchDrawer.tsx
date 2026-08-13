
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award, BookOpen, CheckCircle2, ClipboardList, ExternalLink, Lightbulb,
  Loader2, Map, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getFilterProjection,
  tokenize,
  findMissingSkillRoadmaps,
  type VerifiedSkillsProjection,
} from '../../services/jobMatch';
import { getMyPassports } from '../../services/passports';
import { listMyRoadmapEnrollments } from '../../services/roadmaps';
import { listMySkillVerificationSubmissions } from '../../services/skillVerification';
import type {
  CareerRoadmapEnrollment,
  Job,
  JobMatchResult,
  SkillPassport,
  SkillVerificationMySubmission,
  VerifiedSkill,
} from '../../types/database';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    href?: string;
    badge?: string;
  }>;
}

export const ImproveMatchDrawer: React.FC<{
  job: Job;
  match: JobMatchResult | null;
  onClose: () => void;
}> = ({ job, match, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [projection, setProjection] = useState<VerifiedSkillsProjection>({
    verifiedSkills: [],
    passedVerificationTitles: [],
    completedRoadmapTitles: [],
    activeRoadmapTitles: [],
  });
  const [roadmaps, setRoadmaps] = useState<CareerRoadmapEnrollment[]>([]);
  const [verifications, setVerifications] = useState<SkillVerificationMySubmission[]>([]);
  const [passports, setPassports] = useState<SkillPassport[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [proj, enrolls, verifs, pports] = await Promise.all([
          getFilterProjection(),
          listMyRoadmapEnrollments().catch(() => [] as CareerRoadmapEnrollment[]),
          listMySkillVerificationSubmissions().catch(() => [] as SkillVerificationMySubmission[]),
          getMyPassports().catch(() => [] as SkillPassport[]),
        ]);
        if (cancelled) return;
        setProjection(proj);
        setRoadmaps(enrolls);
        setVerifications(verifs);
        setPassports(pports);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const jobTokens = useMemo(() => {
    const set = new Set<string>();
    for (const s of job.required_skills ?? []) {
      for (const t of tokenize(s)) set.add(t);
    }
    
    
    for (const t of tokenize(job.title)) set.add(t);
    return set;
  }, [job]);

  const missingTokens = useMemo(() => {
    const set = new Set<string>();
    for (const s of match?.missing_skills_json ?? []) {
      for (const t of tokenize(s)) set.add(t);
    }
    return set;
  }, [match]);

  
  const sectionRoadmaps = useMemo<Section>(() => {
    const items = roadmaps
      .filter((r) => r.status === 'active' || r.status === 'completed')
      .map((r) => {
        const titleTokens = tokenize(r.title);
        const overlap = titleTokens.some((t) => jobTokens.has(t) || missingTokens.has(t));
        if (!overlap) return null;
        return {
          id: r.id,
          title: r.title,
          subtitle: r.status === 'completed' ? 'Completed' : `Day ${r.current_day}/${r.total_days} · ${r.completion_pct}%`,
          meta: r.completion_pct != null ? `${r.completion_pct}% complete` : undefined,
          badge: r.status === 'completed' ? 'Completed' : 'Active',
          href: '/dashboard/roadmaps',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    return {
      id: 'roadmaps',
      title: 'Relevant Roadmaps',
      icon: <Map size={14} />,
      items,
    };
  }, [roadmaps, jobTokens, missingTokens]);

  
  const sectionVerifications = useMemo<Section>(() => {
    const items = verifications
      .filter((v) => v.status === 'Passed' || v.status === 'Under Review' || v.status === 'Submitted')
      .map((v) => {
        const title = v.task_title ?? '';
        if (!title) return null;
        const titleTokens = tokenize(title);
        const overlap = titleTokens.some((t) => jobTokens.has(t) || missingTokens.has(t));
        if (!overlap) return null;
        return {
          id: v.id,
          title,
          subtitle: v.category_name ?? undefined,
          meta: v.score != null ? `Score ${v.score} / ${v.task_max_marks ?? '?'}` : undefined,
          badge: v.status,
          href: '/dashboard/verifications',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    return {
      id: 'verifications',
      title: 'Skill Verifications',
      icon: <ClipboardList size={14} />,
      items,
    };
  }, [verifications, jobTokens, missingTokens]);

  
  const sectionPassports = useMemo<Section>(() => {
    const items: Section['items'] = [];
    for (const p of passports) {
      if (p.status !== 'active' && p.status !== 'pending_approval') continue;
      const verified: VerifiedSkill[] = Array.isArray(p.verified_skills) ? p.verified_skills : [];
      const overlap = verified.some((v) => {
        const t = tokenize(v.name);
        return t.some((tk) => jobTokens.has(tk) || missingTokens.has(tk));
      });
      if (!overlap) continue;
      items.push({
        id: p.id,
        title: p.title,
        subtitle: p.main_category_name ?? 'Skill Passport',
        meta: `${p.passed_count} passed · ${p.average_marks} avg`,
        badge: p.level,
        href: '/dashboard/passport',
      });
    }
    return {
      id: 'passports',
      title: 'Skill Passports',
      icon: <ShieldCheck size={14} />,
      items,
    };
  }, [passports, jobTokens, missingTokens]);

  
  const sectionCourses = useMemo<Section>(() => {
    
    
    const items = roadmaps
      .filter((r) => r.status === 'completed')
      .map((r) => {
        const titleTokens = tokenize(r.title);
        const overlap = titleTokens.some((t) => jobTokens.has(t) || missingTokens.has(t));
        if (!overlap) return null;
        return {
          id: r.id,
          title: `${r.title} — course certificate`,
          subtitle: 'Completed roadmap · eligible for SkillProof certificate',
          badge: 'Course certificate',
          href: '/dashboard/certificates',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    return {
      id: 'courses',
      title: 'Completed Courses',
      icon: <BookOpen size={14} />,
      items,
    };
  }, [roadmaps, jobTokens, missingTokens]);

  
  
  
  
  const sectionMissingRoadmaps = useMemo<Section>(() => {
    const missing: string[] = Array.isArray(match?.missing_skills_required)
      ? (match!.missing_skills_required as string[])
      : Array.isArray(match?.missing_skills_json)
        ? (match!.missing_skills_json as string[])
        : [];
    const items = findMissingSkillRoadmaps(missing, projection).map((r) => ({
      id: r.title,
      title: r.title,
      subtitle: `Covers the missing skill: ${r.matchedSkill}`,
      meta: `${r.hits} token overlap`,
      badge: 'Learn this',
      href: '/dashboard/roadmap',
    }));
    return {
      id: 'missing-roadmaps',
      title: 'Roadmaps for your missing skills',
      icon: <Map size={14} />,
      items,
    };
  }, [match, projection]);

  const sections = useMemo(
    () => [
      sectionMissingRoadmaps,
      sectionRoadmaps,
      sectionVerifications,
      sectionPassports,
      sectionCourses,
    ],
    [
      sectionMissingRoadmaps,
      sectionRoadmaps,
      sectionVerifications,
      sectionPassports,
      sectionCourses,
    ],
  );

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm"
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl">
        <header
          className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 text-white sm:p-5"
          style={{
            background:
              'linear-gradient(135deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/80">
              <Lightbulb size={12} /> Improve Your Match
            </p>
            <h2 className="mt-1 break-words text-base font-bold sm:text-lg">{job.title}</h2>
            <p className="break-words text-xs text-white/80">{job.company_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Loading your learning resources…
            </div>
          ) : totalItems === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-indigo-500" />
              <p className="font-semibold text-slate-700">No matching resources yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Enroll in a roadmap, request a skill verification, or earn a
                Skill Passport to start building your match.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link
                  to="/dashboard/roadmaps"
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-bold text-white shadow"
                >
                  Browse roadmaps <ExternalLink size={11} />
                </Link>
                <Link
                  to="/dashboard/passport"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700"
                >
                  View passports
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {match && (match.missing_skills_json ?? []).length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <p className="font-bold uppercase tracking-wider text-rose-800">
                    Focus on these skills
                  </p>
                  <p className="mt-1 text-rose-700">
                    {match.missing_skills_json.join(' · ')}
                  </p>
                </div>
              )}

              {sections.map((section) => (
                <section key={section.id}>
                  {section.items.length > 0 && (
                    <>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span className="text-indigo-500">{section.icon}</span>
                        {section.title}
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {section.items.length}
                        </span>
                      </h3>
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-bold text-slate-900">
                                  {item.title}
                                </p>
                                {item.subtitle && (
                                  <p className="break-words text-[11px] text-slate-500">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                              {item.badge && (
                                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                              {item.meta && <span className="break-words">{item.meta}</span>}
                              {item.href && (
                                <Link
                                  to={item.href}
                                  className="inline-flex shrink-0 items-center gap-1 font-bold text-indigo-600 hover:underline whitespace-nowrap"
                                >
                                  Open <ExternalLink size={10} />
                                </Link>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              ))}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                <p className="flex items-center gap-1 font-bold text-slate-700">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  Tips to raise your match
                </p>
                <ul className="mt-1 space-y-1 pl-4">
                  <li>Pass skill verifications in the missing skill areas.</li>
                  <li>Complete an active roadmap to earn a Skill Passport.</li>
                  <li>Update your profile so the AI has fresh evidence.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ImproveMatchDrawer;
