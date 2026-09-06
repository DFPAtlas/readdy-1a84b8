// ── Settings Types for Vowora ──

import type { WeddingRole, WeddingMembershipStatus } from './membership';
import type { BillingPlanKey, SubscriptionStatus } from '@/types/billing';

// ── Profile Settings ──

export interface ProfileSettings {
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  phone: string;
  timezone: string;
}

// ── Wedding Details Settings ──

export interface WeddingDetailsSettings {
  title: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: string;
  timezone: string;
  location: string;
  slug: string;
  contactInfo: string;
  status: string;
}

// ── Collaborator / Member Invitations ──

export type MemberInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface MemberInvitation {
  id: string;
  wedding_id: string;
  invited_email: string;
  invited_by: string;
  role: WeddingRole;
  token: string;
  status: MemberInvitationStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollaboratorDisplay {
  id: string;
  userId: string | null;
  email: string | null;
  name: string;
  role: WeddingRole;
  status: WeddingMembershipStatus | MemberInvitationStatus;
  isInvitation: boolean;
  invitationId: string | null;
  avatarUrl: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
}

export const ROLE_LABELS: Record<WeddingRole, string> = {
  owner: 'Owner',
  partner: 'Partner / Co-owner',
  planner: 'Planner',
  collaborator: 'Collaborator',
  viewer: 'Viewer (read-only)',
};

export const ROLE_SHORT_LABELS: Record<WeddingRole, string> = {
  owner: 'Owner',
  partner: 'Partner',
  planner: 'Planner',
  collaborator: 'Collaborator',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<WeddingRole, string> = {
  owner: 'Full access — manage everything including billing, collaborators, and destructive actions',
  partner: 'Co-owner — nearly full access; can manage most settings but not ownership transfers',
  planner: 'Can manage guests, invitations, budget, seating, travel, and gallery; cannot manage collaborators or billing',
  collaborator: 'Can edit wedding content but cannot manage guests, billing, or collaborators',
  viewer: 'Read-only access to the wedding workspace',
};

export const ROLE_COLORS: Record<WeddingRole, string> = {
  owner: 'bg-amber-100 text-amber-800',
  partner: 'bg-accent-100 text-accent-800',
  planner: 'bg-emerald-100 text-emerald-800',
  collaborator: 'bg-sky-100 text-sky-800',
  viewer: 'bg-secondary-100 text-secondary-700',
};

// ── Guest Portal Settings ──

export interface GuestPortalSettings {
  guestPortalEnabled: boolean;
  galleryEnabled: boolean;
  itineraryEnabled: boolean;
  registryEnabled: boolean;
  seatingEnabled: boolean;
  travelEnabled: boolean;
  updatesEnabled: boolean;
  allowGuestUploads: boolean;
  requireUploadApproval: boolean;
  publishMode: 'draft' | 'live';
  guestPasswordEnabled: boolean;
  guestPassword: string;
  showGuestCount: boolean;
}

export const GUEST_PORTAL_DEFAULTS: GuestPortalSettings = {
  guestPortalEnabled: true,
  galleryEnabled: true,
  itineraryEnabled: true,
  registryEnabled: true,
  seatingEnabled: false,
  travelEnabled: true,
  updatesEnabled: true,
  allowGuestUploads: true,
  requireUploadApproval: true,
  publishMode: 'draft',
  guestPasswordEnabled: false,
  guestPassword: '',
  showGuestCount: true,
};

// ── Notification Preferences ──

export interface NotificationPreferences {
  emailRsvpAlerts: boolean;
  emailNewUploads: boolean;
  emailBudgetAlerts: boolean;
  emailWeeklyDigest: boolean;
  emailCampaignUpdates: boolean;
  smsRsvpAlerts: boolean;
  pushEnabled: boolean;
}

export const NOTIFICATION_DEFAULTS: NotificationPreferences = {
  emailRsvpAlerts: true,
  emailNewUploads: true,
  emailBudgetAlerts: false,
  emailWeeklyDigest: true,
  emailCampaignUpdates: true,
  smsRsvpAlerts: false,
  pushEnabled: false,
};

// ── Communication preferences (unbundled from consent) ──

export interface CommunicationPreferences {
  serviceEmails: boolean;       // required for platform operation (cannot disable)
  weddingUpdates: boolean;      // wedding-specific notifications
  marketingEmails: boolean;     // separate marketing consent
  productUpdates: boolean;      // new features, tips
}

export const COMMS_DEFAULTS: CommunicationPreferences = {
  serviceEmails: true,
  weddingUpdates: true,
  marketingEmails: false,
  productUpdates: false,
};

// ── Privacy Settings ──

export interface PrivacySettings {
  searchEngineIndexing: boolean;
  guestPortalPublic: boolean;
}

// ── Billing / Subscription ──

export type BillingPlan = BillingPlanKey;
export type BillingStatus = SubscriptionStatus;

export interface BillingInfo {
  plan: BillingPlan;
  status: BillingStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const PLAN_LABELS: Record<BillingPlan, string> = {
  free: 'Free',
  essential: 'Essential',
  complete: 'Complete',
  luxury: 'Luxury',
};

export const PLAN_PRICES: Record<BillingPlan, string> = {
  free: '£0',
  essential: '£9/mo',
  complete: '£19/mo',
  luxury: '£39/mo',
};

export const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  free: ['Up to 20 guests', 'Basic guest portal', '1 collaborator', 'Community support'],
  essential: ['Up to 80 guests', 'Full guest portal', '3 collaborators', 'Email support', 'Gallery uploads', 'RSVP tracking', 'Travel guide'],
  complete: ['Up to 200 guests', 'Advanced guest portal', '10 collaborators', 'Priority support', 'Seating planner', 'Budget tracker', 'Email campaigns', 'Travel concierge'],
  luxury: ['Unlimited guests', 'White-label portal', 'Unlimited collaborators', 'Dedicated support', 'Everything in Complete', 'Custom domain', 'API access', 'SLA'],
};

// ── Data Management ──

export interface ExportRequest {
  id: string;
  wedding_id: string;
  requested_by: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DeletionRequest {
  id: string;
  wedding_id: string;
  requested_by: string;
  reason: string | null;
  confirmationCode: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  scheduledDeletionAt: string;
  deletedAt: string | null;
  createdAt: string;
}

// ── Complete settings shape for the page ──

export interface AllSettings {
  profile: ProfileSettings;
  wedding: WeddingDetailsSettings;
  collaborators: CollaboratorDisplay[];
  guestPortal: GuestPortalSettings;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  billing: BillingInfo;
}

// ── Settings tab type ──

export type SettingsTab =
  | 'profile'
  | 'wedding'
  | 'collaborators'
  | 'guest-portal'
  | 'notifications'
  | 'privacy'
  | 'billing'
  | 'data';

export interface SettingsNavItem {
  key: SettingsTab;
  label: string;
  icon: string;
  requiresOwner?: boolean;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  { key: 'profile', label: 'Profile', icon: 'ri-user-line' },
  { key: 'wedding', label: 'Wedding', icon: 'ri-heart-line' },
  { key: 'collaborators', label: 'Collaborators', icon: 'ri-team-line', requiresOwner: true },
  { key: 'guest-portal', label: 'Guest Portal', icon: 'ri-window-line' },
  { key: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line' },
  { key: 'privacy', label: 'Privacy', icon: 'ri-lock-line' },
  { key: 'billing', label: 'Billing', icon: 'ri-bank-card-line', requiresOwner: true },
  { key: 'data', label: 'Data', icon: 'ri-database-2-line', requiresOwner: true },
];

// ── Timezone list ──

export const COMMON_TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Dublin',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Pacific/Auckland',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
] as const;