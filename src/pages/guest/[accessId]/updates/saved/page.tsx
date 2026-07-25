import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import type { GuestUpdate } from '@/types/access';
import { isDemoMode } from '@/demo/demoConfig';

const INTERACT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-update-interact';

function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const CATEGORY_ICONS: Record<string, string> = {
  general: 'ri-notification-3-line', schedule: 'ri-calendar-event-line', venue: 'ri-building-line',
  travel: 'ri-plane-line', accommodation: 'ri-hotel-line', parking: 'ri-parking-box-line',
  transport: 'ri-bus-line', rsvp: 'ri-check-double-line', seating: 'ri-user-location-line',
  food: 'ri-restaurant-line', weather: 'ri-sun-line', gallery: 'ri-camera-line',
  gift_registry: 'ri-gift-line', emergency: 'ri-alert-line', thank_you: 'ri-heart-line',
  custom: 'ri-star-line',
};

const PRIORITY_LABELS: Record<string, string> = {
  emergency: 'Emergency', urgent: 'Urgent', important: 'Important', standard: 'Standard',
};

export default function GuestSavedUpdatesPage() {
  const { accessId } = useParams();
  const { data, loading, error, refresh } = useGuestPortal();
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

  const basePath = `/guest/${accessId}`;
  const updatesData = data?.updates;
  const portalSettings = data?.portal_settings;
  const allUpdates = updatesData?.updates || [];
  const savedUpdates = allUpdates.filter((u) => u.is_saved);

  const primaryGuest = data?.recipients?.[0];

  const callInteract = useCallback(async (action: string, params: Record<string, unknown>) => {
    if (isDemoMode) return;
    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action, ...params }),
      });
      await res.json();
      await refresh();
    } catch { /* silent */ }
  }, [accessId, refresh]);

  const handleUnsave = useCallback(async (update: GuestUpdate) => {
    if (!primaryGuest) return;
    setMutatingIds((prev) => new Set(prev).add(update.id));
    await callInteract('toggle_saved', { update_id: update.id, guest_id: primaryGuest.guest_id });
    setMutatingIds((prev) => {
      const next = new Set(prev);
      next.delete(update.id);
      return next;
    });
  }, [primaryGuest, callInteract]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-secondary-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-secondary-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'Could not load updates.'}</p>
      </div>
    );
  }

  if (!portalSettings?.show_updates) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-notification-off-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-500">Updates are not currently available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`${basePath}/updates`} className="inline-flex items-center gap-1 text-xs text-foreground-400 hover:text-foreground-600 mb-2 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line" /> Updates
          </Link>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Saved updates</h1>
          <p className="text-sm text-foreground-500">
            {savedUpdates.length > 0
              ? `${savedUpdates.length} saved update${savedUpdates.length !== 1 ? 's' : ''}`
              : 'Save updates to find them here later'}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {savedUpdates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
            <i className="ri-bookmark-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">No saved updates</h2>
          <p className="text-sm text-foreground-500 max-w-xs mx-auto mb-4">
            Tap the bookmark icon on any update to save it for later. Saved updates are private — only you can see this list.
          </p>
          <Link
            to={`${basePath}/updates`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-notification-3-line" /> Browse updates
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedUpdates.map((update) => {
            const catIcon = CATEGORY_ICONS[update.category] || CATEGORY_ICONS.general;
            return (
              <div key={update.id} className="bg-white border border-secondary-100 rounded-xl p-4 hover:border-secondary-200 transition-colors">
                <div className="flex items-start gap-3">
                  <Link to={`${basePath}/updates/${update.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-label text-secondary-600">
                        <i className={`${catIcon} text-[9px]`} />
                        {update.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {update.priority !== 'standard' && (
                        <span className="text-[10px] font-label text-accent-600">
                          {PRIORITY_LABELS[update.priority]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{update.title}</h3>
                    {update.summary && (
                      <p className="text-xs text-foreground-500 line-clamp-1 mt-0.5">{update.summary}</p>
                    )}
                    <p className="text-[10px] text-foreground-400 mt-1.5">{formatRelative(update.published_at || update.created_at)}</p>
                  </Link>
                  <button
                    onClick={() => handleUnsave(update)}
                    disabled={mutatingIds.has(update.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-accent-50 text-accent-500 hover:bg-accent-100 transition-colors cursor-pointer flex-shrink-0 mt-1"
                    title="Remove bookmark"
                    aria-label="Remove bookmark"
                  >
                    <i className="ri-bookmark-fill text-sm" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Privacy note */}
      {savedUpdates.length > 0 && (
        <p className="text-[10px] text-foreground-300 text-center mt-6">
          <i className="ri-lock-line text-[9px] mr-1" />Saved updates are private to you
        </p>
      )}
    </div>
  );
}