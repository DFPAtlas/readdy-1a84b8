export interface InvitationTemplate {
  id: string;
  wedding_id: string;
  name: string;
  description?: string;
  template_type: string;
  style_preset: string;
  header_text: string;
  body_text: string;
  closing_text: string;
  footer_text: string;
  rsvp_button_label: string;
  image_url?: string;
  theme_config?: Record<string, unknown>;
  is_default: boolean;
  status: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  usage_count?: number;
}

export interface Invitation {
  id: string;
  wedding_id: string;
  household_id?: string;
  invitation_type: string;
  internal_name: string;
  formal_recipient_name?: string;
  informal_greeting?: string;
  delivery_method: string;
  template_id?: string;
  language_code: string;
  rsvp_deadline?: string;
  status: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  template?: InvitationTemplate | null;
  household?: { id: string; display_name: string } | null;
  recipients?: InvitationRecipient[];
  recipient_count?: number;
  delivery_status?: string | null;
  sent_at?: string | null;
  delivery_attempts?: number;
  last_delivery_error?: string | null;
  resend_email_id?: string | null;
}

export interface InvitationRecipient {
  id: string;
  wedding_id: string;
  invitation_id: string;
  guest_id: string;
  recipient_role: string;
  ceremony_included: boolean;
  reception_included: boolean;
  evening_included: boolean;
  welcome_event_included: boolean;
  day_after_event_included: boolean;
  custom_event_access?: Record<string, unknown>;
  plus_one_allowed: boolean;
  child_invitation_notes?: string;
  created_at?: string;
  updated_at?: string;
  guest?: {
    id: string;
    full_name: string;
    last_name?: string;
    preferred_name?: string;
    guest_type: string;
    relationship_label?: string;
    email?: string;
    mobile_phone?: string;
    plus_one_status?: string;
    invitation_group?: string;
    invite_preparation_status?: string;
  } | null;
}

export interface InvitationActivityLog {
  id: string;
  wedding_id: string;
  invitation_id?: string;
  actor_user_id?: string;
  action: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface InvitationFilters {
  search: string;
  status: string;
  delivery_method: string;
  template_id: string;
  type: string;
  missing_contact: string;
  active_archived: string;
  sort: string;
  page: number;
  pageSize: number;
}

export const INVITATION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready to send' },
  { value: 'sent', label: 'Sent' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
];

export const DELIVERY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened', label: 'Opened' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed', label: 'Failed' },
  { value: 'revoked', label: 'Revoked' },
];

export const DELIVERY_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  queued: 'bg-secondary-100 text-secondary-700',
  sending: 'bg-accent-100 text-accent-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  opened: 'bg-primary-100 text-primary-700',
  bounced: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  revoked: 'bg-foreground-100 text-foreground-500',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  queued: 'Queued',
  sending: 'Sending',
  delivered: 'Delivered',
  opened: 'Opened',
  bounced: 'Bounced',
  failed: 'Failed',
  revoked: 'Revoked',
};

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  warning?: string;
  invite_url?: string;
  resend_email_id?: string;
}

export const INVITATION_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'household', label: 'Household' },
  { value: 'couple', label: 'Couple' },
  { value: 'wedding_party', label: 'Wedding party' },
  { value: 'special', label: 'Special attendee' },
];

export const DELIVERY_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'post', label: 'Post' },
  { value: 'both', label: 'Both' },
  { value: 'undecided', label: 'Undecided' },
];

export const STYLE_PRESET_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'botanical', label: 'Botanical' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'editorial', label: 'Editorial' },
];

export const TEMPLATE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'household', label: 'Household' },
  { value: 'individual', label: 'Individual' },
  { value: 'wedding_party', label: 'Wedding party' },
  { value: 'special', label: 'Special attendee' },
];

export const INVITATION_SORT_OPTIONS = [
  { value: 'internal_name_asc', label: 'Name A–Z' },
  { value: 'internal_name_desc', label: 'Name Z–A' },
  { value: 'created_at_desc', label: 'Newest first' },
  { value: 'created_at_asc', label: 'Oldest first' },
  { value: 'status_asc', label: 'Status' },
];

export const TOKEN_LIST = [
  { token: '{{guest_name}}', label: 'Guest name' },
  { token: '{{household_name}}', label: 'Household name' },
  { token: '{{formal_recipient_name}}', label: 'Formal recipient name' },
  { token: '{{couple_names}}', label: 'Couple names' },
  { token: '{{wedding_date}}', label: 'Wedding date' },
  { token: '{{ceremony_name}}', label: 'Ceremony name' },
  { token: '{{ceremony_time}}', label: 'Ceremony time' },
  { token: '{{ceremony_venue}}', label: 'Ceremony venue' },
  { token: '{{reception_venue}}', label: 'Reception venue' },
  { token: '{{rsvp_deadline}}', label: 'RSVP deadline' },
];

export const VALID_TOKENS = TOKEN_LIST.map((t) => t.token);

export const STYLE_PRESET_PREVIEWS: Record<string, { font: string; bg: string; border: string; text: string }> = {
  classic: { font: 'font-serif', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  modern: { font: 'font-sans', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900' },
  botanical: { font: 'font-sans', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
  minimal: { font: 'font-light', bg: 'bg-white', border: 'border-secondary-100', text: 'text-foreground-900' },
  romantic: { font: 'font-serif italic', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900' },
  editorial: { font: 'font-heading', bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-900' },
};