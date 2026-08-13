
import { getPublicPassportUrl } from './passportUrl';
import type { Profile, SkillPassport } from '../types/database';

export interface SharePayload {
  passport: SkillPassport;
  profile?: Profile | null;
  shareUrl: string;
  text?: string;
}

function buildShareText(p: SkillPassport, profile?: Profile | null): string {
  const name = profile?.full_name ?? 'A SkillProof member';
  const level = p.level ?? 'Verified';
  const cat = p.main_category_name ?? 'Verified Skills';
  return `${name} is ${level}-level verified on SkillProof (${cat}). Verify the credential:`;
}


export function buildSharePayload(passport: SkillPassport, profile?: Profile | null): SharePayload {
  const url = getPublicPassportUrl(passport.passport_number);
  return {
    passport,
    profile: profile ?? null,
    shareUrl: url,
    text: buildShareText(passport, profile),
  };
}


export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}


export function shareToLinkedIn(payload: SharePayload): void {
  const u = new URL('https://www.linkedin.com/sharing/share-offsite/');
  u.searchParams.set('url', payload.shareUrl);
  window.open(u.toString(), '_blank', 'noopener,noreferrer');
}


export function shareToFacebook(payload: SharePayload): void {
  const u = new URL('https://www.facebook.com/sharer/sharer.php');
  u.searchParams.set('u', payload.shareUrl);
  window.open(u.toString(), '_blank', 'noopener,noreferrer');
}


export function shareToX(payload: SharePayload): void {
  const text = `${payload.text ?? 'SkillProof Passport'} ${payload.shareUrl}`;
  const u = new URL('https://twitter.com/intent/tweet');
  u.searchParams.set('text', text);
  window.open(u.toString(), '_blank', 'noopener,noreferrer');
}


export async function nativeShare(payload: SharePayload): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('share' in navigator)) return false;
  try {
    await (navigator as any).share({
      title: `SkillProof Passport · ${payload.passport.passport_number}`,
      text: payload.text,
      url: payload.shareUrl,
    });
    return true;
  } catch {
    return false;
  }
}