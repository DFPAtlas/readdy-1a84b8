import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from '@/hooks/usePageSeo';
import type { PlanConfig } from '@/types/billing';

/**
 * Site-level structured data for the homepage.
 *
 * Only facts that are actually visible on the site are described here:
 * the brand name, its address, what it does, the visible tagline and the
 * contact page. Nothing is invented (no phone number, address, social
 * profiles or founding date), because unverifiable facts in structured data
 * can cost rich-result eligibility.
 *
 * The three nodes are linked by stable @id values so Google treats them as
 * one site rather than three unrelated entities.
 */
export function buildHomeStructuredData(): Record<string, unknown> {
  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const webPageId = `${SITE_URL}/#webpage`;

  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: SITE_NAME,
    alternateName: 'Vowora Wedding Planner',
    url: `${SITE_URL}/`,
    description:
      'Vowora is a wedding planning platform where couples build their wedding website, manage guests, collect RSVPs, share updates and help everyone travel and plan with confidence.',
    slogan: 'Your wedding, beautifully organised.',
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE_URL}/#logo`,
      url: DEFAULT_OG_IMAGE,
      contentUrl: DEFAULT_OG_IMAGE,
      caption: SITE_NAME,
    },
    image: { '@id': `${SITE_URL}/#logo` },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
      availableLanguage: ['English'],
    },
  };

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description:
      'Plan a wedding, keep every guest organised and share everything guests need in one place.',
    inLanguage: 'en-GB',
    publisher: { '@id': organizationId },
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': webPageId,
    name: `${SITE_NAME} — Wedding Website, Guest List & RSVP Planner`,
    url: `${SITE_URL}/`,
    description:
      'Vowora helps couples create a wedding website, manage every guest, collect RSVPs, share updates and help everyone plan their journey.',
    inLanguage: 'en-GB',
    isPartOf: { '@id': websiteId },
    about: { '@id': organizationId },
    publisher: { '@id': organizationId },
    primaryImageOfPage: { '@id': `${SITE_URL}/#logo` },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, website, webPage],
  };
}
/**
 * Pricing page: the product and one Offer per plan, built from the same plan
 * list the page renders, so the structured prices can never drift from the
 * visible ones.
 */
export function buildPricingStructuredData(plans: PlanConfig[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/pricing#software`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description:
      'Wedding planning software for couples: wedding website, guest list, invitations, RSVPs, seating, budget and guest updates in one place.',
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      description: plan.description,
      price: (plan.monthlyPriceMinor / 100).toFixed(2),
      priceCurrency: plan.currency.toUpperCase(),
      url: `${SITE_URL}/pricing`,
      ...(plan.isFree
        ? {}
        : {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: (plan.monthlyPriceMinor / 100).toFixed(2),
              priceCurrency: plan.currency.toUpperCase(),
              billingDuration: 'P1M',
              unitText: 'month',
            },
          }),
    })),
  };
}
