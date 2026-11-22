/**
 * Single source of truth for what is indexable and what is not.
 *
 * - `INDEXABLE_PUBLIC_ROUTES` mirrors the routes that are allowed into search
 *   results. `public/sitemap.xml` is generated from this list, so adding a page
 *   here (and regenerating the sitemap) is the only step needed to expose it.
 * - `NOINDEX_PREFIXES` lists the private areas that must never be crawled.
 * - `describePrivateRoute` gives each private screen a unique document title
 *   (useful for browser history and support tickets) while its `robots` tag
 *   keeps it out of search indexes.
 */

import type { PageBreadcrumbItem } from '@/hooks/usePageSeo';

/** Prefixes that must never be indexed. `/app` is the authenticated workspace. */
export const NOINDEX_PREFIXES = [
  '/app',
  '/admin',
  '/dashboard',
  '/api',
  '/auth',
  '/guest',
  '/invite',
  '/join',
  '/unsubscribe',
  '/demo-start',
  '/live-wall',
  '/photos',
  '/login',
  '/forgot-password',
  '/reset-password',
] as const;

/** True when a pathname belongs to a private / authenticated area. */
export function isPrivatePath(pathname: string): boolean {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return NOINDEX_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

export interface IndexableRoute {
  path: string;
  /** Short label used in audits and the sitemap generator. */
  label: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

/**
 * Every route that *should* appear in search results.
 * Dynamic couple websites (`/w/:slug`) and guest portals are intentionally
 * excluded: they are per-wedding, gated, or rely on the couple's own
 * indexing preference.
 */
export const INDEXABLE_PUBLIC_ROUTES: IndexableRoute[] = [
  { path: '/', label: 'Home', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/features', label: 'Features', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/guest-experience', label: 'Guest Experience', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/travel-concierge', label: 'Travel Concierge', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/pricing', label: 'Pricing', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/about', label: 'About', changeFrequency: 'yearly', priority: 0.7 },
  { path: '/contact', label: 'Contact', changeFrequency: 'yearly', priority: 0.7 },
  { path: '/signup', label: 'Create account', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', label: 'Privacy Notice', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', label: 'Terms of Service', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/cookies', label: 'Cookie Notice', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/subprocessors', label: 'Subprocessors', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/content-rules', label: 'Community & Content Rules', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/dpa', label: 'Data Processing Addendum', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/retention', label: 'Data Retention Schedule', changeFrequency: 'yearly', priority: 0.3 },
];

/**
 * Human labels for the final path segment of a private route, so every
 * authenticated screen gets a distinct, meaningful title.
 */
const SEGMENT_LABELS: Record<string, string> = {
  app: 'Workspace',
  onboarding: 'Set Up Your Wedding',
  dashboard: 'Dashboard',
  wedding: 'Wedding Details',
  guests: 'Guests',
  households: 'Households',
  tags: 'Guest Tags',
  import: 'Import Guests',
  export: 'Export Guests',
  invitations: 'Invitations',
  templates: 'Invitation Templates',
  design: 'Create Invitation Design',
  responses: 'RSVP Responses',
  access: 'Invitation Access',
  preview: 'Invitation Preview',
  updates: 'Updates',
  travel: 'Travel',
  tasks: 'Tasks',
  suppliers: 'Vendors',
  budget: 'Budget',
  categories: 'Budget Categories',
  payments: 'Budget Payments',
  scenarios: 'Budget Scenarios',
  reports: 'Reports',
  settings: 'Settings',
  seating: 'Seating',
  plans: 'Seating Plans',
  versions: 'Seating Plan Versions',
  groups: 'Seating Groups',
  rules: 'Seating Rules',
  conflicts: 'Seating Conflicts',
  assistant: 'Seating Assistant',
  publish: 'Publish Seating Plan',
  'day-mode': 'Day Mode',
  'table-cards': 'Table Cards',
  'place-cards': 'Place Cards',
  audit: 'Audit Log',
  schedule: 'Schedule',
  questions: 'Guest Questions',
  website: 'Wedding Website',
  domain: 'Domain Settings',
  seo: 'Website SEO',
  calendar: 'Calendar',
  timeline: 'Day Timeline',
  exports: 'Exports',
  notifications: 'Notifications',
  activity: 'Activity',
  search: 'Search',
  billing: 'Billing',
  'getting-started': 'Getting Started',
  help: 'Help Centre',
  admin: 'Administration',
  operations: 'Operations',
  incidents: 'Incidents',
  support: 'Support',
  releases: 'Releases',
  analytics: 'Analytics',
  feedback: 'Feedback',
  improvements: 'Improvements',
  backups: 'Backups',
  recovery: 'Recovery',
  'data-protection': 'Data Protection',
  performance: 'Performance',
  'system-readiness': 'System Readiness',
  account: 'Account',
  profile: 'Profile',
  security: 'Account Security',
  privacy: 'Privacy & Data',
  collaborators: 'Collaborators',
  'after-wedding': 'After the Wedding',
  'rsvp-settings': 'RSVP Settings',
  gallery: 'Gallery',
  'gallery-control': 'Gallery Control',
  new: 'New',
  edit: 'Edit',
};

/** Explicit titles for screens whose path alone reads awkwardly. */
const PATH_TITLE_OVERRIDES: Record<string, string> = {
  '/app/onboarding': 'Set Up Your Wedding',
  '/app/invitations/design/new': 'Create Invitation Design',
  '/app/invitations/templates/new': 'New Invitation Template',
  '/app/guests/new': 'Add a Guest',
  '/app/guests/households/new': 'Add a Household',
  '/app/seating/new': 'Create a Seating Plan',
  '/app/admin/operations': 'Operations Dashboard',
  '/app/admin/system-readiness': 'System Readiness',
  '/app/account/privacy': 'Privacy & Data',
  '/app/account/security': 'Account Security',
  '/app/after-wedding': 'After the Wedding',
  '/app/rsvp-settings': 'RSVP Settings',
};

const EDIT_PREFIX_SEGMENTS = new Set(['new', 'edit']);

function prettifySegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Derives a unique, human title for a private route from its pathname.
 * Dynamic ids (uuids, numeric ids, tokens) are skipped in favour of the
 * nearest meaningful segment.
 */
export function describePrivateRoute(pathname: string): string {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const override = PATH_TITLE_OVERRIDES[clean];
  if (override) return override;

  const segments = clean
    .split('/')
    .filter(Boolean)
    .filter((segment) => !/^[0-9a-f-]{8,}$/i.test(segment) && !/^\d+$/.test(segment));

  const last = segments[segments.length - 1];
  const previous = segments[segments.length - 2];

  if (last && EDIT_PREFIX_SEGMENTS.has(last) && previous) {
    const base = SEGMENT_LABELS[previous] || prettifySegment(previous);
    return `${last === 'new' ? 'New' : 'Edit'} — ${base}`;
  }

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const label = SEGMENT_LABELS[segments[i]];
    if (label && !EDIT_PREFIX_SEGMENTS.has(segments[i])) return label;
  }
  const fallback = segments[segments.length - 1];
  return fallback ? prettifySegment(fallback) : 'Workspace';
}

/** Breadcrumb trail for a private route, used only in the document title. */
export function privateRouteBreadcrumbs(pathname: string): PageBreadcrumbItem[] {
  const label = describePrivateRoute(pathname);
  return [{ label: 'Home', path: '/' }, { label }];
}