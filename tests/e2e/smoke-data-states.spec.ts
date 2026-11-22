/**
 * Data loading states across every app and guest route.
 *
 *   empty   — every workspace table returns no rows
 *   failing — every workspace table and Edge Function returns HTTP 500
 *
 * In both, each page must still render (no blank screen, no uncaught error)
 * and must not sit on a loading spinner forever (30s, checked twice). Identity tables (the
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
      .filter((el) => el.children.length === 0 && /^loading\b.*…?\.{0,3}$/i.test((el.textContent || '').trim()) && visible(el));
    return spinners.length > 0 || loadingText.length > 0;
  });
}

async function sweep(page: Page, routes: SmokeRoute[], mode: Mode, authenticated: boolean) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(`${page.url()}: ${err.message}`));
  await seedBrowserState(page, { authenticated });
  await mockBackend(page);
  await applyMode(page, mode);

  const settles = async (path: string) => {
    await page.goto(path);
    await expectRouteRendered(page, path);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && (await stillLoading(page))) await page.waitForTimeout(250);
    return !(await stillLoading(page));
  };

  const stuck: string[] = [];
  for (const route of routes) {
    // A page that hangs, hangs every time. One fresh retry separates that
    // from a slow first compile of the route in the dev server.
    if (!(await settles(route.path)) && !(await settles(route.path))) stuck.push(route.path);
  }
  expect(pageErrors, `uncaught errors with ${mode} data:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(stuck, `still loading after 30s (twice) with ${mode} data:\n${stuck.join('\n')}`).toEqual([]);
}

for (const mode of ['empty', 'failing'] as Mode[]) {
  test.describe(`Data states — ${mode}`, () => {
    test(`app routes render and settle with ${mode} data @sweep`, async ({ page }) => {
      test.setTimeout(APP_ROUTES.length * 40_000);
      await sweep(page, APP_ROUTES, mode, true);
    });
    test(`guest routes render and settle with ${mode} data @sweep`, async ({ page }) => {
      test.setTimeout(GUEST_ROUTES.length * 40_000);
      await sweep(page, GUEST_ROUTES, mode, false);
    });
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
