import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { DemoActivityEvent } from '@/demo/demoTypes';

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

const ACTIVITY_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'ri-history-line' },
  { key: 'rsvp', label: 'RSVP', icon: 'ri-check-double-line' },
  { key: 'guests', label: 'Guests', icon: 'ri-group-line' },
  { key: 'invitation', label: 'Invitations', icon: 'ri-mail-send-line' },
  { key: 'dietary', label: 'Dietary', icon: 'ri-restaurant-line' },
  { key: 'payments', label: 'Payments', icon: 'ri-bank-card-line' },
  { key: 'gallery', label: 'Gallery', icon: 'ri-image-line' },
  { key: 'seating', label: 'Seating', icon: 'ri-layout-grid-line' },
  { key: 'tasks', label: 'Tasks', icon: 'ri-calendar-check-line' },
  { key: 'travel', label: 'Travel', icon: 'ri-map-pin-line' },
  { key: 'updates', label: 'Updates', icon: 'ri-notification-3-line' },
  { key: 'system', label: 'System', icon: 'ri-settings-3-line' },
];

function getCategoryIcon(category: string): string {
  const found = ACTIVITY_CATEGORIES.find((c) => c.key === category);
  return found?.icon || 'ri-information-line';
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'rsvp': return 'bg-accent-100 text-accent-600';
    case 'guests': return 'bg-primary-100 text-primary-600';
    case 'invitation': return 'bg-accent-100 text-accent-600';
    case 'dietary': return 'bg-secondary-100 text-secondary-600';
    case 'payments': return 'bg-emerald-100 text-emerald-600';
    case 'gallery': return 'bg-primary-100 text-primary-600';
    case 'seating': return 'bg-secondary-100 text-secondary-600';
    case 'tasks': return 'bg-amber-100 text-amber-600';
    case 'travel': return 'bg-primary-100 text-primary-600';
    case 'updates': return 'bg-accent-100 text-accent-600';
    default: return 'bg-background-100 text-foreground-400';
  }
}

function DemoActivityCentre() {
  const demoData = useDemoDataSafe();
  const activityFeed: DemoActivityEvent[] = demoData?.state.activityFeed || [];

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...activityFeed];
    if (category !== 'all') result = result.filter((a) => a.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.message.toLowerCase().includes(q) || a.related_guest.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activityFeed, category, search]);

  const categoriesWithCount = useMemo(() => {
    return ACTIVITY_CATEGORIES.map((cat) => ({
      ...cat,
      count: cat.key === 'all' ? activityFeed.length : activityFeed.filter((a) => a.category === cat.key).length,
    }));
  }, [activityFeed]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">Wedding history</p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Activity</h1>
          <p className="text-sm text-foreground-500 mt-1">
            A record of important changes across your wedding workspace.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-sm">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categoriesWithCount.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  category === cat.key
                    ? 'bg-primary-500 text-background-50'
                    : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                }`}
              >
                <i className={`${cat.icon} text-[10px]`} />
                {cat.label}
                {cat.count > 0 && <span className="text-[10px] opacity-70">({cat.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Activity timeline */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-history-line text-2xl" />
            </div>
            <p className="text-sm font-label font-medium text-foreground-600 mb-1">
              No activity found
            </p>
            <p className="text-xs text-foreground-400">
              {search || category !== 'all' ? 'Try adjusting your filters' : 'Activity will appear as you use Vowora'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-secondary-200 hidden sm:block" />

            <div className="space-y-1">
              {filtered.map((a: DemoActivityEvent, idx: number) => {
                const prevDate = idx > 0 ? new Date(filtered[idx - 1].timestamp).toDateString() : null;
                const thisDate = new Date(a.timestamp).toDateString();
                const showDate = prevDate !== thisDate;

                return (
                  <div key={a.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 py-4 pl-0 sm:pl-14">
                        <span className="px-3 py-1 rounded-full bg-background-100 text-xs font-label text-foreground-500">
                          {new Date(a.timestamp).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-4 pl-0 sm:pl-12 py-2">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${getCategoryColor(a.category)}`}>
                        <i className={`${getCategoryIcon(a.category)} text-sm`} />
                      </div>
                      <div className="flex-1 min-w-0 bg-white border border-secondary-100 rounded-xl p-4">
                        <p className="text-sm text-foreground-700 leading-relaxed">{a.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-foreground-400 font-label">{timeAgo(a.timestamp)}</span>
                          {a.related_guest && (
                            <span className="text-[10px] text-foreground-400">
                              <i className="ri-user-line mr-1" />
                              {a.related_guest}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-label ${getCategoryColor(a.category)}`}>
                            {ACTIVITY_CATEGORIES.find((c) => c.key === a.category)?.label || a.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Demo notice */}
        {isDemoMode && (
          <div className="mt-8 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <p className="text-xs text-amber-700 font-label">
              <i className="ri-information-line mr-1.5" />
              Demo activity log — updates as you interact with the demo workspace.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ActivityPage() {
  if (isDemoMode) return <DemoActivityCentre />;
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-20 text-center">
        <p className="text-sm text-foreground-500">Activity history is available in the production workspace.</p>
      </div>
    </AppShell>
  );
}