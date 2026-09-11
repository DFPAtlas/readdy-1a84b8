import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AppNotification, NotificationFilters } from '@/types/notifications';
import { isDemoMode } from '@/demo/demoConfig';
import { demoNotifications } from '@/demo/demoNotifications';

const DEMO_NOTIF_STORAGE_KEY = 'vowora.demo.notifications.v1';

function loadDemoNotifications(): AppNotification[] {
  if (!isDemoMode) return demoNotifications;
  try {
    const raw = localStorage.getItem(DEMO_NOTIF_STORAGE_KEY);
    if (!raw) return [...demoNotifications];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [...demoNotifications];
  } catch {
    return [...demoNotifications];
  }
}

function saveDemoNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(DEMO_NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  } catch { /* storage full — ignore */ }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadDemoNotifications());

  useEffect(() => {
    if (isDemoMode) saveDemoNotifications(notifications);
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }, []);

  const markUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && n.readAt ? { ...n, readAt: null } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (!n.readAt ? { ...n, readAt: now } : n)));
  }, []);

  const filteredNotifications = useCallback(
    (filters: NotificationFilters) => {
      let result = [...notifications];
      if (filters.read === 'unread') result = result.filter((n) => !n.readAt);
      else if (filters.read === 'read') result = result.filter((n) => n.readAt);
      if (filters.category !== 'all') result = result.filter((n) => n.category === filters.category);
      if (filters.priority !== 'all') result = result.filter((n) => n.priority === filters.priority);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.message.toLowerCase().includes(q) ||
            n.actorName.toLowerCase().includes(q),
        );
      }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return result;
    },
    [notifications],
  );

  const resetNotifications = useCallback(() => {
    const fresh = [...demoNotifications];
    setNotifications(fresh);
    if (isDemoMode) saveDemoNotifications(fresh);
  }, []);

  return {
    notifications,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    filteredNotifications,
    resetNotifications,
    loading: false,
    error: null,
  };
}