import { useState } from 'react';
import type { WeddingEvent } from '@/hooks/useWeddingEvents';
import { getEventTypeIcon, getEventTypeLabel, getVisibilityLabel, getStatusLabel } from '@/hooks/useWeddingEvents';

interface ListViewProps {
  events: WeddingEvent[];
  onEdit: (event: WeddingEvent) => void;
  onDuplicate: (eventId: string) => void;
  onPublish: (eventId: string) => void;
  onHide: (eventId: string) => void;
  onCancel: (eventId: string) => void;
  onArchive: (eventId: string) => void;
}

function formatDateTime(startAt: string | null, endAt: string | null): string {
  if (!startAt) return '—';
  const d = new Date(startAt);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const st = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (!endAt) return `${date}, ${st}`;
  const et = new Date(endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${st} – ${et}`;
}

function getVenueLabel(event: WeddingEvent): string {
  if (event.venue) return event.venue.name;
  return '—';
}

function getAudienceLabel(event: WeddingEvent): string {
  switch (event.visibility) {
    case 'public': return 'Everyone';
    case 'invitation_holders': return 'Invitation holders';
    case 'included_guests': return 'Included guests';
    case 'reveal_on_date': return `Reveals ${event.reveal_at ? new Date(event.reveal_at).toLocaleDateString('en-GB') : 'later'}`;
    case 'hidden': return 'Hidden';
    default: return event.visibility;
  }
}

export default function ListView({
  events,
  onEdit,
  onDuplicate,
  onPublish,
  onHide,
  onCancel,
  onArchive,
}: ListViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-secondary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-100 bg-background-50">
                <th className="text-left px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Date &amp; time</th>
                <th className="text-left px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Venue</th>
                <th className="text-left px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Audience</th>
                <th className="text-left px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {events.map((event) => {
                const rowOpacity = event.status === 'cancelled' ? 'opacity-50' : event.status === 'archived' ? 'opacity-40' : '';
                return (
                  <tr key={event.id} className={`hover:bg-background-50 transition-colors ${rowOpacity}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                          <i className={`${getEventTypeIcon(event.event_type)} text-sm`} />
                        </div>
                        <div>
                          <p className="text-sm font-label font-medium text-foreground-900">{event.name}</p>
                          <p className="text-[11px] text-foreground-400">{getEventTypeLabel(event.event_type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-label text-foreground-600 whitespace-nowrap">{formatDateTime(event.start_at, event.end_at)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-foreground-600">{getVenueLabel(event)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium ${
                        event.visibility === 'hidden' ? 'bg-red-50 text-red-600' :
                        event.visibility === 'public' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-secondary-100 text-secondary-600'
                      }`}>
                        {getAudienceLabel(event)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium ${
                        event.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                        event.status === 'draft' ? 'bg-secondary-100 text-secondary-600' :
                        event.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-foreground-100 text-foreground-500'
                      }`}>
                        {getStatusLabel(event.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(event)}
                          className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 hover:text-primary-500 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <i className="ri-pencil-line text-xs" />
                        </button>
                        <button
                          onClick={() => onDuplicate(event.id)}
                          className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer transition-colors"
                          title="Duplicate"
                        >
                          <i className="ri-file-copy-line text-xs" />
                        </button>
                        {event.status !== 'published' ? (
                          <button
                            onClick={() => onPublish(event.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors"
                            title="Publish"
                          >
                            <i className="ri-send-plane-line text-xs" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onHide(event.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-amber-50 hover:text-amber-600 cursor-pointer transition-colors"
                            title="Hide"
                          >
                            <i className="ri-eye-off-line text-xs" />
                          </button>
                        )}
                        {/* More */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer transition-colors"
                            title="More"
                          >
                            <i className="ri-more-2-fill text-xs" />
                          </button>
                          {openMenuId === event.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white border border-secondary-200 rounded-lg shadow-lg py-1">
                                {event.status !== 'cancelled' && (
                                  <button
                                    onClick={() => { setOpenMenuId(null); onCancel(event.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer text-left whitespace-nowrap"
                                  >
                                    <i className="ri-close-circle-line text-sm" />Cancel
                                  </button>
                                )}
                                {event.status !== 'archived' && (
                                  <button
                                    onClick={() => { setOpenMenuId(null); onArchive(event.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground-600 hover:bg-background-100 cursor-pointer text-left whitespace-nowrap"
                                  >
                                    <i className="ri-archive-line text-sm" />Archive
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`rounded-xl bg-white border p-4 ${
              event.status === 'cancelled' ? 'opacity-60 border-secondary-100' :
              event.status === 'archived' ? 'opacity-50 border-secondary-100' :
              'border-secondary-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                <i className={`${getEventTypeIcon(event.event_type)} text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-label font-medium text-foreground-900 truncate">{event.name}</h4>
                <p className="text-[11px] text-foreground-500 mt-0.5">{getEventTypeLabel(event.event_type)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {event.visibility !== 'public' && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-label ${
                    event.visibility === 'hidden' ? 'bg-red-50 text-red-600' : 'bg-secondary-100 text-secondary-600'
                  }`}>
                    {getVisibilityLabel(event.visibility)}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-label ${
                  event.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                  event.status === 'draft' ? 'bg-secondary-100 text-secondary-600' :
                  event.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                  'bg-foreground-100 text-foreground-500'
                }`}>
                  {getStatusLabel(event.status)}
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-foreground-600">
                <i className="ri-time-line text-foreground-400" />
                {formatDateTime(event.start_at, event.end_at)}
              </div>
              <div className="flex items-center gap-1.5 text-foreground-600">
                <i className="ri-map-pin-line text-foreground-400" />
                {getVenueLabel(event)}
              </div>
              <div className="flex items-center gap-1.5 text-foreground-600">
                <i className="ri-group-line text-foreground-400" />
                {getAudienceLabel(event)}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-100">
              <button
                onClick={() => onEdit(event)}
                className="px-2.5 py-1.5 rounded text-[11px] font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-pencil-line mr-1" />Edit
              </button>
              <button
                onClick={() => onDuplicate(event.id)}
                className="px-2.5 py-1.5 rounded text-[11px] font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-file-copy-line mr-1" />Copy
              </button>
              {event.status !== 'published' ? (
                <button
                  onClick={() => onPublish(event.id)}
                  className="px-2.5 py-1.5 rounded text-[11px] font-label text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-send-plane-line mr-1" />Publish
                </button>
              ) : (
                <button
                  onClick={() => onHide(event.id)}
                  className="px-2.5 py-1.5 rounded text-[11px] font-label text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-eye-off-line mr-1" />Hide
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}