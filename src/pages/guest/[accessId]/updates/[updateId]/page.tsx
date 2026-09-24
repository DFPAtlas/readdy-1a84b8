import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, Link } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import type { GuestUpdate } from '@/types/access';
import { isDemoMode } from '@/demo/demoConfig';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

const INTERACT_URL = edgeFunctionUrl('guest-update-interact');

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-50 border-red-200 text-red-700',
  urgent: 'bg-amber-50 border-amber-200 text-amber-700',
  important: 'bg-accent-50 border-accent-200 text-accent-700',
  standard: 'bg-secondary-50 border-secondary-200 text-secondary-600',
};

const CATEGORY_ICONS: Record<string, string> = {
  general: 'ri-notification-3-line', schedule: 'ri-calendar-event-line', venue: 'ri-building-line',
  travel: 'ri-plane-line', accommodation: 'ri-hotel-line', parking: 'ri-parking-box-line',
  transport: 'ri-bus-line', rsvp: 'ri-check-double-line', seating: 'ri-user-location-line',
  food: 'ri-restaurant-line', weather: 'ri-sun-line', gallery: 'ri-camera-line',
  gift_registry: 'ri-gift-line', emergency: 'ri-alert-line', thank_you: 'ri-heart-line',
  custom: 'ri-star-line',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function GuestUpdateDetailPage() {
  const { accessId, updateId } = useParams();
  const { data, loading, error, refresh } = useGuestPortal();
  const [mutating, setMutating] = useState(false);

  const basePath = `/guest/${accessId}`;
  const updatesData = data?.updates;
  const portalSettings = data?.portal_settings;
  const allUpdates = updatesData?.updates || [];
  const update = allUpdates.find((u) => u.id === updateId);

  const primaryGuest = data?.recipients?.[0];

  // Mark as read on open
  useEffect(() => {
    if (!update || !primaryGuest || update.is_read || isDemoMode) return;
    const markRead = async () => {
      await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action: 'mark_read', update_id: update.id, guest_id: primaryGuest.guest_id }),
      });
      await refresh();
    };
    markRead();
  }, [update?.id]);

  const callInteract = useCallback(async (action: string, params: Record<string, unknown>) => {
    setMutating(true);
    if (isDemoMode) {
      // In demo mode, simulate without calling Edge Function
      await new Promise((r) => setTimeout(r, 300));
      setMutating(false);
      return;
    }
    try {
      await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action, ...params }),
      });
      await refresh();
    } finally {
      setMutating(false);
    }
  }, [accessId, refresh]);

  // Loading
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-32 bg-secondary-200 rounded" />
          <div className="h-8 w-3/4 bg-secondary-200 rounded" />
          <div className="h-3 w-48 bg-secondary-100 rounded" />
          <div className="space-y-2 mt-6">
            <div className="h-3 bg-secondary-100 rounded" />
            <div className="h-3 bg-secondary-100 rounded w-5/6" />
            <div className="h-3 bg-secondary-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'Could not load update.'}</p>
        <Link to={`${basePath}/updates`} className="inline-flex items-center gap-1 text-xs text-primary-600 mt-4 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to updates
        </Link>
      </div>
    );
  }

  // Disabled
  if (!portalSettings?.show_updates) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-notification-off-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-500">Updates are not currently available.</p>
        <Link to={basePath} className="inline-flex items-center gap-1 text-xs text-primary-600 mt-4 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to dashboard
        </Link>
      </div>
    );
  }

  // Not found
  if (!update) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-file-search-line text-2xl" />
        </div>
        <h2 className="font-heading text-lg text-foreground-900 mb-1">Update not found</h2>
        <p className="text-sm text-foreground-500 mb-4">This update may have been removed or is no longer available.</p>
        <Link to={`${basePath}/updates`} className="inline-flex items-center gap-1 text-xs font-label text-primary-600 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to updates
        </Link>
      </div>
    );
  }

  const isEmergency = update.priority === 'emergency';
  const catIcon = CATEGORY_ICONS[update.category] || CATEGORY_ICONS.general;
  const hasContentData = update.content_data && Array.isArray(update.content_data) && update.content_data.length > 0;
  const hasRelatedLinks = update.related_itinerary_event_id || update.linked_venue_id || update.linked_travel_location_id || update.related_route;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Back link */}
      <Link
        to={`${basePath}/updates`}
        className="inline-flex items-center gap-1.5 text-xs font-label text-foreground-500 hover:text-foreground-700 mb-6 cursor-pointer whitespace-nowrap"
      >
        <i className="ri-arrow-left-line" /> All updates
      </Link>

      {/* Emergency banner */}
      {isEmergency && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 flex-shrink-0">
            <i className="ri-alert-fill text-sm" />
          </div>
          <div>
            <p className="text-sm font-label font-semibold text-red-800">Emergency notice</p>
            <p className="text-xs text-red-600">This is an emergency update from the wedding team.</p>
          </div>
        </div>
      )}

      {/* Priority & Category badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-label font-medium ${PRIORITY_COLORS[update.priority] || PRIORITY_COLORS.standard}`}>
          <i className={`${update.priority === 'emergency' ? 'ri-alert-fill' : update.priority === 'urgent' ? 'ri-error-warning-fill' : update.priority === 'important' ? 'ri-star-fill' : 'ri-information-line'} text-[10px]`} />
          {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-100 text-secondary-700 text-[11px] font-label">
          <i className={`${catIcon} text-[10px]`} />
          {update.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
        {!update.is_read && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-[11px] font-label">
            <i className="ri-circle-fill text-[6px]" /> Unread
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">{update.title}</h1>

      {/* Published date */}
      <p className="text-xs text-foreground-400 mb-6">
        Published {formatDate(update.published_at || update.created_at)}
        {update.published_at && <> at {formatTime(update.published_at)}</>}
        {update.last_edited_at && (
          <span className="ml-2 text-foreground-300">· Edited {formatDate(update.last_edited_at)}</span>
        )}
      </p>

      {/* Summary */}
      {update.summary && (
        <p className="text-sm text-foreground-600 leading-relaxed mb-6 p-4 rounded-lg bg-secondary-50 border border-secondary-100">
          {update.summary}
        </p>
      )}

      {/* Hero image */}
      {update.hero_image_signed_url && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <img src={update.hero_image_signed_url} alt={update.title} className="w-full object-cover max-h-80" loading="lazy" />
        </div>
      )}
      {update.image_url && !update.hero_image_signed_url && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <img src={update.image_url} alt={update.title} className="w-full object-cover max-h-80" loading="lazy" />
        </div>
      )}

      {/* Structured content */}
      {hasContentData ? (
        <div className="space-y-4 mb-8">
          {update.content_data!.map((block, i) => {
            switch (block.type) {
              case 'heading':
                return (
                  <h2 key={i} className={`font-heading font-semibold text-foreground-900 ${block.level === 2 ? 'text-lg' : 'text-xl'} mt-6 first:mt-0`}>
                    {block.text}
                  </h2>
                );
              case 'paragraph':
                return <p key={i} className="text-sm text-foreground-700 leading-relaxed">{block.text}</p>;
              case 'list':
                return (
                  <ul key={i} className="space-y-1 pl-5">
                    {(block.items || []).map((item, j) => (
                      <li key={j} className="text-sm text-foreground-700 list-disc">{item}</li>
                    ))}
                  </ul>
                );
              case 'image':
                return block.image_url ? (
                  <div key={i} className="rounded-lg overflow-hidden">
                    <img src={block.image_url} alt={block.image_alt || ''} className="w-full object-cover max-h-64" loading="lazy" />
                  </div>
                ) : null;
              case 'button':
                return block.button_label && block.button_route ? (
                  <Link key={i} to={block.button_route} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                    {block.button_label} <i className="ri-arrow-right-line text-xs" />
                  </Link>
                ) : null;
              case 'info_panel':
                return (
                  <div key={i} className={`p-4 rounded-lg border ${block.panel_type === 'warning' ? 'bg-amber-50 border-amber-200' : block.panel_type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-secondary-50 border-secondary-200'}`}>
                    <p className="text-sm text-foreground-700">{block.text}</p>
                  </div>
                );
              case 'event_summary':
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                    <i className="ri-calendar-event-line text-secondary-500 text-lg" />
                    <div>
                      <p className="text-xs font-label text-foreground-900">{block.event_name}</p>
                      {block.event_date && <p className="text-[11px] text-foreground-500">{block.event_date}</p>}
                    </div>
                  </div>
                );
              case 'travel_summary':
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                    <i className="ri-map-pin-line text-secondary-500 text-lg" />
                    <div>
                      <p className="text-xs font-label text-foreground-900">{block.location_name}</p>
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      ) : (
        update.content && (
          <div className="text-sm text-foreground-700 leading-relaxed whitespace-pre-line mb-8">
            {update.content}
          </div>
        )
      )}

      {/* Related links */}
      {hasRelatedLinks && (
        <div className="mb-6 p-4 rounded-xl bg-secondary-50 border border-secondary-100">
          <h3 className="text-xs font-label font-semibold text-foreground-800 mb-3">Related information</h3>
          <div className="flex flex-wrap gap-2">
            {update.related_itinerary_event_id && (
              <Link
                to={`${basePath}/itinerary/${update.related_itinerary_event_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-event-line" />
                {update.related_itinerary_event_name || 'View event'}
              </Link>
            )}
            {update.linked_venue_id && (
              <Link
                to={`${basePath}/details`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-building-line" />
                {update.linked_venue_name || 'View venue'}
              </Link>
            )}
            {update.linked_travel_location_id && (
              <Link
                to={`${basePath}/travel`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-map-pin-line" />
                {update.linked_travel_location_name || 'View location'}
              </Link>
            )}
            {update.related_route === 'rsvp' && (
              <Link to={`${basePath}/rsvp`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-check-double-line" /> Complete RSVP
              </Link>
            )}
            {update.related_route === 'seating' && (
              <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-user-location-line" /> View seating
              </Link>
            )}
            {update.related_route === 'gallery' && (
              <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-camera-line" /> View gallery
              </Link>
            )}
            {update.related_route === 'registry' && (
              <Link to={`${basePath}/registry`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-gift-line" /> View registry
              </Link>
            )}
            {update.related_route === 'travel' && (
              <Link to={`${basePath}/travel`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-plane-line" /> Travel guide
              </Link>
            )}
            {update.related_route === 'itinerary' && (
              <Link to={`${basePath}/itinerary`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-calendar-event-line" /> View itinerary
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Attachments */}
      {update.attachments && update.attachments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-label font-semibold text-foreground-800 mb-3">Attachments</h3>
          <div className="space-y-2">
            {update.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-secondary-100">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-500 flex-shrink-0">
                  <i className={`${att.file_type === 'pdf' ? 'ri-file-pdf-line' : att.mime_type?.startsWith('image/') ? 'ri-image-line' : 'ri-file-line'} text-sm`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-label font-medium text-foreground-800 truncate">{att.display_name}</p>
                  <p className="text-[10px] text-foreground-400">
                    {att.file_type?.toUpperCase()}{att.file_size_bytes ? ` · ${formatFileSize(att.file_size_bytes)}` : ''}
                  </p>
                </div>
                {att.signed_url && (
                  <a
                    href={att.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-download-line text-[10px]" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-secondary-100">
        <button
          onClick={() => {
            if (primaryGuest) callInteract('toggle_saved', { update_id: update.id, guest_id: primaryGuest.guest_id });
          }}
          disabled={mutating}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
            update.is_saved
              ? 'bg-accent-50 text-accent-600 hover:bg-accent-100'
              : 'bg-white border border-secondary-200 text-foreground-600 hover:bg-background-50'
          }`}
        >
          <i className={`${update.is_saved ? 'ri-bookmark-fill' : 'ri-bookmark-line'} text-sm`} />
          {update.is_saved ? 'Saved' : 'Save'}
        </button>

        <button
          onClick={() => {
            if (primaryGuest) callInteract('mark_unread', { update_id: update.id, guest_id: primaryGuest.guest_id });
          }}
          disabled={mutating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-mail-unread-line text-sm" /> Mark unread
        </button>

        <Link
          to={`${basePath}/updates`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap ml-auto"
        >
          <i className="ri-arrow-left-line" /> Back to updates
        </Link>
      </div>
    </div>
  );
}