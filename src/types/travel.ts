export interface TravelPlace {
  id: string;
  wedding_id: string;
  place_type: string;
  name: string;
  address_line_1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  website?: string | null;
  telephone?: string | null;
  image_url?: string | null;
  accessibility_info?: string | null;
  opening_info?: string | null;
  provider_rating?: string | null;
  review_count?: number | null;
  price_level?: string | null;
  distance_from_venue?: number | null;
  estimated_travel_time?: number | null;
  is_approved: boolean;
  is_featured?: boolean;
  approval_status: 'approved' | 'pending' | 'hidden';
  visibility?: string;
  reveal_at?: string | null;
  google_place_id?: string | null;
  couple_note?: string | null;
  category_labels?: string[] | null;
  provider_data?: Record<string, unknown> | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type TravelApprovalStatus = 'approved' | 'pending' | 'hidden';

export interface TravelPlaceFormData {
  name: string;
  place_type: string;
  description: string;
  address_line_1: string;
  city: string;
  postcode: string;
  country: string;
  website: string;
  telephone: string;
  couple_note: string;
  approval_status: TravelApprovalStatus;
  is_featured: boolean;
  price_level: string;
  distance_from_venue: string;
  estimated_travel_time: string;
  opening_info: string;
  accessibility_info: string;
}

export interface TravelStats {
  total: number;
  approved: number;
  pending: number;
  hidden: number;
  featured: number;
  byCategory: Record<string, number>;
}

export interface DiscoveryResult {
  google_place_id: string;
  name: string;
  address_line_1: string;
  latitude: number | null;
  longitude: number | null;
  provider_rating: string | null;
  review_count: number | null;
  price_level: string | null;
  place_types: string[];
  photo_reference: string | null;
  provider_data?: Record<string, unknown>;
}

export interface DiscoveryCategory {
  key: string;
  label: string;
  icon: string;
  types: string[];
}

export const TRAVEL_CATEGORIES: { key: string; label: string; icon: string; placeType: string }[] = [
  { key: 'hotel', label: 'Hotel', icon: 'ri-hotel-line', placeType: 'hotel' },
  { key: 'restaurant', label: 'Restaurant', icon: 'ri-restaurant-line', placeType: 'restaurant' },
  { key: 'cafe', label: 'Café', icon: 'ri-cup-line', placeType: 'cafe' },
  { key: 'pub', label: 'Pub & Bar', icon: 'ri-goblet-line', placeType: 'pub' },
  { key: 'taxi', label: 'Taxi', icon: 'ri-taxi-line', placeType: 'taxi' },
  { key: 'railway_station', label: 'Railway Station', icon: 'ri-train-line', placeType: 'railway_station' },
  { key: 'parking', label: 'Parking', icon: 'ri-parking-box-line', placeType: 'parking' },
  { key: 'pharmacy', label: 'Pharmacy', icon: 'ri-medicine-bottle-line', placeType: 'pharmacy' },
  { key: 'supermarket', label: 'Supermarket', icon: 'ri-shopping-basket-line', placeType: 'supermarket' },
  { key: 'attraction', label: 'Local Attraction', icon: 'ri-landscape-line', placeType: 'attraction' },
];

export const APPROVAL_STATUS_LABELS: Record<TravelApprovalStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  hidden: 'Hidden',
};

export const APPROVAL_STATUS_COLORS: Record<TravelApprovalStatus, string> = {
  approved: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  hidden: 'bg-secondary-100 text-foreground-500',
};

export const PRICE_LABELS = ['budget', 'standard', 'luxury'] as const;
export type PriceLabel = typeof PRICE_LABELS[number];

export const PRICE_COLORS: Record<string, string> = {
  budget: 'bg-sky-50 text-sky-700',
  standard: 'bg-background-50 text-foreground-600',
  luxury: 'bg-amber-50 text-amber-700',
};

export const PLACE_TYPE_ICONS: Record<string, string> = {
  hotel: 'ri-hotel-line',
  restaurant: 'ri-restaurant-line',
  cafe: 'ri-cup-line',
  pub: 'ri-goblet-line',
  taxi: 'ri-taxi-line',
  railway_station: 'ri-train-line',
  parking: 'ri-parking-box-line',
  pharmacy: 'ri-medicine-bottle-line',
  supermarket: 'ri-shopping-basket-line',
  attraction: 'ri-landscape-line',
};

export const CATEGORY_GROUPS = {
  accommodation: ['hotel'],
  foodDrink: ['restaurant', 'cafe', 'pub'],
  transport: ['taxi', 'railway_station'],
  essentials: ['parking', 'pharmacy', 'supermarket'],
  thingsToDo: ['attraction'],
};

export function getCategoryGroup(placeType: string): string {
  for (const [group, types] of Object.entries(CATEGORY_GROUPS)) {
    if (types.includes(placeType)) return group;
  }
  return 'other';
}

export function emptyPlaceForm(): TravelPlaceFormData {
  return {
    name: '',
    place_type: 'hotel',
    description: '',
    address_line_1: '',
    city: '',
    postcode: '',
    country: '',
    website: '',
    telephone: '',
    couple_note: '',
    approval_status: 'pending',
    is_featured: false,
    price_level: 'standard',
    distance_from_venue: '',
    estimated_travel_time: '',
    opening_info: '',
    accessibility_info: '',
  };
}