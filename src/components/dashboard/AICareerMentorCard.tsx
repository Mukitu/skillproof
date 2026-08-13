
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Loader2, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import { listMyMentorSessions, subscribeMentorSessions } from '../../services/mentor';
import { useRealtimeRefresh } from '../../services/realtime';
import { useLanguage } from '../../context/LanguageContext';
import type { AIChatSession } from '../../types/database';

const DAILY_QUESTIONS_BN: string[] = [
  'আমার CV-র ৩টি দুর্বলতা বলো',
  'আমার জন্য best ৩টি জব বের করো',
  '৯০ দিনের লার্নিং প্ল্যান বানাও',
  'ইন্টারভিউ প্রশ্ন দিয়ে প্র্যাকটিস করাও',
  'আমার Resume এর summary পুনর্লিখন করো',
];
const DAILY_QUESTIONS_EN: string[] = [
  'Tell me my CV\'s 3 weakest parts',
  'Find my best 3 job matches',
  'Create a 90-day learning plan',
  'Practise interview questions with me',
  'Rewrite my resume summary',
];

function pickDailyQuestion(lang: string): string {
  const idx = Math.floor(Date.now() / 86_400_000)
    % (lang === 'bn' ? DAILY_QUESTIONS_BN : DAILY_QUESTIONS_EN).length;
  return (lang === 'bn' ? DAILY_QUESTIONS_BN : DAILY_QUESTIONS_EN)[idx];
}

function relTime(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.round(diff / 60_000);
  if (m < 1) return lang === 'bn' ? 'এইমাত্র' : 'just now';
  if (m < 60) return lang === 'bn' ? `${m} মিনিট আগে` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === 'bn' ? `${h} ঘণ্টা আগে` : `${h}h ago`;
  const d = Math.round(h / 24);
  return lang === 'bn' ? `${d} দিন আগে` : `${d}d ago`;
}

export const AICareerMentorCard: React.FC = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AIChatSession | null>(null);
  const dailyQ = pickDailyQuestion(language);

  const load = async () => {
    try {
      const list = await listMyMentorSessions();
      setSession(list[0] ?? null);
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useRealtimeRefresh(['ai_chat_sessions', 'ai_chat_messages'], load);
  useEffect(() => {
    return subscribeMentorSessions(() => { void load(); });
  }, []);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow">
            <Bot size={16} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              {language === 'bn' ? 'SkillProof AI ক্যারিয়ার মেন্টর' : 'SkillProof AI Career Mentor'}
            </p>
            <p className="text-[11px] text-slate-500">
              {language === 'bn' ? 'SkillProof AI দ্বারা চালিত' : 'Powered by SkillProof AI'}
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/mentor"
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white shadow hover:opacity-95"
        >
          {language === 'bn' ? 'ওপেন' : 'Open'} <Wand2 size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
          <Loader2 size={11} className="animate-spin" />
          {language === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[12px]">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <MessageSquare size={10} /> {language === 'bn' ? 'সর্বশেষ সেশন' : 'Latest session'}
            </div>
            <p className="mt-0.5 truncate font-bold text-slate-900">
              {session?.title || (language === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'Start a new chat')}
            </p>
            {session?.title_bn && (
              <p className="truncate text-[11px] text-slate-500">{session.title_bn}</p>
            )}
            <p className="text-[10px] text-slate-400">{relTime(session?.last_message_at, language)}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px]">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <Sparkles size={10} /> {language === 'bn' ? 'আজকের প্রশ্ন' : "Today's question"}
            </div>
            <p className="mt-0.5 font-semibold text-amber-800">{dailyQ}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICareerMentorCard;
