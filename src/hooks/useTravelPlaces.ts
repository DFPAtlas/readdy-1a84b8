import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { TravelPlace, TravelPlaceFormData, DiscoveryResult, TravelStats } from '@/types/travel';
import { CATEGORY_GROUPS } from '@/types/travel';

const EDGE_FUNCTION_URL = edgeFunctionUrl('travel-places-discover');

export function useTravelPlaces() {
  const { weddingId, wedding } = useActiveWedding();
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPlaces = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('wedding_local_places')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (err) throw err;
      if (mountedRef.current) setPlaces((data || []) as TravelPlace[]);
    } catch (e: unknown) {
      if (mountedRef.current) setError((e as Error).message || 'Failed to load places');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  const stats: TravelStats = (() => {
    const byCategory: Record<string, number> = {};
    let featured = 0;
    for (const p of places) {
      byCategory[p.place_type] = (byCategory[p.place_type] || 0) + 1;
      if (p.is_featured) featured++;
    }
    return {
      total: places.length,
      approved: places.filter((p) => p.approval_status === 'approved' || p.is_approved).length,
      pending: places.filter((p) => p.approval_status === 'pending').length,
      hidden: places.filter((p) => p.approval_status === 'hidden').length,
      featured,
      byCategory,
    };
  })();

  const createPlace = useCallback(async (form: TravelPlaceFormData): Promise<TravelPlace | null> => {
    if (!weddingId) return null;
    setSaving(true);
    try {
      const insertData = {
        wedding_id: weddingId,
        name: form.name.trim(),
        place_type: form.place_type,
        description: form.description.trim() || null,
        address_line_1: form.address_line_1.trim() || null,
        city: form.city.trim() || null,
        postcode: form.postcode.trim() || null,
        country: form.country.trim() || null,
        website: form.website.trim() || null,
        telephone: form.telephone.trim() || null,
        couple_note: form.couple_note.trim() || null,
        approval_status: form.approval_status,
        is_approved: form.approval_status === 'approved',
        is_featured: form.is_featured,
        price_level: form.price_level || null,
        distance_from_venue: form.distance_from_venue ? parseFloat(form.distance_from_venue) : null,
        estimated_travel_time: form.estimated_travel_time ? parseInt(form.estimated_travel_time, 10) : null,
        opening_info: form.opening_info.trim() || null,
        accessibility_info: form.accessibility_info.trim() || null,
        sort_order: places.length,
      };
      const { data, error: err } = await supabase.from('wedding_local_places').insert(insertData).select('*').single();
      if (err) throw err;
      const newPlace = data as TravelPlace;
      if (mountedRef.current) setPlaces((prev) => [...prev, newPlace]);
      return newPlace;
    } catch (e: unknown) {
      throw e;
    } finally {
      setSaving(false);
    }
  }, [weddingId, places.length]);

  const updatePlace = useCallback(async (id: string, updates: Partial<TravelPlace>): Promise<void> => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if ('approval_status' in updates) {
        updateData.is_approved = updates.approval_status === 'approved';
      }
      const { error: err } = await supabase.from('wedding_local_places').update(updateData).eq('id', id).eq('wedding_id', weddingId);
      if (err) throw err;
      if (mountedRef.current) {
        setPlaces((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
      }
    } catch (e: unknown) {
      throw e;
    } finally {
      setSaving(false);
    }
  }, [weddingId]);

  const deletePlace = useCallback(async (id: string): Promise<void> => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.from('wedding_local_places').delete().eq('id', id).eq('wedding_id', weddingId);
      if (err) throw err;
      if (mountedRef.current) setPlaces((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      throw e;
    } finally {
      setSaving(false);
    }
  }, [weddingId]);

  const bulkApprove = useCallback(async (ids: string[]): Promise<void> => {
    if (!weddingId || ids.length === 0) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.from('wedding_local_places')
        .update({ approval_status: 'approved', is_approved: true })
        .in('id', ids)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      if (mountedRef.current) {
        setPlaces((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, approval_status: 'approved', is_approved: true } : p));
      }
    } catch (e: unknown) {
      throw e;
    } finally {
      setSaving(false);
    }
  }, [weddingId]);

  const bulkHide = useCallback(async (ids: string[]): Promise<void> => {
    if (!weddingId || ids.length === 0) return;
    setSaving(true);
    try {
      await supabase.from('wedding_local_places')
        .update({ approval_status: 'hidden', is_approved: false })
        .in('id', ids)
        .eq('wedding_id', weddingId);
      if (mountedRef.current) {
        setPlaces((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, approval_status: 'hidden', is_approved: false } : p));
      }
    } finally {
      setSaving(false);
    }
  }, [weddingId]);

  // ── Discovery ──
  const discoverPlaces = useCallback(async (params: {
    venue_lat: number;
    venue_lng: number;
    radius_miles?: number;
    category?: string;
    query?: string;
  }): Promise<{ results: DiscoveryResult[]; error?: string }> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return { results: [], error: 'Not authenticated' };

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'search', wedding_id: weddingId, ...params }),
      });
      const json = await res.json();
      if (!json.success) return { results: [], error: json.message || json.error };
      return { results: json.results as DiscoveryResult[] };
    } catch (e: unknown) {
      return { results: [], error: (e as Error).message };
    }
  }, [weddingId]);

  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number; formatted: string } | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return null;
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'geocode', wedding_id: weddingId, address }),
      });
      const json = await res.json();
      if (!json.success) return null;
      return { lat: json.result.latitude, lng: json.result.longitude, formatted: json.result.formatted_address };
    } catch {
      return null;
    }
  }, [weddingId]);

  return {
    places, loading, error, saving, stats,
    fetchPlaces, createPlace, updatePlace, deletePlace,
    bulkApprove, bulkHide,
    discoverPlaces, geocodeAddress,
  };
}