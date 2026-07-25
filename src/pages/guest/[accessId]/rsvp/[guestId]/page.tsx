import { useState, useEffect, useCallback } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useNavigate, useParams, Link } from 'react-router-dom';

export default function GuestRSVPGuestPage() {
  const { data } = useGuestPortal();
  const navigate = useNavigate();
  const { accessId, guestId } = useParams<{ accessId: string; guestId: string }>();
  const basePath = `/guest/${accessId}`;

  const recipient = data?.recipients.find((r) => r.guest_id === guestId);
  const rsvp = guestId ? data?.rsvp_responses?.[guestId] : null;

  if (!recipient) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">Guest not found in your invitation.</p>
        <Link to={`${basePath}/rsvp`} className="mt-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">Back to RSVP</Link>
      </div>
    );
  }

  const isAttending = rsvp?.response_status === 'attending';
  const statusLabel = rsvp?.response_status === 'attending' ? 'Attending' : rsvp?.response_status === 'not_attending' ? 'Not attending' : rsvp?.response_status === 'maybe' ? 'Still deciding' : 'Not yet responded';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-foreground-400 mb-1">
          <button onClick={() => navigate(`${basePath}/rsvp`)} className="hover:text-foreground-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1" />RSVP
          </button>
          <span>/</span>
          <span className="text-foreground-600 font-medium">{recipient.preferred_name || recipient.guest_name}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-secondary-100 p-6 md:p-8">
        <div className="flex items-center gap-3 pb-5 border-b border-secondary-100 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-heading font-bold text-lg">
            {(recipient.preferred_name || recipient.guest_name).charAt(0)}
          </div>
          <div>
            <h1 className="font-heading text-xl text-foreground-900">{recipient.preferred_name || recipient.guest_name}</h1>
            <p className={`text-xs ${isAttending ? 'text-emerald-600' : rsvp?.response_status === 'not_attending' ? 'text-rose-600' : 'text-foreground-500'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isAttending ? 'bg-emerald-500' : rsvp?.response_status === 'not_attending' ? 'bg-rose-500' : 'bg-secondary-400'}`} />
              {statusLabel}
            </p>
          </div>
        </div>

        {!rsvp ? (
          <div className="text-center py-8">
            <p className="text-sm text-foreground-500">No RSVP has been started yet for this guest.</p>
            <Link to={`${basePath}/rsvp`} className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">Go to RSVP form</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Events */}
            {isAttending && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-2">Events attending</h3>
                <div className="space-y-1 text-sm">
                  {['ceremony', 'reception', 'evening', 'welcome', 'day_after'].map((event) => {
                    const field = `${event}_attending`;
                    const includedField = `${event}_included`;
                    if (!(recipient as Record<string, unknown>)[includedField]) return null;
                    const isSelected = (rsvp as Record<string, unknown>)[field];
                    return (
                      <p key={event} className="flex items-center gap-2 text-foreground-700">
                        <i className={`${isSelected ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} text-sm`} />
                        {event === 'ceremony' ? 'Ceremony' : event === 'reception' ? 'Reception / Wedding breakfast' : event === 'evening' ? 'Evening reception' : event === 'welcome' ? 'Welcome event' : 'Day-after event'}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meal */}
            {isAttending && rsvp.meal_choice && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Meal choice</h3>
                <p className="text-sm text-foreground-700">{rsvp.meal_choice}</p>
              </div>
            )}

            {/* Dietary */}
            {isAttending && rsvp.dietary_requirements && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">
                  Dietary requirements <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span>
                </h3>
                <p className="text-sm text-foreground-700">{rsvp.dietary_requirements}</p>
              </div>
            )}

            {/* Allergies */}
            {isAttending && rsvp.allergy_notes && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">
                  Allergies <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span>
                </h3>
                <p className="text-sm text-foreground-700">{rsvp.allergy_notes}</p>
              </div>
            )}

            {/* Accessibility */}
            {isAttending && rsvp.accessibility_notes && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">
                  Accessibility <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span>
                </h3>
                <p className="text-sm text-foreground-700">{rsvp.accessibility_notes}</p>
              </div>
            )}

            {/* Plus-one */}
            {rsvp.plus_one_confirmed && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Plus-one</h3>
                <p className="text-sm text-foreground-700">{rsvp.plus_one_name || (recipient.plus_one_name || 'Confirmed')}</p>
              </div>
            )}

            {/* Children */}
            {rsvp.children_attending_count > 0 && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Children</h3>
                <p className="text-sm text-foreground-700">{rsvp.children_attending_count} attending{rsvp.children_names ? ` — ${rsvp.children_names}` : ''}</p>
              </div>
            )}

            {/* Travel */}
            {rsvp.transport_status && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Transport</h3>
                <p className="text-sm text-foreground-700">{rsvp.transport_status === 'needed' ? 'Need transport' : rsvp.transport_status === 'not_needed' ? 'Not needed' : 'Already arranged'}</p>
              </div>
            )}
            {rsvp.accommodation_status && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Accommodation</h3>
                <p className="text-sm text-foreground-700">{rsvp.accommodation_status === 'needed' ? 'Need accommodation' : rsvp.accommodation_status === 'not_needed' ? 'Not needed' : 'Already booked'}</p>
              </div>
            )}

            {/* Song & message */}
            {rsvp.song_request && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Song request</h3>
                <p className="text-sm text-foreground-700">&ldquo;{rsvp.song_request}&rdquo;</p>
              </div>
            )}
            {rsvp.message_to_couple && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Message to the couple</h3>
                <p className="text-sm text-foreground-700 italic">&ldquo;{rsvp.message_to_couple}&rdquo;</p>
              </div>
            )}

            {/* Custom answers */}
            {rsvp.custom_answers && rsvp.custom_answers.length > 0 && (
              <div>
                <h3 className="text-xs font-label font-semibold text-foreground-400 uppercase tracking-wide mb-1">Additional answers</h3>
                <div className="space-y-1">
                  {rsvp.custom_answers.map((a, i) => (
                    <p key={i} className="text-sm text-foreground-700">
                      <span className="text-foreground-400">{a.question_label}:</span> {a.answer}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-secondary-100 flex justify-end">
          <Link to={`${basePath}/rsvp`} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-edit-line mr-1" /> Edit in RSVP form
          </Link>
        </div>
      </div>
    </div>
  );
}