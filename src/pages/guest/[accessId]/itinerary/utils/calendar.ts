import type { WeddingEvent } from '@/types/access';

function toICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildVenueAddress(venue: WeddingEvent['venue']): string {
  if (!venue) return '';
  return [venue.name, venue.address_line_1, venue.city, venue.county_or_region, venue.postcode, venue.country]
    .filter(Boolean)
    .join(', ');
}

/**
 * Generate an ICS file for one or more events.
 * Venues are only included if they exist on the event — hidden venues
 * are filtered server-side before events reach the frontend.
 */
export function generateICSFile(events: WeddingEvent[], coupleNames: string): Blob {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vowora//Wedding Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const evt of events) {
    const dtStart = evt.start_at ? toICSDate(evt.start_at) : '';
    const dtEnd = evt.end_at ? toICSDate(evt.end_at) : dtStart;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${evt.id}@wedora`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(evt.name)}`);
    lines.push(`DESCRIPTION:${escapeICS(`${coupleNames}'s Wedding — ${evt.name}${evt.description ? '\\n\\n' + evt.description : ''}${evt.dress_code ? '\\n\\nDress code: ' + evt.dress_code : ''}${evt.arrival_notes ? '\\n\\nArrival: ' + evt.arrival_notes : ''}`)}`);

    const venueAddr = buildVenueAddress(evt.venue);
    if (venueAddr) {
      lines.push(`LOCATION:${escapeICS(venueAddr)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

/**
 * Generate a Google Calendar link for a single event.
 * Never includes venue data from events where the guest should not see it.
 */
export function generateGoogleCalendarUrl(event: WeddingEvent, coupleNames: string): string {
  const startStr = event.start_at
    ? new Date(event.start_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    : '';
  const endStr = event.end_at
    ? new Date(event.end_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    : startStr;

  const parts: string[] = [
    `text=${encodeURIComponent(`${coupleNames}'s Wedding — ${event.name}`)}`,
    `dates=${startStr}/${endStr}`,
  ];

  const descriptionParts: string[] = [];
  if (event.description) descriptionParts.push(event.description);
  if (event.dress_code) descriptionParts.push(`Dress code: ${event.dress_code}`);
  if (event.arrival_notes) descriptionParts.push(`Arrival: ${event.arrival_notes}`);
  if (descriptionParts.length > 0) {
    parts.push(`details=${encodeURIComponent(descriptionParts.join('\\n\\n'))}`);
  }

  const venueAddr = buildVenueAddress(event.venue);
  if (venueAddr) {
    parts.push(`location=${encodeURIComponent(venueAddr)}`);
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&${parts.join('&')}`;
}

/**
 * Download ICS for all visible events.
 */
export function downloadAllEventsICS(events: WeddingEvent[], coupleNames: string): void {
  const blob = generateICSFile(events, coupleNames);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wedding_itinerary.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}