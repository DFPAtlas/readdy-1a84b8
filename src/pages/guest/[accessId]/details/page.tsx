import { useGuestPortal } from '@/hooks/useGuestPortal';

export default function GuestDetailsPage() {
  const { data, loading, error } = useGuestPortal();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-red-600">{error || 'Could not load wedding details.'}</p>
      </div>
    );
  }

  const wedding = data.wedding;
  const events = data.events;
  const recipients = data.recipients;
  const dateDisplay = wedding.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const ceremonyEvent = events.find((e) => e.event_type === 'ceremony');
  const receptionEvent = events.find((e) => e.event_type === 'reception');
  const eveningEvent = events.find((e) => e.event_type === 'evening');
  const welcomeEvent = events.find((e) => e.event_type === 'welcome');
  const dayAfterEvent = events.find((e) => e.event_type === 'day_after');

  const primaryRecipient = recipients.find((r) => r.recipient_role === 'primary' || r.recipient_role === 'partner');
  const canSeeCeremony = primaryRecipient?.ceremony_included;
  const canSeeReception = primaryRecipient?.reception_included;
  const canSeeEvening = primaryRecipient?.evening_included;
  const canSeeWelcome = primaryRecipient?.welcome_event_included;
  const canSeeDayAfter = primaryRecipient?.day_after_event_included;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">
          {wedding.partner_one_name} &amp; {wedding.partner_two_name}
        </h1>
        <p className="text-sm text-foreground-500">{dateDisplay}</p>
      </div>

      {/* Ceremony */}
      {ceremonyEvent && canSeeCeremony !== false && (
        <div className="card-default mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
              <i className="ri-heart-2-line text-lg" />
            </div>
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">{ceremonyEvent.name}</h2>
              {ceremonyEvent.start_at && (
                <p className="text-xs text-foreground-500">
                  {new Date(ceremonyEvent.start_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at{' '}
                  {new Date(ceremonyEvent.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          {ceremonyEvent.venue && (
            <div className="bg-background-50 rounded-lg p-4 mb-3">
              <p className="text-sm font-label font-medium text-foreground-900">{ceremonyEvent.venue.name}</p>
              <p className="text-xs text-foreground-500 mt-0.5">
                {[ceremonyEvent.venue.address_line_1, ceremonyEvent.venue.city, ceremonyEvent.venue.postcode, ceremonyEvent.venue.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          {ceremonyEvent.arrival_notes && (
            <p className="text-xs text-foreground-500 mt-2"><strong className="text-foreground-700">Arrival:</strong> {ceremonyEvent.arrival_notes}</p>
          )}
        </div>
      )}

      {/* Reception */}
      {receptionEvent && canSeeReception !== false && (
        <div className="card-default mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <i className="ri-cake-line text-lg" />
            </div>
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">{receptionEvent.name}</h2>
              {receptionEvent.start_at && (
                <p className="text-xs text-foreground-500">
                  {new Date(receptionEvent.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} onwards
                </p>
              )}
            </div>
          </div>
          {receptionEvent.venue && (
            <div className="bg-background-50 rounded-lg p-4">
              <p className="text-sm font-label font-medium text-foreground-900">{receptionEvent.venue.name}</p>
              <p className="text-xs text-foreground-500 mt-0.5">
                {[receptionEvent.venue.address_line_1, receptionEvent.venue.city, receptionEvent.venue.postcode, receptionEvent.venue.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Evening */}
      {eveningEvent && canSeeEvening !== false && (
        <div className="card-default mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
              <i className="ri-moon-line text-lg" />
            </div>
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">{eveningEvent.name}</h2>
              {eveningEvent.start_at && (
                <p className="text-xs text-foreground-500">
                  {new Date(eveningEvent.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} onwards
                </p>
              )}
            </div>
          </div>
          {eveningEvent.description && <p className="text-sm text-foreground-600">{eveningEvent.description}</p>}
        </div>
      )}

      {/* Welcome event */}
      {welcomeEvent && canSeeWelcome !== false && (
        <div className="card-default mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <i className="ri-drinks-line text-lg" />
            </div>
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">{welcomeEvent.name}</h2>
              {welcomeEvent.start_at && (
                <p className="text-xs text-foreground-500">
                  {new Date(welcomeEvent.start_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at{' '}
                  {new Date(welcomeEvent.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          {welcomeEvent.description && <p className="text-sm text-foreground-600">{welcomeEvent.description}</p>}
        </div>
      )}

      {/* Day after */}
      {dayAfterEvent && canSeeDayAfter !== false && (
        <div className="card-default mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
              <i className="ri-cup-line text-lg" />
            </div>
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">{dayAfterEvent.name}</h2>
              {dayAfterEvent.start_at && (
                <p className="text-xs text-foreground-500">
                  {new Date(dayAfterEvent.start_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at{' '}
                  {new Date(dayAfterEvent.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          {dayAfterEvent.description && <p className="text-sm text-foreground-600">{dayAfterEvent.description}</p>}
        </div>
      )}

      {/* Dress code */}
      {wedding.dress_code && (
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2">
            <i className="ri-t-shirt-line text-foreground-500" /> Dress Code
          </h2>
          <p className="text-sm text-foreground-700">{wedding.dress_code}</p>
        </div>
      )}

      {/* Parking & accessibility */}
      {(wedding.parking_notes || wedding.accessibility_notes) && (
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Getting Here</h2>
          {wedding.parking_notes && (
            <div className="mb-3">
              <p className="text-xs text-foreground-500 font-label mb-1">Parking</p>
              <p className="text-sm text-foreground-700">{wedding.parking_notes}</p>
            </div>
          )}
          {wedding.accessibility_notes && (
            <div>
              <p className="text-xs text-foreground-500 font-label mb-1">Accessibility</p>
              <p className="text-sm text-foreground-700">{wedding.accessibility_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Policies */}
      {(wedding.children_policy || wedding.plus_one_policy) && (
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Guest Information</h2>
          {wedding.children_policy && (
            <div className="mb-3">
              <p className="text-xs text-foreground-500 font-label mb-1">Children</p>
              <p className="text-sm text-foreground-700">{wedding.children_policy}</p>
            </div>
          )}
          {wedding.plus_one_policy && (
            <div>
              <p className="text-xs text-foreground-500 font-label mb-1">Plus-ones</p>
              <p className="text-sm text-foreground-700">{wedding.plus_one_policy}</p>
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      {wedding.contact_information && (
        <div className="card-default">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2">
            <i className="ri-chat-1-line text-foreground-500" /> Contact
          </h2>
          <p className="text-sm text-foreground-600">{wedding.contact_information}</p>
        </div>
      )}
    </div>
  );
}