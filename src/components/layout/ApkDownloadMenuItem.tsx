import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { APK_FILENAME, APK_MIME_TYPE, APK_PUBLIC_URL } from '../../config/apk';


const APP_BUILD_TAG =
  (typeof import.meta.env.VITE_APP_BUILD_TAG === 'string' &&
    import.meta.env.VITE_APP_BUILD_TAG) ||
  'dev';


export const ApkDownloadMenuItem: React.FC = () => {
  const { language } = useLanguage();
  const label = language === 'bn' ? 'APK ডাউনলোড' : 'Download APK';

  return (
    <a
      
      
      
      
      href={`${APK_PUBLIC_URL}?v=${encodeURIComponent(APP_BUILD_TAG)}`}
      download={APK_FILENAME}
      type={APK_MIME_TYPE}
      data-no-cache="1"
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-slate-600 hover:text-[#E31B23] hover:bg-red-50/60"
      aria-label={label}
    >
      <Download className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </a>
  );
};

export default ApkDownloadMenuItem;