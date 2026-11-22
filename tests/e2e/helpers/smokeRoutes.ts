/**
 * Every route declared in src/router/config.tsx, with what the smoke suite
 * expects to see on it.
 *
 * `breadcrumb`:
 *   required → the page must show a semantic trail (nav[aria-label="Breadcrumb"])
 *   none     → the page intentionally shows no trail (homepage, app dashboard,
 *              admin console, guest portal home)
 *   optional → not asserted (public pages without a defined hierarchy)
 *
 * `pathPrefix` is used for record routes: the page may legitimately fall back to
 * its parent section when the fixture record is not found, but it must never
 * bounce to the login screen or a different section.
 */
import {
  GUEST_ACCESS_ID,
  HELP_SLUG,
  IDS,
  INVITE_TOKEN,
  JOIN_TOKEN,
  PHOTO_TOKEN,
  PUBLIC_SLUG,
} from './smokeHarness';

export interface SmokeRoute {
  path: string;
  name: string;
  breadcrumb: 'required' | 'none' | 'optional';
  /** Assert the settled pathname starts with this instead of matching exactly. */
  pathPrefix?: string;
  /** The page may show a friendly "unavailable" state without a live backend. */
  allowErrorState?: boolean;
  /** Short-lived routes (auth callback) redirect away by design. */
  skipPathAssertion?: boolean;
}

// ── Public routes ──

export const PUBLIC_ROUTES: SmokeRoute[] = [
  { path: '/', name: 'Homepage', breadcrumb: 'none' },
  { path: '/features', name: 'Features', breadcrumb: 'required' },
  { path: '/guest-experience', name: 'Guest experience', breadcrumb: 'required' },
  { path: '/travel-concierge', name: 'Travel concierge', breadcrumb: 'required' },
  { path: '/pricing', name: 'Pricing', breadcrumb: 'required' },
  { path: '/about', name: 'About', breadcrumb: 'required' },
  { path: '/contact', name: 'Contact', breadcrumb: 'required' },
  { path: '/login', name: 'Log in', breadcrumb: 'none' },
  { path: '/signup', name: 'Sign up', breadcrumb: 'none' },
  { path: '/forgot-password', name: 'Forgot password', breadcrumb: 'none' },
  { path: '/reset-password', name: 'Reset password', breadcrumb: 'none' },
  { path: '/auth/callback', name: 'Auth callback', breadcrumb: 'none', skipPathAssertion: true },
  { path: '/privacy', name: 'Privacy notice', breadcrumb: 'required' },
  { path: '/terms', name: 'Terms', breadcrumb: 'required' },
  { path: '/cookies', name: 'Cookie notice', breadcrumb: 'required' },
  { path: '/subprocessors', name: 'Subprocessors', breadcrumb: 'required' },
  { path: '/content-rules', name: 'Content rules', breadcrumb: 'required' },
  { path: '/dpa', name: 'Data processing agreement', breadcrumb: 'required' },
  { path: '/retention', name: 'Retention policy', breadcrumb: 'required' },
  { path: '/unsubscribe', name: 'Unsubscribe', breadcrumb: 'required' },
  { path: '/demo-start', name: 'Demo start', breadcrumb: 'none' },
  { path: `/join/${JOIN_TOKEN}`, name: 'Collaborator invite', breadcrumb: 'none' },
  { path: `/invite/${INVITE_TOKEN}`, name: 'Personal invitation', breadcrumb: 'none' },
  { path: `/w/${PUBLIC_SLUG}`, name: 'Published wedding website', breadcrumb: 'none' },
  { path: `/w/${PUBLIC_SLUG}/table-lookup`, name: 'Public table lookup', breadcrumb: 'none' },
  { path: `/live-wall/${PUBLIC_SLUG}`, name: 'Live photo wall', breadcrumb: 'none', allowErrorState: true },
  { path: `/photos/${PHOTO_TOKEN}`, name: 'Shared photo upload', breadcrumb: 'none', allowErrorState: true },
  { path: '/guest/fund/contribution/success', name: 'Contribution success', breadcrumb: 'none', allowErrorState: true },
  { path: '/guest/fund/contribution/cancel', name: 'Contribution cancelled', breadcrumb: 'none' },
];

