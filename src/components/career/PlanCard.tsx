import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const safeArr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];

export const PlanCard: React.FC<{ title: string; items: string[] | undefined }> = ({ title, items }) => {
  const safeItems = safeArr<string>(items);
  const [open, setOpen] = useState(true);
  if (safeItems.length === 0) return null;
  return (
    <div className="mb-2 rounded-xl border border-slate-100 bg-slate-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-slate-700">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {title}
        </span>
        <span className="text-[10px] font-bold text-slate-500">{safeItems.length}</span>
      </button>
      {open && (
        <ul className="space-y-1 px-3 pb-3 text-[12px] text-slate-700">
          {safeItems.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlanCard;