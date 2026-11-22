import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from '@/hooks/usePageSeo';

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
    name: `${SITE_NAME} — Your Wedding, Beautifully Organised`,
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