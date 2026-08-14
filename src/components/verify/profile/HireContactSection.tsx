/* eslint-disable react/no-unescaped-entities */

/**
 * HireContactSection
 * ------------------
 * Bottom-of-page employer-focused CTA block. Renders ONLY real
 * actions backed by SkillProof data — no fake buttons.
 *
 * Source: candidate.personal_information (for email/phone), payload
 * for the verification URL.
 */

import React, { useCallback, useState } from 'react';
import { Mail, Phone, Briefcase, Share2, ExternalLink, Check, Copy } from 'lucide-react';
import { Section, safeStr } from './profileHelpers';

interface Props {
  payload: any;
  verificationUrl: string | null;
  /** Optional callback to open the candidate's portfolio / projects grid. */
  onViewPortfolio?: () => void;
}

export function HireContactSection({
  payload,
  verificationUrl,
  onViewPortfolio,
}: Props) {
  const candidate = payload?.candidate ?? null;
  const personal = payload?.personal_information ?? null;

  const emailValue = safeStr(personal?.email ?? candidate?.email ?? null);
  const phoneValue = safeStr(candidate?.phone ?? null);
  const linkedinUrl = safeStr(candidate?.linkedin_url ?? null);
  const portfolioUrl = safeStr(candidate?.portfolio_url ?? null);
  const websiteUrl = safeStr(candidate?.website_url ?? null);

  const mailto = emailValue ? `mailto:${emailValue}` : null;
  const tel = phoneValue ? `tel:${phoneValue.replace(/\s+/g, '')}` : null;

  const [copied, setCopied] = useState(false);
  const onCopyLink = useCallback(async () => {
    if (!verificationUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(verificationUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = verificationUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [verificationUrl]);

  // Determine the primary contact action. If both email and phone are
  // available, the primary action is email. If only phone, phone is
  // the primary. If neither, fall back to a "Contact Hidden" disabled
  // button.
  const hasAnyContact = Boolean(mailto || tel || linkedinUrl || portfolioUrl || websiteUrl);

  return (
    <section
      id="hire-contact"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div
        aria-hidden="true"
        className="h-1.5 w-full"
        style={{
          background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
        }}
      />
      <div className="grid grid-cols-1 gap-4 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E31B23]">
            Hire / Contact
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Interested in this candidate?
          </h2>
          <p className="mt-1 max-w-prose text-sm text-slate-600 break-words">
            Reach out directly through the candidate\u2019s public contact
            channels. Every channel here is sourced from the candidate\u2019s
            verified SkillProof profile.
          </p>

          {!hasAnyContact ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              Contact information is hidden by the candidate.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          {mailto ? (
            <a
              href={mailto}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:brightness-110"
            >
              <Mail className="h-4 w-4" /> Contact Candidate
            </a>
          ) : tel ? (
            <a
              href={tel}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:brightness-110"
            >
              <Phone className="h-4 w-4" /> Call Candidate
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-400"
            >
              <Mail className="h-4 w-4" /> Contact Hidden
            </button>
          )}

          {/* Download Digital CV button intentionally removed per spec. */}

          {(portfolioUrl || websiteUrl || linkedinUrl || onViewPortfolio) ? (
            <button
              type="button"
              onClick={() => {
                if (onViewPortfolio) {
                  onViewPortfolio();
                  return;
                }
                if (portfolioUrl) {
                  window.open(portfolioUrl, '_blank', 'noopener,noreferrer');
                } else if (websiteUrl) {
                  window.open(websiteUrl, '_blank', 'noopener,noreferrer');
                } else if (linkedinUrl) {
                  window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
            >
              <Briefcase className="h-4 w-4" /> View Portfolio
            </button>
          ) : null}

          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Share Profile
              </>
            )}
          </button>

          {verificationUrl ? (
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#E31B23]"
            >
              <ExternalLink className="h-3 w-3" /> Open Verification Page
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}