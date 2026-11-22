/**
 * Shared harness for the full-route smoke suite.
 *
 * The suite runs against the Vite dev server started by playwright.config.ts,
 * which points the app at a placeholder Supabase project
 * (https://example.supabase.co). Every request to that host is fulfilled here so
 * the sweep never depends on a live backend, and every third-party host is
 * stubbed so external networks cannot make the suite flaky.
 *
 * Authenticated routes get a real Supabase-shaped session written into
 * localStorage before the app boots, so the auth guards resolve without going
 * through the login form on every route.
 */
import { expect, type Page } from '@playwright/test';

/** The Supabase project the Playwright web server is pointed at (see playwright.config.ts). */
export const SUPABASE_ORIGIN = 'https://example.supabase.co';
const SUPABASE_HOST = new URL(SUPABASE_ORIGIN).hostname;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Stable ids used by the fixture records and the routes that reference them. */
export const IDS = {
  user: '10000000-0000-4000-8000-000000000001',
  wedding: '20000000-0000-4000-8000-000000000001',
  member: '21000000-0000-4000-8000-000000000001',
  invitation: '30000000-0000-4000-8000-000000000001',
  template: '31000000-0000-4000-8000-000000000001',
  guest: '40000000-0000-4000-8000-000000000001',
  household: '41000000-0000-4000-8000-000000000001',
  plan: '50000000-0000-4000-8000-000000000001',
  proposal: '51000000-0000-4000-8000-000000000001',
  event: '60000000-0000-4000-8000-000000000001',
  update: '61000000-0000-4000-8000-000000000001',
  album: '62000000-0000-4000-8000-000000000001',
  gift: '63000000-0000-4000-8000-000000000001',
  fund: '64000000-0000-4000-8000-000000000001',
  location: '65000000-0000-4000-8000-000000000001',
} as const;

/** Guest portal session hash, invitation token and shared-upload token used by public routes. */
export const GUEST_ACCESS_ID = 'a'.repeat(64);
export const INVITE_TOKEN = 'b'.repeat(64);
export const PHOTO_TOKEN = 'c'.repeat(64);
export const PUBLIC_SLUG = 'emma-and-james';
export const JOIN_TOKEN = 'example-token';
export const HELP_SLUG = 'welcome-to-vowora';

/** Plan name asserted in the seating breadcrumb trail. */
export const PLAN_NAME = 'Orchard Barn, Main Room';
/** Proposal title asserted in the assistant breadcrumb trail (scope `full`). */
export const PROPOSAL_TITLE = 'Full re-plan proposal';
/** Title of the seeded invitation design — proves the editor loaded a real record. */
export const INVITATION_TITLE = 'Amelia & Jonathan — Save the date';

const COOKIE_CONSENT_STORAGE_KEY = 'vowora_cookie_consent';
const ACTIVE_WEDDING_STORAGE_KEY = 'vowora.activeWeddingId';
const CREATED_AT = '2026-11-01T09:00:00.000Z';

// ── Session fixtures ──

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fixtureUser() {
  return {
    id: IDS.user,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'smoke.test@example.com',
    email_confirmed_at: CREATED_AT,
    phone: '',
    confirmed_at: CREATED_AT,
    last_sign_in_at: CREATED_AT,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { selected_plan: 'complete', first_name: 'Smoke', last_name: 'Tester' },
    identities: [],
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    is_anonymous: false,
  };
}

function fixtureSession() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = 60 * 60;
  return {
    access_token: [
      base64Url({ alg: 'HS256', typ: 'JWT' }),
      base64Url({ sub: IDS.user, role: 'authenticated', aud: 'authenticated', exp: issuedAt + expiresIn }),
      'smoke-signature',
    ].join('.'),
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: issuedAt + expiresIn,
    refresh_token: 'smoke-refresh-token',
    user: fixtureUser(),
  };
}

