
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Award, Brain,
  Briefcase, CheckCircle2, Gauge, Languages, LineChart as LineChartIcon,
  Loader2, MessageSquare, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp,
  User, Wand2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppErrorBoundary } from '../../components/error/AppErrorBoundary';
import {
  fetchHistory, fetchLatestPrediction,
  subscribeMyPredictions, type AICareerPrediction,
} from '../../services/aiCenter';
import { predictV2 } from '../../services/v2Prediction';
import { useAICenterAutoRefresh } from '../../services/aiCenterAutoRefresh';



function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toFixed(digits);
}

function clampPct(n: number | null | undefined, max = 100): number {
  if (n == null || !Number.isFinite(Number(n))) return 0;
  return Math.max(0, Math.min(max, Number(n)));
}

function relTime(iso: string | null | undefined, lang: 'bn' | 'en'): string {
  if (!iso) return lang === 'bn' ? '—' : '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const m = Math.round(diff / 60_000);
  if (m < 1) return lang === 'bn' ? 'এইমাত্র' : 'just now';
  if (m < 60) return lang === 'bn' ? `${m} মিনিট আগে` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === 'bn' ? `${h} ঘণ্টা আগে` : `${h}h ago`;
  const d = Math.round(h / 24);
  return lang === 'bn' ? `${d} দিন আগে` : `${d}d ago`;
}

function trend(curr: number | null | undefined, prev: number | null | undefined): {
  delta: number; direction: 'up' | 'down' | 'flat';
} {
  if (curr == null || prev == null) return { delta: 0, direction: 'flat' };
  const delta = Number(curr) - Number(prev);
  if (Math.abs(delta) < 0.05) return { delta, direction: 'flat' };
  return { delta, direction: delta > 0 ? 'up' : 'down' };
}



