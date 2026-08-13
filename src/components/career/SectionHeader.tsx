import React from 'react';
import { Loader2, Check } from 'lucide-react';

export const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  saving?: boolean;
  savedAt?: number;
  t: (en: string, bn: string) => string;
}> = ({ icon, title, saving, savedAt, t }) => {
  const justSaved = savedAt && Date.now() - savedAt < 4000;
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/15 to-[#F97316]/15 text-[#E31B23]">{icon}</span>
        {title}
      </h3>
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
        {saving && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Loader2 size={11} className="animate-spin" /> {t('Saving…', 'সেভ হচ্ছে…')}
          </span>
        )}
        {!saving && justSaved && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Check size={11} /> {t('Saved', 'সেভ হয়েছে')}
          </span>
        )}
      </div>
    </div>
  );
};

export default SectionHeader;