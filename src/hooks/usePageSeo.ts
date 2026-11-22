import { useEffect } from 'react';
import { PUBLIC_SITE_URL } from '@/lib/env';

export const SITE_NAME = 'Vowora';

/**
 * Canonical production origin. Driven by `VITE_PUBLIC_SITE_URL` so preview
 * builds never hard-code a domain; falls back to the production site when the
 * variable is unset (local demo mode).
 */
const CONFIGURED_SITE_URL = PUBLIC_SITE_URL.trim().replace(/\/+$/, '');
export const SITE_URL = CONFIGURED_SITE_URL || 'https://vowora.uk';

/**
 * Shared 1200×630 share card used by every page that does not pass its own
 * `image`. It must resolve to a real hosted file: this previously pointed at
 * `${SITE_URL}/og-image.jpg`, but no such file existed in `public/`, so every
 * link preview outside the pages with bespoke art returned a 404.
 *
 * To self-host later, drop a real 1200×630 JPEG at `public/og-image.jpg` and
 * set this back to `${SITE_URL}/og-image.jpg` — nothing else needs to change.
 */
export const DEFAULT_OG_IMAGE =
  'https://readdy.ai/api/search-image?query=Elegant%20minimal%20editorial%20photograph%20of%20hands%20writing%20in%20a%20cream%20linen-bound%20wedding%20planner%20on%20a%20warm%20oak%20table%2C%20beside%20a%20sage%20green%20ceramic%20cup%20and%20a%20sprig%20of%20dried%20eucalyptus%2C%20soft%20diffused%20window%20light%20from%20the%20side%2C%20muted%20cream%20sage%20and%20terracotta%20palette%2C%20calm%20organised%20wedding%20planning%20mood%2C%20no%20readable%20text%2C%20shallow%20depth%20of%20field%2C%20high%20detail%2C%20landscape%20composition&width=1200&height=630&seq=vowora-og-shared-2026-e5&orientation=landscape';

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
  /**
   * Optional breadcrumb trail. Emits a matching BreadcrumbList JSON-LD block
   * so search results can show the site path. Omit on the homepage.
   */
  breadcrumbs?: PageBreadcrumbItem[];
}

export interface PageBreadcrumbItem {
  /** Visible crumb label, e.g. "Pricing". */
  label: string;
  /** Route path for ancestor crumbs, e.g. "/pricing". Omit on the current page. */
  path?: string;
}

function buildBreadcrumbList(items: PageBreadcrumbItem[]): Record<string, unknown> {
  const lastIndex = items.length - 1;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(index < lastIndex && item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };
}

/**
 * Applies the "Page Name | Brand" title template exactly once.
 * Titles that already name the brand are left untouched so we never produce
 * "… — Vowora | Vowora". Sub-pages that omit the brand get it appended.
 */
export function withBrandTitle(title: string): string {
  const clean = title.replace(/\s+/g, ' ').trim();
  if (!clean) return SITE_NAME;
  if (clean === SITE_NAME) return `${SITE_NAME} — Your Wedding, Beautifully Organised`;
  return new RegExp(`\\b${SITE_NAME}\\b`).test(clean) ? clean : `${clean} | ${SITE_NAME}`;
}

/** Builds a canonical URL with one trailing-slash policy (root has none). */
export function canonicalUrl(path: string): string {
  const clean = path.split('?')[0].split('#')[0];
  if (!clean || clean === '/') return SITE_URL;
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`.replace(/\/+$/, '');
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
    breadcrumbs,
  } = config;

  const structuredEntries = [
    ...(Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : []),
    ...(breadcrumbs && breadcrumbs.length > 1 ? [buildBreadcrumbList(breadcrumbs)] : []),
  ];
  const structuredJson = structuredEntries.length > 0 ? JSON.stringify(structuredEntries) : '';

  useEffect(() => {
    const canonical = canonicalUrl(path);
    const resolvedTitle = withBrandTitle(title);

    document.title = resolvedTitle;

    upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertCanonical(canonical);

    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_GB');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', imageAlt);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', imageAlt);

    const scripts: HTMLScriptElement[] = [];
    if (structuredJson) {
      (JSON.parse(structuredJson) as Array<Record<string, unknown>>).forEach((entry) => {
        const scriptEl = document.createElement('script');
        scriptEl.setAttribute('type', 'application/ld+json');
        scriptEl.setAttribute(ATTR, 'true');
        scriptEl.textContent = JSON.stringify(entry);
        document.head.appendChild(scriptEl);
        scripts.push(scriptEl);
      });
    }

    return () => {
      scripts.forEach((scriptEl) => scriptEl.remove());
    };
  }, [title, description, path, keywords, image, imageAlt, noindex, structuredJson]);
}