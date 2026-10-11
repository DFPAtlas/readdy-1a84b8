import type { PaidFeature } from '../../supabase/functions/_shared/entitlementConfig';
export function paidRouteFeature(path: string): PaidFeature | null {
  // Basic RSVP response collection stays on Free.
  if (path === '/app/invitations/responses') return null;
  if (/^\/app\/seating\/plans\/[^/]+\/(day-mode|table-cards|place-cards)(\/|$)/.test(path)) return 'weddingDay';
  const sections: Record<string, PaidFeature> = {
    updates: 'communications', 'gallery-control': 'gallery', styleboard: 'planning', calendar: 'planning',
    invitations: 'invitations', communications: 'communications', travel: 'travel',
    gallery: 'gallery', tasks: 'planning', suppliers: 'suppliers', budget: 'budget',
    seating: 'seating', style: 'planning', timeline: 'weddingDay',
  };
  return sections[path.split('/')[2]] || null;
}
