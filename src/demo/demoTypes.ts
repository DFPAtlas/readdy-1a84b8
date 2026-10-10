// ── DEMO TYPES ──

export interface DemoWedding {
  id: string;
  title: string;
  partner_one_name: string;
  partner_two_name: string;
  wedding_date: string;
  date_confirmed: boolean;
  timezone: string;
  status: string;
  slug: string;
  location: string;
  welcome_message: string;
  dress_code: string;
  contact_information: string;
  parking_notes: string;
  accessibility_notes: string;
  children_policy: string;
  plus_one_policy: string;
  hashtag: string;
}

export interface DemoWeddingVenue {
  id: string;
  wedding_id: string;
  venue_type: 'ceremony' | 'reception' | 'both' | 'other';
  name: string;
  address_line_1: string;
  city: string;
  county_or_region: string;
  postcode: string;
  country: string;
  is_public: boolean;
}

export interface DemoWeddingEvent {
  id: string;
  wedding_id: string;
  event_type: string;
  name: string;
  start_at: string;
  end_at: string;
  venue_id: string;
  dress_code: string;
  description: string;
  is_public: boolean;
  sort_order: number;
  // Schedule-manager fields
  visibility: 'public' | 'invitation_holders' | 'included_guests' | 'reveal_on_date' | 'hidden';
  status: 'draft' | 'published' | 'cancelled' | 'archived';
  guest_description: string;
  reveal_at: string | null;
  published_at: string | null;
  arrival_offset_minutes: number;
  parking_notes: string;
  transport_notes: string;
  accessibility_notes: string;
  children_notes: string;
  // Denormalised venue for display
  venue_name?: string;
  venue_city?: string;
}

export interface DemoEventAudience {
  id: string;
  wedding_id: string;
  event_id: string;
  audience_type: 'invitation' | 'guest' | 'household';
  audience_reference_id: string;
  created_at: string;
}

export interface DemoGuest {
  id: string;
  wedding_id: string;
  full_name: string;
  last_name: string;
  preferred_name: string;
  title: string;
  guest_type: 'adult' | 'child' | 'infant';
  relationship_label: string;
  connection_group: string;
  wedding_party_role: string;
  invitation_group: string;
  email: string;
  mobile_phone: string;
  ceremony_invited: boolean;
  reception_invited: boolean;
  evening_invited: boolean;
  plus_one_status: 'none' | 'allowed' | 'named';
  named_plus_one_guest_id: string;
  plus_one_name: string;
  dietary_requirements: string;
  allergy_notes: string;
  accessibility_notes: string;
  accessibility_needs: string;
  mobility_transport_notes: string;
  child_notes: string;
  rsvp_status: 'accepted' | 'declined' | 'pending' | '';
  meal_choice: string;
  household_id: string;
  status: 'active' | 'archived';
  invite_preparation_status: string;
  preferred_contact_method: string;
  tag_ids?: string[];
  rsvp_ceremony_attending?: boolean;
  rsvp_reception_attending?: boolean;
  rsvp_evening_attending?: boolean;
  rsvp_submitted_at?: string;
  rsvp_plus_one_confirmed?: boolean;
  rsvp_message?: string;
  rsvp_song_request?: string;
}

export interface DemoHousehold {
  id: string;
  wedding_id: string;
  display_name: string;
  formal_invitation_name: string;
  informal_greeting: string;
  primary_guest_id: string;
  shared_email: string;
  shared_phone: string;
  invitation_delivery_method: string;
  status: string;
}

export interface DemoInvitation {
  id: string;
  wedding_id: string;
  household_id: string;
  invitation_type: string;
  internal_name: string;
  formal_recipient_name: string;
  informal_greeting: string;
  delivery_method: string;
  language_code: string;
  rsvp_deadline: string;
  status: 'draft' | 'ready' | 'sent' | 'cancelled' | 'archived';
  template_id: string;
}

export interface DemoInvitationRecipient {
  id: string;
  wedding_id: string;
  invitation_id: string;
  guest_id: string;
  recipient_role: 'primary' | 'partner' | 'child';
  ceremony_included: boolean;
  reception_included: boolean;
  evening_included: boolean;
  plus_one_allowed: boolean;
}

