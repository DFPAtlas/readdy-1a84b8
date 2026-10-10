export interface InvitationAccessToken {
  delivery_channel?: string;
  id: string;
  wedding_id: string;
  invitation_id: string;
  token_hash: string;
  token_version: number;
  status: 'active' | 'revoked' | 'expired';
  expires_at?: string;
  created_by?: string;
  created_at?: string;
  last_used_at?: string;
  revoked_by?: string;
  revoked_at?: string;
  rotation_reason?: string;
}

export interface GuestAccessSession {
  id: string;
  wedding_id: string;
  invitation_id: string;
  access_token_id: string;
  session_hash: string;
  status: 'active' | 'ended' | 'expired';
  created_at?: string;
  last_seen_at?: string;
  expires_at?: string;
  ended_at?: string;
}

export interface AccessActivity {
  id: string;
  wedding_id: string;
  invitation_id: string;
  access_token_id?: string;
  actor_type: 'couple' | 'system' | 'guest' | 'unknown';
  actor_user_id?: string;
  event_type: string;
  summary?: string;
  security_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface GuestPortalSettings {
  id: string;
  wedding_id: string;
  portal_enabled: boolean;
  guest_account_optional: boolean;
  show_countdown: boolean;
  show_travel: boolean;
  show_updates: boolean;
  show_contact_details: boolean;
  venue_visibility_default: string;
  custom_guest_message?: string;
  created_at?: string;
  updated_at?: string;
  rsvp_enabled?: boolean;
  household_rsvp_enabled?: boolean;
  require_meal_choices?: boolean;
  meal_options?: string[];
  custom_questions?: RsvpCustomQuestion[];
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
  show_location?: boolean;
  theme_key?: string;
  seating_reveal_at?: string;
  portal_closes_at?: string;
}

export interface RsvpCustomQuestion {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multi_select';
  options?: string[];
  required?: boolean;
}

export interface RsvpCustomAnswer {
  question_key: string;
  question_label: string;
  answer: string;
  answer_type: string;
}

// ── RSVP extensions for Prompt 04 ──

export interface RsvpSubmission {
  id: string;
  wedding_id: string;
  invitation_id: string;
  submitted_by_guest_id: string;
  status: 'draft' | 'submitted' | 'updated';
  revision: number;
  is_late: boolean;
  started_at?: string;
  submitted_at?: string;
  updated_at?: string;
}

export interface RsvpEventResponse {
  id: string;
  wedding_id: string;
  invitation_id: string;
  submission_id?: string;
  guest_id: string;
  event_id: string;
  attendance_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  meal_option_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RsvpRevision {
  id: string;
  wedding_id: string;
  invitation_id: string;
  submission_id: string;
  revision_number: number;
  snapshot_data: Record<string, unknown>;
  change_summary?: string;
  created_at?: string;
}

export interface StructuredDietary {
  preference: string | null;
  preference_other?: string;
  allergies: string[];
  allergy_other?: string;
  allergy_severity?: string;
  cross_contamination_concern?: boolean;
  additional_notes?: string;
}

export interface StructuredAccessibility {
  step_free_access?: boolean;
  wheelchair_space?: boolean;
  accessible_toilet?: boolean;
  carer_attending?: boolean;
  hearing_support?: boolean;
  visual_support?: boolean;
  quiet_area?: boolean;
  seating_support?: boolean;
  mobility_transport?: boolean;
  other_notes?: string;
}

// ── Update RsvpResponse to reference submission ──

export interface RsvpResponse {
  id: string;
  submission_id?: string;
  response_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  ceremony_attending: boolean;
  reception_attending: boolean;
  evening_attending: boolean;
  welcome_attending: boolean;
  day_after_attending: boolean;
  plus_one_confirmed: boolean;
  plus_one_name?: string;
  children_attending_count: number;
  children_names?: string;
  meal_choice?: string;
  dietary_requirements?: string;
  allergy_notes?: string;
  accessibility_notes?: string;
  transport_status?: string;
  accommodation_status?: string;
  song_request?: string;
  message_to_couple?: string;
  submitted_at?: string;
  is_draft?: boolean;
  custom_answers?: RsvpCustomAnswer[];
  // New structured fields
  structured_dietary?: StructuredDietary;
  structured_accessibility?: StructuredAccessibility;
}

export interface WeddingEvent {
  id: string;
  wedding_id: string;
  event_type: 'ceremony' | 'reception' | 'evening' | 'welcome' | 'day_after' | 'other';
  name: string;
  description?: string;
  guest_description?: string;
  start_at?: string;
  end_at?: string;
  venue_id?: string;
  visibility: 'public' | 'invitation_holders' | 'included_guests' | 'hidden' | 'reveal_on_date';
  reveal_at?: string;
  dress_code?: string;
  arrival_notes?: string;
  arrival_offset_minutes?: number;
  parking_notes?: string;
  transport_notes?: string;
  accessibility_notes?: string;
  children_notes?: string;
  status: 'active' | 'cancelled' | 'archived';
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  venue?: {
    id: string;
    name: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    country?: string;
    county_or_region?: string;
  } | null;
  /** Linked updates for change indicators */
  linked_updates?: GuestUpdate[];
}

export interface GuestAccessResponse {
  wedding: {
    id: string;
    partner_one_name: string;
    partner_two_name: string;
    title: string;
    wedding_date: string;
    dress_code?: string;
    welcome_message?: string;
    contact_information?: string;
    parking_notes?: string;
    accessibility_notes?: string;
    children_policy?: string;
    plus_one_policy?: string;
  };
  invitation: {
    id: string;
    formal_recipient_name?: string;
    informal_greeting?: string;
    invitation_type: string;
    rsvp_deadline?: string;
    status: string;
    template?: Record<string, unknown> | null;
  };
  recipients: GuestRecipientInfo[];
  events: WeddingEvent[];
  portal_settings: GuestPortalSettings | null;
  session_id: string;
}

export interface GuestRecipientInfo {
  guest_id: string;
  guest_name: string;
  preferred_name?: string;
  recipient_role: string;
  ceremony_included: boolean;
  reception_included: boolean;
  evening_included: boolean;
  welcome_event_included: boolean;
  day_after_event_included: boolean;
  plus_one_allowed: boolean;
  plus_one_status?: string;
  plus_one_name?: string;
  approved_additional_children: number;
  age_band?: string;
  household_id?: string;
  rsvp?: RsvpResponse | null;
}

// ── Seating ──

export interface SeatingPublication {
  id: string;
  status: string;
  publication_revision?: number;
  published_at?: string;
  linked_event_id?: string;
}

export interface SeatingTable {
  id: string;
  table_number: number | null;
  name: string;
  shape: string;
  colour: string | null;
  capacity: number;
}

export interface SeatingSeat {
  id: string;
  seat_label: string | null;
  seat_number: number | null;
}

export interface SeatingCompanion {
  seat_label?: string;
  full_name: string;
  preferred_name: string | null;
}

export interface SeatingLookupSettings {
  reveal_companions: boolean;
  show_seat_numbers: boolean;
  companion_name_format: 'full_names' | 'first_names_only' | 'preferred_names' | 'hidden';
  show_companion_seat_labels: boolean;
  show_room_map: boolean;
  show_floor_plan_background: boolean;
  show_entrance_route: boolean;
}

export interface SeatingRoomObject {
  id: string;
  object_type: string;
  name: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  rotation: number | null;
  style_key?: string;
  visible?: boolean;
}

export interface SeatingZone {
  id: string;
  name: string;
  description?: string;
  style_key?: string;
  visible?: boolean;
}

export interface SeatingBackgroundAsset {
  id: string;
  storage_path?: string;
  signed_url?: string;
  width?: number;
  height?: number;
  x_position?: number;
  y_position?: number;
  opacity?: number;
  visible?: boolean;
}

export interface GuestSafeMapData {
  tables: Array<{
    id: string;
    table_number: number | null;
    name: string;
    shape: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
    colour: string | null;
    capacity: number;
    is_guest_table: boolean;
    zone?: string;
  }>;
  room_objects: SeatingRoomObject[];
  zones: SeatingZone[];
  background_asset: SeatingBackgroundAsset | null;
  canvas_width: number;
  canvas_height: number;
  entrance_route?: {
    entrance_name: string;
    entrance_x: number;
    entrance_y: number;
    table_x: number;
    table_y: number;
    written_directions?: string;
    accessible_route?: boolean;
  };
}

export interface GuestSeatingResponse {
  publication: SeatingPublication | null;
  table: SeatingTable | null;
  seat: SeatingSeat | null;
  companions: SeatingCompanion[];
  lookup_settings: SeatingLookupSettings;
  wedding_day_note: string | null;
  is_before_reveal: boolean;
  is_emergency_disabled: boolean;
  zone?: string | null;
  map_data: GuestSafeMapData | null;
  updated_at?: string | null;
  all_events_past?: boolean;
}

// ── Registry ──

export interface GiftRegistryItem {
  id: string;
  registry_id: string;
  wedding_id?: string;
  title: string;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  target_amount?: number | null;
  guide_amount?: number | null;
  currency?: string;
  provider?: string | null;
  provider_item_id?: string | null;
  external_url?: string | null;
  is_featured?: boolean;
  is_group_gift?: boolean;
  allow_group_gifting?: boolean;
  allow_reservation?: boolean;
  show_progress?: boolean;
  sort_order?: number;
  category?: string | null;
  status?: string;
  why_couple_chose?: string | null;
  contributed_total?: number;
  contributor_count?: number;
  contributions?: GiftContributionPublic[];
}

export interface GiftContributionPublic {
  id: string;
  is_anonymous: boolean;
  message?: string | null;
  created_at?: string;
  show_name?: boolean;
  show_amount?: boolean;
  amount?: number;
}

export interface GiftRegistryLight {
  id: string;
  wedding_id?: string;
  enabled: boolean;
  registry_type: 'general' | 'honeymoon_fund' | 'charity' | 'external_links' | 'cash_gift';
  name?: string | null;
  title?: string | null;
  description?: string | null;
  presence_message?: string | null;
  thank_you_message?: string | null;
  currency?: string;
  cover_image?: string | null;
  hero_image_url?: string | null;
  provider?: string | null;
  provider_config?: Record<string, unknown> | null;
  external_url?: string | null;
  featured_gifts?: unknown[] | null;
  group_gifting_enabled?: boolean;
  show_donors_publicly?: boolean;
  show_amounts_publicly?: boolean;
  allow_anonymous?: boolean;
  status?: string;
  opens_at?: string | null;
  closes_at?: string | null;
  sort_order?: number;
  items: GiftRegistryItem[];
}

export interface GiftReservation {
  id: string;
  registry_item_id: string;
  guest_id: string;
  status: string;
  reserved_at?: string;
  expires_at?: string | null;
}

export interface GiftContributionGuest {
  id: string;
  item_id: string;
  registry_id?: string | null;
  guest_id: string;
  amount: number;
  currency: string;
  message?: string | null;
  is_anonymous: boolean;
  show_name: boolean;
  show_amount: boolean;
  donor_visibility?: string;
  donor_display_name?: string | null;
  status: string;
  provider_checkout_reference?: string | null;
  confirmed_at?: string | null;
  created_at?: string;
}

export interface GiftRegistryData {
  registries: GiftRegistryLight[];
  my_reservations: GiftReservation[];
  my_contributions: GiftContributionGuest[];
  payment_provider_available: boolean;
}

// ── Gift Funding (Stripe Connect) ──

export interface GiftFundLight {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  category: string;
  target_amount_minor: number | null;
  currency: string;
  cover_image_path: string | null;
  is_active: boolean;
  is_public: boolean;
  show_total_raised: boolean;
  show_contributor_names: boolean;
  closes_at: string | null;
  created_at: string;
  // Computed
  raised_amount_minor: number;
  contributor_count: number;
  recent_contributions: GiftFundContributionPublic[];
}

export interface GiftFundContributionPublic {
  id: string;
  contributor_name: string | null;
  message: string | null;
  amount_minor: number;
  visibility: 'public' | 'name_only' | 'anonymous';
  paid_at: string | null;
  // Public display computed fields
  display_name: string | null;
  display_amount_minor: number | null;
  display_message: string | null;
}

export interface GiftFundData {
  funds: GiftFundLight[];
  couple_account_ready: boolean;
}

// ── Gallery ──

export interface GalleryAsset {
  id: string;
  title: string | null;
  description: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  moderation_status: 'uploading' | 'processing' | 'scanning' | 'awaiting_review' | 'pending' | 'approved' | 'rejected' | 'held' | 'hidden' | 'removed' | 'failed';
  is_featured: boolean;
  uploaded_by_guest_id: string | null;
  is_favourited: boolean;
  signed_url: string;
  created_at: string;
  caption?: string | null;
  credit_name?: string | null;
  credit_visibility?: 'private' | 'first_name_only' | 'full_name' | 'display_name';
  source_type?: 'couple' | 'guest' | 'photographer';
  publication_status?: 'draft' | 'published' | 'hidden';
  downloads_enabled?: boolean;
  sharing_enabled?: boolean;
  published_at?: string | null;
  thumbnail_signed_url?: string | null;
  // Prompt 12 moderation fields
  moderation_reason?: string | null;
  moderation_ai_label?: string | null;
  moderation_scanned_at?: string | null;
  scanned_by?: string | null;
  original_file_hash?: string | null;
  duplicate_of_asset_id?: string | null;
  metadata_stripped?: boolean;
  removed_reason?: string | null;
  wall_visible?: boolean;
  wall_added_at?: string | null;
  moderation_updated_by?: string | null;
  moderation_updated_at?: string | null;
  duration_seconds?: number | null;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  name?: string | null;
  description: string | null;
  album_type: 'couple' | 'engagement' | 'venue' | 'wedding_day' | 'guest_uploads' | 'featured' | 'general' | 'preparation' | 'ceremony' | 'reception' | 'evening' | 'wedding_party' | 'honeymoon' | 'day_after' | 'custom';
  cover_image_path: string | null;
  cover_signed_url?: string | null;
  sort_order: number;
  allow_downloads: boolean;
  allow_favourites: boolean;
  allow_sharing: boolean;
  allow_uploads: boolean;
  asset_count: number;
  assets: GalleryAsset[];
  // Prompt 08 fields
  linked_event_id?: string | null;
  visibility?: 'all_guests' | 'specific_invitations' | 'specific_households' | 'specific_guests' | 'wedding_party' | 'event_attendees' | 'hidden_until_date' | 'hidden';
  reveal_at?: string | null;
  publication_status?: 'draft' | 'scheduled' | 'published' | 'hidden' | 'archived';
  downloads_enabled?: boolean;
  sharing_enabled?: boolean;
  published_at?: string | null;
  archived_at?: string | null;
  last_viewed_at?: string | null;
  has_new_images?: boolean;
}

export interface GalleryData {
  albums: GalleryAlbum[];
  total_assets: number;
  upload_settings?: GalleryUploadSettings | null;
  moderation_rules?: GalleryModerationRules | null;
  my_uploads_count?: number;
  my_favourites_count?: number;
  featured_album?: GalleryAlbum | null;
  recent_photos?: GalleryAsset[];
  couple_message?: string | null;
}

export interface GalleryUploadSettings {
  id?: string;
  wedding_id?: string;
  uploads_enabled: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
  moderation_mode: 'require_approval' | 'trusted_auto_publish' | 'all_auto_publish' | 'disabled';
  max_files_per_batch: number;
  max_files_per_guest: number;
  max_file_size_bytes: number;
  guest_credit_default: 'private' | 'first_name_only' | 'full_name';
}

export interface GalleryModerationRules {
  id?: string;
  wedding_id?: string;
  photos_allowed: boolean;
  videos_allowed: boolean;
  max_file_size_bytes: number;
  max_video_duration_seconds: number;
  auto_approve_trusted_guests: boolean;
  auto_add_to_wall: boolean;
  manual_approval_required: boolean;
  show_captions: boolean;
  show_uploader_names: boolean;
  uploader_name_format: 'private' | 'first_name_only' | 'full_name' | 'display_name';
  max_uploads_per_guest: number;
  allow_reporting: boolean;
  wall_delay_minutes: number;
  event_time_window_start?: string | null;
  event_time_window_end?: string | null;
  strip_metadata: boolean;
  retain_originals: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryAlbumReadState {
  id?: string;
  album_id: string;
  guest_id: string;
  last_viewed_at: string;
}

export interface GalleryMyUpload {
  id: string;
  title: string | null;
  caption?: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  moderation_status: string;
  album_id: string;
  album_title?: string;
  signed_url: string;
  created_at: string;
  rejection_reason?: string | null;
}

// ── Updates ──

export type UpdateCategory =
  | 'general'
  | 'schedule'
  | 'venue'
  | 'travel'
  | 'accommodation'
  | 'parking'
  | 'transport'
  | 'rsvp'
  | 'seating'
  | 'food'
  | 'weather'
  | 'gallery'
  | 'gift_registry'
  | 'emergency'
  | 'thank_you'
  | 'custom';

export type UpdatePriority = 'standard' | 'important' | 'urgent' | 'emergency';

export interface UpdateContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'button' | 'info_panel' | 'event_summary' | 'travel_summary' | 'attachment';
  text?: string;
  level?: number;
  items?: string[];
  image_url?: string;
  image_alt?: string;
  button_label?: string;
  button_route?: string;
  panel_type?: 'info' | 'warning' | 'success';
  event_name?: string;
  event_date?: string;
  location_name?: string;
  attachment_label?: string;
  attachment_url?: string;
}

export interface UpdateAttachment {
  id: string;
  display_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  signed_url: string | null;
  sort_order: number;
}

export interface GuestUpdate {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  content_data: UpdateContentBlock[] | null;
  update_date: string | null;
  created_at: string;
  category: UpdateCategory;
  priority: UpdatePriority;
  is_important: boolean;
  image_url: string | null;
  hero_image_signed_url: string | null;
  related_itinerary_event_id: string | null;
  related_itinerary_event_name: string | null;
  related_travel_item_id: string | null;
  related_travel_item_name: string | null;
  linked_venue_id: string | null;
  linked_venue_name: string | null;
  linked_travel_location_id: string | null;
  linked_travel_location_name: string | null;
  related_route: string | null;
  attachments: UpdateAttachment[];
  dismissible: boolean;
  published_at: string | null;
  last_edited_at: string | null;
  is_read: boolean;
  read_at: string | null;
  is_saved: boolean;
  is_dismissed: boolean;
}

export interface AlertBanner {
  update_id: string;
  title: string;
  summary: string | null;
  priority: UpdatePriority;
  category: UpdateCategory;
  dismissible: boolean;
  is_dismissed: boolean;
}

export interface GuestNotificationPreference {
  id: string;
  guest_id: string;
  updates_enabled: boolean;
  email_notifications: boolean;
  sms_enabled: boolean;
  important_only_updates: boolean;
  travel_updates: boolean;
  rsvp_reminders: boolean;
  gallery_notifications: boolean;
  language: string;
  timezone: string;
}

export interface GuestUpdatesData {
  updates: GuestUpdate[];
  total_count: number;
  unread_count: number;
  saved_count: number;
  alert_banner: AlertBanner | null;
}

// ── Questions / FAQs ──

export type FaqCategory =
  | 'general'
  | 'invitations'
  | 'dress_code'
  | 'children'
  | 'plus_ones'
  | 'travel'
  | 'accommodation'
  | 'parking'
  | 'accessibility'
  | 'food'
  | 'gifts'
  | 'photos'
  | 'timings';

export interface WeddingFaq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  related_links: FaqRelatedLink[];
  helpful_count: number;
  not_helpful_count: number;
  my_feedback: 'helpful' | 'not_helpful' | null;
  sort_order: number;
}

export interface FaqRelatedLink {
  label: string;
  url: string;
  type?: 'internal' | 'external';
}

export interface GuestQuestion {
  id: string;
  category: FaqCategory;
  subject: string;
  message: string;
  preferred_response_method: string;
  status: 'pending' | 'answered' | 'closed';
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface QuestionsData {
  faqs: WeddingFaq[];
  my_questions: GuestQuestion[];
  total_faqs: number;
}

// ── Contacts ──

export interface WeddingContact {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  availability: string | null;
  is_emergency: boolean;
}

export interface ContactsData {
  contacts: WeddingContact[];
  total: number;
}

// ── Settings / Profile ──

export interface GuestProfile {
  guest_id: string;
  preferred_name: string | null;
  email: string | null;
  mobile_phone: string | null;
  alternative_phone: string | null;
  preferred_contact_method: string | null;
  dietary_requirements: string | null;
  allergy_notes: string | null;
  accessibility_notes: string | null;
  accessibility_needs: string | null;
}

export interface GuestNotificationPrefs {
  id: string;
  guest_id: string;
  updates_enabled: boolean;
  email_notifications: boolean;
  sms_enabled: boolean;
  important_only_updates: boolean;
  travel_updates: boolean;
  rsvp_reminders: boolean;
  gallery_notifications: boolean;
  language: string;
  timezone: string;
}

export interface GuestConsentState {
  communication: boolean;
  marketing: boolean;
}

export interface PrivacyRequestItem {
  id: string;
  request_type: 'data_download' | 'data_deletion' | 'data_correction' | 'remove_optional_notes';
  status: string;
  created_at: string;
}

export interface GuestSettingsData {
  profiles: GuestProfile[];
  notification_preferences: GuestNotificationPrefs[];
  consent: GuestConsentState;
  privacy_requests: PrivacyRequestItem[];
}

// ── Local Places (for Things To Do + Accommodation) ──

export interface LocalPlace {
  id: string;
  place_type: string;
  name: string;
  address_line_1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  website?: string | null;
  telephone?: string | null;
  image_url?: string | null;
  accessibility_info?: string | null;
  opening_info?: string | null;
  provider_rating?: string | null;
  // New Prompt 05 fields
  is_approved?: boolean;
  google_place_id?: string | null;
  couple_note?: string | null;
  category_labels?: string[] | null;
  approval_status?: string;
  visibility?: string;
  reveal_at?: string | null;
  provider_data?: Record<string, unknown> | null;
  price_level?: string | null;
  review_count?: number | null;
  distance_from_venue?: number | null;
  estimated_travel_time?: number | null;
  sort_order?: number;
}

export interface GuestTravelPlan {
  id: string;
  wedding_id?: string;
  invitation_id?: string;
  guest_id: string;
  plan_type: 'accommodation' | 'transport' | 'note';
  place_id?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  booking_reference?: string | null;
  transport_needs?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Prompt 05 fields
  accommodation_location_id?: string | null;
  custom_accommodation_name?: string | null;
  room_count?: number;
  guest_count?: number;
  booking_reference_protected?: string | null;
  travel_method?: string | null;
  arrival_at?: string | null;
  departure_at?: string | null;
  parking_required?: boolean;
  shuttle_required?: boolean;
  transport_notes?: string | null;
}

export interface SavedTravelLocation {
  id: string;
  travel_location_id: string;
  guest_id: string;
  created_at?: string;
}

export interface WeddingShuttle {
  id: string;
  name: string;
  pickup_location_id?: string | null;
  destination_event_id?: string | null;
  departure_at?: string | null;
  return_at?: string | null;
  capacity?: number | null;
  booking_required?: boolean;
  guest_description?: string | null;
  status?: string;
}

export interface GuestShuttleRequest {
  id: string;
  guest_id: string;
  shuttle_id: string;
  seats_requested?: number;
  status?: string;
}

export interface LocationEventLink {
  id: string;
  travel_location_id: string;
  wedding_event_id: string;
  relationship_type?: string;
}

export interface TravelUpdate {
  id: string;
  title: string;
  content?: string | null;
  update_date?: string | null;
  created_at?: string;
  category?: string;
  is_important?: boolean;
  image_url?: string | null;
  related_itinerary_event_id?: string | null;
  related_travel_item_id?: string | null;
}

export interface AccommodationPlan {
  id: string;
  place_id: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  notes?: string | null;
  place: {
    id: string;
    name: string;
    address_line_1?: string | null;
    city?: string | null;
    country?: string | null;
    image_url?: string | null;
    description?: string | null;
    website?: string | null;
  } | null;
}