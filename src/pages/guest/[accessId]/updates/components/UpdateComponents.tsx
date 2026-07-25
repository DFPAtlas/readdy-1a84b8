import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { GuestUpdate, UpdateCategory, AlertBanner, GuestNotificationPreference } from '@/types/access';

// ── Category config ──

export const UPDATE_CATEGORIES: { key: UpdateCategory; label: string; icon: string }[] = [
  { key: 'general', label: 'General', icon: 'ri-notification-3-line' },
  { key: 'schedule', label: 'Schedule', icon: 'ri-calendar-event-line' },
  { key: 'venue', label: 'Venue', icon: 'ri-building-line' },
  { key: 'travel', label: 'Travel', icon: 'ri-plane-line' },
  { key: 'accommodation', label: 'Accommodation', icon: 'ri-hotel-line' },
  { key: 'parking', label: 'Parking', icon: 'ri-parking-box-line' },
  { key: 'transport', label: 'Transport', icon: 'ri-bus-line' },
  { key: 'rsvp', label: 'RSVP', icon: 'ri-check-double-line' },
  { key: 'seating', label: 'Seating', icon: 'ri-user-location-line' },
  { key: 'food', label: 'Food', icon: 'ri-restaurant-line' },
  { key: 'weather', label: 'Weather', icon: 'ri-sun-line' },
  { key: 'gallery', label: 'Gallery', icon: 'ri-camera-line' },
  { key: 'gift_registry', label: 'Gift Registry', icon: 'ri-gift-line' },
  { key: 'emergency', label: 'Emergency', icon: 'ri-alert-line' },
  { key: 'thank_you', label: 'Thank you', icon: 'ri-heart-line' },
  { key: 'custom', label: 'Custom', icon: 'ri-star-line' },
];

function getCategoryConfig(category: UpdateCategory) {
  return UPDATE_CATEGORIES.find((c) => c.key === category) || UPDATE_CATEGORIES[0];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

const PRIORITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeBg: string }> = {
  emergency: { border: 'border-red-200', bg: 'bg-red-50/30', badge: 'text-red-700', badgeBg: 'bg-red-100' },
  urgent: { border: 'border-amber-200', bg: 'bg-amber-50/20', badge: 'text-amber-700', badgeBg: 'bg-amber-100' },
  important: { border: 'border-accent-200', bg: 'bg-accent-50/10', badge: 'text-accent-700', badgeBg: 'bg-accent-100' },
  standard: { border: 'border-secondary-100', bg: 'bg-white', badge: 'text-secondary-600', badgeBg: 'bg-secondary-100' },
};

// ── Alert Banner ──

interface AlertBannerBarProps {
  banner: AlertBanner;
  basePath: string;
  onDismiss: () => void;
}

