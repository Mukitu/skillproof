import React from 'react';

export const ScoreBar: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fillTone = tone ?? 'from-[#E31B23] to-[#F97316]';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>{label}</span>
        <span>{v}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${fillTone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};

export default ScoreBar;