// ── RSVP response overview rows ──
// Combines each active guest with their latest submitted RSVP response.
// The guest record holds the couple's view (rsvp_status is kept in step by
// submit-rsvp); the response holds what the guest told us event by event.

export interface ResponseRow {
  id: string;
  full_name: string;
  last_name: string;
  preferred_name: string;
  email: string | null;
  group: string;
  rsvp_status: string;
  submitted_at: string | null;
  ceremony: boolean;
  reception: boolean;
  evening: boolean;
  meal_choice: string | null;
  dietary_requirements: string | null;
  allergy_notes: string | null;
  accessibility: string | null;
  plus_one_status: string | null;
  plus_one_name: string | null;
  plus_one_confirmed: boolean;
}

export interface LiveGuestRow {
  id: string;
  full_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  connection_group: string | null;
  invitation_group: string | null;
  rsvp_status: string | null;
  meal_choice: string | null;
  dietary_requirements: string | null;
  allergy_notes: string | null;
  accessibility_needs: string | null;
  accessibility_notes: string | null;
  plus_one_status: string | null;
  plus_one_name: string | null;
}

export interface LiveResponseRow {
  guest_id: string | null;
  response_status: string | null;
  ceremony_attending: boolean | null;
  reception_attending: boolean | null;
  evening_attending: boolean | null;
  plus_one_confirmed: boolean | null;
  plus_one_name: string | null;
  meal_choice: string | null;
  dietary_requirements: string | null;
  allergy_notes: string | null;
  accessibility_notes: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}

const when = (r: LiveResponseRow) => new Date(r.submitted_at || r.updated_at || 0).getTime();
const text = (v: string | null | undefined) => (v && v.trim() ? v : null);

function statusFrom(guestStatus: string | null, response: LiveResponseRow | undefined): string {
  if (response?.response_status === 'attending') return 'accepted';
  if (response?.response_status === 'not_attending') return 'declined';
  if (guestStatus === 'accepted' || guestStatus === 'declined') return guestStatus;
  return 'pending';
}

export function buildResponseRows(guests: LiveGuestRow[], responses: LiveResponseRow[]): ResponseRow[] {
  const latest = new Map<string, LiveResponseRow>();
  for (const r of responses) {
    if (!r.guest_id) continue;
    const prev = latest.get(r.guest_id);
    if (!prev || when(r) > when(prev)) latest.set(r.guest_id, r);
  }

  return guests.map((g) => {
    const r = latest.get(g.id);
    return {
      id: g.id,
      full_name: g.full_name || '',
      last_name: g.last_name || '',
      preferred_name: g.preferred_name || '',
      email: g.email,
      group: g.connection_group || g.invitation_group || '',
      rsvp_status: statusFrom(g.rsvp_status, r),
      submitted_at: r ? r.submitted_at || r.updated_at : null,
      ceremony: !!r?.ceremony_attending,
      reception: !!r?.reception_attending,
      evening: !!r?.evening_attending,
      meal_choice: text(r?.meal_choice) || text(g.meal_choice),
      dietary_requirements: text(r?.dietary_requirements) || text(g.dietary_requirements),
      allergy_notes: text(r?.allergy_notes) || text(g.allergy_notes),
      accessibility: text(r?.accessibility_notes) || text(g.accessibility_needs) || text(g.accessibility_notes),
      plus_one_status: g.plus_one_status,
      plus_one_name: text(r?.plus_one_name) || text(g.plus_one_name),
      plus_one_confirmed: !!r?.plus_one_confirmed,
    };
  });
}
