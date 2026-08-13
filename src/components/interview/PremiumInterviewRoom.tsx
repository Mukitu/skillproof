
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BookOpenCheck,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Headphones,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  Send,
  Sparkles,
  Target,
  Timer,
  Volume2,
  VolumeX,
  Wand2,
  Wifi,
} from 'lucide-react';
import InterviewerAvatar, {
  type AvatarMood,
  type AvatarVariant,
} from './InterviewerAvatar';
import CameraPreview from './CameraPreview';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { formatCountdown, INTERVIEW_DURATION_SECONDS } from '../../services/interview';
import type {
  InterviewDifficulty,
  InterviewSession,
} from '../../types/database';
import type { AnswerRecord, SessionState } from './roomTypes';

export interface PremiumInterviewRoomProps {
  state: SessionState;
  remainingSeconds: number;
  language: 'bn' | 'en';
  loadingQuestion: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (answerText: string) => Promise<void>;
  onAbandon: () => Promise<void>;
}


const ROOM_TEXT = {
  bn: {
    intro: 'সুপ্রভাত। SkillProof AI ইন্টারভিউতে স্বাগতম।',
    ready: 'প্রস্তুত হলে শুরু করি।',
    speaking: 'SkillProof AI বলছে…',
    thinking: 'SkillProof AI তোমার পরবর্তী প্রশ্ন প্রস্তুত করছে…',
    listening: 'আমি শুনছি…',
    you: 'তুমি',
    interviewer: 'SkillProof AI ইন্টারভিউয়ার',
    questionN: (n: number) => `প্রশ্ন ${n}`,
    startVoice: 'উত্তর দিতে শুরু করো',
    stopVoice: 'থামাও',
    switchToText: 'টেক্সট উত্তরে যাও',
    switchToVoice: 'ভয়েস উত্তরে যাও',
    submitText: 'উত্তর পাঠাও',
    typeAnswer: 'তোমার উত্তর এখানে লেখো…',
    abandoned: 'ইন্টারভিউ ছেড়ে দাও',
    locked: 'সময় শেষ — উত্তর লক হয়েছে',
    savedSupabase: 'প্রতিটি প্রশ্ন ও উত্তর Supabase-এ সংরক্ষিত হচ্ছে।',
    personalization: (level: 'full' | 'partial' | 'category') => {
      if (level === 'full') return 'ব্যক্তিগতকরণ · প্রোফাইল + সিভি + ভেরিফিকেশন + রোডম্যাপ';
      if (level === 'partial') return 'আংশিক ব্যক্তিগতকরণ';
      return 'শুধু ক্যাটাগরি (সিভি নেই)';
    },
    cameraOff: 'ক্যামেরা বন্ধ আছে',
    cameraLive: 'ক্যামেরা চালু · লোকাল প্রিভিউ',
    avatarMoodSpeaking: 'বলছে',
    avatarMoodListening: 'শুনছে',
    avatarMoodThinking: 'ভাবছে',
    avatarMoodIdle: 'প্রস্তুত',
    micDenied: 'মাইক্রোফোন অনুমতি প্রত্যাখ্যাত',
    aiSpeakingOff: 'কণ্ঠস্বর বন্ধ',
    aiSpeakingOn: 'কণ্ঠস্বর চালু',
    answered: 'তোমার উত্তর',
    last: 'আগের উত্তর',
    interviewerAsked: 'SkillProof AI জিজ্ঞেস করেছে',
    youAnswered: 'তুমি উত্তর দিয়েছ',
    questionLabel: 'প্রশ্ন',
    nextIn: 'পরবর্তী প্রশ্ন',
    categories: (cat: string, sub: string | null) =>
      `${cat}${sub ? ' · ' + sub : ''}`,
    voiceOnly: 'ভয়েস ইনপুট',
    textOnly: 'টেক্সট ইনপুট',
    score: (n: number | null) => (n != null ? `${n}/100` : '—'),
  },
  en: {
    intro: 'Good morning. Welcome to your SkillProof AI Interview.',
    ready: "Take a breath — whenever you're ready, let's begin.",
    speaking: 'SkillProof AI is speaking…',
    thinking: 'SkillProof AI is preparing your next interview question…',
    listening: 'I am listening…',
    you: 'You',
    interviewer: 'SkillProof AI Interviewer',
    questionN: (n: number) => `Question ${n}`,
    startVoice: 'Start speaking',
    stopVoice: 'Stop speaking',
    switchToText: 'Switch to text answer',
    switchToVoice: 'Switch to voice answer',
    submitText: 'Submit answer',
    typeAnswer: 'Type your answer here…',
    abandoned: 'Abandon interview',
    locked: 'Time up — answers locked',
    savedSupabase: 'Every question and answer is saved to Supabase.',
    personalization: (level: 'full' | 'partial' | 'category') => {
      if (level === 'full') return 'Personalized · profile + CV + verifications + roadmaps';
      if (level === 'partial') return 'Partially personalized';
      return 'Category-only (no CV yet)';
    },
    cameraOff: 'Camera is off',
    cameraLive: 'Camera live · local preview',
    avatarMoodSpeaking: 'Speaking',
    avatarMoodListening: 'Listening',
    avatarMoodThinking: 'Thinking',
    avatarMoodIdle: 'Ready',
    micDenied: 'Microphone permission denied',
    aiSpeakingOff: 'AI voice off',
    aiSpeakingOn: 'AI voice on',
    answered: 'Your answer',
    last: 'Last answer',
    interviewerAsked: 'SkillProof AI asked',
    youAnswered: 'You answered',
    questionLabel: 'Question',
    nextIn: 'Next in',
    categories: (cat: string, sub: string | null) =>
      `${cat}${sub ? ' · ' + sub : ''}`,
    voiceOnly: 'Voice input',
    textOnly: 'Text input',
    score: (n: number | null) => (n != null ? `${n}/100` : '—'),
  },
} as const;





