import { describe, expect, it } from 'vitest';
import { buildWeddingSitemap, siteOrigin } from '../../../supabase/functions/_shared/weddingSitemap';

describe('buildWeddingSitemap', () => {
  it('lists each site on the production origin with its date', () => {
    const xml = buildWeddingSitemap(
      [
        { slug: 'emma-and-james', lastmod: '2026-11-20T10:00:00Z' },
        { slug: 'sam-and-alex', lastmod: null },
      ],
      'https://vowora.uk',
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<loc>https://vowora.uk/w/emma-and-james</loc>\n    <lastmod>2026-11-20</lastmod>');
    expect(xml).toContain('<loc>https://vowora.uk/w/sam-and-alex</loc>\n  </url>');
  });

  it('skips unsafe and duplicate slugs', () => {
    const xml = buildWeddingSitemap(
      [
        { slug: 'ok-site', lastmod: null },
        { slug: 'ok-site', lastmod: null },
        { slug: '../admin', lastmod: null },
        { slug: 'a<b', lastmod: null },
        { slug: '', lastmod: null },
      ],
      'https://vowora.uk',
    );
    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml).not.toContain('admin');
  });

  it('produces a valid empty urlset', () => {
    expect(buildWeddingSitemap([], 'https://vowora.uk')).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>');
  });
});

describe('siteOrigin', () => {
  it('normalises the configured URL and falls back to vowora.uk', () => {
    expect(siteOrigin('https://vowora.uk/')).toBe('https://vowora.uk');
    expect(siteOrigin('')).toBe('https://vowora.uk');
    expect(siteOrigin('not a url')).toBe('https://vowora.uk');
    expect(siteOrigin('javascript:alert(1)')).toBe('https://vowora.uk');
  });
});
