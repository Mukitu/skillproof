/**
 * Shared URL helpers for the public Skill Passport surfaces
 * (public passport page, employer verification portal, QR codes, OG meta).
 *
 * Single source of truth so the QR / share / OG and download features
 * always point to the same canonical URL.
 */
import { PUBLIC_URL } from '../lib/supabase';

/**
 * Strip trailing slash to avoid `//passport/...` in shared URLs.
 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Returns the canonical public origin used for passport URLs.
 * Falls back to `window.location.origin` when PUBLIC_URL is the
 * placeholder localhost default so dev still works.
 */
export function getPublicOrigin(): string {
  const raw = stripTrailingSlash(PUBLIC_URL || '');
  if (!raw || raw.includes('your-project')) {
    if (typeof window !== 'undefined') return stripTrailingSlash(window.location.origin);
    return 'https://skillproof.top';
  }
  return raw;
}

/**
 * Build the public URL for a passport by its passport_number.
 * Example: https://skillproof.top/passport/SP-BD-2026-000001
 */
export function getPublicPassportUrl(passportNumber: string | null | undefined): string {
  const num = (passportNumber ?? '').trim();
  if (!num) return `${getPublicOrigin()}/verify`;
  return `${getPublicOrigin()}/passport/${encodeURIComponent(num)}`;
}

/**
 * Build the employer verification URL.
 * Example: https://skillproof.top/verify
 */
export function getEmployerVerificationUrl(): string {
  return `${getPublicOrigin()}/verify`;
}

/**
 * Build the OG image URL for a passport. The route is server-rendered or
 * statically generated (the public Passport page sets document <meta>
 * tags client-side for SPA, so this is the same origin).
 */
export function getPassportOgUrl(passportNumber: string): string {
  return getPublicPassportUrl(passportNumber);
}
