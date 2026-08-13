import React from 'react';

const TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-800 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  rose: 'bg-rose-50 text-rose-800 ring-rose-100',
  purple: 'bg-purple-50 text-purple-800 ring-purple-100',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
};

export const SkillList: React.FC<{
  label: string;
  items: string[];
  tone: keyof typeof TONES;
}> = ({ label, items, tone }) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONES[tone] ?? TONES.blue}`}
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">—</p>
      )}
    </div>
  );
};

export default SkillList;