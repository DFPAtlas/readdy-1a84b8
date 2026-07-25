import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';

function formatDateGB(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function GuestTravelPage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error } = useGuestPortal();

  const wedding = data?.wedding;
  const settings = data?.portal_settings;
  const places = data?.localPlaces || [];
  const venues = data?.weddingVenues || [];
  const plans = data?.travelPlans || [];
  const travelUpdates = data?.travelUpdates || [];
  const shuttles = data?.shuttles || [];
  const firstRecipient = data?.recipients?.[0];

  const accommodationPlaces = useMemo(() => places.filter((p) => p.place_type === 'hotel' || p.place_type === 'accommodation'), [places]);
  const foodPlaces = useMemo(() => places.filter((p) => p.place_type === 'food_drink' || p.place_type === 'restaurant' || p.place_type === 'cafe' || p.place_type === 'pub'), [places]);
  const attractionPlaces = useMemo(() => places.filter((p) => p.place_type === 'attraction' || p.place_type === 'activity'), [places]);
  const essentialPlaces = useMemo(() => places.filter((p) => p.place_type === 'essential' || p.place_type === 'pharmacy' || p.place_type === 'hospital'), [places]);

  const savedAccommodation = useMemo(() => plans.find((p) => p.plan_type === 'accommodation'), [plans]);

  const latestTravelUpdate = useMemo(() => travelUpdates[0], [travelUpdates]);

  // Map centre
  const mapCentre = useMemo(() => {
    const withCoords = places.find((p) => p.latitude && p.longitude);
    if (withCoords && withCoords.latitude && withCoords.longitude) {
      return { lat: withCoords.latitude, lng: withCoords.longitude, name: withCoords.name };
    }
    if (venues.length > 0) return { name: venues[0].name };
    return null;
  }, [places, venues]);

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
          <p className="text-sm text-foreground-500">Loading travel information...</p>
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
        <p className="text-sm text-foreground-500">{error || 'Could not load travel information.'}</p>
      </div>
    );
  }

  if (!settings?.show_travel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-map-pin-line text-2xl" />
        </div>
        <h1 className="font-heading text-xl text-foreground-900 mb-2">Travel &amp; Stay</h1>
        <p className="text-sm text-foreground-500">Travel information is not yet available. Check back closer to the wedding date.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
      {/* ── Header ── */}
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">Travel &amp; Stay</h1>
        <p className="text-sm text-foreground-500 max-w-lg mx-auto leading-relaxed">
          Everything you need to plan your journey, choose where to stay and explore the local area.
        </p>
      </div>

      {/* ── Summary Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {/* Location */}
        <Link
          to={`${basePath}/travel/map`}
          className="bg-white rounded-lg border border-secondary-200/70 p-4 hover:border-secondary-300/70 transition-colors group cursor-pointer whitespace-nowrap"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 flex-shrink-0">
              <i className="ri-map-pin-2-line text-sm" />
            </div>
            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Location</span>
          </div>
          <p className="text-sm font-label font-medium text-foreground-900 line-clamp-1">
            {venues[0]?.name || 'Venue to be confirmed'}
          </p>
          {venues[0]?.city && <p className="text-[11px] text-foreground-500">{venues[0].city}{venues[0].county_or_region ? `, ${venues[0].county_or_region}` : ''}</p>}
          <span className="inline-flex items-center gap-1 text-[11px] font-label text-primary-600 mt-2 group-hover:text-primary-700 whitespace-nowrap">
            View map <i className="ri-arrow-right-line text-[10px]" />
          </span>
        </Link>

        {/* Accommodation */}
        <Link
          to={`${basePath}/travel/accommodation`}
          className="bg-white rounded-lg border border-secondary-200/70 p-4 hover:border-secondary-300/70 transition-colors group cursor-pointer whitespace-nowrap"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
              <i className="ri-hotel-line text-sm" />
            </div>
            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Accommodation</span>
          </div>
          {savedAccommodation ? (
            <>
              <p className="text-sm font-label font-medium text-foreground-900 line-clamp-1">
                {places.find((p) => p.id === savedAccommodation.place_id)?.name || savedAccommodation.custom_accommodation_name || 'Saved'}
              </p>
              {savedAccommodation.check_in_date && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  <i className="ri-check-line text-[10px]" /> Booked
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-label font-medium text-foreground-900">
                {accommodationPlaces.length > 0 ? `${accommodationPlaces.length} option${accommodationPlaces.length !== 1 ? 's' : ''}` : 'Explore stays'}
              </p>
              <p className="text-[11px] text-foreground-500">
                {accommodationPlaces.length > 0 ? 'Couple-recommended' : 'Find somewhere to stay'}
              </p>
            </>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-label text-primary-600 mt-2 group-hover:text-primary-700 whitespace-nowrap">
            {savedAccommodation ? 'View details' : 'Find accommodation'} <i className="ri-arrow-right-line text-[10px]" />
          </span>
        </Link>

        {/* Getting There */}
        <Link
          to={`${basePath}/travel/getting-there`}
          className="bg-white rounded-lg border border-secondary-200/70 p-4 hover:border-secondary-300/70 transition-colors group cursor-pointer whitespace-nowrap"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-600 flex-shrink-0">
              <i className="ri-compass-line text-sm" />
            </div>
            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Getting There</span>
          </div>
          <p className="text-sm font-label font-medium text-foreground-900">
            Plan your journey
          </p>
          <p className="text-[11px] text-foreground-500">
            Car, train, air &amp; local transport
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-label text-primary-600 mt-2 group-hover:text-primary-700 whitespace-nowrap">
            View guide <i className="ri-arrow-right-line text-[10px]" />
          </span>
        </Link>

        {/* Shuttle / Parking */}
        <Link
          to={`${basePath}/travel/getting-there`}
          className="bg-white rounded-lg border border-secondary-200/70 p-4 hover:border-secondary-300/70 transition-colors group cursor-pointer whitespace-nowrap"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 flex-shrink-0">
              <i className="ri-bus-line text-sm" />
            </div>
            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Shuttle &amp; Parking</span>
          </div>
          <p className="text-sm font-label font-medium text-foreground-900">
            {shuttles.length > 0 ? `${shuttles.length} shuttle${shuttles.length !== 1 ? 's' : ''} available` : 'Shuttle TBC'}
          </p>
          <p className="text-[11px] text-foreground-500">
            {wedding?.parking_notes ? 'Parking available' : 'Parking details TBC'}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-label text-primary-600 mt-2 group-hover:text-primary-700 whitespace-nowrap">
            View details <i className="ri-arrow-right-line text-[10px]" />
          </span>
        </Link>
      </div>

      {/* ── Map Preview ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl text-foreground-900 flex items-center gap-2">
            <i className="ri-map-2-line text-foreground-400 text-lg" />
            Wedding Map
          </h2>
          <Link to={`${basePath}/travel/map`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
            Interactive map <i className="ri-arrow-right-line text-[10px]" />
          </Link>
        </div>

        {mapEmbedUrl ? (
          <div className="rounded-xl overflow-hidden border border-secondary-200/70 h-[320px] md:h-[400px] bg-background-50">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Wedding location map"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-secondary-200/70 border-dashed h-[320px] md:h-[400px] bg-secondary-50/50 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
                <i className="ri-map-pin-2-line text-2xl" />
              </div>
              <h3 className="font-label text-sm font-semibold text-foreground-600 mb-1">Interactive mapping requires Google Maps configuration</h3>
              <p className="text-[11px] text-foreground-400 max-w-xs mx-auto">All venues, hotels and local places will appear here once the couple configures Google Maps.</p>
              {mapCentre && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(mapCentre.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-external-link-line" /> View on Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Accommodation Grid ── */}
      {accommodationPlaces.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-foreground-900 flex items-center gap-2">
              <i className="ri-hotel-line text-foreground-400 text-lg" />
              Places to Stay
            </h2>
            <Link to={`${basePath}/travel/accommodation`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
              View all <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accommodationPlaces.slice(0, 3).map((place) => (
              <Link
                key={place.id}
                to={`${basePath}/travel/accommodation/${place.id}`}
                className="bg-white rounded-lg border border-secondary-200/70 overflow-hidden hover:border-secondary-300/70 transition-colors group cursor-pointer"
              >
                <div className="h-40 bg-secondary-50 overflow-hidden">
                  {place.image_url ? (
                    <img src={place.image_url} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary-300">
                      <i className="ri-hotel-line text-3xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{place.name}</h3>
                  <p className="text-[11px] text-foreground-500 line-clamp-1">
                    {[place.city, place.country].filter(Boolean).join(', ')}
                  </p>
                  {place.couple_note && (
                    <p className="text-[11px] text-primary-600 mt-1 italic line-clamp-1">
                      <i className="ri-heart-fill text-[10px] mr-1" />{place.couple_note}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Food & Drink + Local Guide ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Food & Drink */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-foreground-900 flex items-center gap-2">
              <i className="ri-restaurant-line text-foreground-400" />
              Food &amp; Drink
            </h2>
            <Link to={`${basePath}/travel/local-guide`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
              More <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
          {foodPlaces.length === 0 ? (
            <div className="bg-white rounded-lg border border-secondary-200/70 p-6 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-secondary-50 flex items-center justify-center text-secondary-300 mb-2">
                <i className="ri-restaurant-line" />
              </div>
              <p className="text-xs text-foreground-400">The couple haven't added dining recommendations yet. Check back closer to the wedding date.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {foodPlaces.slice(0, 4).map((place) => (
                <div key={place.id} className="flex items-center gap-3 bg-white rounded-lg border border-secondary-200/70 p-3">
                  <div className="w-10 h-10 rounded-md bg-secondary-50 overflow-hidden flex-shrink-0">
                    {place.image_url ? (
                      <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary-300">
                        <i className="ri-restaurant-line text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-label font-medium text-foreground-800 truncate">{place.name}</p>
                    <p className="text-[10px] text-foreground-500 capitalize">{place.place_type.replace('_', ' ')}</p>
                  </div>
                  {place.provider_rating && (
                    <span className="text-[11px] font-medium text-foreground-600">
                      <i className="ri-star-fill text-amber-500 text-[10px]" /> {place.provider_rating}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Things To Do */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-foreground-900 flex items-center gap-2">
              <i className="ri-landscape-line text-foreground-400" />
              Things To Do
            </h2>
            <Link to={`${basePath}/travel/local-guide`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
              Explore <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
          {attractionPlaces.length === 0 ? (
            <div className="bg-white rounded-lg border border-secondary-200/70 p-6 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-secondary-50 flex items-center justify-center text-secondary-300 mb-2">
                <i className="ri-compass-3-line" />
              </div>
              <p className="text-xs text-foreground-400">Local attractions will appear once the couple adds recommendations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {attractionPlaces.slice(0, 4).map((place) => (
                <div key={place.id} className="bg-white rounded-lg border border-secondary-200/70 overflow-hidden group cursor-pointer">
                  <div className="h-24 bg-secondary-50 overflow-hidden">
                    {place.image_url ? (
                      <img src={place.image_url} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary-300">
                        <i className="ri-landscape-line text-xl" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-label font-medium text-foreground-800 line-clamp-1">{place.name}</p>
                    <p className="text-[10px] text-foreground-500 capitalize">{place.place_type.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Travel Update ── */}
      {latestTravelUpdate && (
        <section className="mb-10">
          <div className="bg-white rounded-lg border border-accent-200/70 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 flex-shrink-0">
                <i className="ri-information-line text-sm" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wide">
                    {latestTravelUpdate.category || 'Travel'} Update
                  </span>
                  {latestTravelUpdate.is_important && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label">Important</span>
                  )}
                </div>
                <p className="text-sm font-label font-semibold text-foreground-900">{latestTravelUpdate.title}</p>
                {latestTravelUpdate.content && (
                  <p className="text-xs text-foreground-600 line-clamp-2 mt-1">{latestTravelUpdate.content}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── My Saved Plans ── */}
      {plans.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-foreground-900 flex items-center gap-2">
              <i className="ri-heart-line text-foreground-400" />
              My Plans
            </h2>
            <Link to={`${basePath}/travel/saved`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
              Manage <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plans.slice(0, 4).map((plan) => {
              const place = places.find((p) => p.id === plan.place_id);
              return (
                <Link
                  key={plan.id}
                  to={`${basePath}/travel/saved`}
                  className="flex items-center gap-3 bg-white rounded-lg border border-secondary-200/70 p-3 hover:border-secondary-300/70 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-400 flex-shrink-0">
                    <i className={`${plan.plan_type === 'accommodation' ? 'ri-hotel-line' : plan.plan_type === 'transport' ? 'ri-train-line' : 'ri-sticky-note-line'} text-sm`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-label font-medium text-foreground-800 truncate">
                      {plan.custom_accommodation_name || place?.name || (plan.plan_type === 'accommodation' ? 'Accommodation' : plan.plan_type === 'transport' ? 'Transport' : 'Note')}
                    </p>
                    {plan.check_in_date && (
                      <p className="text-[10px] text-foreground-500">{formatDateShort(plan.check_in_date)}{plan.check_out_date ? ` — ${formatDateShort(plan.check_out_date)}` : ''}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Quick Links ── */}
      <section>
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-links-line text-foreground-400" />
          Quick Links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: `${basePath}/travel/map`, icon: 'ri-map-2-line', label: 'Wedding Map' },
            { href: `${basePath}/travel/accommodation`, icon: 'ri-hotel-line', label: 'Accommodation' },
            { href: `${basePath}/travel/getting-there`, icon: 'ri-compass-line', label: 'Getting There' },
            { href: `${basePath}/travel/local-guide`, icon: 'ri-store-2-line', label: 'Local Guide' },
            { href: `${basePath}/travel/saved`, icon: 'ri-bookmark-line', label: 'Saved Places' },
            { href: `${basePath}/dashboard`, icon: 'ri-arrow-left-line', label: 'Dashboard' },
          ].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center gap-2 bg-white rounded-lg border border-secondary-200/70 px-4 py-2.5 hover:border-secondary-300/70 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className={`${link.icon} text-foreground-400 text-sm`} />
              <span className="text-xs font-label text-foreground-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}