/**
 * React hook that updates the document <title> and Open Graph meta tags.
 *
 * SkillProof is a SPA — the index.html <head> is static. To make shared
 * links on LinkedIn / Facebook / X render the right preview, we inject
 * <meta> tags client-side as soon as the Passport data is loaded.
 *
 * For production-grade link previews, the recommended approach is also
 * to add a server-side pre-render (or a lightweight /api/og endpoint).
 * The server-side SEO route is wired up in server.ts (see /api/og).
 */
import { useEffect } from 'react';
import { getPublicPassportUrl } from '../utils/passportUrl';
import type { Profile, SkillPassport } from '../types/database';

type MetaMap = Record<string, string>;

interface UseDocumentMetaOptions {
  title: string;
  description: string;
  /** Passport used to drive OG image, etc. */
  passport?: SkillPassport | null;
  /** Profile used for full name / avatar. */
  profile?: Profile | null;
  /** Optional canonical URL override. Defaults to the public passport URL. */
  url?: string;
  /** Optional image URL override (otherwise the avatar is used). */
  image?: string | null;
  /** Optional twitter handle / site handle. */
  twitterHandle?: string;
}

const DEFAULT_SITE_NAME = 'SkillProof Bangladesh';

function upsertMeta(attr: 'name' | 'property', key: string, value: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertLink(rel: string, href: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (el?.parentElement) el.parentElement.removeChild(el);
}

export function setDocumentMeta(map: MetaMap, link?: { rel: string; href: string }): void {
  for (const [k, v] of Object.entries(map)) {
    // Allow explicit "name:foo" or "property:foo" prefixes.
    if (k.includes(':')) {
      const [attr, key] = k.split(':', 2) as ['name' | 'property', string];
      upsertMeta(attr, key, v);
    } else {
      upsertMeta('property', k, v);
    }
  }
  if (link) upsertLink(link.rel, link.href);
}

export function clearDocumentMeta(): void {
  if (typeof document === 'undefined') return;
  const keys: Array<{ attr: 'name' | 'property'; key: string }> = [
    { attr: 'property', key: 'og:title' },
    { attr: 'property', key: 'og:description' },
    { attr: 'property', key: 'og:image' },
    { attr: 'property', key: 'og:url' },
    { attr: 'property', key: 'og:type' },
    { attr: 'property', key: 'og:site_name' },
    { attr: 'name', key: 'twitter:card' },
    { attr: 'name', key: 'twitter:title' },
    { attr: 'name', key: 'twitter:description' },
    { attr: 'name', key: 'twitter:image' },
    { attr: 'name', key: 'description' },
  ];
  keys.forEach(({ attr, key }) => removeMeta(attr, key));
}

/**
 * Apply OG metadata for the current Passport page.
 *
 * Cleanup on unmount restores the original <title> so any subsequent
 * page navigation doesn't keep the wrong title frozen.
 */
export function useDocumentMeta(opts: UseDocumentMetaOptions): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    document.title = opts.title;

    const url = opts.url ?? (opts.passport ? getPublicPassportUrl(opts.passport.passport_number) : undefined);
    const image = opts.image ?? opts.profile?.avatar_url ?? null;
    const displayName = opts.profile?.full_name ?? 'SkillProof Member';
    const level = opts.passport?.level ?? 'Verified';
    const category = opts.passport?.main_category_name ?? 'Skill Passport';

    const meta: MetaMap = {
      'description': opts.description,
      'og:type': 'profile',
      'og:title': `${displayName} · ${level} Skill Passport`,
      'og:description': `${displayName} is ${level}-level verified by SkillProof in ${category}. ${opts.description}`,
      'og:site_name': DEFAULT_SITE_NAME,
      'og:url': url ?? '',
      'og:image': image ?? '',
      'twitter:card': 'summary_large_image',
      'twitter:title': `${displayName} · ${level} Skill Passport`,
      'twitter:description': `${displayName} is ${level}-level verified by SkillProof in ${category}.`,
      'twitter:image': image ?? '',
    };
    if (opts.twitterHandle) {
      meta['twitter:site'] = opts.twitterHandle;
      meta['twitter:creator'] = opts.twitterHandle;
    }
    setDocumentMeta(meta, url ? { rel: 'canonical', href: url } : undefined);

    return () => {
      document.title = prevTitle;
      clearDocumentMeta();
    };
  }, [
    opts.title,
    opts.description,
    opts.passport?.id,
    opts.passport?.passport_number,
    opts.passport?.status,
    opts.profile?.avatar_url,
    opts.profile?.full_name,
    opts.url,
    opts.image,
    opts.twitterHandle,
  ]);
}
