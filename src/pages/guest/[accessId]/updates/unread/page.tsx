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

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'border-red-200 bg-red-50/40',
  urgent: 'border-amber-200 bg-amber-50/40',
  important: 'border-accent-200 bg-accent-50/20',
  standard: 'border-secondary-100 bg-white',
};

export default function GuestUnreadUpdatesPage() {
  const { accessId } = useParams();
  const { data, loading, error, refresh } = useGuestPortal();
  const [markingAll, setMarkingAll] = useState(false);

  const basePath = `/guest/${accessId}`;
  const updatesData = data?.updates;
  const portalSettings = data?.portal_settings;
  const allUpdates = updatesData?.updates || [];
  const unreadUpdates = allUpdates.filter((u) => !u.is_read);

  const primaryGuest = data?.recipients?.[0];

  const handleMarkAllRead = useCallback(async () => {
    if (!primaryGuest) return;
    setMarkingAll(true);
    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 400));
      setMarkingAll(false);
      return;
    }
    try {
      await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action: 'mark_all_read', guest_id: primaryGuest.guest_id }),
      });
      await refresh();
    } catch { /* silent */ }
    finally { setMarkingAll(false); }
  }, [accessId, primaryGuest, refresh]);

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
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Unread</h1>
          <p className="text-sm text-foreground-500">
            {unreadUpdates.length > 0
              ? `${unreadUpdates.length} unread update${unreadUpdates.length !== 1 ? 's' : ''}`
              : 'You\'re all caught up'}
          </p>
        </div>

        {unreadUpdates.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <i className={`${markingAll ? 'ri-loader-4-line animate-spin' : 'ri-check-double-line'} text-sm`} />
            {markingAll ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Empty state — all caught up */}
      {unreadUpdates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-emerald-100 text-emerald-500 mb-4">
            <i className="ri-check-double-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">You're all caught up</h2>
          <p className="text-sm text-foreground-500 max-w-xs mx-auto mb-4">
            There are no unread updates right now. Browse all updates or check back later.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              to={`${basePath}/updates`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-notification-3-line" /> All updates
            </Link>
            <Link
              to={basePath}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {unreadUpdates.map((update) => {
            const catIcon = CATEGORY_ICONS[update.category] || CATEGORY_ICONS.general;
            const borderClass = PRIORITY_COLORS[update.priority] || PRIORITY_COLORS.standard;
            return (
              <Link
                key={update.id}
                to={`${basePath}/updates/${update.id}`}
                className={`block border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer ${borderClass}`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-label text-secondary-600">
                        <i className={`${catIcon} text-[9px]`} />
                        {update.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {update.priority !== 'standard' && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-medium ${
                          update.priority === 'emergency' ? 'text-red-600' : update.priority === 'urgent' ? 'text-amber-600' : 'text-accent-600'
                        }`}>
                          <i className={`${update.priority === 'emergency' ? 'ri-alert-fill' : update.priority === 'urgent' ? 'ri-error-warning-fill' : 'ri-star-fill'} text-[8px]`} />
                          {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-label font-semibold text-foreground-900 line-clamp-1">{update.title}</h3>
                    {update.summary && (
                      <p className="text-xs text-foreground-500 line-clamp-1 mt-0.5">{update.summary}</p>
                    )}
                    <p className="text-[10px] text-foreground-400 mt-1.5">{formatRelative(update.published_at || update.created_at)}</p>
                  </div>

                  <div className="flex-shrink-0">
                    <i className="ri-arrow-right-s-line text-foreground-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}