// ── Guest portal routes ──

function guestRoute(suffix: string, name: string, breadcrumb: 'required' | 'none' = 'required'): SmokeRoute {
  return {
    path: `/guest/${GUEST_ACCESS_ID}${suffix}`,
    name,
    breadcrumb,
    pathPrefix: `/guest/${GUEST_ACCESS_ID}`,
  };
}

export const GUEST_ROUTES: SmokeRoute[] = [
  guestRoute('', 'Guest home', 'none'),
  guestRoute('/details', 'Wedding details'),
  guestRoute('/travel', 'Travel & stay'),
  guestRoute('/travel/map', 'Travel map'),
  guestRoute('/travel/accommodation', 'Where to stay'),
  guestRoute(`/travel/accommodation/${IDS.location}`, 'Accommodation detail'),
  guestRoute('/travel/getting-there', 'Getting there'),
  guestRoute('/travel/local-guide', 'Local guide'),
  guestRoute('/travel/saved', 'Saved travel ideas'),
  guestRoute('/updates', 'Updates'),
  guestRoute(`/updates/${IDS.update}`, 'Update detail'),
  guestRoute('/updates/saved', 'Saved updates'),
  guestRoute('/updates/unread', 'Unread updates'),
  guestRoute('/seating', 'My seating'),
  guestRoute('/seating/table', 'My table'),
  guestRoute('/seating/map', 'Seating map'),
  guestRoute('/itinerary', 'Itinerary'),
  guestRoute(`/itinerary/${IDS.event}`, 'Event detail'),
  guestRoute('/rsvp', 'RSVP'),
  guestRoute('/rsvp/review', 'RSVP review'),
  guestRoute('/rsvp/confirmation', 'RSVP confirmation'),
  guestRoute(`/rsvp/${IDS.guest}`, 'RSVP for a guest'),
  guestRoute('/registry', 'Registry'),
  guestRoute('/gift-funding', 'Gift funding'),
  guestRoute(`/gift-funding/${IDS.fund}`, 'Gift fund detail'),
  guestRoute('/registry/gifts', 'Registry gifts'),
  guestRoute(`/registry/gifts/${IDS.gift}`, 'Gift detail'),
  guestRoute('/registry/funds', 'Registry funds'),
  guestRoute(`/registry/funds/${IDS.fund}`, 'Fund detail'),
  guestRoute('/registry/charities', 'Charities'),
  guestRoute('/registry/confirmation', 'Contribution confirmation'),
  guestRoute('/gallery', 'Gallery'),
  guestRoute('/gallery/albums', 'Gallery albums'),
  guestRoute(`/gallery/albums/${IDS.album}`, 'Gallery album detail'),
  guestRoute('/gallery/favourites', 'Gallery favourites'),
  guestRoute('/gallery/upload', 'Share photos'),
  guestRoute('/gallery/my-uploads', 'My photos'),
  guestRoute('/questions', 'Guest questions'),
  guestRoute('/contacts', 'Contacts'),
  guestRoute('/settings', 'Guest settings'),
];

// ── Authenticated app routes ──

function appRoute(
  path: string,
  name: string,
  breadcrumb: 'required' | 'none' = 'required',
  extra: Partial<SmokeRoute> = {},
): SmokeRoute {
  return { path: `/app${path}`, name, breadcrumb, ...extra };
}

const RECORD_SECTION = (section: string) => `/app/${section}`;

