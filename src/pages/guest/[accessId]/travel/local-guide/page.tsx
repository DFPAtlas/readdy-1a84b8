import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { LocalPlace } from '@/types/access';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'ri-map-pin-line' },
  { key: 'restaurant', label: 'Restaurants', icon: 'ri-restaurant-line' },
  { key: 'cafe', label: 'Cafés', icon: 'ri-cup-line' },
  { key: 'pub', label: 'Pubs & Bars', icon: 'ri-goblet-line' },
  { key: 'attraction', label: 'Attractions', icon: 'ri-landscape-line' },
  { key: 'activity', label: 'Activities', icon: 'ri-compass-3-line' },
  { key: 'essential', label: 'Essentials', icon: 'ri-first-aid-kit-line' },
];

const PLACE_ICONS: Record<string, string> = {
  restaurant: 'ri-restaurant-line',
  food_drink: 'ri-restaurant-line',
  cafe: 'ri-cup-line',
  pub: 'ri-goblet-line',
  attraction: 'ri-landscape-line',
  activity: 'ri-compass-3-line',
  essential: 'ri-first-aid-kit-line',
  pharmacy: 'ri-medicine-bottle-line',
  hospital: 'ri-hospital-line',
  supermarket: 'ri-shopping-basket-line',
  beauty: 'ri-scissors-line',
};

export default function GuestLocalGuidePage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error } = useGuestPortal();
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const places = data?.localPlaces || [];
  const settings = data?.portal_settings;
  const wedding = data?.wedding;
  const savedIds = useMemo(() => new Set((data?.savedLocations || []).map((s) => s.travel_location_id)), [data]);

  const nonAccommodation = useMemo(
    () => places.filter((p) => p.place_type !== 'hotel' && p.place_type !== 'accommodation'),
    [places],
  );

  const filtered = useMemo(() => {
    let result = nonAccommodation;
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.place_type === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || (p.city && p.city.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [nonAccommodation, activeCategory, search]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: nonAccommodation.length };
    CATEGORIES.forEach((c) => {
      if (c.key !== 'all') counts[c.key] = nonAccommodation.filter((p) => p.place_type === c.key).length;
    });
    return counts;
  }, [nonAccommodation]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading local guide...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">{error || 'Could not load local guide.'}</p>
      </div>
    );
  }

  if (!settings?.show_travel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-map-pin-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-500">Travel information is not currently available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Local Guide</h1>
          <p className="text-sm text-foreground-500">
            Places in the area recommended for {wedding?.partner_one_name} &amp; {wedding?.partner_two_name}&rsquo;s guests.
          </p>
        </div>
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs" /> Back
        </Link>
      </div>

      {/* ── Search ── */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search places..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors placeholder:text-foreground-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
            >
              <i className="ri-close-line text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = countByCategory[cat.key] ?? 0;
          if (count === 0 && cat.key !== 'all') return null;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-foreground-600 border border-secondary-200 hover:border-secondary-300 hover:text-foreground-900'
              }`}
            >
              <i className={`${cat.icon} text-[11px]`} />
              {cat.label}
              <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-foreground-400'}`}>{count}</span>
            </button>
          );
        })}
        {activeCategory !== 'all' && (
          <button
            onClick={() => setActiveCategory('all')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-label text-foreground-500 bg-white border border-secondary-200 hover:text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-close-line text-[11px]" /> Clear
          </button>
        )}
      </div>

      {/* ── Place Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
            <i className="ri-store-2-line text-2xl" />
          </div>
          <h3 className="font-label text-base font-semibold text-foreground-600 mb-2">
            {search ? 'No places found' : 'No places in this category'}
          </h3>
          <p className="text-sm text-foreground-400 max-w-sm mx-auto">
            {search
              ? 'Try a different search term or browse all categories.'
              : 'The couple haven\'t added any places here yet. Check back closer to the wedding date.'}
          </p>
          {search && (
            <button
              onClick={() => { setSearch(''); setActiveCategory('all'); }}
              className="inline-flex items-center gap-1 mt-4 text-sm font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((place) => {
            const icon = PLACE_ICONS[place.place_type] || 'ri-map-pin-line';
            const isSaved = savedIds.has(place.id);
            const address = [place.address_line_1, place.city, place.postcode, place.country].filter(Boolean).join(', ');

            return (
              <div
                key={place.id}
                className="bg-white rounded-lg border border-secondary-200/70 overflow-hidden hover:border-secondary-300/70 transition-colors group"
              >
                <div className="h-40 bg-secondary-50 overflow-hidden relative">
                  {place.image_url ? (
                    <img src={place.image_url} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary-300">
                      <i className={`${icon} text-3xl`} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-white/90 text-foreground-700">
                      <i className={`${icon} text-[10px]`} />
                      {place.place_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                  {isSaved && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 text-primary-600 font-label">
                        <i className="ri-heart-fill text-[10px]" /> Saved
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{place.name}</h3>
                  {address && <p className="text-[11px] text-foreground-400 line-clamp-1 mt-0.5">{address}</p>}
                  {place.couple_note && (
                    <p className="text-[11px] text-primary-600 mt-1 line-clamp-1 italic">
                      <i className="ri-heart-fill text-[10px] mr-1" />{place.couple_note}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-secondary-100">
                    <div className="flex items-center gap-2">
                      {place.provider_rating && (
                        <span className="flex items-center gap-0.5 text-[11px] text-foreground-600">
                          <i className="ri-star-fill text-amber-500 text-[10px]" /> {place.provider_rating}
                        </span>
                      )}
                      {place.price_level && <span className="text-[10px] text-foreground-400">{place.price_level}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {place.website && (
                        <a href={place.website} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Website">
                          <i className="ri-global-line text-xs" />
                        </a>
                      )}
                      {address && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Directions">
                          <i className="ri-direction-line text-xs" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}