function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function difficultyTone(d: InterviewDifficulty): string {
  switch (d) {
    case 'Easy': return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'Medium': return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'Hard': return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
}

function personalizeLevel(p: any): 'full' | 'partial' | 'category' {
  const src = p?.context_source;
  if (src === 'full_profile') return 'full';
  if (src === 'partial_profile') return 'partial';
  return 'category';
}





const Waveform: React.FC<{ amplitude: number; active: boolean }> = ({ amplitude, active }) => {
  const bars = 7;
  const levels = useMemo(() => {
    if (!active) return new Array(bars).fill(0.18);
    
    
    return Array.from({ length: bars }, (_, i) => {
      const phase = (Date.now() / 220) + i * 0.7;
      const ripple = (Math.sin(phase) + 1) / 2;
      return Math.max(0.2, Math.min(1, amplitude * 1.4 + ripple * 0.35));
    });
    
    
    
    
  }, [amplitude, active, Date.now() / 100]);
  return (
    <div className="flex h-7 items-center gap-1">
      {levels.map((lv, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full transition-colors',
            active ? 'bg-emerald-400' : 'bg-slate-400/40',
          )}
          style={{
            height: `${Math.round(lv * 100)}%`,
            transform: 'scaleY(1)',
          }}
        />
      ))}
    </div>
  );
};




const useRafTick = (intervalMs = 80): number => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
};





