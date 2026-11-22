/**
 * Full-route smoke suite.
 *
 * Opens every route declared in src/router/config.tsx and checks four things:
 *   1. the route renders (app mounted, visible content, a page landmark)
 *   2. no unexpected redirect (record routes may fall back, never to login)
 *   3. the breadcrumb trail matches the route hierarchy and only links internally
 *   4. no uncaught error and no unexpected console error
 *
 * The suite is self-contained: it stubs the placeholder Supabase project from
 * playwright.config.ts and every third-party host, and seeds an authenticated
 * session into localStorage, so it needs no live backend or API keys.
 *
 * Run it with:
 *   npx playwright test tests/e2e/smoke-all-routes.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import {
  expectBreadcrumbTrail,
  expectNoBreadcrumb,
  expectNoHorizontalOverflow,
  expectNoRuntimeErrors,
  expectPathReached,
  expectRouteRendered,
  INVITATION_TITLE,
  mockBackend,
  PLAN_NAME,
  PROPOSAL_TITLE,
  SEATING_CANVAS_ROUTE,
  seedBrowserState,
  watchForRuntimeErrors,
  type CollectedErrors,
} from './helpers/smokeHarness';
import {
  APP_ROUTES,
  GUEST_ROUTES,
  INVITATION_EDITOR_ROUTE,
  PUBLIC_ROUTES,
  PROPOSAL_ROUTE,
  SEATING_GROUPS_ROUTE,
  TRAIL_NAVIGATION_ROUTES,
  type SmokeRoute,
} from './helpers/smokeRoutes';

const BREADCRUMB = 'nav[aria-label="Breadcrumb"]';

/** Boots a route with the right session and stubs, and starts error collection. */
async function visit(
  page: Page,
  route: SmokeRoute,
  options: { authenticated: boolean },
): Promise<CollectedErrors> {
  const errors = watchForRuntimeErrors(page);
  await seedBrowserState(page, { authenticated: options.authenticated });
  await mockBackend(page);

  const response = await page.goto(route.path);
  expect(response?.status() ?? 200, `${route.path} did not return a document`).toBe(200);

  return errors;
}

/** Shared expectations for every route in the sweep. */
async function expectRouteIsHealthy(
  page: Page,
  route: SmokeRoute,
  errors: CollectedErrors,
  options: { strictErrorState: boolean },
): Promise<void> {
  await expectPathReached(page, route);
  await expectRouteRendered(page, route.path, {
    strictErrorState: options.strictErrorState && !route.allowErrorState,
  });

  if (route.breadcrumb === 'required') {
    await expectBreadcrumbTrail(page, route.path);
  }
  if (route.breadcrumb === 'none') {
    await expectNoBreadcrumb(page, route.path);
  }

  // Let deferred data loads and their error handling settle before judging.
  await page.waitForTimeout(350);
  expectNoRuntimeErrors(errors, route.path);
}

// ── 1. Public routes ──

test.describe('Smoke — public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} — ${route.path}`, async ({ page }) => {
      const errors = await visit(page, route, { authenticated: false });
      await expectRouteIsHealthy(page, route, errors, { strictErrorState: false });
    });
  }
});

// ── 2. Guest portal routes ──

test.describe('Smoke — guest portal routes', () => {
  for (const route of GUEST_ROUTES) {
    test(`${route.name} — ${route.path}`, async ({ page }) => {
      const errors = await visit(page, route, { authenticated: false });
      await expectRouteIsHealthy(page, route, errors, { strictErrorState: false });
    });
  }
});

// ── 3. Authenticated app routes ──

test.describe('Smoke — app routes', () => {
  for (const route of APP_ROUTES) {
    test(`${route.name} — ${route.path}`, async ({ page }) => {
      const errors = await visit(page, route, { authenticated: true });
      await expectRouteIsHealthy(page, route, errors, { strictErrorState: true });
    });
  }
});

// ── 4. Breadcrumb behaviour ──

