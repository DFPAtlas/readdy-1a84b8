import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useNotifications } from '@/hooks/useNotifications';
import { isDemoMode } from '@/demo/demoConfig';
import type { AppNotification, NotificationFilters, NotificationCategory, NotificationPriority } from '@/types/notifications';
import { NOTIFICATION_CATEGORIES, getNotificationIcon, getPriorityColor, getCategoryBadge } from '@/types/notifications';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DemoNotificationCentre() {
  const { notifications, unreadCount, markRead, markUnread, markAllRead, filteredNotifications, resetNotifications } = useNotifications();
  const demoData = useDemoDataSafe();

  const [filters, setFilters] = useState<NotificationFilters>({
    category: 'all',
    priority: 'all',
    read: 'all',
    search: '',
  });

  const filtered = useMemo(() => filteredNotifications(filters), [filters, filteredNotifications]);

  const priorityCounts = useMemo(() => ({
    urgent: notifications.filter((n) => n.priority === 'urgent').length,
    action: notifications.filter((n) => n.priority === 'action').length,
    info: notifications.filter((n) => n.priority === 'info').length,
  }), [notifications]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">Updates</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Notifications</h1>
              <p className="text-sm text-foreground-500 mt-1">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-check-double-line mr-1.5" />
                  Mark all read
                </button>
              )}
              {isDemoMode && (
                <button
                  onClick={resetNotifications}
                  className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                  title="Reset demo notifications"
                >
                  <i className="ri-restart-line mr-1.5" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Read status tabs */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-background-100 w-fit">
            {(['all', 'unread', 'read'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilters((f) => ({ ...f, read: tab }))}
                className={`px-4 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                  filters.read === tab
                    ? 'bg-white text-foreground-900 shadow-sm'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
              >
                {tab === 'all' && 'All'}
                {tab === 'unread' && `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                {tab === 'read' && 'Read'}
              </button>
            ))}
          </div>

          {/* Search + category + priority */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as NotificationPriority | 'all' }))}
              className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent ({priorityCounts.urgent})</option>
              <option value="action">Action needed ({priorityCounts.action})</option>
              <option value="info">Informational ({priorityCounts.info})</option>
            </select>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilters((f) => ({ ...f, category: 'all' }))}
              className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                filters.category === 'all'
                  ? 'bg-primary-500 text-background-50'
                  : 'bg-background-100 text-foreground-600 hover:bg-background-200'
              }`}
            >
              All
            </button>
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const count = notifications.filter(
                (n) => n.category === cat.key && (filters.read === 'all' || (filters.read === 'unread' ? !n.readAt : n.readAt))
              ).length;
              if (count === 0 && filters.category !== cat.key) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => setFilters((f) => ({ ...f, category: cat.key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filters.category === cat.key
                      ? 'bg-primary-500 text-background-50'
                      : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                  }`}
                >
                  <i className={`${cat.icon} text-[10px]`} />
                  {cat.label}
                  {count > 0 && (
                    <span className="text-[10px] opacity-70">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-notification-off-line text-2xl" />
            </div>
            <p className="text-sm font-label font-medium text-foreground-600 mb-1">
              {filters.read === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
            <p className="text-xs text-foreground-400">
              {filters.search || filters.category !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your filters'
                : 'You\'re all caught up!'}
            </p>
            {(filters.search || filters.category !== 'all' || filters.priority !== 'all') && (
              <button
                onClick={() => setFilters({ category: 'all', priority: 'all', read: 'all', search: '' })}
                className="mt-4 text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n: AppNotification) => (
              <div
                key={n.id}
                className={`rounded-xl border transition-colors ${!n.readAt ? 'bg-primary-50/30 border-primary-100' : 'bg-white border-secondary-100'}`}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 ${getPriorityColor(n.priority)}`}>
                    <i className={`${getNotificationIcon(n.type)} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-label ${getCategoryBadge(n.category)}`}>
                        {NOTIFICATION_CATEGORIES.find((c) => c.key === n.category)?.label || n.category}
                      </span>
                      {n.priority !== 'info' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-label ${n.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {n.priority === 'urgent' ? 'Urgent' : 'Action needed'}
                        </span>
                      )}
                      {!n.readAt && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" title="Unread" />
                      )}
                    </div>
                    <Link
                      to={n.route}
                      onClick={() => markRead(n.id)}
                      className="text-sm font-label font-semibold text-foreground-900 hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      {n.title}
                    </Link>
                    <p className="text-sm text-foreground-500 mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-foreground-400 font-label">{timeAgo(n.createdAt)}</span>
                      <span className="text-[10px] text-foreground-400">from {n.actorName}</span>
                      <span className="text-[10px] text-foreground-300">· {n.weddingName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <Link
                      to={n.route}
                      onClick={() => markRead(n.id)}
                      className="px-3 py-1.5 rounded-md bg-primary-500 text-background-50 text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {n.routeLabel || 'View'}
                    </Link>
                    <button
                      onClick={() => (n.readAt ? markUnread(n.id) : markRead(n.id))}
                      className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
                      title={n.readAt ? 'Mark unread' : 'Mark read'}
                    >
                      {n.readAt ? 'Unread' : 'Read'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function NotificationsPage() {
  return <DemoNotificationCentre />;
}