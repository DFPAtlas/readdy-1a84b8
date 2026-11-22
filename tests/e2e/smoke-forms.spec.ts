/**
 * Public form behaviour: validation, pending state, success and failure.
 * Uses the stubbed backend from the smoke harness; each test overrides the
 * one endpoint it exercises (routes registered later take precedence).
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { mockBackend, seedBrowserState, SUPABASE_ORIGIN } from './helpers/smokeHarness';

const CONTACT_ENDPOINT = 'https://readdy.ai/api/form/**';

async function boot(page: Page, path: string) {
  await seedBrowserState(page, { authenticated: false });
  await mockBackend(page);
  await page.goto(path);
}

/** Holds a request open until release() is called, so the pending state can be observed. */
function gate() {
  let release: () => void = () => undefined;
  const opened = new Promise<void>((r) => { release = r; });
  return { opened, release: () => release() };
}

// ── Login ──

test('login: required fields block submit, bad credentials show a readable error', async ({ page }) => {
  await boot(page, '/login');
  const submit = page.getByRole('button', { name: 'Log in', exact: true });

  await submit.click();
  // Native required validation keeps us on the page with no request sent.
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.locator('#login-email').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);

  const hold = gate();
  let calls = 0;
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/token**`, async (route: Route) => {
    calls += 1;
    await hold.opened;
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    });
  });
  await page.locator('#login-email').fill('someone@example.com');
  await page.locator('#login-password').fill('wrong-password');
  await submit.click();

  const pending = page.getByRole('button', { name: /Signing in/ });
  await expect(pending).toBeDisabled();
  await pending.click({ force: true }).catch(() => undefined); // double-submit attempt
  hold.release();

  await expect(page.getByText(/invalid|incorrect|password/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
  expect(calls, 'a double click sent two sign-in requests').toBe(1);
});

// ── Signup ──

test('signup: field validation messages are shown and nothing is sent', async ({ page }) => {
  await boot(page, '/signup');
  let calls = 0;
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/signup**`, (route) => { calls += 1; return route.abort(); });

  // Bypass native validation so the custom messages are exercised.
  await page.locator('form').first().evaluate((f: HTMLFormElement) => { f.noValidate = true; });
  await page.locator('#signup-email').fill('not-an-email');
  await page.locator('#signup-password').fill('short');
  await page.getByRole('button', { name: 'Create your wedding' }).click();

  await expect(page.getByText('First name is required')).toBeVisible();
  await expect(page.getByText('Please enter a valid email')).toBeVisible();
  await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  expect(calls).toBe(0);
});

// ── Forgot password ──

test('forgot password: pending state, then confirmation', async ({ page }) => {
  await boot(page, '/forgot-password');
  const hold = gate();
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/recover**`, async (route) => {
    await hold.opened;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.locator('#forgot-email').fill('someone@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  hold.release();
  await expect(page.getByText(/check your (email|inbox)|sent/i).first()).toBeVisible();
});

// ── Contact ──

async function fillContact(page: Page) {
  await page.locator('#contact-name').fill('Test Person');
  await page.locator('#contact-email').fill('someone@example.com');
  const subject = page.locator('#contact-subject');
  if (await subject.evaluate((el) => el.tagName === 'SELECT')) {
    await subject.selectOption({ index: 1 });
  } else {
    await subject.fill('Question');
  }
  await page.locator('#contact-message').fill('Hello, this is a smoke test message.');
  await page.locator('#contact-consent').check();
}

test('contact: invalid email is blocked by validation', async ({ page }) => {
  await boot(page, '/contact');
  let calls = 0;
  await page.route(CONTACT_ENDPOINT, (route) => { calls += 1; return route.abort(); });
  await fillContact(page);
  await page.locator('#contact-email').fill('not-an-email');
  await page.locator('form button[type="submit"]').click();
  expect(await page.locator('#contact-email').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  expect(calls).toBe(0);
});

test('contact: success shows a confirmation, pending state blocks double submit', async ({ page }) => {
  await boot(page, '/contact');
  const hold = gate();
  let calls = 0;
  await page.route(CONTACT_ENDPOINT, async (route) => {
    calls += 1;
    await hold.opened;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 'OK' }) });
  });
  await fillContact(page);
  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await expect(submit).toBeDisabled();
  await submit.click({ force: true }).catch(() => undefined);
  hold.release();
  await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  expect(calls).toBe(1);
});

test('contact: a server error page is shown as a readable message', async ({ page }) => {
  await boot(page, '/contact');
  await page.route(CONTACT_ENDPOINT, (route) =>
    route.fulfill({ status: 502, contentType: 'text/html', body: '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>' }),
  );
  await fillContact(page);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(/could not be sent|something went wrong|try again/i).first()).toBeVisible();
  await expect(page.getByText('<!DOCTYPE html>', { exact: false })).toHaveCount(0);
  await expect(page.locator('form button[type="submit"]')).toBeEnabled();
});
