import { useEffect } from 'react';
import type { SeoConfig } from '@/types/website';

export interface PublicFaqItem {
  question?: string | null;
  answer?: string | null;
}

interface UsePublicSeoMetadataParams {
  seo: SeoConfig;
  siteTitle: string;
  siteUrl: string;
  coupleNames: string;
  weddingDate?: string;
  location?: string;
  searchIndexing: boolean;
  faqs?: PublicFaqItem[];
}

const SITE_NAME = 'Vowora';
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function formatWeddingDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** SEO-optimised <title>: "Names Wedding — Location" (kept under 60 chars). */
function buildDefaultTitle(coupleNames: string, location?: string): string {
  const base = coupleNames.trim() || 'Our Wedding';
  const full = location ? `${base} Wedding — ${location}` : `${base} Wedding`;
  if (full.length <= MAX_TITLE) return full;
  const short = `${base} Wedding`;
  return short.length <= MAX_TITLE ? short : truncate(short, MAX_TITLE);
}

/** SEO-optimised meta description: names, date, venue and what guests can find. */
function buildDefaultDescription(
  coupleNames: string,
  dateLabel: string,
  location?: string,
): string {
  const base = coupleNames.trim() || 'We';
  const parts: string[] = [`${base} are getting married`];
  if (dateLabel) parts.push(` on ${dateLabel}`);
  if (location) parts.push(` in ${location}`);
  parts.push('. Find the wedding schedule, venue, travel and RSVP details here.');
  return truncate(parts.join(''), MAX_DESCRIPTION);
}

/** Five SEO-optimised keywords derived from the couple and location. */
function buildKeywords(coupleNames: string, location?: string): string {
  const names = coupleNames.replace(/\s*&\s*/g, ' and ').trim();
  const keywords = ['wedding', `${names} wedding`];
  if (location) keywords.push(`${location} wedding`);
  keywords.push('wedding website', 'RSVP');
  return keywords.slice(0, 5).join(', ');
}

/** Normalise a FAQ list into clean, non-empty Q&A pairs for FAQPage schema. */
function buildFaqEntities(faqs?: PublicFaqItem[]): Record<string, unknown>[] {
  if (!Array.isArray(faqs)) return [];
  const entities: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const faq of faqs) {
    const question = (faq?.question || '').trim().replace(/\s+/g, ' ');
    const answer = (faq?.answer || '').trim().replace(/\s+/g, ' ');
    if (!question || !answer) continue;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entities.push({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    });
  }
  return entities;
}

export function usePublicSeoMetadata({
  seo,
  siteTitle,
  siteUrl,
  coupleNames,
  weddingDate,
  location,
  searchIndexing,
  faqs,
}: UsePublicSeoMetadataParams): void {
  useEffect(() => {
    const head = document.head;

    // ── Remove previous SEO tags ──
    const prevTags = head.querySelectorAll('[data-seo="true"]');
    prevTags.forEach((t) => t.remove());

    const createMeta = (
      content: string,
      attrs: { name?: string; property?: string },
    ): HTMLMetaElement => {
      const el = document.createElement('meta');
      el.setAttribute('data-seo', 'true');
      if (attrs.name) el.setAttribute('name', attrs.name);
      if (attrs.property) el.setAttribute('property', attrs.property);
      el.setAttribute('content', content);
      head.appendChild(el);
      return el;
    };

    const createLink = (rel: string, href: string): HTMLLinkElement => {
      const el = document.createElement('link');
      el.setAttribute('data-seo', 'true');
      el.setAttribute('rel', rel);
      el.setAttribute('href', href);
      head.appendChild(el);
      return el;
    };

    const createScript = (type: string, text: string): HTMLScriptElement => {
      const el = document.createElement('script');
      el.setAttribute('data-seo', 'true');
      el.setAttribute('type', type);
      el.textContent = text;
      head.appendChild(el);
      return el;
    };

    // ── Derived SEO values (couple's own values win; otherwise optimised defaults) ──
    const cleanCouple = coupleNames.trim();
    const dateLabel = formatWeddingDate(weddingDate);

    const title =
      (seo.seo_title || '').trim() ||
      buildDefaultTitle(cleanCouple || siteTitle, location);
    const desc =
      (seo.meta_description || '').trim() ||
      buildDefaultDescription(cleanCouple, dateLabel, location);

    // ── Title ──
    document.title = title;

    // ── Meta description ──
    createMeta(desc, { name: 'description' });

    // ── Keywords ──
    createMeta(buildKeywords(cleanCouple, location), { name: 'keywords' });

    // ── Robots ──
    createMeta(searchIndexing ? 'index, follow' : 'noindex, nofollow', {
      name: 'robots',
    });

    // ── Canonical ──
    const canonicalUrl = seo.canonical_domain || siteUrl;
    createLink('canonical', canonicalUrl);

    // ── Open Graph ──
    const ogTitle = (seo.social_title || '').trim() || title;
    const ogDesc = (seo.social_description || '').trim() || desc;

    createMeta(ogTitle, { property: 'og:title' });
    createMeta(ogDesc, { property: 'og:description' });
    createMeta('website', { property: 'og:type' });
    createMeta(canonicalUrl, { property: 'og:url' });
    createMeta(siteTitle || cleanCouple || SITE_NAME, { property: 'og:site_name' });
    createMeta('en_GB', { property: 'og:locale' });

    if (seo.social_image_url) {
      createMeta(seo.social_image_url, { property: 'og:image' });
      createMeta('1200', { property: 'og:image:width' });
      createMeta('630', { property: 'og:image:height' });
      if (seo.social_image_alt) {
        createMeta(seo.social_image_alt, { property: 'og:image:alt' });
      }
    }

    // ── Twitter Card ──
    createMeta(seo.social_image_url ? 'summary_large_image' : 'summary', {
      name: 'twitter:card',
    });
    createMeta(ogTitle, { name: 'twitter:title' });
    createMeta(ogDesc, { name: 'twitter:description' });
    if (seo.social_image_url) {
      createMeta(seo.social_image_url, { name: 'twitter:image' });
      if (seo.social_image_alt) {
        createMeta(seo.social_image_alt, { name: 'twitter:image:alt' });
      }
    }

    // ── Structured data (JSON-LD): WebPage + the wedding Event ──
    const structuredData: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: desc,
        url: canonicalUrl,
        inLanguage: 'en-GB',
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: canonicalUrl,
        },
      },
    ];

    const eventSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${cleanCouple || siteTitle} Wedding`,
      url: canonicalUrl,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
    };
    if (seo.show_wedding_date_in_meta && weddingDate) {
      eventSchema.startDate = weddingDate;
    }
    if (seo.show_location_in_meta && location) {
      eventSchema.location = { '@type': 'Place', name: location };
    }
    structuredData.push(eventSchema);

    // ── FAQPage rich result: built from the couple's real on-page FAQs ──
    const faqEntities = buildFaqEntities(faqs);
    if (faqEntities.length > 0) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: canonicalUrl,
        inLanguage: 'en-GB',
        mainEntity: faqEntities,
      });
    }

    createScript('application/ld+json', JSON.stringify(structuredData));

    // ── Cleanup: remove SEO tags on unmount / re-run ──
    return () => {
      const tags = head.querySelectorAll('[data-seo="true"]');
      tags.forEach((t) => t.remove());
    };
  }, [seo, siteTitle, siteUrl, coupleNames, weddingDate, location, searchIndexing, faqs]);
}