/** supabase-js derives its storage key from the project ref (first hostname label). */
export function authStorageKey(): string {
  const projectRef = SUPABASE_HOST.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/**
 * Writes the browser state the app expects before its own scripts run:
 * cookie consent (so the banner never intercepts clicks), the auth session and
 * the remembered active wedding.
 */
export async function seedBrowserState(page: Page, options: { authenticated: boolean }): Promise<void> {
  const state = {
    authenticated: options.authenticated,
    authKey: authStorageKey(),
    session: JSON.stringify(fixtureSession()),
    consentKey: COOKIE_CONSENT_STORAGE_KEY,
    weddingKey: ACTIVE_WEDDING_STORAGE_KEY,
    weddingId: IDS.wedding,
  };

  await page.addInitScript((seed) => {
    try {
      window.localStorage.setItem(
        seed.consentKey,
        JSON.stringify({
          version: 1,
          timestamp: new Date().toISOString(),
          consented: true,
          categories: { essential: true, analytics: false, marketing: false },
        }),
      );
      if (!seed.authenticated) return;
      window.localStorage.setItem(seed.authKey, seed.session);
      window.localStorage.setItem(seed.weddingKey, seed.weddingId);
    } catch {
      // A blocked localStorage only affects the fixture, never the render check.
    }
  }, state);
}

// ── Fixture records ──

const PROFILE_ROW = {
  id: IDS.user,
  email: 'smoke.test@example.com',
  first_name: 'Smoke',
  last_name: 'Tester',
  display_name: 'Smoke Tester',
  avatar_url: null,
  onboarding_completed: true,
  marketing_consent: false,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const WEDDING_ROW = {
  id: IDS.wedding,
  title: 'Alex & Sam',
  partner_one_name: 'Alex',
  partner_two_name: 'Sam',
  wedding_date: '2027-06-20',
  slug: 'alex-and-sam',
  status: 'active',
  timezone: 'Europe/London',
  location: 'Kent, United Kingdom',
};

const MEMBER_ROW = {
  id: IDS.member,
  wedding_id: IDS.wedding,
  user_id: IDS.user,
  role: 'owner',
  status: 'active',
  invited_by: null,
  invited_email: null,
  accepted_at: CREATED_AT,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  weddings: WEDDING_ROW,
};

const ADMIN_ROW = { user_id: IDS.user, active: true, role: 'owner', created_at: CREATED_AT };

const SEATING_PLAN_ROW = {
  id: IDS.plan,
  wedding_id: IDS.wedding,
  linked_event_id: IDS.event,
  name: PLAN_NAME,
  event_type: 'reception',
  venue_id: null,
  room_name: 'Main Room',
  room_label: 'Orchard Barn',
  description: 'Reception floor plan',
  notes: null,
  status: 'draft',
  is_working: true,
  is_final: false,
  is_published: false,
  revision: 3,
  canvas_width: 1200,
  canvas_height: 800,
  default_zoom: 1,
  grid_enabled: true,
  grid_size: 20,
  snap_to_grid: true,
  measurement_unit: 'm',
  background_asset_id: null,
  background_opacity: 1,
  background_locked: false,
  created_by: IDS.user,
  updated_by: IDS.user,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  archived_at: null,
  published_at: null,
};

const PROPOSAL_ROW = {
  id: IDS.proposal,
  wedding_id: IDS.wedding,
  seating_plan_id: IDS.plan,
  scope: 'full',
  status: 'ready',
  score: 92,
  summary: 'Re-balanced tables to keep groups together',
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

/**
 * A persisted invitation design. The document matches the shape that
 * `parseInvitationDocument` accepts (canvas + layers with finite geometry), so
 * the editor loads it instead of falling back to `DEFAULT_INVITATION`.
 */
const INVITATION_DESIGN_ROW = {
  id: IDS.invitation,
  user_id: IDS.user,
  wedding_id: IDS.wedding,
  title: INVITATION_TITLE,
  document: {
    canvas: {
      width: 600,
      height: 800,
      background: { color: '#fffaf5', pattern: 'none' },
    },
    layers: [
      {
        id: 'eyebrow',
        type: 'text',
        x: 0,
        y: 144,
        width: 600,
        height: 30,
        rotation: 0,
        zIndex: 0,
        opacity: 1,
        props: {
          content: 'TOGETHER WITH THEIR FAMILIES',
          fontSize: 12,
          weight: 400,
          color: '#8a8078',
          align: 'center',
          lineHeight: 1.6,
          letterSpacing: 4,
          textTransform: 'uppercase',
        },
      },
      {
        id: 'name-amelia',
        type: 'text',
        x: 0,
        y: 280,
        width: 600,
        height: 60,
        rotation: 0,
        zIndex: 1,
        opacity: 1,
        props: {
          content: 'Amelia & Jonathan',
          fontSize: 52,
          weight: 400,
          color: '#3a3430',
          align: 'center',
          lineHeight: 1.1,
          letterSpacing: 0,
        },
      },
      {
        id: 'date',
        type: 'text',
        x: 0,
        y: 555,
        width: 600,
        height: 30,
        rotation: 0,
        zIndex: 2,
        opacity: 1,
        props: {
          content: 'SATURDAY \u00B7 24 MAY 2027 \u00B7 3:00 PM',
          fontSize: 13,
          weight: 500,
          color: '#3a3430',
          align: 'center',
          lineHeight: 1.6,
          letterSpacing: 2,
          textTransform: 'uppercase',
        },
      },
    ],
  },
  thumbnail_url: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
};

const GUEST_PORTAL_DATA = {
  valid: true,
  wedding_id: IDS.wedding,
  session_id: GUEST_ACCESS_ID,
  data: {
    wedding: {
      id: IDS.wedding,
      title: 'Alex & Sam',
      partner_one_name: 'Alex',
      partner_two_name: 'Sam',
      wedding_date: '2027-06-20',
      timezone: 'Europe/London',
      venue_name: 'Orchard Barn',
      venue_address: 'Kent, United Kingdom',
    },
    invitation: {
      id: IDS.invitation,
      status: 'sent',
      rsvp_deadline: '2027-05-20',
      design_document: { canvas: { width: 400, height: 600, background: { color: '#faf5ef' } }, layers: [] },
    },
    recipients: [
      {
        guest_id: IDS.guest,
        guest_name: 'Test Guest',
        recipient_role: 'primary',
        ceremony_invited: true,
        reception_invited: true,
      },
    ],
    events: [
      {
        id: IDS.event,
        name: 'Ceremony',
        event_type: 'ceremony',
        start_time: '2027-06-20T14:00:00Z',
        end_time: '2027-06-20T15:00:00Z',
        venue_name: 'Orchard Barn',
        location: 'Kent, United Kingdom',
      },
    ],
    portal_settings: { portal_enabled: true, rsvp_enabled: true, household_rsvp_enabled: false },
    rsvp_responses: {},
  },
};

function entitlements() {
  return {
    planKey: 'complete',
    accessUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    features: {
      invitations: true,
      communications: true,
      travel: true,
      gallery: true,
      planning: true,
      suppliers: true,
      budget: true,
      seating: true,
      weddingDay: false,
    },
    usage: {
      maxGuests: 250,
      maxCollaborators: 10,
      maxAlbums: 25,
      maxInvitations: 250,
      maxEmailCampaigns: 25,
      maxCustomSections: 12,
      galleryStorageMb: 4096,
    },
  };
}

/** Tables that need a real row so detail routes render instead of redirecting. */
const REST_FIXTURES: Record<string, unknown[]> = {
  profiles: [PROFILE_ROW],
  wedding_members: [MEMBER_ROW],
  platform_admins: [ADMIN_ROW],
  seating_plans: [SEATING_PLAN_ROW],
  seating_assistant_proposals: [PROPOSAL_ROW],
  invitation_designs: [INVITATION_DESIGN_ROW],
};

const ONE_PIXEL_IMAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#f4efe8"/></svg>';

function jsonBody(body: unknown, status = 200) {
  return {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'content-range': '0-0/0',
    },
    body: JSON.stringify(body),
  };
}

function rpcFixture(name: string): unknown {
  if (name === 'get_wedding_entitlements') return entitlements();
  return null;
}

const EMPTY_FUNCTION_PAYLOADS: Record<string, unknown> = {
  'guest-update-interact': { success: true, updates: [], saved: [] },
  'guest-question-interact': { success: true, questions: [], answers: [] },
  'guest-gallery-interact': { success: true, assets: [], albums: [], favourites: [], uploads: [] },
  'guest-settings-interact': { success: true, settings: {} },
  'public-photo-wall': { photos: [], total: 0, enabled: true, wedding: null },
  'gallery-shared-upload': { valid: true, assets: [], settings: {}, upload: null },
  'seating-table-lookup': { found: false, tables: [], messages: [] },
  'travel-places-discover': { places: [] },
};

function functionFixture(name: string): unknown {
  if (name === 'guest-portal-loader' || name === 'validate-invitation') return GUEST_PORTAL_DATA;
  return EMPTY_FUNCTION_PAYLOADS[name] ?? {};
}

/** Builds the reply for any request that targets the placeholder Supabase project. */
function supabaseReply(url: URL, accept: string) {
  const path = url.pathname;

  if (path.startsWith('/auth/v1/user')) return jsonBody(fixtureUser());
  if (path.startsWith('/auth/v1/token') || path.startsWith('/auth/v1/verify')) return jsonBody(fixtureSession());
  if (path.startsWith('/auth/v1/logout')) return { status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' };
  if (path.startsWith('/storage/v1/object')) {
    return { status: 200, headers: { 'content-type': 'image/svg+xml' }, body: ONE_PIXEL_IMAGE };
  }
  if (path.startsWith('/functions/v1/')) {
    return jsonBody(functionFixture(path.replace('/functions/v1/', '').split('/')[0]));
  }
  if (path.startsWith('/rest/v1/rpc/')) {
    return jsonBody(rpcFixture(path.replace('/rest/v1/rpc/', '')));
  }
  if (path.startsWith('/rest/v1/')) {
    const table = path.replace('/rest/v1/', '').split('/')[0];
    const rows = REST_FIXTURES[table] ?? [];
    // postgrest-js requests a bare object via this Accept header for `.single()`.
    // Honouring it lets single-row loads (e.g. the invitation editor) resolve,
    // while `.maybeSingle()` and list queries keep receiving arrays.
    if (accept.includes('application/vnd.pgrst.object+json') && rows.length === 1) {
      return jsonBody(rows[0]);
    }
    return jsonBody(rows);
  }
  return jsonBody(null);
}

function externalReply(resourceType: string) {
  if (resourceType === 'image') {
    return {
      status: 200,
      headers: { 'content-type': 'image/svg+xml' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />',
    };
  }
  if (resourceType === 'stylesheet') {
    return { status: 200, headers: { 'content-type': 'text/css' }, body: '' };
  }
  if (resourceType === 'media') {
    return { status: 200, headers: { 'content-type': 'video/mp4' }, body: '' };
  }
  return { status: 200, headers: { 'content-type': 'text/plain' }, body: '' };
}

/**
 * Installs the network stubs. Must be called before the first navigation so the
 * app never reaches a real host.
 */
export async function mockBackend(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.continue();
    }

    if (url.hostname === SUPABASE_HOST) {
      return route.fulfill(supabaseReply(url, request.headers()['accept'] ?? ''));
    }
    if (LOCAL_HOSTS.has(url.hostname)) {
      return route.continue();
    }
    return route.fulfill(externalReply(request.resourceType()));
  });
}

// ── Runtime error collection ──

export interface CollectedErrors {
  pageErrors: string[];
  consoleErrors: string[];
}

/**
 * Console noise that is produced by the environment rather than the app:
 * blocked/stubbed third-party assets, aborted media element loads and browser
 * infrastructure notices. Application errors are never on this list.
 */
const IGNORED_CONSOLE_ERRORS: RegExp[] = [
  /failed to load resource/i,
  /net::err_/i,
  /media_element_error/i,
  /the play\(\) request was interrupted/i,
  /resizeobserver loop/i,
  /favicon/i,
  /react devtools/i,
];

export function watchForRuntimeErrors(page: Page): CollectedErrors {
  const collected: CollectedErrors = { pageErrors: [], consoleErrors: [] };

  page.on('pageerror', (error) => {
    collected.pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORED_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) return;
    collected.consoleErrors.push(text);
  });

  return collected;
}

