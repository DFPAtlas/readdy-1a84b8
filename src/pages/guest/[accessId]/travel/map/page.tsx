import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { LocalPlace } from '@/types/access';

const FILTER_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'ri-map-pin-line' },
  { key: 'venue', label: 'Venues', icon: 'ri-building-line' },
  { key: 'hotel', label: 'Hotels', icon: 'ri-hotel-line' },
  { key: 'food_drink', label: 'Food & Drink', icon: 'ri-restaurant-line' },
  { key: 'parking', label: 'Parking', icon: 'ri-car-line' },
  { key: 'transport', label: 'Transport', icon: 'ri-train-line' },
  { key: 'attraction', label: 'Attractions', icon: 'ri-landscape-line' },
  { key: 'essential', label: 'Essentials', icon: 'ri-first-aid-kit-line' },
];

const PLACE_TYPE_ICONS: Record<string, string> = {
  venue: 'ri-building-line',
  hotel: 'ri-hotel-line',
  accommodation: 'ri-hotel-line',
  food_drink: 'ri-restaurant-line',
  restaurant: 'ri-restaurant-line',
  cafe: 'ri-cup-line',
  pub: 'ri-goblet-line',
  parking: 'ri-car-line',
  transport: 'ri-train-line',
  attraction: 'ri-landscape-line',
  activity: 'ri-compass-3-line',
  essential: 'ri-first-aid-kit-line',
  pharmacy: 'ri-medicine-bottle-line',
  hospital: 'ri-hospital-line',
};

