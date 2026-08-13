import React from 'react';

export const InfoTile: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value || '—'}</p>
    </div>
  );
};

export default InfoTile;