export function expectNoRuntimeErrors(collected: CollectedErrors, path: string): void {
  expect(collected.pageErrors, `${path} threw an uncaught error`).toEqual([]);
  expect(collected.consoleErrors, `${path} logged a console error`).toEqual([]);
}

// ── Page assertions ──

const ERROR_HEADING = /something went wrong|unexpected error|application error/i;

/**
 * A route "renders" when the app mounted, produced visible text and shows a
 * real page landmark. This deliberately does not assert specific copy so the
 * check stays valid as content changes.
 */
export async function expectRouteRendered(
  page: Page,
  path: string,
  options: { strictErrorState?: boolean } = {},
): Promise<void> {
  await expect(page.locator('#root'), `${path} did not mount the app`).toBeAttached();

  await expect
    .poll(async () => (await page.locator('#root').innerText()).trim().length, {
      timeout: 20_000,
      message: `${path} rendered a blank screen`,
    })
    .toBeGreaterThan(0);

  await expect(
    page.locator('main, [role="main"], h1, h2, form').first(),
    `${path} rendered no page content`,
  ).toBeVisible();

  if (options.strictErrorState) {
    await expect(page.getByRole('heading', { name: ERROR_HEADING }), `${path} showed an error state`).toHaveCount(0);
  }
}

export interface PathExpectation {
  path: string;
  pathPrefix?: string;
  skipPathAssertion?: boolean;
}

