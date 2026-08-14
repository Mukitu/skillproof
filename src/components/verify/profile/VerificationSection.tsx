/* eslint-disable react/no-unescaped-entities */

/**
 * VerificationSection
 * -------------------
 * "Verification & Trust" — the single, clean verification block. It
 * shows ONLY claims that are supported by the database (no fake
 * guarantees), the QR code for the candidate's permanent verification
 * URL, and the permanent verification link itself.
 *
 * The QR points to the canonical /verify URL. There is exactly one
 * QR per candidate — individual credentials may have their own deep
 * link inside the CredentialsSection.
 */

import React, { useCallback, useState } from 'react';
import { Check, Copy, ExternalLink, ShieldCheck, AlertOctagon, Shield } from 'lucide-react';
import { Section, qrUrl, fmtDate, safeStr } from './profileHelpers';

interface Props {
  payload: any;
  verificationUrl: string | null;
}

export function VerificationSection({ payload, verificationUrl }: Props) {
  const result = String(payload?.result ?? '').toLowerCase();
  const status = String(payload?.status ?? '').toLowerCase();

  const verifiedBySkillproof = payload?.verified_by_skillproof === true;
  const revokedAt = safeStr(payload?.revoked_at ?? null);
  const expiryDate = safeStr(payload?.expiry_date ?? null);
  const issueDate = safeStr(payload?.issue_date ?? null);
  const passportNumber = safeStr(payload?.passport_number ?? null);

  const isRevoked = Boolean(revokedAt) || status === 'revoked';
  const isExpired = result === 'expired' || status === 'expired';
  const isSuspended = status === 'suspended';
  const isArchived = status === 'archived';
  const isActive = !isRevoked && !isExpired && !isSuspended && !isArchived && verifiedBySkillproof;

  const checks: Array<{ ok: boolean; label: string; hint: string }> = [
    {
      ok: verifiedBySkillproof,
      label: 'Verified against SkillProof database',
      hint: verifiedBySkillproof
        ? 'Direct match against the SkillProof verified identities table.'
        : 'No verified identity on file yet.',
    },
    {
      ok: isActive,
      label: 'Credential is active',
      hint: isActive
        ? 'Status is active in the database.'
        : isRevoked
        ? `Revoked${revokedAt ? ` on ${fmtDate(revokedAt)}` : ''}.`
        : isExpired
        ? `Expired${expiryDate ? ` on ${fmtDate(expiryDate)}` : ''}.`
        : isSuspended
        ? 'Suspended by SkillProof.'
        : isArchived
        ? 'Archived by SkillProof.'
        : 'Status is not active.',
    },
    {
      ok: !isRevoked,
      label: 'No revocation detected',
      hint: isRevoked
        ? `Revoked${revokedAt ? ` on ${fmtDate(revokedAt)}` : ''}.`
        : 'No revocation record on file.',
    },
    {
      ok: Boolean(passportNumber) && Boolean(payload?.candidate?.full_name),
      label: 'Candidate identity matched',
      hint: payload?.candidate?.full_name
        ? `Resolved to ${payload.candidate.full_name}.`
        : 'Candidate name not present in the public RPC payload.',
    },
    {
      ok: Boolean(verificationUrl),
      label: 'Independent verification available',
      hint: verificationUrl
        ? 'Anyone with the link can re-verify against the SkillProof database.'
        : 'Verification URL not available.',
    },
  ];

  return (
    <Section
      id="verification"
      eyebrow="Verification"
      title="Verification & Trust"
      icon={<ShieldCheck className="h-4 w-4" />}
      helper="Only claims that are supported by the SkillProof database are shown."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr]">
        <ul className="space-y-2">
          {checks.map((c, idx) => (
            <li
              key={`${c.label}-${idx}`}
              className="flex items-start gap-2"
            >
              <span
                className={
                  'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' +
                  (c.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')
                }
              >
                {c.ok ? <Check className="h-3 w-3" /> : <AlertOctagon className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 break-words">{c.label}</p>
                <p className="text-[11px] text-slate-500 break-words">{c.hint}</p>
              </div>
            </li>
          ))}
        </ul>

        {verificationUrl ? (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Scan to Verify This SkillProof Profile
            </p>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={qrUrl(verificationUrl, 320)}
                  alt={`Scan to verify ${passportNumber ?? 'profile'}`}
                  width={140}
                  height={140}
                  className="h-32 w-32 sm:h-36 sm:w-36"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Permanent Verification Link
                </p>
                <p
                  className="mt-1 truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700"
                  title={verificationUrl}
                >
                  {verificationUrl}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyLinkButton url={verificationUrl} />
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
                  >
                    <ExternalLink className="h-3 w-3" /> Open Verification
                  </a>
                </div>
                {issueDate ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Shield className="h-3 w-3" /> Issued {fmtDate(issueDate)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ---------- helpers ---------- */

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
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
  }, [url]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:border-[#E31B23] hover:text-[#E31B23]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-600" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy Link
        </>
      )}
    </button>
  );
}