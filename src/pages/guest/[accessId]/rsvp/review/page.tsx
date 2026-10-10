import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useNavigate, useParams, Link } from 'react-router-dom';

export default function GuestRSVPReviewPage() {
  const { data } = useGuestPortal();
  const navigate = useNavigate();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = `/guest/${accessId}`;

  const recipients = data?.recipients || [];
  const wedding = data?.wedding;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-foreground-400 mb-1">
          <button onClick={() => navigate(`${basePath}/rsvp`)} className="hover:text-foreground-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1" />RSVP
          </button>
          <span>/</span>
          <span className="text-foreground-600 font-medium">Review</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mt-2">Review your RSVP</h1>
        <p className="text-sm text-foreground-500 mt-1">Please review your responses before submitting. You can edit any section.</p>
      </div>

      {recipients.map((recipient) => {
        const rsvp = data?.rsvp_responses?.[recipient.guest_id];
        if (!rsvp) return null;

        const isAttending = rsvp.response_status === 'attending';
        const statusLabel = rsvp.response_status === 'attending' ? 'Attending' : rsvp.response_status === 'not_attending' ? 'Not attending' : rsvp.response_status === 'maybe' ? 'Still deciding' : 'Not yet responded';

        return (
          <div key={recipient.guest_id} className="bg-white rounded-2xl border border-secondary-100 p-6 md:p-8 mb-4">
            <div className="flex items-center gap-3 pb-4 border-b border-secondary-100 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-label font-semibold text-sm">
                {(recipient.preferred_name || recipient.guest_name).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-label font-medium text-foreground-900 text-sm">{recipient.preferred_name || recipient.guest_name}</p>
                <p className={`text-xs ${isAttending ? 'text-emerald-600' : rsvp.response_status === 'not_attending' ? 'text-rose-600' : 'text-foreground-500'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isAttending ? 'bg-emerald-500' : rsvp.response_status === 'not_attending' ? 'bg-rose-500' : 'bg-secondary-400'}`} />
                  {statusLabel}
                </p>
              </div>
              <Link to={`${basePath}/rsvp/${recipient.guest_id}`} className="ml-auto text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
                <i className="ri-edit-line mr-1" />Edit
              </Link>
            </div>

            {/* Events */}
            {isAttending && (
              <div className="text-xs text-foreground-600 space-y-1 mb-3">
                {['ceremony', 'reception', 'evening', 'welcome', 'day_after'].map((event) => {
                  const field = `${event}_attending`;
                  const includedField = `${event}_included`;
                  if (!(recipient as unknown as Record<string, unknown>)[includedField]) return null;
                  const isSelected = (rsvp as unknown as Record<string, unknown>)[field];
                  return (
                    <p key={event} className="flex items-center gap-1.5">
                      <i className={`${isSelected ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} text-xs`} />
                      {event === 'ceremony' ? 'Ceremony' : event === 'reception' ? 'Reception' : event === 'evening' ? 'Evening' : event === 'welcome' ? 'Welcome event' : 'Day-after event'}
                    </p>
                  );
                })}
              </div>
            )}

            {/* Meal */}
            {isAttending && rsvp.meal_choice && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Meal:</span> {rsvp.meal_choice}
              </div>
            )}

            {/* Dietary */}
            {isAttending && rsvp.dietary_requirements && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Dietary:</span> <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Sensitive</span> {rsvp.dietary_requirements}
              </div>
            )}

            {/* Allergies */}
            {isAttending && rsvp.allergy_notes && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Allergies:</span> <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Sensitive</span> {rsvp.allergy_notes}
              </div>
            )}

            {/* Accessibility */}
            {isAttending && rsvp.accessibility_notes && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Accessibility:</span> <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Sensitive</span> {rsvp.accessibility_notes}
              </div>
            )}

            {/* Plus-one */}
            {rsvp.plus_one_confirmed && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Plus-one:</span> {rsvp.plus_one_name || (recipient.plus_one_name || 'Confirmed')}
              </div>
            )}

            {/* Children */}
            {rsvp.children_attending_count > 0 && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Children:</span> {rsvp.children_attending_count} attending{rsvp.children_names ? ` — ${rsvp.children_names}` : ''}
              </div>
            )}

            {/* Travel */}
            {rsvp.transport_status && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Transport:</span> {rsvp.transport_status === 'needed' ? 'Need transport' : rsvp.transport_status === 'not_needed' ? 'Not needed' : 'Already arranged'}
              </div>
            )}
            {rsvp.accommodation_status && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Accommodation:</span> {rsvp.accommodation_status === 'needed' ? 'Need accommodation' : rsvp.accommodation_status === 'not_needed' ? 'Not needed' : 'Already booked'}
              </div>
            )}

            {/* Song & message */}
            {rsvp.song_request && (
              <div className="text-xs text-foreground-600 mb-2">
                <span className="text-foreground-400">Song:</span> &ldquo;{rsvp.song_request}&rdquo;
              </div>
            )}
            {rsvp.message_to_couple && (
              <div className="text-xs text-foreground-600 italic bg-background-50 p-2 rounded-lg mt-2">
                &ldquo;{rsvp.message_to_couple}&rdquo;
              </div>
            )}
          </div>
        );
      })}

      {/* Submit button */}
      <div className="flex justify-end gap-3 mt-6">
        <Link to={`${basePath}/rsvp`} className="px-5 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-edit-line mr-1" /> Edit responses
        </Link>
        <Link to={`${basePath}/rsvp`} className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          Back to RSVP <i className="ri-arrow-right-line ml-1" />
        </Link>
      </div>

      {wedding && (
        <p className="text-center text-xs text-foreground-400 mt-6">
          {wedding.partner_one_name} &amp; {wedding.partner_two_name} · {wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        </p>
      )}
    </div>
  );
}