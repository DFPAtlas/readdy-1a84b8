import type { DemoState, DemoGuest, DemoWeddingVenue, DemoWeddingEvent, DemoTravelPlace, DemoGalleryItem, DemoRegistryItem, DemoUpdate } from './demoTypes';

// Build GuestPortalData-compatible shapes from demo state for demo-session injection

export function buildDemoGuestPortalData(demo: { state: DemoState }) {
  const s = demo.state;
  const oliver = s.guests.find((g) => g.id === 'demo-guest-oliver');
  const oliverRecip = s.invitationRecipients.find((r) => r.guest_id === 'demo-guest-oliver');
  const oliverInvitation = oliverRecip
    ? s.invitations.find((inv) => inv.id === oliverRecip.invitation_id) || s.invitations[0]
    : s.invitations[0];

  const wedding = {
    id: s.wedding.id,
    partner_one_name: s.wedding.partner_one_name,
    partner_two_name: s.wedding.partner_two_name,
    title: s.wedding.title,
    wedding_date: s.wedding.wedding_date,
    dress_code: s.wedding.dress_code,
    welcome_message: s.wedding.welcome_message,
    contact_information: s.wedding.contact_information,
    parking_notes: s.wedding.parking_notes,
    accessibility_notes: s.wedding.accessibility_notes,
    children_policy: s.wedding.children_policy,
    plus_one_policy: s.wedding.plus_one_policy,
  };

  const invitation = {
    id: oliverInvitation?.id || 'demo-inv-oliver',
    formal_recipient_name: 'Oliver Bennett',
    informal_greeting: 'Dear Oliver',
    invitation_type: oliverInvitation?.invitation_type || 'ceremony_and_reception',
    rsvp_deadline: oliverInvitation?.rsvp_deadline || '2027-02-28',
    status: oliverInvitation?.status || 'ready',
    template: null,
  };

  const recipients = [{
    guest_id: oliver?.id || 'demo-guest-oliver',
    guest_name: oliver?.full_name || 'Oliver Bennett',
    preferred_name: oliver?.preferred_name || 'Oliver',
    recipient_role: 'primary' as const,
    ceremony_included: true,
    reception_included: true,
    evening_included: true,
    welcome_event_included: true,
    day_after_event_included: true,
    plus_one_allowed: (oliver?.plus_one_status === 'allowed' || oliver?.plus_one_status === 'named'),
    plus_one_status: oliver?.plus_one_status || 'not_allowed',
    plus_one_name: oliver?.plus_one_name || '',
    approved_additional_children: 0,
    age_band: 'adult' as const,
    household_id: oliver?.household_id || '',
    rsvp: oliver ? {
      id: `rsvp-${oliver.id}`,
      response_status: (oliver.rsvp_status === 'accepted' ? 'attending' : oliver.rsvp_status === 'declined' ? 'not_attending' : 'pending') as 'attending' | 'not_attending' | 'pending',
      ceremony_attending: oliver.rsvp_ceremony_attending ?? true,
      reception_attending: oliver.rsvp_reception_attending ?? true,
      evening_attending: oliver.rsvp_evening_attending ?? true,
      welcome_attending: true,
      day_after_attending: true,
      plus_one_confirmed: oliver.rsvp_plus_one_confirmed ?? false,
      plus_one_name: oliver.plus_one_name || undefined,
      children_attending_count: 0,
      meal_choice: oliver.meal_choice || '',
      dietary_requirements: oliver.dietary_requirements || '',
      allergy_notes: oliver.allergy_notes || '',
      accessibility_notes: oliver.accessibility_notes || '',
      song_request: oliver.rsvp_song_request || undefined,
      message_to_couple: oliver.rsvp_message || undefined,
      submitted_at: oliver.rsvp_submitted_at || undefined,
      is_draft: !oliver.rsvp_submitted_at,
    } : null,
  }];

  const events = s.events.map((e: DemoWeddingEvent) => ({
    id: e.id,
    wedding_id: e.wedding_id,
    event_type: e.event_type as 'ceremony' | 'reception' | 'evening' | 'welcome' | 'day_after' | 'other',
    name: e.name,
    description: e.description || '',
    start_at: e.start_at,
    end_at: e.end_at,
    venue_id: e.venue_id || '',
    visibility: e.is_public ? 'public' as const : 'invitation_holders' as const,
    dress_code: e.dress_code || '',
    status: 'active' as const,
    venue: e.venue_id ? {
      id: e.venue_id,
      name: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.name || '',
      address_line_1: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.address_line_1 || '',
      city: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.city || '',
      postcode: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.postcode || '',
      country: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.country || '',
      county_or_region: s.venues.find((v: DemoWeddingVenue) => v.id === e.venue_id)?.county_or_region || '',
    } : null,
    linked_updates: [],
  }));

  const portal_settings = {
    id: 'demo-portal-settings',
    wedding_id: s.wedding.id,
    portal_enabled: true,
    guest_account_optional: true,
    show_countdown: true,
    show_travel: true,
    show_updates: true,
    show_contact_details: true,
    venue_visibility_default: 'public',
    rsvp_enabled: true,
    household_rsvp_enabled: false,
    require_meal_choices: true,
    meal_options: ['Roast chicken', 'Seasonal vegetarian', 'Vegan garden plate', 'Children\'s meal'],
    custom_questions: [],
    allow_song_requests: true,
    allow_messages: true,
    show_transport: true,
    show_accommodation: true,
    show_registry: true,
    registry_enabled: true,
    show_gallery: true,
    show_questions: false,
    allow_guest_questions: false,
    show_contacts: true,
    itinerary_enabled: true,
    seating_enabled: true,
    settings_enabled: true,
    show_location: true,
    theme_key: 'default',
    seating_reveal_at: undefined,
    portal_closes_at: undefined,
    allow_late_rsvp: true,
    allow_rsvp_updates: true,
    dietary_options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut allergy'],
    allergy_labels: ['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs'],
  };

  const rsvp_responses: Record<string, unknown> = {};
  if (oliver) {
    rsvp_responses[oliver.id] = recipients[0].rsvp;
  }

  // Seating data for Oliver
  const oliverSeat = s.seatingPlan.assignments.find((a) => a.guest_id === 'demo-guest-oliver');
  const oliverTable = oliverSeat ? s.seatingPlan.tables.find((t) => t.id === oliverSeat.table_id) : null;

  const seating = {
    publication: {
      id: 'demo-pub-1',
      status: 'published',
      publication_revision: 1,
      published_at: '2027-03-01T00:00:00Z',
    },
    table: oliverTable ? {
      id: oliverTable.id,
      table_number: 1,
      name: oliverTable.name,
      shape: oliverTable.shape,
      colour: null,
      capacity: oliverTable.capacity,
    } : null,
    seat: oliverSeat ? {
      id: oliverSeat.id,
      seat_label: `Seat ${oliverSeat.seat_number}`,
      seat_number: oliverSeat.seat_number,
    } : null,
    companions: [],
    lookup_settings: {
      reveal_companions: true,
      show_seat_numbers: true,
      companion_name_format: 'first_names_only' as const,
      show_companion_seat_labels: false,
      show_room_map: true,
      show_floor_plan_background: true,
      show_entrance_route: false,
    },
    wedding_day_note: 'Please find your seat at the Top Table — you are seated with the wedding party.',
    is_before_reveal: false,
    is_emergency_disabled: false,
    map_data: null,
    updated_at: '2027-03-01T00:00:00Z',
  };

  // Registry
  const registry = {
    registries: [{
      id: 'demo-registry-1',
      wedding_id: s.wedding.id,
      enabled: true,
      registry_type: 'general' as const,
      title: 'Our Wedding Registry',
      description: 'Thank you for considering a gift to celebrate our marriage. We have chosen a few special items and experiences.',
      presence_message: 'Your presence at our wedding is the greatest gift of all. If you would like to honour us with a gift, we have put together a small selection below.',
      thank_you_message: 'Thank you so much for your generous contribution. We are deeply touched by your kindness and cannot wait to celebrate with you.',
      currency: 'GBP',
      cover_image: null,
      hero_image_url: null,
      external_url: null,
      featured_gifts: null,
      group_gifting_enabled: true,
      show_donors_publicly: false,
      show_amounts_publicly: false,
      allow_anonymous: true,
      status: 'active',
      sort_order: 1,
      items: s.registryItems.map((ri: DemoRegistryItem) => ({
        id: ri.id,
        registry_id: ri.registry_id,
        wedding_id: ri.wedding_id,
        title: ri.name,
        description: ri.description,
        image: null,
        price: ri.price,
        target_amount: ri.item_type === 'fund' ? ri.price : undefined,
        currency: ri.currency,
        is_featured: true,
        is_group_gift: ri.item_type === 'fund',
        allow_group_gifting: ri.item_type === 'fund',
        allow_reservation: ri.item_type === 'gift',
        show_progress: ri.item_type === 'fund',
        sort_order: 0,
        contributed_total: ri.total_contributed,
        contributor_count: ri.contribution_count,
        contributions: [],
      })),
    }],
    my_reservations: [],
    my_contributions: [],
    payment_provider_available: false,
  };

  // Gallery
  const approvedItems = s.galleryItems.filter((gi: DemoGalleryItem) => gi.moderation_status === 'approved');
  const albums = s.galleryAlbums.map((album) => ({
    id: album.id,
    title: album.name,
    name: album.name,
    description: album.description,
    album_type: 'general' as const,
    cover_image_path: null,
    cover_signed_url: null,
    sort_order: 0,
    allow_downloads: true,
    allow_favourites: true,
    allow_sharing: false,
    allow_uploads: false,
    asset_count: approvedItems.filter((gi) => gi.album_id === album.id).length,
    assets: approvedItems
      .filter((gi) => gi.album_id === album.id)
      .map((gi) => ({
        id: gi.id,
        title: gi.caption || null,
        description: null,
        storage_path: gi.image_src,
        mime_type: 'image/jpeg',
        file_size: null,
        width: null,
        height: null,
        moderation_status: 'approved' as const,
        is_featured: false,
        uploaded_by_guest_id: null,
        is_favourited: false,
        signed_url: gi.image_src,
        created_at: gi.upload_time,
      })),
  })).filter((a) => a.assets.length > 0);

  const gallery = {
    albums,
    total_assets: approvedItems.length,
    my_uploads_count: 0,
    my_favourites_count: 0,
    featured_album: albums[0] || null,
    recent_photos: approvedItems.slice(0, 4).map((gi) => ({
      id: gi.id,
      title: gi.caption || null,
      description: null,
      storage_path: gi.image_src,
      mime_type: 'image/jpeg',
      file_size: null,
      width: null,
      height: null,
      moderation_status: 'approved' as const,
      is_featured: false,
      uploaded_by_guest_id: null,
      is_favourited: false,
      signed_url: gi.image_src,
      created_at: gi.upload_time,
    })),
    couple_message: null,
  };

  // Updates
  const publishedUpdates = s.updates.filter((u: DemoUpdate) => u.status === 'published');
  const updates = {
    updates: publishedUpdates.map((u: DemoUpdate) => ({
      id: u.id,
      title: u.title,
      summary: u.summary,
      content: null,
      content_data: u.content_data || null,
      update_date: u.publish_at,
      created_at: u.publish_at,
      category: u.category as 'general' | 'schedule' | 'travel' | 'accommodation' | 'venue',
      priority: u.priority as 'standard' | 'important',
      is_important: u.priority === 'important',
      image_url: null,
      hero_image_signed_url: null,
      related_itinerary_event_id: u.linked_event_id || null,
      related_itinerary_event_name: null,
      related_travel_item_id: null,
      related_travel_item_name: null,
      linked_venue_id: null,
      linked_venue_name: null,
      linked_travel_location_id: null,
      linked_travel_location_name: null,
      related_route: u.related_route || null,
      attachments: [],
      dismissible: u.dismissible,
      published_at: u.publish_at,
      last_edited_at: null,
      is_read: false,
      read_at: null,
      is_saved: false,
      is_dismissed: false,
    })),
    total_count: publishedUpdates.length,
    unread_count: publishedUpdates.length,
    saved_count: 0,
    alert_banner: null,
  };

  // Contacts
  const contacts = {
    contacts: [
      {
        id: 'demo-contact-1',
        name: 'Sophie Carter (Maid of Honour)',
        role: 'Wedding party',
        phone: '07700 900123',
        email: 'sophie.carter@example.com',
        availability: 'Available throughout the wedding weekend',
        is_emergency: false,
      },
      {
        id: 'demo-contact-2',
        name: 'The Orangery Events Team',
        role: 'Venue - Reception',
        phone: '01225 123456',
        email: 'events@theorangerybath.co.uk',
        availability: 'Monday–Saturday, 9am–6pm',
        is_emergency: false,
      },
      {
        id: 'demo-contact-3',
        name: 'Abbey Taxis Bath',
        role: 'Transport',
        phone: '01225 444444',
        email: null,
        availability: '24/7 — pre-booking recommended',
        is_emergency: false,
      },
    ],
    total: 3,
  };

  // Local places
  const approvedPlaces = s.travelPlaces.filter((tp: DemoTravelPlace) => tp.approval_status === 'approved');
  const localPlaces = approvedPlaces.map((tp: DemoTravelPlace) => ({
    id: tp.id,
    place_type: tp.category?.toLowerCase().replace(/\s+/g, '_') || 'other',
    name: tp.name,
    address_line_1: tp.address || '',
    city: tp.city || '',
    postcode: tp.postcode || '',
    country: 'United Kingdom',
    latitude: null,
    longitude: null,
    description: tp.short_description || '',
    website: tp.website_url || '',
    telephone: tp.phone || '',
    image_url: null,
    accessibility_info: null,
    opening_info: null,
    provider_rating: null,
    is_approved: true,
    couple_note: tp.couple_note || null,
    approval_status: 'approved',
    price_level: tp.price_tag || null,
  }));

  const weddingVenues = s.venues.map((v: DemoWeddingVenue) => ({
    id: v.id,
    name: v.name,
    venue_type: v.venue_type,
    address_line_1: v.address_line_1,
    city: v.city,
    county_or_region: v.county_or_region || '',
    postcode: v.postcode,
    country: v.country,
  }));

  return {
    wedding,
    invitation,
    recipients,
    events,
    portal_settings,
    rsvp_responses,
    rsvp_submission: oliver?.rsvp_submitted_at ? {
      id: 'demo-rsvp-submission',
      wedding_id: s.wedding.id,
      invitation_id: oliverInvitation?.id || 'demo-inv-oliver',
      submitted_by_guest_id: oliver?.id || 'demo-guest-oliver',
      status: 'submitted' as const,
      revision: 1,
      is_late: false,
      started_at: oliver?.rsvp_submitted_at,
      submitted_at: oliver?.rsvp_submitted_at,
    } : null,
    wedding_id: s.wedding.id,
    seating,
    registry,
    gallery,
    updates,
    questions: { faqs: [], my_questions: [], total_faqs: 0 },
    contacts,
    settings: null,
    localPlaces,
    accommodationPlans: [],
    travelPlans: [],
    weddingVenues,
    savedLocations: [],
    shuttles: [],
    shuttleRequests: [],
    locationEventLinks: [],
    travelUpdates: [],
  };
}