export interface DemoInvitationTemplate {
  id: string;
  wedding_id: string;
  name: string;
  description: string;
  template_type: string;
  style_preset: string;
  header_text: string;
  body_text: string;
  closing_text: string;
  footer_text: string;
  rsvp_button_label: string;
  is_default: boolean;
  status: 'active' | 'archived';
}

export interface DemoBudgetCategory {
  id: string;
  wedding_id: string;
  name: string;
  planned_amount: number;
  notes: string;
  sort_order: number;
}

export interface DemoExpense {
  id: string;
  wedding_id: string;
  category_id: string;
  supplier_id: string;
  description: string;
  agreed_amount: number;
  quoted_amount: number;
  payment_status: 'quoted' | 'booked' | 'deposit_paid' | 'part_paid' | 'paid';
  status: 'active' | 'cancelled' | 'archived';
  due_date: string;
}

export interface DemoPayment {
  id: string;
  wedding_id: string;
  expense_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_type?: 'deposit' | 'balance' | 'payment';
}

export interface DemoSeatingTable {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  table_type: string;
}

export interface DemoSeatAssignment {
  id: string;
  guest_id: string;
  table_id: string;
  seat_number: number;
}

export interface DemoSeatingPlan {
  id: string;
  name: string;
  wedding_id: string;
  is_working: boolean;
  tables: DemoSeatingTable[];
  assignments: DemoSeatAssignment[];
}

export interface DemoTravelPlace {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  short_description: string;
  address: string;
  city: string;
  postcode: string;
  distance_miles: number;
  journey_time_minutes: number;
  website_url: string;
  phone: string;
  approval_status: 'approved' | 'pending' | 'hidden';
  featured: boolean;
  couple_note: string;
  price_tag: 'budget' | 'standard' | 'luxury';
}

export interface DemoUpdate {
  id: string;
  wedding_id: string;
  title: string;
  summary: string;
  category: string;
  priority: 'standard' | 'important' | 'urgent' | 'emergency';
  status: 'published';
  content_data: Array<{ type: string; text?: string; level?: number; items?: string[]; url?: string; alt?: string; label?: string; variant?: string }>;
  publish_at: string;
  related_route: string;
  linked_event_id: string;
  dismissible: boolean;
}

export interface DemoRegistryItem {
  id: string;
  wedding_id: string;
  registry_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  item_type: 'gift' | 'fund' | 'charity';
  image_prompt: string;
  reserved: boolean;
  contribution_count: number;
  total_contributed: number;
}

// ── Gift Funding (Stripe Connect) ──

export interface DemoGiftFund {
  id: string;
  wedding_id: string;
  title: string;
  description: string;
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
}

export interface DemoGiftFundContribution {
  id: string;
  fund_id: string;
  guest_id: string;
  contributor_name: string;
  message: string | null;
  amount_minor: number;
  visibility: 'public' | 'name_only' | 'anonymous';
  payment_status: string;
  paid_at: string;
}

export interface DemoGalleryItem {
  id: string;
  wedding_id: string;
  album_id: string;
  image_src: string;
  caption: string;
  uploader_name: string;
  upload_time: string;
  moderation_status: 'scanning' | 'approved' | 'needs_review' | 'rejected' | 'hidden';
  favourite_count: number;
  reported: boolean;
  ai_label: string;
  wall_visible: boolean;
  rejection_reason?: string;
}

export interface DemoGalleryAlbum {
  id: string;
  wedding_id: string;
  name: string;
  description: string;
  cover_image_index: number;
}

export interface DemoGallerySettings extends Record<string, unknown> {
  guest_uploads_enabled: boolean;
  couple_approval_required: boolean;
  auto_add_to_wall: boolean;
  show_uploader_names: boolean;
  allow_guest_downloads: boolean;
  allow_favourites: boolean;
  show_captions: boolean;
  wall_transition_speed: 'slow' | 'medium' | 'fast';
  wall_paused: boolean;
}

export interface DemoTask {
  id: string;
  wedding_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  assigned_to: string;
}

