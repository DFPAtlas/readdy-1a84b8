import type { DemoSeatingPlan, DemoGuest } from './demoTypes';
import type { SeatingPlan, TableWithData, GuestInfo, UnseatedGuest, SeatingSeat, GuestSeating, RoomObject } from '@/types/seating';

export function mapToSeatingPlan(demo: DemoSeatingPlan): SeatingPlan {
  return {
    id: demo.id,
    wedding_id: demo.wedding_id,
    linked_event_id: null,
    name: demo.name,
    event_type: 'reception',
    venue_id: null,
    room_name: 'The Orangery',
    room_label: 'Orangery Reception',
    description: 'Reception seating for the Orangery at Emma & James\' wedding',
    notes: null,
    status: 'working',
    is_working: true,
    is_final: false,
    is_published: false,
    revision: 1,
    canvas_width: 900,
    canvas_height: 950,
    default_zoom: 0.85,
    grid_enabled: true,
    grid_size: 20,
    snap_to_grid: true,
    measurement_unit: 'px',
    background_asset_id: null,
    background_opacity: 1,
    background_locked: true,
    created_by: null,
    updated_by: null,
    created_at: '2027-01-10T09:00:00+00:00',
    updated_at: new Date().toISOString(),
    archived_at: null,
    published_at: null,
  };
}

export function mapToTablesWithData(demo: DemoSeatingPlan, guests: DemoGuest[]): TableWithData[] {
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  return demo.tables.filter((t) => t.capacity > 0).map((table) => {
    const tableAssignments = demo.assignments.filter((a) => a.table_id === table.id);

    // Generate seats
    const seats: SeatingSeat[] = [];
    for (let i = 1; i <= table.capacity; i++) {
      const angle = (2 * Math.PI * (i - 1)) / table.capacity;
      const relX = Math.round((table.width * 0.55) * Math.cos(angle));
      const relY = Math.round((table.height * 0.55) * Math.sin(angle));
      const rot = Math.round((angle * 180) / Math.PI + 90);
      const assignment = tableAssignments.find((a) => a.seat_number === i);
      seats.push({
        id: `${table.id}-seat-${i}`,
        wedding_id: demo.wedding_id,
        seating_plan_id: demo.id,
        seating_table_id: table.id,
        seat_label: `${i}`,
        seat_number: i,
        seat_type: 'standard',
        seat_status: assignment ? 'assigned' : 'available',
        relative_x: relX,
        relative_y: relY,
        rotation: rot,
        locked: false,
        notes: null,
        created_at: '2027-01-10T09:00:00+00:00',
        updated_at: '2027-01-10T09:00:00+00:00',
      });
    }

    // Map assignments
    const assignments: GuestSeating[] = tableAssignments.map((a) => {
      const guest = guestMap.get(a.guest_id);
      const seat = seats.find((s) => s.seat_number === a.seat_number);
      return {
        id: a.id,
        plan_id: demo.id,
        wedding_id: demo.wedding_id,
        table_id: table.id,
        guest_id: a.guest_id,
        seating_seat_id: seat?.id || null,
        seat_label: seat?.seat_label || null,
        assignment_status: 'seated',
        notes: null,
        created_by: null,
        updated_by: null,
        created_at: '2027-01-10T09:00:00+00:00',
        updated_at: '2027-01-10T09:00:00+00:00',
        guests: guest ? mapToGuestInfo(guest) : null,
      };
    });

    return {
      id: table.id,
      plan_id: demo.id,
      wedding_id: demo.wedding_id,
      name: table.name,
      table_number: null,
      shape: (table.shape === 'top_table' ? 'rectangle' : table.shape) as SeatingPlan['event_type'] extends string ? 'round' : 'round',
      capacity: table.capacity,
      position_x: table.x,
      position_y: table.y,
      width: table.width,
      height: table.height,
      rotation: 0,
      zone: null,
      colour: 'sage',
      colour_key: 'sage',
      locked: false,
      notes: null,
      sort_order: 0,
      created_at: '2027-01-10T09:00:00+00:00',
      updated_at: '2027-01-10T09:00:00+00:00',
      archived_at: null,
      assignments,
      seats,
      seated_count: tableAssignments.length,
    } as TableWithData;
  });
}

export function mapToRoomObjects(demo: DemoSeatingPlan): RoomObject[] {
  return demo.tables.filter((t) => t.capacity === 0).map((t, idx) => ({
    id: t.id,
    wedding_id: demo.wedding_id,
    seating_plan_id: demo.id,
    object_type: t.table_type === 'dance_floor' ? 'dance_floor' : 'bar',
    name: t.name,
    x_position: t.x,
    y_position: t.y,
    width: t.width,
    height: t.height,
    rotation: 0,
    layer_order: idx,
    style_key: null,
    opacity: 1,
    locked: true,
    visible: true,
    geometry_data: null,
    notes: null,
    created_at: '2027-01-10T09:00:00+00:00',
    updated_at: '2027-01-10T09:00:00+00:00',
    archived_at: null,
  }));
}

export function mapToGuestInfo(guest: DemoGuest): GuestInfo {
  return {
    id: guest.id,
    full_name: guest.full_name,
    guest_type: guest.guest_type,
    rsvp_status: guest.rsvp_status,
    dietary_requirements: guest.dietary_requirements || null,
    allergy_notes: guest.allergy_notes || null,
    accessibility_needs: guest.accessibility_needs || null,
    accessibility_notes: guest.accessibility_notes || null,
    household_id: guest.household_id || null,
    relationship_label: guest.relationship_label || null,
    wedding_party_role: guest.wedding_party_role || null,
    meal_choice: guest.meal_choice || null,
    invitation_group: guest.invitation_group || null,
  };
}

export function mapToUnseatedGuests(demo: DemoSeatingPlan, guests: DemoGuest[]): UnseatedGuest[] {
  const seatedIds = new Set(demo.assignments.map((a) => a.guest_id));
  return guests
    .filter((g) => g.status === 'active' && g.rsvp_status !== 'declined' && !seatedIds.has(g.id))
    .map((g) => {
      const info = mapToGuestInfo(g);
      return {
        ...info,
        has_dietary: !!(g.dietary_requirements?.trim() || g.allergy_notes?.trim()),
        has_accessibility: !!(g.accessibility_needs?.trim() || g.accessibility_notes?.trim()),
      };
    });
}

export function mapToAllGuestInfos(guests: DemoGuest[]): GuestInfo[] {
  return guests.filter((g) => g.status === 'active').map(mapToGuestInfo);
}