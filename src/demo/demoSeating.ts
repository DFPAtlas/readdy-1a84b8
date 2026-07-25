import type { DemoSeatingPlan } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

export const demoSeatingPlan: DemoSeatingPlan = {
  id: 'demo-seating-plan-1',
  name: 'Orangery Reception Layout',
  wedding_id: DEMO_CONFIG.weddingId,
  is_working: true,
  tables: [
    // Top table / sweetheart
    { id: 'demo-table-top', name: 'Top Table', shape: 'rectangle', capacity: 4, x: 350, y: 50, width: 200, height: 60, table_type: 'top_table' },
    // 6 round guest tables
    { id: 'demo-table-1', name: 'Table 1 — The Orangery Window', shape: 'round', capacity: 8, x: 100, y: 200, width: 80, height: 80, table_type: 'round' },
    { id: 'demo-table-2', name: 'Table 2 — The Garden View', shape: 'round', capacity: 8, x: 300, y: 200, width: 80, height: 80, table_type: 'round' },
    { id: 'demo-table-3', name: 'Table 3 — The Rose Garden', shape: 'round', capacity: 8, x: 500, y: 200, width: 80, height: 80, table_type: 'round' },
    { id: 'demo-table-4', name: 'Table 4 — The Courtyard', shape: 'round', capacity: 8, x: 200, y: 350, width: 80, height: 80, table_type: 'round' },
    { id: 'demo-table-5', name: 'Table 5 — The Terrace', shape: 'round', capacity: 8, x: 400, y: 350, width: 80, height: 80, table_type: 'round' },
    { id: 'demo-table-6', name: 'Table 6 — The Conservatory', shape: 'round', capacity: 8, x: 300, y: 480, width: 80, height: 80, table_type: 'round' },
    // Dance floor etc
    { id: 'demo-table-dance', name: 'Dance Floor', shape: 'rectangle', capacity: 0, x: 350, y: 600, width: 300, height: 200, table_type: 'dance_floor' },
  ],
  assignments: [
    // Top table (bride, groom, best man, maid of honour)
    { id: 'demo-seat-top-1', guest_id: 'demo-guest-oliver', table_id: 'demo-table-top', seat_number: 1 },
    { id: 'demo-seat-top-2', guest_id: 'demo-guest-sophie', table_id: 'demo-table-top', seat_number: 2 },
    // Table 1 — Bennetts & Carters
    { id: 'demo-seat-t1-1', guest_id: 'demo-guest-margaret', table_id: 'demo-table-1', seat_number: 1 },
    { id: 'demo-seat-t1-2', guest_id: 'demo-guest-david', table_id: 'demo-table-1', seat_number: 2 },
    { id: 'demo-seat-t1-3', guest_id: 'demo-guest-helen', table_id: 'demo-table-1', seat_number: 3 },
    { id: 'demo-seat-t1-4', guest_id: 'demo-guest-philip', table_id: 'demo-table-1', seat_number: 4 },
    { id: 'demo-seat-t1-5', guest_id: 'demo-guest-aunt-carol', table_id: 'demo-table-1', seat_number: 5 },
    // Table 2 — Wedding party friends
    { id: 'demo-seat-t2-1', guest_id: 'demo-guest-amelia', table_id: 'demo-table-2', seat_number: 1 },
    { id: 'demo-seat-t2-2', guest_id: 'demo-guest-ruth', table_id: 'demo-table-2', seat_number: 2 },
    { id: 'demo-seat-t2-3', guest_id: 'demo-guest-tom', table_id: 'demo-table-2', seat_number: 3 },
    { id: 'demo-seat-t2-4', guest_id: 'demo-guest-george', table_id: 'demo-table-2', seat_number: 4 },
    { id: 'demo-seat-t2-5', guest_id: 'demo-guest-daniel', table_id: 'demo-table-2', seat_number: 5 },
    // Table 3 — Friends
    { id: 'demo-seat-t3-1', guest_id: 'demo-guest-priya', table_id: 'demo-table-3', seat_number: 1 },
    { id: 'demo-seat-t3-2', guest_id: 'demo-guest-raj', table_id: 'demo-table-3', seat_number: 2 },
    { id: 'demo-seat-t3-3', guest_id: 'demo-guest-anika', table_id: 'demo-table-3', seat_number: 3 },
    { id: 'demo-seat-t3-4', guest_id: 'demo-guest-rohan', table_id: 'demo-table-3', seat_number: 4 },
    // Table 4 — Friends
    { id: 'demo-seat-t4-1', guest_id: 'demo-guest-laura', table_id: 'demo-table-4', seat_number: 1 },
    { id: 'demo-seat-t4-2', guest_id: 'demo-guest-james-w', table_id: 'demo-table-4', seat_number: 2 },
    { id: 'demo-seat-t4-3', guest_id: 'demo-guest-nadia', table_id: 'demo-table-4', seat_number: 3 },
    { id: 'demo-seat-t4-4', guest_id: 'demo-guest-ahmed', table_id: 'demo-table-4', seat_number: 4 },
    // Table 6 — Evening-only guests
    { id: 'demo-seat-t6-1', guest_id: 'demo-guest-maya', table_id: 'demo-table-6', seat_number: 1 },
  ],
};