export interface DemoSupplier {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  status: 'active' | 'pending' | 'cancelled';
  total_cost: number;
  amount_paid: number;
  next_action: string;
  notes: string;
}

export interface DemoActivityEvent {
  id: string;
  timestamp: string;
  message: string;
  category: string;
  related_guest: string;
  wedding_id: string;
}

// ── Questions & FAQs ──

export interface DemoFaq {
  id: string;
  wedding_id: string;
  category: string;
  question: string;
  answer: string;
  related_links: Array<{ label: string; url: string; type: 'internal' | 'external' }>;
  is_published: boolean;
  status: 'draft' | 'published' | 'archived';
  sort_order: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface DemoGuestQuestion {
  id: string;
  wedding_id: string;
  invitation_id: string;
  guest_id: string;
  category: string;
  subject: string;
  message: string;
  preferred_response_method: string;
  status: 'pending' | 'answered' | 'closed';
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoQuestionActivity {
  id: string;
  wedding_id: string;
  question_id: string | null;
  faq_id: string | null;
  invitation_id: string | null;
  guest_id: string | null;
  activity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DemoPortalSettings {
  meal_options?: string[];
  portal_enabled?: boolean;
  rsvp_enabled?: boolean;
  household_rsvp_enabled?: boolean;
  require_meal_choices?: boolean;
  allow_song_requests?: boolean;
  allow_messages?: boolean;
  allow_late_rsvp?: boolean;
  allow_rsvp_updates?: boolean;
  show_questions: boolean;
  allow_guest_questions: boolean;
  questions_contact_message: string;
  questions_response_time_message: string;
}

export interface DemoState {
  wedding: DemoWedding;
  venues: DemoWeddingVenue[];
  events: DemoWeddingEvent[];
  eventAudiences: DemoEventAudience[];
  guests: DemoGuest[];
  households: DemoHousehold[];
  invitations: DemoInvitation[];
  invitationRecipients: DemoInvitationRecipient[];
  invitationTemplates: DemoInvitationTemplate[];
  budgetCategories: DemoBudgetCategory[];
  expenses: DemoExpense[];
  payments: DemoPayment[];
  seatingPlan: DemoSeatingPlan;
  travelPlaces: DemoTravelPlace[];
  updates: DemoUpdate[];
  registryItems: DemoRegistryItem[];
  galleryItems: DemoGalleryItem[];
  galleryAlbums: DemoGalleryAlbum[];
  gallerySettings: DemoGallerySettings;
  giftFunds: DemoGiftFund[];
  giftFundContributions: DemoGiftFundContribution[];
  tasks: DemoTask[];
  suppliers: DemoSupplier[];
  activityFeed: DemoActivityEvent[];
  onboardingComplete: boolean;
  planningPriorities: string[];
  guestEstimate: number;
  // Questions & FAQs
  faqs: DemoFaq[];
  guestQuestions: DemoGuestQuestion[];
  questionActivity: DemoQuestionActivity[];
  portalSettings: DemoPortalSettings;
  // Website Builder
  websiteConfig: import("@/types/website").WebsiteConfig | null;
  rsvpSettings?: Record<string, unknown>;
  /** Billing subscription state (demo only) */
  subscription: Record<string, unknown> | null;
}

export interface DemoCalculatedStats {
  totalInvited: number;
  attending: number;
  awaitingReply: number;
  declined: number;
  householdCount: number;
  dietaryCount: number;
  accessibilityCount: number;
  plusOneCount: number;
  dayGuests: number;
  eveningOnly: number;
  tableCount: number;
  seatedGuests: number;
  unseatedGuests: number;
  budgetPlanned: number;
  budgetCommitted: number;
  budgetPaid: number;
  budgetOutstanding: number;
  budgetRemaining: number;
  categoryCount: number;
  expenseCount: number;
  upcomingPayments: number;
  travelPlacesCount: number;
  updateCount: number;
  registryItemCount: number;
  galleryApprovedCount: number;
  galleryPendingCount: number;
  galleryOnWallCount: number;
  taskCount: number;
  supplierCount: number;
}