const QuestionCard: React.FC<{
  question: { id: string; question_index: number; question_text: string; difficulty: InterviewDifficulty; hint: string | null; source?: 'groq' | 'fallback' } | null;
  answeredCount: number;
  totalAsked: number;
  remainingSeconds: number;
  loadingQuestion: boolean;
  aiMood: AvatarMood;
  speakingText: string;
  language: 'bn' | 'en';
  personalization: any;
}> = ({
  question,
  answeredCount,
  totalAsked,
  remainingSeconds,
  loadingQuestion,
  aiMood,
  speakingText,
  language,
  personalization,
}) => {
  const t = ROOM_TEXT[language];
  const pct = Math.max(0, Math.min(100, Math.round((remainingSeconds / INTERVIEW_DURATION_SECONDS) * 100)));
  const isUrgent = remainingSeconds > 0 && remainingSeconds <= 30;
  return (
    <div className="glass-room flex h-full flex-col gap-4 rounded-3xl p-5">
      {}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-extrabold text-white">
          <span className="h-1.5 w-1.5 animate-live-dot rounded-full bg-rose-400" />
          {t.questionLabel} {question?.question_index ?? answeredCount + 1}
          <span className="ml-1 text-white/40">/ {Math.min(totalAsked + (question ? 1 : 0), 12)}</span>
        </div>
        {question && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1',
              difficultyTone(question.difficulty),
            )}
          >
            {question.difficulty}
          </span>
        )}
        {personalization && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-slate-200 backdrop-blur',
              personalizeLevel(personalization) === 'full'
                ? 'text-emerald-700'
                : personalizeLevel(personalization) === 'partial'
                  ? 'text-amber-700'
                  : 'text-slate-600',
            )}
          >
            <Wand2 size={10} />
            {t.personalization(personalizeLevel(personalization))}
          </span>
        )}
        <div className="ml-auto inline-flex items-center gap-2">
          <Timer size={14} className={cn(isUrgent ? 'text-rose-500' : 'text-slate-500')} />
          <div className="relative h-9 w-9">
            {}
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-200"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={isUrgent ? '#E11D48' : '#E31B23'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * (2 * Math.PI * 15)} ${2 * Math.PI * 15}`}
                style={{ transition: 'stroke-dasharray 0.5s linear' }}
              />
            </svg>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center font-mono text-[10px] font-extrabold tabular-nums',
              isUrgent ? 'text-rose-600' : 'text-slate-800',
            )}>
              {formatCountdown(remainingSeconds).split(':').reduce((acc, part, i) => i === 0 ? `${part}:` : acc + part, '')}
            </span>
          </div>
        </div>
      </div>

      {}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 to-slate-50/90 p-5 shadow-inner">
        {loadingQuestion ? (
          <div className="flex h-full items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <span className="thinking-dot thinking-dot-1 h-2 w-2 rounded-full bg-indigo-500" />
              <span className="thinking-dot thinking-dot-2 h-2 w-2 rounded-full bg-indigo-500" />
              <span className="thinking-dot thinking-dot-3 h-2 w-2 rounded-full bg-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-slate-600">{t.thinking}</p>
          </div>
        ) : question ? (
          <div className="animate-fade-up space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t.interviewerAsked}
            </p>
            <p className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl">
              {question.question_text}
            </p>
            {}
            {question.source === 'fallback' && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200"
                title="SkillProof AI was unavailable — this question was curated for your category."
              >
                <BookOpenCheck size={10} />
                {language === 'bn' ? 'কিউরেটেড' : 'Curated'}
              </span>
            )}
            {question.hint && (
              <p className="text-[11px] italic text-slate-500">💡 {question.hint}</p>
            )}
            <p className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] text-slate-400">
              <Wifi size={10} /> {t.savedSupabase}
            </p>
          </div>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            {t.ready}
          </p>
        )}
      </div>

      {}
      <div className="flex items-center justify-between rounded-2xl bg-slate-900/90 px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          {aiMood === 'speaking' ? (
            <>
              <Volume2 size={14} className="text-rose-300" />
              <span className="text-[11px] font-bold">{speakingText || t.speaking}</span>
              <div className="flex items-end gap-0.5">
                <span className="wave-bar h-3 w-1 rounded-full bg-rose-300" style={{ animationDelay: '0s' }} />
                <span className="wave-bar h-3 w-1 rounded-full bg-rose-300" style={{ animationDelay: '0.1s' }} />
                <span className="wave-bar h-3 w-1 rounded-full bg-rose-300" style={{ animationDelay: '0.2s' }} />
                <span className="wave-bar h-3 w-1 rounded-full bg-rose-300" style={{ animationDelay: '0.3s' }} />
                <span className="wave-bar h-3 w-1 rounded-full bg-rose-300" style={{ animationDelay: '0.4s' }} />
              </div>
            </>
          ) : aiMood === 'listening' ? (
            <>
              <Headphones size={14} className="text-emerald-300" />
              <span className="text-[11px] font-bold">{t.listening}</span>
            </>
          ) : aiMood === 'thinking' ? (
            <>
              <Loader2 size={14} className="animate-spin text-amber-300" />
              <span className="text-[11px] font-bold">{t.thinking}</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-indigo-300" />
              <span className="text-[11px] font-bold">
                {language === 'bn' ? 'SkillProof AI প্রস্তুত' : 'SkillProof AI is ready'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-white/60" />
          <span className="text-[10px] text-white/70">
            {language === 'bn' ? 'মোট সময়' : 'Total'} {INTERVIEW_DURATION_SECONDS / 60}m
          </span>
        </div>
      </div>
    </div>
  );
};





