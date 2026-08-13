
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle, Award, CheckCircle2, ExternalLink, Loader2, Send,
} from 'lucide-react';
import { getMyExamForDay, submitModuleExam } from '../../services/roadmapExams';
import type {
  RoadmapModuleExam, RoadmapModuleExamSubmission, RoadmapModuleExamSubmissionStatus,
} from '../../types/database';

interface Props {
  enrollmentId: string;
  dayNumber: number;
  
  isDayCompleted?: boolean;
  
  onSubmitted?: (submission: RoadmapModuleExamSubmission) => void;
}

const STATUS_BADGE: Record<RoadmapModuleExamSubmissionStatus, { label: string; cls: string }> = {
  'Pending Review': { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' },
  'Under Review': { label: 'Under Review', cls: 'bg-blue-100 text-blue-700' },
  'Passed': { label: 'Passed', cls: 'bg-emerald-100 text-emerald-700' },
  'Failed': { label: 'Failed — Please resubmit', cls: 'bg-rose-100 text-rose-700' },
};

export function ModuleExamSection({ enrollmentId, dayNumber, isDayCompleted, onSubmitted }: Props) {
  const [exam, setExam] = useState<RoadmapModuleExam | null>(null);
  const [submission, setSubmission] = useState<RoadmapModuleExamSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { exam: e, submission: s } = await getMyExamForDay(enrollmentId, dayNumber);
      setExam(e); setSubmission(s); setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not load exam for this day.');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, dayNumber]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading exam...</div>;
  }
  if (!exam || !exam.exam_enabled) return null;

  const canSubmit = !submission || submission.status === 'Failed';

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-amber-900">
            <Award size={18} /> Module Exam · {exam.exam_title || `Day ${dayNumber}`}
          </h2>
          {exam.exam_instructions && (
            <p className="mt-1 whitespace-pre-line text-xs text-amber-900/80">{exam.exam_instructions}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px]">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
            Max {exam.max_marks} · Pass {exam.pass_marks}
          </span>
          {submission && (
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_BADGE[submission.status].cls}`}>
              {STATUS_BADGE[submission.status].label}
            </span>
          )}
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {success && <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{success}</div>}

      {submission && submission.status !== 'Failed' && (
        <SubmissionSnapshot submission={submission} maxMarks={exam.max_marks} />
      )}

      {canSubmit && (
        <SubmitForm
          exam={exam}
          previous={submission}
          submitting={submitting}
          onSubmit={async (payload) => {
            setSubmitting(true); setError(''); setSuccess('');
            try {
              const { submission: saved } = await submitModuleExam({
                enrollmentId, dayNumber, ...payload,
              });
              setSubmission(saved);
              setSuccess('Submission saved. An admin will review it shortly.');
              onSubmitted?.(saved);
              await load();
            } catch (e: any) {
              setError(e?.message || 'Could not submit exam.');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}

      {isDayCompleted && submission?.status === 'Passed' && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 size={14} className="mt-0.5" /> You passed this exam. The day is already marked complete.
        </div>
      )}
    </div>
  );
}





interface SubmitFormProps {
  exam: RoadmapModuleExam;
  previous: RoadmapModuleExamSubmission | null;
  submitting: boolean;
  onSubmit: (payload: {
    answer_text: string | null;
    submission_url: string | null;
  }) => Promise<void>;
}

interface SubmissionSnapshotProps {
  submission: RoadmapModuleExamSubmission;
  maxMarks: number;
}

function SubmitForm({ exam, previous, submitting, onSubmit }: SubmitFormProps) {
  const [answerText, setAnswerText] = useState(previous?.answer_text ?? '');
  const [submissionUrl, setSubmissionUrl] = useState(previous?.submission_url ?? '');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit({
      answer_text: answerText.trim() || null,
      submission_url: submissionUrl.trim() || null,
    });
  };

  const hasAnyField = (exam.allow_text_answer && answerText.trim().length > 0)
    || (exam.allow_submission_url && submissionUrl.trim().length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {exam.allow_text_answer && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-amber-900">Text answer</label>
          <textarea
            rows={5}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Write your answer here..."
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      )}
      {exam.allow_submission_url && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-amber-900">
            Submission URL (GitHub, live site, Google Drive, etc.)
          </label>
          <input
            type="url"
            value={submissionUrl}
            onChange={(e) => setSubmissionUrl(e.target.value)}
            placeholder="https://github.com/your/repo"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-amber-900/70">
            Paste a single http(s) link. File uploads are not supported.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-amber-200 pt-2">
        <p className="text-[11px] text-amber-900">
          {hasAnyField ? 'Ready to submit. The admin will review and grade.' : 'Please fill at least one allowed submission field.'}
        </p>
        <button
          type="submit"
          disabled={submitting || !hasAnyField}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {previous?.status === 'Failed' ? 'Resubmit' : 'Submit'}
        </button>
      </div>
    </form>
  );
}





function SubmissionSnapshot({ submission, maxMarks }: SubmissionSnapshotProps) {
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-white p-4 text-xs">
      <div className="flex items-center justify-between text-[11px] text-amber-900">
        <span>Submitted {new Date(submission.submitted_at).toLocaleString()}</span>
        {submission.reviewed_at && <span>Reviewed {new Date(submission.reviewed_at).toLocaleString()}</span>}
      </div>
      {submission.answer_text && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">Text answer</p>
          <pre className="whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">{submission.answer_text}</pre>
        </div>
      )}
      {submission.submission_url && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">Submission URL</p>
          <a
            href={submission.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 truncate rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs hover:bg-amber-100"
          >
            <ExternalLink size={12} className="text-amber-700" />
            <span className="truncate">{submission.submission_url}</span>
          </a>
        </div>
      )}
      {submission.reviewer_feedback && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">Reviewer feedback</p>
          <p className="whitespace-pre-line rounded bg-amber-50 p-2 text-xs text-amber-900">{submission.reviewer_feedback}</p>
        </div>
      )}
      {submission.marks !== null && (
        <div className="text-[11px] font-semibold text-amber-900">
          Marks: {submission.marks} / {maxMarks}
        </div>
      )}
    </div>
  );
}