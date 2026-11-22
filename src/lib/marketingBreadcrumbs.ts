import type { PageBreadcrumbItem } from '@/hooks/usePageSeo';

/**
 * Single source of truth for the public marketing breadcrumb trails.
 *
 * The same array feeds both the visible trail (PublicBreadcrumbs) and the
 * BreadcrumbList structured data (usePageSeo), so what a visitor sees always
 * matches what search engines read.
 */
export const aboutBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About' },
];

export const featuresBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Features' },
];

export const guestExperienceBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Guest Experience' },
];

export const travelConciergeBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Travel Concierge' },
];

export const pricingBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Pricing' },
];

export const contactBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Contact' },
];

export const privacyBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Privacy Notice' },
];

export const termsBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Terms of Service' },
];

export const cookiesBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Cookie Notice' },
];

export const subprocessorsBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Subprocessors' },
];

export const contentRulesBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Community & Content Rules' },
];

export const dpaBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Data Processing Addendum' },
];

export const retentionBreadcrumbs: PageBreadcrumbItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Data Retention & Deletion Schedule' },
];