const ComposerDock: React.FC<{
  locked: boolean;
  submitting: boolean;
  loadingQuestion: boolean;
  mic: ReturnType<typeof useVoiceInput>;
  isSpeaking: boolean;
  onSubmitText: (text: string) => void;
  language: 'bn' | 'en';
}> = ({ locked, submitting, loadingQuestion, mic, onSubmitText, language }) => {
  const t = ROOM_TEXT[language];
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textValue, setTextValue] = useState('');
  const tick = useRafTick(80);

  
  useEffect(() => {
    if (!mic.isListening && mic.transcript && mode === 'voice') {
      onSubmitText(mic.transcript);
      mic.reset();
      setTextValue('');
    }
    
  }, [mic.isListening, mic.transcript]);

  const onMicToggle = async () => {
    if (locked || submitting || loadingQuestion) return;
    if (mic.isListening) {
      mic.stop();
    } else {
      mic.reset();
      await mic.start();
    }
  };

  const onSubmitTextClick = () => {
    const v = textValue.trim() || mic.transcript.trim();
    if (!v) return;
    onSubmitText(v);
    setTextValue('');
    mic.reset();
  };

  const disabled = locked || submitting || loadingQuestion;

  return (
    <div className="glass-room flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 p-1 text-[11px] font-extrabold">
          <button
            type="button"
            onClick={() => setMode('voice')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition',
              mode === 'voice'
                ? 'bg-white text-slate-900 shadow'
                : 'text-white/70 hover:text-white',
            )}
          >
            <Mic size={12} /> {t.voiceOnly}
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition',
              mode === 'text'
                ? 'bg-white text-slate-900 shadow'
                : 'text-white/70 hover:text-white',
            )}
          >
            <Keyboard size={12} /> {t.textOnly}
          </button>
        </div>

        <div className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
          <CheckCircle2 size={11} className="text-emerald-500" />
          {t.savedSupabase}
        </div>
      </div>

      {mode === 'voice' ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={onMicToggle}
            disabled={disabled}
            className={cn(
              'group relative inline-flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl transition disabled:opacity-50',
              mic.isListening
                ? 'bg-gradient-to-br from-rose-500 to-rose-700'
                : 'bg-gradient-to-br from-[#E31B23] to-[#F97316]',
            )}
            aria-label={mic.isListening ? t.stopVoice : t.startVoice}
          >
            {}
            {mic.isListening && (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: '0 0 0 0 rgba(244, 63, 94, 0.55)',
                  animation: 'avatarListenRing 1.4s ease-in-out infinite',
                }}
              />
            )}
            {mic.isListening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <div className="flex flex-col items-center gap-1">
            <p className={cn(
              'text-[11px] font-extrabold',
              mic.isListening ? 'text-rose-600' : 'text-slate-700',
            )}>
              {mic.isListening
                ? (language === 'bn' ? 'শুনছি… কথা বলো।' : 'Listening… speak now.')
                : (language === 'bn' ? 'উত্তর দিতে চাইলে মাইকে চাপ দাও।' : 'Press the mic to answer by voice.')}
            </p>
            <p className="text-[10px] text-slate-500">
              {language === 'bn'
                ? 'কথা শেষ হলে আবার চাপ দিয়ে থামাও — উত্তর পাঠানো হবে।'
                : 'Press again to stop — your answer will be submitted.'}
            </p>
          </div>

          {}
          <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white/70 p-3">
            {mic.transcript ? (
              <p className="text-sm text-slate-800 animate-fade-up">
                {mic.transcript}
              </p>
            ) : (
              <p className="text-[11px] italic text-slate-400">
                {language === 'bn'
                  ? 'তোমার কথা এখানে রিয়েল-টাইমে দেখা যাবে।'
                  : 'Your speech will appear here in real-time.'}
              </p>
            )}
          </div>

          {}
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Waveform amplitude={mic.amplitude} active={mic.isListening} />
            <span>{mic.isListening ? t.listening : (language === 'bn' ? 'নিঃশব্দ' : 'Silent')}</span>
          </div>
          {mic.error && (
            <p className="text-[10px] text-rose-600">{t.micDenied}</p>
          )}
          {}
          <span className="hidden">{tick}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <textarea
            value={textValue || mic.transcript}
            onChange={(e) => { setTextValue(e.target.value); mic.reset(); }}
            placeholder={locked ? t.locked : t.typeAnswer}
            disabled={disabled}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-500">
              {language === 'bn'
                ? 'তোমার উত্তর Supabase-এ সংরক্ষিত হবে।'
                : 'Your answer will be saved to Supabase.'}
            </p>
            <button
              type="button"
              onClick={onSubmitTextClick}
              disabled={disabled || !(textValue.trim() || mic.transcript.trim())}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2 text-xs font-extrabold text-white shadow hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {t.submitText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};





export const PremiumInterviewRoom: React.FC<PremiumInterviewRoomProps> = ({
  state,
  remainingSeconds,
  language,
  loadingQuestion,
  submitting,
  error,
  onSubmit,
  onAbandon,
}) => {
  const t = ROOM_TEXT[language];
  const [avatarVariant, setAvatarVariant] = useState<AvatarVariant>('female');
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('idle');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [introSpoken, setIntroSpoken] = useState(false);
  const [spokenQuestionId, setSpokenQuestionId] = useState<string | null>(null);
  const lastQuestionIdRef = useRef<string | null>(null);

  
  const mic = useVoiceInput({ lang: language === 'bn' ? 'bn-BD' : 'en-US' });

  
  const tts = useSpeechSynthesis({
    lang: language === 'bn' ? 'bn-BD' : 'en-US',
  });

  const currentQuestion = state.questions[state.questions.length - 1] ?? null;
  const answered = state.answers.length;
  const totalAsked = state.questions.length;
  const personalization = (currentQuestion as any)?.personalization ?? null;
  const locked = remainingSeconds === 0;

  
  
  
  
  
  useEffect(() => {
    if (loadingQuestion || submitting) {
      setAvatarMood('thinking');
    } else if (mic.isListening) {
      setAvatarMood('listening');
    } else if (tts.isSpeaking) {
      setAvatarMood('speaking');
    } else if (currentQuestion && !state.answers.find((a) => a.questionId === currentQuestion.id)) {
      setAvatarMood('idle');
    } else {
      setAvatarMood('idle');
    }
  }, [loadingQuestion, submitting, mic.isListening, tts.isSpeaking, currentQuestion, state.answers]);

  
  useEffect(() => {
    if (introSpoken || !voiceEnabled) return;
    if (!tts.isSupported) {
      setIntroSpoken(true);
      return;
    }
    
    const id = window.setTimeout(() => {
      tts.speak(`${t.intro} ${t.ready}`);
      setIntroSpoken(true);
    }, 700);
    return () => window.clearTimeout(id);
    
  }, [introSpoken, tts.isSupported, voiceEnabled]);

  
  useEffect(() => {
    if (!voiceEnabled || !tts.isSupported) return;
    if (!currentQuestion) return;
    if (spokenQuestionId === currentQuestion.id) return;
    if (state.answers.find((a) => a.questionId === currentQuestion.id)) return;
    
    const id = window.setTimeout(() => {
      tts.speak(currentQuestion.question_text);
      setSpokenQuestionId(currentQuestion.id);
    }, 350);
    return () => window.clearTimeout(id);
    
  }, [currentQuestion?.id, voiceEnabled, tts.isSupported]);

  
  useEffect(() => {
    return () => tts.cancel();
    
  }, []);

  
  const handleSubmitAnswer = useCallback(
    (answerText: string) => {
      void onSubmit(answerText);
    },
    [onSubmit],
  );

  
  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[280px_1fr_320px]">
      {}
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl glass-room p-4 animate-slide-in-left">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {t.interviewer}
            </p>
            <p className="text-[11px] font-bold text-slate-700">SkillProof AI</p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1',
              avatarMood === 'speaking'
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : avatarMood === 'listening'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : avatarMood === 'thinking'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-slate-50 text-slate-700 ring-slate-200',
            )}
          >
            {avatarMood === 'speaking'
              ? t.avatarMoodSpeaking
              : avatarMood === 'listening'
                ? t.avatarMoodListening
                : avatarMood === 'thinking'
                  ? t.avatarMoodThinking
                  : t.avatarMoodIdle}
          </span>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative aspect-square w-full max-w-[220px]">
            <InterviewerAvatar variant={avatarVariant} mood={avatarMood} className="h-full w-full" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-slate-500">
            {language === 'bn' ? 'অ্যাভাটার' : 'Avatar'}
          </p>
          <div className="inline-flex overflow-hidden rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setAvatarVariant('female')}
              className={cn(
                'flex-1 rounded-md px-2 py-1 transition',
                avatarVariant === 'female' ? 'bg-white text-slate-900 shadow' : 'text-slate-500',
              )}
            >
              {language === 'bn' ? 'মহিলা HR' : 'Female HR'}
            </button>
            <button
              type="button"
              onClick={() => setAvatarVariant('male')}
              className={cn(
                'flex-1 rounded-md px-2 py-1 transition',
                avatarVariant === 'male' ? 'bg-white text-slate-900 shadow' : 'text-slate-500',
              )}
            >
              {language === 'bn' ? 'পুরুষ HR' : 'Male HR'}
            </button>
          </div>
        </div>

        <div className="mt-auto rounded-xl border border-slate-200 bg-white/70 p-3 text-[10px] text-slate-600 backdrop-blur">
          <p className="font-bold text-slate-700">
            {language === 'bn' ? 'ব্যক্তিগতকরণ' : 'Personalisation'}
          </p>
          <p className="mt-1">
            {language === 'bn'
              ? 'প্রশ্নগুলো তোমার সিভি, AI ক্যারিয়ার প্রোফাইল, ভেরিফিকেশন, রোডম্যাপ ও স্কিল পাসপোর্টের উপর ভিত্তি করে তৈরি।'
              : 'Questions are based on your CV, AI Career Profile, verifications, roadmaps and Skill Passport.'}
          </p>
        </div>
      </aside>

      {}
      <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex-1 min-h-0 animate-slide-in-left">
          <QuestionCard
            question={currentQuestion}
            answeredCount={answered}
            totalAsked={totalAsked}
            remainingSeconds={remainingSeconds}
            loadingQuestion={loadingQuestion}
            aiMood={avatarMood}
            speakingText={
              avatarMood === 'speaking' && currentQuestion ? currentQuestion.question_text : ''
            }
            language={language}
            personalization={personalization}
          />
        </div>

        <div className="flex flex-col gap-2 animate-slide-in-right">
          <ComposerDock
            locked={locked}
            submitting={submitting}
            loadingQuestion={loadingQuestion}
            mic={mic}
            isSpeaking={tts.isSpeaking}
            onSubmitText={handleSubmitAnswer}
            language={language}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            <CircleAlert size={11} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </section>

      {}
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl glass-room p-4 animate-slide-in-right">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {t.you}
            </p>
            <p className="text-[11px] font-bold text-slate-700">
              {language === 'bn' ? 'তোমার প্রিভিউ' : 'Your preview'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCameraEnabled((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ring-1 transition',
              cameraEnabled
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : 'bg-slate-50 text-slate-600 ring-slate-200',
            )}
            title={cameraEnabled ? t.cameraOff : t.cameraLive}
          >
            {cameraEnabled ? <Camera size={11} /> : <CameraOff size={11} />}
            {cameraEnabled ? (language === 'bn' ? 'চালু' : 'On') : (language === 'bn' ? 'বন্ধ' : 'Off')}
          </button>
        </div>

        <div className="relative flex-1 min-h-[260px] overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
          {cameraEnabled ? (
            <CameraPreview active language={language} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
              <CameraOff size={28} className="text-white/60" />
              <p className="text-[11px] font-bold">{t.cameraOff}</p>
              <p className="text-[10px] text-white/60">
                {language === 'bn' ? 'তুমি ক্যামেরা ছাড়াই চালিয়ে যেতে পারো।' : 'You can still continue without a camera.'}
              </p>
              <button
                type="button"
                onClick={() => setCameraEnabled(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/20 hover:bg-white/20"
              >
                <Camera size={11} /> {language === 'bn' ? 'আবার চালু করো' : 'Turn back on'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-[10px] text-slate-700 backdrop-blur">
          <p className="flex items-center gap-1 font-bold text-slate-800">
            <CheckCircle2 size={11} className="text-emerald-500" />
            {language === 'bn' ? 'গোপনীয়তার নিশ্চয়তা' : 'Privacy guarantee'}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              {language === 'bn'
                ? 'ক্যামেরা শুধু ব্রাউজারে দেখানো হয়।'
                : 'Camera is displayed in the browser only.'}
            </li>
            <li>
              {language === 'bn'
                ? 'কোনো ভিডিও রেকর্ড, বিশ্লেষণ বা সংরক্ষণ হয় না।'
                : 'No video is recorded, analyzed or stored.'}
            </li>
            <li>
              {language === 'bn'
                ? 'কোনো ফ্রেম AI-তে পাঠানো হয় না।'
                : 'No frames are ever sent to AI.'}
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/70 p-2.5 backdrop-blur">
          <button
            type="button"
            onClick={() => {
              setVoiceEnabled((v) => {
                if (v) tts.cancel();
                return !v;
              });
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold ring-1 transition',
              voiceEnabled
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : 'bg-slate-50 text-slate-600 ring-slate-200',
            )}
            title={voiceEnabled ? t.aiSpeakingOff : t.aiSpeakingOn}
          >
            {voiceEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
            {voiceEnabled ? (language === 'bn' ? 'কণ্ঠ চালু' : 'Voice on') : (language === 'bn' ? 'কণ্ঠ বন্ধ' : 'Voice off')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(language === 'bn' ? 'সত্যিই কি ইন্টারভিউ ছেড়ে দিতে চাও?' : 'Abandon this interview?')) {
                tts.cancel();
                void onAbandon();
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-slate-700"
          >
            <PauseCircle size={11} /> {t.abandoned}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default PremiumInterviewRoom;
