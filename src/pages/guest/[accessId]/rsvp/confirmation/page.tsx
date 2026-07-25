import { useNavigate, useParams } from 'react-router-dom';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';

// ── Normal mode — preserve existing Supabase confirmation page ──
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link } from 'react-router-dom';

function NormalRSVPConfirmationPage() {
  const { data } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = `/guest/${accessId}`;
  const recipients = data?.recipients || [];
  const wedding = data?.wedding;
  const attendingGuests = recipients.filter((r) => { const rsvp = data?.rsvp_responses?.[r.guest_id]; return rsvp?.response_status === 'attending'; });
  const notAttendingGuests = recipients.filter((r) => { const rsvp = data?.rsvp_responses?.[r.guest_id]; return rsvp?.response_status === 'not_attending'; });
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center bg-white rounded-2xl border border-secondary-100 p-8 md:p-12">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6"><i className="ri-check-double-line text-4xl" /></div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-3">Thank you — your RSVP has been received</h1>
        <div className="bg-background-50 rounded-xl p-5 mb-6">
          {attendingGuests.length > 0 && <p className="text-sm text-foreground-700"><i className="ri-check-line text-emerald-500 mr-1" /><strong>Attending:</strong> {attendingGuests.map((g) => g.preferred_name || g.guest_name).join(', ')}</p>}
          {notAttendingGuests.length > 0 && <p className="text-sm text-foreground-500"><i className="ri-close-line text-foreground-400 mr-1" /><strong>Not attending:</strong> {notAttendingGuests.map((g) => g.preferred_name || g.guest_name).join(', ')}</p>}
        </div>
        <Link to={basePath} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-home-4-line" /> Back to dashboard</Link>
        {wedding && <p className="text-xs text-foreground-400 mt-4">{wedding.partner_one_name} &amp; {wedding.partner_two_name}</p>}
      </div>
    </div>
  );
}

// ── Demo mode ──

function DemoRSVPConfirmationPage() {
  const navigate = useNavigate();
  const { accessId } = useParams<{ accessId: string }>();
  const demo = useDemoDataSafe();

  if (!demo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6"><i className="ri-error-warning-line text-3xl" /></div>
        <h1 className="font-heading text-2xl text-foreground-900 mb-3">Demo Not Available</h1>
        <p className="text-sm text-foreground-500">Demo mode must be active.</p>
      </div>
    );
  }

  const { state } = demo;
  const basePath = `/guest/${accessId}`;
  const wedding = state.wedding;
  const guest = state.guests.find((g) => g.id === 'demo-guest-oliver');

  if (!guest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">Guest data not found.</p>
      </div>
    );
  }

  const isAttending = guest.rsvp_status === 'accepted';
  const dateDisplay = wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center bg-white rounded-2xl border border-secondary-100 p-8 md:p-12">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6">
          <i className="ri-check-double-line text-4xl" />
        </div>

        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">
          Thank you, {guest.preferred_name}!
        </h1>
        <p className="text-sm text-foreground-500 mb-2">Your demo response has been saved on this device.</p>

        {guest.rsvp_submitted_at && (
          <p className="text-xs text-foreground-400 mb-6">
            Submitted on {new Date(guest.rsvp_submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Attendance summary */}
        <div className="bg-background-50 rounded-xl p-5 mb-6 text-left">
          <h2 className="font-label text-sm font-semibold text-foreground-800 mb-3">Your response summary</h2>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isAttending ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-foreground-700">
                <strong>{guest.preferred_name} {guest.last_name}:</strong>{' '}
                {isAttending ? 'Joyfully attending' : 'Regretfully declined'}
              </span>
            </p>

            {isAttending && (
              <>
                {guest.rsvp_ceremony_attending && (
                  <p className="flex items-center gap-2 ml-4">
                    <i className="ri-checkbox-circle-fill text-emerald-500 text-xs" />
                    <span className="text-xs text-foreground-600">Wedding Ceremony — 1:00 PM</span>
                  </p>
                )}
                {guest.rsvp_reception_attending && (
                  <p className="flex items-center gap-2 ml-4">
                    <i className="ri-checkbox-circle-fill text-emerald-500 text-xs" />
                    <span className="text-xs text-foreground-600">Wedding Breakfast — 3:00 PM</span>
                  </p>
                )}
                {guest.rsvp_evening_attending && (
                  <p className="flex items-center gap-2 ml-4">
                    <i className="ri-checkbox-circle-fill text-emerald-500 text-xs" />
                    <span className="text-xs text-foreground-600">Evening Celebration — 7:00 PM</span>
                  </p>
                )}

                {guest.meal_choice && (
                  <div className="pt-2">
                    <p className="text-xs text-foreground-400">Meal choice</p>
                    <p className="text-sm text-foreground-700">{guest.meal_choice}</p>
                  </div>
                )}
                {guest.dietary_requirements && (
                  <div>
                    <p className="text-xs text-foreground-400">Dietary requirements</p>
                    <p className="text-xs text-foreground-600">{guest.dietary_requirements}</p>
                  </div>
                )}
                {guest.allergy_notes && (
                  <div>
                    <p className="text-xs text-foreground-400">
                      Allergies <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Sensitive</span>
                    </p>
                    <p className="text-xs text-foreground-600">{guest.allergy_notes}</p>
                  </div>
                )}
                {guest.accessibility_notes && (
                  <div>
                    <p className="text-xs text-foreground-400">Accessibility</p>
                    <p className="text-xs text-foreground-600">{guest.accessibility_notes}</p>
                  </div>
                )}
                {(guest.rsvp_plus_one_confirmed || guest.plus_one_name) && (
                  <div>
                    <p className="text-xs text-foreground-400">Plus-one</p>
                    <p className="text-sm text-foreground-700">{guest.plus_one_name || 'Confirmed'}</p>
                  </div>
                )}
              </>
            )}

            {guest.rsvp_message && (
              <div className="pt-2">
                <p className="text-xs text-foreground-400">Message to the couple</p>
                <p className="text-xs text-foreground-600 italic">&ldquo;{guest.rsvp_message}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Next actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(basePath)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-home-4-line" /> Continue to guest portal
          </button>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <button onClick={() => navigate(`${basePath}/rsvp`)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-edit-line mr-1" /> Change response
            </button>
            <button onClick={() => navigate(`${basePath}/itinerary`)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-calendar-event-line mr-1" /> View itinerary
            </button>
          </div>
        </div>

        {/* Wedding info */}
        <p className="text-xs text-foreground-400 mt-6">
          {wedding.partner_one_name} &amp; {wedding.partner_two_name} &middot; {dateDisplay}
        </p>
      </div>

      {/* Demo note */}
      <p className="mt-4 text-center text-xs text-foreground-400">
        Demo mode &mdash; no confirmation email was sent. This response is saved on your device.
      </p>
    </div>
  );
}

// ── Export ──

export default function RSVPConfirmationPage() {
  if (isDemoMode) return <DemoRSVPConfirmationPage />;
  return <NormalRSVPConfirmationPage />;
}