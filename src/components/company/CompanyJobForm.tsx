import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Wallet,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  COMPANY_JOB_EMPLOYMENT_LABELS,
  COMPANY_JOB_SALARY_MODE_LABELS,
  COMPANY_JOB_SKILL_LEVEL_LABELS,
  COMPANY_JOB_WORK_LABELS,
  ensureSkill,
  fetchCompanyOwnerProfileSkills,
  listActiveCategories,
  listActiveSkills,
  listActiveSubCategories,
  type CompanyJobDetail,
  type CompanyJobEmploymentType,
  type CompanyJobSalaryMode,
  type CompanyJobSkillInput,
  type CompanyJobSkillLevel,
  type CompanyJobSkillPriority,
  type CompanyJobWorkType,
  type CompanyOwnerProfileSkill,
} from '../../services/companyJobs';
import type { Category, Skill, SubCategory } from '../../types/database';

export interface JobFormValues {
  title: string;
  categoryId: string;
  subCategoryId: string;
  employmentType: CompanyJobEmploymentType;
  workType: CompanyJobWorkType;
  location: string;
  vacancies: string;
  salaryMode: CompanyJobSalaryMode;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryLabel: string;
  experienceLabel: string;
  educationLabel: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  deadline: string;
  skills: CompanyJobSkillInput[];
}

const TITLE_MAX = 180;
const LOCATION_MAX = 120;
const CURRENCY_MAX = 8;
const SALARY_LABEL_MAX = 120;
const EXPERIENCE_LABEL_MAX = 80;
const EDUCATION_LABEL_MAX = 120;
const DESCRIPTION_MAX = 8000;
const RESPONSIBILITIES_MAX = 6000;
const REQUIREMENTS_MAX = 6000;
const BENEFITS_MAX = 4000;
const SKILL_NAME_MAX = 80;

export const EMPTY_JOB_FORM: JobFormValues = {
  title: '',
  categoryId: '',
  subCategoryId: '',
  employmentType: 'full_time',
  workType: 'on_site',
  location: '',
  vacancies: '',
  salaryMode: 'negotiable',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'BDT',
  salaryLabel: '',
  experienceLabel: '',
  educationLabel: '',
  description: '',
  responsibilities: '',
  requirements: '',
  benefits: '',
  deadline: '',
  skills: [],
};

export function jobFormFromDetail(detail: CompanyJobDetail): JobFormValues {
  return {
    title: detail.title,
    categoryId: detail.category_id ?? '',
    subCategoryId: detail.sub_category_id ?? '',
    employmentType: detail.employment_type,
    workType: detail.work_type,
    location: detail.location ?? '',
    vacancies: detail.vacancies != null ? String(detail.vacancies) : '',
    salaryMode: detail.salary_mode,
    salaryMin: detail.salary_min != null ? String(detail.salary_min) : '',
    salaryMax: detail.salary_max != null ? String(detail.salary_max) : '',
    salaryCurrency: detail.salary_currency || 'BDT',
    salaryLabel: detail.salary_label ?? '',
    experienceLabel: detail.experience_label ?? '',
    educationLabel: detail.education_label ?? '',
    description: detail.description,
    responsibilities: detail.responsibilities,
    requirements: detail.requirements,
    benefits: detail.benefits ?? '',
    deadline: detail.deadline ?? '',
    skills: detail.skills.map((s) => ({ skill_id: s.skill_id, level: s.level, priority: s.priority })),
  };
}

export function jobFormToPayload(values: JobFormValues) {
  const minNum = values.salaryMin.trim() === '' ? null : Number(values.salaryMin);
  const maxNum = values.salaryMax.trim() === '' ? null : Number(values.salaryMax);
  const vacNum = values.vacancies.trim() === '' ? null : Number(values.vacancies);
  return {
    title: values.title.trim(),
    categoryId: values.categoryId,
    subCategoryId: values.subCategoryId || null,
    employmentType: values.employmentType,
    workType: values.workType,
    location: values.location.trim() || null,
    vacancies: Number.isFinite(vacNum as number) ? vacNum : null,
    salaryMode: values.salaryMode,
    salaryMin: Number.isFinite(minNum as number) ? minNum : null,
    salaryMax: Number.isFinite(maxNum as number) ? maxNum : null,
    salaryCurrency: values.salaryCurrency.trim() || 'BDT',
    salaryLabel: values.salaryLabel.trim() || null,
    experienceLabel: values.experienceLabel.trim() || null,
    educationLabel: values.educationLabel.trim() || null,
    description: values.description.trim(),
    responsibilities: values.responsibilities.trim(),
    requirements: values.requirements.trim(),
    benefits: values.benefits.trim() || null,
    deadline: values.deadline.trim() || null,
    skills: values.skills,
  };
}

