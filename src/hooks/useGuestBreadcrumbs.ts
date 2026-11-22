import { useLocation, useParams } from 'react-router-dom';
import type { BreadcrumbItem } from '@/components/base/Breadcrumbs';

/** Readable names for every guest portal path segment. */
const SEGMENT_LABELS: Record<string, string> = {
  details: 'Wedding details',
  rsvp: 'RSVP',
  itinerary: 'Itinerary',
  travel: 'Travel & stay',
  map: 'Map',
  accommodation: 'Where to stay',
  'getting-there': 'Getting there',
  'local-guide': 'Local guide',
  saved: 'Saved',
  updates: 'Updates',
  unread: 'Unread',
  registry: 'Registry',
  'gift-funding': 'Gift funding',
  gifts: 'Gifts',
  funds: 'Funds',
  charities: 'Charities',
  confirmation: 'Confirmation',
  review: 'Review',
  gallery: 'Gallery',
  albums: 'Albums',
  favourites: 'Favourites',
  upload: 'Share photos',
  'my-uploads': 'My photos',
  seating: 'My seating',
  table: 'My table',
  questions: 'Questions',
  contacts: 'Contacts',
  settings: 'Settings',
  success: 'Confirmation',
  cancel: 'Cancelled',
};

/** Record-detail labels, keyed by the parent segment. */
const DETAIL_LABELS: Record<string, string> = {
  rsvp: 'Your reply',
  itinerary: 'Event details',
  updates: 'Update',
  accommodation: 'Accommodation',
  gifts: 'Gift details',
  funds: 'Fund details',
  'gift-funding': 'Fund details',
  albums: 'Album',
};

function isRecordId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  return /^[0-9a-f]{16,}$/i.test(segment);
}

function humanise(segment: string): string {
  const spaced = segment.replace(/[-_]+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds the guest portal trail: Home > section > sub-section > current page.
 *
 * Every parent level in the URL is represented, so a page such as
 * /guest/:id/registry/funds/:fundId reads "Home > Registry > Funds > Fund details"
 * rather than collapsing to a single section crumb.
 */
export default function useGuestBreadcrumbs(): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const { accessId } = useParams();

  if (!accessId) return [];

  const base = `/guest/${accessId}`;
  if (!pathname.startsWith(base)) return [];

  const rest = pathname.slice(base.length).replace(/^\/+/, '');
  if (!rest) return [];

  const segments = rest.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Home', to: base }];
  const lastIndex = segments.length - 1;

  segments.forEach((segment, index) => {
    const parent = index > 0 ? segments[index - 1] : undefined;
    const label = isRecordId(segment)
      ? (parent && DETAIL_LABELS[parent]) || 'Details'
      : SEGMENT_LABELS[segment] ?? humanise(segment);
    const to = index < lastIndex ? `${base}/${segments.slice(0, index + 1).join('/')}` : undefined;
    items.push(to ? { label, to } : { label });
  });

  return items;
}