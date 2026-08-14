import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  User,
  Facebook,
  ShieldCheck,
  Compass,
  Briefcase,
  ScanSearch,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { SkillProofLogo } from '../brand';
import DownloadApkButton from './DownloadAppModal';

const FACEBOOK_URL = 'https://www.facebook.com/skillproofbd';

const ADDRESS = 'Rajshahi, Bangladesh';
const EMAIL = 'support@skillproof.top';
const PHONE = '01877913760';

const PARTNER_LOGOS: ReadonlyArray<{ src: string; alt: string }> = [
  { src: '/partner/logo2.png', alt: 'Partner logo 2' },
];

type FooterLink = { label: string; to: string; icon?: React.ComponentType<{ className?: string }> };

const PRODUCT_LINKS: ReadonlyArray<FooterLink> = [
  { label: 'Verify a Passport', to: '/verify', icon: ScanSearch },
  { label: 'Browse Jobs', to: '/company-jobs', icon: Briefcase },
  { label: 'How It Works', to: '/how-it-works', icon: Compass },
  { label: 'Get Started', to: '/register', icon: UserPlus },
  { label: 'Sign In', to: '/login', icon: LogIn },
];

const COMPANY_LINKS: ReadonlyArray<FooterLink> = [
  { label: 'About SkillProof', to: '/about', icon: ShieldCheck },
];

const ABOUT_LINKS: ReadonlyArray<FooterLink> = [
  { label: 'Founder & Owner', to: '/owner', icon: User },
];

const CONNECT_LINKS: ReadonlyArray<FooterLink> = [
  { label: 'Facebook', to: FACEBOOK_URL, icon: Facebook },
  { label: 'Email Support', to: `mailto:${EMAIL}`, icon: Mail },
  { label: 'Call Support', to: `tel:${PHONE.replace(/\s/g, '')}`, icon: Phone },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderColumn = (title: string, links: ReadonlyArray<FooterLink>) => (
    <div className="min-w-0 break-words">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isExternal = /^https?:\/\//i.test(link.to);
          return (
            <li key={`${title}-${link.label}`}>
              {isExternal ? (
                <a
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-[#F97316]"
                >
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span className="break-all">{link.label}</span>
                </a>
              ) : (
                <Link
                  to={link.to}
                  className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-[#F97316]"
                >
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span className="break-all">{link.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

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

      <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-6 sm:px-6 sm:pt-14 sm:pb-8">
        {/* ── Top: Brand (left) + Nav columns (right) ─────────── */}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Brand block — left */}
          <div className="lg:col-span-5">
            <div className="flex flex-col items-start gap-4">
              <SkillProofLogo size={36} colorMode="dark" />
              <p className="max-w-md text-sm text-slate-400 leading-relaxed">
                Bangladesh's AI-powered skill verification and career platform. Build a verified
                Skill Passport, follow structured career roadmaps, and connect with verified
                employers.
              </p>

              <DownloadApkButton variant="primary" />

              <div className="flex flex-col items-start gap-2 text-xs text-slate-400">
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#F97316]" />
                  <span>{ADDRESS}</span>
                </div>
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex max-w-full items-center gap-1.5 transition-colors hover:text-[#E31B23]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-all">{EMAIL}</span>
                </a>
                <a
                  href={`tel:${PHONE.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E31B23]"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {PHONE}
                </a>
              </div>

              {PARTNER_LOGOS.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
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
          </div>

          {/* Nav columns — right */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
              {renderColumn('Product', PRODUCT_LINKS)}
              {renderColumn('Company', COMPANY_LINKS)}
              {renderColumn('About', ABOUT_LINKS)}
              {renderColumn('Connect', CONNECT_LINKS)}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-[11px] text-slate-500 sm:mt-12 sm:flex-row">
          <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
            <p>© {year} SkillProof. All rights reserved.</p>
            <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" aria-hidden="true" />
            <p>
              Built &amp; Developed by{' '}
              <Link
                to="/owner"
                className="inline-flex items-center gap-1 font-semibold text-slate-300 transition-colors hover:text-[#F97316]"
              >
                <User className="h-3 w-3" /> Mukitu Islam Nishat
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow SkillProof on Facebook"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60 text-slate-300 transition-colors hover:border-[#F97316] hover:text-[#F97316]"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition-colors hover:border-[#F97316] hover:text-[#F97316]"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
