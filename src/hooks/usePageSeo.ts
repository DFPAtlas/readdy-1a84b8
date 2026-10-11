import { useEffect } from 'react';

export const SITE_NAME = 'Vowora';
export const SITE_URL = 'https://vowora.uk';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export interface PageSeoConfig {
  /** Full <title> for the page. */
  title: string;
  /** Meta description (ideally 120-160 characters). */
  description: string;
  /** Route path, e.g. "/features". Used to build the canonical URL. */
  path: string;
  /** Optional comma-separated keywords. */
  keywords?: string;
  /** Open Graph / Twitter share image. Defaults to the brand image. */
  image?: string;
  /** Image alt text for social previews. */
  imageAlt?: string;
  /** Keep the page out of search results (auth pages, token pages). */
  noindex?: boolean;
  /** Optional JSON-LD structured data. */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const ATTR = 'data-page-seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const head = document.head;
  let el = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(ATTR, 'true');
    head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    el.setAttribute(ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets per-page SEO metadata (title, description, canonical, Open Graph,
 * Twitter cards and optional JSON-LD) while the page is mounted.
 */
export function usePageSeo(config: PageSeoConfig): void {
  const {
    title,
    description,
    path,
    keywords,
    image = DEFAULT_OG_IMAGE,
    imageAlt = `${SITE_NAME} — your wedding, beautifully organised`,
    noindex = false,
    structuredData,
  } = config;

  useEffect(() => {
    const canonical = `${SITE_URL}${path}`;

    document.title = title;

    upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertCanonical(canonical);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', imageAlt);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', imageAlt);

    let scriptEl: HTMLScriptElement | null = null;
    if (structuredData) {
      scriptEl = document.createElement('script');
      scriptEl.setAttribute('type', 'application/ld+json');
      scriptEl.setAttribute(ATTR, 'true');
      scriptEl.textContent = JSON.stringify(structuredData);
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, path, keywords, image, imageAlt, noindex, structuredData]);
}