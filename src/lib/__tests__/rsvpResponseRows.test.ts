import { describe, expect, it } from 'vitest';
import { buildResponseRows, type LiveGuestRow, type LiveResponseRow } from '@/lib/rsvpResponseRows';

const guest = (over: Partial<LiveGuestRow> = {}): LiveGuestRow => ({
  id: 'g1', full_name: 'Alex Smith', last_name: 'Smith', preferred_name: null, email: null,
  connection_group: null, invitation_group: 'Family', rsvp_status: 'pending', meal_choice: null,
  dietary_requirements: null, allergy_notes: null, accessibility_needs: null, accessibility_notes: null,
  plus_one_status: null, plus_one_name: null, ...over,
});
const response = (over: Partial<LiveResponseRow> = {}): LiveResponseRow => ({
  guest_id: 'g1', response_status: 'attending', ceremony_attending: true, reception_attending: true,
  evening_attending: false, plus_one_confirmed: false, plus_one_name: null, meal_choice: 'Fish',
  dietary_requirements: null, allergy_notes: null, accessibility_notes: null,
  submitted_at: '2026-11-20T10:00:00Z', updated_at: null, ...over,
});

describe('buildResponseRows', () => {
  it('keeps guests with no response as awaiting', () => {
    const [row] = buildResponseRows([guest()], []);
    expect(row.rsvp_status).toBe('pending');
    expect(row.submitted_at).toBeNull();
    expect(row.group).toBe('Family');
  });

  it('uses the latest response for each guest', () => {
    const [row] = buildResponseRows([guest()], [
      response({ response_status: 'attending', submitted_at: '2026-11-19T10:00:00Z' }),
      response({ response_status: 'not_attending', ceremony_attending: false, submitted_at: '2026-11-21T10:00:00Z' }),
    ]);
    expect(row.rsvp_status).toBe('declined');
    expect(row.ceremony).toBe(false);
    expect(row.submitted_at).toBe('2026-11-21T10:00:00Z');
  });

  it('prefers what the guest said over the couple’s notes, falling back when blank', () => {
    const [row] = buildResponseRows(
      [guest({ meal_choice: 'Beef', allergy_notes: 'Nuts', accessibility_needs: 'Step-free' })],
      [response({ meal_choice: 'Fish', allergy_notes: '  ' })],
    );
    expect(row.meal_choice).toBe('Fish');
    expect(row.allergy_notes).toBe('Nuts');
    expect(row.accessibility).toBe('Step-free');
    expect(row.rsvp_status).toBe('accepted');
  });
});
