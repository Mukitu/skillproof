import React from 'react';
import { Wand2 } from 'lucide-react';

export const CenterSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
    <div className="relative mx-auto mb-4 h-16 w-16">
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-500/10 border-t-[#F97316]" />
      <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-[#F97316] animate-pulse" />
    </div>
    <p className="text-sm font-black text-slate-900">{label ?? 'Loading…'}</p>
  </div>
);

export default CenterSpinner;