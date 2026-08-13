import React from 'react';
import { Mail, Phone, MapPin, ArrowUp } from 'lucide-react';
import { SkillProofLogo } from '../brand';
import DownloadApkButton from './DownloadAppModal';







const ADDRESS = 'Rajshahi, Bangladesh';
const EMAIL = 'support@skillproof.top';
const PHONE = '01877913760';

const PARTNER_LOGOS: ReadonlyArray<{ src: string; alt: string }> = [
  
  
  
  
  { src: '/partner/logo2.png', alt: 'Partner logo 2' },
];





export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-300">
      {}
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{
          background:
            'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6 sm:pt-12">
        {}
        <div className="flex flex-col items-center gap-8 sm:gap-10">
          {}
          <div className="flex flex-col items-center gap-3 text-center">
            <SkillProofLogo size={32} colorMode="dark" />
          </div>

          {}
          <DownloadApkButton variant="primary" />

          {}
          <div className="flex flex-col items-center gap-2 text-xs text-slate-400 sm:flex-row sm:gap-5">
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F97316]" />
              <span>{ADDRESS}</span>
            </div>
            <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" aria-hidden="true" />
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E31B23]"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {EMAIL}
            </a>
            <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" aria-hidden="true" />
            <a
              href={`tel:${PHONE.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E31B23]"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {PHONE}
            </a>
          </div>

          {}
          {PARTNER_LOGOS.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {PARTNER_LOGOS.map((logo) => (
                <div
                  key={logo.src}
                  className="flex h-12 w-24 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 sm:h-14 sm:w-28"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    loading="lazy"
                    className="max-h-8 w-auto max-w-full object-contain sm:max-h-10"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-5 text-[11px] text-slate-500 sm:flex-row">
          <p>© {year} SkillProof. All rights reserved.</p>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition-colors hover:border-[#F97316] hover:text-[#F97316]"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;