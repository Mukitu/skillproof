/* eslint-disable react/no-unescaped-entities */

/**
 * PortfolioSection
 * ----------------
 * "Portfolio & Professional Links" — recruiter-friendly list of the
 * candidate's public online presence. Each link is rendered as a
 * large tappable card. Broken or empty links are excluded.
 *
 * Hidden entirely when no real link exists.
 */

import React from 'react';
import { Link as LinkIcon, ExternalLink, Globe, Linkedin, Github, ExternalLink as ExtIcon } from 'lucide-react';
import { Section, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

export function PortfolioSection({ payload }: Props) {
  const candidate = payload?.candidate ?? null;

  const links: Array<{
    url: string;
    label: string;
    icon: React.ReactNode;
    tone: string;
  }> = [];

  const linkedinUrl = safeStr(candidate?.linkedin_url ?? null);
  const githubUrl = safeStr(candidate?.github_url ?? null);
  const portfolioUrl = safeStr(candidate?.portfolio_url ?? null);
  const websiteUrl = safeStr(candidate?.website_url ?? null);

  if (linkedinUrl) {
    links.push({
      url: linkedinUrl,
      label: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5 text-[#0A66C2]" />,
      tone: 'border-[#0A66C2]/20 hover:border-[#0A66C2]/60',
    });
  }
  if (githubUrl) {
    links.push({
      url: githubUrl,
      label: 'GitHub',
      icon: <Github className="h-5 w-5 text-slate-800" />,
      tone: 'border-slate-300 hover:border-slate-500',
    });
  }
  if (portfolioUrl) {
    links.push({
      url: portfolioUrl,
      label: 'Portfolio',
      icon: <ExtIcon className="h-5 w-5 text-[#E31B23]" />,
      tone: 'border-[#E31B23]/20 hover:border-[#E31B23]/60',
    });
  }
  if (websiteUrl) {
    links.push({
      url: websiteUrl,
      label: 'Personal Website',
      icon: <Globe className="h-5 w-5 text-emerald-700" />,
      tone: 'border-emerald-200 hover:border-emerald-500',
    });
  }

  // Also surface evidence URLs from the public_evidence feed, when
  // present, as additional "Other Links".
  const evidence = Array.isArray(payload?.public_evidence) ? payload.public_evidence : [];
  for (const e of evidence) {
    const url = safeStr(e?.url ?? null);
    if (!url) continue;
    const title = safeStr(e?.title ?? null) || 'Project Link';
    links.push({
      url,
      label: title,
      icon: <LinkIcon className="h-5 w-5 text-slate-700" />,
      tone: 'border-slate-200 hover:border-slate-400',
    });
  }

  if (links.length === 0) return null;

  return (
    <Section
      id="portfolio"
      eyebrow="Portfolio"
      title="Portfolio & Professional Links"
      icon={<LinkIcon className="h-4 w-4" />}
      helper="Direct links to the candidate's public online presence."
      badge={`${links.length}`}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {links.map((l, idx) => (
          <li key={`${l.label}-${idx}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                'group flex h-full items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition ' +
                l.tone
              }
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                {l.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 break-words">{l.label}</p>
                <p className="truncate text-[11px] font-mono text-slate-500">{l.url}</p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#E31B23]" />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}