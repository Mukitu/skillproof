import React from 'react';
import { APPLICATION_STATUS_LABELS, type CompanyApplicationStatus } from '../../services/applications';

const STATUS_TONE: Record<CompanyApplicationStatus, string> = {
  'Applied':              'bg-slate-50 border-slate-200 text-slate-700',
  'Shortlisted':          'bg-amber-50 border-amber-200 text-amber-700',
  'Interview Scheduled':  'bg-sky-50 border-sky-200 text-sky-700',
  'Interview Completed':  'bg-indigo-50 border-indigo-200 text-indigo-700',
  'Selected':             'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Rejected':             'bg-rose-50 border-rose-200 text-rose-700',
};

const STATUS_DOT: Record<CompanyApplicationStatus, string> = {
  'Applied':              'bg-slate-400',
  'Shortlisted':          'bg-amber-500',
  'Interview Scheduled':  'bg-sky-500',
  'Interview Completed':  'bg-indigo-500',
  'Selected':             'bg-emerald-500',
  'Rejected':             'bg-rose-500',
};

interface ApplicationStatusPillProps {
  status: CompanyApplicationStatus;
  language?: 'bn' | 'en';
  size?: 'sm' | 'md';
  className?: string;
}

export const ApplicationStatusPill: React.FC<ApplicationStatusPillProps> = ({
  status,
  language = 'en',
  size = 'md',
  className = '',
}) => {
  const label = APPLICATION_STATUS_LABELS[status];
  const text = language === 'bn' ? label.bn : label.en;
  const tone = STATUS_TONE[status];
  const dot = STATUS_DOT[status];
  const sizing =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${sizing} ${tone} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{text}</span>
    </span>
  );
};

export default ApplicationStatusPill;
