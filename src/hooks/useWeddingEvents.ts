import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { DemoWeddingEvent, DemoEventAudience } from '@/demo/demoTypes';

// ── Types matching wedding_events schema ──

export interface WeddingEvent {
  id: string;
  wedding_id: string;
  venue_id: string | null;
  name: string;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  guest_description: string | null;
  start_at: string | null;
  end_at: string | null;
  visibility: string;
  reveal_at: string | null;
  dress_code: string | null;
  arrival_notes: string | null;
  arrival_offset_minutes: number;
  parking_notes: string | null;
  transport_notes: string | null;
  accessibility_notes: string | null;
  children_notes: string | null;
  status: string;
  published_at: string | null;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined venue
  venue?: {
    id: string;
    name: string;
    address_line_1: string | null;
    city: string | null;
    county_or_region: string | null;
    postcode: string | null;
    country: string | null;
  } | null;
}

export interface WeddingVenue {
  id: string;
  wedding_id: string;
  venue_type: string;
  name: string;
  address_line_1: string | null;
  city: string | null;
  county_or_region: string | null;
  postcode: string | null;
  country: string | null;
}

export interface EventAudience {
  id: string;
  wedding_id: string;
  event_id: string;
  audience_type: string;
  audience_reference_id: string | null;
  created_at: string;
}

