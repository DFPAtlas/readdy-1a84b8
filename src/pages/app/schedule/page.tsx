import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useWeddingEvents, getEventTypeLabel, getEventTypeIcon, getVisibilityLabel, getStatusLabel, EVENT_TYPE_OPTIONS, EVENT_VISIBILITY_OPTIONS, EVENT_STATUS_OPTIONS } from '@/hooks/useWeddingEvents';
import type { WeddingEvent, WeddingVenue } from '@/hooks/useWeddingEvents';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import SummaryCards from './components/SummaryCards';
import EventDrawer from './components/EventDrawer';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';

// ── Helpers ──

function formatTimeRange(startAt: string | null, endAt: string | null): string {
  if (!startAt) return 'Time TBC';
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const start = new Date(startAt);
  if (!endAt) return fmt(start);
  const end = new Date(endAt);
  return `${fmt(start)} – ${fmt(end)}`;
}

function groupEventsByDay(events: WeddingEvent[]): { date: string; label: string; events: WeddingEvent[] }[] {
  const groups = new Map<string, WeddingEvent[]>();
  const unscheduled: WeddingEvent[] = [];

  for (const evt of events) {
    if (!evt.start_at) {
      unscheduled.push(evt);
      continue;
    }
    const dateKey = evt.start_at.slice(0, 10);
    const existing = groups.get(dateKey) || [];
    existing.push(evt);
    groups.set(dateKey, existing);
  }

  const result: { date: string; label: string; events: WeddingEvent[] }[] = [];
  const sortedKeys = Array.from(groups.keys()).sort();
  for (const key of sortedKeys) {
    const evts = groups.get(key)!;
    evts.sort((a, b) => {
      if (!a.start_at) return 1;
      if (!b.start_at) return -1;
      return a.start_at.localeCompare(b.start_at);
    });
    const d = new Date(key + 'T12:00:00');
    const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    result.push({ date: key, label, events: evts });
  }

  if (unscheduled.length > 0) {
    result.push({ date: '', label: 'Unscheduled', events: unscheduled });
  }

  return result;
}

// ── Main page ──

