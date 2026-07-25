import { useEffect, useRef } from 'react';
import type { WeddingEvent } from '@/types/access';
import { generateICSFile, generateGoogleCalendarUrl } from '../utils/calendar';

interface EventDrawerProps {
  event: WeddingEvent | null;
  coupleNames: string;
  onClose: () => void;
}

function formatDateRange(startAt?: string, endAt?: string): string {
  if (!startAt) return '';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = new Date(startAt).toLocaleDateString('en-GB', opts);
  const startTime = new Date(startAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (endAt) {
    const endTime = new Date(endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endDate = new Date(endAt).toLocaleDateString('en-GB', opts);
    if (endDate !== dateStr) {
      return `${dateStr}, ${startTime} – ${endDate}, ${endTime}`;
    }
    return `${dateStr}, ${startTime} – ${endTime}`;
  }
  return `${dateStr}, ${startTime}`;
}

function buildVenueAddress(venue: WeddingEvent['venue']): string {
  if (!venue) return '';
  return [venue.address_line_1, venue.city, venue.county_or_region, venue.postcode, venue.country]
    .filter(Boolean)
    .join(', ');
}

function getGoogleMapsUrl(venue: WeddingEvent['venue']): string {
  if (!venue) return '';
  const query = encodeURIComponent(buildVenueAddress(venue));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function EventDrawer({ event, coupleNames, onClose }: EventDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [event, onClose]);

  useEffect(() => {
    if (event && panelRef.current) panelRef.current.scrollTop = 0;
  }, [event]);

  if (!event) return null;

  const venueAddress = buildVenueAddress(event.venue);
  const mapsUrl = getGoogleMapsUrl(event.venue);

  const handleDownloadICS = (singleEvent?: WeddingEvent) => {
    const target = singleEvent || event;
    const blob = generateICSFile([target], coupleNames);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGoogleCalendar = (singleEvent?: WeddingEvent) => {
    const target = singleEvent || event;
    const url = generateGoogleCalendarUrl(target, coupleNames);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Event details: ${event.name}`}>
      <div ref={overlayRef} className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div
        ref={panelRef}
        className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-lg"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-secondary-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-100 text-rose-500 flex-shrink-0">
              <i className={`${getEventIcon(event.event_type)} text-sm`} />
            </div>
            <h2 className="font-heading text-lg text-foreground-900 truncate">{event.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer flex-shrink-0"
            aria-label="Close drawer"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Date & time */}
          <div>
            <dt className="text-xs text-foreground-500 font-label mb-1">Date &amp; time</dt>
            <dd className="text-sm text-foreground-900">{formatDateRange(event.start_at, event.end_at)}</dd>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <dt className="text-xs text-foreground-500 font-label mb-1">About this event</dt>
              <dd className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line">{event.description}</dd>
            </div>
          )}

          {/* Dress code */}
          {event.dress_code && (
            <div>
              <dt className="text-xs text-foreground-500 font-label mb-1">Dress code</dt>
              <dd className="text-sm text-foreground-700">{event.dress_code}</dd>
            </div>
          )}

          {/* Arrival notes */}
          {event.arrival_notes && (
            <div>
              <dt className="text-xs text-foreground-500 font-label mb-1">Arrival</dt>
              <dd className="text-sm text-foreground-700">{event.arrival_notes}</dd>
            </div>
          )}

          {/* Venue */}
          {event.venue && (
            <div>
              <dt className="text-xs text-foreground-500 font-label mb-2">Venue</dt>
              <dd>
                <div className="bg-background-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-label font-medium text-foreground-900">{event.venue.name}</p>
                  {venueAddress && (
                    <p className="text-xs text-foreground-500">{venueAddress}</p>
                  )}
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-label text-rose-600 hover:text-rose-700 cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-map-pin-line" /> Get directions
                    </a>
                  )}
                </div>
              </dd>
            </div>
          )}

          {/* Visibility badge */}
          {event.visibility !== 'public' && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 flex-shrink-0">
                <i className="ri-eye-line text-[10px]" />
              </div>
              <span className="text-xs text-foreground-500">
                {event.visibility === 'included_guests' && 'Visible to invited guests only'}
                {event.visibility === 'invitation_holders' && 'Visible to invitation holders'}
                {event.visibility === 'reveal_on_date' && 'Scheduled reveal'}
              </span>
            </div>
          )}

          {/* Calendar actions */}
          <div className="border-t border-secondary-100 pt-5">
            <dt className="text-xs text-foreground-500 font-label mb-3">Add to calendar</dt>
            <dd className="flex flex-wrap gap-2">
              <button
                onClick={() => handleGoogleCalendar()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-google-line text-rose-500" /> Google Calendar
              </button>
              <button
                onClick={() => handleDownloadICS()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-download-line text-rose-500" /> Download .ics
              </button>
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'ceremony': return 'ri-heart-2-line';
    case 'reception': return 'ri-cake-line';
    case 'evening': return 'ri-moon-line';
    case 'welcome': return 'ri-drinks-line';
    case 'day_after': return 'ri-cup-line';
    default: return 'ri-calendar-event-line';
  }
}