function currentPathname(page: Page): string {
  try {
    return new URL(page.url()).pathname;
  } catch {
    return '';
  }
}

/** Confirms the router settled on the expected URL (no silent redirect to login or elsewhere). */
export async function expectPathReached(page: Page, route: PathExpectation): Promise<void> {
  if (route.skipPathAssertion) return;

  if (route.pathPrefix) {
    await expect
      .poll(() => currentPathname(page), {
        timeout: 15_000,
        message: `${route.path} left its section (ended on ${currentPathname(page)})`,
      })
      .toContain(route.pathPrefix);
    return;
  }

  await expect
    .poll(() => currentPathname(page), {
      timeout: 15_000,
      message: `${route.path} redirected to ${currentPathname(page)}`,
    })
    .toBe(route.path);
}

const BREADCRUMB = 'nav[aria-label="Breadcrumb"]';

/** Asserts a semantic trail exists, ends on the current page and only links to real internal routes. */
export async function expectBreadcrumbTrail(page: Page, path: string): Promise<void> {
  const trail = page.locator(BREADCRUMB);
  await expect(trail, `${path} is missing its breadcrumb trail`).toHaveCount(1);

  const crumbs = trail.locator('ol > li');
  await expect
    .poll(() => crumbs.count(), { timeout: 10_000, message: `${path} has a single-crumb trail` })
    .toBeGreaterThan(1);

  const last = crumbs.last();
  await expect(last.locator('[aria-current="page"]'), `${path} does not mark the current page`).toHaveCount(1);
  await expect(last.locator('a'), `${path} links the current page to itself`).toHaveCount(0);

  const links = trail.locator('ol > li a');
  const hrefs = await links.evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
  );

  expect(hrefs.length, `${path} trail has no navigable parent`).toBeGreaterThan(0);
  hrefs.forEach((href) => {
    expect(href, `${path} has an empty breadcrumb link`).not.toBe('');
    expect(href, `${path} has a placeholder breadcrumb link`).not.toBe('#');
    expect(href, `${path} breadcrumb link is not an internal route`).toMatch(/^\//);
  });
}

export async function expectNoBreadcrumb(page: Page, path: string): Promise<void> {
  await expect(page.locator(BREADCRUMB), `${path} should not show a breadcrumb trail`).toHaveCount(0);
}

/** Guards against clipped navigation and horizontal overflow. */
export async function expectNoHorizontalOverflow(page: Page, path: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
}