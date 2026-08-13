import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { APK_FILENAME, APK_MIME_TYPE, APK_PUBLIC_URL } from '../../config/apk';


const APP_BUILD_TAG =
  (typeof import.meta.env.VITE_APP_BUILD_TAG === 'string' &&
    import.meta.env.VITE_APP_BUILD_TAG) ||
  'dev';


interface DownloadAppModalProps {
  className?: string;
  
  label?: string;
  
  variant?: 'primary' | 'ghost' | 'compact';
}

const VARIANT_CLASSES: Record<NonNullable<DownloadAppModalProps['variant']>, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00] px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:opacity-95 hover:-translate-y-0.5 transition-all',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-[#E31B23] hover:border-[#E31B23] hover:bg-red-50/60 transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200',
  compact:
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-white bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 transition-all',
};

const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  className,
  label,
  variant = 'primary',
}) => {
  const { language } = useLanguage();
  const text =
    label ?? (language === 'bn' ? 'APK ডাউনলোড' : 'Download APK');

  return (
    <a
      
      
      
      
      href={`${APK_PUBLIC_URL}?v=${encodeURIComponent(APP_BUILD_TAG)}`}
      download={APK_FILENAME}
      type={APK_MIME_TYPE}
      data-no-cache="1"
      className={`${VARIANT_CLASSES[variant]} ${className ?? ''}`}
      aria-label={text}
    >
      <Download className="w-4 h-4 shrink-0" />
      <span>{text}</span>
    </a>
  );
};

export default DownloadAppModal;