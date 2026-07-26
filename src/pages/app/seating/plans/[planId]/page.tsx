import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { mapToSeatingPlan, mapToTablesWithData, mapToRoomObjects, mapToUnseatedGuests, mapToAllGuestInfos } from '@/demo/demoSeatingMapping';
import { supabase } from '@/lib/supabase';
import { generateSeatPositions, type SeatPosition } from '@/lib/seating/generateSeats';
import Canvas from './components/Canvas';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Toolbar from './components/Toolbar';
import AddTableModal from './components/AddTableModal';
import AddRoomObjectModal from './components/AddRoomObjectModal';
import BackgroundUploader from './components/BackgroundUploader';
import RoomSettingsModal from './components/RoomSettingsModal';
import WarningsDrawer from './components/WarningsDrawer';
import type {
  SeatingPlan, TableWithData, RoomObject, SeatingZone, BackgroundAsset,
  GuestInfo, UnseatedGuest, GuestSeating, SeatingSeat, SeatingTable, SeatingAssignment,
  CanvasWarning, UndoEntry, TableShape, ObjectType,
} from '@/types/seating';

type LayerKey = 'Tables' | 'Seats' | 'Venue objects' | 'Background' | 'Grid' | 'Zones' | 'Guest labels';

export default function SeatingPlanWorkspacePage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();
  const demo = useDemoDataSafe();
  const isDemo = !!demo && planId === 'demo-plan';

  // ── Core data state ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [tables, setTables] = useState<TableWithData[]>([]);
  const [roomObjects, setRoomObjects] = useState<RoomObject[]>([]);
  const [zones, setZones] = useState<SeatingZone[]>([]);
  const [backgroundAsset, setBackgroundAsset] = useState<BackgroundAsset | null>(null);
  const [unseatedGuests, setUnseatedGuests] = useState<UnseatedGuest[]>([]);
  const [allGuests, setAllGuests] = useState<GuestInfo[]>([]);

  // ── UI state ──
  const [zoom, setZoom] = useState(0.85);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>({
    Tables: true, Seats: true, 'Venue objects': true, Background: true, Grid: true, Zones: true, 'Guest labels': true,
  });
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'failed'>('saved');
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [canvasWarnings, setCanvasWarnings] = useState<CanvasWarning[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Modal state ──
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddObject, setShowAddObject] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Push undo entry ──
  const pushUndo = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => [...prev.slice(-49), entry]);
    setRedoStack([]);
  }, []);

  // ── Mark unsaved (real persistence state) ──
  const markUnsaved = useCallback(() => {
    setSaveStatus('unsaved');
  }, []);

  // ── Generate canvas warnings ──
  const generateWarnings = useCallback((tbls: TableWithData[], objs: RoomObject[], planData: SeatingPlan | null) => {
    const w: CanvasWarning[] = [];
    const cw = planData?.canvas_width || 1200;
    const ch = planData?.canvas_height || 900;
    tbls.forEach((t) => {
      if (t.position_x < 0 || t.position_y < 0 || t.position_x + t.width > cw || t.position_y + t.height > ch)
        w.push({ id: `bound-${t.id}`, type: 'table_outside', message: `"${t.name}" may be outside room boundary`, tableId: t.id });
      if (t.seated_count > t.capacity)
        w.push({ id: `overcap-${t.id}`, type: 'over_capacity', message: `"${t.name}" is over capacity (${t.seated_count}/${t.capacity})`, tableId: t.id });
    });
    for (let i = 0; i < tbls.length; i++) {
      for (let j = i + 1; j < tbls.length; j++) {
        const a = tbls[i]; const b = tbls[j];
        if (a.position_x < b.position_x + b.width && a.position_x + a.width > b.position_x &&
            a.position_y < b.position_y + b.height && a.position_y + a.height > b.position_y)
          w.push({ id: `overlap-${a.id}-${b.id}`, type: 'table_overlap', message: `"${a.name}" and "${b.name}" may overlap`, tableId: a.id });
      }
    }
    setCanvasWarnings(w);
  }, []);

  // ── Fetch real Supabase data ──
  const fetchRealData = useCallback(async () => {
    if (!weddingId || !planId) return;
    setLoading(true); setError('');
    try {
      const [planRes, tablesRes, seatsRes, assignsRes, objectsRes, zonesRes, bgRes, guestsRes] = await Promise.all([
        supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('seating_tables').select('*').eq('plan_id', planId).order('sort_order'),
        supabase.from('seating_seats').select('*').eq('seating_plan_id', planId),
        supabase.from('seating_assignments').select('*, guests!inner(id, full_name, guest_type, rsvp_status, dietary_requirements, allergy_notes, accessibility_needs, accessibility_notes, household_id, relationship_label, wedding_party_role, meal_choice, invitation_group)').eq('plan_id', planId),
        supabase.from('seating_room_objects').select('*').eq('seating_plan_id', planId),
        supabase.from('seating_zones').select('*').eq('seating_plan_id', planId),
        supabase.from('seating_background_assets').select('*').eq('seating_plan_id', planId).limit(1).maybeSingle(),
        supabase.from('guests').select('id, full_name, guest_type, rsvp_status, dietary_requirements, allergy_notes, accessibility_needs, accessibility_notes, household_id, relationship_label, wedding_party_role, meal_choice, invitation_group').eq('wedding_id', weddingId).eq('status', 'active').in('rsvp_status', ['accepted', 'pending']),
      ]);

      if (planRes.error) throw planRes.error;
      if (!planRes.data) { setError('Plan not found'); setLoading(false); return; }

      const planData = planRes.data as SeatingPlan;
      setPlan(planData);
      setZoom(planData.default_zoom || 0.85);
      setShowGrid(planData.grid_enabled ?? true);
      setSnapEnabled(planData.snap_to_grid ?? true);

      const seatsArr = (seatsRes.data || []) as SeatingSeat[];
      const assignsArr = (assignsRes.data || []) as GuestSeating[];
      const tablesArr = (tablesRes.data || []) as SeatingTable[];
      const guestsArr = (guestsRes.data || []) as GuestInfo[];
      const objArr = (objectsRes.data || []) as RoomObject[];
      const zonesArr = (zonesRes.data || []) as SeatingZone[];

      const tablesWithData: TableWithData[] = tablesArr.map((t) => {
        const tableSeats = seatsArr.filter((s) => s.seating_table_id === t.id);
        const tableAssigns = assignsArr.filter((a) => a.table_id === t.id);
        return { ...t, seats: tableSeats, assignments: tableAssigns, seated_count: tableAssigns.length };
      });

      const seatedIds = new Set(assignsArr.map((a) => a.guest_id));
      const unseated: UnseatedGuest[] = guestsArr
        .filter((g) => !seatedIds.has(g.id))
        .map((g) => ({
          ...g,
          has_dietary: !!(g.dietary_requirements?.trim() || g.allergy_notes?.trim()),
          has_accessibility: !!(g.accessibility_needs?.trim() || g.accessibility_notes?.trim()),
        }));

      setTables(tablesWithData);
      setRoomObjects(objArr);
      setZones(zonesArr);
      setBackgroundAsset((bgRes.data || null) as BackgroundAsset | null);
      setUnseatedGuests(unseated);
      setAllGuests(guestsArr);
      generateWarnings(tablesWithData, objArr, planData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally { setLoading(false); }
  }, [weddingId, planId, generateWarnings]);

  // ── Fetch demo data ──
  const fetchDemoData = useCallback(() => {
    if (!demo) return;
    const dPlan = demo.state.seatingPlan;
    setPlan(mapToSeatingPlan(dPlan));
    const dTables = mapToTablesWithData(dPlan, demo.state.guests);
    setTables(dTables);
    setRoomObjects(mapToRoomObjects(dPlan));
    setUnseatedGuests(mapToUnseatedGuests(dPlan, demo.state.guests));
    setAllGuests(mapToAllGuestInfos(demo.state.guests));
    setZones([]);
    setBackgroundAsset(null);
    setLoading(false);
    generateWarnings(dTables, mapToRoomObjects(dPlan), mapToSeatingPlan(dPlan));
  }, [demo, generateWarnings]);

  useEffect(() => {
    if (isDemo && demo) { fetchDemoData(); return; }
    if (!isDemo && weddingId) { fetchRealData(); return; }
    if (!weddingLoading) setLoading(false);
  }, [isDemo, demo, weddingId, fetchRealData, fetchDemoData, weddingLoading]);

  // ── Local-only move (during drag, no persistence) ──
  const handleMoveTableLocal = useCallback((id: string, x: number, y: number) => {
    setTables((prev) => prev.map((tb) => tb.id === id ? { ...tb, position_x: x, position_y: y } : tb));
    markUnsaved();
  }, [markUnsaved]);

  const handleMoveObjectLocal = useCallback((id: string, x: number, y: number) => {
    setRoomObjects((prev) => prev.map((o) => o.id === id ? { ...o, x_position: x, y_position: y } : o));
    markUnsaved();
  }, [markUnsaved]);

  // ── Local-only rotation (during drag) ──
  const handleRotateTableLocal = useCallback((id: string, rot: number) => {
    setTables((prev) => prev.map((tb) => tb.id === id ? { ...tb, rotation: rot } : tb));
  }, []);

  // ── Commit move (persist + undo, called on drag end) ──
  const handleCommitMove = useCallback(async (id: string, kind: 'table' | 'object', x: number, y: number, startX: number, startY: number) => {
    if (kind === 'table') {
      const t = tables.find((tb) => tb.id === id);
      if (!t || (x === startX && y === startY)) return;
      pushUndo({ type: 'table_moved', label: `Move ${t.name}`, before: { id, position_x: startX, position_y: startY }, after: { id, position_x: x, position_y: y }, timestamp: Date.now() });
      markUnsaved();
      if (!isDemo && planId) {
        setSaveStatus('saving');
        await supabase.from('seating_tables').update({ position_x: x, position_y: y, updated_at: new Date().toISOString() }).eq('id', id);
        await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'table_moved', summary: `Moved "${t.name}"` });
        setSaveStatus('saved');
      }
    } else {
      const obj = roomObjects.find((o) => o.id === id);
      if (!obj || (x === startX && y === startY)) return;
      pushUndo({ type: 'object_moved', label: `Move ${obj.name}`, before: { id, x_position: startX, y_position: startY }, after: { id, x_position: x, y_position: y }, timestamp: Date.now() });
      markUnsaved();
      if (!isDemo && planId) {
        setSaveStatus('saving');
        await supabase.from('seating_room_objects').update({ x_position: x, y_position: y, updated_at: new Date().toISOString() }).eq('id', id);
        setSaveStatus('saved');
      }
    }
  }, [tables, roomObjects, pushUndo, markUnsaved, isDemo, weddingId, planId]);

  // ── Rotate table (persist + undo, called on rotation end or from RightPanel) ──
  const handleRotateTable = useCallback(async (id: string, rot: number) => {
    const t = tables.find((tb) => tb.id === id);
    if (!t) return;
    pushUndo({ type: 'table_rotated', label: `Rotate ${t.name}`, before: { id, rotation: t.rotation }, after: { id, rotation: rot }, timestamp: Date.now() });
    setTables((prev) => prev.map((tb) => tb.id === id ? { ...tb, rotation: rot } : tb));
    markUnsaved();
    if (!isDemo && planId) {
      setSaveStatus('saving');
      await supabase.from('seating_tables').update({ rotation: rot, updated_at: new Date().toISOString() }).eq('id', id);
      setSaveStatus('saved');
    }
  }, [tables, pushUndo, markUnsaved, isDemo, planId]);

  // ── Update table properties ──
  const handleUpdateTable = useCallback(async (id: string, updates: Partial<TableWithData>) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    markUnsaved();
    if (!isDemo && planId) {
      setSaveStatus('saving');
      const dbUpdates: Record<string, unknown> = {};
      if ('colour' in updates) dbUpdates.colour = updates.colour;
      if ('locked' in updates) dbUpdates.locked = updates.locked;
      if ('name' in updates) dbUpdates.name = updates.name;
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('seating_tables').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
      }
      setSaveStatus('saved');
    }
  }, [markUnsaved, isDemo, planId]);

  // ── Assign guest ──
  const handleAssignGuestToSeat = useCallback(async (guestId: string, tableId: string, seatId?: string) => {
    if (isDemo && demo) {
      const table = tables.find((t) => t.id === tableId);
      if (!table || table.seated_count >= table.capacity) { showToast('Table at capacity', 'error'); return; }
      demo.assignGuestToSeat(guestId, tableId);
      const guest = allGuests.find((g) => g.id === guestId);
      setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, assignments: [...t.assignments, { id: `demo-a-${Date.now()}`, plan_id: planId!, wedding_id: '', table_id: tableId, guest_id: guestId, seating_seat_id: seatId || null, seat_label: null, assignment_status: 'seated', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), guests: guest || null } as GuestSeating], seated_count: t.seated_count + 1 } : t));
      setUnseatedGuests((prev) => prev.filter((g) => g.id !== guestId));
      markUnsaved();
      showToast(`${guest?.full_name || 'Guest'} assigned`);
      return;
    }
    if (!weddingId || !planId) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.seated_count >= table.capacity) { showToast('Table at capacity', 'error'); return; }

    setSaveStatus('saving');
    const { data: assignData, error: assignErr } = await supabase.from('seating_assignments').insert({
      wedding_id: weddingId, plan_id: planId, table_id: tableId, guest_id: guestId,
      seating_seat_id: seatId || null, assignment_status: 'seated',
    }).select('*').single();

    if (assignErr) { showToast(assignErr.message, 'error'); setSaveStatus('failed'); return; }

    const guest = allGuests.find((g) => g.id === guestId);
    const newAssign: GuestSeating = { ...(assignData as SeatingAssignment), guests: guest || null, seating_seat_id: seatId || null, seat_label: null };

    pushUndo({ type: 'guest_assigned', label: `Seat ${guest?.full_name || 'Guest'}`, before: { assignmentId: newAssign.id, guestId, tableId }, after: {}, timestamp: Date.now() });
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, assignments: [...t.assignments, newAssign], seated_count: t.seated_count + 1 } : t));
    setUnseatedGuests((prev) => prev.filter((g) => g.id !== guestId));
    markUnsaved();
    setSaveStatus('saved');
    showToast(`${guest?.full_name || 'Guest'} assigned`);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'guest_assigned', summary: `${guest?.full_name || 'Guest'} → ${table.name}` });
  }, [isDemo, demo, weddingId, planId, tables, allGuests, markUnsaved, showToast, pushUndo]);

  // ── Remove guest ──
  const handleRemoveGuest = useCallback(async (assignmentId: string, guestId: string, seatId?: string) => {
    if (isDemo && demo) {
      demo.unassignGuest(guestId);
      const guestInfo = allGuests.find((g) => g.id === guestId);
      setTables((prev) => prev.map((t) => ({ ...t, assignments: t.assignments.filter((a) => a.id !== assignmentId), seated_count: t.seated_count - 1 })));
      if (guestInfo) {
        setUnseatedGuests((prev) => [...prev, {
          ...guestInfo,
          has_dietary: !!(guestInfo.dietary_requirements?.trim() || guestInfo.allergy_notes?.trim()),
          has_accessibility: !!(guestInfo.accessibility_needs?.trim() || guestInfo.accessibility_notes?.trim()),
        }]);
      }
      markUnsaved();
      showToast(`${guestInfo?.full_name || 'Guest'} removed`);
      return;
    }
    if (!planId) return;
    setSaveStatus('saving');
    await supabase.from('seating_assignments').delete().eq('id', assignmentId);
    const guestInfo = allGuests.find((g) => g.id === guestId);
    pushUndo({ type: 'guest_removed', label: `Remove ${guestInfo?.full_name || 'Guest'}`, before: { assignmentId, guestId, tableId: tables.find((t) => t.assignments.some((a) => a.id === assignmentId))?.id }, after: {}, timestamp: Date.now() });
    setTables((prev) => prev.map((t) => ({ ...t, assignments: t.assignments.filter((a) => a.id !== assignmentId), seated_count: t.seated_count - 1 })));
    if (guestInfo) setUnseatedGuests((prev) => [...prev, { ...guestInfo, has_dietary: !!(guestInfo.dietary_requirements?.trim() || guestInfo.allergy_notes?.trim()), has_accessibility: !!(guestInfo.accessibility_needs?.trim() || guestInfo.accessibility_notes?.trim()) }]);
    markUnsaved();
    setSaveStatus('saved');
    showToast(`${guestInfo?.full_name || 'Guest'} removed`);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'guest_unseated', summary: 'Removed guest from table' });
  }, [isDemo, demo, weddingId, planId, allGuests, tables, markUnsaved, showToast, pushUndo]);

  // ── Add table ──
  const handleAddTable = useCallback(async (shape: TableShape, name: string, capacity: number, w: number, h: number, colour: string) => {
    const tableName = name.trim() || `Table ${tables.length + 1}`;
    const tableData = { plan_id: planId!, wedding_id: weddingId || 'demo', name: tableName, shape, capacity, width: w, height: h, position_x: 100, position_y: 100, rotation: 0, colour, sort_order: tables.length, locked: false };

    if (isDemo) {
      const newId = `demo-table-${Date.now()}`;
      const seatPositions = generateSeatPositions(shape, capacity, w, h);
      const demoSeats: SeatingSeat[] = seatPositions.map((sp, i) => ({
        id: `demo-seat-${newId}-${i}`,
        wedding_id: 'demo', seating_plan_id: planId!,
        seating_table_id: newId, seat_label: sp.seat_label,
        seat_number: sp.seat_number, seat_type: 'standard' as const,
        seat_status: 'available' as const, relative_x: sp.relative_x,
        relative_y: sp.relative_y, rotation: sp.rotation,
        locked: false, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }));
      const newTable: TableWithData = {
        ...tableData, id: newId, zone: null, colour_key: null, notes: null,
        archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        table_number: null, assignments: [], seats: demoSeats, seated_count: 0,
      } as unknown as TableWithData;
      setTables((prev) => [...prev, newTable]);
      pushUndo({ type: 'table_added', label: `Add ${tableName}`, before: {}, after: { id: newId }, timestamp: Date.now() });
      setShowAddTable(false); markUnsaved();
      showToast(`"${tableName}" added`);
      return;
    }

    if (!planId || !weddingId) return;
    setSaveStatus('saving');
    const { data, error: insErr } = await supabase.from('seating_tables').insert(tableData).select('*').single();
    if (insErr) { showToast(insErr.message, 'error'); setSaveStatus('failed'); return; }

    const newTableId = (data as SeatingTable).id;

    // Generate and insert seats
    const seatPositions = generateSeatPositions(shape, capacity, w, h);
    const seatRows = seatPositions.map((sp: SeatPosition) => ({
      wedding_id: weddingId, seating_plan_id: planId, seating_table_id: newTableId,
      seat_label: sp.seat_label, seat_number: sp.seat_number,
      seat_type: 'standard', seat_status: 'available',
      relative_x: sp.relative_x, relative_y: sp.relative_y, rotation: sp.rotation,
    }));

    const { data: seatsData, error: seatsErr } = await supabase.from('seating_seats').insert(seatRows).select('*');

    if (seatsErr) {
      // Rollback: delete the table we just created
      await supabase.from('seating_tables').delete().eq('id', newTableId);
      showToast(`Failed to create seats: ${seatsErr.message}`, 'error');
      setSaveStatus('failed');
      return;
    }

    const newTable: TableWithData = { ...(data as SeatingTable), assignments: [], seats: (seatsData || []) as SeatingSeat[], seated_count: 0 };
    setTables((prev) => [...prev, newTable]);
    pushUndo({ type: 'table_added', label: `Add ${tableName}`, before: {}, after: { id: newTableId }, timestamp: Date.now() });
    setShowAddTable(false); markUnsaved();
    setSaveStatus('saved');
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'table_created', summary: `Added "${tableName}"` });
    showToast(`"${tableName}" added`);
  }, [planId, weddingId, isDemo, tables.length, markUnsaved, showToast, pushUndo, tables]);

  // ── Add room object ──
  const handleAddObject = useCallback(async (type: ObjectType, name: string) => {
    const objData = { wedding_id: weddingId || 'demo', seating_plan_id: planId!, object_type: type, name: name || type.replace(/_/g, ' '), x_position: 200, y_position: 200, width: type === 'dance_floor' ? 200 : 120, height: type === 'dance_floor' ? 200 : 80, rotation: 0, layer_order: roomObjects.length, opacity: 1, locked: false, visible: true };
    if (isDemo) {
      const newObj: RoomObject = { ...objData, id: `demo-obj-${Date.now()}`, style_key: null, geometry_data: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), archived_at: null } as RoomObject;
      setRoomObjects((prev) => [...prev, newObj]);
      pushUndo({ type: 'object_added', label: `Add ${name}`, before: {}, after: { id: newObj.id }, timestamp: Date.now() });
      setShowAddObject(false); markUnsaved(); return;
    }
    if (!planId || !weddingId) return;
    setSaveStatus('saving');
    const { data, error: insErr } = await supabase.from('seating_room_objects').insert(objData).select('*').single();
    if (insErr) { showToast(insErr.message, 'error'); setSaveStatus('failed'); return; }
    setRoomObjects((prev) => [...prev, data as RoomObject]);
    pushUndo({ type: 'object_added', label: `Add ${name}`, before: {}, after: { id: (data as RoomObject).id }, timestamp: Date.now() });
    setShowAddObject(false); markUnsaved();
    setSaveStatus('saved');
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'object_created', summary: `Added "${name}"` });
  }, [weddingId, planId, isDemo, roomObjects.length, markUnsaved, showToast, pushUndo]);

  // ── Duplicate object ──
  const handleDuplicateObject = useCallback(async (objId: string) => {
    const obj = roomObjects.find((o) => o.id === objId);
    if (!obj) return;
    const newData = {
      wedding_id: weddingId || 'demo', seating_plan_id: planId!,
      object_type: obj.object_type, name: `${obj.name} (copy)`,
      x_position: obj.x_position + 20, y_position: obj.y_position + 20,
      width: obj.width, height: obj.height,
      rotation: obj.rotation, layer_order: roomObjects.length,
      opacity: obj.opacity, locked: false, visible: true,
    };
    if (isDemo) {
      const newObj: RoomObject = { ...(newData as RoomObject), id: `demo-obj-${Date.now()}`, style_key: null, geometry_data: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), archived_at: null } as RoomObject;
      setRoomObjects((prev) => [...prev, newObj]);
      markUnsaved(); showToast(`"${obj.name}" duplicated`);
      return;
    }
    if (!planId || !weddingId) return;
    setSaveStatus('saving');
    const { data, error: insErr } = await supabase.from('seating_room_objects').insert(newData).select('*').single();
    if (insErr) { showToast(insErr.message, 'error'); setSaveStatus('failed'); return; }
    setRoomObjects((prev) => [...prev, data as RoomObject]);
    markUnsaved(); setSaveStatus('saved');
    showToast(`"${obj.name}" duplicated`);
  }, [roomObjects, planId, weddingId, isDemo, markUnsaved, showToast]);

  // ── Delete table ──
  const handleDeleteTable = useCallback(async (id: string) => {
    const t = tables.find((tb) => tb.id === id);
    if (!t) return;
    pushUndo({ type: 'table_deleted', label: `Delete ${t.name}`, before: { table: { ...t } }, after: {}, timestamp: Date.now() });
    if (isDemo) {
      setTables((prev) => prev.filter((tb) => tb.id !== id));
      setSelectedTableIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      markUnsaved(); return;
    }
    setSaveStatus('saving');
    await supabase.from('seating_assignments').delete().eq('table_id', id);
    await supabase.from('seating_seats').delete().eq('seating_table_id', id);
    await supabase.from('seating_tables').delete().eq('id', id);
    setTables((prev) => prev.filter((tb) => tb.id !== id));
    setSelectedTableIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    markUnsaved(); setSaveStatus('saved');
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'table_deleted', summary: `Deleted "${t.name}"` });
    showToast(`"${t.name}" deleted`);
  }, [tables, isDemo, weddingId, planId, markUnsaved, showToast, pushUndo]);

  // ── Delete object ──
  const handleDeleteObject = useCallback(async (id: string) => {
    const obj = roomObjects.find((o) => o.id === id);
    if (!obj) return;
    pushUndo({ type: 'object_deleted', label: `Delete ${obj.name}`, before: { object: { ...obj } }, after: {}, timestamp: Date.now() });
    if (isDemo) { setRoomObjects((prev) => prev.filter((o) => o.id !== id)); setSelectedObjectIds((prev) => { const n = new Set(prev); n.delete(id); return n; }); markUnsaved(); return; }
    setSaveStatus('saving');
    await supabase.from('seating_room_objects').delete().eq('id', id);
    setRoomObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedObjectIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    markUnsaved(); setSaveStatus('saved');
  }, [roomObjects, isDemo, markUnsaved, pushUndo]);

  // ── Delete selected ──
  const handleDeleteSelected = useCallback(() => {
    selectedTableIds.forEach((id) => handleDeleteTable(id));
    selectedObjectIds.forEach((id) => handleDeleteObject(id));
    setSelectedTableIds(new Set()); setSelectedObjectIds(new Set());
  }, [selectedTableIds, selectedObjectIds, handleDeleteTable, handleDeleteObject]);

  // ── Select table (mousedown without Shift sets, Shift toggles) ──
  const handleSelectTable = useCallback((id: string, multi: boolean) => {
    setSelectedTableIds((prev) => {
      if (multi) {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
      }
      return new Set([id]);
    });
    setSelectedObjectIds(new Set());
  }, []);

  // ── Select object ──
  const handleSelectObject = useCallback((id: string, multi: boolean) => {
    setSelectedObjectIds((prev) => {
      if (multi) {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
      }
      return new Set([id]);
    });
    setSelectedTableIds(new Set());
  }, []);

  // ── Update plan ──
  const handleUpdatePlan = useCallback(async (updates: Partial<SeatingPlan>) => {
    if (!plan) return;
    setPlan((prev) => prev ? { ...prev, ...updates } : prev);
    markUnsaved();
    if (!isDemo && planId) {
      setSaveStatus('saving');
      await supabase.from('seating_plans').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', planId);
      setSaveStatus('saved');
    }
  }, [plan, isDemo, planId, markUnsaved]);

  // ── Refresh all data ──
  const refreshAllData = useCallback(() => {
    if (isDemo) fetchDemoData();
    else fetchRealData();
  }, [isDemo, fetchDemoData, fetchRealData]);

  // ── Apply undo/redo entry (local + persist, no new undo push) ──
  const applyUndoRedoEntry = useCallback(async (entry: UndoEntry, reverse: boolean) => {
    const side = reverse ? entry.after : entry.before;
    const id = (side as Record<string, unknown>).id as string | undefined;

    setSaveStatus('saving');
    switch (entry.type) {
      case 'table_moved': {
        const pos = side as { position_x: number; position_y: number };
        setTables((prev) => prev.map((t) => t.id === id ? { ...t, position_x: pos.position_x, position_y: pos.position_y } : t));
        if (!isDemo && id && planId) await supabase.from('seating_tables').update({ position_x: pos.position_x, position_y: pos.position_y }).eq('id', id);
        break;
      }
      case 'object_moved': {
        const pos = side as { x_position: number; y_position: number };
        setRoomObjects((prev) => prev.map((o) => o.id === id ? { ...o, x_position: pos.x_position, y_position: pos.y_position } : o));
        if (!isDemo && id && planId) await supabase.from('seating_room_objects').update({ x_position: pos.x_position, y_position: pos.y_position }).eq('id', id);
        break;
      }
      case 'table_rotated': {
        const rot = side as { rotation: number };
        setTables((prev) => prev.map((t) => t.id === id ? { ...t, rotation: rot.rotation } : t));
        if (!isDemo && id && planId) await supabase.from('seating_tables').update({ rotation: rot.rotation }).eq('id', id);
        break;
      }
      case 'table_added': {
        // Undo add = delete; redo add = need to re-add
        if (reverse) {
          // Redo: add back? This is complex, skip for now
        } else {
          if (id) handleDeleteTable(id);
        }
        break;
      }
      case 'table_deleted': {
        // Undo delete = need to re-add; complex, skip for now
        break;
      }
      case 'object_added': {
        if (reverse) { /* redo add */ } else { if (id) handleDeleteObject(id); }
        break;
      }
      case 'object_deleted': {
        break;
      }
      default: break;
    }
    setSaveStatus('saved');
  }, [isDemo, planId, handleDeleteTable, handleDeleteObject]);

  // ── Undo ──
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    applyUndoRedoEntry(entry, false);
    showToast(`Undo: ${entry.label}`, 'info');
  }, [undoStack, applyUndoRedoEntry, showToast]);

  // ── Redo ──
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    applyUndoRedoEntry(entry, true);
    showToast(`Redo: ${entry.label}`, 'info');
  }, [redoStack, applyUndoRedoEntry, showToast]);

  // ── Save now ──
  const handleSaveNow = useCallback(async () => {
    // Save status is already driven by individual operations.
    // If currently unsaved, mark as saving then saved (all mutations are auto-persisted).
    // This button exists as a user-facing reassurance; actual persistence happens inline.
    if (saveStatus !== 'unsaved') return;
    setSaveStatus('saved');
  }, [saveStatus]);

  // ── Background update ──
  const handleBackgroundUpdate = useCallback((bg: BackgroundAsset | null) => {
    setBackgroundAsset(bg);
    markUnsaved();
  }, [markUnsaved]);

  // ── Fit canvas ──
  const handleFit = useCallback((w: number, h: number) => {
    setZoom(0.7); setPanOffset({ x: 0, y: 0 });
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault(); handleUndo();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault(); handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); handleDeleteSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedTableIds(new Set()); setSelectedObjectIds(new Set()); setSelectedSeatId(null);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        // Capture start positions on first nudge (before local state is mutated)
        if (nudgeStartRef.current.tables.size === 0 && nudgeStartRef.current.objects.size === 0) {
          const tMap = new Map<string, { x: number; y: number }>();
          const oMap = new Map<string, { x: number; y: number }>();
          for (const tid of selectedTableIds) {
            const t = tables.find((tb) => tb.id === tid);
            if (t) tMap.set(tid, { x: t.position_x, y: t.position_y });
          }
          for (const oid of selectedObjectIds) {
            const o = roomObjects.find((obj) => obj.id === oid);
            if (o) oMap.set(oid, { x: o.x_position, y: o.y_position });
          }
          nudgeStartRef.current = { tables: tMap, objects: oMap };
        }

        const step = e.shiftKey ? 10 : 1;
        const tablesArr = [...selectedTableIds];
        const objectsArr = [...selectedObjectIds];
        if (tablesArr.length === 0 && objectsArr.length === 0) return;
        // Local updates
        setTables((prev) => prev.map((t) => {
          if (!selectedTableIds.has(t.id)) return t;
          switch (e.key) {
            case 'ArrowUp': return { ...t, position_y: t.position_y - step };
            case 'ArrowDown': return { ...t, position_y: t.position_y + step };
            case 'ArrowLeft': return { ...t, position_x: t.position_x - step };
            case 'ArrowRight': return { ...t, position_x: t.position_x + step };
            default: return t;
          }
        }));
        setRoomObjects((prev) => prev.map((o) => {
          if (!selectedObjectIds.has(o.id)) return o;
          switch (e.key) {
            case 'ArrowUp': return { ...o, y_position: o.y_position - step };
            case 'ArrowDown': return { ...o, y_position: o.y_position + step };
            case 'ArrowLeft': return { ...o, x_position: o.x_position - step };
            case 'ArrowRight': return { ...o, x_position: o.x_position + step };
            default: return o;
          }
        }));
        markUnsaved();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleDeleteSelected, markUnsaved, selectedTableIds, selectedObjectIds, tables, roomObjects]);

  // ── Nudge commit on keyup ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
      if (!e.key.startsWith('Arrow')) return;

      // Persist all selected items using onCommitMove for undo support
      const starts = nudgeStartRef.current;
      const doPersist = async () => {
        for (const tid of selectedTableIds) {
          const t = tables.find((tb) => tb.id === tid);
          const start = starts.tables.get(tid);
          if (t && start) {
            const finalX = t.position_x;
            const finalY = t.position_y;
            if (finalX !== start.x || finalY !== start.y) {
              await handleCommitMove(tid, 'table', finalX, finalY, start.x, start.y);
            }
          }
        }
        for (const oid of selectedObjectIds) {
          const o = roomObjects.find((obj) => obj.id === oid);
          const start = starts.objects.get(oid);
          if (o && start) {
            const finalX = o.x_position;
            const finalY = o.y_position;
            if (finalX !== start.x || finalY !== start.y) {
              await handleCommitMove(oid, 'object', finalX, finalY, start.x, start.y);
            }
          }
        }
        // Reset nudge tracking
        nudgeStartRef.current = { tables: new Map(), objects: new Map() };
      };
      doPersist();
    };

    window.addEventListener('keyup', handler);
    return () => window.removeEventListener('keyup', handler);
  }, [selectedTableIds, selectedObjectIds, tables, roomObjects, handleCommitMove]);

  // ── Resize object ──
  const handleResizeObject = useCallback(async (id: string, w: number, h: number) => {
    setRoomObjects((prev) => prev.map((o) => o.id === id ? { ...o, width: w, height: h } : o));
    markUnsaved();
    if (!isDemo && planId) {
      setSaveStatus('saving');
      await supabase.from('seating_room_objects').update({ width: w, height: h }).eq('id', id);
      setSaveStatus('saved');
    }
  }, [markUnsaved, isDemo, planId]);

  // ── Nudge start positions (tracked so we can undo properly) ──
  const nudgeStartRef = useRef<{ tables: Map<string, { x: number; y: number }>; objects: Map<string, { x: number; y: number }> }>({ tables: new Map(), objects: new Map() });

  // ── Toggle layer visibility ──
  const handleToggleLayer = useCallback((key: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Derived data ──
  const selectedTable = tables.find((t) => selectedTableIds.has(t.id)) || null;
  const selectedObject = roomObjects.find((o) => selectedObjectIds.has(o.id)) || null;

  // ── Loading state ──
  if (weddingLoading || loading) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading seating plan...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-500"><i className="ri-error-warning-line text-xl" /></div>
          <p className="text-sm text-foreground-500">{error}</p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back to plans</button>
            <button onClick={refreshAllData} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Retry</button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Plan not found ──
  if (!plan) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center">
          <p className="text-sm text-foreground-500 mb-4">Plan not found</p>
          <button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back to plans</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Toolbar */}
        <Toolbar
          plan={plan} planId={planId!} weddingId={weddingId || ''}
          saveStatus={saveStatus} saving={false} isReadOnly={false}
          zoom={zoom} showGrid={showGrid} snapEnabled={snapEnabled} showGuides={showGuides}
          undoStack={undoStack} redoStack={redoStack}
          canvasWarnings={canvasWarnings}
          selectedCount={selectedTableIds.size + selectedObjectIds.size} allTableCount={tables.length}
          isDemo={isDemo}
          onBack={() => navigate('/app/seating')}
          onNavigate={(path) => navigate(path)}
          onZoomIn={() => setZoom((z) => Math.min(5, +(z + 0.1).toFixed(2)))}
          onZoomOut={() => setZoom((z) => Math.max(0.1, +(z - 0.1).toFixed(2)))}
          onZoomReset={() => setZoom(plan.default_zoom || 0.85)}
          onFit={() => handleFit(plan.canvas_width || 1200, plan.canvas_height || 900)}
          onToggleGrid={() => setShowGrid((g) => !g)}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          onToggleGuides={() => setShowGuides((g) => !g)}
          onShowWarnings={() => setShowWarnings(true)}
          onShowRoomSettings={() => setShowRoomSettings(true)}
          onShowBackground={() => setShowBackground(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddTable={() => setShowAddTable(true)}
          onAddObject={() => setShowAddObject(true)}
          onSaveNow={handleSaveNow}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* Main workspace */}
        <div className="flex flex-1 overflow-hidden">
          <LeftPanel
            planId={planId!}
            unseatedGuests={unseatedGuests}
            tables={tables}
            roomObjects={roomObjects}
            zones={zones}
            isReadOnly={false}
            onAssignGuest={handleAssignGuestToSeat}
            onSelectTable={handleSelectTable}
            onSelectObject={handleSelectObject}
            selectedTableIds={selectedTableIds}
            selectedObjectIds={selectedObjectIds}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
          />

          <Canvas
            ref={canvasRef}
            plan={plan}
            tables={tables}
            roomObjects={roomObjects}
            zones={zones}
            backgroundAsset={backgroundAsset}
            zoom={zoom}
            panOffset={panOffset}
            showGrid={showGrid}
            snapEnabled={snapEnabled}
            showGuides={showGuides}
            isReadOnly={false}
            isDemo={isDemo}
            selectedTableIds={selectedTableIds}
            selectedObjectIds={selectedObjectIds}
            selectedSeatId={selectedSeatId}
            draggingTableId={draggingTableId}
            draggingObjectId={draggingObjectId}
            dragOverTableId={dragOverTableId}
            layerVisibility={layerVisibility}
            onSelectTable={handleSelectTable}
            onSelectObject={handleSelectObject}
            onSelectSeat={setSelectedSeatId}
            onMoveTableLocal={handleMoveTableLocal}
            onMoveObjectLocal={handleMoveObjectLocal}
            onCommitMove={handleCommitMove}
            onRotateTableLocal={handleRotateTableLocal}
            onRotateTable={handleRotateTable}
            onResizeObject={handleResizeObject}
            onAssignGuestToSeat={handleAssignGuestToSeat}
            onRemoveGuest={handleRemoveGuest}
            onDeleteTable={handleDeleteTable}
            onDeleteObject={handleDeleteObject}
            onDeleteSelected={handleDeleteSelected}
            onZoomChange={setZoom}
            onPanChange={setPanOffset}
            onSetDraggingTable={setDraggingTableId}
            onSetDraggingObject={setDraggingObjectId}
            onSetDragOverTable={setDragOverTableId}
            onUpdatePlan={handleUpdatePlan}
          />

          <RightPanel
            selectedTable={selectedTable}
            selectedObject={selectedObject}
            selectedSeatId={selectedSeatId}
            tables={tables}
            isReadOnly={false}
            onDeleteTable={handleDeleteTable}
            onDeleteObject={handleDeleteObject}
            onRotateTable={handleRotateTable}
            onUpdateTable={handleUpdateTable}
            onResizeObject={handleResizeObject}
            onRemoveGuest={handleRemoveGuest}
            onAssignGuestToSeat={handleAssignGuestToSeat}
            onDuplicateObject={handleDuplicateObject}
            unseatedGuests={unseatedGuests}
            onClose={() => { setSelectedTableIds(new Set()); setSelectedObjectIds(new Set()); setSelectedSeatId(null); }}
          />
        </div>

        {/* Modals */}
        {showAddTable && (
          <AddTableModal onClose={() => setShowAddTable(false)} onAdd={handleAddTable} />
        )}
        {showAddObject && (
          <AddRoomObjectModal onClose={() => setShowAddObject(false)} onAdd={handleAddObject} />
        )}
        {showBackground && (
          <BackgroundUploader
            planId={planId!} weddingId={weddingId || ''}
            currentBg={backgroundAsset} onClose={() => setShowBackground(false)}
            onUpdate={handleBackgroundUpdate}
          />
        )}
        {showRoomSettings && (
          <RoomSettingsModal plan={plan} planId={planId!} onClose={() => setShowRoomSettings(false)} onUpdate={handleUpdatePlan} />
        )}
        {showWarnings && (
          <WarningsDrawer
            warnings={canvasWarnings} onClose={() => setShowWarnings(false)}
            onFocusTable={(id) => { setSelectedTableIds(new Set([id])); setShowWarnings(false); }}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-md text-xs font-label ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'info' ? 'bg-foreground-800 text-white' : 'bg-red-600 text-white'
          }`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : toast.type === 'info' ? 'ri-information-line' : 'ri-error-warning-line'} text-sm flex-shrink-0`} />
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}