interface CompanyJobFormProps {
  initialValues: JobFormValues;
  submitLabel: string;
  submitLabelLoading: string;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
  onCancel: () => void;
  blockedClosedEdit?: boolean;
}

const SKILL_PRIORITY_TONE: Record<CompanyJobSkillPriority, string> = {
  required: 'bg-rose-50 border-rose-200 text-rose-700',
  preferred: 'bg-sky-50 border-sky-200 text-sky-700',
};

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

/**
 * Defined OUTSIDE the CompanyJobForm function body. If we declared it inside
 * the component, React would treat it as a new component type on every render
 * and unmount + remount the section tree, which would yank focus from the
 * active input on every keystroke. Hoisting it to module scope keeps the
 * type identity stable across renders.
 */
const Section: React.FC<SectionProps> = React.memo(
  ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
      <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#E31B23]" />
        {title}
      </h2>
      {children}
    </div>
  ),
);

export const CompanyJobForm: React.FC<CompanyJobFormProps> = ({
  initialValues,
  submitLabel,
  submitLabelLoading,
  onSubmit,
  onCancel,
  blockedClosedEdit,
}) => {
  const { language } = useLanguage();
  const [values, setValues] = useState<JobFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState<Skill[]>([]);
  const [skillNameMap, setSkillNameMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initialValues.skills.forEach((s) => {
      m[s.skill_id] = '';
    });
    return m;
  });
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  /** Skills the signed-in company owner has on their personal profile. */
  const [ownerProfileSkills, setOwnerProfileSkills] = useState<CompanyOwnerProfileSkill[]>([]);
  const [ownerProfileSkillsLoaded, setOwnerProfileSkillsLoaded] = useState(false);
  /** Per-token error message shown after a comma-separated paste / Enter. */
  const [skillTokenError, setSkillTokenError] = useState<string | null>(null);
  const skillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await listActiveCategories();
        if (mounted) setCategories(cats);
      } catch {
        if (mounted) setCategories([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!values.categoryId) {
      setSubCategories([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const subs = await listActiveSubCategories(values.categoryId);
        if (mounted) setSubCategories(subs);
      } catch {
        if (mounted) setSubCategories([]);
      }
    })();
    return () => { mounted = false; };
  }, [values.categoryId]);

  // Load the signed-in company owner's profile skills (and best verification
  // score per skill) so we can recommend them in the picker. This is a
  // best-effort load — failures stay silent because the picker still works
  // with the global `skills` search.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCompanyOwnerProfileSkills();
        if (mounted) {
          setOwnerProfileSkills(list);
          setOwnerProfileSkillsLoaded(true);
        }
      } catch {
        if (mounted) {
          setOwnerProfileSkills([]);
          setOwnerProfileSkillsLoaded(true);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idsToResolve = values.skills
        .map((s) => s.skill_id)
        .filter((id) => !skillNameMap[id]);
      if (idsToResolve.length === 0) return;
      try {
        const list = await listActiveSkills({ limit: 200 });
        if (cancelled) return;
        setSkillNameMap((prev) => {
          const next = { ...prev };
          list.forEach((s) => { if (idsToResolve.includes(s.id)) next[s.id] = s.name; });
          return next;
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [values.skills, skillNameMap]);

  useEffect(() => {
    if (skillTimer.current) clearTimeout(skillTimer.current);
    if (!showSkillPicker) return;
    skillTimer.current = setTimeout(async () => {
      setLoadingSkills(true);
      try {
        const list = await listActiveSkills({ search: skillSearch, limit: 25 });
        const selectedIds = new Set(values.skills.map((s) => s.skill_id));
        const filtered = list.filter((s) => !selectedIds.has(s.id));
        setSkillResults(filtered);
        setSkillNameMap((prev) => {
          const next = { ...prev };
          filtered.forEach((s) => { next[s.id] = s.name; });
          return next;
        });
      } catch {
        setSkillResults([]);
      } finally {
        setLoadingSkills(false);
      }
    }, 250);
    return () => {
      if (skillTimer.current) clearTimeout(skillTimer.current);
    };
  }, [skillSearch, showSkillPicker, values.skills]);

  const setField = <K extends keyof JobFormValues>(k: K, v: JobFormValues[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!values.title.trim()) e.title = language === 'bn' ? 'শিরোনাম আবশ্যক' : 'Title is required';
    else if (values.title.trim().length < 3 || values.title.trim().length > 180) {
      e.title = language === 'bn' ? 'শিরোনাম ৩-১৮০ অক্ষর হতে হবে' : 'Title must be 3-180 characters';
    }
    if (!values.categoryId) e.categoryId = language === 'bn' ? 'ক্যাটাগরি আবশ্যক' : 'Category is required';
    if (values.description.trim().length < 20) {
      e.description = language === 'bn' ? 'বিবরণ কমপক্ষে ২০ অক্ষর হতে হবে' : 'Description must be at least 20 characters';
    }
    if (values.responsibilities.trim().length < 10) {
      e.responsibilities = language === 'bn' ? 'দায়িত্ব কমপক্ষে ১০ অক্ষর হতে হবে' : 'Responsibilities must be at least 10 characters';
    }
    if (values.requirements.trim().length < 10) {
      e.requirements = language === 'bn' ? 'যোগ্যতা কমপক্ষে ১০ অক্ষর হতে হবে' : 'Requirements must be at least 10 characters';
    }
    if (values.salaryMin && values.salaryMax && Number(values.salaryMin) > Number(values.salaryMax)) {
      e.salaryMin = language === 'bn' ? 'সর্বনিম্ন সর্বোচ্চের চেয়ে বেশি হতে পারবে না' : 'Salary min cannot exceed max';
    }
    if (values.vacancies && (Number(values.vacancies) < 1 || Number(values.vacancies) > 999)) {
      e.vacancies = language === 'bn' ? 'শূন্যপদ ১-৯৯৯ এর মধ্যে হতে হবে' : 'Vacancies must be between 1 and 999';
    }
    if (values.deadline) {
      const d = new Date(values.deadline);
      if (Number.isNaN(d.getTime())) e.deadline = language === 'bn' ? 'অবৈধ তারিখ' : 'Invalid date';
      else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d.getTime() < today.getTime()) e.deadline = language === 'bn' ? 'অতীতের তারিখ হতে পারবে না' : 'Cannot be in the past';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (blockedClosedEdit) return;
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setSubmitError(err?.message ?? (language === 'bn' ? 'সংরক্ষণ ব্যর্থ' : 'Save failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = (skill: Skill) => {
    setValues((prev) => {
      if (prev.skills.some((s) => s.skill_id === skill.id)) return prev;
      return {
        ...prev,
        skills: [...prev.skills, { skill_id: skill.id, level: 'intermediate', priority: 'required' }],
      };
    });
    setSkillNameMap((prev) => ({ ...prev, [skill.id]: skill.name }));
    setSkillSearch('');
    setTimeout(() => skillInputRef.current?.focus(), 30);
  };

  /**
   * Add a skill from the company owner's profile. Only profile-skills that
   * resolved to a `public.skills.id` (skillId != null) can be added because
   * `company_job_skills.skill_id` is a FK into `public.skills`. Profile-only
   * skills surface a friendly hint instead of silently dropping.
   */
  const addProfileSkill = (row: CompanyOwnerProfileSkill) => {
    if (!row.skillId) {
      setSkillTokenError(
        language === 'bn'
          ? `“${row.name}” এখনো ট্যাক্সোনমিতে নেই — অ্যাডমিনের কাছে অনুরোধ পাঠান`
          : `"${row.name}" is not in the public skill taxonomy yet — ask the admin to add it`,
      );
      return;
    }
    const id = row.skillId;
    setValues((prev) => {
      if (prev.skills.some((s) => s.skill_id === id)) return prev;
      return {
        ...prev,
        skills: [...prev.skills, { skill_id: id, level: 'intermediate', priority: 'required' }],
      };
    });
    setSkillNameMap((prev) => ({ ...prev, [id]: row.name }));
    setSkillTokenError(null);
  };

  /**
   * Commits one or more comma-separated tokens. A token is "added" only if
   * its name matches a row in `public.skills`.
   *
   * IMPORTANT: We deliberately do NOT rely on the (debounced) `skillResults`
   * here — the user might type a brand-new token and press Enter immediately,
   * in which case `skillResults` is still empty and the commit would silently
   * fail. Instead, we ALWAYS do a fresh `listActiveSkills` lookup for the
   * first token (Supabase is fast enough for the 25-row fallback) and join
   * it with any cached results.
   *
   * Free-form addition: if a token still doesn't match anything in the
   * taxonomy we auto-create it via `ensureSkill` so the company can add
   * truly any skill (e.g. a niche framework) without first contacting the
   * admin. The skill lands in `public.skills` with status='Active' and a
   * generated slug.
   */
  const [committingTokens, setCommittingTokens] = useState(false);

  const commitSkillTokens = useCallback(
    async (rawTokens: string[]) => {
      setSkillTokenError(null);
      const tokens = rawTokens
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (tokens.length === 0) return;

      // Build the union of two sources so name lookups work even when
      // `skillResults` is stale / empty:
      //   1. the currently-shown dropdown results (case-insensitive)
      //   2. a fresh `listActiveSkills` lookup using the first token
      // If `skillResults` already covers everything, we skip the second call.
      const present = new Set(skillResults.map((s) => s.name.trim().toLowerCase()));
      const allNeededCovered = tokens.every((t) => present.has(t.toLowerCase()));

      let extra: Skill[] = [];
      if (!allNeededCovered) {
        const firstToken = tokens[0];
        try {
          extra = await listActiveSkills({ search: firstToken, limit: 100 });
        } catch {
          extra = [];
        }
      }
      const allSkills = [...skillResults, ...extra];
      const byName = new Map(
        allSkills.map((s) => [s.name.trim().toLowerCase(), s] as const),
      );

      // Resolve OUTSIDE the setValues callback so we don't mutate closures.
      // For tokens that aren't in the cached taxonomy, fall back to
      // `ensureSkill` which will auto-create a row in `public.skills` so
      // the company can use any skill name they like.
      const existingIds = new Set(values.skills.map((s) => s.skill_id));
      const newSkills: CompanyJobSkillInput[] = [];
      const newNames: Record<string, string> = {};
      const failedTokens: string[] = [];

      setCommittingTokens(true);
      try {
        for (const tok of tokens) {
          if (newSkills.some((s) => (skillNameMap[s.skill_id] ?? '').toLowerCase() === tok.toLowerCase())) {
            continue;
          }
          let hit = byName.get(tok.toLowerCase());
          if (!hit) {
            try {
              hit = await ensureSkill(tok);
              // Cache the new row so subsequent lookups in this session
              // and the search dropdown get it too.
              setSkillResults((prev) => (prev.some((s) => s.id === hit!.id) ? prev : [...prev, hit!]));
            } catch {
              failedTokens.push(tok);
              continue;
            }
          }
          if (existingIds.has(hit.id)) continue;
          newSkills.push({
            skill_id: hit.id,
            level: 'intermediate',
            priority: 'required',
          });
          newNames[hit.id] = hit.name;
        }
      } finally {
        setCommittingTokens(false);
      }

      if (newSkills.length > 0) {
        setValues((prev) => {
          const ids = new Set(prev.skills.map((s) => s.skill_id));
          const additions = newSkills.filter((s) => !ids.has(s.skill_id));
          if (additions.length === 0) return prev;
          return { ...prev, skills: [...prev.skills, ...additions] };
        });
        setSkillNameMap((prev) => ({ ...prev, ...newNames }));
      }

      if (failedTokens.length > 0) {
        setSkillTokenError(
          language === 'bn'
            ? `“${failedTokens.join(', ')}” যোগ করা যায়নি — পরে আবার চেষ্টা করুন।`
            : `Couldn't add "${failedTokens.join(', ')}" — please try again.`,
        );
      }
    },
    [skillResults, values.skills, skillNameMap, language],
  );

  const handleSkillKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // We commit on Enter or comma-key. Comma is the primary UX — typing
    // "Python, React, TypeScript" should resolve all three on the final
    // comma. Enter also commits so users with mobile keyboards can fire.
    if (e.key === ',') {
      e.preventDefault();
      void commitSkillTokens([skillSearch]);
      setSkillSearch('');
      return;
    }
    if (e.key === 'Enter') {
      // Only commit if the focus is currently on the input and there's
      // something typed — otherwise Enter should submit the parent <form>.
      e.preventDefault();
      void commitSkillTokens([skillSearch]);
      setSkillSearch('');
      return;
    }
  };

  const removeSkill = (id: string) => {
    setValues((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.skill_id !== id) }));
  };

  const updateSkill = (id: string, patch: Partial<CompanyJobSkillInput>) => {
    setValues((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.skill_id === id ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {submitError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <Section title={language === 'bn' ? 'মৌলিক তথ্য' : 'Basic Information'} icon={Briefcase}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'জব শিরোনাম *' : 'Job Title *'}
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={values.title}
                maxLength={TITLE_MAX}
                disabled={blockedClosedEdit}
                onChange={(e) => setField('title', e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: Senior Frontend Developer' : 'e.g. Senior Frontend Developer'}
                className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
              />
            </div>
            {errors.title && <p className="mt-1 text-[11px] text-rose-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={values.categoryId}
                disabled={blockedClosedEdit}
                onChange={(e) => {
                  setField('categoryId', e.target.value);
                  setField('subCategoryId', '');
                }}
                className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition appearance-none disabled:opacity-60"
              >
                <option value="">{language === 'bn' ? 'নির্বাচন করুন' : 'Select category'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {errors.categoryId && <p className="mt-1 text-[11px] text-rose-600">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'সাব-ক্যাটাগরি (ঐচ্ছিক)' : 'Sub-category (optional)'}
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={values.subCategoryId}
                disabled={blockedClosedEdit || !values.categoryId}
                onChange={(e) => setField('subCategoryId', e.target.value)}
                className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition appearance-none disabled:opacity-60"
              >
                <option value="">{language === 'bn' ? 'নির্বাচন করুন' : 'Select sub-category'}</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'কর্মস্থল ধরন' : 'Work Type'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(COMPANY_JOB_WORK_LABELS) as CompanyJobWorkType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={blockedClosedEdit}
                  onClick={() => setField('workType', k)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition ${
                    values.workType === k
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white border-transparent shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {language === 'bn' ? COMPANY_JOB_WORK_LABELS[k].bn : COMPANY_JOB_WORK_LABELS[k].en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'চাকরির ধরন' : 'Employment Type'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(COMPANY_JOB_EMPLOYMENT_LABELS) as CompanyJobEmploymentType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={blockedClosedEdit}
                  onClick={() => setField('employmentType', k)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition ${
                    values.employmentType === k
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white border-transparent shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {language === 'bn' ? COMPANY_JOB_EMPLOYMENT_LABELS[k].bn : COMPANY_JOB_EMPLOYMENT_LABELS[k].en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'লোকেশন (ঐচ্ছিক)' : 'Location (optional)'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={values.location}
                maxLength={LOCATION_MAX}
                disabled={blockedClosedEdit}
                onChange={(e) => setField('location', e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: ঢাকা, বাংলাদেশ' : 'e.g. Dhaka, Bangladesh'}
                className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'শূন্যপদের সংখ্যা (ঐচ্ছিক)' : 'Number of Vacancies (optional)'}
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={999}
                maxLength={4}
                value={values.vacancies}
                disabled={blockedClosedEdit}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setField('vacancies', cleaned);
                }}
                placeholder={language === 'bn' ? 'যেমন: ৩' : 'e.g. 3'}
                className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title={language === 'bn' ? 'বেতন' : 'Salary'} icon={Wallet}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'বেতনের ধরন' : 'Salary Mode'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(COMPANY_JOB_SALARY_MODE_LABELS) as CompanyJobSalaryMode[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={blockedClosedEdit}
                  onClick={() => setField('salaryMode', k)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition ${
                    values.salaryMode === k
                      ? 'bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white border-transparent shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {language === 'bn' ? COMPANY_JOB_SALARY_MODE_LABELS[k].bn : COMPANY_JOB_SALARY_MODE_LABELS[k].en}
                </button>
              ))}
            </div>
          </div>
          {values.salaryMode !== 'negotiable' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {values.salaryMode === 'range' ? (language === 'bn' ? 'সর্বনিম্ন' : 'Minimum') : (language === 'bn' ? 'বেতন' : 'Amount')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  maxLength={12}
                  value={values.salaryMin}
                  disabled={blockedClosedEdit}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                    setField('salaryMin', cleaned);
                  }}
                  placeholder="0"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
                />
              </div>
              {values.salaryMode === 'range' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'সর্বোচ্চ' : 'Maximum'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    maxLength={12}
                    value={values.salaryMax}
                    disabled={blockedClosedEdit}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                      setField('salaryMax', cleaned);
                    }}
                    placeholder="0"
                    className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'মুদ্রা' : 'Currency'}
                </label>
                <input
                  type="text"
                  value={values.salaryCurrency}
                  maxLength={CURRENCY_MAX}
                  disabled={blockedClosedEdit}
                  onChange={(e) => setField('salaryCurrency', e.target.value.slice(0, CURRENCY_MAX))}
                  placeholder="BDT"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
                />
              </div>
            </>
          )}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'বেতন লেবেল (ঐচ্ছিক)' : 'Salary Label (optional)'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">
                {language === 'bn' ? 'যেমন: আকর্ষণীয় প্যাকেজ' : 'e.g. Attractive package'}
              </span>
            </label>
            <input
              type="text"
              value={values.salaryLabel}
              maxLength={SALARY_LABEL_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('salaryLabel', e.target.value)}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
            />
          </div>
          {errors.salaryMin && <p className="md:col-span-4 text-[11px] text-rose-600">{errors.salaryMin}</p>}
        </div>
      </Section>

      <Section title={language === 'bn' ? 'অভিজ্ঞতা ও শিক্ষা' : 'Experience & Education'} icon={GraduationCap}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'অভিজ্ঞতা (ঐচ্ছিক)' : 'Experience (optional)'}
            </label>
            <input
              type="text"
              value={values.experienceLabel}
              maxLength={EXPERIENCE_LABEL_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('experienceLabel', e.target.value)}
              placeholder={language === 'bn' ? 'যেমন: ২-৩ বছর' : 'e.g. 2-3 years'}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'শিক্ষা (ঐচ্ছিক)' : 'Education (optional)'}
            </label>
            <input
              type="text"
              value={values.educationLabel}
              maxLength={EDUCATION_LABEL_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('educationLabel', e.target.value)}
              placeholder={language === 'bn' ? 'যেমন: স্নাতক' : 'e.g. Bachelor degree'}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
            />
          </div>
        </div>
      </Section>

      <Section title={language === 'bn' ? 'দক্ষতা' : 'Required Skills'} icon={Sparkles}>
        <div className="flex flex-wrap gap-2">
          {values.skills.length === 0 && (
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'কোনো দক্ষতা যোগ করা হয়নি।' : 'No skills added yet.'}
            </p>
          )}
          {values.skills.map((s) => (
            <div
              key={s.skill_id}
              className={`flex items-center gap-1.5 rounded-2xl border px-2 py-1.5 ${SKILL_PRIORITY_TONE[s.priority || 'required']}`}
            >
              <span className="text-[11px] font-bold">
                {skillNameMap[s.skill_id] || s.skill_id.slice(0, 6)}
                <span className="ml-1 text-[10px] opacity-70">
                  {language === 'bn' ? COMPANY_JOB_SKILL_LEVEL_LABELS[s.level || 'intermediate'].bn : COMPANY_JOB_SKILL_LEVEL_LABELS[s.level || 'intermediate'].en}
                </span>
              </span>
              <select
                value={s.priority}
                disabled={blockedClosedEdit}
                onChange={(e) => updateSkill(s.skill_id, { priority: e.target.value as CompanyJobSkillPriority })}
                className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
              >
                <option value="required">{language === 'bn' ? 'আবশ্যক' : 'Required'}</option>
                <option value="preferred">{language === 'bn' ? 'পছন্দনীয়' : 'Preferred'}</option>
              </select>
              <select
                value={s.level}
                disabled={blockedClosedEdit}
                onChange={(e) => updateSkill(s.skill_id, { level: e.target.value as CompanyJobSkillLevel })}
                className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
              >
                {(Object.keys(COMPANY_JOB_SKILL_LEVEL_LABELS) as CompanyJobSkillLevel[]).map((k) => (
                  <option key={k} value={k}>
                    {language === 'bn' ? COMPANY_JOB_SKILL_LEVEL_LABELS[k].bn : COMPANY_JOB_SKILL_LEVEL_LABELS[k].en}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={blockedClosedEdit}
                onClick={() => removeSkill(s.skill_id)}
                className="text-rose-600 hover:bg-rose-100 rounded p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="relative mt-3">
          <button
            type="button"
            disabled={blockedClosedEdit}
            onClick={() => setShowSkillPicker((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#E31B23] text-xs font-bold text-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'দক্ষতা যোগ করুন' : 'Add skill'}</span>
            {showSkillPicker ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {showSkillPicker && (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-md p-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={skillInputRef}
                  type="text"
                  value={skillSearch}
                  onChange={(e) => {
                    setSkillSearch(e.target.value);
                    setSkillTokenError(null);
                  }}
                  onKeyDown={handleSkillKeyDown}
                  onPaste={(e) => {
                    // Pasting "Python, React, TypeScript" should commit all
                    // three on paste. We only intercept if the clipboard
                    // actually contains commas.
                    const text = e.clipboardData.getData('text');
                    if (!text || !text.includes(',')) return;
                    e.preventDefault();
                    void commitSkillTokens([...skillSearch.split(','), ...text.split(',')]);
                    setSkillSearch('');
                  }}
                  placeholder={
                    language === 'bn'
                      ? 'যেকোনো স্কিল লিখুন — কমা বা এন্টার দিয়ে আলাদা করুন'
                      : 'Type any skill — comma or Enter to add'
                  }
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] disabled:opacity-60"
                />
                {committingTokens && (
                  <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                )}
              </div>
              {skillTokenError && (
                <p className="mt-2 text-[11px] text-rose-600">{skillTokenError}</p>
              )}
              <p className="mt-1 text-[10px] text-slate-500">
                {language === 'bn'
                  ? 'যেমন: Python, React, TypeScript — এন্টার বা কমা চাপলে যোগ হবে'
                  : 'e.g. Python, React, TypeScript — press Enter or comma to add (any skill works)'}
              </p>
              <div className="mt-2 max-h-72 overflow-y-auto">
                {loadingSkills ? (
                  <div className="p-3 text-xs text-slate-500 inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {language === 'bn' ? 'খোঁজা হচ্ছে…' : 'Searching…'}
                  </div>
                ) : (
                  <>
                    {skillResults.length > 0 && (
                      <ul className="divide-y divide-slate-100">
                        {skillResults.map((skill) => (
                          <li key={skill.id}>
                            <button
                              type="button"
                              onClick={() => addSkill(skill)}
                              className="w-full flex items-center justify-between gap-2 px-2 py-2 hover:bg-slate-50 text-left"
                            >
                              <span className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate block">{skill.name}</span>
                                {skill.description && (
                                  <span className="text-[10px] text-slate-500 truncate block">{skill.description}</span>
                                )}
                              </span>
                              <Plus className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Recommendations from the company owner's profile —
                        always shown (even when the global search has no
                        hits) so the picker never feels empty. */}
                    {ownerProfileSkillsLoaded && ownerProfileSkills.length > 0 && (
                      <div className={skillResults.length > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
                        <div className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <Sparkles className="w-3 h-3 text-[#E31B23]" />
                          <span>
                            {language === 'bn'
                              ? 'আপনার প্রোফাইল থেকে (রেকমেন্ডেড)'
                              : 'From your profile (recommended)'}
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {ownerProfileSkills
                            .filter((row) => {
                              // Filter by search token if user is searching
                              if (!skillSearch.trim()) return true;
                              const q = skillSearch.trim().toLowerCase();
                              return row.name.toLowerCase().includes(q);
                            })
                            .filter((row) => !values.skills.some((s) => {
                              const chipName = (skillNameMap[s.skill_id] ?? '').toLowerCase();
                              return chipName === row.name.toLowerCase();
                            }))
                            .map((row) => {
                              const score = row.bestScore;
                              const scoreTone =
                                score == null
                                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                                  : score >= 85
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : score >= 60
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-rose-200 bg-rose-50 text-rose-700';
                              const scoreLabel =
                                score == null
                                  ? (language === 'bn' ? 'প্রোফাইলে আছে' : 'On profile')
                                  : `${Math.round(score)}% ${language === 'bn' ? 'ম্যাচ' : 'match'}`;
                              return (
                                <li key={row.id}>
                                  <button
                                    type="button"
                                    onClick={() => addProfileSkill(row)}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-2 hover:bg-slate-50 text-left"
                                  >
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-900 truncate block">{row.name}</span>
                                        {row.category && (
                                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 truncate">
                                            {row.category}
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-slate-500 truncate block">
                                        {row.skillId
                                          ? (language === 'bn' ? 'ট্যাক্সোনমিতে ম্যাচ আছে' : 'In taxonomy')
                                          : (language === 'bn' ? 'প্রোফাইল স্কিল' : 'Profile skill')}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${scoreTone}`}>
                                        {score != null && <Sparkles className="w-2.5 h-2.5" />}
                                        <span>{scoreLabel}</span>
                                      </span>
                                      <Plus className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
                    {skillResults.length === 0 &&
                      (ownerProfileSkillsLoaded ? ownerProfileSkills.length === 0 : true) && (
                        <p className="p-3 text-xs text-slate-500">
                          {language === 'bn'
                            ? 'নিচে যেকোনো স্কিল লিখুন — এন্টার বা কমা চাপলেই যোগ হয়ে যাবে'
                            : 'Type any skill below — press Enter or comma to add it right away'}
                        </p>
                      )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title={language === 'bn' ? 'বিবরণ' : 'Job Description'} icon={Briefcase}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'বিবরণ *' : 'Description *'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">{values.description.length}/8000</span>
            </label>
            <textarea
              rows={5}
              value={values.description}
              maxLength={DESCRIPTION_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('description', e.target.value.slice(0, DESCRIPTION_MAX))}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-y disabled:opacity-60"
            />
            {errors.description && <p className="mt-1 text-[11px] text-rose-600">{errors.description}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'দায়িত্ব *' : 'Responsibilities *'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">{values.responsibilities.length}/6000</span>
            </label>
            <textarea
              rows={4}
              value={values.responsibilities}
              maxLength={RESPONSIBILITIES_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('responsibilities', e.target.value.slice(0, RESPONSIBILITIES_MAX))}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-y disabled:opacity-60"
            />
            {errors.responsibilities && <p className="mt-1 text-[11px] text-rose-600">{errors.responsibilities}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'যোগ্যতা *' : 'Requirements *'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">{values.requirements.length}/6000</span>
            </label>
            <textarea
              rows={4}
              value={values.requirements}
              maxLength={REQUIREMENTS_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('requirements', e.target.value.slice(0, REQUIREMENTS_MAX))}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-y disabled:opacity-60"
            />
            {errors.requirements && <p className="mt-1 text-[11px] text-rose-600">{errors.requirements}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'সুবিধা (ঐচ্ছিক)' : 'Benefits (optional)'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">{values.benefits.length}/4000</span>
            </label>
            <textarea
              rows={3}
              value={values.benefits}
              maxLength={BENEFITS_MAX}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('benefits', e.target.value.slice(0, BENEFITS_MAX))}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-y disabled:opacity-60"
            />
          </div>
        </div>
      </Section>

      <Section title={language === 'bn' ? 'আবেদনের সময়সীমা' : 'Application Deadline'} icon={CalendarClock}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'শেষ তারিখ (ঐচ্ছিক)' : 'Deadline (optional)'}
            </label>
            <input
              type="date"
              value={values.deadline}
              disabled={blockedClosedEdit}
              onChange={(e) => setField('deadline', e.target.value)}
              className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition disabled:opacity-60"
            />
            {errors.deadline && <p className="mt-1 text-[11px] text-rose-600">{errors.deadline}</p>}
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2 sticky bottom-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
        </button>
        <button
          type="submit"
          disabled={submitting || blockedClosedEdit}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{submitting ? submitLabelLoading : submitLabel}</span>
        </button>
      </div>
    </form>
  );
};

export default CompanyJobForm;
