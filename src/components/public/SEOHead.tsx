import React, { useEffect } from 'react';

interface SEOHeadProps {
  pageKey?: string;
  title?: string;
  description?: string;
  /** Absolute canonical URL. */
  canonical?: string;
  /** Path on skillproof.top used to build canonical when canonical is not provided. */
  path?: string;
  /** og:type — defaults to 'website'. */
  ogType?: 'website' | 'article' | 'profile';
  /** og:image URL — defaults to the global OG image. */
  ogImage?: string;
  /** Robots directive — defaults to 'index,follow'. */
  robots?: 'index,follow' | 'noindex,nofollow' | 'index,nofollow' | 'noindex,follow';
  /** Defaults used when title/description is not provided. */
  defaults?: {
    title: string;
    description: string;
  };
  /** Optional JSON-LD structured data. */
  jsonLd?: object | object[];
  /** Optional breadcrumbs. */
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const SITE_NAME = 'SkillProof';
const SITE_URL = 'https://skillproof.top';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/og-image.png`;

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data: object | object[] | undefined) {
  if (typeof document === 'undefined') return;
  const id = 'page-seo-jsonld';
  const existing = document.getElementById(id);
  if (!data) {
    if (existing?.parentElement) existing.parentElement.removeChild(existing);
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function buildCanonical(path?: string, explicit?: string): string {
  if (explicit) return explicit;
  if (!path || typeof window === 'undefined') return `${SITE_URL}/`;
  if (/^https?:\/\//i.test(path)) return path;
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleaned}`;
}

/**
 * Backwards-compatible SEO head. Use `usePageSEO` for new code; this component
 * is kept for existing pages that already import it.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  pageKey,
  title,
  description,
  canonical,
  path,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  robots = 'index,follow',
  defaults,
  jsonLd,
  breadcrumbs,
}) => {
  const finalTitle = title ?? defaults?.title ?? SITE_NAME;
  const finalDescription =
    description ?? defaults?.description ?? 'Skill verification and career development.';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = finalTitle;

    setMeta('description', finalDescription);
    setMeta('robots', robots);

    const finalCanonical = buildCanonical(path, canonical);
    setLink('canonical', finalCanonical);

    setMeta('og:title', finalTitle, 'property');
    setMeta('og:description', finalDescription, 'property');
    setMeta('og:url', finalCanonical, 'property');
    setMeta('og:image', ogImage, 'property');
    setMeta('og:type', ogType, 'property');
    setMeta('og:site_name', SITE_NAME, 'property');

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDescription);
    setMeta('twitter:image', ogImage);
    setMeta('twitter:image:alt', finalTitle);

    // JSON-LD
    const blocks: object[] = [];
    if (jsonLd) {
      if (Array.isArray(jsonLd)) blocks.push(...jsonLd);
      else blocks.push(jsonLd);
    }
    if (breadcrumbs && breadcrumbs.length > 0) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: /^https?:\/\//i.test(b.url)
            ? b.url
            : `${SITE_URL}${b.url.startsWith('/') ? b.url : `/${b.url}`}`,
        })),
      });
    }
    setJsonLd(blocks.length > 0 ? blocks : undefined);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void pageKey;
  }, [finalTitle, finalDescription, canonical, path, ogType, ogImage, robots, pageKey, JSON.stringify(jsonLd), JSON.stringify(breadcrumbs)]);

  return null;
};

export default SEOHead;
