/* eslint-disable react/no-unescaped-entities */

/**
 * ExperienceSection
 * -----------------
 * "Experience" — a clean timeline list of the candidate's work
 * history. Source: payload.experience (already sanitised by the
 * backend). Hidden when empty.
 */

import React from 'react';
import { Briefcase, Building2, Calendar } from 'lucide-react';
import { Section, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

export function ExperienceSection({ payload }: Props) {
  const list = Array.isArray(payload?.experience) ? payload.experience : [];
  if (list.length === 0) return null;

  return (
    <Section
      id="experience"
      eyebrow="Experience"
      title="Work Experience"
      icon={<Briefcase className="h-4 w-4" />}
      helper={`${list.length} role${list.length === 1 ? '' : 's'} on the candidate\u2019s verified profile.`}
      badge={`${list.length}`}
    >
      <ol className="space-y-3">
        {list.map((x: any, idx: number) => {
          const role = safeStr(x?.role ?? null);
          const company = safeStr(x?.company ?? null);
          const duration = safeStr(x?.duration ?? null);
          const summary = safeStr(x?.summary ?? null);

          return (
            <li
              key={`${x?.id ?? 'exp'}-${idx}`}
              className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 break-words">
                    {role || 'Position'}
                  </p>
                  {company ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 break-words">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> {company}
                    </p>
                  ) : null}
                </div>
                {duration ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <Calendar className="h-3 w-3 text-slate-400" /> {duration}
                  </span>
                ) : null}
              </div>
              {summary ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-700 break-words">
                  {summary}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}