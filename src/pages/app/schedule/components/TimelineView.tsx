import { useState } from 'react';
import type { WeddingEvent } from '@/hooks/useWeddingEvents';
import { getEventTypeIcon, getEventTypeLabel, getVisibilityLabel, getStatusLabel } from '@/hooks/useWeddingEvents';

interface TimelineViewProps {
  groupedEvents: { date: string; label: string; events: WeddingEvent[] }[];
  onEdit: (event: WeddingEvent) => void;
  onDuplicate: (eventId: string) => void;
  onPublish: (eventId: string) => void;
  onHide: (eventId: string) => void;
  onCancel: (eventId: string) => void;
  onArchive: (eventId: string) => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(startAt: string | null, endAt: string | null): string {
  if (!startAt) return 'Time TBC';
  const s = formatTime(startAt);
  if (!endAt) return s;
  return `${s} – ${formatTime(endAt)}`;
}

function hasMissingInfo(event: WeddingEvent): boolean {
  return !event.start_at || !event.venue_id;
}

export default function TimelineView({
  groupedEvents,
  onEdit,
  onDuplicate,
  onPublish,
  onHide,
  onCancel,
  onArchive,
}: TimelineViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {groupedEvents.map((group) => (
        <div key={group.date || 'unscheduled'}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <i className="ri-calendar-line text-sm" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground-900">{group.label}</h3>
            <span className="text-xs text-foreground-400 font-label">{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Timeline */}
          <div className="relative pl-10">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-secondary-200" />

            <div className="space-y-4">
              {group.events.map((event, idx) => {
                const missing = hasMissingInfo(event);
                return (
                  <div key={event.id} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute left-[-25px] top-4 w-3 h-3 rounded-full border-2 border-white ${
                      event.status === 'published' ? 'bg-emerald-400' :
                      event.status === 'cancelled' ? 'bg-red-300' :
                      event.status === 'archived' ? 'bg-foreground-300' :
                      'bg-secondary-300'
                    }`} />

                    {/* Event card */}
                    <div className={`rounded-xl bg-white border p-5 transition-all hover:border-primary-200 ${
                      event.status === 'cancelled' ? 'opacity-60 border-secondary-100' :
                      event.status === 'archived' ? 'opacity-50 border-secondary-100' :
                      'border-secondary-100'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Time + type icon */}
                        <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-1 sm:min-w-[100px]">
                          <div className="flex items-center gap-1.5 text-xs font-label text-foreground-600 whitespace-nowrap">
                            <i className="ri-time-line text-foreground-400 text-[11px]" />
                            {formatTimeRange(event.start_at, event.end_at)}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-label text-foreground-500">
                            <i className={`${getEventTypeIcon(event.event_type)} text-primary-500 text-[11px]`} />
                            {getEventTypeLabel(event.event_type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-label text-sm font-semibold text-foreground-900">{event.name}</h4>
                              {event.venue && (
                                <p className="text-xs text-foreground-500 mt-0.5 flex items-center gap-1">
                                  <i className="ri-map-pin-line text-[10px]" />
                                  {event.venue.name}
                                  {event.venue.city && `, ${event.venue.city}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Visibility badge */}
                              {event.visibility !== 'public' && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-label font-medium ${
                                  event.visibility === 'hidden' ? 'bg-red-50 text-red-600' :
                                  event.visibility === 'reveal_on_date' ? 'bg-amber-50 text-amber-600' :
                                  event.visibility === 'included_guests' ? 'bg-secondary-100 text-secondary-600' :
                                  'bg-secondary-100 text-secondary-600'
                                }`}>
                                  {getVisibilityLabel(event.visibility)}
                                </span>
                              )}
                              {/* Status badge */}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-label font-medium ${
                                event.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                                event.status === 'draft' ? 'bg-secondary-100 text-secondary-600' :
                                event.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                'bg-foreground-100 text-foreground-500'
                              }`}>
                                {getStatusLabel(event.status)}
                              </span>
                            </div>
                          </div>

                          {/* Guest description preview */}
                          {event.guest_description && (
                            <p className="text-xs text-foreground-500 mt-2 line-clamp-2">{event.guest_description}</p>
                          )}

                          {/* Missing info warning */}
                          {missing && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-label">
                              <i className="ri-error-warning-line text-xs" />
                              <span>Missing {!event.start_at ? 'time' : 'venue'} — not visible to guests</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-secondary-100">
                        <button
                          onClick={() => onEdit(event)}
                          className="px-3 py-1.5 rounded text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-pencil-line mr-1" />Edit
                        </button>
                        <button
                          onClick={() => onDuplicate(event.id)}
                          className="px-3 py-1.5 rounded text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-file-copy-line mr-1" />Duplicate
                        </button>
                        {event.status !== 'published' ? (
                          <button
                            onClick={() => onPublish(event.id)}
                            className="px-3 py-1.5 rounded text-xs font-label text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-send-plane-line mr-1" />Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => onHide(event.id)}
                            className="px-3 py-1.5 rounded text-xs font-label text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-eye-off-line mr-1" />Hide
                          </button>
                        )}
                        {/* More menu */}
                        <div className="relative ml-auto">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer transition-colors"
                          >
                            <i className="ri-more-2-fill text-sm" />
                          </button>
                          {openMenuId === event.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white border border-secondary-200 rounded-lg shadow-lg py-1">
                                {event.status !== 'cancelled' && (
                                  <button
                                    onClick={() => { setOpenMenuId(null); onCancel(event.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer text-left whitespace-nowrap"
                                  >
                                    <i className="ri-close-circle-line text-sm" />Cancel event
                                  </button>
                                )}
                                {event.status !== 'archived' && (
                                  <button
                                    onClick={() => { setOpenMenuId(null); onArchive(event.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer text-left whitespace-nowrap"
                                  >
                                    <i className="ri-archive-line text-sm" />Archive event
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}