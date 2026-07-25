import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { WeddingEvent, GuestUpdate } from '@/types/access';
import { getEventIcon } from '@/pages/guest/[accessId]/itinerary/components/EventDrawer';
import { generateICSFile, generateGoogleCalendarUrl } from '@/pages/guest/[accessId]/itinerary/utils/calendar';

function formatFullDate(startAt?: string, endAt?: string): string {
  if (!startAt) return '';
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const dateStr = new Date(startAt).toLocaleDateString('en-GB', dateOpts);
  const startTime = new Date(startAt).toLocaleTimeString('en-GB', timeOpts);
  if (endAt) {
    const endTime = new Date(endAt).toLocaleTimeString('en-GB', timeOpts);
    const endDate = new Date(endAt).toLocaleDateString('en-GB', dateOpts);
    if (endDate !== dateStr) return `${dateStr}, ${startTime} – ${endDate}, ${endTime}`;
    return `${dateStr}, ${startTime} – ${endTime}`;
  }
  return `${dateStr}, ${startTime}`;
}

function buildVenueAddress(venue: WeddingEvent['venue']): string {
  if (!venue) return '';
  return [venue.name, venue.address_line_1, venue.city, venue.county_or_region, venue.postcode, venue.country]
    .filter(Boolean)
    .join(', ');
}

function getUpdateBadge(update: GuestUpdate): { label: string; icon: string; className: string } {
  const cat = update.category;
  if (cat === 'schedule') return { label: 'Time changed', icon: 'ri-time-line', className: 'bg-amber-100 text-amber-700' };
  if (cat === 'venue') return { label: 'Venue changed', icon: 'ri-map-pin-line', className: 'bg-rose-100 text-rose-700' };
  if (cat === 'transport') return { label: 'Transport update', icon: 'ri-car-line', className: 'bg-blue-100 text-blue-700' };
  if (cat === 'emergency') return { label: 'Important', icon: 'ri-alert-line', className: 'bg-red-100 text-red-700' };
  return { label: 'Update', icon: 'ri-notification-3-line', className: 'bg-secondary-100 text-secondary-700' };
}

