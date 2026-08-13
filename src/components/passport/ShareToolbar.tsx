
import { useState } from 'react';
import {
  Check, Copy, ExternalLink, Facebook, Link2, Linkedin, Share2, Twitter,
} from 'lucide-react';
import { buildSharePayload, copyToClipboard, shareToFacebook, shareToLinkedIn, shareToX } from '../../utils/share';
import type { Profile, SkillPassport } from '../../types/database';

interface ShareToolbarProps {
  passport: SkillPassport;
  profile?: Profile | null;
  
  variant?: 'compact' | 'full';
  className?: string;
}

export function ShareToolbar({ passport, profile, variant = 'full', className = '' }: ShareToolbarProps) {
  const [copied, setCopied] = useState<'link' | 'verify' | null>(null);
  const payload = buildSharePayload(passport, profile);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(payload.shareUrl);
    if (ok) {
      setCopied('link');
      setTimeout(() => setCopied((c) => (c === 'link' ? null : c)), 2200);
    }
  };

  const handleCopyVerifyUrl = async () => {
    const ok = await copyToClipboard(payload.shareUrl);
    if (ok) {
      setCopied('verify');
      setTimeout(() => setCopied((c) => (c === 'verify' ? null : c)), 2200);
    }
  };

  const isCompact = variant === 'compact';
  const btnBase = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E31B23]/40 disabled:opacity-50';
  const btnSize = isCompact ? 'p-2' : 'px-3 py-2 text-xs';
  const iconSize = isCompact ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label="Share passport">
      {isCompact ? (
        <button
          onClick={handleCopyLink}
          aria-label="Copy passport link"
          title="Copy link"
          className={`${btnBase} ${btnSize} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          {copied === 'link' ? <Check className={`${iconSize} text-emerald-600`} /> : <Link2 className={iconSize} />}
        </button>
      ) : (
        <button
          onClick={handleCopyLink}
          className={`${btnBase} ${btnSize} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
        >
          {copied === 'link' ? (
            <>
              <Check className={`${iconSize} text-emerald-600`} /> Link copied
            </>
          ) : (
            <>
              <Copy className={iconSize} /> Copy Link
            </>
          )}
        </button>
      )}

      <button
        onClick={() => shareToLinkedIn(payload)}
        aria-label="Share to LinkedIn"
        title="Share to LinkedIn"
        className={`${btnBase} ${btnSize} bg-[#0A66C2] text-white hover:bg-[#084d92]`}
      >
        <Linkedin className={iconSize} />
        {!isCompact && <span>LinkedIn</span>}
      </button>

      <button
        onClick={() => shareToFacebook(payload)}
        aria-label="Share to Facebook"
        title="Share to Facebook"
        className={`${btnBase} ${btnSize} bg-[#1877F2] text-white hover:bg-[#145fc1]`}
      >
        <Facebook className={iconSize} />
        {!isCompact && <span>Facebook</span>}
      </button>

      <button
        onClick={() => shareToX(payload)}
        aria-label="Share to X (Twitter)"
        title="Share to X"
        className={`${btnBase} ${btnSize} bg-black text-white hover:bg-slate-800`}
      >
        <Twitter className={iconSize} />
        {!isCompact && <span>X</span>}
      </button>

      {!isCompact && (
        <button
          onClick={handleCopyVerifyUrl}
          className={`${btnBase} ${btnSize} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          title="Copy the verification URL employers can open"
        >
          {copied === 'verify' ? (
            <>
              <Check className={`${iconSize} text-emerald-600`} /> Verification URL copied
            </>
          ) : (
            <>
              <ExternalLink className={iconSize} /> Copy Verification URL
            </>
          )}
        </button>
      )}

      {!isCompact && (
        <button
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'share' in navigator) {
              (navigator as any).share({
                title: `SkillProof Passport · ${passport.passport_number}`,
                text: payload.text,
                url: payload.shareUrl,
              }).catch(() => {  });
            } else {
              void handleCopyLink();
            }
          }}
          className={`${btnBase} ${btnSize} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          title="More sharing options"
        >
          <Share2 className={iconSize} />
          <span>More</span>
        </button>
      )}
    </div>
  );
}

export default ShareToolbar;