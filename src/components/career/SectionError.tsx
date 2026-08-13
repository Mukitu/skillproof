import React from 'react';
import { AlertCircle } from 'lucide-react';

export const SectionError: React.FC<{ error?: string }> = ({ error }) => {
  if (!error) return null;
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
};

export default SectionError;