export default function GuestEventDetailPage() {
  const { accessId, eventId } = useParams<{ accessId: string; eventId: string }>();
  const { data, loading, error } = useGuestPortal();

  const basePath = `/guest/${accessId}`;

  const event = useMemo(() => {
    if (!data?.events) return null;
    return data.events.find((e) => e.id === eventId) || null;
  }, [data, eventId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-red-600 mb-4">{error || 'Could not load event details.'}</p>
        <Link to={`${basePath}/itinerary`} className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line mr-1" />Back to itinerary
        </Link>
      </div>
    );
  }

  // ── Not found ──
  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-calendar-2-line text-2xl" />
        </div>
        <h2 className="font-heading text-lg text-foreground-900 mb-2">Event not found</h2>
        <p className="text-sm text-foreground-500 mb-4">This event may have been removed or you may not have access to it.</p>
        <Link to={`${basePath}/itinerary`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to itinerary
        </Link>
      </div>
    );
  }

  // ── Cancelled event ──
  const isCancelled = event.status === 'cancelled';
  const coupleNames = `${data.wedding.partner_one_name} & ${data.wedding.partner_two_name}`;
  const venueAddress = buildVenueAddress(event.venue);
  const linkedUpdates = event.linked_updates || [];
  const description = event.guest_description || event.description;

  const handleDownloadICS = () => {
    const blob = generateICSFile([event], coupleNames);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event, coupleNames);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Back link */}
      <Link to={`${basePath}/itinerary`} className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-6">
        <i className="ri-arrow-left-line" /> Back to itinerary
      </Link>

      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${isCancelled ? 'bg-foreground-100 text-foreground-400' : 'bg-primary-100 text-primary-500'} flex-shrink-0`}>
            <i className={`${getEventIcon(event.event_type)} text-base`} />
          </div>
          <div>
            <h1 className={`font-heading text-2xl md:text-3xl ${isCancelled ? 'text-foreground-400 line-through' : 'text-foreground-900'}`}>
              {event.name}
            </h1>
            {isCancelled && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-foreground-100 text-foreground-500 text-xs font-label">
                <i className="ri-close-circle-line" /> Cancelled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cancelled message */}
      {isCancelled && (
        <div className="bg-foreground-50 border border-foreground-200 rounded-xl p-5 mb-8">
          <p className="text-sm text-foreground-600">
            The couple have let us know that this event will no longer take place. If you have any questions, please check the latest updates or contact the wedding team.
          </p>
          {linkedUpdates.length > 0 && linkedUpdates.some((u) => u.category === 'emergency' || u.category === 'schedule') && (
            <div className="mt-3">
              <Link to={`${basePath}/updates`} className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
                <i className="ri-notification-3-line" /> View related update
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column — main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date & time */}
          <section>
            <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Date &amp; time</dt>
            <dd className="text-sm text-foreground-900 font-label">{formatFullDate(event.start_at, event.end_at)}</dd>
            {event.arrival_offset_minutes != null && event.arrival_offset_minutes > 0 && (
              <dd className="text-xs text-foreground-500 mt-1">
                <i className="ri-time-line mr-1 text-foreground-400" />
                Please arrive {event.arrival_offset_minutes} minutes before the start time
              </dd>
            )}
          </section>

          {/* Description */}
          {description && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">About this event</dt>
              <dd className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line">{description}</dd>
            </section>
          )}

          {/* Dress code */}
          {event.dress_code && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Dress code</dt>
              <dd className="text-sm text-foreground-700 flex items-center gap-2">
                <i className="ri-t-shirt-line text-foreground-400" />{event.dress_code}
              </dd>
            </section>
          )}

          {/* Arrival guidance */}
          {event.arrival_notes && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Arrival</dt>
              <dd className="text-sm text-foreground-700">{event.arrival_notes}</dd>
            </section>
          )}

          {/* Parking */}
          {event.parking_notes && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Parking</dt>
              <dd className="text-sm text-foreground-700 flex items-start gap-2">
                <i className="ri-parking-box-line text-foreground-400 mt-0.5" />{event.parking_notes}
              </dd>
            </section>
          )}

          {/* Transport */}
          {event.transport_notes && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Transport</dt>
              <dd className="text-sm text-foreground-700 flex items-start gap-2">
                <i className="ri-bus-line text-foreground-400 mt-0.5" />{event.transport_notes}
              </dd>
            </section>
          )}

          {/* Accessibility */}
          {event.accessibility_notes && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Accessibility</dt>
              <dd className="text-sm text-foreground-700 flex items-start gap-2">
                <i className="ri-wheelchair-line text-foreground-400 mt-0.5" />{event.accessibility_notes}
              </dd>
            </section>
          )}

          {/* Children */}
          {event.children_notes && (
            <section>
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-2">Children</dt>
              <dd className="text-sm text-foreground-700 flex items-start gap-2">
                <i className="ri-user-heart-line text-foreground-400 mt-0.5" />{event.children_notes}
              </dd>
            </section>
          )}

          {/* Visibility note */}
          {event.visibility !== 'public' && (
            <div className="flex items-center gap-2 text-xs text-foreground-400 border-t border-secondary-100 pt-4">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 flex-shrink-0">
                <i className="ri-eye-line text-[10px]" />
              </div>
              <span>
                {event.visibility === 'included_guests' && 'This event is visible to invited guests only.'}
                {event.visibility === 'invitation_holders' && 'This event is visible to invitation holders.'}
                {event.visibility === 'reveal_on_date' && 'This event is on a scheduled reveal.'}
              </span>
            </div>
          )}
        </div>

        {/* Right column — venue, map, calendar, updates */}
        <div className="space-y-6">
          {/* Venue card */}
          {event.venue && (
            <div className="bg-background-50 rounded-xl p-5 border border-secondary-100">
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-3">Venue</dt>
              <dd>
                <p className="text-sm font-label font-semibold text-foreground-900 mb-1">{event.venue.name}</p>
                {venueAddress && (
                  <p className="text-xs text-foreground-500 mb-3">{venueAddress}</p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-map-pin-line" /> Get directions
                </a>
              </dd>
            </div>
          )}

          {/* Map card with directions */}
          {event.venue && (
            <div className="bg-background-50 rounded-xl border border-secondary-100 overflow-hidden">
              <div className="w-full h-36 bg-gradient-to-br from-secondary-100 to-secondary-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-white/70 text-primary-500 mb-2">
                    <i className="ri-map-pin-2-line text-xl" />
                  </div>
                  <p className="text-xs text-foreground-500">{event.venue.city || event.venue.county_or_region || 'Venue location'}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-foreground-500 mb-2">Get turn-by-turn directions to the venue.</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-external-link-line" /> Open in Google Maps
                </a>
              </div>
            </div>
          )}

          {/* Venue privacy notice */}
          {!event.venue && event.visibility === 'reveal_on_date' && event.reveal_at && new Date(event.reveal_at) > new Date() && (
            <div className="bg-secondary-50 rounded-xl p-5 border border-secondary-200">
              <p className="text-sm text-foreground-600 italic">
                Location details will be shared closer to the wedding.
              </p>
              <p className="text-xs text-foreground-400 mt-1">
                Reveals {new Date(event.reveal_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Calendar actions */}
          {!isCancelled && (
            <div className="bg-background-50 rounded-xl p-5 border border-secondary-100">
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-3">Add to calendar</dt>
              <dd className="space-y-2">
                <button
                  onClick={handleGoogleCalendar}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-google-line text-primary-500" /> Google Calendar
                </button>
                <button
                  onClick={handleDownloadICS}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-download-line text-primary-500" /> Download .ics file
                </button>
              </dd>
            </div>
          )}

          {/* View my seating */}
          {data.seating?.table && !data.seating.is_before_reveal && !data.seating.is_emergency_disabled && (
            <div className="bg-background-50 rounded-xl p-5 border border-secondary-100">
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-3">Seating</dt>
              <dd>
                <p className="text-sm font-label font-semibold text-foreground-900 mb-1">
                  {data.seating.table.table_number ? `Table ${data.seating.table.table_number}` : data.seating.table.name}
                </p>
                {data.seating.seat?.seat_label && (
                  <p className="text-xs text-foreground-500 mb-3">Seat: {data.seating.seat.seat_label}</p>
                )}
                <Link
                  to={`${basePath}/seating`}
                  className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-user-location-line" /> View my seating
                </Link>
              </dd>
            </div>
          )}

          {/* Linked updates */}
          {linkedUpdates.length > 0 && (
            <div className="bg-background-50 rounded-xl p-5 border border-secondary-100">
              <dt className="text-xs text-foreground-500 font-label uppercase tracking-wide mb-3">
                Recent changes
              </dt>
              <dd className="space-y-3">
                {linkedUpdates.slice(0, 3).map((update) => {
                  const badge = getUpdateBadge(update);
                  return (
                    <div key={update.id} className="flex items-start gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label flex-shrink-0 ${badge.className}`}>
                        <i className={`${badge.icon} text-[10px]`} />{badge.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-label font-medium text-foreground-800">{update.title}</p>
                        {update.content && (
                          <p className="text-[11px] text-foreground-500 line-clamp-2 mt-0.5">{update.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {linkedUpdates.length > 3 && (
                  <Link to={`${basePath}/updates`} className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
                    View all {linkedUpdates.length} updates <i className="ri-arrow-right-line text-[10px]" />
                  </Link>
                )}
              </dd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}