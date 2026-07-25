export interface Guest {
  id: string;
  wedding_id: string;
  full_name: string;
  last_name?: string;
  preferred_name?: string;
  title?: string;
  pronouns?: string;
  guest_type: string;
  relationship_label?: string;
  connection_group?: string;
  wedding_party_role?: string;
  email?: string;
  mobile_phone?: string;
  alternative_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county_or_region?: string;
  postcode?: string;
  country?: string;
  preferred_contact_method: string;
  invitation_group?: string;
  invite_preparation_status: string;
  ceremony_invited: boolean;
  reception_invited: boolean;
  evening_invited: boolean;
  plus_one_status: string;
  named_plus_one_guest_id?: string;
  approved_additional_children: number;
  dietary_requirements?: string;
  allergy_notes?: string;
  accessibility_notes?: string;
  mobility_transport_notes?: string;
  accessibility_needs?: string;
  child_notes?: string;
  private_notes?: string;
  rsvp_status?: string;
  plus_one_allowed?: boolean;
  plus_one_name?: string;
  meal_choice?: string;
  guest_group?: string;
  household_id?: string;
  status: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  date_of_birth?: string;
  age_band?: string;
  household?: GuestHousehold | null;
  tags?: GuestTag[];
  plus_one_guest?: Guest | null;
}

export interface GuestHousehold {
  id: string;
  wedding_id: string;
  display_name: string;
  formal_invitation_name?: string;
  informal_greeting?: string;
  primary_guest_id?: string;
  shared_email?: string;
  shared_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county_or_region?: string;
  postcode?: string;
  country?: string;
  invitation_delivery_method: string;
  notes?: string;
  status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  primary_guest?: Guest | null;
  members?: Guest[];
  member_count?: number;
}

export interface GuestTag {
  id: string;
  wedding_id: string;
  name: string;
  description?: string;
  colour_key: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
}

export interface GuestTagAssignment {
  id: string;
  wedding_id: string;
  guest_id: string;
  tag_id: string;
  created_at?: string;
  created_by?: string;
}

export interface GuestRelationship {
  id: string;
  wedding_id: string;
  guest_id: string;
  related_guest_id: string;
  relationship_type: string;
  created_at?: string;
}

export interface GuestActivityLog {
  id: string;
  wedding_id: string;
  guest_id?: string;
  household_id?: string;
  actor_user_id?: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface GuestImportJob {
  id: string;
  wedding_id: string;
  created_by?: string;
  source_filename?: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  imported_rows: number;
  skipped_rows: number;
  mapping_config?: Record<string, unknown>;
  error_report?: unknown[];
  created_at?: string;
  completed_at?: string;
}

export interface GuestFilters {
  search: string;
  household_id: string;
  guest_type: string;
  invitation_group: string;
  relationship: string;
  contact_complete: string;
  plus_one: string;
  tag_ids: string[];
  status: string;
  sort: string;
  page: number;
  pageSize: number;
}

export const GUEST_TYPE_OPTIONS = [
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'infant', label: 'Infant' },
  { value: 'unknown', label: 'Unknown' },
];

export const PLUS_ONE_STATUS_OPTIONS = [
  { value: 'none', label: 'No plus-one' },
  { value: 'allowed', label: 'Plus-one allowed' },
  { value: 'named', label: 'Named plus-one' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const INVITE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready for invitation' },
];

export const INVITATION_GROUP_OPTIONS = [
  { value: 'Family', label: 'Family' },
  { value: 'Wedding party', label: 'Wedding party' },
  { value: 'Friends', label: 'Friends' },
  { value: 'Work', label: 'Work' },
  { value: 'Extended family', label: 'Extended family' },
  { value: 'Neighbours', label: 'Neighbours' },
];

export const CONTACT_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'post', label: 'Post' },
  { value: 'none', label: 'None' },
];

export const DELIVERY_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'post', label: 'Post' },
  { value: 'both', label: 'Both' },
  { value: 'undecided', label: 'Undecided' },
];

export const TAG_COLOUR_OPTIONS = [
  { value: 'primary', label: 'Rose' },
  { value: 'accent', label: 'Sage' },
  { value: 'secondary', label: 'Warm grey' },
];

export const TAG_COLOUR_CLASSES: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-700',
  accent: 'bg-accent-100 text-accent-700',
  secondary: 'bg-secondary-100 text-secondary-700',
};

export const GUEST_TYPE_BADGE: Record<string, string> = {
  adult: '',
  child: 'bg-accent-100 text-accent-700',
  infant: 'bg-secondary-100 text-secondary-700',
  unknown: '',
};

export const SORT_OPTIONS = [
  { value: 'full_name_asc', label: 'Name A–Z' },
  { value: 'full_name_desc', label: 'Name Z–A' },
  { value: 'created_at_desc', label: 'Newest first' },
  { value: 'created_at_asc', label: 'Oldest first' },
  { value: 'household_asc', label: 'Household A–Z' },
];