import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Loader2,
  Video,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  scheduleCompanyInterview,
  INTERVIEW_PLATFORM_LABELS,
  type InterviewPlatform,
} from '../../services/interviews';

export interface ScheduleInterviewCandidate {
  application_id: string;
  job_id: string;
  candidate_name: string;
  job_title: string;
}

export interface ScheduleInterviewModalProps {
  open: boolean;
  candidate: ScheduleInterviewCandidate | null;
  onClose: () => void;
  onScheduled: (interviewId: string) => void;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultTimeISO(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  open,
  candidate,
  onClose,
  onScheduled,
}) => {
  const { language } = useLanguage();
  const [date, setDate] = useState<string>(todayISO());
  const [time, setTime] = useState<string>(defaultTimeISO());
  const [platform, setPlatform] = useState<InterviewPlatform>('google_meet');
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setTime(defaultTimeISO());
      setPlatform('google_meet');
      setMeetingUrl('');
      setNote('');
      setError(null);
    }
  }, [open, candidate?.application_id]);

  if (!open || !candidate) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await scheduleCompanyInterview({
        application_id: candidate.application_id,
        scheduled_date: date,
        scheduled_time: time,
        platform,
        meeting_url: meetingUrl.trim(),
        note: note.trim() || null,
      });
      onScheduled(result.interview_id);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? (language === 'bn' ? 'সময়সূচী ব্যর্থ' : 'Could not schedule'));
    } finally {
      setBusy(false);
    }
  };

  const submitDisabled =
    busy ||
    !date ||
    !time ||
    !meetingUrl.trim() ||
    !meetingUrl.trim().match(/^https?:\/\//i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white">
            <CalendarClock className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 truncate">
              {language === 'bn' ? 'ইন্টারভিউ নির্ধারণ করুন' : 'Schedule Interview'}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              {candidate.candidate_name} · {candidate.job_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {language === 'bn' ? 'তারিখ' : 'Date'}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayISO()}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23] focus:ring-2 focus:ring-red-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {language === 'bn' ? 'সময় (ঢাকা)' : 'Time (Dhaka)'}
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23] focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'মিটিং প্ল্যাটফর্ম' : 'Meeting Platform'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['google_meet', 'zoom'] as InterviewPlatform[]).map((p) => {
                const meta = INTERVIEW_PLATFORM_LABELS[p];
                const active = platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                      active
                        ? 'border-[#E31B23] bg-gradient-to-r from-red-50 to-orange-50 text-[#E31B23]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {language === 'bn' ? meta.bn : meta.en}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'মিটিং লিংক' : 'Meeting Link'}
            </span>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder={
                platform === 'zoom'
                  ? 'https://zoom.us/j/...'
                  : 'https://meet.google.com/...'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#E31B23] focus:ring-2 focus:ring-red-100"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                language === 'bn'
                  ? 'প্রার্থীকে কিছু জানাতে চাইলে লিখুন…'
                  : 'Anything you want the candidate to know before joining…'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#E31B23] focus:ring-2 focus:ring-red-100"
            />
          </label>

          <p className="text-[10px] text-slate-500">
            {language === 'bn'
              ? 'সময় অঞ্চল: এশিয়া/ঢাকা। প্রার্থী একটি ইন-অ্যাপ নোটিফিকেশন পাবে।'
              : 'Timezone: Asia/Dhaka. The candidate will receive an in-app notification.'}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs disabled:opacity-50"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitDisabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white font-bold text-xs shadow-md disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CalendarClock className="w-3.5 h-3.5" />
            )}
            {language === 'bn' ? 'নির্ধারণ নিশ্চিত করুন' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleInterviewModal;