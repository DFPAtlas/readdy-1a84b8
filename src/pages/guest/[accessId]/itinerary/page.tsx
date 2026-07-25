import { useState, useMemo } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { WeddingEvent, GuestUpdate } from '@/types/access';
import { Link } from 'react-router-dom';
import EventDrawer, { getEventIcon } from './components/EventDrawer';
import { downloadAllEventsICS, generateICSFile, generateGoogleCalendarUrl } from './utils/calendar';

type FilterView = 'all' | 'today' | 'upcoming' | 'past';

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function isCurrent(startAt?: string, endAt?: string): boolean {
  if (!startAt) return false;
  const now = new Date();
  const start = new Date(startAt);
  if (now < start) return false;
  if (endAt) {
    const end = new Date(endAt);
    return now < end;
  }
  const softEnd = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now < softEnd;
}

function formatEventTime(startAt?: string, endAt?: string): string {
  if (!startAt) return '';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const start = new Date(startAt).toLocaleTimeString('en-GB', opts);
  if (endAt) {
    const end = new Date(endAt).toLocaleTimeString('en-GB', opts);
    return `${start} – ${end}`;
  }
  return start;
}

function formatEventDate(startAt?: string): string {
  if (!startAt) return '';
  return new Date(startAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getEventStatusBadge(
  evt: WeddingEvent,
  isCurrentEvt: boolean,
  isNextEvt: boolean,
): { label: string; className: string } | null {
  if (evt.status === 'cancelled') {
    return { label: 'Cancelled', className: 'bg-foreground-100 text-foreground-500' };
  }
  if (isCurrentEvt) {
    return { label: 'Happening now', className: 'bg-primary-500 text-white' };
  }
  if (isNextEvt) {
    return { label: 'Next', className: 'bg-primary-100 text-primary-600' };
  }
  const revealAt = evt.reveal_at;
  if (evt.visibility === 'reveal_on_date' && revealAt && new Date(revealAt) > new Date()) {
    return {
      label: `Reveals ${new Date(revealAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      className: 'bg-amber-100 text-amber-600',
    };
  }
  return null;
}

function getUpdateBadges(updates?: GuestUpdate[]): { label: string; icon: string; className: string }[] {
  if (!updates || updates.length === 0) return [];
  return updates.slice(0, 2).map((u) => {
    if (u.category === 'schedule') return { label: 'Time changed', icon: 'ri-time-line', className: 'bg-amber-100 text-amber-700' };
    if (u.category === 'venue') return { label: 'Venue changed', icon: 'ri-map-pin-line', className: 'bg-rose-100 text-rose-700' };
    if (u.category === 'transport') return { label: 'Transport update', icon: 'ri-car-line', className: 'bg-blue-100 text-blue-700' };
    if (u.category === 'emergency') return { label: 'Important', icon: 'ri-alert-line', className: 'bg-red-100 text-red-700' };
    return { label: 'Update', icon: 'ri-notification-3-line', className: 'bg-secondary-100 text-secondary-700' };
  });
}

export default function GuestItineraryPage() {
  const { data, loading, error } = useGuestPortal();
  const [activeFilter, setActiveFilter] = useState<FilterView>('all');
  const [selectedEvent, setSelectedEvent] = useState<WeddingEvent | null>(null);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);

  const allEvents = data?.events || [];
  const wedding = data?.wedding;
  const settings = data?.portal_settings;

  const basePath = `/guest/${data?.wedding?.id ? new URLSearchParams(window.location.pathname.split('/').filter(Boolean).join('/')).toString().split('/')[1] : ''}`;

  // Sort chronologically
  const sorted = useMemo(() => {
    return [...allEvents].sort((a, b) => {
      if (!a.start_at && !b.start_at) return 0;
      if (!a.start_at) return 1;
      if (!b.start_at) return -1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
  }, [allEvents]);

  // Filter
  const filteredEvents = useMemo(() => {
    switch (activeFilter) {
      case 'today':
        return sorted.filter((e) => e.start_at && isToday(e.start_at));
      case 'upcoming':
        return sorted.filter((e) => e.start_at && !isPast(e.start_at) && !isToday(e.start_at));
      case 'past':
        return sorted.filter((e) => e.start_at && isPast(e.start_at));
      default:
        return sorted;
    }
  }, [sorted, activeFilter]);

  // Find current event
  const currentEvent = useMemo(() => {
    return sorted.find((e) => isCurrent(e.start_at, e.end_at)) || null;
  }, [sorted]);

  // Find next upcoming event
  const nextEvent = useMemo(() => {
    if (currentEvent) return null;
    const now = new Date();
    return sorted.find((e) => e.start_at && new Date(e.start_at) > now) || null;
  }, [sorted, currentEvent]);

  // All events in past?
  const allPast = useMemo(() => {
    if (sorted.length === 0) return false;
    return sorted.every((e) => e.start_at && isPast(e.start_at));
  }, [sorted]);

  const closeDropdown = () => {
    setTimeout(() => setCalendarDropdownOpen(false), 150);
  };

  // Timezone display
  const timezone = (wedding as Record<string, unknown>).timezone as string | undefined;
  const timezoneLabel = timezone || 'Europe/London';

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
        <p className="text-sm text-red-600">{error || 'Could not load the itinerary.'}</p>
      </div>
    );
  }

  const coupleNames = `${wedding.partner_one_name} & ${wedding.partner_two_name}`;

  const filterTabs: { key: FilterView; label: string }[] = [
    { key: 'all', label: 'Full weekend' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];

  const handleGoogleAll = () => {
    if (filteredEvents.length === 0) return;
    const url = generateGoogleCalendarUrl(filteredEvents[0], coupleNames);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadICS = (singleEvent: WeddingEvent) => {
    const blob = generateICSFile([singleEvent], coupleNames);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${singleEvent.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGoogleSingle = (singleEvent: WeddingEvent) => {
    const url = generateGoogleCalendarUrl(singleEvent, coupleNames);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Build basePath properly
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const guestIndex = pathSegments.indexOf('guest');
  const accessIdFromPath = guestIndex >= 0 ? pathSegments[guestIndex + 1] : '';
  const basePathComputed = `/guest/${accessIdFromPath}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 print-itinerary">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Wedding itinerary</h1>
            <p className="text-sm text-foreground-500">Everything you need to know about the celebration, in the order it happens.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {sorted.length > 0 && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 bg-white text-xs text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap print:hidden"
              >
                <i className="ri-printer-line" /> Print itinerary
              </button>
            )}
            <Link
              to={basePathComputed}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 bg-white text-xs text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap print:hidden"
            >
              <i className="ri-arrow-left-line" /> Dashboard
            </Link>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-400">
          <span className="flex items-center gap-1">
            <i className="ri-user-line" /> Your personal itinerary
          </span>
          <span className="flex items-center gap-1">
            <i className="ri-calendar-check-line" /> {sorted.length} event{sorted.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <i className="ri-global-line" /> {timezoneLabel}
          </span>
          {wedding.wedding_date && (
            <span className="flex items-center gap-1">
              <i className="ri-heart-line text-primary-400" />
              {new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Next event summary ── */}
      {(currentEvent || nextEvent) && !allPast && (
        <div className="bg-white border border-primary-200 rounded-xl p-5 mb-8 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-100 text-primary-500 flex-shrink-0">
              <i className={`${currentEvent ? 'ri-play-circle-line' : 'ri-arrow-right-circle-line'} text-lg`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-foreground-400 font-label uppercase tracking-wide mb-0.5">
                {currentEvent ? 'Happening now' : 'Next event'}
              </p>
              <p className="text-sm font-label font-semibold text-foreground-900">{currentEvent?.name || nextEvent?.name}</p>
              {(currentEvent || nextEvent)?.start_at && (
                <p className="text-xs text-foreground-500 mt-0.5">
                  {formatEventDate((currentEvent || nextEvent)!.start_at)} · {formatEventTime((currentEvent || nextEvent)!.start_at, (currentEvent || nextEvent)!.end_at)}
                </p>
              )}
              {(currentEvent || nextEvent)?.venue?.name && (
                <p className="text-xs text-foreground-400 mt-0.5 flex items-center gap-1">
                  <i className="ri-map-pin-line text-[10px]" /> {(currentEvent || nextEvent)!.venue!.name}
                </p>
              )}
            </div>
            <Link
              to={`${basePathComputed}/itinerary/${(currentEvent || nextEvent)!.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              View details <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {sorted.length === 0 && (
        <div className="text-center py-16 bg-white border border-secondary-100 rounded-2xl">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-400 mb-4">
            <i className="ri-calendar-event-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Itinerary not yet available</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto">
            The couple are still finalising the schedule. Check back closer to the wedding date for event timings, venue details and more.
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          {/* Calendar action bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8 print:hidden">
            <div className="flex items-center bg-background-50 rounded-full p-1 border border-secondary-200/70">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.key
                      ? 'bg-white text-foreground-900 font-medium shadow-sm'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
                onBlur={closeDropdown}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-white text-sm text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-event-line" /> Add all to calendar
              </button>
              {calendarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-secondary-200 rounded-lg shadow-sm z-20 py-1">
                  <button
                    onMouseDown={handleGoogleAll}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-google-line text-primary-500" /> Google Calendar
                  </button>
                  <button
                    onMouseDown={() => downloadAllEventsICS(filteredEvents, coupleNames)}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-download-line text-primary-500" /> Download .ics
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter empty states */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-12 bg-white border border-secondary-100 rounded-2xl">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
                <i className="ri-calendar-2-line text-xl" />
              </div>
              <p className="text-sm text-foreground-500">
                {activeFilter === 'today' && 'No events scheduled for today.'}
                {activeFilter === 'upcoming' && 'No upcoming events to show.'}
                {activeFilter === 'past' && 'No past events to show.'}
              </p>
            </div>
          )}

          {/* Timeline */}
          {filteredEvents.length > 0 && (
            <div className="relative">
              <div className="absolute left-[23px] top-2 bottom-2 w-px bg-primary-200 print:bg-foreground-300" aria-hidden="true" />

              <div className="space-y-6">
                {filteredEvents.map((evt) => {
                  const isCancelled = evt.status === 'cancelled';
                  const isCurrentEvt = evt.id === currentEvent?.id;
                  const isNextEvt = evt.id === nextEvent?.id;
                  const highlight = !isCancelled && (isCurrentEvt || isNextEvt);
                  const updateBadges = getUpdateBadges(evt.linked_updates);
                  const statusBadge = getEventStatusBadge(evt, isCurrentEvt, isNextEvt);

                  return (
                    <div key={evt.id} className="relative pl-14">
                      {/* Timeline marker */}
                      <div
                        className={`absolute left-[14px] top-1 w-[19px] h-[19px] flex items-center justify-center rounded-full border-2 transition-colors ${
                          isCancelled
                            ? 'border-foreground-300 bg-white'
                            : isCurrentEvt
                            ? 'border-primary-500 bg-primary-500 ring-4 ring-primary-100'
                            : isNextEvt
                            ? 'border-primary-400 bg-primary-400 ring-4 ring-primary-50'
                            : 'border-primary-300 bg-white'
                        }`}
                      >
                        {isCurrentEvt && (
                          <i className="ri-play-fill text-[10px] text-white" />
                        )}
                        {isNextEvt && !isCurrentEvt && (
                          <i className="ri-arrow-right-s-line text-[10px] text-white" />
                        )}
                      </div>

                      {/* Event card */}
                      <Link
                        to={`${basePathComputed}/itinerary/${evt.id}`}
                        className={`group block rounded-xl border transition-colors cursor-pointer overflow-hidden ${
                          isCancelled
                            ? 'border-foreground-200 bg-foreground-50/30 opacity-75'
                            : highlight
                            ? 'border-primary-300 bg-primary-50/50 hover:bg-primary-50'
                            : 'border-secondary-200 bg-white hover:bg-background-50'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                              className={`w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0 ${
                                isCancelled
                                  ? 'bg-foreground-100 text-foreground-400'
                                  : highlight
                                  ? 'bg-primary-100 text-primary-600'
                                  : 'bg-background-50 text-foreground-500'
                              }`}
                            >
                              <i className={`${getEventIcon(evt.event_type)} text-sm`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`font-label text-sm font-semibold ${isCancelled ? 'text-foreground-400 line-through' : highlight ? 'text-primary-700' : 'text-foreground-900'}`}>
                                      {evt.name}
                                    </h3>
                                    {statusBadge && (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium whitespace-nowrap ${statusBadge.className}`}>
                                        {statusBadge.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-foreground-500 mt-1">
                                    {formatEventDate(evt.start_at)} · {formatEventTime(evt.start_at, evt.end_at)}
                                  </p>
                                  {evt.venue?.name && (
                                    <p className="text-xs text-foreground-400 mt-0.5 flex items-center gap-1">
                                      <i className="ri-map-pin-line text-[10px]" /> {evt.venue.name}
                                    </p>
                                  )}
                                  {/* Update badges */}
                                  {updateBadges.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {updateBadges.map((badge, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label ${badge.className}`}>
                                          <i className={`${badge.icon} text-[10px]`} />{badge.label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Arrow indicator */}
                                <div className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-300 group-hover:text-foreground-500 flex-shrink-0 print:hidden">
                                  <i className="ri-arrow-right-s-line text-lg" />
                                </div>
                              </div>

                              {/* Quick description snippet */}
                              {evt.description && !isCancelled && (
                                <p className="text-xs text-foreground-500 mt-2 line-clamp-1">
                                  {evt.description}
                                </p>
                              )}

                              {/* Quick calendar actions */}
                              {!isCancelled && (
                                <div className="flex gap-2 mt-3 print:hidden" onClick={(e) => e.preventDefault()}>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleGoogleSingle(evt);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-secondary-200 bg-white text-[11px] text-foreground-500 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <i className="ri-google-line text-primary-400" /> Add
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDownloadICS(evt);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-secondary-200 bg-white text-[11px] text-foreground-500 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <i className="ri-download-line text-primary-400" /> .ics
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Post-wedding completion */}
          {allPast && sorted.length > 0 && (
            <div className="mt-12 text-center print:hidden">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-50 text-accent-500 mb-4">
                <i className="ri-heart-2-line text-2xl" />
              </div>
              <h2 className="font-heading text-xl text-foreground-900 mb-2">What a beautiful celebration</h2>
              <p className="text-sm text-foreground-500 max-w-md mx-auto">
                All the events have now passed. Thank you for being part of {coupleNames}&rsquo;s special day. We hope you had a wonderful time.
              </p>
            </div>
          )}

          {/* Footer notes */}
          <div className="mt-12 pt-8 border-t border-secondary-100 print:hidden">
            <div className="flex flex-wrap gap-6 text-xs text-foreground-500">
              {wedding.dress_code && (
                <div className="flex items-start gap-2">
                  <i className="ri-t-shirt-line text-foreground-400 mt-0.5" />
                  <span><strong className="text-foreground-700 font-label">Dress code:</strong> {wedding.dress_code}</span>
                </div>
              )}
              {wedding.parking_notes && (
                <div className="flex items-start gap-2">
                  <i className="ri-car-line text-foreground-400 mt-0.5" />
                  <span><strong className="text-foreground-700 font-label">Parking:</strong> {wedding.parking_notes}</span>
                </div>
              )}
              {wedding.accessibility_notes && (
                <div className="flex items-start gap-2">
                  <i className="ri-wheelchair-line text-foreground-400 mt-0.5" />
                  <span><strong className="text-foreground-700 font-label">Accessibility:</strong> {wedding.accessibility_notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Print-specific footer */}
          <div className="hidden print:block mt-10 pt-6 border-t border-foreground-200">
            <p className="text-xs text-foreground-500 text-center">
              Guest copy — {coupleNames} · {formatDateFull(wedding.wedding_date)} · Generated {formatDateFull(new Date().toISOString())}
            </p>
          </div>
        </>
      )}

      {/* Event detail drawer (existing, kept for quick view) */}
      <EventDrawer
        event={selectedEvent}
        coupleNames={coupleNames}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}