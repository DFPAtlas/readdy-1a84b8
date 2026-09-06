import { useEffect } from 'react';
import type { SeoConfig } from '@/types/website';

interface UsePublicSeoMetadataParams {
  seo: SeoConfig;
  siteTitle: string;
  siteUrl: string;
  coupleNames: string;
  weddingDate?: string;
  location?: string;
  searchIndexing: boolean;
}

function escapeJsonString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

export function usePublicSeoMetadata({
  seo,
  siteTitle,
  siteUrl,
  coupleNames,
  weddingDate,
  location,
  searchIndexing,
}: UsePublicSeoMetadataParams): void {
  useEffect(() => {
    const head = document.head;

    // ── Remove previous SEO tags ──
    const prevTags = head.querySelectorAll('[data-seo="true"]');
    prevTags.forEach((t) => t.remove());

    const createMeta = (name: string, content: string, attrs: Record<string, string> = {}) => {
      const el = document.createElement('meta');
      el.setAttribute('data-seo', 'true');
      // Set both name and property for compatibility
      if (attrs.property) el.setAttribute('property', attrs.property);
      if (attrs.name) el.setAttribute('name', attrs.name);
      if (name) el.setAttribute('name', name);
      el.setAttribute('content', content);
      head.appendChild(el);
      return el;
    };

    const createLink = (rel: string, href: string) => {
      const el = document.createElement('link');
      el.setAttribute('data-seo', 'true');
      el.setAttribute('rel', rel);
      el.setAttribute('href', href);
      head.appendChild(el);
      return el;
    };

    const createScript = (type: string, text: string) => {
      const el = document.createElement('script');
      el.setAttribute('data-seo', 'true');
      el.setAttribute('type', type);
      el.textContent = text;
      head.appendChild(el);
      return el;
    };

    // ── Title ──
    const title = seo.seo_title || siteTitle;
    document.title = title;
    const titleEl = document.createElement('title');
    titleEl.setAttribute('data-seo', 'true');
    titleEl.textContent = title;
    const existingTitle = head.querySelector('title:not([data-seo])');
    if (existingTitle) existingTitle.remove();
    // The document.title set above handles the actual title; we don't need a second title element

    // ── Meta description ──
    const desc = seo.meta_description || `Join ${coupleNames} in celebrating their wedding day.`;
    createMeta('description', desc);

    // ── Robots ──
    const robotsContent = searchIndexing ? 'index, follow' : 'noindex, nofollow';
    createMeta('robots', robotsContent);

    // ── Canonical ──
    const canonicalUrl = seo.canonical_domain || siteUrl;
    createLink('canonical', canonicalUrl);

    // ── Open Graph ──
    const ogTitle = seo.social_title || title;
    const ogDesc = seo.social_description || desc;
    const ogType = 'website';

    createMeta('', ogTitle, { property: 'og:title' });
    createMeta('', ogDesc, { property: 'og:description' });
    createMeta('', ogType, { property: 'og:type' });
    createMeta('', canonicalUrl, { property: 'og:url' });
    createMeta('', siteTitle, { property: 'og:site_name' });

    if (seo.social_image_url) {
      createMeta('', seo.social_image_url, { property: 'og:image' });
      createMeta('', '1200', { property: 'og:image:width' });
      createMeta('', '630', { property: 'og:image:height' });
      if (seo.social_image_alt) {
        createMeta('', seo.social_image_alt, { property: 'og:image:alt' });
      }
    }

    // ── Twitter Card ──
    createMeta('', seo.social_image_url ? 'summary_large_image' : 'summary', { name: 'twitter:card' });
    createMeta('', ogTitle, { name: 'twitter:title' });
    createMeta('', ogDesc, { name: 'twitter:description' });
    if (seo.social_image_url) {
      createMeta('', seo.social_image_url, { name: 'twitter:image' });
      if (seo.social_image_alt) {
        createMeta('', seo.social_image_alt, { name: 'twitter:image:alt' });
      }
    }

    // ── Structured data (JSON-LD) ──
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: title,
      description: desc,
      url: canonicalUrl,
      about: {
        '@type': 'Event',
        name: `${coupleNames} Wedding`,
      },
    };

    if (seo.show_wedding_date_in_meta && weddingDate) {
      (jsonLd.about as Record<string, unknown>).startDate = weddingDate;
    }
    if (seo.show_location_in_meta && location) {
      (jsonLd.about as Record<string, unknown>).location = {
        '@type': 'Place',
        name: location,
      };
    }

    createScript('application/ld+json', JSON.stringify(jsonLd));

    // ── Cleanup: remove SEO tags on unmount ──
    return () => {
      const tags = head.querySelectorAll('[data-seo="true"]');
      tags.forEach((t) => t.remove());
    };
  }, [seo, siteTitle, siteUrl, coupleNames, weddingDate, location, searchIndexing]);
}