export const APP_ROUTES: SmokeRoute[] = [
  // Onboarding + dashboard
  appRoute('/onboarding', 'Onboarding', 'none'),
  appRoute('/dashboard', 'Dashboard', 'none'),
  appRoute('/wedding', 'Wedding details'),

  // Guests
  appRoute('/guests', 'Guests'),
  appRoute('/guests/new', 'Add guest'),
  appRoute('/guests/import', 'Import guests'),
  appRoute('/guests/export', 'Export guests'),
  appRoute('/guests/households', 'Households'),
  appRoute('/guests/households/new', 'New household'),
  appRoute('/guests/tags', 'Guest tags'),
  appRoute(`/guests/${IDS.guest}`, 'Guest profile', 'required', { pathPrefix: RECORD_SECTION('guests') }),
  appRoute(`/guests/${IDS.guest}/edit`, 'Edit guest', 'required', { pathPrefix: RECORD_SECTION('guests') }),
  appRoute(`/guests/households/${IDS.household}`, 'Household', 'required', {
    pathPrefix: '/app/guests/households',
  }),
  appRoute(`/guests/households/${IDS.household}/edit`, 'Edit household', 'required', {
    pathPrefix: '/app/guests/households',
  }),

  // Invitations
  appRoute('/invitations', 'Invitations'),
  appRoute('/invitations/new', 'New invitation'),
  appRoute('/invitations/design/new', 'Create a design'),
  appRoute('/invitations/responses', 'Invitation responses'),
  appRoute('/invitations/templates', 'Invitation templates'),
  appRoute('/invitations/templates/new', 'New template'),
  appRoute(`/invitations/templates/${IDS.template}`, 'Template detail', 'required', {
    pathPrefix: RECORD_SECTION('invitations/templates'),
  }),
  appRoute(`/invitations/templates/${IDS.template}/edit`, 'Edit template', 'required', {
    pathPrefix: RECORD_SECTION('invitations/templates'),
  }),
  appRoute(`/invitations/${IDS.invitation}`, 'Invitation detail', 'required', {
    pathPrefix: RECORD_SECTION('invitations'),
  }),
  // Full-screen editor: it renders its own compact in-bar trail
  // (Dashboard › Invitations › Edit invitation). The harness seeds a matching
  // `invitation_designs` record, so the trail is asserted strictly.
  appRoute(`/invitations/${IDS.invitation}/edit`, 'Invitation editor', 'required', {
    pathPrefix: RECORD_SECTION('invitations'),
  }),
  appRoute(`/invitations/${IDS.invitation}/access`, 'Invitation access', 'required', {
    pathPrefix: RECORD_SECTION('invitations'),
  }),
  appRoute(`/invitations/${IDS.invitation}/preview`, 'Invitation preview', 'required', {
    pathPrefix: RECORD_SECTION('invitations'),
  }),
  appRoute('/rsvp-settings', 'RSVP settings'),

  // Planning tools
  appRoute('/updates', 'Guest updates'),
  appRoute('/travel', 'Travel planner'),
  appRoute('/tasks', 'Tasks'),
  appRoute('/suppliers', 'Vendors'),
  appRoute('/gallery', 'Gallery hub'),
  appRoute('/gallery-control', 'Gallery control'),
  appRoute('/questions', 'Guest questions'),
  appRoute('/website', 'Wedding website'),
  appRoute('/website/domain', 'Website domain'),
  appRoute('/website/seo', 'Website SEO'),

  // Budget
  appRoute('/budget', 'Budget overview'),
  appRoute('/budget/setup', 'Budget setup'),
  appRoute('/budget/categories', 'Budget categories'),
  appRoute('/budget/payments', 'Budget payments'),
  appRoute('/budget/suppliers', 'Vendor payments'),
  appRoute('/budget/scenarios', 'Budget scenarios'),
  appRoute('/budget/reports', 'Budget reports'),
  appRoute('/budget/settings', 'Budget settings'),
  appRoute('/budget/gift-funding', 'Gift fund setup'),

  // Seating
  appRoute('/seating', 'Seating overview'),
  appRoute('/seating/new', 'New seating plan'),
  appRoute('/seating/plans', 'Seating plans'),
  // Full-screen canvas: the workspace bar renders its own compact trail
  // (Dashboard › Seating › Plans › <plan name>), so a trail IS expected here.
  appRoute(`/seating/plans/${IDS.plan}`, 'Seating canvas', 'required'),
  appRoute(`/seating/plans/${IDS.plan}/settings`, 'Plan settings'),
  appRoute(`/seating/plans/${IDS.plan}/versions`, 'Plan versions'),
  appRoute(`/seating/plans/${IDS.plan}/groups`, 'Plan groups'),
  appRoute(`/seating/plans/${IDS.plan}/rules`, 'Plan rules'),
  appRoute(`/seating/plans/${IDS.plan}/conflicts`, 'Plan conflicts'),
  appRoute(`/seating/plans/${IDS.plan}/assistant`, 'Seating assistant'),
  appRoute(`/seating/plans/${IDS.plan}/assistant/${IDS.proposal}`, 'Proposal review'),
  appRoute(`/seating/plans/${IDS.plan}/reports`, 'Plan reports'),
  appRoute(`/seating/plans/${IDS.plan}/exports`, 'Plan exports'),
  appRoute(`/seating/plans/${IDS.plan}/publish`, 'Publish plan'),
  appRoute(`/seating/plans/${IDS.plan}/day-mode`, 'Day mode'),
  appRoute(`/seating/plans/${IDS.plan}/table-cards`, 'Table cards'),
  appRoute(`/seating/plans/${IDS.plan}/place-cards`, 'Place cards'),
  appRoute(`/seating/plans/${IDS.plan}/audit`, 'Plan audit'),

  // Day-of planning
  appRoute('/schedule', 'Schedule & events'),
  appRoute('/calendar', 'Calendar'),
  appRoute('/timeline', 'Day timeline'),
  appRoute('/exports', 'Exports'),
  appRoute('/after-wedding', 'After the wedding'),

  // Settings & account
  appRoute('/settings', 'Settings'),
  appRoute('/styleboard', 'Styleboard'),
  appRoute('/notifications', 'Notifications'),
  appRoute('/activity', 'Activity'),
  appRoute('/search', 'Search'),
  appRoute('/billing', 'Plans & billing'),
  appRoute('/getting-started', 'Getting started'),
  appRoute('/help', 'Help centre'),
  appRoute(`/help/${HELP_SLUG}`, 'Help article'),
  appRoute('/support', 'Support'),
  appRoute('/account/profile', 'My profile'),
  appRoute('/account/security', 'Account security'),
  appRoute('/account/privacy', 'Privacy & data'),
  appRoute('/collaborators', 'Collaborators'),

  // Admin console (own chrome, no app breadcrumb trail)
  appRoute('/admin', 'Admin entry redirect', 'none', { pathPrefix: '/app/admin' }),
  appRoute('/admin/dashboard', 'Admin dashboard redirect', 'none', { pathPrefix: '/app/admin' }),
  appRoute('/admin/system-readiness', 'System readiness', 'none'),
  appRoute('/admin/operations', 'Operations', 'none'),
  appRoute('/admin/incidents', 'Incidents', 'none'),
  appRoute('/admin/support', 'Support cases', 'none'),
  appRoute('/admin/releases', 'Releases', 'none'),
  appRoute('/admin/analytics', 'Product analytics', 'none'),
  appRoute('/admin/feedback', 'Feedback', 'none'),
  appRoute('/admin/improvements', 'Improvements', 'none'),
  appRoute('/admin/backups', 'Backups', 'none'),
  appRoute('/admin/recovery', 'Recovery', 'none'),
  appRoute('/admin/data-protection', 'Data protection', 'none'),
  appRoute('/admin/performance', 'Performance', 'none'),
];

/** Deep routes used to prove that trail links actually navigate to their parent. */
export const TRAIL_NAVIGATION_ROUTES = {
  app: `/app/seating/plans/${IDS.plan}/groups`,
  publicPage: '/pricing',
  guest: `/guest/${GUEST_ACCESS_ID}/registry/funds`,
};

export const SEATING_GROUPS_ROUTE = `/app/seating/plans/${IDS.plan}/groups`;
export const PROPOSAL_ROUTE = `/app/seating/plans/${IDS.plan}/assistant/${IDS.proposal}`;
export const SEATING_CANVAS_ROUTE = `/app/seating/plans/${IDS.plan}`;
export const INVITATION_EDITOR_ROUTE = `/app/invitations/${IDS.invitation}/edit`;