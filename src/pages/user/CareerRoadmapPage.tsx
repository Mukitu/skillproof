
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key as ReactKey } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Archive, BookOpen, Calendar, CheckCircle2, ChevronRight, Clock,
  Filter, Library, Link2, ListOrdered, Loader2, Lock, Play, Search,
  Sparkles, Target, TrendingUp, Unlock, Youtube, Award, GraduationCap,
  ListChecks, NotebookPen, ExternalLink, ShieldCheck, XCircle,
} from 'lucide-react';
import {
  completeEnrollmentDay, enrollInRoadmap, getEnrollmentModules,
  getEnrollmentProgress, getRoadmapEnrollment, getRoadmapTemplate,
  getRoadmapTemplateDay, getUnlockedDayDetails,
  listMyRoadmapEnrollmentsWithTemplateStatus,
  listPublishedRoadmapLibrary,
} from '../../services/roadmaps';
import type { EnrollmentWithTemplateStatus } from '../../services/roadmaps';
import { getAllExamsForEnrollment } from '../../services/roadmapExams';
import { listCategories, listSubCategories } from '../../services/taxonomy';
import { useRealtimeRefresh } from '../../services/realtime';
import { useMyCompletionRequests, useEnrollmentCompletionStatus } from '../../services/roadmapCompletion';
import { ModuleExamSection } from '../../components/user/ModuleExamSection';
import { buildYouTubeEmbedUrl, parseYouTubeVideoId } from '../../utils/youtube';
import type {
  CareerRoadmapEnrollment, CareerRoadmapModule, CareerRoadmapProgress,
  Category, RoadmapCompletionRequest, RoadmapModuleExam, RoadmapModuleExamSubmission,
  RoadmapTemplate, RoadmapTemplateDay, SubCategory,
} from '../../types/database';




function formatDuration(mins: number) {
  if (!mins) return '—';
  const total = mins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} মিনিট`;
  return m === 0 ? `${h} ঘণ্টা` : `${h} ঘণ্টা ${m} মিনিট`;
}
function formatCountdown(ms: number) {
  if (ms <= 0) return 'এখনই খোলা যাবে';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} ঘণ্টা ${m} মিনিট বাকি`;
  if (m > 0) return `${m} মিনিট ${s} সেকেন্ড বাকি`;
  return `${s} সেকেন্ড বাকি`;
}




export const CareerRoadmapPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  if (params.enrollmentId && params.dayNumber) {
    return <DayDetailRoute enrollmentId={params.enrollmentId} dayNumber={parseInt(params.dayNumber, 10)} />;
  }
  if (params.enrollmentId) {
    return <EnrollmentDetailRoute enrollmentId={params.enrollmentId} />;
  }
  return <LibraryAndMyRoadmaps onOpenEnrollment={(id) => navigate(`/dashboard/roadmap/${id}`)} />;
};
export default CareerRoadmapPage;




