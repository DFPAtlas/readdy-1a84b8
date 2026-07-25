import type { GuestPortalData } from '@/hooks/useGuestPortal';
import type { WeddingEvent, LocalPlace, AccommodationPlan, GuestTravelPlan } from '@/types/access';
import { Link } from 'react-router-dom';

// ── Helpers ──

function formatDateGB(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── ITINERARY PREVIEW ──

interface ItineraryPreviewProps {
  events: WeddingEvent[];
  basePath: string;
  isEnabled?: boolean;
}

export function ItineraryPreview({ events, basePath, isEnabled }: ItineraryPreviewProps) {
  const now = new Date();
  const upcoming = events
    .filter((e) => e.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-xs text-foreground-400 italic">The couple has not yet enabled the itinerary.</p>
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="text-xs text-foreground-400 italic">The couple is still preparing the itinerary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcoming.slice(0, 3).map((event, i) => {
        const eventDate = new Date(event.start_at!);
        const isPast = eventDate < now;
        const isToday = eventDate.toDateString() === now.toDateString();
        const isCancelled = event.status === 'cancelled';
        const hasChanges = event.linked_updates && event.linked_updates.length > 0;
        const lastChange = hasChanges ? event.linked_updates![0] : null;

        return (
          <div
            key={event.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              isCancelled ? 'bg-foreground-50/60 opacity-60' :
              isPast ? 'bg-background-50 opacity-60' : isToday ? 'bg-primary-50/50' : 'bg-background-50/60'
            }`}
          >
            {/* Time column */}
            <div className="w-14 flex-shrink-0 text-center">
              <p className={`text-xs font-label font-semibold ${isCancelled ? 'text-foreground-400 line-through' : isPast ? 'text-foreground-400' : 'text-foreground-800'}`}>
                {formatTime(event.start_at!)}
              </p>
              {event.end_at && (
                <p className="text-[10px] text-foreground-400">{formatTime(event.end_at)}</p>
              )}
            </div>

            {/* Dot + line connector */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${
                isCancelled ? 'bg-foreground-300' :
                isPast ? 'bg-secondary-300' : isToday ? 'bg-primary-500' : 'bg-accent-500'
              }`} />
              {i < Math.min(upcoming.length, 3) - 1 && (
                <div className="w-px h-4 bg-secondary-200" />
              )}
            </div>

            {/* Event info */}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-label font-medium truncate ${isCancelled ? 'text-foreground-400 line-through' : isPast ? 'text-foreground-500' : 'text-foreground-900'}`}>
                {event.name}
              </p>
              <p className="text-[11px] text-foreground-500 truncate">
                {event.venue?.name || 'Venue to be confirmed'}
              </p>
              {lastChange && (
                <p className="text-[10px] text-amber-600 font-label mt-0.5">
                  <i className="ri-time-line mr-0.5" />{lastChange.title}
                </p>
              )}
            </div>

            {/* Status badge */}
            <div className="flex-shrink-0">
              {isCancelled ? (
                <span className="px-1.5 py-0.5 rounded-full bg-foreground-100 text-foreground-500 text-[10px] font-label">Cancelled</span>
              ) : isPast ? (
                <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600 text-[10px] font-label">Done</span>
              ) : isToday ? (
                <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 text-[10px] font-label">Now</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-600 text-[10px] font-label">Upcoming</span>
              )}
            </div>
          </div>
        );
      })}

      <Link
        to={`${basePath}/itinerary`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mt-2"
      >
        View full itinerary <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── RSVP PREVIEW ──

interface RsvpPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function RsvpPreview({ data, basePath }: RsvpPreviewProps) {
  const settings = data.portal_settings || {};
  const rsvpEnabled = settings.rsvp_enabled !== false;
  const deadline = data.invitation.rsvp_deadline;
  const recipients = data.recipients;
  const totalRecipients = recipients.length;

  // Aggregate household RSVP status
  const submitted = recipients.filter((r) => {
    const rsvp = data.rsvp_responses?.[r.guest_id];
    return rsvp?.submitted_at && !rsvp?.is_draft;
  }).length;
  const inDraft = recipients.filter((r) => {
    const rsvp = data.rsvp_responses?.[r.guest_id];
    return rsvp?.is_draft && !rsvp?.submitted_at;
  }).length;
  const notStarted = totalRecipients - submitted - inDraft;
  const allSubmitted = totalRecipients > 0 && submitted === totalRecipients;

  // Determine primary response status
  const primaryRecipient = recipients[0];
  const primaryRsvp = primaryRecipient ? data.rsvp_responses?.[primaryRecipient.guest_id] : null;
  const hasSubmitted = !!(primaryRsvp?.submitted_at && !primaryRsvp?.is_draft);

  if (!rsvpEnabled) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">The couple have not yet opened RSVPs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          allSubmitted
            ? primaryRsvp?.response_status === 'attending' ? 'bg-accent-500' : primaryRsvp?.response_status === 'not_attending' ? 'bg-foreground-400' : 'bg-secondary-400'
            : inDraft > 0 ? 'bg-amber-400'
            : 'bg-secondary-300'
        }`} />
        <span className="text-xs font-label font-medium text-foreground-800">
          {allSubmitted
            ? primaryRsvp?.response_status === 'attending' ? 'Attending' : primaryRsvp?.response_status === 'not_attending' ? 'Not attending' : 'Still deciding'
            : inDraft > 0 ? 'In progress'
            : 'Not yet responded'}
        </span>
        {data.rsvp_submission?.is_late && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-label">Late</span>
        )}
      </div>

      {/* Progress */}
      {totalRecipients > 1 && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-secondary-200 overflow-hidden">
            <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${(submitted / totalRecipients) * 100}%` }} />
          </div>
          <span className="text-[10px] text-foreground-400">{submitted}/{totalRecipients}</span>
        </div>
      )}

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground-500">
        {deadline && (
          <span>
            <i className="ri-calendar-line mr-1 text-foreground-400" />
            Deadline: {formatDateGB(deadline)}
          </span>
        )}
        <span>
          <i className="ri-user-line mr-1 text-foreground-400" />
          {totalRecipients} {totalRecipients === 1 ? 'guest' : 'guests'} invited
        </span>
        {allSubmitted && primaryRsvp?.meal_choice && (
          <span className="text-emerald-600">
            <i className="ri-restaurant-line mr-1" /> Meal chosen
          </span>
        )}
        {allSubmitted && primaryRsvp?.dietary_requirements && (
          <span className="text-rose-500">
            <i className="ri-shield-check-line mr-1" /> Requirements noted
          </span>
        )}
      </div>

      {/* Per-guest mini summary */}
      {totalRecipients > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {recipients.map((r) => {
            const rsvp = data.rsvp_responses?.[r.guest_id];
            const done = !!(rsvp?.submitted_at && !rsvp?.is_draft);
            const draft = !!(rsvp?.is_draft && !rsvp?.submitted_at);
            return (
              <span key={r.guest_id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label ${
                done ? 'bg-emerald-50 text-emerald-600' : draft ? 'bg-amber-50 text-amber-600' : 'bg-secondary-100 text-foreground-400'
              }`}>
                <span className={`w-1 h-1 rounded-full ${done ? 'bg-emerald-500' : draft ? 'bg-amber-400' : 'bg-secondary-300'}`} />
                {r.preferred_name || r.guest_name}
              </span>
            );
          })}
        </div>
      )}

      {/* Plus-one */}
      {primaryRecipient?.plus_one_allowed && (
        <div className="text-[11px] text-foreground-500">
          <i className="ri-heart-add-line mr-1 text-foreground-400" />
          {primaryRecipient.plus_one_name
            ? `Plus one: ${primaryRecipient.plus_one_name}`
            : 'Plus-one invited'}
        </div>
      )}

      <Link
        to={`${basePath}/rsvp`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        {allSubmitted ? 'View RSVP details' : notStarted > 0 && submitted === 0 ? 'Complete RSVP' : 'Continue RSVP'}
        <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── ACCOMMODATION PREVIEW ──

interface AccommodationPreviewProps {
  plans: AccommodationPlan[];
  localPlaces: LocalPlace[];
  travelPlans: GuestTravelPlan[];
  basePath: string;
}

export function AccommodationPreview({ plans, localPlaces, travelPlans, basePath }: AccommodationPreviewProps) {
  // Prefer the enhanced travelPlans over the old accommodationPlans
  const accPlan = travelPlans.find((p) => p.plan_type === 'accommodation');
  const accPlace = accPlan?.place_id ? localPlaces.find((p) => p.id === accPlan.place_id) : null;

  if (accPlan && accPlace) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          {accPlace.image_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-100">
              <img src={accPlace.image_url} alt={accPlace.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-label font-semibold text-foreground-900 truncate">{accPlace.name}</p>
            {accPlace.city && (
              <p className="text-[11px] text-foreground-500">{accPlace.city}{accPlace.country ? `, ${accPlace.country}` : ''}</p>
            )}
            {accPlan.check_in_date && accPlan.check_out_date && (
              <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                <i className="ri-check-line text-[10px] mr-0.5" />
                {new Date(accPlan.check_in_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — {new Date(accPlan.check_out_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
        <Link
          to={`${basePath}/travel/accommodation`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          View accommodation <i className="ri-arrow-right-line text-[10px]" />
        </Link>
      </div>
    );
  }

  // Fall back to old plans
  if (plans.length > 0) {
    const plan = plans[0];
    const place = plan.place;

    return (
      <div className="space-y-3">
        {place && (
          <div className="flex gap-3">
            {place.image_url && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-100">
                <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-label font-semibold text-foreground-900 truncate">{place.name}</p>
              {place.city && (
                <p className="text-[11px] text-foreground-500">{place.city}{place.country ? `, ${place.country}` : ''}</p>
              )}
              {plan.check_in_date && plan.check_out_date && (
                <p className="text-[11px] text-foreground-500 mt-0.5">
                  {new Date(plan.check_in_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — {new Date(plan.check_out_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        )}
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          View accommodation <i className="ri-arrow-right-line text-[10px]" />
        </Link>
      </div>
    );
  }

  // Show recommended places
  const accommodationPlaces = localPlaces.filter((p) => p.place_type === 'accommodation' || p.place_type === 'hotel');
  if (accommodationPlaces.length > 0) {
    return (
      <div className="space-y-2">
        {accommodationPlaces.slice(0, 2).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-xs text-foreground-700">
            <i className="ri-hotel-line text-foreground-400 text-sm" />
            <span className="truncate">{p.name}</span>
            {p.distance_from_venue && (
              <span className="text-[10px] text-foreground-400 ml-auto">{p.distance_from_venue.toFixed(1)} mi</span>
            )}
          </div>
        ))}
        <Link
          to={`${basePath}/travel/accommodation`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          Explore places to stay <i className="ri-arrow-right-line text-[10px]" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <p className="text-xs text-foreground-400 italic">Accommodation details will appear here closer to the wedding.</p>
    </div>
  );
}

// ── GETTING THERE PREVIEW ──

interface GettingTherePreviewProps {
  parkingNotes?: string | null;
  venues: WeddingEvent[];
  basePath: string;
}

export function GettingTherePreview({ parkingNotes, venues, basePath }: GettingTherePreviewProps) {
  const venueCities = [...new Set(
    venues.filter((e) => e.venue?.city).map((e) => e.venue!.city!)
  )];

  return (
    <div className="space-y-3">
      {/* Transport options */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 rounded-full bg-secondary-100 text-[10px] font-label text-foreground-600">
          <i className="ri-car-line mr-1" />Car
        </span>
        <span className="px-2 py-1 rounded-full bg-secondary-100 text-[10px] font-label text-foreground-600">
          <i className="ri-train-line mr-1" />Train
        </span>
        {venueCities.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-secondary-100 text-[10px] font-label text-foreground-600">
            <i className="ri-flight-land-line mr-1" />Air
          </span>
        )}
      </div>

      {venueCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {venueCities.slice(0, 2).map((city) => (
            <span key={city} className="flex items-center gap-1 text-[11px] text-foreground-500">
              <i className="ri-map-pin-line text-foreground-400" />
              {city}
            </span>
          ))}
        </div>
      )}

      {parkingNotes && (
        <p className="text-[11px] text-foreground-500">
          <i className="ri-parking-box-line mr-1 text-foreground-400" />
          {parkingNotes}
        </p>
      )}

      {venueCities.length === 0 && !parkingNotes && (
        <div className="flex items-center justify-center py-3">
          <p className="text-xs text-foreground-400 italic">Transport details will be confirmed closer to the wedding date.</p>
        </div>
      )}

      <Link
        to={`${basePath}/travel`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        View travel guide <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── WEDDING LOCATION PREVIEW ──

interface LocationPreviewProps {
  venues: WeddingEvent[];
  basePath: string;
  showLocation?: boolean;
}

export function LocationPreview({ venues, basePath, showLocation }: LocationPreviewProps) {
  if (!showLocation) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Location details are not currently available.</p>
      </div>
    );
  }

  const mainVenue = venues.find((e) => e.venue?.name)?.venue;
  if (!mainVenue) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">The wedding location will be shown once the couple confirms their venue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map placeholder */}
      <div className="w-full h-32 rounded-lg bg-secondary-100 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <i className="ri-map-pin-2-line text-2xl text-foreground-300 block mb-1" />
          <p className="text-[10px] text-foreground-400">Interactive map available on the Travel page</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-label font-semibold text-foreground-900">{mainVenue.name}</p>
        <p className="text-[11px] text-foreground-500">
          {[mainVenue.address_line_1, mainVenue.city, mainVenue.postcode].filter(Boolean).join(', ')}
        </p>
      </div>

      <Link
        to={`${basePath}/details`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        View location details <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── THINGS TO DO PREVIEW ──

interface ThingsToDoPreviewProps {
  localPlaces: LocalPlace[];
  basePath: string;
}

export function ThingsToDoPreview({ localPlaces, basePath }: ThingsToDoPreviewProps) {
  const activityPlaces = localPlaces.filter((p) => p.place_type !== 'accommodation');

  if (activityPlaces.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">
          Local recommendations from the couple will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activityPlaces.slice(0, 3).map((place) => (
        <div key={place.id} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-secondary-100 overflow-hidden flex-shrink-0">
            {place.image_url ? (
              <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground-300">
                <i className={`${place.place_type === 'restaurant' ? 'ri-restaurant-line' : place.place_type === 'cafe' ? 'ri-cup-line' : 'ri-compass-3-line'} text-xs`} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-label font-medium text-foreground-800 truncate">{place.name}</p>
            <p className="text-[10px] text-foreground-500 capitalize">{place.place_type}</p>
          </div>
        </div>
      ))}

      <Link
        to={`${basePath}/travel/local-guide`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        Explore local guide <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── GIFT REGISTRY PREVIEW ──

interface RegistryPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function RegistryPreview({ data, basePath }: RegistryPreviewProps) {
  const registry = data.registry;
  const settings = data.portal_settings || {};
  const showRegistry = settings.show_registry !== false;

  if (!showRegistry) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">The gift registry is not currently available.</p>
      </div>
    );
  }

  const registries = registry?.registries || [];
  const primary = registries.find((r) => r.enabled !== false && r.status !== 'draft') || registries[0];

  if (!primary) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Your presence at the wedding is the greatest gift of all.</p>
      </div>
    );
  }

  const featured = primary.items.find((i) => i.is_featured) || primary.items[0];
  const totalItems = registries.reduce((sum, r) => sum + (r.items?.length || 0), 0);

  const registryTypeIcons: Record<string, string> = {
    honeymoon_fund: 'ri-plane-line',
    charity: 'ri-heart-pulse-line',
    external_links: 'ri-external-link-line',
    cash_gift: 'ri-gift-2-line',
    general: 'ri-gift-line',
  };

  return (
    <div className="space-y-3">
      {featured ? (
        <div className="flex gap-3">
          {featured.image && (
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-100">
              <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-label font-semibold text-foreground-900 truncate">{featured.title}</p>
            {featured.price && (
              <p className="text-[11px] text-foreground-500">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: featured.currency || primary.currency || 'GBP' }).format(featured.price)}
              </p>
            )}
            {(featured.is_group_gift || featured.allow_group_gifting) && featured.target_amount && (
              <div className="mt-1">
                <div className="w-full h-1.5 rounded-full bg-secondary-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${Math.min(100, ((featured.contributed_total || 0) / featured.target_amount) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-foreground-400 mt-0.5">
                  {Math.round(((featured.contributed_total || 0) / featured.target_amount) * 100)}% funded
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-foreground-600">{primary.description || 'View the couple\'s gift registry.'}</p>
      )}

      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-foreground-500">
          <i className="ri-gift-line mr-1 text-foreground-400" />
          {totalItems} gift{totalItems !== 1 ? 's' : ''}
        </span>
        {primary.registry_type !== 'general' && (
          <span className="text-accent-600 font-medium flex items-center gap-1">
            <i className={`${registryTypeIcons[primary.registry_type] || 'ri-gift-line'} text-[10px]`} />
            {primary.registry_type === 'honeymoon_fund' ? 'Honeymoon fund' :
             primary.registry_type === 'charity' ? 'Charity' :
             primary.registry_type === 'external_links' ? 'External' :
             primary.registry_type === 'cash_gift' ? 'Cash gift' : primary.registry_type}
          </span>
        )}
      </div>

      <Link
        to={`${basePath}/registry`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        View gift registry <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── GALLERY PREVIEW ──

interface GalleryPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function GalleryPreview({ data, basePath }: GalleryPreviewProps) {
  const gallery = data.gallery;
  const settings = data.portal_settings || {};
  const showGallery = settings.show_gallery !== false;

  if (!showGallery) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">The gallery is not currently available.</p>
      </div>
    );
  }

  if (!gallery || gallery.total_assets === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">The couple has not published any photographs yet.</p>
      </div>
    );
  }

  // Use recent_photos from Prompt 08 or fall back to old structure
  const previewAssets = gallery.recent_photos?.slice(0, 4) ||
    gallery.albums.find((a) => a.asset_count > 0)?.assets.slice(0, 4) || [];
  const albumWithAssets = gallery.featured_album || gallery.albums.find((a) => a.asset_count > 0);

  return (
    <div className="space-y-3">
      {previewAssets.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {previewAssets.map((asset) => (
            <div key={asset.id} className="aspect-square rounded-md overflow-hidden bg-secondary-100">
              {asset.signed_url ? (
                <img src={asset.signed_url} alt={asset.title || 'Wedding photo'} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground-300">
                  <i className="ri-image-line" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-foreground-500">
        {albumWithAssets && (
          <span><i className="ri-folder-line mr-1 text-foreground-400" />{albumWithAssets.title}</span>
        )}
        <span><i className="ri-camera-line mr-1 text-foreground-400" />{gallery.total_assets} photo{gallery.total_assets !== 1 ? 's' : ''}</span>
        {gallery.my_favourites_count != null && gallery.my_favourites_count > 0 && (
          <span className="text-rose-500"><i className="ri-heart-fill mr-1 text-[10px]" />{gallery.my_favourites_count}</span>
        )}
        {gallery.upload_settings?.uploads_enabled && (
          <span className="text-accent-600 font-medium"><i className="ri-upload-line mr-1" />Upload</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`${basePath}/gallery`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          View gallery <i className="ri-arrow-right-line text-[10px]" />
        </Link>
        {gallery.my_favourites_count != null && gallery.my_favourites_count > 0 && (
          <Link
            to={`${basePath}/gallery/favourites`}
            className="inline-flex items-center gap-1 text-xs font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
          >
            Favourites <i className="ri-heart-line text-[10px]" />
          </Link>
        )}
        {gallery.upload_settings?.uploads_enabled && (
          <Link
            to={`${basePath}/gallery/upload`}
            className="inline-flex items-center gap-1 text-xs font-label text-accent-600 hover:text-accent-700 cursor-pointer whitespace-nowrap"
          >
            Upload <i className="ri-upload-line text-[10px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── LATEST UPDATE PREVIEW ──

interface LatestUpdatePreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function LatestUpdatePreview({ data, basePath }: LatestUpdatePreviewProps) {
  const updates = data.updates;
  const settings = data.portal_settings || {};
  const showUpdates = settings.show_updates !== false;
  const alertBanner = updates?.alert_banner || null;

  if (!showUpdates) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Updates are not currently available.</p>
      </div>
    );
  }

  if (!updates || updates.total_count === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">No updates have been published yet.</p>
      </div>
    );
  }

  const latest = updates.updates[0];
  const unreadCount = updates.unread_count || 0;
  const savedCount = updates.saved_count || 0;

  return (
    <div className="space-y-3">
      {/* Alert banner indicator */}
      {alertBanner && !alertBanner.is_dismissed && (
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          alertBanner.priority === 'emergency' ? 'bg-red-50 border border-red-200' :
          alertBanner.priority === 'urgent' ? 'bg-amber-50 border border-amber-200' :
          'bg-accent-50 border border-accent-200'
        }`}>
          <i className={`${
            alertBanner.priority === 'emergency' ? 'ri-alert-fill text-red-500' :
            alertBanner.priority === 'urgent' ? 'ri-error-warning-fill text-amber-500' :
            'ri-star-fill text-accent-500'
          } text-sm flex-shrink-0`} />
          <Link to={`${basePath}/updates/${alertBanner.update_id}`} className="text-[11px] font-label font-medium text-foreground-800 line-clamp-1 cursor-pointer hover:text-primary-600 transition-colors">
            {alertBanner.summary || alertBanner.title}
          </Link>
        </div>
      )}

      {/* Latest update card */}
      <Link to={`${basePath}/updates/${latest.id}`} className="block group cursor-pointer">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {latest.priority !== 'standard' && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-label font-medium ${
                latest.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                latest.priority === 'urgent' ? 'bg-amber-100 text-amber-700' :
                'bg-accent-100 text-accent-700'
              }`}>
                {latest.priority.charAt(0).toUpperCase() + latest.priority.slice(1)}
              </span>
            )}
            <span className="text-[10px] text-foreground-400 font-label capitalize">{latest.category.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs font-label font-semibold text-foreground-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {latest.title}
          </p>
          {latest.summary ? (
            <p className="text-[11px] text-foreground-500 line-clamp-2 mt-1">{latest.summary}</p>
          ) : latest.content ? (
            <p className="text-[11px] text-foreground-500 line-clamp-2 mt-1">{latest.content}</p>
          ) : null}
          <p className="text-[10px] text-foreground-400 mt-1.5">
            {latest.published_at
              ? new Date(latest.published_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              : new Date(latest.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </Link>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px]">
        {unreadCount > 0 && (
          <span className="text-primary-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />{unreadCount} unread
          </span>
        )}
        {savedCount > 0 && (
          <span className="text-foreground-500 flex items-center gap-1">
            <i className="ri-bookmark-line text-[9px]" />{savedCount} saved
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!latest.is_read && (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            <span className="text-[11px] text-primary-600 font-medium">New update</span>
          </span>
        )}
        <Link
          to={`${basePath}/updates`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          Read update <i className="ri-arrow-right-line text-[10px]" />
        </Link>
        {unreadCount > 0 && (
          <Link
            to={`${basePath}/updates/unread`}
            className="inline-flex items-center gap-1 text-xs font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
          >
            Unread ({unreadCount}) <i className="ri-mail-unread-line text-[10px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── SEATING PREVIEW ──

interface SeatingPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function SeatingPreview({ data, basePath }: SeatingPreviewProps) {
  const seating = data.seating;
  const settings = data.portal_settings || {};
  const seatingEnabled = settings.seating_enabled !== false;

  if (!seatingEnabled) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Seating is not currently available.</p>
      </div>
    );
  }

  if (!seating || seating.is_before_reveal) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Seating details will appear here when the couple publishes them.</p>
      </div>
    );
  }

  if (!seating.table) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Your seating assignment will appear here once finalised.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-heading font-bold text-primary-600">
            {seating.table.table_number || seating.table.name.charAt(0)}
          </span>
        </div>
        <div>
          <p className="text-xs font-label font-semibold text-foreground-900">
            {seating.table.name || `Table ${seating.table.table_number}`}
          </p>
          {seating.seat?.seat_label && (
            <p className="text-[11px] text-foreground-500">Seat: {seating.seat.seat_label}</p>
          )}
        </div>
      </div>

      {seating.companions.length > 0 && (
        <p className="text-[11px] text-foreground-500">
          <i className="ri-group-line mr-1 text-foreground-400" />
          {seating.companions.map((c: { full_name: string }) => c.full_name).join(', ')}
        </p>
      )}

      <Link
        to={`${basePath}/seating`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        View seating details <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── QUESTIONS PREVIEW ──

interface QuestionsPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function QuestionsPreview({ data, basePath }: QuestionsPreviewProps) {
  const questions = data.questions;
  const settings = data.portal_settings || {};
  const showQuestions = settings.show_questions !== false;

  if (!showQuestions) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Q&amp;A is not currently available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px] text-foreground-500">
        {questions && questions.total_faqs > 0 ? (
          <span>
            <i className="ri-question-answer-line mr-1 text-foreground-400" />
            {questions.total_faqs} FAQ{questions.total_faqs !== 1 ? 's' : ''}
          </span>
        ) : (
          <span>
            <i className="ri-question-line mr-1 text-foreground-400" />
            FAQs coming soon
          </span>
        )}
      </div>

      <p className="text-xs text-foreground-600">
        {questions && questions.total_faqs > 0
          ? 'Browse answers to commonly asked questions.'
          : 'Got questions? The couple is preparing answers to common queries.'}
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          to={`${basePath}/questions`}
          className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          Browse FAQs <i className="ri-arrow-right-line text-[10px]" />
        </Link>
        {settings.allow_guest_questions && (
          <Link
            to={`${basePath}/questions`}
            className="inline-flex items-center gap-1 text-xs font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
          >
            Ask a question <i className="ri-chat-1-line text-[10px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── CONTACTS PREVIEW ──

interface ContactsPreviewProps {
  data: GuestPortalData;
  basePath: string;
}

export function ContactsPreview({ data, basePath }: ContactsPreviewProps) {
  const contacts = data.contacts;
  const settings = data.portal_settings || {};
  const showContacts = settings.show_contacts !== false;

  if (!showContacts) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Contacts are not currently available.</p>
      </div>
    );
  }

  if (!contacts || contacts.total === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-xs text-foreground-400 italic">Contact details will appear once the couple adds them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.contacts.slice(0, 3).map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            c.is_emergency ? 'bg-accent-100 text-accent-600' : 'bg-secondary-100 text-foreground-500'
          }`}>
            <i className={`${c.is_emergency ? 'ri-alert-line' : 'ri-user-line'} text-xs`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-label font-medium text-foreground-800 truncate">{c.name}</p>
            <p className="text-[10px] text-foreground-500">{c.role}</p>
          </div>
        </div>
      ))}

      <Link
        to={`${basePath}/contacts`}
        className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
      >
        View all contacts <i className="ri-arrow-right-line text-[10px]" />
      </Link>
    </div>
  );
}

// ── NEXT ACTION ──

interface NextActionProps {
  data: GuestPortalData;
  basePath: string;
}

export function NextAction({ data, basePath }: NextActionProps) {
  const settings = data.portal_settings || {};
  const primaryRsvp = data.rsvp_responses?.[data.recipients[0]?.guest_id];
  const hasRsvpSubmitted = primaryRsvp?.submitted_at && !primaryRsvp?.is_draft;
  const rsvpEnabled = settings.rsvp_enabled !== false;
  const updates = data.updates;
  const hasUnreadImportant = updates?.updates.some((u) => u.is_important && !u.is_read);
  const hasAccommodation = data.accommodationPlans.length > 0;
  const seating = data.seating;
  const hasSeatingPublished = seating?.table && !seating.is_before_reveal;
  const events = data.events.filter((e) => e.start_at && new Date(e.start_at) > new Date());

  // Priority-based determination
  let action: {
    title: string;
    description: string;
    href: string;
    icon: string;
    cta: string;
    priority: number;
  };

  if (rsvpEnabled && !hasRsvpSubmitted) {
    action = {
      title: 'Complete your RSVP',
      description: 'The couple would love to hear from you. Please let them know if you can make it.',
      href: `${basePath}/rsvp`,
      icon: 'ri-check-double-line',
      cta: 'Respond to invitation',
      priority: 1,
    };
  } else if (hasUnreadImportant) {
    action = {
      title: 'Important update from the couple',
      description: 'There\'s an unread update that needs your attention.',
      href: `${basePath}/updates`,
      icon: 'ri-notification-3-line',
      cta: 'Read update',
      priority: 2,
    };
  } else if (!hasAccommodation && settings.show_travel) {
    action = {
      title: 'Plan your stay',
      description: 'Browse accommodation and travel options for the wedding.',
      href: `${basePath}/travel`,
      icon: 'ri-hotel-line',
      cta: 'Explore accommodation',
      priority: 3,
    };
  } else if (hasSeatingPublished) {
    action = {
      title: 'View your seating',
      description: 'The seating plan has been published. Find out where you\'ll be sitting.',
      href: `${basePath}/seating`,
      icon: 'ri-user-location-line',
      cta: 'View seating',
      priority: 4,
    };
  } else if (events.length > 0) {
    action = {
      title: 'Review the itinerary',
      description: `${events.length} upcoming event${events.length !== 1 ? 's' : ''} on the schedule.`,
      href: `${basePath}/itinerary`,
      icon: 'ri-calendar-event-line',
      cta: 'View itinerary',
      priority: 5,
    };
  } else {
    action = {
      title: 'Browse wedding details',
      description: 'Explore all the information the couple has shared for their special day.',
      href: `${basePath}/details`,
      icon: 'ri-heart-line',
      cta: 'View details',
      priority: 6,
    };
  }

  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600">
          <i className={`${action.icon} text-sm`} />
        </div>
        <div>
          <h2 className="font-label text-sm font-semibold text-foreground-900">Next Step</h2>
          <p className="text-xs text-foreground-500">{action.title}</p>
        </div>
        {action.priority === 1 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 text-[10px] font-label">
            Priority
          </span>
        )}
      </div>
      <p className="text-sm text-foreground-700 mb-3">{action.description}</p>
      <Link
        to={action.href}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className={action.icon} /> {action.cta}
      </Link>
    </div>
  );
}