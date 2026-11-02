import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WeddingEvent } from '@/hooks/useWeddingEvents';
import { getEventTypeIcon } from '@/hooks/useWeddingEvents';
import {
  guestEventVisibility,
  hiddenReasonLabel,
  type VisibilityAudience,
  type VisibilityRecipient,
} from '@/lib/guestEventVisibility';

interface InvitationOption {
  id: string;
  label: string;
}

interface RecipientRow extends Omit<VisibilityRecipient, 'household_id'> {
  invitation_id: string;
  guest: { household_id: string | null } | { household_id: string | null }[] | null;
}

interface Props {
  weddingId: string;
  events: WeddingEvent[];
  onClose: () => void;
}

function timeRange(startAt: string | null, endAt: string | null): string {
  if (!startAt) return 'Time to be confirmed';
  const fmt = (v: string) => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return endAt ? `${fmt(startAt)} – ${fmt(endAt)}` : fmt(startAt);
}

function dayLabel(startAt: string | null): string {
  if (!startAt) return 'Date to be confirmed';
  return new Date(startAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Shows the couple what one invitation's guests will see in their itinerary,
 * using the same rules as the guest portal, and why any other event is left out.
 */
export default function GuestItineraryPreview({ weddingId, events, onClose }: Props) {
  const [invitations, setInvitations] = useState<InvitationOption[]>([]);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [audiences, setAudiences] = useState<VisibilityAudience[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      const [inv, rec, aud] = await Promise.all([
        supabase.from('invitations')
          .select('id, internal_name, formal_recipient_name')
          .eq('wedding_id', weddingId).is('archived_at', null)
          .order('formal_recipient_name', { ascending: true }),
        supabase.from('invitation_recipients')
          .select('invitation_id, guest_id, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, guest:guests(household_id)')
          .eq('wedding_id', weddingId),
        supabase.from('wedding_event_audiences')
          .select('event_id, audience_type, invitation_id, guest_id, household_id')
          .eq('wedding_id', weddingId),
      ]);
      if (cancelled) return;
      if (inv.error || rec.error || aud.error) {
        setLoadError('Could not load your invitations. Please try again.');
        setLoading(false);
        return;
      }
      const options = (inv.data || []).map((i) => ({
        id: i.id as string,
        label: (i.formal_recipient_name as string | null) || (i.internal_name as string | null) || 'Untitled invitation',
      }));
      setInvitations(options);
      setRecipients((rec.data || []) as unknown as RecipientRow[]);
      setAudiences((aud.data || []) as VisibilityAudience[]);
      setSelectedId((current) => current || options[0]?.id || '');
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [weddingId]);

  const { shown, hidden } = useMemo(() => {
    const ctxRecipients: VisibilityRecipient[] = recipients
      .filter((r) => r.invitation_id === selectedId)
      .map((r) => {
        const guest = Array.isArray(r.guest) ? r.guest[0] : r.guest;
        return { ...r, household_id: guest?.household_id ?? null };
      });
    const sorted = [...events].sort((a, b) => (a.start_at || '9999').localeCompare(b.start_at || '9999'));
    const shownEvents: WeddingEvent[] = [];
    const hiddenEvents: { event: WeddingEvent; reason: string }[] = [];
    for (const evt of sorted) {
      if (evt.status === 'archived') continue;
      const v = guestEventVisibility(evt, { invitationId: selectedId, recipients: ctxRecipients, audiences });
      if (v.visible) shownEvents.push(evt);
      else hiddenEvents.push({ event: evt, reason: hiddenReasonLabel(v) });
    }
    return { shown: shownEvents, hidden: hiddenEvents };
  }, [events, recipients, audiences, selectedId]);

  const days = useMemo(() => {
    const groups: { label: string; events: WeddingEvent[] }[] = [];
    for (const evt of shown) {
      const label = dayLabel(evt.start_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.events.push(evt);
      else groups.push({ label, events: [evt] });
    }
    return groups;
  }, [shown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="itinerary-preview-title"
        className="bg-background-50 w-full sm:max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-secondary-100">
          <div>
            <p className="text-[10px] font-label uppercase tracking-widest text-foreground-400 mb-1">Preview</p>
            <h2 id="itinerary-preview-title" className="font-heading text-xl text-foreground-900">Guest itinerary</h2>
            <p className="text-xs text-foreground-500 mt-1">Exactly what the guests on one invitation will see, using your current settings.</p>
          </div>
          <button onClick={onClose} aria-label="Close preview" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-foreground-500 flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Loading invitations…</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-mail-line text-3xl text-foreground-300" />
              <p className="text-sm text-foreground-700 mt-2">Create an invitation first</p>
              <p className="text-xs text-foreground-500 mt-1">The itinerary depends on who is invited to which part of the day, so the preview works per invitation.</p>
            </div>
          ) : (
            <>
              <label className="block text-xs font-label text-foreground-600 mb-1.5" htmlFor="preview-invitation">Preview as</label>
              <select
                id="preview-invitation"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 mb-5"
              >
                {invitations.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>

              {shown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-secondary-200 p-6 text-center">
                  <p className="text-sm text-foreground-700">These guests won&apos;t see any events yet.</p>
                  <p className="text-xs text-foreground-500 mt-1">Publish events and check who they are visible to.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {days.map((day) => (
                    <section key={day.label}>
                      <h3 className="text-xs font-label font-semibold uppercase tracking-wider text-foreground-500 mb-2">{day.label}</h3>
                      <ul className="space-y-2">
                        {day.events.map((evt) => (
                          <li key={evt.id} className="bg-white border border-secondary-100 rounded-xl p-4 flex gap-3">
                            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
                              <i className={getEventTypeIcon(evt.event_type)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-label font-semibold text-foreground-900">{evt.name}</p>
                              <p className="text-xs text-foreground-500">{timeRange(evt.start_at, evt.end_at)}{evt.venue?.name ? ` · ${evt.venue.name}` : ''}</p>
                              {evt.guest_description && <p className="text-xs text-foreground-600 mt-1.5 whitespace-pre-line">{evt.guest_description}</p>}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-foreground-500">
                                {evt.dress_code && <span><i className="ri-t-shirt-line mr-1" />{evt.dress_code}</span>}
                                {evt.arrival_notes && <span><i className="ri-time-line mr-1" />{evt.arrival_notes}</span>}
                                {evt.parking_notes && <span><i className="ri-parking-box-line mr-1" />{evt.parking_notes}</span>}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}

              {hidden.length > 0 && (
                <details className="mt-6 rounded-xl bg-background-100 p-4">
                  <summary className="text-xs font-label font-semibold text-foreground-700 cursor-pointer">
                    Not shown to these guests ({hidden.length})
                  </summary>
                  <ul className="mt-3 space-y-1.5">
                    {hidden.map(({ event, reason }) => (
                      <li key={event.id} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-foreground-700">{event.name}</span>
                        <span className="text-foreground-500 text-right">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
