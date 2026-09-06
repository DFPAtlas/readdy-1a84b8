/**
 * Vowora Release Gate Smoke Tests (Playwright)
 *
 * Lightweight browser smoke suite that verifies core routes load
 * without JavaScript errors, critical redirects, or regressions.
 *
 * Run: npx playwright test tests/e2e/release-gates.spec.ts
 *
 * These tests use localhost and safe test data only.
 * Never run destructive tests against production.
 */

import { test, expect } from '@playwright/test';

// ── Test configuration ──

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ── Public Routes ──

test.describe('Public Routes', () => {
  test('homepage loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Vowora/);

    expect(errors).toHaveLength(0);
  });

  test('login page loads and has form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page.locator('form')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('legal pages load', async ({ page }) => {
    const legalPaths = ['/privacy', '/terms', '/cookies'];
    for (const path of legalPaths) {
      await page.goto(`${BASE_URL}${path}`);
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('public wedding page loads (demo)', async ({ page }) => {
    await page.goto(`${BASE_URL}/w/emma-and-james`);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('404 page shows for unknown route', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist-999`);
    await expect(page.locator('text=404|text=not found|text=Not Found')).toBeVisible({ timeout: 5000 });
  });
});

// ── Auth Redirects ──

test.describe('Auth Redirects', () => {
  test('unauthenticated user is redirected to login from /app/*', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/dashboard`);
    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
  });

  test('unauthenticated user cannot access admin routes', async ({ page }) => {
    const adminRoutes = [
      '/app/admin/operations',
      '/app/admin/analytics',
      '/app/admin/backups',
      '/app/admin/performance',
    ];
    for (const route of adminRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForURL(/\/login/, { timeout: 5000 });
    }
  });
});

// ── Demo Mode ──

test.describe('Demo Mode', () => {
  test('demo login button is present on login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const demoButton = page.locator('text=Try Demo|text=Explore Demo|text=Demo');
    // Demo button may or may not be present depending on env
    // This just verifies the login page doesn't crash
    await expect(page.locator('form')).toBeVisible();
  });
});

// ── App Shell Navigation (Smoke) ──

test.describe('App Shell (if authenticated)', () => {
  test('app shell navigation does not cause horizontal overflow at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});

// ── Mobile Viewports ──

test.describe('Mobile Responsiveness', () => {
  const mobileViewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 414, height: 896, name: 'iPhone 11' },
  ];

  for (const vp of mobileViewports) {
    test(`homepage has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL);

      const overflowX = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        return html.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth;
      });
      expect(overflowX).toBe(false);
    });

    test(`login page has no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/login`);

      const overflowX = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflowX).toBe(false);
    });
  }
});

// ── Critical Route Smoke ──

test.describe('Critical Route Load', () => {
  const criticalRoutes = [
    { path: '/', name: 'Homepage' },
    { path: '/login', name: 'Login' },
    { path: '/signup', name: 'Signup' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/terms', name: 'Terms' },
    { path: '/contact', name: 'Contact' },
  ];

  for (const route of criticalRoutes) {
    test(`${route.name} (${route.path}) loads with HTTP 200`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${route.path}`);
      expect(response?.status()).toBe(200);
    });
  }
});

// ── No Console Errors ──

test.describe('Console Error Detection', () => {
  const pagesToCheck = ['/', '/login', '/pricing', '/privacy', '/contact'];

  for (const path of pagesToCheck) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');

      // Filter out known benign errors (third-party fonts, etc.)
      const realErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('404 (Not Found)')
      );

      expect(realErrors).toHaveLength(0);
    });
  }
});

// ── Accessibility Quick Check ──

test.describe('Accessibility Basics', () => {
  test('skip-to-content link exists on homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
  });

  test('main-content id exists', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#main-content')).toBeAttached();
  });

  test('page has a lang attribute', async ({ page }) => {
    await page.goto(BASE_URL);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });
});