export function AlertBannerBar({ banner, basePath, onDismiss }: AlertBannerBarProps) {
  const isUrgentOrEmergency = banner.priority === 'emergency' || banner.priority === 'urgent';

  return (
    <div
      className={`relative mb-6 p-4 rounded-xl border ${
        banner.priority === 'emergency'
          ? 'bg-red-50 border-red-200'
          : banner.priority === 'urgent'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-accent-50 border-accent-200'
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${
            banner.priority === 'emergency' ? 'bg-red-100 text-red-600' :
            banner.priority === 'urgent' ? 'bg-amber-100 text-amber-600' :
            'bg-accent-100 text-accent-600'
          }`}
        >
          <i className={`${banner.priority === 'emergency' ? 'ri-alert-fill' : banner.priority === 'urgent' ? 'ri-error-warning-fill' : 'ri-star-fill'} text-sm`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-label font-semibold text-foreground-900">
            {banner.priority === 'emergency' ? 'Emergency' : banner.priority === 'urgent' ? 'Urgent' : 'Important'}
          </p>
          <p className="text-xs text-foreground-700 mt-0.5 line-clamp-2">{banner.summary || banner.title}</p>
          <Link
            to={`${basePath}/updates/${banner.update_id}`}
            className="inline-flex items-center gap-1 mt-2 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
          >
            View details <i className="ri-arrow-right-line text-[10px]" />
          </Link>
        </div>
        {banner.dismissible && !isUrgentOrEmergency && (
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-600 hover:bg-black/5 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Dismiss"
          >
            <i className="ri-close-line text-sm" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Update Card ──

interface UpdateCardProps {
  update: GuestUpdate;
  basePath: string;
  onToggleRead: () => void;
  onToggleSaved: () => void;
  isMutating: boolean;
}

export function UpdateCard({ update, basePath, onToggleRead, onToggleSaved, isMutating }: UpdateCardProps) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const cat = getCategoryConfig(update.category);
  const styles = PRIORITY_STYLES[update.priority] || PRIORITY_STYLES.standard;
  const isEmergency = update.priority === 'emergency';
  const hasAttachment = update.attachments && update.attachments.length > 0;
  const hasRelatedLink = update.related_itinerary_event_id || update.related_route || update.linked_venue_id;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${styles.border} ${styles.bg} ${!update.is_read ? 'shadow-sm' : ''}`}>
      <div className="p-4 md:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Priority badge */}
            {update.priority !== 'standard' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label font-medium ${styles.badge} ${styles.badgeBg}`}>
                <i className={`${update.priority === 'emergency' ? 'ri-alert-fill' : update.priority === 'urgent' ? 'ri-error-warning-fill' : 'ri-star-fill'} text-[8px]`} />
                {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)}
              </span>
            )}

            {/* Category */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[10px] font-label">
              <i className={`${cat.icon} text-[8px]`} />
              {cat.label}
            </span>

            {/* Unread dot */}
            {!update.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" title="Unread" />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleSaved}
              disabled={isMutating}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                update.is_saved
                  ? 'text-accent-500 bg-accent-50 hover:bg-accent-100'
                  : 'text-foreground-400 hover:text-accent-500 hover:bg-accent-50'
              }`}
              title={update.is_saved ? 'Remove bookmark' : 'Save'}
              aria-label={update.is_saved ? 'Remove bookmark' : 'Save update'}
            >
              <i className={`${update.is_saved ? 'ri-bookmark-fill' : 'ri-bookmark-line'} text-sm`} />
            </button>

            <button
              onClick={onToggleRead}
              disabled={isMutating}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                update.is_read
                  ? 'text-foreground-400 hover:text-foreground-600 hover:bg-background-100'
                  : 'text-primary-500 hover:text-primary-600 hover:bg-primary-50'
              }`}
              title={update.is_read ? 'Mark unread' : 'Mark read'}
              aria-label={update.is_read ? 'Mark unread' : 'Mark read'}
            >
              <i className={`${update.is_read ? 'ri-mail-open-line' : 'ri-mail-unread-line'} text-sm`} />
            </button>
          </div>
        </div>

        {/* Title — clickable to detail page */}
        <Link to={`${basePath}/updates/${update.id}`} className="block group cursor-pointer">
          <h3 className="font-heading text-base md:text-lg font-semibold text-foreground-900 group-hover:text-primary-600 transition-colors mb-1">
            {update.title}
          </h3>
        </Link>

        {/* Summary */}
        {update.summary && (
          <p className="text-xs text-foreground-500 line-clamp-2 mb-2">{update.summary}</p>
        )}

        {/* Date + meta */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <p className="text-[10px] text-foreground-400">
            <time dateTime={update.published_at || update.created_at}>
              {formatRelative(update.published_at || update.created_at)}
            </time>
          </p>
          {update.last_edited_at && (
            <span className="text-[10px] text-foreground-300">· Edited</span>
          )}
          {hasAttachment && (
            <span className="inline-flex items-center gap-1 text-[10px] text-foreground-400">
              <i className="ri-attachment-2 text-[9px]" /> {update.attachments.length}
            </span>
          )}
        </div>

        {/* Image */}
        {update.image_url && (
          <div className="mb-3">
            <button
              onClick={() => setImageExpanded(!imageExpanded)}
              className="block w-full cursor-pointer group"
            >
              <img
                src={update.image_url}
                alt={update.title}
                className={`rounded-lg object-cover w-full transition-all ${imageExpanded ? 'max-h-96' : 'max-h-40'}`}
                loading="lazy"
              />
            </button>
          </div>
        )}

        {/* Content preview */}
        {update.content && !update.summary && (
          <p className="text-xs text-foreground-600 leading-relaxed line-clamp-3 whitespace-pre-line">
            {update.content}
          </p>
        )}

        {/* Related links */}
        {hasRelatedLink && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-secondary-100">
            {update.related_itinerary_event_id && (
              <Link
                to={`${basePath}/itinerary/${update.related_itinerary_event_id}`}
                className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-event-line text-[9px]" /> {update.related_itinerary_event_name || 'View event'}
              </Link>
            )}
            {update.related_route === 'rsvp' && (
              <Link to={`${basePath}/rsvp`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-check-double-line text-[9px]" /> RSVP
              </Link>
            )}
            {update.related_route === 'seating' && (
              <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-user-location-line text-[9px]" /> Seating
              </Link>
            )}
            {update.related_route === 'gallery' && (
              <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-camera-line text-[9px]" /> Gallery
              </Link>
            )}
            {update.related_route === 'registry' && (
              <Link to={`${basePath}/registry`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-gift-line text-[9px]" /> Registry
              </Link>
            )}
            {update.related_route === 'travel' && (
              <Link to={`${basePath}/travel`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-plane-line text-[9px]" /> Travel
              </Link>
            )}
            {update.linked_venue_id && (
              <Link to={`${basePath}/details`} className="inline-flex items-center gap-1 text-[10px] font-label text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-building-line text-[9px]" /> {update.linked_venue_name || 'Venue'}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category Filter Pills ──

interface CategoryFiltersProps {
  selected: UpdateCategory | 'all' | 'unread' | 'saved';
  onSelect: (key: UpdateCategory | 'all' | 'unread' | 'saved') => void;
  counts: Record<string, number>;
  unreadCount: number;
  savedCount: number;
}

export function CategoryFilters({ selected, onSelect, counts, unreadCount, savedCount }: CategoryFiltersProps) {
  const filters: { key: UpdateCategory | 'all' | 'unread' | 'saved'; label: string; icon?: string }[] = [
    { key: 'all', label: 'All', icon: 'ri-notification-3-line' },
    { key: 'unread', label: 'Unread', icon: 'ri-mail-unread-line' },
    { key: 'saved', label: 'Saved', icon: 'ri-bookmark-line' },
    ...UPDATE_CATEGORIES,
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => {
        const isActive = selected === f.key;
        const count = f.key === 'unread' ? unreadCount : f.key === 'saved' ? savedCount : f.key === 'all' ? Object.values(counts).reduce((s, c) => s + c, 0) : (counts[f.key] || 0);
        const showCount = count > 0 && (f.key === 'unread' || f.key === 'saved');

        if (count === 0 && f.key !== 'all' && f.key !== 'unread' && f.key !== 'saved') return null;

        return (
          <button
            key={f.key}
            onClick={() => onSelect(f.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-secondary-200 text-foreground-600 hover:border-secondary-300 hover:bg-background-50'
            }`}
          >
            {f.icon && <i className={`${f.icon} text-[10px]`} />}
            {f.label}
            {showCount && (
              <span className={`text-[10px] px-1.5 py-px rounded-full font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-secondary-100 text-secondary-700'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Notification Preferences Modal ──

interface NotifPrefsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: GuestNotificationPreference[];
  onSave: (guestId: string, updatesEnabled: boolean, emailNotifs: boolean) => void;
  isSaving: boolean;
}

export function NotifPrefsModal({ isOpen, onClose, preferences, onSave, isSaving }: NotifPrefsModalProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  if (!isOpen) return null;

  const currentPref = localPrefs[0] || { id: '', guest_id: '', updates_enabled: true, email_notifications: false };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-sm p-5">
          <h2 className="font-heading text-lg font-semibold text-foreground-900 mb-1">Notification preferences</h2>
          <p className="text-xs text-foreground-500 mb-5">Manage how you would like to receive updates from the couple.</p>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-label text-foreground-900">Show updates</p>
                <p className="text-xs text-foreground-500">See published updates in your portal</p>
              </div>
              <button
                role="switch"
                aria-checked={currentPref.updates_enabled}
                onClick={() => {
                  setLocalPrefs([{ ...currentPref, updates_enabled: !currentPref.updates_enabled }]);
                }}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  currentPref.updates_enabled ? 'bg-primary-500' : 'bg-secondary-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${currentPref.updates_enabled ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-label text-foreground-900">Email notifications</p>
                <p className="text-xs text-foreground-500">Receive update summaries via email</p>
              </div>
              <button
                role="switch"
                aria-checked={currentPref.email_notifications}
                onClick={() => {
                  setLocalPrefs([{ ...currentPref, email_notifications: !currentPref.email_notifications }]);
                }}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  currentPref.email_notifications ? 'bg-primary-500' : 'bg-secondary-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${currentPref.email_notifications ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            {currentPref.email_notifications && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary-50 border border-secondary-100">
                <i className="ri-information-line text-secondary-500 text-sm mt-px flex-shrink-0" />
                <p className="text-[11px] text-secondary-700 leading-relaxed">
                  Email delivery depends on the couple's communication settings. We cannot guarantee email delivery unless the couple has configured it.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(currentPref.guest_id, currentPref.updates_enabled, currentPref.email_notifications)}
              disabled={isSaving}
              className="flex-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Skeleton ──

export function UpdatesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-secondary-100 rounded-xl p-5 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 bg-secondary-200 rounded-full" />
            <div className="h-5 w-20 bg-secondary-200 rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-secondary-200 rounded mb-2" />
          <div className="h-3 w-32 bg-secondary-100 rounded mb-3" />
          <div className="space-y-1.5">
            <div className="h-3 bg-secondary-100 rounded" />
            <div className="h-3 bg-secondary-100 rounded w-5/6" />
            <div className="h-3 bg-secondary-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ──

export function UpdatesEmpty({ filterActive }: { filterActive: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
        <i className="ri-notification-off-line text-2xl" />
      </div>
      <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">
        {filterActive ? 'No matching updates' : 'No updates yet'}
      </h2>
      <p className="text-sm text-foreground-500 max-w-sm mx-auto">
        {filterActive
          ? 'No updates match the selected filter. Try selecting a different category.'
          : 'The couple have not published any updates yet. Check back for news and announcements.'}
      </p>
    </div>
  );
}

// ── Disabled state ──

export function UpdatesDisabled() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
        <i className="ri-notification-3-line text-2xl" />
      </div>
      <h1 className="font-heading text-xl text-foreground-900 mb-2">Updates</h1>
      <p className="text-sm text-foreground-500">Updates are not currently available for this wedding.</p>
    </div>
  );
}