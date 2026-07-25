import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import type { GuestUpdate, UpdateCategory } from '@/types/access';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import {
  UpdateCard,
  CategoryFilters,
  UpdatesSkeleton,
  UpdatesEmpty,
  UpdatesDisabled,
  AlertBannerBar,
} from './components/UpdateComponents';

const INTERACT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-update-interact';

export default function GuestUpdatesPage() {
  const { accessId } = useParams();
  const { data, loading, error, refresh } = useGuestPortal();
  const [activeFilter, setActiveFilter] = useState<UpdateCategory | 'all' | 'unread' | 'saved'>('all');
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

  const isDemo = isDemoMode && accessId === 'demo-session';
  const demoData = useDemoDataSafe();

  const basePath = `/guest/${accessId}`;
  const updatesData = data?.updates;
  const portalSettings = data?.portal_settings;
  const allUpdates = updatesData?.updates || [];
  const alertBanner = updatesData?.alert_banner || null;
  const unreadCount = updatesData?.unread_count || allUpdates.filter((u) => !u.is_read).length;
  const savedCount = updatesData?.saved_count || allUpdates.filter((u) => u.is_saved).length;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  allUpdates.forEach((u) => {
    categoryCounts[u.category] = (categoryCounts[u.category] || 0) + 1;
  });

  // Filter updates
  const filteredUpdates = (() => {
    let result = allUpdates;
    if (activeFilter === 'unread') result = result.filter((u) => !u.is_read);
    else if (activeFilter === 'saved') result = result.filter((u) => u.is_saved);
    else if (activeFilter !== 'all') result = result.filter((u) => u.category === activeFilter);
    return result;
  })();

  const primaryGuest = data?.recipients?.[0];

  const callInteract = useCallback(async (action: string, params: Record<string, unknown>) => {
    // In demo mode, simulate locally without calling the Edge Function
    if (isDemo || !accessId) {
      return { ok: true, success: true, simulated: true };
    }
    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action, ...params }),
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  }, [accessId, isDemo]);

  const handleToggleRead = useCallback(async (update: GuestUpdate) => {
    if (!primaryGuest) return;
    const updateId = update.id;
    setMutatingIds((prev) => new Set(prev).add(updateId));

    if (isDemo) {
      // In demo mode, just toggle optimistically without calling Edge Function
      await new Promise((r) => setTimeout(r, 300));
    } else {
      await callInteract(update.is_read ? 'mark_unread' : 'mark_read', {
        update_id: update.id,
        guest_id: primaryGuest.guest_id,
      });
    }
    setMutatingIds((prev) => {
      const next = new Set(prev);
      next.delete(updateId);
      return next;
    });
    await refresh();
  }, [primaryGuest, callInteract, refresh, isDemo]);

  const handleToggleSaved = useCallback(async (update: GuestUpdate) => {
    if (!primaryGuest) return;
    const updateId = update.id;
    setMutatingIds((prev) => new Set(prev).add(updateId));

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 300));
    } else {
      await callInteract('toggle_saved', {
        update_id: update.id,
        guest_id: primaryGuest.guest_id,
      });
    }
    setMutatingIds((prev) => {
      const next = new Set(prev);
      next.delete(updateId);
      return next;
    });
    await refresh();
  }, [primaryGuest, callInteract, refresh, isDemo]);

  const handleMarkAllRead = useCallback(async () => {
    if (!primaryGuest) return;
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 400));
    } else {
      await callInteract('mark_all_read', { guest_id: primaryGuest.guest_id });
    }
    await refresh();
  }, [primaryGuest, callInteract, refresh, isDemo]);

  const handleDismissBanner = useCallback(async () => {
    if (!primaryGuest || !alertBanner) return;
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 300));
    } else {
      await callInteract('dismiss_banner', { update_id: alertBanner.update_id, guest_id: primaryGuest.guest_id });
    }
    await refresh();
  }, [primaryGuest, alertBanner, callInteract, refresh, isDemo]);

  // Loading
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <div className="h-8 w-48 bg-secondary-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-secondary-100 rounded mx-auto animate-pulse" />
        </div>
        <UpdatesSkeleton />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-red-600">{error || 'Could not load updates.'}</p>
      </div>
    );
  }

  // Disabled
  if (!portalSettings?.show_updates) {
    return <UpdatesDisabled />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Alert Banner */}
      {alertBanner && (
        <AlertBannerBar banner={alertBanner} basePath={basePath} onDismiss={handleDismissBanner} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Wedding updates</h1>
          <p className="text-sm text-foreground-500">
            {allUpdates.length > 0
              ? `${allUpdates.length} update${allUpdates.length !== 1 ? 's' : ''}`
              : 'Important news, reminders and changes shared by the couple and wedding team.'}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 text-[11px] font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-check-double-line text-xs" /> Mark all read
            </button>
          )}
          <Link
            to={`${basePath}/updates/saved`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 text-[11px] font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-bookmark-line text-xs" />
            {savedCount > 0 ? `Saved (${savedCount})` : 'Saved'}
          </Link>
          <Link
            to={`${basePath}/updates/unread`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 text-[11px] font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-mail-unread-line text-xs" />
            Unread
          </Link>
        </div>
      </div>

      {/* Category filters */}
      {allUpdates.length > 0 && (
        <div className="mb-6">
          <CategoryFilters
            selected={activeFilter}
            onSelect={setActiveFilter}
            counts={categoryCounts}
            unreadCount={unreadCount}
            savedCount={savedCount}
          />
        </div>
      )}

      {/* Content */}
      {allUpdates.length === 0 ? (
        <UpdatesEmpty filterActive={false} />
      ) : filteredUpdates.length === 0 ? (
        <UpdatesEmpty filterActive />
      ) : (
        <div className="space-y-4">
          {/* Urgent pinned at top */}
          {filteredUpdates
            .filter((u) => u.priority === 'urgent' || u.priority === 'emergency')
            .map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                basePath={basePath}
                onToggleRead={() => handleToggleRead(update)}
                onToggleSaved={() => handleToggleSaved(update)}
                isMutating={mutatingIds.has(update.id)}
              />
            ))}
          {/* Standard + important */}
          {filteredUpdates
            .filter((u) => u.priority !== 'urgent' && u.priority !== 'emergency')
            .map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                basePath={basePath}
                onToggleRead={() => handleToggleRead(update)}
                onToggleSaved={() => handleToggleSaved(update)}
                isMutating={mutatingIds.has(update.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}