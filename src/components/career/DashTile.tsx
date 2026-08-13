import React from 'react';


export const DashTile: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  tone: string;
}> = ({ label, value, suffix = '', tone }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`bg-gradient-to-r ${tone} bg-clip-text text-2xl font-black text-transparent`}>{value}{suffix}</p>
    </div>
  );
};

export default DashTile;