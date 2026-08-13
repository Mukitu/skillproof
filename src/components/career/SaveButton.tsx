import React from 'react';
import { Loader2, Save } from 'lucide-react';

export const SaveButton: React.FC<{
  dirty: boolean;
  saving: boolean;
  onClick: () => void | Promise<void>;
  t: (en: string, bn: string) => string;
}> = ({ dirty, saving, onClick, t }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!dirty || saving}
    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-xs font-black text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
    {t('Save & review', 'সেভ ও রিভিউ')}
  </button>
);

export default SaveButton;