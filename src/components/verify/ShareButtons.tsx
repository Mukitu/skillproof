
import { useMemo, useState, useCallback } from 'react';
import { Facebook, Linkedin, Link2, Share2, Twitter, Check } from 'lucide-react';

export interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  fullName?: string;
  className?: string;
  variant?: 'inline' | 'compact';
}

/**
 * Social share buttons for a verified profile / certificate.
 * Builds share URLs for LinkedIn, Facebook, X (Twitter), and offers a
 * one-click copy-link with clipboard feedback.
 */
export function ShareButtons(props: ShareButtonsProps) {
  const { url, title, description = '', fullName, className = '', variant = 'inline' } = props;
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => encodeURIComponent(url), [url]);
  const shareText = useMemo(() => encodeURIComponent(
    fullName
      ? `${fullName} on SkillProof — ${title}`
      : title,
  ), [fullName, title]);

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  const twitter = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`;

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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  const buttonBase = variant === 'compact'
    ? 'inline-flex items-center justify-center h-9 w-9 rounded-full border'
    : 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {variant === 'inline' && (
        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </span>
      )}
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={`${buttonBase} bg-[#0A66C2] text-white border-[#0A66C2] hover:bg-[#0a55a8]`}
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
        {variant === 'inline' && 'LinkedIn'}
      </a>
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={`${buttonBase} bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#1567d2]`}
        title="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
        {variant === 'inline' && 'Facebook'}
      </a>
      <a
        href={twitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
        className={`${buttonBase} bg-black text-white border-black hover:bg-zinc-800`}
        title="Share on X (Twitter)"
      >
        <Twitter className="w-4 h-4" />
        {variant === 'inline' && 'X'}
      </a>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy verification link"
        className={`${buttonBase} bg-white text-slate-700 border-slate-200 hover:bg-slate-50`}
        title="Copy link"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            {variant === 'inline' && 'Copied'}
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            {variant === 'inline' && 'Copy Link'}
          </>
        )}
      </button>
    </div>
  );
}

export default ShareButtons;
