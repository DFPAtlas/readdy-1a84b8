// ── Email Campaign Types ──

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'partial_failure'
  | 'failed'
  | 'archived';

export type CampaignTemplateType =
  | 'save_the_date'
  | 'rsvp_confirmation'
  | 'rsvp_reminder'
  | 'details_updated'
  | 'one_week_countdown'
  | 'travel_guide'
  | 'photo_wall_invitation'
  | 'gallery_ready'
  | 'custom';

export type RecipientStatus =
  | 'pending'
  | 'queued'
  | 'accepted'
  | 'delivered'
  | 'bounced'
  | 'complained'
  | 'failed'
  | 'suppressed'
  | 'skipped';

export type SuppressionType = 'unsubscribed' | 'bounced' | 'complained' | 'manual';

export type ContentBlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'spacer';

export interface ContentBlock {
  type: ContentBlockType;
  content?: string;
  level?: number;
  src?: string;
  alt?: string;
  label?: string;
  url?: string;
  variant?: 'primary' | 'secondary';
}

export interface EmailTemplate {
  id: string;
  wedding_id: string | null;
  name: string;
  template_type: CampaignTemplateType;
  subject_template: string;
  preheader_template: string;
  sender_name: string;
  reply_to_email: string;
  content_blocks: ContentBlock[];
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_accent_color: string;
  brand_font_family: string;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  wedding_id: string;
  template_id: string | null;
  name: string;
  subject: string;
  preheader: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  content_blocks: ContentBlock[];
  cta_label: string;
  cta_url: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_accent_color: string;
  brand_font_family: string;
  audience_filter: AudienceFilter | null;
  recipient_count: number;
  status: CampaignStatus;
  schedule_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  delivery_stats: DeliveryStats;
  is_test: boolean;
  resend_batch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  wedding_id: string;
  guest_id: string | null;
  household_id: string | null;
  recipient_email: string;
  recipient_name: string;
  recipient_type: 'guest' | 'household_primary' | 'organizer';
  status: RecipientStatus;
  resend_email_id: string | null;
  delivered_at: string | null;
  bounce_reason: string | null;
  complaint_reason: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSuppression {
  id: string;
  wedding_id: string;
  email: string;
  suppression_type: SuppressionType;
  reason: string;
  resend_event_id: string | null;
  resend_webhook_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface EmailActivityLog {
  id: string;
  wedding_id: string;
  campaign_id: string | null;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DeliveryStats {
  accepted: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
}

export interface AudienceFilter extends Record<string, unknown> {
  guest_ids?: string[];
  household_ids?: string[];
  rsvp_status?: string[];
  guest_tags?: string[];
  ceremony_invited?: boolean;
  reception_invited?: boolean;
  evening_invited?: boolean;
  exclude_ids?: string[];
}

export interface CampaignFormData {
  name: string;
  subject: string;
  preheader: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  content_blocks: ContentBlock[];
  cta_label: string;
  cta_url: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_accent_color: string;
  brand_font_family: string;
  audience_filter: AudienceFilter;
  schedule_at: string | null;
  template_id: string | null;
}

export interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  sent: number;
  failed: number;
  total_sent_count: number;
  total_delivered: number;
  total_bounced: number;
  total_complained: number;
}

// ── Constants ──

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  partial_failure: 'Partial failure',
  failed: 'Failed',
  archived: 'Archived',
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-background-200 text-foreground-600',
  scheduled: 'bg-amber-100 text-amber-700',
  sending: 'bg-sky-100 text-sky-700',
  sent: 'bg-emerald-100 text-emerald-700',
  partial_failure: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-background-200 text-foreground-500',
};

export const TEMPLATE_TYPE_LABELS: Record<CampaignTemplateType, string> = {
  save_the_date: 'Save the Date',
  rsvp_confirmation: 'RSVP Confirmation',
  rsvp_reminder: 'RSVP Reminder',
  details_updated: 'Details Updated',
  one_week_countdown: 'One Week Countdown',
  travel_guide: 'Travel Guide',
  photo_wall_invitation: 'Photo Wall Invitation',
  gallery_ready: 'Gallery Ready',
  custom: 'Custom',
};

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  accepted: 'Accepted',
  delivered: 'Delivered',
  bounced: 'Bounced',
  complained: 'Complained',
  failed: 'Failed',
  suppressed: 'Suppressed',
  skipped: 'Skipped',
};

export const RECIPIENT_STATUS_COLORS: Record<RecipientStatus, string> = {
  pending: 'bg-background-200 text-foreground-500',
  queued: 'bg-sky-100 text-sky-700',
  accepted: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  bounced: 'bg-red-100 text-red-700',
  complained: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  suppressed: 'bg-background-200 text-foreground-500',
  skipped: 'bg-background-200 text-foreground-400',
};

export const DEFAULT_CONTENT_BLOCK: ContentBlock = {
  type: 'paragraph',
  content: '',
};

export const EMPTY_CAMPAIGN_FORM: CampaignFormData = {
  name: '',
  subject: '',
  preheader: '',
  sender_name: '',
  sender_email: '',
  reply_to_email: '',
  content_blocks: [{ type: 'heading', content: 'Hello!', level: 1 }, { type: 'paragraph', content: '' }, { type: 'button', label: 'Learn more', url: '', variant: 'primary' }],
  cta_label: '',
  cta_url: '',
  brand_primary_color: '#D4A574',
  brand_secondary_color: '#F5F0EB',
  brand_accent_color: '#C9A96E',
  brand_font_family: 'Georgia, serif',
  audience_filter: {},
  schedule_at: null,
  template_id: null,
};