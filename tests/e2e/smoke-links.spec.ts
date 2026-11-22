/**
 * Link and navigation integrity sweep.
 *
 * Visits every smoke route at desktop and mobile widths (opening the menu
 * drawer on mobile), collects every link on the page, and checks:
 *   - no dead placeholders (href="#", empty, javascript:)
 *   - every internal link resolves to a route declared in src/router/config.tsx
 *   - breadcrumb parents are real ancestors of the current page
 *
 * Runs against the same stubbed backend as smoke-all-routes.spec.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { test, expect, type Page } from '@playwright/test';
import { expectRouteRendered, mockBackend, seedBrowserState } from './helpers/smokeHarness';
import { APP_ROUTES, GUEST_ROUTES, PUBLIC_ROUTES, type SmokeRoute } from './helpers/smokeRoutes';

// ── Route patterns from the router itself ──

function routerPatterns(): RegExp[] {
  const source = readFileSync(resolve(cwd(), 'src/router/config.tsx'), 'utf8');
  const top = source.split('\n');
  const patterns: string[] = [];
  let parent: string | null = null;
  let depth = 0;
  for (const line of top) {
    const pathMatch = line.match(/path:\s*["']([^"']+)["']/);
    const isIndex = /index:\s*true/.test(line);
    if (pathMatch && (pathMatch[1] === '/app' || pathMatch[1] === '/guest/:accessId')) {
      parent = pathMatch[1];
      depth = 0;
      patterns.push(parent);
      continue;
    }
    if (parent) {
      depth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      if (pathMatch) patterns.push(`${parent}/${pathMatch[1]}`);
      if (isIndex) patterns.push(parent);
      if (depth < 0) parent = null;
      continue;
    }
    if (pathMatch && pathMatch[1] !== '*') patterns.push(pathMatch[1]);
  }
  return [...new Set(patterns)].map(
    (p) => new RegExp(`^${p.replace(/\/+$/, '').replace(/:[A-Za-z]+/g, '[^/]+')}/?$`),
  );
}

const PATTERNS = routerPatterns();
const resolves = (pathname: string) => PATTERNS.some((re) => re.test(pathname));

// ── Collection ──

interface FoundLink {
  href: string | null;
  text: string;
  inBreadcrumb: boolean;
}

async function collectLinks(page: Page): Promise<FoundLink[]> {
  return page.locator('a').evaluateAll((anchors) =>
    anchors.map((a) => ({
      href: a.getAttribute('href'),
      text: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      inBreadcrumb: !!a.closest('nav[aria-label="Breadcrumb"]'),
    })),
  );
}

async function openMobileMenu(page: Page): Promise<void> {
  const toggle = page
    .locator('button[aria-label*="menu" i], button[aria-label*="navigation" i], button[aria-expanded="false"][aria-controls]')
    .first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

function problemsFor(route: SmokeRoute, currentPath: string, links: FoundLink[]): string[] {
  const problems: string[] = [];
  for (const link of links) {
    const href = link.href;
    const label = link.text || '(no text)';
    if (href === null) continue; // anchors used as scroll targets
    const trimmed = href.trim();
    if (trimmed === '' || trimmed === '#' || /^javascript:/i.test(trimmed)) {
      problems.push(`dead link "${label}" → "${href}"`);
      continue;
    }
    if (trimmed.startsWith('#')) continue; // same-page jump
    if (/^(mailto:|tel:|sms:)/i.test(trimmed)) {
      if (/^mailto:\s*$/i.test(trimmed) || /^tel:\s*$/i.test(trimmed)) problems.push(`empty contact link "${label}"`);
      continue;
    }
    let url: URL;
    try {
      url = new URL(trimmed, 'http://localhost');
    } catch {
      problems.push(`unparseable link "${label}" → "${href}"`);
      continue;
    }
    if (url.hostname !== 'localhost') {
      if (/(^|\.)example\.(com|org)$/.test(url.hostname) || url.hostname === 'example.supabase.co') {
        // Stubbed backend URLs (signed files, etc.) are expected in tests.
        if (url.hostname !== 'example.supabase.co') problems.push(`placeholder URL "${label}" → ${href}`);
      }
      continue;
    }
    if (!resolves(url.pathname)) {
      problems.push(`link to unknown route "${label}" → ${url.pathname}`);
      continue;
    }
    if (link.inBreadcrumb) {
      const target = url.pathname.replace(/\/$/, '');
      const roots = ['', '/app/dashboard'];
      const isGuestHome = /^\/guest\/[^/]+$/.test(target);
      if (!roots.includes(target) && !isGuestHome && !(currentPath === target || currentPath.startsWith(`${target}/`))) {
        problems.push(`breadcrumb "${label}" → ${target} is not a parent of ${currentPath}`);
      }
    }
  }
  return [...new Set(problems)];
}

// ── Sweep ──

const SWEEP: { group: string; routes: SmokeRoute[]; authenticated: boolean }[] = [
  { group: 'public', routes: PUBLIC_ROUTES, authenticated: false },
  { group: 'guest', routes: GUEST_ROUTES, authenticated: false },
  { group: 'app', routes: APP_ROUTES, authenticated: true },
];

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
]) {
  test.describe(`Links — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const { group, routes, authenticated } of SWEEP) {
      test(`${group} routes have no dead or unknown links @sweep`, async ({ page }) => {
        test.setTimeout(routes.length * 15_000);
        await seedBrowserState(page, { authenticated });
        await mockBackend(page);
        const failures: string[] = [];
        for (const route of routes) {
          await page.goto(route.path);
          await expectRouteRendered(page, route.path);
          await page.waitForTimeout(400);
          if (viewport.name === 'mobile') await openMobileMenu(page);
          const current = new URL(page.url()).pathname;
          const problems = problemsFor(route, current, await collectLinks(page));
          for (const p of problems) failures.push(`${route.path}: ${p}`);
        }
        expect(failures, failures.join('\n')).toEqual([]);
      });
    }
  });
}
