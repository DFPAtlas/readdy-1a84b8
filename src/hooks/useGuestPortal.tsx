import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { GuestAccessResponse, GuestPortalSettings, WeddingEvent, GuestRecipientInfo, RsvpResponse, GuestSeatingResponse, LocalPlace, AccommodationPlan, GuestTravelPlan, SavedTravelLocation, WeddingShuttle, GuestShuttleRequest, LocationEventLink, TravelUpdate, GiftFundData } from '@/types/access';

const LOADER_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-portal-loader';
const SESSION_KEY = 'wedora_guest_session';

// ── Safe response model (what the context exposes) ──

export interface GuestPortalSettingsSafe {
  portal_enabled?: boolean;
  show_countdown?: boolean;
  show_travel?: boolean;
  show_updates?: boolean;
  show_contact_details?: boolean;
  custom_guest_message?: string;
  rsvp_enabled?: boolean;
  household_rsvp_enabled?: boolean;
  require_meal_choices?: boolean;
  meal_options?: string[];
  custom_questions?: import('@/types/access').RsvpCustomQuestion[];
  allow_song_requests?: boolean;
  allow_messages?: boolean;
  show_transport?: boolean;
  show_accommodation?: boolean;
  show_registry?: boolean;
  registry_enabled?: boolean;
  show_gallery?: boolean;
  show_questions?: boolean;
  allow_guest_questions?: boolean;
  show_contacts?: boolean;
  itinerary_enabled?: boolean;
  seating_enabled?: boolean;
  settings_enabled?: boolean;
  show_settings?: boolean;
  show_location?: boolean;
  theme_key?: string;
  seating_reveal_at?: string;
  portal_closes_at?: string;
  allow_late_rsvp?: boolean;
  allow_rsvp_updates?: boolean;
  rsvp_questions_locked_after?: string;
  dietary_options?: string[];
  allergy_labels?: string[];
  sms_configured?: boolean;
  privacy_notice_url?: string;
  contact_route?: string;
  venue_visibility_default?: string;
  guest_account_optional?: boolean;
}

export const SAFE_PORTAL_DEFAULTS: GuestPortalSettingsSafe = {
  portal_enabled: true,
  show_countdown: true,
  show_travel: true,
  show_updates: true,
  show_contact_details: true,
  rsvp_enabled: true,
  household_rsvp_enabled: true,
  require_meal_choices: false,
  allow_song_requests: true,
  allow_messages: true,
  show_transport: true,
  show_accommodation: true,
  show_registry: true,
  registry_enabled: true,
  show_gallery: true,
  show_questions: true,
  allow_guest_questions: true,
  show_contacts: true,
  itinerary_enabled: true,
  seating_enabled: true,
  settings_enabled: true,
  show_settings: true,
  show_location: true,
  allow_late_rsvp: false,
  allow_rsvp_updates: true,
  sms_configured: false,
};

export interface GuestPortalData {
  wedding: GuestAccessResponse['wedding'];
  invitation: GuestAccessResponse['invitation'];
  recipients: GuestRecipientInfo[];
  events: WeddingEvent[];
  portal_settings: GuestPortalSettingsSafe | null;
  rsvp_responses: Record<string, RsvpResponse>;
  rsvp_submission: import('@/types/access').RsvpSubmission | null;
  wedding_id: string;
  seating: GuestSeatingResponse | null;
  registry: import('@/types/access').GiftRegistryData | null;
  giftFunds: GiftFundData | null;
  gallery: import('@/types/access').GalleryData | null;
  updates: import('@/types/access').GuestUpdatesData | null;
  questions: import('@/types/access').QuestionsData | null;
  contacts: import('@/types/access').ContactsData | null;
  settings: import('@/types/access').GuestSettingsData | null;
  localPlaces: LocalPlace[];
  accommodationPlans: AccommodationPlan[];
  // Prompt 05 travel fields
  travelPlans: GuestTravelPlan[];
  weddingVenues: Array<{ id: string; name: string; venue_type?: string; address_line_1?: string; city?: string; county_or_region?: string; postcode?: string; country?: string }>;
  savedLocations: SavedTravelLocation[];
  shuttles: WeddingShuttle[];
  shuttleRequests: GuestShuttleRequest[];
  locationEventLinks: LocationEventLink[];
  travelUpdates: TravelUpdate[];
}

interface GuestPortalState {
  data: GuestPortalData | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => void;
}

const GuestPortalContext = createContext<GuestPortalState | null>(null);

export { GuestPortalContext };

// ── Provider ──

export function GuestPortalProvider({ accessId, children }: { accessId: string | undefined; children: ReactNode }) {
  const [data, setData] = useState<GuestPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessId) {
      setError('No access session found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(LOADER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId }),
      });

      if (!res.ok) throw new Error('unavailable');

      const result = await res.json();

      if (!result.valid) {
        const reason = result.error || 'session_invalid';
        if (reason === 'session_expired') {
          setError('Your guest session has expired. Please use your invitation link to access the portal again.');
        } else {
          setError('Your guest session is no longer valid. Please use your invitation link to access the portal again.');
        }
        // Clear stale session
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        setLoading(false);
        return;
      }

      const portalData: GuestPortalData = {
        wedding: result.data.wedding,
        invitation: result.data.invitation,
        recipients: (result.data.recipients || []).map((r: GuestRecipientInfo) => ({
          ...r,
          rsvp: result.data.rsvp_responses?.[r.guest_id] || null,
        })),
        events: result.data.events,
        portal_settings: result.data.portal_settings,
        rsvp_responses: result.data.rsvp_responses || {},
        rsvp_submission: result.data.rsvp_submission || null,
        wedding_id: result.wedding_id,
        seating: result.data.seating || null,
        registry: result.data.registry || null,
        giftFunds: result.data.gift_funds || null,
        gallery: result.data.gallery || null,
        updates: result.data.updates || null,
        questions: result.data.questions || null,
        contacts: result.data.contacts || null,
        settings: result.data.settings || null,
        localPlaces: result.data.local_places || [],
        accommodationPlans: result.data.accommodation_plans || [],
        travelPlans: result.data.travel_plans || [],
        weddingVenues: result.data.wedding_venues || [],
        savedLocations: result.data.saved_locations || [],
        shuttles: result.data.shuttles || [],
        shuttleRequests: result.data.shuttle_requests || [],
        locationEventLinks: result.data.location_event_links || [],
        travelUpdates: result.data.travel_updates || [],
      };

      setData(portalData);
    } catch {
      setError('We could not load your guest portal at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessId]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setData(null);
    setError('');
  }, []);

  return (
    <GuestPortalContext.Provider value={{ data, loading, error, refresh: load, logout }}>
      {children}
    </GuestPortalContext.Provider>
  );
}

// ── Hook ──

export function useGuestPortal(): GuestPortalState {
  const ctx = useContext(GuestPortalContext);
  if (!ctx) {
    throw new Error('useGuestPortal must be used within a GuestPortalProvider');
  }
  return ctx;
}

// ── Session storage helpers ──

export function storeGuestSession(sessionHash: string): void {
  try { sessionStorage.setItem(SESSION_KEY, sessionHash); } catch { /* ignore */ }
}

export function getStoredSession(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function clearGuestSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}