export default function GuestTravelMapPage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error } = useGuestPortal();
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<LocalPlace | null>(null);

  const places = data?.localPlaces || [];
  const venues = data?.weddingVenues || [];
  const settings = data?.portal_settings;
  const wedding = data?.wedding;

  // Merge venues into places for display
  const allPlaces: LocalPlace[] = useMemo(() => {
    const venuePlaces: LocalPlace[] = venues.map((v) => ({
      id: v.id,
      place_type: 'venue',
      name: v.name,
      address_line_1: v.address_line_1,
      city: v.city,
      postcode: v.postcode,
      country: v.country,
      is_approved: true,
    }));
    const placeVenueIds = new Set(places.filter((p) => p.place_type === 'venue').map((p) => p.id));
    const dedupedVenues = venuePlaces.filter((v) => !placeVenueIds.has(v.id));
    return [...places, ...dedupedVenues];
  }, [places, venues]);

  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') return allPlaces;
    return allPlaces.filter((p) => p.place_type === activeFilter);
  }, [allPlaces, activeFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPlaces.length };
    FILTER_CATEGORIES.forEach((cat) => {
      if (cat.key !== 'all') counts[cat.key] = allPlaces.filter((p) => p.place_type === cat.key).length;
    });
    return counts;
  }, [allPlaces]);

  const savedIds = useMemo(() => new Set((data?.savedLocations || []).map((s) => s.travel_location_id)), [data]);

  const mapCentre = useMemo(() => {
    const withCoords = allPlaces.find((p) => p.latitude && p.longitude);
    if (withCoords?.latitude && withCoords?.longitude) {
      return { lat: withCoords.latitude, lng: withCoords.longitude, name: withCoords.name };
    }
    if (venues[0]) return { name: venues[0].name };
    return null;
  }, [allPlaces, venues]);

  const mapsApiKey = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_KEY || '';
  const mapEmbedUrl = mapsApiKey && mapCentre
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(mapCentre.name)}&zoom=13`
    : '';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-500">{error || 'Could not load map data.'}</p>
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

  const isGoogleMapsConfigured = Boolean(mapsApiKey);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Wedding Map</h1>
          <p className="text-sm text-foreground-500">All the locations you need for {wedding?.partner_one_name} &amp; {wedding?.partner_two_name}&rsquo;s wedding.</p>
        </div>
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs" /> Back to travel
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTER_CATEGORIES.map((f) => {
          const isActive = activeFilter === f.key;
          const count = filterCounts[f.key] ?? 0;
          if (count === 0 && f.key !== 'all') return null;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-foreground-600 border border-secondary-200 hover:border-secondary-300 hover:text-foreground-900'
              }`}
            >
              <i className={`${f.icon} text-[11px]`} />
              {f.label}
              <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-foreground-400'}`}>{count}</span>
            </button>
          );
        })}
        {activeFilter !== 'all' && (
          <button
            onClick={() => setActiveFilter('all')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-label text-foreground-500 hover:text-foreground-700 bg-white border border-secondary-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-close-line text-[11px]" /> Clear
          </button>
        )}
      </div>

      {/* ── Map Area ── */}
      <div className="mb-8">
        {isGoogleMapsConfigured ? (
          <div className="rounded-xl overflow-hidden border border-secondary-200/70 h-[450px] md:h-[550px] bg-background-50">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Interactive wedding map"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-secondary-200/70 border-dashed h-[450px] md:h-[550px] bg-secondary-50/50 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
                <i className="ri-map-2-line text-3xl" />
              </div>
              <h3 className="font-label text-base font-semibold text-foreground-600 mb-2">Interactive Map Unavailable</h3>
              <p className="text-sm text-foreground-400 max-w-sm mx-auto mb-4">
                Google Maps is not yet configured. The couple can enable interactive mapping to show all wedding locations in one view.
              </p>
              {mapCentre && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(mapCentre.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-external-link-line" /> View area on Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Place List (accessible alternative) ── */}
      <section>
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-list-check text-foreground-400" />
          All Locations
          <span className="text-sm font-normal text-foreground-400">({filteredPlaces.length})</span>
        </h2>

        {filteredPlaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
              <i className="ri-map-pin-line text-xl" />
            </div>
            <p className="text-xs text-foreground-400">No locations match the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlaces.map((place) => {
              const icon = PLACE_TYPE_ICONS[place.place_type] || 'ri-map-pin-line';
              const isSaved = savedIds.has(place.id);
              const address = [place.address_line_1, place.city, place.postcode, place.country].filter(Boolean).join(', ');

              return (
                <div
                  key={place.id}
                  onClick={() => setSelectedPlace(place)}
                  className="bg-white rounded-lg border border-secondary-200/70 p-4 hover:border-secondary-300/70 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${isSaved ? 'bg-primary-50 text-primary-600' : 'bg-secondary-50 text-secondary-400'}`}>
                      <i className={`${icon} text-sm`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{place.name}</h3>
                      <p className="text-[11px] text-foreground-500 capitalize mb-1">{place.place_type.replace(/_/g, ' ')}</p>
                      {address && <p className="text-[11px] text-foreground-400 line-clamp-1">{address}</p>}
                      {place.distance_from_venue && (
                        <p className="text-[10px] text-foreground-400 mt-1">
                          <i className="ri-road-map-line mr-0.5" />{place.distance_from_venue.toFixed(1)} miles
                          {place.estimated_travel_time ? ` (~${place.estimated_travel_time} min)` : ''}
                        </p>
                      )}
                    </div>
                    {isSaved && (
                      <i className="ri-heart-fill text-primary-500 text-sm flex-shrink-0" title="Saved" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-100">
                    {isGoogleMapsConfigured && address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-direction-line" /> Directions
                      </a>
                    )}
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-global-line" /> Website
                      </a>
                    )}
                    {place.telephone && (
                      <a
                        href={`tel:${place.telephone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-phone-line" /> Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Place Detail Drawer ── */}
      {selectedPlace && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setSelectedPlace(null)} />
          <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-secondary-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-heading text-lg text-foreground-900 truncate pr-4">{selectedPlace.name}</h2>
              <button
                onClick={() => setSelectedPlace(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-secondary-50 hover:text-foreground-600 transition-colors cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {selectedPlace.image_url ? (
                <div className="rounded-lg overflow-hidden h-48 bg-background-50">
                  <img src={selectedPlace.image_url} alt={selectedPlace.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden h-48 bg-secondary-50 flex items-center justify-center">
                  <i className={`${PLACE_TYPE_ICONS[selectedPlace.place_type] || 'ri-map-pin-line'} text-4xl text-secondary-300`} />
                </div>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-label font-medium bg-secondary-100 text-foreground-600">
                <i className={`${PLACE_TYPE_ICONS[selectedPlace.place_type] || 'ri-map-pin-line'} text-[10px]`} />
                {selectedPlace.place_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>

              {selectedPlace.couple_note && (
                <div className="bg-primary-50 rounded-lg p-3">
                  <p className="text-xs text-primary-700">
                    <i className="ri-heart-fill text-[10px] mr-1" />{selectedPlace.couple_note}
                  </p>
                </div>
              )}

              {selectedPlace.provider_rating && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <i className="ri-star-fill" /> {selectedPlace.provider_rating}
                  </span>
                  {selectedPlace.review_count && (
                    <span className="text-xs text-foreground-400">({selectedPlace.review_count} reviews)</span>
                  )}
                  {selectedPlace.price_level && (
                    <span className="text-xs text-foreground-400 ml-auto">{selectedPlace.price_level}</span>
                  )}
                </div>
              )}

              {selectedPlace.description && (
                <p className="text-sm text-foreground-600 leading-relaxed">{selectedPlace.description}</p>
              )}

              {selectedPlace.address_line_1 && (
                <div className="bg-secondary-50 rounded-lg p-3">
                  <h4 className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Address</h4>
                  <p className="text-sm text-foreground-700">
                    {[selectedPlace.address_line_1, selectedPlace.city, selectedPlace.postcode, selectedPlace.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {selectedPlace.opening_info && (
                <div>
                  <h4 className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Opening Hours</h4>
                  <p className="text-sm text-foreground-700">{selectedPlace.opening_info}</p>
                </div>
              )}

              {selectedPlace.accessibility_info && (
                <div>
                  <h4 className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Accessibility</h4>
                  <p className="text-sm text-foreground-700">{selectedPlace.accessibility_info}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-secondary-100">
                {selectedPlace.website && (
                  <a
                    href={selectedPlace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-label bg-secondary-100 text-foreground-700 hover:bg-secondary-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-global-line" /> Website
                  </a>
                )}
                {selectedPlace.telephone && (
                  <a
                    href={`tel:${selectedPlace.telephone}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-label bg-secondary-100 text-foreground-700 hover:bg-secondary-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-phone-line" /> {selectedPlace.telephone}
                  </a>
                )}
                {selectedPlace.address_line_1 && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      [selectedPlace.address_line_1, selectedPlace.city, selectedPlace.postcode, selectedPlace.country].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-label bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-direction-line" /> Get Directions
                  </a>
                )}
              </div>

              {selectedPlace.distance_from_venue && (
                <div className="bg-secondary-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-foreground-600">
                    <i className="ri-road-map-line mr-1" />
                    {selectedPlace.distance_from_venue.toFixed(1)} miles from venue
                    {selectedPlace.estimated_travel_time ? ` (~${selectedPlace.estimated_travel_time} min by car)` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}