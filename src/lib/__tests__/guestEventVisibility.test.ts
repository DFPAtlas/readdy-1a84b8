import { describe, expect, it } from 'vitest';
import { guestEventVisibility, hiddenReasonLabel, type VisibilityContext, type VisibilityEvent } from '../guestEventVisibility';

const recipient = {
  guest_id: 'g1', household_id: 'h1',
  ceremony_included: true, reception_included: true, evening_included: false,
  welcome_event_included: false, day_after_event_included: false,
};
const ctx: VisibilityContext = { invitationId: 'inv1', recipients: [recipient], audiences: [] };
const event = (over: Partial<VisibilityEvent> = {}): VisibilityEvent => ({
  id: 'e1', event_type: 'ceremony', visibility: 'public', reveal_at: null, status: 'published', ...over,
});

describe('guestEventVisibility (mirrors guest-portal-loader)', () => {
  it('shows published public events', () => {
    expect(guestEventVisibility(event(), ctx)).toEqual({ visible: true });
    expect(guestEventVisibility(event({ status: 'active', visibility: 'invitation_holders' }), ctx).visible).toBe(true);
  });

  it('hides drafts, cancelled and hidden events', () => {
    expect(guestEventVisibility(event({ status: 'draft' }), ctx)).toEqual({ visible: false, reason: 'not_published' });
    expect(guestEventVisibility(event({ status: 'cancelled' }), ctx)).toMatchObject({ reason: 'not_published' });
    expect(guestEventVisibility(event({ visibility: 'hidden' }), ctx)).toMatchObject({ reason: 'hidden' });
    expect(guestEventVisibility(event({ visibility: 'something-new' }), ctx)).toMatchObject({ reason: 'hidden' });
  });

  it('respects reveal dates', () => {
    const now = new Date('2027-01-01T00:00:00Z');
    const later = event({ visibility: 'reveal_on_date', reveal_at: '2027-02-01T00:00:00Z' });
    const v = guestEventVisibility(later, ctx, now);
    expect(v).toMatchObject({ visible: false, reason: 'not_revealed' });
    if (!v.visible) expect(hiddenReasonLabel(v)).toContain('2027');
    expect(guestEventVisibility(later, ctx, new Date('2027-03-01T00:00:00Z')).visible).toBe(true);
    expect(guestEventVisibility(event({ visibility: 'reveal_on_date' }), ctx, now).visible).toBe(true);
  });

  it('uses per-recipient inclusion for included_guests events', () => {
    expect(guestEventVisibility(event({ visibility: 'included_guests', event_type: 'reception' }), ctx).visible).toBe(true);
    expect(guestEventVisibility(event({ visibility: 'included_guests', event_type: 'evening' }), ctx)).toMatchObject({ reason: 'not_included' });
    // Event types without an inclusion flag are visible, as in the loader.
    expect(guestEventVisibility(event({ visibility: 'included_guests', event_type: 'other' }), ctx).visible).toBe(true);
  });

  it('applies audience restrictions by invitation, guest or household', () => {
    const restricted = (a: Partial<VisibilityContext['audiences'][number]>) => ({
      ...ctx,
      audiences: [{ event_id: 'e1', audience_type: 'guest', invitation_id: null, guest_id: null, household_id: null, ...a }],
    });
    expect(guestEventVisibility(event(), restricted({ audience_type: 'invitation', invitation_id: 'inv1' })).visible).toBe(true);
    expect(guestEventVisibility(event(), restricted({ audience_type: 'guest', guest_id: 'g1' })).visible).toBe(true);
    expect(guestEventVisibility(event(), restricted({ audience_type: 'household', household_id: 'h1' })).visible).toBe(true);
    expect(guestEventVisibility(event(), restricted({ audience_type: 'guest', guest_id: 'someone-else' }))).toMatchObject({ reason: 'audience' });
    // Audiences for other events don't affect this one.
    expect(guestEventVisibility(event({ id: 'e2' }), restricted({ audience_type: 'guest', guest_id: 'x' })).visible).toBe(true);
  });
});