export interface UseWeddingEventsReturn {
  events: WeddingEvent[];
  venues: WeddingVenue[];
  audiences: EventAudience[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  createEvent: (data: Partial<WeddingEvent>) => Promise<WeddingEvent | null>;
  updateEvent: (eventId: string, data: Partial<WeddingEvent>) => Promise<boolean>;
  duplicateEvent: (eventId: string) => Promise<WeddingEvent | null>;
  archiveEvent: (eventId: string) => Promise<boolean>;
  publishEvent: (eventId: string) => Promise<boolean>;
  hideEvent: (eventId: string) => Promise<boolean>;
  cancelEvent: (eventId: string) => Promise<boolean>;
  addAudience: (data: Partial<EventAudience>) => Promise<EventAudience | null>;
  removeAudience: (audienceId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// ── Visibility and status options ──

export const EVENT_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Everyone with portal access' },
  { value: 'invitation_holders', label: 'Invitation holders' },
  { value: 'included_guests', label: 'Only guests included for this event type' },
  { value: 'reveal_on_date', label: 'Reveal on a chosen date' },
  { value: 'hidden', label: 'Hidden from guests' },
] as const;

export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
] as const;

export const EVENT_TYPE_OPTIONS = [
  { value: 'ceremony', label: 'Ceremony', icon: 'ri-heart-line' },
  { value: 'reception', label: 'Reception', icon: 'ri-cake-line' },
  { value: 'evening', label: 'Evening', icon: 'ri-moon-line' },
  { value: 'welcome', label: 'Welcome', icon: 'ri-drinks-line' },
  { value: 'day_after', label: 'Day After', icon: 'ri-sun-line' },
  { value: 'other', label: 'Other', icon: 'ri-calendar-event-line' },
] as const;

function getEventTypeIcon(eventType: string): string {
  const found = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
  return found?.icon || 'ri-calendar-event-line';
}

function getEventTypeLabel(eventType: string): string {
  const found = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
  return found?.label || eventType;
}

function getVisibilityLabel(visibility: string): string {
  const found = EVENT_VISIBILITY_OPTIONS.find((o) => o.value === visibility);
  return found?.label || visibility;
}

function getStatusLabel(status: string): string {
  const found = EVENT_STATUS_OPTIONS.find((o) => o.value === status);
  return found?.label || status;
}

export {
  getEventTypeIcon,
  getEventTypeLabel,
  getVisibilityLabel,
  getStatusLabel,
};

// ── Helpers: convert demo events to WeddingEvent shape ──

function demoEventToWeddingEvent(de: DemoWeddingEvent): WeddingEvent {
  return {
    id: de.id,
    wedding_id: de.wedding_id,
    venue_id: de.venue_id || null,
    name: de.name,
    event_type: de.event_type,
    event_date: de.start_at ? de.start_at.slice(0, 10) : null,
    start_time: de.start_at ? de.start_at.slice(11, 16) : null,
    end_time: de.end_at ? de.end_at.slice(11, 16) : null,
    description: de.description || null,
    guest_description: de.guest_description || null,
    start_at: de.start_at || null,
    end_at: de.end_at || null,
    visibility: de.visibility || 'public',
    reveal_at: de.reveal_at || null,
    dress_code: de.dress_code || null,
    arrival_notes: null,
    arrival_offset_minutes: de.arrival_offset_minutes || 0,
    parking_notes: de.parking_notes || null,
    transport_notes: de.transport_notes || null,
    accessibility_notes: de.accessibility_notes || null,
    children_notes: de.children_notes || null,
    status: de.status || 'draft',
    published_at: de.published_at || null,
    is_public: de.is_public,
    sort_order: de.sort_order || 0,
    created_at: '',
    updated_at: '',
    venue: de.venue_id ? {
      id: de.venue_id,
      name: de.venue_name || '',
      address_line_1: null,
      city: de.venue_city || null,
      county_or_region: null,
      postcode: null,
      country: null,
    } : null,
  };
}

function demoVenueToWeddingVenue(dv: { id: string; wedding_id: string; venue_type: string; name: string; address_line_1: string; city: string; county_or_region: string; postcode: string; country: string }): WeddingVenue {
  return {
    id: dv.id,
    wedding_id: dv.wedding_id,
    venue_type: dv.venue_type,
    name: dv.name,
    address_line_1: dv.address_line_1 || null,
    city: dv.city || null,
    county_or_region: dv.county_or_region || null,
    postcode: dv.postcode || null,
    country: dv.country || null,
  };
}

function demoAudienceToEventAudience(da: DemoEventAudience): EventAudience {
  return {
    id: da.id,
    wedding_id: da.wedding_id,
    event_id: da.event_id,
    audience_type: da.audience_type,
    audience_reference_id: da.audience_reference_id,
    created_at: da.created_at,
  };
}

// ── Main hook ──

export function useWeddingEvents(): UseWeddingEventsReturn {
  const { weddingId } = useActiveWedding();
  const demo = useDemoDataSafe();
  const demoMode = isDemoMode && !!demo;

  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [venues, setVenues] = useState<WeddingVenue[]>([]);
  const [audiences, setAudiences] = useState<EventAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  // ── Fetch (Supabase) ──

  const fetchFromSupabase = useCallback(async () => {
    if (!weddingId) {
      setEvents([]);
      setVenues([]);
      setAudiences([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [eventsRes, venuesRes] = await Promise.all([
        supabase
          .from('wedding_events')
          .select('*, venue:wedding_venues(id, name, address_line_1, city, county_or_region, postcode, country)')
          .eq('wedding_id', weddingId)
          .order('start_at', { ascending: true, nullsFirst: false })
          .order('sort_order', { ascending: true }),
        supabase
          .from('wedding_venues')
          .select('id, wedding_id, venue_type, name, address_line_1, city, county_or_region, postcode, country')
          .eq('wedding_id', weddingId)
          .order('name'),
      ]);

      if (!mountedRef.current) return;

      if (eventsRes.error) throw eventsRes.error;
      if (venuesRes.error) throw venuesRes.error;

      const evts = (eventsRes.data || []) as unknown as WeddingEvent[];
      setEvents(evts);
      setVenues((venuesRes.data || []) as WeddingVenue[]);

      // Fetch audiences
      const eventIds = evts.map((e) => e.id);
      if (eventIds.length > 0) {
        const { data: audData, error: audErr } = await supabase
          .from('wedding_event_audiences')
          .select('*')
          .in('event_id', eventIds);

        if (!mountedRef.current) return;
        if (!audErr) {
          setAudiences((audData || []) as EventAudience[]);
        }
      } else {
        setAudiences([]);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  // ── Fetch (Demo) ──

  const fetchFromDemo = useCallback(() => {
    if (!demo) return;
    setLoading(true);
    const demoEvents = demo.state.events.map(demoEventToWeddingEvent);
    const demoVenues = demo.state.venues.map(demoVenueToWeddingVenue);
    const demoAudiences = (demo.state.eventAudiences || []).map(demoAudienceToEventAudience);
    setEvents(demoEvents);
    setVenues(demoVenues);
    setAudiences(demoAudiences);
    setLoading(false);
  }, [demo]);

  // ── Initial load ──

  useEffect(() => {
    mountedRef.current = true;
    if (demoMode) {
      fetchFromDemo();
    } else {
      fetchFromSupabase();
    }
    return () => { mountedRef.current = false; };
  }, [demoMode, fetchFromSupabase, fetchFromDemo]);

  // ── Watch demo state changes ──

  useEffect(() => {
    if (!demoMode) return;
    fetchFromDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, demo?.state.events, demo?.state.eventAudiences, demo?.state.venues]);

  // ── Mutations (Supabase) ──

  const createEvent = useCallback(async (data: Partial<WeddingEvent>): Promise<WeddingEvent | null> => {
    if (demoMode && demo) {
      const newId = `demo-event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newEvent: DemoWeddingEvent = {
        id: newId,
        wedding_id: DEMO_CONFIG.weddingId,
        event_type: (data.event_type as string) || 'other',
        name: data.name || 'Untitled Event',
        start_at: data.start_at || null,
        end_at: data.end_at || null,
        venue_id: data.venue_id || '',
        dress_code: data.dress_code || '',
        description: data.description || '',
        guest_description: data.guest_description || '',
        is_public: data.is_public ?? true,
        sort_order: demo.state.events.length + 1,
        visibility: (data.visibility as DemoWeddingEvent['visibility']) || 'public',
        status: (data.status as DemoWeddingEvent['status']) || 'draft',
        reveal_at: data.reveal_at || null,
        published_at: data.published_at || null,
        arrival_offset_minutes: data.arrival_offset_minutes ?? 0,
        parking_notes: data.parking_notes || '',
        transport_notes: data.transport_notes || '',
        accessibility_notes: data.accessibility_notes || '',
        children_notes: data.children_notes || '',
      };
      demo.addEvent(newEvent);
      return demoEventToWeddingEvent(newEvent);
    }

    if (!weddingId) return null;
    setSaving(true);
    try {
      const { data: created, error: createErr } = await supabase
        .from('wedding_events')
        .insert({
          wedding_id: weddingId,
          name: data.name || 'Untitled Event',
          event_type: data.event_type || 'other',
          venue_id: data.venue_id || null,
          description: data.description || null,
          guest_description: data.guest_description || null,
          start_at: data.start_at || null,
          end_at: data.end_at || null,
          visibility: data.visibility || 'public',
          reveal_at: data.reveal_at || null,
          dress_code: data.dress_code || null,
          arrival_offset_minutes: data.arrival_offset_minutes ?? 0,
          parking_notes: data.parking_notes || null,
          transport_notes: data.transport_notes || null,
          accessibility_notes: data.accessibility_notes || null,
          children_notes: data.children_notes || null,
          status: data.status || 'draft',
          published_at: data.published_at || null,
          is_public: data.is_public ?? true,
          sort_order: 0,
        })
        .select('*, venue:wedding_venues(id, name, address_line_1, city, county_or_region, postcode, country)')
        .single();

      if (createErr) throw createErr;
      const evt = created as unknown as WeddingEvent;
      setEvents((prev) => [...prev, evt]);
      return evt;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      return null;
    } finally {
      setSaving(false);
    }
  }, [weddingId, demoMode, demo]);

  const updateEvent = useCallback(async (eventId: string, data: Partial<WeddingEvent>): Promise<boolean> => {
    if (demoMode && demo) {
      const demoUpdates: Partial<DemoWeddingEvent> = {};
      if (data.name !== undefined) demoUpdates.name = data.name;
      if (data.event_type !== undefined) demoUpdates.event_type = data.event_type;
      if (data.start_at !== undefined) demoUpdates.start_at = data.start_at;
      if (data.end_at !== undefined) demoUpdates.end_at = data.end_at;
      if (data.venue_id !== undefined) demoUpdates.venue_id = data.venue_id;
      if (data.dress_code !== undefined) demoUpdates.dress_code = data.dress_code;
      if (data.description !== undefined) demoUpdates.description = data.description;
      if (data.guest_description !== undefined) demoUpdates.guest_description = data.guest_description;
      if (data.visibility !== undefined) demoUpdates.visibility = data.visibility as DemoWeddingEvent['visibility'];
      if (data.status !== undefined) demoUpdates.status = data.status as DemoWeddingEvent['status'];
      if (data.reveal_at !== undefined) demoUpdates.reveal_at = data.reveal_at;
      if (data.published_at !== undefined) demoUpdates.published_at = data.published_at;
      if (data.arrival_offset_minutes !== undefined) demoUpdates.arrival_offset_minutes = data.arrival_offset_minutes;
      if (data.parking_notes !== undefined) demoUpdates.parking_notes = data.parking_notes;
      if (data.transport_notes !== undefined) demoUpdates.transport_notes = data.transport_notes;
      if (data.accessibility_notes !== undefined) demoUpdates.accessibility_notes = data.accessibility_notes;
      if (data.children_notes !== undefined) demoUpdates.children_notes = data.children_notes;
      demo.updateEvent(eventId, demoUpdates);
      return true;
    }

    if (!weddingId) return false;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.event_type !== undefined) updateData.event_type = data.event_type;
      if (data.venue_id !== undefined) updateData.venue_id = data.venue_id;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.guest_description !== undefined) updateData.guest_description = data.guest_description;
      if (data.start_at !== undefined) updateData.start_at = data.start_at;
      if (data.end_at !== undefined) updateData.end_at = data.end_at;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.reveal_at !== undefined) updateData.reveal_at = data.reveal_at;
      if (data.dress_code !== undefined) updateData.dress_code = data.dress_code;
      if (data.arrival_offset_minutes !== undefined) updateData.arrival_offset_minutes = data.arrival_offset_minutes;
      if (data.parking_notes !== undefined) updateData.parking_notes = data.parking_notes;
      if (data.transport_notes !== undefined) updateData.transport_notes = data.transport_notes;
      if (data.accessibility_notes !== undefined) updateData.accessibility_notes = data.accessibility_notes;
      if (data.children_notes !== undefined) updateData.children_notes = data.children_notes;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.published_at !== undefined) updateData.published_at = data.published_at;

      updateData.updated_at = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('wedding_events')
        .update(updateData)
        .eq('id', eventId)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...data } : e)));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      return false;
    } finally {
      setSaving(false);
    }
  }, [weddingId, demoMode, demo]);

  const duplicateEvent = useCallback(async (eventId: string): Promise<WeddingEvent | null> => {
    if (demoMode && demo) {
      demo.duplicateEvent(eventId);
      return null; // refetch will pick up from state change
    }

    const original = events.find((e) => e.id === eventId);
    if (!original || !weddingId) return null;
    setSaving(true);
    try {
      const { data: created, error: createErr } = await supabase
        .from('wedding_events')
        .insert({
          wedding_id: weddingId,
          name: `${original.name} (copy)`,
          event_type: original.event_type,
          venue_id: original.venue_id,
          description: original.description,
          guest_description: original.guest_description,
          start_at: original.start_at,
          end_at: original.end_at,
          visibility: original.visibility,
          reveal_at: null,
          dress_code: original.dress_code,
          arrival_offset_minutes: original.arrival_offset_minutes,
          parking_notes: original.parking_notes,
          transport_notes: original.transport_notes,
          accessibility_notes: original.accessibility_notes,
          children_notes: original.children_notes,
          status: 'draft',
          published_at: null,
          is_public: original.is_public,
          sort_order: 0,
        })
        .select('*, venue:wedding_venues(id, name, address_line_1, city, county_or_region, postcode, country)')
        .single();

      if (createErr) throw createErr;
      const evt = created as unknown as WeddingEvent;
      setEvents((prev) => [...prev, evt]);
      return evt;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate event');
      return null;
    } finally {
      setSaving(false);
    }
  }, [events, weddingId, demoMode, demo]);

  const archiveEvent = useCallback(async (eventId: string): Promise<boolean> => {
    return updateEvent(eventId, { status: 'archived' });
  }, [updateEvent]);

  const publishEvent = useCallback(async (eventId: string): Promise<boolean> => {
    return updateEvent(eventId, { status: 'published', published_at: new Date().toISOString() });
  }, [updateEvent]);

  const hideEvent = useCallback(async (eventId: string): Promise<boolean> => {
    return updateEvent(eventId, { visibility: 'hidden' });
  }, [updateEvent]);

  const cancelEvent = useCallback(async (eventId: string): Promise<boolean> => {
    return updateEvent(eventId, { status: 'cancelled' });
  }, [updateEvent]);

  const addAudience = useCallback(async (data: Partial<EventAudience>): Promise<EventAudience | null> => {
    if (demoMode && demo) {
      const newAud: DemoEventAudience = {
        id: `demo-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        wedding_id: DEMO_CONFIG.weddingId,
        event_id: data.event_id || '',
        audience_type: (data.audience_type as DemoEventAudience['audience_type']) || 'guest',
        audience_reference_id: data.audience_reference_id || '',
        created_at: new Date().toISOString(),
      };
      demo.addEventAudience(newAud);
      return demoAudienceToEventAudience(newAud);
    }

    if (!weddingId) return null;
    try {
      const { data: created, error: createErr } = await supabase
        .from('wedding_event_audiences')
        .insert({
          wedding_id: weddingId,
          event_id: data.event_id,
          audience_type: data.audience_type || 'guest',
          audience_reference_id: data.audience_reference_id || null,
        })
        .select('*')
        .single();

      if (createErr) throw createErr;
      const aud = created as unknown as EventAudience;
      setAudiences((prev) => [...prev, aud]);
      return aud;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add audience');
      return null;
    }
  }, [weddingId, demoMode, demo]);

  const removeAudience = useCallback(async (audienceId: string): Promise<boolean> => {
    if (demoMode && demo) {
      demo.removeEventAudience(audienceId);
      return true;
    }

    try {
      const { error: deleteErr } = await supabase
        .from('wedding_event_audiences')
        .delete()
        .eq('id', audienceId);

      if (deleteErr) throw deleteErr;
      setAudiences((prev) => prev.filter((a) => a.id !== audienceId));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove audience');
      return false;
    }
  }, [demoMode, demo]);

  const refetch = useCallback(async () => {
    if (demoMode) {
      fetchFromDemo();
    } else {
      await fetchFromSupabase();
    }
  }, [demoMode, fetchFromSupabase, fetchFromDemo]);

  return {
    events,
    venues,
    audiences,
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
    addAudience,
    removeAudience,
    refetch,
  };
}