/**
 * XML for the couple-website sitemap (wedding-sitemap Edge Function).
 * Free of Deno APIs so the same rules are unit tested in the app.
 */

export interface SitemapSite {
  slug: string;
  lastmod: string | null;
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** The production origin, without a trailing slash. Falls back to vowora.uk. */
export function siteOrigin(configured: string | null | undefined): string {
  try {
    const url = new URL((configured || '').trim() || 'https://vowora.uk');
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {
    // fall through
  }
  return 'https://vowora.uk';
}

/** Builds a sitemaps.org urlset. Unsafe or duplicate slugs are skipped. */
export function buildWeddingSitemap(sites: SitemapSite[], origin: string): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const site of sites) {
    const slug = (site.slug || '').trim().toLowerCase();
    if (!SLUG.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    const date = site.lastmod ? new Date(site.lastmod) : null;
    const lastmod = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
    urls.push(
      [
        '  <url>',
        `    <loc>${escapeXml(`${origin}/w/${slug}`)}</loc>`,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        '  </url>',
      ].join('\n'),
    );
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
