import { useEffect } from 'react';

const SITE_NAME = 'SkillProof';
const SITE_URL = 'https://skillproof.top';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/og-image.png`;
const DEFAULT_DESCRIPTION =
  "SkillProof is Bangladesh's AI-powered skill verification and career platform. Build a digital Skill Passport, follow structured career roadmaps, and connect with verified employers.";
const DEFAULT_TWITTER_HANDLE = '';

export type Indexable = 'index,follow' | 'noindex,nofollow' | 'index,nofollow' | 'noindex,follow';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface UsePageSEOOptions {
  title: string;
  description?: string;
  /** Absolute canonical URL. Defaults to current path on SITE_URL. */
  canonical?: string;
  /** Path used to compute canonical when `canonical` is not provided. */
  path?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  robots?: Indexable;
  /** Inject JSON-LD structured data. */
  jsonLd?: object | object[];
  /** Breadcrumb list for BreadcrumbList schema. */
  breadcrumbs?: BreadcrumbItem[];
  /** When true, doesn't override index/follow; just ensures meta tags exist. */
  inheritDefaults?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, value: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
  return el;
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (el?.parentElement) el.parentElement.removeChild(el);
}

function upsertLink(rel: string, href: string): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function buildCanonical(path?: string, explicit?: string): string {
  if (explicit) return explicit;
  if (!path || typeof window === 'undefined') return SITE_URL + '/';
  if (/^https?:\/\//i.test(path)) return path;
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleaned}`;
}

const JSONLD_ID = 'page-seo-jsonld';

function setJsonLd(data: object | object[] | undefined): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(JSONLD_ID);
  if (!data) {
    if (existing?.parentElement) existing.parentElement.removeChild(existing);
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = JSONLD_ID;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Page-level SEO hook.
 *
 * Sets: title, description, canonical, OG (type/title/description/url/image/site_name),
 * Twitter card, robots directive, and optional JSON-LD structured data + BreadcrumbList.
 *
 * On unmount, restores the previous title and clears page-specific tags (so the next page can
 * set its own values without leaking).
 */
export function usePageSEO(opts: UsePageSEOOptions): void {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    path,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    robots = 'index,follow',
    jsonLd,
    breadcrumbs,
    inheritDefaults = false,
  } = opts;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevTitle = document.title;
    const fullTitle = inheritDefaults ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const finalCanonical = buildCanonical(path, canonical);
    const fullDescription = description || DEFAULT_DESCRIPTION;

    upsertMeta('name', 'description', fullDescription);
    upsertMeta('name', 'robots', robots);

    upsertLink('canonical', finalCanonical);

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', fullDescription);
    upsertMeta('property', 'og:url', finalCanonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', SITE_NAME);

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', fullDescription);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertMeta('name', 'twitter:image:alt', fullTitle);
    if (DEFAULT_TWITTER_HANDLE) {
      upsertMeta('name', 'twitter:site', DEFAULT_TWITTER_HANDLE);
    }

    // JSON-LD structured data
    const blocks: object[] = [];
    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        blocks.push(...jsonLd);
      } else {
        blocks.push(jsonLd);
      }
    }
    if (breadcrumbs && breadcrumbs.length > 0) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: /^https?:\/\//i.test(b.url) ? b.url : `${SITE_URL}${b.url.startsWith('/') ? b.url : `/${b.url}`}`,
        })),
      });
    }

    setJsonLd(blocks.length > 0 ? blocks : undefined);

    return () => {
      document.title = prevTitle;
      // Don't clear base title/description; allow next page to overwrite.
      // But do remove JSON-LD so breadcrumbs don't leak.
      setJsonLd(undefined);
    };
  }, [
    title,
    description,
    canonical,
    path,
    ogImage,
    ogType,
    robots,
    JSON.stringify(jsonLd),
    JSON.stringify(breadcrumbs),
    inheritDefaults,
  ]);
}

export const SEO_CONSTANTS = {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_DESCRIPTION,
};
