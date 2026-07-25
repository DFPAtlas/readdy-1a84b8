import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';

export default function GuestAccommodationDetailPage() {
  const { accessId, locationId } = useParams();
  const basePath = `/guest/${accessId}`;
  const navigate = useNavigate();
  const { data, loading, error } = useGuestPortal();

  const places = data?.localPlaces || [];
  const place = useMemo(() => places.find((p) => p.id === locationId), [places, locationId]);
  const travelPlans = data?.travelPlans || [];
  const isSaved = useMemo(() => travelPlans.some((p) => p.place_id === locationId), [travelPlans, locationId]);
  const wedding = data?.wedding;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading accommodation details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">{error || 'Could not load accommodation.'}</p>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-hotel-line text-2xl" />
        </div>
        <h1 className="font-heading text-xl text-foreground-900 mb-2">Accommodation not found</h1>
        <p className="text-sm text-foreground-500 mb-4">This accommodation is no longer available or you don't have access to it.</p>
        <Link to={`${basePath}/travel/accommodation`} className="inline-flex items-center gap-1 text-sm font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to accommodation
        </Link>
      </div>
    );
  }

  const address = [place.address_line_1, place.city, place.postcode, place.country].filter(Boolean).join(', ');
  const mapsApiKey = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_KEY || '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
      {/* ── Back ── */}
      <Link
        to={`${basePath}/travel/accommodation`}
        className="inline-flex items-center gap-1.5 text-sm font-label text-foreground-500 hover:text-foreground-700 mb-6 cursor-pointer whitespace-nowrap"
      >
        <i className="ri-arrow-left-line text-xs" /> Back to accommodation
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="rounded-xl overflow-hidden h-64 md:h-80 bg-secondary-50">
            {place.image_url ? (
              <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary-300">
                <i className="ri-hotel-line text-5xl" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-accent-100 text-accent-700">
                <i className="ri-hotel-line mr-0.5" />Accommodation
              </span>
              {isSaved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-primary-50 text-primary-600">
                  <i className="ri-heart-fill mr-0.5" />Saved
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">{place.name}</h1>
          </div>

          {/* Couple note */}
          {place.couple_note && (
            <div className="bg-primary-50 rounded-lg p-4">
              <p className="text-sm text-primary-700">
                <i className="ri-heart-fill mr-1 text-xs" />{place.couple_note}
              </p>
            </div>
          )}

          {/* Description */}
          {place.description && (
            <div>
              <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2">About</h3>
              <p className="text-sm text-foreground-600 leading-relaxed">{place.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {address && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Address</h4>
                <p className="text-sm text-foreground-700">{address}</p>
              </div>
            )}
            {place.telephone && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Contact</h4>
                <a href={`tel:${place.telephone}`} className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  <i className="ri-phone-line mr-1 text-xs" />{place.telephone}
                </a>
              </div>
            )}
            {place.opening_info && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Reception Hours</h4>
                <p className="text-sm text-foreground-700">{place.opening_info}</p>
              </div>
            )}
            {place.accessibility_info && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Accessibility</h4>
                <p className="text-sm text-foreground-700">{place.accessibility_info}</p>
              </div>
            )}
            {place.distance_from_venue && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Distance from Venue</h4>
                <p className="text-sm text-foreground-700">
                  {place.distance_from_venue.toFixed(1)} miles
                  {place.estimated_travel_time ? ` (~${place.estimated_travel_time} min by car)` : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Actions ── */}
        <div className="space-y-4">
          {/* Map */}
          {mapsApiKey && address ? (
            <div className="rounded-lg overflow-hidden border border-secondary-200/70 h-48 bg-background-50">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(address)}&zoom=15`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${place.name}`}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-secondary-200/70 border-dashed h-48 bg-secondary-50/50 flex items-center justify-center">
              <div className="text-center px-3">
                <i className="ri-map-2-line text-xl text-foreground-300 block mb-1" />
                <p className="text-[11px] text-foreground-400">Map unavailable</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-direction-line mr-1.5" />Get Directions
              </a>
            )}

            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-700 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-global-line mr-1.5" />Visit Website
              </a>
            )}

            {place.telephone && (
              <a
                href={`tel:${place.telephone}`}
                className="block w-full text-center px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-700 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-phone-line mr-1.5" />Call {place.telephone}
              </a>
            )}
          </div>

          {/* Save / Manage */}
          <div className="bg-secondary-50 rounded-lg p-4 text-center">
            {isSaved ? (
              <>
                <p className="text-xs text-foreground-600 mb-2">
                  <i className="ri-heart-fill text-accent-500 mr-1" />You've saved this accommodation
                </p>
                <Link
                  to={`${basePath}/travel/saved`}
                  className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  Manage booking details <i className="ri-arrow-right-line text-[10px]" />
                </Link>
              </>
            ) : (
              <button
                onClick={() => navigate(`${basePath}/travel/saved`)}
                className="inline-flex items-center gap-1.5 text-sm font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-heart-line" /> Save as my accommodation
              </button>
            )}
          </div>

          {/* Rating + Price */}
          {(place.provider_rating || place.price_level) && (
            <div className="flex items-center justify-center gap-4 text-xs text-foreground-500">
              {place.provider_rating && (
                <span className="flex items-center gap-1">
                  <i className="ri-star-fill text-amber-500" /> {place.provider_rating}
                  {place.review_count && ` (${place.review_count})`}
                </span>
              )}
              {place.price_level && <span>{place.price_level}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}