test.describe('Smoke — breadcrumb behaviour', () => {
  test('a deep app page links back to each parent in its trail', async ({ page }) => {
    await seedBrowserState(page, { authenticated: true });
    await mockBackend(page);

    await page.goto(TRAIL_NAVIGATION_ROUTES.app);
    await expectRouteRendered(page, TRAIL_NAVIGATION_ROUTES.app);
    await expectBreadcrumbTrail(page, TRAIL_NAVIGATION_ROUTES.app);

    const trail = page.locator(BREADCRUMB);
    // Dashboard › Seating › Plans › <plan> › Groups
    await expect(trail.locator('ol > li')).toHaveCount(5);

    const firstLink = trail.locator('ol > li a').first();
    const firstHref = await firstLink.getAttribute('href');
    expect(firstHref).toBe('/app/dashboard');

    await firstLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/app/dashboard');
    await expectRouteRendered(page, '/app/dashboard');
  });

  test('the trail names the seating plan and links to its canvas', async ({ page }) => {
    await seedBrowserState(page, { authenticated: true });
    await mockBackend(page);

    await page.goto(SEATING_GROUPS_ROUTE);
    await expectRouteRendered(page, SEATING_GROUPS_ROUTE);

    const trail = page.locator(BREADCRUMB);
    await expect(trail).toContainText(PLAN_NAME);

    await trail.getByRole('link', { name: PLAN_NAME, exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(SEATING_CANVAS_ROUTE);
    await expectRouteRendered(page, SEATING_CANVAS_ROUTE);
  });

  test('the trail names an assistant proposal by its scope', async ({ page }) => {
    await seedBrowserState(page, { authenticated: true });
    await mockBackend(page);

    await page.goto(PROPOSAL_ROUTE);
    await expectRouteRendered(page, PROPOSAL_ROUTE);

    const trail = page.locator(BREADCRUMB);
    await expect(trail).toHaveCount(1);
    await expect(trail).toContainText(PROPOSAL_TITLE);
  });

  test('the invitation editor shows its in-bar trail and names the loaded design', async ({ page }) => {
    await seedBrowserState(page, { authenticated: true });
    await mockBackend(page);

    await page.goto(INVITATION_EDITOR_ROUTE);
    await expectRouteRendered(page, INVITATION_EDITOR_ROUTE);
    await expectBreadcrumbTrail(page, INVITATION_EDITOR_ROUTE);

    // The shared app trail is suppressed on full-screen workspaces, so the
    // editor's own bar is the only trail on the page.
    const trail = page.locator(BREADCRUMB);
    await expect(trail).toHaveCount(1);

    // Dashboard › Invitations › Edit invitation
    await expect(trail.locator('ol > li')).toHaveCount(3);
    await expect(trail.locator('ol > li').nth(0)).toHaveText('Dashboard');
    await expect(trail.locator('ol > li').nth(1)).toHaveText('Invitations');
    await expect(trail.locator('ol > li').nth(2)).toHaveText('Edit invitation');

    // The seeded design resolved, so the editor left its placeholder state.
    await expect(page.getByText(INVITATION_TITLE, { exact: true })).toBeVisible();

    // The section crumb navigates back to the invitations list.
    await trail.getByRole('link', { name: 'Invitations', exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/app/invitations');
    await expectRouteRendered(page, '/app/invitations');
  });

  test('a public page trail links to its parents', async ({ page }) => {
    await seedBrowserState(page, { authenticated: false });
    await mockBackend(page);

    await page.goto(TRAIL_NAVIGATION_ROUTES.publicPage);
    await expectRouteRendered(page, TRAIL_NAVIGATION_ROUTES.publicPage);
    await expectBreadcrumbTrail(page, TRAIL_NAVIGATION_ROUTES.publicPage);

    const firstLink = page.locator(BREADCRUMB).locator('ol > li a').first();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();

    await firstLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(href);
    await expectRouteRendered(page, href ?? '');
  });

  test('a guest portal trail links back to the guest home', async ({ page }) => {
    await seedBrowserState(page, { authenticated: false });
    await mockBackend(page);

    await page.goto(TRAIL_NAVIGATION_ROUTES.guest);
    await expectRouteRendered(page, TRAIL_NAVIGATION_ROUTES.guest);
    await expectBreadcrumbTrail(page, TRAIL_NAVIGATION_ROUTES.guest);

    const homeLink = page.locator(BREADCRUMB).getByRole('link', { name: 'Home', exact: true });
    await homeLink.click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(TRAIL_NAVIGATION_ROUTES.guest.split('/registry')[0]);
  });

  test('the marketing homepage has no trail', async ({ page }) => {
    await seedBrowserState(page, { authenticated: false });
    await mockBackend(page);

    await page.goto('/');
    await expectRouteRendered(page, '/');
    await expectNoBreadcrumb(page, '/');
  });
});

// ── 5. Unknown routes ──

test.describe('Smoke — unknown route', () => {
  test('an unknown path renders the not-found page without a trail', async ({ page }) => {
    const errors = watchForRuntimeErrors(page);
    await seedBrowserState(page, { authenticated: false });
    await mockBackend(page);

    const unknownPath = '/this-route-does-not-exist-999';
    await page.goto(unknownPath);

    await expectRouteRendered(page, unknownPath);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
    await expectNoBreadcrumb(page, unknownPath);

    await page.waitForTimeout(350);
    expectNoRuntimeErrors(errors, unknownPath);
  });
});

// ── 6. Responsive integrity ──

test.describe('Smoke — layout integrity', () => {
  const viewports = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 375, height: 667 },
  ];

  const routes = ['/', '/pricing', '/app/dashboard', '/app/guests', '/features'];

  for (const viewport of viewports) {
    test(`no horizontal overflow at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Stubs and the session are installed once; each route is then just a navigation.
      const errors = watchForRuntimeErrors(page);
      await seedBrowserState(page, { authenticated: true });
      await mockBackend(page);

      for (const route of routes) {
        await page.goto(route.path);
        await expectRouteRendered(page, route.path);
        await expectNoHorizontalOverflow(page, route.path);

        await page.waitForTimeout(250);
        expectNoRuntimeErrors(errors, route.path);
        errors.pageErrors.length = 0;
        errors.consoleErrors.length = 0;
      }
    });
  }
});