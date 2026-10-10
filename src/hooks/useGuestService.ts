import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type {
  Guest,
  GuestHousehold,
  GuestTag,
  GuestTagAssignment,
  GuestFilters,
} from '@/types/guest';

// ── Types ──

export interface GuestListResult {
  guests: Guest[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface GuestStats {
  total: number;
  attending: number;
  awaiting: number;
  declined: number;
  households: number;
  dayGuests: number;
  eveningOnly: number;
  children: number;
  plusOnes: number;
  missingContact: number;
  notReady: number;
  dietaryCount: number;
  allergyCount: number;
  accessibilityCount: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface DuplicateCheck {
  matches: Guest[];
}

// ── Hook ──

export function useGuestService() {
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetError = () => setError('');

  // ──── GUEST CRUD ────

  const listGuests = useCallback(async (filters: GuestFilters): Promise<GuestListResult> => {
    if (!weddingId) return { guests: [], totalCount: 0, page: filters.page, pageSize: filters.pageSize };
    setLoading(true);
    setError('');

    try {
      let q = supabase
        .from('guests')
        .select('*', { count: 'exact' })
        .eq('wedding_id', weddingId);

      if (filters.status) q = q.eq('status', filters.status);
      if (filters.household_id) q = q.eq('household_id', filters.household_id);
      if (filters.guest_type) q = q.eq('guest_type', filters.guest_type);
      if (filters.invitation_group) q = q.eq('invitation_group', filters.invitation_group);

      if (filters.search) {
        const s = filters.search;
        q = q.or(`full_name.ilike.%${s}%,last_name.ilike.%${s}%,preferred_name.ilike.%${s}%,email.ilike.%${s}%`);
      }

      if (filters.contact_complete === 'complete') q = q.or('email.not.is.null,mobile_phone.not.is.null');
      else if (filters.contact_complete === 'missing') q = q.is('email', null).is('mobile_phone', null);

      const sortMap: Record<string, { col: string; asc: boolean }> = {
        full_name_asc: { col: 'full_name', asc: true },
        full_name_desc: { col: 'full_name', asc: false },
        created_at_desc: { col: 'created_at', asc: false },
        created_at_asc: { col: 'created_at', asc: true },
        household_asc: { col: 'full_name', asc: true },
      };
      const s = sortMap[filters.sort] || { col: 'full_name', asc: true };
      q = q.order(s.col, { ascending: s.asc });

      const from = (filters.page - 1) * filters.pageSize;
      q = q.range(from, from + filters.pageSize - 1);

      const { data, count, error: err } = await q;
      if (err) throw err;

      return {
        guests: (data || []) as Guest[],
        totalCount: count || 0,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load guests';
      setError(msg);
      return { guests: [], totalCount: 0, page: filters.page, pageSize: filters.pageSize };
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  const getGuest = useCallback(async (guestId: string): Promise<Guest | null> => {
    if (!weddingId) return null;
    try {
      const { data } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .maybeSingle();
      return data as Guest | null;
    } catch {
      return null;
    }
  }, [weddingId]);

  const createGuest = useCallback(async (payload: Partial<Guest>): Promise<Guest | null> => {
    if (!weddingId) return null;
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('guests')
        .insert({ ...payload, wedding_id: weddingId })
        .select('*')
        .single();
      if (err) throw err;
      return data as Guest;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create guest');
      return null;
    }
  }, [weddingId]);

  const updateGuest = useCallback(async (guestId: string, payload: Partial<Guest>): Promise<boolean> => {
    if (!weddingId) return false;
    setError('');
    try {
      const updatePayload = { ...payload };
      delete updatePayload.id;
      delete updatePayload.wedding_id;
      delete updatePayload.created_at;
      delete updatePayload.created_by;
      const { error: err } = await supabase
        .from('guests')
        .update(updatePayload)
        .eq('id', guestId)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update guest');
      return false;
    }
  }, [weddingId]);

  const archiveGuest = useCallback(async (guestIds: string[]): Promise<boolean> => {
    if (!weddingId || guestIds.length === 0) return false;
    setError('');
    try {
      const now = new Date().toISOString();
      const { error: err } = await supabase
        .from('guests')
        .update({ status: 'archived', archived_at: now })
        .in('id', guestIds)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
      return false;
    }
  }, [weddingId]);

  const restoreGuest = useCallback(async (guestIds: string[]): Promise<boolean> => {
    if (!weddingId || guestIds.length === 0) return false;
    setError('');
    try {
      const { error: err } = await supabase
        .from('guests')
        .update({ status: 'active', archived_at: null })
        .in('id', guestIds)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
      return false;
    }
  }, [weddingId]);

  // ──── DUPLICATE DETECTION ────

  const checkDuplicates = useCallback(async (payload: Partial<Guest>): Promise<DuplicateCheck> => {
    if (!weddingId) return { matches: [] };
    try {
      const conditions: string[] = [];
      if (payload.email) conditions.push(`email.eq."${payload.email.replace(/"/g, '\\"')}"`);
      if (payload.mobile_phone) conditions.push(`mobile_phone.eq."${payload.mobile_phone.replace(/"/g, '\\"')}"`);
      if (payload.full_name && payload.last_name) {
        conditions.push(`and(full_name.eq."${payload.full_name.replace(/"/g, '\\"')}",last_name.eq."${payload.last_name.replace(/"/g, '\\"')}")`);
      } else if (payload.full_name) {
        conditions.push(`full_name.eq."${payload.full_name.replace(/"/g, '\\"')}"`);
      }
      if (conditions.length === 0) return { matches: [] };

      const filter = conditions.join(',');
      const { data } = await supabase
        .from('guests')
        .select('id, full_name, last_name, email, mobile_phone, status')
        .eq('wedding_id', weddingId)
        .or(filter)
        .limit(10);
      return { matches: (data || []) as Guest[] };
    } catch {
      return { matches: [] };
    }
  }, [weddingId]);

  // ──── HOUSEHOLDS ────

  const listHouseholds = useCallback(async (status?: string): Promise<GuestHousehold[]> => {
    if (!weddingId) return [];
    try {
      let q = supabase
        .from('guest_households')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('display_name');
      if (status) q = q.eq('status', status);
      const { data } = await q;
      return (data || []) as GuestHousehold[];
    } catch {
      return [];
    }
  }, [weddingId]);

  const createHousehold = useCallback(async (payload: Partial<GuestHousehold>): Promise<GuestHousehold | null> => {
    if (!weddingId) return null;
    try {
      const { data, error: err } = await supabase
        .from('guest_households')
        .insert({ ...payload, wedding_id: weddingId })
        .select('*')
        .single();
      if (err) throw err;
      return data as GuestHousehold;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
      return null;
    }
  }, [weddingId]);

  const updateHousehold = useCallback(async (id: string, payload: Partial<GuestHousehold>): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const updatePayload = { ...payload };
      delete updatePayload.id;
      delete updatePayload.wedding_id;
      const { error: err } = await supabase
        .from('guest_households')
        .update(updatePayload)
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const archiveHousehold = useCallback(async (id: string): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const { error: err } = await supabase
        .from('guest_households')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  // ──── TAGS ────

  const listTags = useCallback(async (): Promise<GuestTag[]> => {
    if (!weddingId) return [];
    try {
      const { data } = await supabase
        .from('guest_tags')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('name');
      return (data || []) as GuestTag[];
    } catch {
      return [];
    }
  }, [weddingId]);

  const createTag = useCallback(async (payload: Partial<GuestTag>): Promise<GuestTag | null> => {
    if (!weddingId) return null;
    try {
      const { data, error: err } = await supabase
        .from('guest_tags')
        .insert({ ...payload, wedding_id: weddingId })
        .select('*')
        .single();
      if (err) throw err;
      return data as GuestTag;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
      return null;
    }
  }, [weddingId]);

  const updateTag = useCallback(async (id: string, payload: Partial<GuestTag>): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const updatePayload = { ...payload };
      delete updatePayload.id;
      delete updatePayload.wedding_id;
      const { error: err } = await supabase
        .from('guest_tags')
        .update(updatePayload)
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const { error: err } = await supabase
        .from('guest_tags')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  // ──── TAG ASSIGNMENTS ────

  const assignTag = useCallback(async (guestId: string, tagId: string): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const { error: err } = await supabase
        .from('guest_tag_assignments')
        .upsert(
          { wedding_id: weddingId, guest_id: guestId, tag_id: tagId },
          { onConflict: 'guest_id,tag_id' },
        );
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const removeTag = useCallback(async (guestId: string, tagId: string): Promise<boolean> => {
    if (!weddingId) return false;
    try {
      const { error: err } = await supabase
        .from('guest_tag_assignments')
        .delete()
        .eq('wedding_id', weddingId)
        .eq('guest_id', guestId)
        .eq('tag_id', tagId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const bulkAssignTag = useCallback(async (guestIds: string[], tagId: string): Promise<boolean> => {
    if (!weddingId || guestIds.length === 0) return false;
    try {
      const inserts = guestIds.map((gid) => ({
        wedding_id: weddingId,
        guest_id: gid,
        tag_id: tagId,
      }));
      const { error: err } = await supabase
        .from('guest_tag_assignments')
        .upsert(inserts, { onConflict: 'guest_id,tag_id' });
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const getGuestTags = useCallback(async (guestId: string): Promise<GuestTag[]> => {
    if (!weddingId) return [];
    try {
      const { data } = await supabase
        .from('guest_tag_assignments')
        .select('tag_id, guest_tags(*)')
        .eq('wedding_id', weddingId)
        .eq('guest_id', guestId);
      return (data || [])
        .map((row) => (Array.isArray(row.guest_tags) ? row.guest_tags[0] : row.guest_tags) as GuestTag)
        .filter(Boolean);
    } catch {
      return [];
    }
  }, [weddingId]);

  // ──── ACTIVITY ────

  const recordActivity = useCallback(async (action: string, summary: string, details?: { guest_id?: string; household_id?: string; metadata?: Record<string, unknown> }): Promise<void> => {
    if (!weddingId) return;
    try {
      await supabase.from('guest_activity_log').insert({
        wedding_id: weddingId,
        guest_id: details?.guest_id || null,
        household_id: details?.household_id || null,
        action,
        summary,
        metadata: details?.metadata || null,
      });
    } catch {
      // Activity logging is best-effort — never block the user
    }
  }, [weddingId]);

  // ──── BULK OPERATIONS ────

  const bulkMoveHousehold = useCallback(async (guestIds: string[], householdId: string | null): Promise<boolean> => {
    if (!weddingId || guestIds.length === 0) return false;
    try {
      const { error: err } = await supabase
        .from('guests')
        .update({ household_id: householdId || null })
        .in('id', guestIds)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  const bulkUpdateGroup = useCallback(async (guestIds: string[], group: string): Promise<boolean> => {
    if (!weddingId || guestIds.length === 0) return false;
    try {
      const { error: err } = await supabase
        .from('guests')
        .update({ invitation_group: group })
        .in('id', guestIds)
        .eq('wedding_id', weddingId);
      if (err) throw err;
      return true;
    } catch {
      return false;
    }
  }, [weddingId]);

  // ──── STATS ────

  const getStats = useCallback(async (): Promise<GuestStats> => {
    if (!weddingId) return { total: 0, attending: 0, awaiting: 0, declined: 0, households: 0, dayGuests: 0, eveningOnly: 0, children: 0, plusOnes: 0, missingContact: 0, notReady: 0, dietaryCount: 0, allergyCount: 0, accessibilityCount: 0 };
    try {
      const { data: guests } = await supabase
        .from('guests')
        .select('id, guest_type, ceremony_invited, reception_invited, evening_invited, plus_one_status, invite_preparation_status, email, mobile_phone, household_id, status, rsvp_status, dietary_requirements, allergy_notes, accessibility_notes, accessibility_needs')
        .eq('wedding_id', weddingId)
        .eq('status', 'active');

      const all = (guests || []) as Guest[];
      const householdSet = new Set(all.filter((g) => g.household_id).map((g) => g.household_id));

      return {
        total: all.length,
        attending: all.filter((g) => g.rsvp_status === 'accepted').length,
        awaiting: all.filter((g) => !g.rsvp_status || g.rsvp_status === 'pending').length,
        declined: all.filter((g) => g.rsvp_status === 'declined').length,
        households: householdSet.size,
        dayGuests: all.filter((g) => g.ceremony_invited || g.reception_invited).length,
        eveningOnly: all.filter((g) => !g.ceremony_invited && !g.reception_invited && g.evening_invited).length,
        children: all.filter((g) => g.guest_type === 'child' || g.guest_type === 'infant').length,
        plusOnes: all.filter((g) => g.plus_one_status === 'allowed' || g.plus_one_status === 'named').length,
        missingContact: all.filter((g) => !g.email && !g.mobile_phone).length,
        notReady: all.filter((g) => g.invite_preparation_status !== 'ready').length,
        dietaryCount: all.filter((g) => g.dietary_requirements || g.allergy_notes).length,
        allergyCount: all.filter((g) => g.allergy_notes).length,
        accessibilityCount: all.filter((g) => g.accessibility_notes || g.accessibility_needs).length,
      };
    } catch {
      return { total: 0, attending: 0, awaiting: 0, declined: 0, households: 0, dayGuests: 0, eveningOnly: 0, children: 0, plusOnes: 0, missingContact: 0, notReady: 0, dietaryCount: 0, allergyCount: 0, accessibilityCount: 0 };
    }
  }, [weddingId]);

  // ──── IMPORT ────

  const importGuests = useCallback(async (rows: Array<Record<string, string>>, defaultGroup?: string): Promise<ImportResult> => {
    if (!weddingId) return { imported: 0, skipped: 0, failed: 0, errors: ['No active wedding'] };
    const result: ImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        if (!row.full_name) {
          result.skipped++;
          result.errors.push(`Row missing first name`);
          continue;
        }

        const payload: Record<string, unknown> = {
          wedding_id: weddingId,
          full_name: row.full_name,
          last_name: row.last_name || null,
          preferred_name: row.preferred_name || null,
          email: row.email || null,
          mobile_phone: row.mobile_phone || null,
          guest_type: row.guest_type || 'adult',
          invitation_group: row.invitation_group || defaultGroup || null,
          relationship_label: row.relationship_label || null,
          plus_one_status: row.plus_one_status || 'none',
          address_line_1: row.address_line_1 || null,
          city: row.city || null,
          postcode: row.postcode || null,
          dietary_requirements: row.dietary_requirements || null,
          accessibility_notes: row.accessibility_notes || null,
          wedding_party_role: row.wedding_party_role || null,
          private_notes: row.private_notes || null,
          invite_preparation_status: 'draft',
          status: 'active',
          ceremony_invited: true,
          reception_invited: true,
          evening_invited: true,
        };

        // Validate email if present
        if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email as string)) {
          result.skipped++;
          result.errors.push(`${row.full_name}: invalid email`);
          continue;
        }

        const { error: err } = await supabase.from('guests').insert(payload);
        if (err) {
          result.failed++;
          result.errors.push(`${row.full_name}: ${err.message}`);
        } else {
          result.imported++;
        }
      } catch (e: unknown) {
        result.failed++;
        result.errors.push(`${row.full_name || 'unknown'}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return result;
  }, [weddingId]);

  // ──── EXPORT HELPER ────

  const getExportData = useCallback(async (includeArchived: boolean, selectedIds?: string[]): Promise<Guest[]> => {
    if (!weddingId) return [];
    try {
      let q = supabase
        .from('guests')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('full_name');
      if (!includeArchived) q = q.eq('status', 'active');
      if (selectedIds && selectedIds.length > 0) q = q.in('id', selectedIds);
      const { data } = await q;
      return (data || []) as Guest[];
    } catch {
      return [];
    }
  }, [weddingId]);

  const getExportCount = useCallback(async (includeArchived: boolean, selectedIds?: string[]): Promise<number> => {
    if (!weddingId) return 0;
    try {
      let q = supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_id', weddingId);
      if (!includeArchived) q = q.eq('status', 'active');
      if (selectedIds && selectedIds.length > 0) q = q.in('id', selectedIds);
      const { count } = await q;
      return count || 0;
    } catch {
      return 0;
    }
  }, [weddingId]);

  return {
    weddingId,
    loading,
    error,
    resetError,
    // Guest CRUD
    listGuests,
    getGuest,
    createGuest,
    updateGuest,
    archiveGuest,
    restoreGuest,
    // Duplicates
    checkDuplicates,
    // Households
    listHouseholds,
    createHousehold,
    updateHousehold,
    archiveHousehold,
    // Tags
    listTags,
    createTag,
    updateTag,
    deleteTag,
    // Tag assignments
    assignTag,
    removeTag,
    bulkAssignTag,
    getGuestTags,
    // Activity
    recordActivity,
    // Bulk
    bulkMoveHousehold,
    bulkUpdateGroup,
    // Stats
    getStats,
    // Import/Export
    importGuests,
    getExportData,
    getExportCount,
  };
}