const AICareerCenterPageInner: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  const [latest, setLatest] = useState<AICareerPrediction | null>(null);
  const [history, setHistory] = useState<AICareerPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  
  
  
  useAICenterAutoRefresh(user?.user_id);

  
  const load = useCallback(async (): Promise<void> => {
    try {
      const [latestRow, hist] = await Promise.all([
        fetchLatestPrediction(),
        fetchHistory(12).catch(() => [] as AICareerPrediction[]),
      ]);
      setLatest(latestRow);
      setHistory(hist);
    } catch (e: any) {
      setRefreshError(e?.message || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) {
      setLoading(false);
      return;
    }
    void load();
  }, [user?.user_id, load]);

  
  useEffect(() => {
    if (!user?.user_id) return undefined;
    return subscribeMyPredictions(() => { void load(); });
  }, [user?.user_id, load]);

  
  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      // v2 is the authoritative predictor — call it with force=true to bypass
      // the cache and re-score the live data. The latest row is then read
      // back via the table endpoint so the UI shows the freshly persisted
      // prediction.
      await predictV2(true).catch((err: any) => {
        throw new Error(err?.bn || err?.message || 'v2 refresh failed');
      });
      const [latestRow, hist] = await Promise.all([
        fetchLatestPrediction(),
        fetchHistory(12).catch(() => [] as AICareerPrediction[]),
      ]);
      setLatest(latestRow);
      setHistory(hist);
    } catch (e: any) {
      setRefreshError(e?.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  
  const trends = useMemo(() => {
    const prev = history[1] ?? null;
    if (!latest) return null;
    return {
      employability: trend(latest.employability_score, prev?.employability_score ?? null),
      hiring: trend(latest.hiring_probability * 100, prev ? prev.hiring_probability * 100 : null),
      readiness: trend(latest.career_readiness, prev?.career_readiness ?? null),
      technical: trend(latest.technical_strength, prev?.technical_strength ?? null),
      soft: trend(latest.soft_skill_strength, prev?.soft_skill_strength ?? null),
    };
  }, [latest, history]);

  
  if (!user?.user_id) {
    return <EmptyState t={t} title={t('Sign in to view your AI Career Center', 'আপনার AI ক্যারিয়ার সেন্টার দেখতে সাইন ইন করুন')} sub={t('You must be signed in to see predictions.', 'প্রেডিকশন দেখতে সাইন ইন করতে হবে।')} />;
  }
  if (loading) {
    return <CenterSpinner label={t('Loading your AI Career Center…', 'আপনার AI ক্যারিয়ার সেন্টার লোড হচ্ছে…')} />;
  }

  return (
    <div className="space-y-6">
      <Hero
        latest={latest}
        refreshing={refreshing}
        onRefresh={onRefresh}
        error={refreshError}
        t={t}
      />

      {!latest && (
        <EmptyState
          t={t}
          title={t('No prediction yet', 'এখনো কোনো প্রেডিকশন নেই')}
          sub={t('Tap “Refresh AI Analysis” to score your profile.', '"AI অ্যানালাইসিস রিফ্রেশ" এ ট্যাপ করুন।')}
        />
      )}

      {latest && (
        <>
          <TopTiles latest={latest} trends={trends} t={t} />
          <StrengthSection latest={latest} trends={trends} t={t} />
          <CompanionScores latest={latest} t={t} />
          <TrendSection history={history} t={t} />
          <MetaStrip latest={latest} t={t} />
        </>
      )}
    </div>
  );
};



const Hero: React.FC<{
  latest: AICareerPrediction | null;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  error: string | null;
  t: (en: string, bn: string) => string;
}> = ({ latest, refreshing, onRefresh, error, t }) => (
  <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 sm:p-7 text-white shadow-2xl">
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-1"
      style={{ background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)' }}
    />
    <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#F97316]/20 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-[#E31B23]/15 blur-3xl" />

    <div className="relative flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
          <span>{t('AI Career Center', 'AI ক্যারিয়ার সেন্টার')}</span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl break-words">
          <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
            {t('Your AI Career Analysis', 'আপনার AI ক্যারিয়ার অ্যানালাইসিস')}
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 break-words">
          {t(
            'Powered by Career Intelligence — a weighted-feature scoring engine covering all SkillProof signals. Your latest scores are below.',
            'ক্যারিয়ার ইন্টেলিজেন্স দ্বারা চালিত — সকল SkillProof সংকেতকে কভার করে এমন weighted-feature স্কোরিং ইঞ্জিন। আপনার সর্বশেষ স্কোর নিচে।',
          )}
        </p>
        {latest && (
          <p className="mt-3 text-[11px] font-bold text-slate-400">
            {t('Last prediction', 'সর্বশেষ প্রেডিকশন')}: {relTime(latest.prediction_date, 'en' as any)}
            {latest.model_version ? ` · ${t('Model', 'মডেল')} ${String(latest.model_version).slice(0, 10)}…` : ''}
          </p>
        )}
        {error && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-200">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-xs font-black text-white shadow-md hover:opacity-95 disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {t('Refresh AI Analysis', 'AI অ্যানালাইসিস রিফ্রেশ')}
        </button>
        <p className="text-center text-[10px] text-slate-400">
          {t('Runs the trained ML model on your live Supabase profile.', 'আপনার লাইভ Supabase প্রোফাইলে ট্রেনড মডেল চালায়।')}
        </p>
      </div>
    </div>
  </div>
);



const TopTiles: React.FC<{
  latest: AICareerPrediction;
  trends: TrendsGroup | null;
  t: (en: string, bn: string) => string;
}> = ({ latest, trends, t }) => {
  const emp = clampPct(latest.employability_score);
  const hire = clampPct(latest.hiring_probability * 100);
  const ready = clampPct(latest.career_readiness);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <BigScoreTile
        icon={<Gauge className="h-4 w-4" />}
        label={t('Overall Employability Score', 'সামগ্রিক কর্মযোগ্যতা স্কোর')}
        value={emp}
        sub={t('0–100 scale', '০–১০০ স্কেল')}
        gradient="from-[#E31B23] to-[#F97316]"
        trend={trends?.employability ?? null}
        t={t}
      />
      <BigScoreTile
        icon={<Target className="h-4 w-4" />}
        label={t('Hiring Probability', 'নিয়োগের সম্ভাবনা')}
        value={hire}
        sub={t('Predicted by CatBoost regressor', 'CatBoost রিগ্রেসর দ্বারা প্রেডিক্টেড')}
        gradient="from-emerald-500 to-emerald-700"
        trend={trends?.hiring ?? null}
        t={t}
      />
      <BigScoreTile
        icon={<Activity className="h-4 w-4" />}
        label={t('Career Readiness', 'ক্যারিয়ার প্রস্তুতি')}
        value={ready}
        sub={t('Composite of 7 ML indices', '৭টি ML সূচকের সমন্বয়')}
        gradient="from-blue-500 to-indigo-600"
        trend={trends?.readiness ?? null}
        t={t}
      />
    </div>
  );
};

type TrendResult = { delta: number; direction: 'up' | 'down' | 'flat' };
type TrendsGroup = {
  employability: TrendResult;
  hiring: TrendResult;
  readiness: TrendResult;
  technical: TrendResult;
  soft: TrendResult;
};

function trendWrap(t: TrendsGroup | null): TrendsGroup | null { return t; }

const BigScoreTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  gradient: string;
  trend: TrendResult | null;
  t: (en: string, bn: string) => string;
}> = ({ icon, label, value, sub, gradient, trend, t }) => {
  const trendNode = (() => {
    if (!trend || trend.direction === 'flat') return null;
    const positive = trend.direction === 'up';
    const Icon = positive ? ArrowUpRight : ArrowDownRight;
    const color = positive ? 'text-emerald-400' : 'text-rose-400';
    const labelTxt = positive
      ? t('Up vs previous', 'আগের চেয়ে বেড়েছে')
      : t('Down vs previous', 'আগের চেয়ে কমেছে');
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${color}`}>
        <Icon size={11} /> {labelTxt} ({trend.delta > 0 ? '+' : ''}{trend.delta.toFixed(1)})
      </span>
    );
  })();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <span className="text-[#E31B23]">{icon}</span>
          {label}
        </span>
        {trendNode}
      </div>
      <p className={`bg-gradient-to-r ${gradient} bg-clip-text text-4xl font-black text-transparent`}>
        {value.toFixed(1)}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
};



const StrengthSection: React.FC<{
  latest: AICareerPrediction;
  trends: TrendsGroup | null;
  t: (en: string, bn: string) => string;
}> = ({ latest, trends, t }) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <StrengthBar
      icon={<Brain className="h-4 w-4 text-blue-500" />}
      label={t('Technical Strength', 'টেকনিক্যাল শক্তি')}
      value={clampPct(latest.technical_strength)}
      tone="from-blue-500 to-indigo-600"
      trendDelta={trends?.technical.delta ?? 0}
      t={t}
    />
    <StrengthBar
      icon={<User className="h-4 w-4 text-emerald-500" />}
      label={t('Soft Skill Strength', 'সফট স্কিল শক্তি')}
      value={clampPct(latest.soft_skill_strength)}
      tone="from-emerald-500 to-teal-600"
      trendDelta={trends?.soft.delta ?? 0}
      t={t}
    />
  </div>
);

const StrengthBar: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  trendDelta: number;
  t: (en: string, bn: string) => string;
}> = ({ icon, label, value, tone, trendDelta, t }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-2 flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
        {icon} {label}
      </span>
      {trendDelta !== 0 && (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
            trendDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {trendDelta > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {trendDelta > 0 ? '+' : ''}{trendDelta.toFixed(1)}
        </span>
      )}
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-black text-slate-900">{value.toFixed(1)}<span className="text-sm font-bold text-slate-400">/100</span></p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('score', 'স্কোর')}</p>
    </div>
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);



const CompanionScores: React.FC<{
  latest: AICareerPrediction;
  t: (en: string, bn: string) => string;
}> = ({ latest, t }) => {
  const items: Array<{ label: string; value: number; icon: React.ReactNode; tone: string }> = [
    {
      label: t('AI Interview Readiness', 'AI ইন্টারভিউ প্রস্তুতি'),
      value: clampPct(latest.ai_interview_readiness ?? 0),
      icon: <Briefcase className="h-4 w-4 text-amber-500" />,
      tone: 'from-amber-500 to-orange-600',
    },
    {
      label: t('Communication Score', 'যোগাযোগ স্কোর'),
      value: clampPct(latest.communication_score ?? 0),
      icon: <MessageSquare className="h-4 w-4 text-purple-500" />,
      tone: 'from-purple-500 to-fuchsia-600',
    },
    {
      label: t('Verification Strength', 'ভেরিফিকেশন শক্তি'),
      value: clampPct(latest.verification_strength ?? 0),
      icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
      tone: 'from-emerald-500 to-teal-600',
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
            {it.icon} {it.label}
          </div>
          <p className="text-2xl font-black text-slate-900">{it.value.toFixed(1)}<span className="text-sm font-bold text-slate-400">/100</span></p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${it.tone}`}
              style={{ width: `${it.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};



const TrendSection: React.FC<{
  history: AICareerPrediction[];
  t: (en: string, bn: string) => string;
}> = ({ history, t }) => {
  
  
  const points = [...history].reverse(); 
  const W = 600;
  const H = 140;
  const PAD = 8;
  const xs = points.length;
  const path = (() => {
    if (xs === 0) return '';
    const xStep = xs === 1 ? 0 : (W - PAD * 2) / (xs - 1);
    return points
      .map((p, i) => {
        const y = H - PAD - ((clampPct(p.employability_score) / 100) * (H - PAD * 2));
        const x = PAD + i * xStep;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  })();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
          <LineChartIcon size={14} className="text-[#E31B23]" />
          {t('Prediction History', 'প্রেডিকশন ইতিহাস')}
        </h3>
        <span className="text-[10px] font-bold text-slate-500">
          {history.length === 0
            ? t('No history yet', 'এখনো কোনো ইতিহাস নেই')
            : t(`${history.length} predictions kept`, `${history.length}টি প্রেডিকশন সংরক্ষিত`)}
        </span>
      </div>

      {points.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[12px] text-slate-500">
          {t('Run your first prediction to start the history.', 'ইতিহাস শুরু করতে প্রথম প্রেডিকশন চালান।')}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full">
              <defs>
                <linearGradient id="g-emp" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#E31B23" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                </linearGradient>
              </defs>
              {}
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)}
                  stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3"
                />
              ))}
              <path d={`${path} L ${W - PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`} fill="url(#g-emp)" />
              <path d={path} fill="none" stroke="#E31B23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => {
                const xStep = xs === 1 ? 0 : (W - PAD * 2) / (xs - 1);
                const y = H - PAD - ((clampPct(p.employability_score) / 100) * (H - PAD * 2));
                const x = PAD + i * xStep;
                return <circle key={p.id} cx={x} cy={y} r="3.5" fill="#E31B23" />;
              })}
            </svg>
          </div>

          <div className="mt-3 max-h-44 overflow-y-auto rounded-2xl border border-slate-100">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">{t('Date', 'তারিখ')}</th>
                  <th className="px-3 py-2 text-right">{t('Employability', 'কর্মযোগ্যতা')}</th>
                  <th className="px-3 py-2 text-right">{t('Hiring', 'নিয়োগ')}</th>
                  <th className="px-3 py-2 text-right">{t('Readiness', 'প্রস্তুতি')}</th>
                  <th className="px-3 py-2 text-right">{t('Label', 'লেভেল')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 text-slate-600">{relTime(p.prediction_date, 'en' as any)}</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-900">{pct(p.employability_score)}</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-900">{pct((p.hiring_probability || 0) * 100)}%</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-900">{pct(p.career_readiness)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {p.employability_label_name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};



const MetaStrip: React.FC<{
  latest: AICareerPrediction;
  t: (en: string, bn: string) => string;
}> = ({ latest, t }) => (
  <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
    <Meta icon={<Award className="h-4 w-4 text-emerald-500" />} label={t('Prediction Label', 'প্রেডিকশন লেভেল')}>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 size={11} /> {latest.employability_label_name}
      </span>
    </Meta>
    <Meta icon={<Wand2 className="h-4 w-4 text-[#E31B23]" />} label={t('Regressor', 'রিগ্রেসর')}>
      {latest.selected_regressor || 'CatBoost'}
    </Meta>
    <Meta icon={<Wand2 className="h-4 w-4 text-[#F97316]" />} label={t('Classifier', 'ক্লাসিফায়ার')}>
      {latest.selected_classifier || 'XGBoost'}
    </Meta>
    <Meta icon={<TrendingUp className="h-4 w-4 text-blue-500" />} label={t('Model version', 'মডেল ভার্সন')}>
      <span title={latest.model_version}>
        {String(latest.model_version).replace('T', ' ').replace('Z', '').slice(0, 19)}
      </span>
    </Meta>
  </div>
);

const Meta: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div>
    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
      {icon} {label}
    </div>
    <div className="text-xs font-bold text-slate-900">{children}</div>
  </div>
);



const EmptyState: React.FC<{
  title: string;
  sub: string;
  t: (en: string, bn: string) => string;
}> = ({ title, sub, t }) => (
  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
    <Sparkles className="mx-auto mb-2 h-7 w-7 text-amber-500" />
    <p className="text-base font-black text-slate-900">{title}</p>
    <p className="mt-1 text-[12px] text-slate-500">{sub}</p>
    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {t('Tip', 'টিপ')}: {t('Complete your AI Profile to get a real prediction.', 'প্রেডিকশন পেতে AI প্রোফাইল পূরণ করুন।')}
    </p>
  </div>
);

const CenterSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
    <div className="relative mx-auto mb-4 h-16 w-16">
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-500/10 border-t-[#F97316]" />
      <Brain className="absolute inset-0 m-auto h-6 w-6 text-[#F97316] animate-pulse" />
    </div>
    <p className="text-sm font-black text-slate-900">{label ?? 'Loading…'}</p>
  </div>
);



export const AICareerCenterPage: React.FC = () => (
  <AppErrorBoundary label="AI Career Center">
    <AICareerCenterPageInner />
  </AppErrorBoundary>
);

export default AICareerCenterPage;