import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';

const TRANSPORT_OPTIONS = [
  { icon: 'ri-car-line', title: 'By Car', detail: 'Major motorways provide easy access to all venues. On-site and nearby parking is available at each location.' },
  { icon: 'ri-train-line', title: 'By Train', detail: 'Direct services from major cities run to the nearest station. Local taxis are available for the short journey to the venues.' },
  { icon: 'ri-flight-takeoff-line', title: 'By Air', detail: 'The nearest airports are within reasonable distance. We recommend booking flights early for the best fares and arranging ground transport in advance.' },
  { icon: 'ri-bus-line', title: 'Coach &amp; Shuttle', detail: 'Coach services connect from major cities. Shuttle information will be confirmed closer to the wedding date — check back for updates.' },
  { icon: 'ri-taxi-line', title: 'Taxi &amp; Ride Share', detail: 'Local taxi firms and ride-share services operate throughout the area. Pre-booking is strongly recommended for wedding-day journeys.' },
  { icon: 'ri-walk-line', title: 'Walking', detail: 'The main venues are within walking distance of each other and the town centre. Comfortable footwear is recommended for exploring the local area.' },
];

export default function GuestGettingTherePage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error } = useGuestPortal();

  const wedding = data?.wedding;
  const settings = data?.portal_settings;
  const venues = data?.weddingVenues || [];
  const shuttles = data?.shuttles || [];
  const travelUpdates = data?.travelUpdates || [];

  const transportUpdates = useMemo(
    () => travelUpdates.filter((u) => ['travel', 'transport', 'venue'].includes(u.category || '')),
    [travelUpdates],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading transport information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">{error || 'Could not load transport information.'}</p>
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
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Getting There</h1>
          <p className="text-sm text-foreground-500">How to reach {wedding?.partner_one_name} &amp; {wedding?.partner_two_name}&rsquo;s wedding.</p>
        </div>
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs" /> Back
        </Link>
      </div>

      {/* ── Transport Updates ── */}
      {transportUpdates.length > 0 && (
        <section className="mb-8">
          {transportUpdates.map((u) => (
            <div key={u.id} className="bg-white rounded-lg border border-accent-200/70 p-4 mb-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 flex-shrink-0">
                  <i className="ri-information-line text-sm" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">
                      {u.category} update
                    </span>
                    {u.is_important && (
                      <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label">Important</span>
                    )}
                  </div>
                  <p className="text-sm font-label font-semibold text-foreground-900">{u.title}</p>
                  {u.content && <p className="text-xs text-foreground-600 mt-1">{u.content}</p>}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Transport Methods ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-compass-line text-foreground-400" />
          Transport Options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TRANSPORT_OPTIONS.map((opt) => (
            <div key={opt.title} className="bg-white rounded-lg border border-secondary-200/70 p-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-400 mb-3">
                <i className={`${opt.icon} text-sm`} />
              </div>
              <h3 className="text-sm font-label font-semibold text-foreground-900 mb-1">{opt.title}</h3>
              <p className="text-[11px] text-foreground-500 leading-relaxed">{opt.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Venue Addresses ── */}
      {venues.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-building-line text-foreground-400" />
            Wedding Venues
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venues.map((v) => {
              const addr = [v.address_line_1, v.city, v.county_or_region, v.postcode, v.country].filter(Boolean).join(', ');
              return (
                <div key={v.id} className="bg-white rounded-lg border border-secondary-200/70 p-4">
                  <h3 className="text-sm font-label font-semibold text-foreground-900">{v.name}</h3>
                  {addr && <p className="text-[11px] text-foreground-500 mt-1">{addr}</p>}
                  {addr && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-secondary-100">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-direction-line text-[10px]" /> Get Directions
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(v.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-map-pin-line text-[10px]" /> View on Map
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Parking ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-parking-box-line text-foreground-400" />
          Parking &amp; Drop-off
        </h2>
        <div className="bg-white rounded-lg border border-secondary-200/70 p-5">
          {wedding?.parking_notes ? (
            <p className="text-sm text-foreground-600 leading-relaxed">{wedding.parking_notes}</p>
          ) : (
            <p className="text-sm text-foreground-400 italic">
              Parking details will be confirmed closer to the wedding date. If you have any specific parking requirements, please let the couple know through your RSVP.
            </p>
          )}
        </div>
      </section>

      {/* ── Shuttles ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-bus-line text-foreground-400" />
          Wedding Shuttles
        </h2>
        {shuttles.length === 0 ? (
          <div className="bg-white rounded-lg border border-secondary-200/70 p-5">
            <p className="text-sm text-foreground-400 italic">
              Shuttle information will be confirmed closer to the wedding date. The couple are working on transport arrangements for their guests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shuttles.map((s) => (
              <div key={s.id} className="bg-white rounded-lg border border-secondary-200/70 p-4">
                <h3 className="text-sm font-label font-semibold text-foreground-900">{s.name}</h3>
                {s.guest_description && <p className="text-xs text-foreground-600 mt-1">{s.guest_description}</p>}
                <div className="flex flex-wrap gap-4 mt-3">
                  {s.departure_at && (
                    <div>
                      <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Departure</p>
                      <p className="text-xs text-foreground-700">
                        {new Date(s.departure_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  {s.return_at && (
                    <div>
                      <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Return</p>
                      <p className="text-xs text-foreground-700">
                        {new Date(s.return_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  {s.capacity && (
                    <div>
                      <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Capacity</p>
                      <p className="text-xs text-foreground-700">{s.capacity} seats</p>
                    </div>
                  )}
                </div>
                {s.booking_required && (
                  <p className="text-[11px] text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2">
                    <i className="ri-information-line mr-1 text-xs" />Booking required — reserve your seat through the shuttle provider.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Accessibility ── */}
      {wedding?.accessibility_notes && (
        <section className="mb-8">
          <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-wheelchair-line text-foreground-400" />
            Accessibility
          </h2>
          <div className="bg-white rounded-lg border border-secondary-200/70 p-5">
            <p className="text-sm text-foreground-600 leading-relaxed">{wedding.accessibility_notes}</p>
          </div>
        </section>
      )}
    </div>
  );
}