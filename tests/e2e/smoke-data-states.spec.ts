/**
 * Data loading states across every app and guest route.
 *
 *   empty   — every workspace table returns no rows
 *   failing — every workspace table and Edge Function returns HTTP 500
 *
 * In both, each page must still render (no blank screen, no uncaught error)
 * and must stop showing a loading spinner within 20 seconds. Identity tables (the
 * account, its wedding and plan) keep their fixtures so the app shell loads;
 * those are covered by the auth and entitlement journeys instead.
 *
 * Also checks that every app route sends a signed-out visitor to /login.
 */
import { test, expect, type Page } from '@playwright/test';
import { expectRouteRendered, mockBackend, seedBrowserState, SUPABASE_ORIGIN } from './helpers/smokeHarness';
import { APP_ROUTES, GUEST_ROUTES, type SmokeRoute } from './helpers/smokeRoutes';

const IDENTITY_TABLES = new Set([
  'profiles', 'weddings', 'wedding_members', 'platform_admins',
  'wedora_subscriptions', 'wedora_subscription_plans', 'subscription_records', 'wedora_customers',
]);

type Mode = 'empty' | 'failing';

async function applyMode(page: Page, mode: Mode) {
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.replace('/rest/v1/', '').split('/')[0];
    if (IDENTITY_TABLES.has(name) || name === 'rpc') return route.fallback();
    if (mode === 'empty') {
      const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return single
        ? route.fulfill({ status: 406, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }) })
        : route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    }
    return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'XX000', message: 'Simulated database failure' }) });
  });
  if (mode === 'failing') {
    await page.route(`${SUPABASE_ORIGIN}/functions/v1/**`, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated function failure' }) }),
    );
  }
}

/** True while a loading indicator is still on screen. */
async function stillLoading(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(el as HTMLElement);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const main = document.querySelector('main') || document.body;
    // Spinners inside buttons are pending actions, not page loads.
    const spinners = [...main.querySelectorAll('.animate-spin')].filter((el) => visible(el) && !el.closest('button'));
    const loadingText = [...main.querySelectorAll('p, span, div')]
      .filter((el) => el.children.length === 0 && /^loading\b.*…?\.{0,3}$/i.test((el.textContent || '').trim()) && visible(el))
      .filter((el) => (el.textContent || '').trim() !== 'Loading page...');
    return spinners.length > 0 || loadingText.length > 0;
  });
}

/** Opens one route in a fresh page and fails if it crashes or never stops loading. */
async function expectSettles(page: Page, route: SmokeRoute, mode: Mode, authenticated: boolean) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await seedBrowserState(page, { authenticated });
  await mockBackend(page);
  await applyMode(page, mode);

  await page.goto(route.path);
  // The router shows PageLoader ("Loading page...") while it checks the
  // session and again while the page's code downloads; the dev server
  // compiles each page on first request, which can be slow. That is not
  // what this sweep measures, so it gets its own, longer limit.
  const pageLoader = page.getByText('Loading page...', { exact: true });
  const codeDeadline = Date.now() + 60_000;
  let quietSince = 0;
  while (Date.now() < codeDeadline) {
    if ((await pageLoader.count()) === 0) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince >= 1_500) break; // gone and stayed gone
    } else {
      quietSince = 0;
    }
    await page.waitForTimeout(250);
  }
  await expect(pageLoader, `${route.path} never finished loading its code`).toHaveCount(0);
  await expectRouteRendered(page, route.path);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline && (await stillLoading(page))) await page.waitForTimeout(250);

  const where = await page.evaluate(() => location.pathname);
  expect(await stillLoading(page), `${route.path} (ended on ${where}) was still loading after 20s with ${mode} data`).toBe(false);
  expect(pageErrors, `${route.path} threw with ${mode} data`).toEqual([]);
}

for (const mode of ['empty', 'failing'] as Mode[]) {
  test.describe(`Data states — ${mode} @sweep`, () => {
    for (const route of APP_ROUTES) {
      test(`${route.path}`, async ({ page }) => { test.setTimeout(120_000); await expectSettles(page, route, mode, true); });
    }
    for (const route of GUEST_ROUTES) {
      test(`${route.path}`, async ({ page }) => { test.setTimeout(120_000); await expectSettles(page, route, mode, false); });
    }
  });
}

test('every app route sends a signed-out visitor to log in @sweep', async ({ page }) => {
  test.setTimeout(APP_ROUTES.length * 10_000);
  await seedBrowserState(page, { authenticated: false });
  await mockBackend(page);
  const leaked: string[] = [];
  for (const route of APP_ROUTES) {
    await page.goto(route.path);
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .not.toBe(route.path)
      .catch(() => undefined);
    const ended = new URL(page.url()).pathname;
    if (ended.startsWith('/app')) leaked.push(`${route.path} → ${ended}`);
  }
  expect(leaked, `signed-out visitor stayed inside the app:\n${leaked.join('\n')}`).toEqual([]);
});