function LibraryAndMyRoadmaps({ onOpenEnrollment }: { onOpenEnrollment: (id: string) => void }) {
  const [templates, setTemplates] = useState<RoadmapTemplate[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithTemplateStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { rows: completionRequests } = useMyCompletionRequests();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, e, c, s] = await Promise.all([
        listPublishedRoadmapLibrary(),
        listMyRoadmapEnrollmentsWithTemplateStatus(),
        listCategories(true), listSubCategories(undefined, true),
      ]);
      setTemplates(t); setEnrollments(e); setCategories(c); setSubs(s); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useRealtimeRefresh(
    ['roadmap_templates', 'career_roadmap_enrollment', 'career_roadmap_progress',
     'career_roadmap_modules', 'roadmap_completion_requests'],
    reload,
  );

  const enrolledTemplateIds = useMemo(() => new Set(enrollments.map((e) => e.template_id)), [enrollments]);

  const filteredSubs = useMemo(() => subs.filter((s) => s.category_id === categoryFilter), [subs, categoryFilter]);
  const filteredTemplates = useMemo(() => {
    const s = search.trim().toLowerCase();
    return templates.filter((t) => {
      
      
      
      if (t.deleted_at) return false;
      if (t.status !== 'Published') return false;
      if (categoryFilter && t.category_id !== categoryFilter) return false;
      if (subFilter && t.sub_category_id !== subFilter) return false;
      if (s && !t.title.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [templates, categoryFilter, subFilter, search]);

  const onEnroll = async (templateId: string) => {
    setBusyId(templateId); setError('');
    try { await enrollInRoadmap(templateId); await reload(); }
    catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  };

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> লোড হচ্ছে...</div>;

  return (
    <div className="space-y-8">
      {}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 sm:p-6 text-white shadow">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80"><Sparkles size={14} /> স্কিলপ্রুফ রোডম্যাপ</div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl break-words">ক্যারিয়ার রোডম্যাপ লাইব্রেরি</h1>
        <p className="mt-1 max-w-2xl text-sm opacity-90 break-words">একাধিক রোডম্যাপে একসাথে enroll করুন। প্রতিটি দিন আগের দিন সম্পন্ন হওয়ার ২৪ ঘণ্টা পরে খোলে — সার্ভার-সাইড enforced।</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {}
      <section>
        <div className="mb-3 flex items-center gap-2"><GraduationCap size={18} /><h2 className="text-lg font-semibold">আমার রোডম্যাপ ({enrollments.length})</h2></div>
        {enrollments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            আপনি এখনও কোনো রোডম্যাপে enroll করেননি। নিচের লাইব্রেরি থেকে একটি বেছে নিন।
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => (
              <EnrollmentCard
                key={e.id}
                enrollment={e}
                completionRequest={completionRequests.find((r) => r.enrollment_id === e.id) ?? null}
                onOpen={() => onOpenEnrollment(e.id)}
              />
            ))}
          </div>
        )}
      </section>

      {}
      <section>
        <div className="mb-3 flex items-center gap-2"><Library size={18} /><h2 className="text-lg font-semibold">রোডম্যাপ লাইব্রেরি ({filteredTemplates.length})</h2></div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]"><Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="রোডম্যাপ খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm" /></div>
          <div className="flex items-center gap-1 text-xs text-slate-500"><Filter size={12} /> ফিল্টার:</div>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setSubFilter(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-0"><option value="">সকল ক্যাটাগরি</option>{categories.filter((c) => c.status === 'Active').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} disabled={!categoryFilter} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 min-w-0"><option value="">সকল সাব-ক্যাটাগরি</option>{filteredSubs.filter((s) => s.status === 'Active').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">কোনো রোডম্যাপ পাওয়া যায়নি।</div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} categories={categories} subCategories={subs}
                enrolled={enrolledTemplateIds.has(t.id)}
                enrolling={busyId === t.id}
                onEnroll={() => onEnroll(t.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EnrollmentCard({
  enrollment: e, completionRequest, onOpen,
}: {
  enrollment: EnrollmentWithTemplateStatus;
  completionRequest: RoadmapCompletionRequest | null;
  onOpen: () => void;
  key?: ReactKey;
}) {
  const progressPct = e.total_days > 0 ? Math.round((e.completed_count / e.total_days) * 100) : 0;
  return (
    <div onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <ProgressRing percent={progressPct} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{e.title}</h3>
            {e.template_deleted && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800" title="এই রোডম্যাপটি অ্যাডমিন আর্কাইভ করেছে, কিন্তু আপনার প্রোগ্রেস ও সার্টিফিকেট সংরক্ষিত আছে">
                <Archive size={10} /> Archived by admin
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">শুরু: {new Date(e.started_at).toLocaleDateString('bn-BD')}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Calendar size={12} /> {e.completed_count}/{e.total_days} দিন</span>
            <span className="flex items-center gap-1"><Target size={12} /> {e.status === 'completed' ? 'সম্পন্ন' : 'চলমান'}</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#E31B23] to-[#F97316]" style={{ width: `${progressPct}%` }} /></div>
      {completionRequest && <CompletionStatusBadge request={completionRequest} />}
    </div>
  );
}

function CompletionStatusBadge({ request }: { request: RoadmapCompletionRequest }) {
  const map: Record<typeof request.request_status, { label: string; cls: string; icon: any }> = {
    Pending: { label: 'Pending Review', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: <Clock size={10} /> },
    Approved: { label: 'Approved · Certificate Ready', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <ShieldCheck size={10} /> },
    Rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-800 border-rose-200', icon: <XCircle size={10} /> },
  };
  const v = map[request.request_status];
  return (
    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${v.cls}`}>
      {v.icon} {v.label}
    </div>
  );
}

function TemplateCard({ template: t, categories, subCategories, enrolled, enrolling, onEnroll }: { template: RoadmapTemplate; categories: Category[]; subCategories: SubCategory[]; enrolled: boolean; enrolling: boolean; onEnroll: () => Promise<void>; key?: ReactKey }) {
  const category = categories.find((c) => c.id === t.category_id); const sub = subCategories.find((s) => s.id === t.sub_category_id);
  const totalMins = 60 * t.total_days;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-[#E31B23] via-[#F97316] to-[#FF8A00]">
        {t.thumbnail_url ? <img src={t.thumbnail_url} alt={t.title} className="h-full w-full object-cover" /> : <BookOpen size={32} className="text-white/80" />}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold">{t.title}</h3>
        <p className="line-clamp-2 text-xs text-slate-500">{t.description || '—'}</p>
        <div className="flex flex-wrap gap-1 text-xs">{category && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{category.name}</span>}{sub && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{sub.name}</span>}</div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1"><Calendar size={12} /> {t.total_days} দিন</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(totalMins)}</span>
          <span className="flex items-center gap-1"><Sparkles size={12} /> {t.difficulty}</span>
        </div>
        <button onClick={onEnroll} disabled={enrolled || enrolling} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-2 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-40">
          {enrolling ? <Loader2 size={14} className="animate-spin" /> : enrolled ? <CheckCircle2 size={14} /> : <Play size={14} />}
          {enrolled ? 'ইতোমধ্যে enrolled' : 'Enroll করুন'}
        </button>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 22; const c = 2 * Math.PI * r; const offset = c - (percent / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={r} stroke="rgb(226,232,240)" strokeWidth="4" fill="none" />
        <circle cx="25" cy="25" r={r} stroke="url(#prog)" strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
        <defs><linearGradient id="prog" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700">{percent}%</div>
    </div>
  );
}




function EnrollmentDetailRoute({ enrollmentId }: { enrollmentId: string }) {
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<CareerRoadmapEnrollment | null>(null);
  const [template, setTemplate] = useState<RoadmapTemplate | null>(null);
  const [modules, setModules] = useState<CareerRoadmapModule[]>([]);
  const [progress, setProgress] = useState<CareerRoadmapProgress[]>([]);
  const [exams, setExams] = useState<RoadmapModuleExam[]>([]);
  const [examSubmissions, setExamSubmissions] = useState<Record<number, RoadmapModuleExamSubmission>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { request: completionRequest, refresh: refreshCompletion } = useEnrollmentCompletionStatus(enrollmentId);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const reload = useCallback(async () => {
    try {
      const e = await getRoadmapEnrollment(enrollmentId); if (!e) { setError('Enrollment not found.'); return; }
      setEnrollment(e); setTemplate(await getRoadmapTemplate(e.template_id));
      const [m, p, examData] = await Promise.all([
        getEnrollmentModules(enrollmentId),
        getEnrollmentProgress(enrollmentId),
        getAllExamsForEnrollment(enrollmentId).catch(() => ({ exams: [], latestSubmissionsByDay: {} })),
      ]);
      setModules(m); setProgress(p);
      setExams(examData.exams);
      setExamSubmissions(examData.latestSubmissionsByDay);
      setError('');
    } catch (e: any) { setError(e.message); }
  }, [enrollmentId]);

  useEffect(() => { void reload(); }, [reload]);
  useRealtimeRefresh(
    ['career_roadmap_modules', 'career_roadmap_progress', 'career_roadmap_enrollment',
     'roadmap_completion_requests', 'roadmap_module_exams', 'roadmap_module_exam_submissions'],
    () => { void reload(); void refreshCompletion(); },
  );

  const enabledExamsByDay = useMemo(
    () => new Map(exams.filter((e) => e.exam_enabled).map((e) => [e.day_number, e])),
    [exams],
  );

  const completedMap = useMemo(() => { const m = new Map<number, CareerRoadmapProgress>(); for (const p of progress) if (p.is_completed) m.set(p.day_number, p); return m; }, [progress]);
  const completedCount = completedMap.size;
  const progressPct = enrollment ? Math.round((completedCount / enrollment.total_days) * 100) : 0;

  const lastCompleted = useMemo(() => {
    const arr = Array.from(completedMap.values()) as CareerRoadmapProgress[];
    return arr.sort((a, b) => b.day_number - a.day_number)[0];
  }, [completedMap]);
  const nextUnlockAt = lastCompleted?.completed_at ? new Date(lastCompleted.completed_at).getTime() + 24 * 60 * 60 * 1000 : enrollment ? new Date(enrollment.started_at).getTime() : 0;
  const nextUnlockIn = nextUnlockAt - now;

  const isUnlocked = (n: number) => {
    if (n === 1) return true;
    if (completedMap.has(n)) return true;
    const prev = completedMap.get(n - 1);
    if (!prev?.completed_at) return false;
    const unlockAt = new Date(prev.completed_at).getTime() + 24 * 60 * 60 * 1000;
    if (unlockAt > now) return false;
    
    
    
    const prevExam = enabledExamsByDay.get(n - 1);
    if (prevExam) {
      const sub = examSubmissions[n - 1];
      if (!sub || sub.status !== 'Passed') return false;
    }
    return true;
  };

  const onComplete = async (n: number) => {
    setBusy(true); setError('');
    try { await completeEnrollmentDay(enrollmentId, n); await reload(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (!enrollment || !template) return <div className="flex items-center justify-center p-12 text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/roadmap')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> লাইব্রেরিতে ফিরুন</button>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 sm:p-6 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80"><Sparkles size={14} /> সক্রিয় রোডম্যাপ</div>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl break-words">{template.title}</h1>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="বর্তমান দিন" value={`দিন ${enrollment.current_day}`} />
            <Stat label="সম্পন্ন" value={`${completedCount} / ${enrollment.total_days}`} />
            <Stat label="অগ্রগতি" value={`${progressPct}%`} />
            <Stat label="আনুমানিক সমাপ্তি" value={new Date(new Date(enrollment.started_at).getTime() + enrollment.total_days * 24 * 60 * 60 * 1000).toLocaleDateString('bn-BD')} />
          </div>
        </div>
        <div className="p-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${progressPct}%` }} /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Pill icon={<Clock size={14} />} label="পরবর্তী আনলক">
              {completedCount === enrollment.total_days ? 'রোডম্যাপ সম্পন্ন' : formatCountdown(nextUnlockIn)}
            </Pill>
            <Pill icon={<Calendar size={14} />} label="মোট দিন">{enrollment.total_days} দিন</Pill>
            <Pill icon={<TrendingUp size={14} />} label="গতি">প্রতি ২৪ ঘণ্টায় ১ দিন</Pill>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold"><BookOpen size={16} /> দৈনিক পাঠ</h2>
        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">এই enrollment এ এখনও কোনো দিন যোগ হয়নি।</div>
        ) : modules.map((m) => {
          const completed = completedMap.get(m.day_number);
          const unlocked = isUnlocked(m.day_number);
          const isCurrent = m.day_number === enrollment.current_day;
          const exam = enabledExamsByDay.get(m.day_number);
          const examSub = exam ? examSubmissions[exam.day_number] : undefined;
          const examPassed = examSub?.status === 'Passed';
          const examFailed = examSub?.status === 'Failed';
          const examPending = examSub?.status === 'Pending Review' || examSub?.status === 'Under Review';
          return (
            <button
              key={m.id}
              onClick={() => unlocked && navigate(`/dashboard/roadmap/${enrollmentId}/day/${m.day_number}`)}
              disabled={!unlocked}
              className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition sm:gap-4 ${
                isCurrent ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
              } ${unlocked ? 'hover:border-blue-200 hover:shadow-sm' : 'opacity-70'}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
                completed ? 'bg-emerald-100 text-emerald-700' : unlocked ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {completed ? <CheckCircle2 size={20} /> : unlocked ? <Unlock size={18} /> : <Lock size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">দিন {m.day_number}</span>
                  {completed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">সম্পন্ন</span>}
                  {exam && (
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      examPassed ? 'bg-emerald-100 text-emerald-700'
                      : examFailed ? 'bg-rose-100 text-rose-700'
                      : examPending ? 'bg-amber-100 text-amber-700'
                      : 'bg-amber-50 text-amber-800'
                    }`}>
                      <Award size={10} />
                      {examPassed ? 'Exam Passed' : examFailed ? 'Exam Failed' : examPending ? 'Exam Under Review' : 'Exam Required'}
                    </span>
                  )}
                  {!completed && !unlocked && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Locked</span>}
                </div>
                <h3 className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{m.title}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {unlocked && <span className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap"><Clock size={12} /> {m.estimated_minutes} মিনিট</span>}
                {unlocked && <ChevronRight size={16} className="text-slate-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {enrollment.status === 'completed' && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <Award size={28} />
          <div><h3 className="font-semibold">অভিনন্দন! রোডম্যাপ সম্পন্ন হয়েছে।</h3><p className="text-xs">আপনি সব {enrollment.total_days}টি দিন সফলভাবে সম্পন্ন করেছেন।</p></div>
        </div>
      )}

      {completionRequest && (
        <CompletionRequestBanner request={completionRequest} />
      )}
    </div>
  );
}

function CompletionRequestBanner({ request }: { request: RoadmapCompletionRequest }) {
  if (request.request_status === 'Pending') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900">
        <Clock size={28} className="shrink-0" />
        <div>
          <h3 className="font-semibold">Completion request pending admin review</h3>
          <p className="text-xs">Requested on {new Date(request.requested_at).toLocaleString()}. We'll trigger your course completion certificate as soon as the admin approves.</p>
        </div>
      </div>
    );
  }
  if (request.request_status === 'Approved') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
        <ShieldCheck size={28} className="shrink-0" />
        <div>
          <h3 className="font-semibold">Roadmap completion approved</h3>
          <p className="text-xs">Approved on {request.approved_at ? new Date(request.approved_at).toLocaleString() : '—'}. Your Course Completion Certificate is being generated — check your Skill Passport for the latest status.</p>
          {request.feedback && <p className="mt-1 italic text-xs">"{request.feedback}"</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
      <XCircle size={28} className="shrink-0" />
      <div>
        <h3 className="font-semibold">Completion request rejected</h3>
        <p className="text-xs">Decided on {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : '—'}.</p>
        {request.feedback && <p className="mt-1 italic text-xs">"{request.feedback}"</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/15 p-3 backdrop-blur"><div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div><div className="mt-0.5 text-lg font-semibold">{value}</div></div>;
}
function Pill({ icon, label, children }: { icon: any; label: string; children: any }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-1 text-xs font-medium text-slate-600">{icon} {label}</div><div className="mt-1 text-sm font-semibold text-slate-900">{children}</div></div>;
}

// ============================================================================
// Day detail — full lesson page
// ============================================================================
function DayDetailRoute({ enrollmentId, dayNumber }: { enrollmentId: string; dayNumber: number }) {
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<CareerRoadmapEnrollment | null>(null);
  const [template, setTemplate] = useState<RoadmapTemplate | null>(null);
  const [progress, setProgress] = useState<CareerRoadmapProgress[]>([]);
  const [day, setDay] = useState<RoadmapTemplateDay | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const e = await getRoadmapEnrollment(enrollmentId); if (!e) { setError('Enrollment not found.'); return; }
      setEnrollment(e); setTemplate(await getRoadmapTemplate(e.template_id));
      const p = await getEnrollmentProgress(enrollmentId); setProgress(p);
      const unlocked = await getUnlockedDayDetails(enrollmentId, e.template_id, dayNumber);
      setDay(unlocked);
      setError('');
    } catch (e: any) { setError(e.message); }
  }, [enrollmentId, dayNumber]);

  useEffect(() => { void reload(); }, [reload]);
  useRealtimeRefresh(
    ['career_roadmap_progress', 'roadmap_template_days',
     'roadmap_module_exams', 'roadmap_module_exam_submissions'],
    reload,
  );

  const completed = progress.find((p) => p.day_number === dayNumber);
  const onComplete = async () => {
    setBusy(true); setError('');
    try { await completeEnrollmentDay(enrollmentId, dayNumber); await reload(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (error && !day) return <div className="space-y-4">
    <button onClick={() => navigate(`/dashboard/roadmap/${enrollmentId}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> ফিরে যান</button>
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
      <Lock size={28} className="mx-auto text-yellow-600" /><h2 className="mt-2 text-lg font-semibold">দিন {dayNumber} এখনও লক আছে</h2>
      <p className="mt-1 text-sm text-slate-600">{error}</p>
    </div>
  </div>;
  if (!enrollment || !template || !day) return <div className="flex items-center justify-center p-12 text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> লোড হচ্ছে...</div>;

  const videoState = resolveDayVideo(day.video_url, day.video_provider);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button onClick={() => navigate(`/dashboard/roadmap/${enrollmentId}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> {template.title}</button>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {template.thumbnail_url && <div className="h-40 overflow-hidden bg-slate-100"><img src={template.thumbnail_url} alt={template.title} className="h-full w-full object-cover" /></div>}
        <div className="space-y-2 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-600"><BookOpen size={12} /> দিন {dayNumber} / {enrollment.total_days}</div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl break-words">{day.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock size={12} /> {day.estimated_minutes} মিনিট</span>
            {completed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">সম্পন্ন</span>}
          </div>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {videoState.kind === 'embed' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {day.video_title && (
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800">
              <Youtube size={16} className="text-red-500" /> {day.video_title}
            </div>
          )}
          <div className="relative aspect-video w-full bg-slate-900">
            <iframe
              src={videoState.embedUrl}
              title={day.video_title || `Day ${dayNumber} video`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      )}

      {videoState.kind === 'invalid' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Invalid video URL.
        </div>
      )}

      {day.description && <LessonSection title="Description" icon={<BookOpen size={16} />}><div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{day.description}</div></LessonSection>}

      {day.learning_objectives?.length > 0 && <LessonSection title="Learning objectives" icon={<Target size={16} />}><ul className="space-y-2 text-sm text-slate-700">{day.learning_objectives.map((o, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-500" /> {o}</li>)}</ul></LessonSection>}

      {day.instructions?.length > 0 && <LessonSection title="Step-by-step instructions" icon={<ListOrdered size={16} />}><ol className="space-y-3 text-sm text-slate-700">{day.instructions.map((s, i) => (<li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{i + 1}</span><span className="whitespace-pre-line">{s}</span></li>))}</ol></LessonSection>}

      {day.practice_tasks?.length > 0 && <LessonSection title="Practice tasks" icon={<ListChecks size={16} />}><ul className="space-y-2 text-sm text-slate-700">{day.practice_tasks.map((t, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" /> {t}</li>)}</ul></LessonSection>}

      {day.extra_resources?.length > 0 && (
        <LessonSection title="External resources" icon={<Link2 size={16} />}>
          <div className="space-y-2">
            {day.extra_resources.map((r, i) => (
              <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                <ExternalLink size={14} className="mt-0.5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{r.label || r.url || 'Untitled resource'}</div>
                  {r.description && <div className="text-xs text-slate-600">{r.description}</div>}
                  {r.url && <div className="truncate text-xs text-blue-600">{r.url}</div>}
                </div>
              </a>
            ))}
          </div>
        </LessonSection>
      )}

      {day.notes && <LessonSection title="Notes" icon={<NotebookPen size={16} />}><div className="whitespace-pre-line text-sm text-slate-700">{day.notes}</div></LessonSection>}

      <ModuleExamSection
        enrollmentId={enrollmentId}
        dayNumber={dayNumber}
        isDayCompleted={!!completed}
        onSubmitted={() => { void reload(); }}
      />

      <div className="sticky bottom-4 z-10 mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-3 shadow-lg sm:gap-3">
        {completed ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 sm:text-sm break-words min-w-0"><CheckCircle2 size={18} className="shrink-0" /> <span className="break-words">সম্পন্ন হয়েছে — {new Date(completed.completed_at!).toLocaleString('bn-BD')}</span></div>
        ) : (
          <button onClick={() => void onComplete()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Mark as Complete
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Resolve the embed URL for a roadmap day's video. The roadmap editor
 * stores a `video_provider` enum (`youtube` | `embed` | null) and a raw
 * `video_url`. This helper:
 *   * hides the video section completely when no URL is configured
 *     (`{ kind: 'none' }`),
 *   * normalises every common YouTube URL shape into the canonical
 *     `https://www.youtube.com/embed/VIDEO_ID` form via
 *     {@link buildYouTubeEmbedUrl},
 *   * falls back to a raw embed URL when the provider is `embed`,
 *   * reports `{ kind: 'invalid' }` when a YouTube URL is malformed so
 *     the UI can show the "Invalid video URL." message instead of a
 *     broken iframe.
 */
function resolveDayVideo(
  url: string | null | undefined,
  provider: string | null | undefined,
): { kind: 'none' } | { kind: 'embed'; embedUrl: string } | { kind: 'invalid' } {
  if (!url) return { kind: 'none' };

  
  
  
  const isYouTubeShape = /youtu\.?be/i.test(url);

  if (provider === 'youtube' || (isYouTubeShape && provider !== 'embed')) {
    const embedUrl = buildYouTubeEmbedUrl(url);
    if (!embedUrl) return { kind: 'invalid' };
    
    if (!parseYouTubeVideoId(url)) return { kind: 'invalid' };
    return { kind: 'embed', embedUrl };
  }

  if (provider === 'embed' || isYouTubeShape) {
    if (isYouTubeShape) {
      const embedUrl = buildYouTubeEmbedUrl(url);
      if (!embedUrl) return { kind: 'invalid' };
      return { kind: 'embed', embedUrl };
    }
    return { kind: 'embed', embedUrl: url };
  }

  
  
  if (isYouTubeShape) {
    const embedUrl = buildYouTubeEmbedUrl(url);
    if (!embedUrl) return { kind: 'invalid' };
    return { kind: 'embed', embedUrl };
  }

  
  return { kind: 'embed', embedUrl: url };
}

function LessonSection({ title, icon, children }: { title: string; icon: any; children: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">{icon} {title}</h2>
      {children}
    </div>
  );
}

function Section({ title, icon, body, children }: { title: string; icon: any; body?: any; children: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">{icon} {title}</h2>
      {body ?? children}
    </div>
  );
}
