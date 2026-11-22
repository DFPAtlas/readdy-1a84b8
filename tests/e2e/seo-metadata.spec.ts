/**
 * Technical SEO contract, checked on the rendered page of every route.
 *
 * Indexable marketing pages (INDEXABLE_PUBLIC_ROUTES):
 *   - unique title of 50–60 characters and description of 140–160
 *   - exactly one description, robots, canonical; robots "index, follow"
 *   - self-referencing canonical on the production origin
 *   - complete Open Graph and Twitter card tags, absolute https image, 1200×630
 *   - valid JSON-LD; a BreadcrumbList matching the visible trail on sub-pages
 *   - one <h1>, no skipped heading levels, every <img> has an alt attribute
 * Every other route (auth, tokens, guest portal, workspace, admin, status
 * pages): robots "noindex", and private screens carry no share-preview tags.
 * Also checks public/sitemap.xml and public/robots.txt against the route list.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { test, expect, type Page } from '@playwright/test';
import { expectRouteRendered, mockBackend, seedBrowserState } from './helpers/smokeHarness';
import { APP_ROUTES, GUEST_ROUTES, PUBLIC_ROUTES } from './helpers/smokeRoutes';

const ORIGIN = 'https://vowora.uk'; // VITE_PUBLIC_SITE_URL in playwright.config.ts
const read = (p: string) => readFileSync(resolve(cwd(), p), 'utf8');

function indexablePaths(): string[] {
  const src = read('src/lib/seoRoutes.ts');
  const start = src.indexOf('INDEXABLE_PUBLIC_ROUTES');
  return [...src.slice(start, src.indexOf('];', start)).matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
}
const INDEXABLE = indexablePaths();

interface Snapshot {
  title: string;
  counts: Record<string, number>;
  meta: Record<string, string | null>;
  canonical: string | null;
  jsonLd: { ok: boolean; types: string[]; breadcrumb: string[] | null }[];
  visibleTrail: string[];
  h1: number;
  skips: string[];
  imgsWithoutAlt: string[];
}

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const head = document.head;
    const one = (sel: string) => head.querySelector(sel)?.getAttribute('content') ?? null;
    const keys = ['description', 'robots', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
    const props = ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:image', 'og:image:width', 'og:image:height'];
    const meta: Record<string, string | null> = {};
    keys.forEach((k) => { meta[k] = one(`meta[name="${k}"]`); });
    props.forEach((k) => { meta[k] = one(`meta[property="${k}"]`); });
    const counts: Record<string, number> = {
      description: head.querySelectorAll('meta[name="description"]').length,
      robots: head.querySelectorAll('meta[name="robots"]').length,
      canonical: head.querySelectorAll('link[rel="canonical"]').length,
      'og:title': head.querySelectorAll('meta[property="og:title"]').length,
      'og:image': head.querySelectorAll('meta[property="og:image"]').length,
    };
    const typesOf = (node: unknown): string[] => {
      if (!node || typeof node !== 'object') return [];
      const n = node as Record<string, unknown>;
      const own = n['@type'] ? [String(n['@type'])] : [];
      const graph = Array.isArray(n['@graph']) ? (n['@graph'] as unknown[]).flatMap(typesOf) : [];
      return [...own, ...graph];
    };
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        const parsed = JSON.parse(s.textContent || '');
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        const crumbs = nodes.find((n) => n && n['@type'] === 'BreadcrumbList');
        return {
          ok: true,
          types: nodes.flatMap(typesOf),
          breadcrumb: crumbs ? (crumbs.itemListElement as { name: string }[]).map((i) => i.name) : null,
        };
      } catch {
        return { ok: false, types: [], breadcrumb: null };
      }
    });
    const trail = document.querySelector('nav[aria-label="Breadcrumb"]');
    const visibleTrail = trail ? [...trail.querySelectorAll('li')].map((li) => (li.textContent || '').trim()).filter(Boolean) : [];
    const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((h) => (h as HTMLElement).offsetParent !== null)
      .map((h) => Number(h.tagName[1]));
    const skips: string[] = [];
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skips.push(`h${levels[i - 1]}→h${levels[i]}`);
    return {
      title: document.title,
      counts,
      meta,
      canonical: head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      jsonLd,
      visibleTrail,
      h1: levels.filter((l) => l === 1).length,
      skips: [...new Set(skips)],
      imgsWithoutAlt: [...document.querySelectorAll('img:not([alt])')].map((i) => (i.getAttribute('src') || '').slice(0, 80)),
    };
  });
}

async function open(page: Page, path: string, authenticated: boolean): Promise<Snapshot> {
  await seedBrowserState(page, { authenticated });
  await mockBackend(page);
  await page.goto(path);
  await expectRouteRendered(page, path);
  await expect(page.getByText('Loading page...', { exact: true })).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(600);
  return snapshot(page);
}

// ── Indexable pages ──

test.describe('SEO — indexable pages', () => {
  for (const path of INDEXABLE) {
    test(path, async ({ page }) => {
      const s = await open(page, path, false);
      const expectedCanonical = path === '/' ? ORIGIN : `${ORIGIN}${path}`;
      const desc = s.meta.description || '';

      expect(s.title.length, `title "${s.title}"`).toBeGreaterThanOrEqual(50);
      expect(s.title.length, `title "${s.title}"`).toBeLessThanOrEqual(60);
      expect(desc.length, `description "${desc}"`).toBeGreaterThanOrEqual(140);
      expect(desc.length, `description "${desc}"`).toBeLessThanOrEqual(160);
      expect(s.counts, 'each head tag appears exactly once').toEqual({ description: 1, robots: 1, canonical: 1, 'og:title': 1, 'og:image': 1 });
      expect(s.meta.robots).toBe('index, follow');
      expect(s.canonical).toBe(expectedCanonical);

      for (const key of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image']) {
        expect(s.meta[key], `${key} is missing`).toBeTruthy();
      }
      expect(s.meta['og:url']).toBe(expectedCanonical);
      expect(s.meta['og:image']).toMatch(/^https:\/\//);
      expect(s.meta['twitter:image']).toBe(s.meta['og:image']);
      expect(s.meta['og:image:width']).toBe('1200');
      expect(s.meta['og:image:height']).toBe('630');
      expect(s.meta['twitter:card']).toBe('summary_large_image');

      expect(s.jsonLd.length, 'no JSON-LD').toBeGreaterThan(0);
      expect(s.jsonLd.every((j) => j.ok), 'invalid JSON-LD').toBe(true);
      if (path === '/') {
        expect(s.jsonLd.flatMap((j) => j.types)).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
      } else if (s.visibleTrail.length > 1) {
        const crumbs = s.jsonLd.find((j) => j.breadcrumb)?.breadcrumb;
        expect(crumbs, 'BreadcrumbList missing for a page with a visible trail').toEqual(s.visibleTrail);
      }

      expect(s.h1, 'exactly one h1').toBe(1);
      expect(s.skips, 'skipped heading levels').toEqual([]);
      expect(s.imgsWithoutAlt, 'images without alt').toEqual([]);

    });
  }

  test('titles and descriptions are unique across indexable pages', async () => {
    const titles = new Map<string, string[]>();
    const descriptions = new Map<string, string[]>();
    for (const file of INDEXABLE.map((p) => (p === '/' ? 'src/pages/home/page.tsx' : `src/pages${p}/page.tsx`))) {
      const src = read(file);
      const t = src.match(/usePageSeo\(\{[\s\S]*?title:\s*'([^']+)'/)?.[1];
      const d = src.match(/usePageSeo\(\{[\s\S]*?description:\s*'([^']+)'/)?.[1];
      if (t) titles.set(t, [...(titles.get(t) || []), file]);
      if (d) descriptions.set(d, [...(descriptions.get(d) || []), file]);
    }
    expect([...titles.values()].filter((v) => v.length > 1)).toEqual([]);
    expect([...descriptions.values()].filter((v) => v.length > 1)).toEqual([]);
  });
});

// ── Everything else stays out of search ──

const NOINDEX_GROUPS = [
  { name: 'public status and token pages', routes: PUBLIC_ROUTES.filter((r) => !INDEXABLE.includes(r.path)), authenticated: false, privateScreen: false },
  { name: 'guest portal', routes: GUEST_ROUTES, authenticated: false, privateScreen: true },
  { name: 'workspace and admin', routes: APP_ROUTES, authenticated: true, privateScreen: true },
];

test.describe('SEO — noindex routes', () => {
  for (const group of NOINDEX_GROUPS) {
    test(`${group.name} are noindex @sweep`, async ({ page }) => {
      test.setTimeout(group.routes.length * 15_000);
      const problems: string[] = [];
      const titles = new Map<string, string>();
      for (const route of group.routes) {
        const s = await open(page, route.path, group.authenticated);
        if (!/noindex/.test(s.meta.robots || '')) problems.push(`${route.path}: robots "${s.meta.robots}"`);
        if (s.counts.robots !== 1) problems.push(`${route.path}: ${s.counts.robots} robots tags`);
        if (s.counts.description > 1) problems.push(`${route.path}: ${s.counts.description} description tags`);
        if (group.privateScreen && (s.meta['og:title'] || s.meta['twitter:card'] || s.canonical)) {
          problems.push(`${route.path}: private screen exposes share-preview or canonical tags`);
        }
        const settled = new URL(page.url()).pathname;
        // Redirects (admin entry, missing records) land on another route's title by design.
        if (settled === route.path && titles.has(s.title)) problems.push(`${route.path}: same title as ${titles.get(s.title)} ("${s.title}")`);
        if (settled === route.path) titles.set(s.title, route.path);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});

// ── Crawl files ──

test('sitemap.xml lists exactly the indexable routes on the production origin', async () => {
  const xml = read('public/sitemap.xml');
  expect(xml.startsWith('<?xml')).toBe(true);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual(INDEXABLE.map((p) => (p === '/' ? `${ORIGIN}/` : `${ORIGIN}${p}`)));
  const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  expect(dates).toHaveLength(locs.length);
  dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
});

test('robots.txt allows the site, blocks private areas and points at the sitemap', async () => {
  const txt = read('public/robots.txt');
  expect(txt).toMatch(/^User-agent: \*$/m);
  expect(txt).toMatch(/^Allow: \/$/m);
  for (const path of ['/app', '/admin', '/dashboard', '/api', '/auth', '/guest', '/invite', '/login']) {
    expect(txt, `robots.txt should disallow ${path}`).toMatch(new RegExp(`^Disallow: ${path}$`, 'm'));
  }
  for (const path of INDEXABLE) {
    if (path === '/') continue;
    expect(txt, `robots.txt must not block ${path}`).not.toMatch(new RegExp(`^Disallow: ${path}$`, 'm'));
  }
  expect(txt).toMatch(/^Sitemap: https:\/\/vowora\.uk\/sitemap\.xml$/m);
});

// ── Couple websites (/w/:slug) ──

function publishedSite(searchIndexing: boolean) {
  return {
    wedding: { id: 'w-1', slug: 'emma-and-james', title: 'Emma & James', partner_one_name: 'Emma', partner_two_name: 'James', wedding_date: '2027-06-12', location: 'Cotswolds' },
    config: {
      theme_config: { primary_color: '#8a6d5a', secondary_color: '#e9e2d8', accent_color: '#b5835a', background_color: '#fbf8f3', text_color: '#2b2724', heading_font: 'serif', body_font: 'sans-serif' },
      navigation_config: { show_top_nav: false, links: [] },
      sections_config: [],
      seo_config: { search_indexing: searchIndexing, seo_title: '', meta_description: '', social_title: '', social_description: '', social_image_url: null, canonical_domain: null },
    },
    events: [], venues: [], faqs: [], places: [],
  };
}

for (const indexing of [true, false]) {
  test(`couple website follows the couple's indexing choice (${indexing ? 'on' : 'off'}) with one set of tags`, async ({ page }) => {
    await seedBrowserState(page, { authenticated: false });
    await mockBackend(page);
    await page.route('**/rest/v1/rpc/public_wedding_page', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publishedSite(indexing)) }),
    );
    await page.goto('/w/emma-and-james');
    await expect(page.getByText('Loading wedding website…')).toHaveCount(0, { timeout: 30_000 });
    await expect.poll(() => page.title()).toContain('Emma & James');
    const s = await snapshot(page);
    expect(s.counts.description).toBe(1);
    expect(s.counts.robots).toBe(1);
    expect(s.counts.canonical).toBe(1);
    expect(s.meta.robots).toBe(indexing ? 'index, follow' : 'noindex, nofollow');
    expect(s.canonical).toBe(`${ORIGIN}/w/emma-and-james`);
    expect(s.meta['og:url']).toBe(`${ORIGIN}/w/emma-and-james`);
    expect((s.meta.description || '').length).toBeLessThanOrEqual(160);
  });
}

test('an unpublished couple website is noindex and never borrows the homepage canonical', async ({ page }) => {
  const s = await open(page, '/w/not-published', false);
  expect(s.meta.robots).toBe('noindex, nofollow');
  expect(s.canonical).toBe(`${ORIGIN}/w/not-published`);
  expect(s.title).toBe('Wedding website unavailable | Vowora');
});
