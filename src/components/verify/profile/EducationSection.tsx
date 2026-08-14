/* eslint-disable react/no-unescaped-entities */

/**
 * EducationSection
 * ----------------
 * Education timeline. Source: payload.education. Hidden when empty.
 */

import React from 'react';
import { GraduationCap, School, Calendar } from 'lucide-react';
import { Section, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

export function EducationSection({ payload }: Props) {
  const list = Array.isArray(payload?.education) ? payload.education : [];
  if (list.length === 0) return null;

  return (
    <Section
      id="education"
      eyebrow="Education"
      title="Education"
      icon={<GraduationCap className="h-4 w-4" />}
      helper={`${list.length} education entr${list.length === 1 ? 'y' : 'ies'} on file.`}
      badge={`${list.length}`}
    >
      <ul className="space-y-2">
        {list.map((e: any, idx: number) => {
          const degree = safeStr(e?.degree ?? null);
          const institution = safeStr(e?.institution ?? null);
          const year = safeStr(e?.year ?? null);
          const cgpa = safeStr(e?.cgpa ?? null);

          return (
            <li
              key={`${e?.id ?? 'edu'}-${idx}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 break-words">
                  {degree || 'Education'}
                </p>
                {institution ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 break-words">
                    <School className="h-3.5 w-3.5 text-slate-400" /> {institution}
                  </p>
                ) : null}
                {year ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Calendar className="h-3 w-3 text-slate-400" /> {year}
                  </p>
                ) : null}
              </div>
              {cgpa ? (
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-700">
                  CGPA {cgpa}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}