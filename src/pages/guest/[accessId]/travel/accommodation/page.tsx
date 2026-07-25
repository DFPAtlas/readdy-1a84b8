import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { LocalPlace } from '@/types/access';

export default function GuestAccommodationPage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error } = useGuestPortal();

  const places = data?.localPlaces || [];
  const travelPlans = data?.travelPlans || [];
  const settings = data?.portal_settings;
  const wedding = data?.wedding;

  const accommodationPlaces = useMemo(
    () => places.filter((p) => p.place_type === 'hotel' || p.place_type === 'accommodation'),
    [places],
  );

  const savedPlan = useMemo(() => travelPlans.find((p) => p.plan_type === 'accommodation'), [travelPlans]);
  const savedPlace = useMemo(
    () => (savedPlan?.place_id ? places.find((p) => p.id === savedPlan.place_id) : null),
    [savedPlan, places],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading accommodation options...</p>
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
        <p className="text-sm text-foreground-500">{error || 'Could not load accommodation.'}</p>
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
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Accommodation</h1>
          <p className="text-sm text-foreground-500">
            Find somewhere to stay for {wedding?.partner_one_name} &amp; {wedding?.partner_two_name}&rsquo;s wedding.
          </p>
        </div>
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs" /> Back
        </Link>
      </div>

      {/* ── My Saved Accommodation ── */}
      {savedPlan && (
        <section className="mb-8">
          <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-heart-fill text-accent-500" />
            My Accommodation
          </h2>
          <div className="bg-white rounded-lg border border-primary-200/70 p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              {savedPlace?.image_url && (
                <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-secondary-50 flex-shrink-0">
                  <img src={savedPlace.image_url} alt={savedPlace.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-label text-base font-semibold text-foreground-900">
                  {savedPlace?.name || savedPlan.custom_accommodation_name || 'Saved accommodation'}
                </h3>
                {savedPlace && <p className="text-sm text-foreground-500">{[savedPlace.city, savedPlace.country].filter(Boolean).join(', ')}</p>}
                {(savedPlan.check_in_date || savedPlan.check_out_date) && (
                  <div className="flex flex-wrap gap-4 mt-3">
                    {savedPlan.check_in_date && (
                      <div>
                        <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Check-in</p>
                        <p className="text-sm text-foreground-700">
                          {new Date(savedPlan.check_in_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {savedPlan.check_out_date && (
                      <div>
                        <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Check-out</p>
                        <p className="text-sm text-foreground-700">
                          {new Date(savedPlan.check_out_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-4">
                  {savedPlace && (
                    <Link
                      to={`${basePath}/travel/accommodation/${savedPlace.id}`}
                      className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                    >
                      View details <i className="ri-arrow-right-line text-[10px]" />
                    </Link>
                  )}
                  <Link
                    to={`${basePath}/travel/saved`}
                    className="inline-flex items-center gap-1 text-xs font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-edit-line text-[10px]" /> Manage
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Recommended Accommodation ── */}
      <section>
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-hotel-line text-foreground-400" />
          Recommended by the Couple
        </h2>

        {accommodationPlaces.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
              <i className="ri-hotel-line text-2xl" />
            </div>
            <h3 className="font-label text-base font-semibold text-foreground-600 mb-2">No accommodation recommendations yet</h3>
            <p className="text-sm text-foreground-400 max-w-sm mx-auto">
              The couple haven't added any accommodation suggestions yet. Check back closer to the wedding date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accommodationPlaces.map((place) => (
              <Link
                key={place.id}
                to={`${basePath}/travel/accommodation/${place.id}`}
                className="bg-white rounded-lg border border-secondary-200/70 overflow-hidden hover:border-secondary-300/70 transition-colors group cursor-pointer"
              >
                <div className="h-48 bg-secondary-50 overflow-hidden">
                  {place.image_url ? (
                    <img src={place.image_url} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary-300">
                      <i className="ri-hotel-line text-4xl" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{place.name}</h3>
                  <p className="text-[11px] text-foreground-500 mt-0.5 line-clamp-1">
                    {[place.city, place.country].filter(Boolean).join(', ')}
                  </p>
                  {place.couple_note && (
                    <p className="text-[11px] text-primary-600 mt-2 italic line-clamp-1">
                      <i className="ri-heart-fill text-[10px] mr-1" />{place.couple_note}
                    </p>
                  )}
                  {place.distance_from_venue && (
                    <p className="text-[10px] text-foreground-400 mt-2">
                      <i className="ri-road-map-line mr-0.5" />{place.distance_from_venue.toFixed(1)} miles from venue
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-secondary-100">
                    {place.provider_rating && (
                      <span className="flex items-center gap-1 text-[11px] text-foreground-600">
                        <i className="ri-star-fill text-amber-500 text-[10px]" /> {place.provider_rating}
                      </span>
                    )}
                    {place.price_level && (
                      <span className="text-[11px] text-foreground-400">{place.price_level}</span>
                    )}
                    <div className="flex-1" />
                    <span className="text-[10px] text-foreground-400 italic">Check availability</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Booking Note ── */}
      {accommodationPlaces.length > 0 && (
        <div className="bg-secondary-50 rounded-lg p-4 mt-8 text-center">
          <p className="text-xs text-foreground-500">
            Check current price and availability with the accommodation provider.
            {wedding?.wedding_date && (
              <span className="ml-1">We recommend booking early for the best rates before {new Date(wedding.wedding_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}