export default function SchedulePage() {
  const navigate = useNavigate();
  const { wedding, weddingId } = useActiveWedding();
  const demo = useDemoDataSafe();
  const demoMode = isDemoMode && !!demo;

  const {
    events,
    venues,
    loading,
    saving,
    error,
    createEvent,
    updateEvent,
    duplicateEvent,
    archiveEvent,
    publishEvent,
    hideEvent,
    cancelEvent,
    refetch,
  } = useWeddingEvents();

  // ── UI state ──
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WeddingEvent | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtered events ──
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = e.name.toLowerCase().includes(q);
        const matchesVenue = e.venue?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesVenue) return false;
      }
      if (filterType !== 'all' && e.event_type !== filterType) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterVisibility !== 'all' && e.visibility !== filterVisibility) return false;
      return true;
    });
  }, [events, searchQuery, filterType, filterStatus, filterVisibility]);

  const groupedEvents = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);

  // ── Summary stats ──
  const summary = useMemo(() => ({
    total: events.length,
    published: events.filter((e) => e.status === 'published').length,
    draft: events.filter((e) => e.status === 'draft').length,
    missingInfo: events.filter((e) => !e.start_at || !e.venue_id).length,
  }), [events]);

  // ── Handlers ──

  const handleAddEvent = () => {
    setEditingEvent(null);
    setDrawerOpen(true);
  };

  const handleEditEvent = (event: WeddingEvent) => {
    setEditingEvent(event);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async (data: Partial<WeddingEvent>) => {
    if (editingEvent) {
      const ok = await updateEvent(editingEvent.id, data);
      if (ok) {
        showToast('Event updated');
        handleCloseDrawer();
      } else {
        showToast('Failed to update event', 'error');
      }
    } else {
      const created = await createEvent(data);
      if (created) {
        showToast('Event created');
        handleCloseDrawer();
      } else {
        showToast('Failed to create event', 'error');
      }
    }
  };

  const handleDuplicate = async (eventId: string) => {
    await duplicateEvent(eventId);
    showToast('Event duplicated');
  };

  const handlePublish = async (eventId: string) => {
    await publishEvent(eventId);
    showToast('Event published — visible to guests');
  };

  const handleHide = async (eventId: string) => {
    await hideEvent(eventId);
    showToast('Event hidden from guests');
  };

  const handleCancel = async (eventId: string) => {
    await cancelEvent(eventId);
    showToast('Event cancelled');
  };

  const handleArchive = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event?.status === 'published') {
      setDeleteConfirm(eventId);
      return;
    }
    await archiveEvent(eventId);
    showToast('Event archived');
  };

  const confirmArchive = async () => {
    if (!deleteConfirm) return;
    await archiveEvent(deleteConfirm);
    showToast('Event archived');
    setDeleteConfirm(null);
  };

  const handlePreview = () => {
    if (demoMode) {
      navigate('/guest/demo-session/itinerary');
    } else if (wedding?.slug) {
      // Navigate to guest itinerary preview if available
      showToast('Guest itinerary preview coming soon', 'error');
    } else {
      showToast('No preview available — publish your wedding first', 'error');
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-background-200 rounded" />
            <div className="h-4 w-96 bg-background-200 rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-background-200 rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-background-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-400 mb-6">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={refetch} className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-md text-sm font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm flex-shrink-0`} />
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer">
              <i className="ri-close-line" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Wedding planning</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Schedule &amp; Events</h1>
            <p className="text-sm text-foreground-500 mt-1">Published events appear in your guests&apos; itinerary and can be included in RSVP questions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-eye-line mr-1.5" />Preview guest itinerary
            </button>
            <button
              onClick={handleAddEvent}
              className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line mr-1.5" />Add event
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <SummaryCards summary={summary} />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-400" />
            <input
              type="text"
              placeholder="Search by event name or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 bg-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              <option value="all">All types</option>
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              <option value="all">All statuses</option>
              {EVENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              <option value="all">All visibility</option>
              {EVENT_VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-secondary-200 bg-white overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-2 text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'timeline' ? 'bg-primary-100 text-primary-700' : 'text-foreground-500 hover:bg-background-50'}`}
              >
                <i className="ri-timeline-view mr-1" />Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-foreground-500 hover:bg-background-50'}`}
              >
                <i className="ri-list-check mr-1" />List
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-secondary-100">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-calendar-event-line text-2xl" />
            </div>
            <h2 className="font-heading text-lg text-foreground-700 mb-1">
              {events.length === 0 ? 'Create your first event' : 'No events match your filters'}
            </h2>
            <p className="text-sm text-foreground-500 mb-6">
              {events.length === 0
                ? 'Add ceremony, reception, and other events to build your wedding day schedule.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {events.length === 0 && (
              <button
                onClick={handleAddEvent}
                className="px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-1.5" />Add your first event
              </button>
            )}
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView
            groupedEvents={groupedEvents}
            onEdit={handleEditEvent}
            onDuplicate={handleDuplicate}
            onPublish={handlePublish}
            onHide={handleHide}
            onCancel={handleCancel}
            onArchive={handleArchive}
          />
        ) : (
          <ListView
            events={filteredEvents}
            onEdit={handleEditEvent}
            onDuplicate={handleDuplicate}
            onPublish={handlePublish}
            onHide={handleHide}
            onCancel={handleCancel}
            onArchive={handleArchive}
          />
        )}

        {/* Event drawer */}
        {drawerOpen && (
          <EventDrawer
            event={editingEvent}
            venues={venues}
            onSave={handleSaveEvent}
            onClose={handleCloseDrawer}
            saving={saving}
          />
        )}

        {/* Archive confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
                <i className="ri-error-warning-line text-xl" />
              </div>
              <h3 className="font-heading text-base text-foreground-900 text-center mb-2">Archive this event?</h3>
              <p className="text-sm text-foreground-500 text-center mb-6">
                This event is currently published. Archiving will remove it from the guest itinerary. This action can be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-label font-semibold hover:bg-amber-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Archive event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}