/**
 * Which schedule events a guest invitation can see in the guest portal itinerary.
 *
 * This mirrors the rules in supabase/functions/guest-portal-loader (isEventVisibleToGuest,
 * hasAudienceAccess and the published/active status check) so the couple's
 * "Preview guest itinerary" shows exactly what that invitation's guests will see,
 * plus the reason any other event is left out.
 */

export interface VisibilityEvent {
  id: string;
  event_type: string;
  visibility: string;
  reveal_at: string | null;
  status: string;
}

export interface VisibilityRecipient {
  guest_id: string;
  household_id: string | null;
  ceremony_included: boolean;
  reception_included: boolean;
  evening_included: boolean;
  welcome_event_included: boolean;
  day_after_event_included: boolean;
}

export interface VisibilityAudience {
  event_id: string;
  audience_type: string;
  invitation_id: string | null;
  guest_id: string | null;
  household_id: string | null;
}

export interface VisibilityContext {
  invitationId: string;
  recipients: VisibilityRecipient[];
  audiences: VisibilityAudience[];
}

export type HiddenReason =
  | 'not_published'
  | 'hidden'
  | 'not_revealed'
  | 'not_included'
  | 'audience';

export type EventVisibility =
  | { visible: true }
  | { visible: false; reason: HiddenReason; revealAt?: string };

const INCLUSION_FIELD: Record<string, keyof VisibilityRecipient> = {
  ceremony: 'ceremony_included',
  reception: 'reception_included',
  evening: 'evening_included',
  welcome: 'welcome_event_included',
  day_after: 'day_after_event_included',
};

export function guestEventVisibility(
  event: VisibilityEvent,
  ctx: VisibilityContext,
  now: Date = new Date(),
): EventVisibility {
  // Reported first because it is the most useful thing for the couple to fix.
  if (!['published', 'active'].includes(event.status)) return { visible: false, reason: 'not_published' };
  if (event.visibility === 'hidden') return { visible: false, reason: 'hidden' };
  switch (event.visibility) {
    case 'public':
    case 'invitation_holders':
      break;
    case 'reveal_on_date':
      if (event.reveal_at && now < new Date(event.reveal_at)) {
        return { visible: false, reason: 'not_revealed', revealAt: event.reveal_at };
      }
      break;
    case 'included_guests': {
      const field = INCLUSION_FIELD[event.event_type];
      if (field && !ctx.recipients.some((r) => r[field] === true)) {
        return { visible: false, reason: 'not_included' };
      }
      break;
    }
    default:
      return { visible: false, reason: 'hidden' };
  }

  const audiences = ctx.audiences.filter((a) => a.event_id === event.id);
  if (audiences.length > 0) {
    const guestIds = new Set(ctx.recipients.map((r) => r.guest_id));
    const householdIds = new Set(ctx.recipients.map((r) => r.household_id).filter(Boolean));
    const allowed = audiences.some((a) =>
      (a.audience_type === 'invitation' && a.invitation_id === ctx.invitationId) ||
      (a.audience_type === 'guest' && !!a.guest_id && guestIds.has(a.guest_id)) ||
      (a.audience_type === 'household' && !!a.household_id && householdIds.has(a.household_id)),
    );
    if (!allowed) return { visible: false, reason: 'audience' };
  }

  return { visible: true };
}

export function hiddenReasonLabel(v: Extract<EventVisibility, { visible: false }>): string {
  switch (v.reason) {
    case 'not_published':
      return 'Not published yet';
    case 'hidden':
      return 'Hidden from guests';
    case 'not_revealed':
      return v.revealAt
        ? `Appears on ${new Date(v.revealAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Not revealed yet';
    case 'not_included':
      return 'This invitation is not included for this part of the day';
    case 'audience':
      return 'Limited to other guests';
  }
}
