// ── Gift Funding Domain Types ──
// Canonical types for the standalone monetary Gift Funding feature (Stripe Connect).
// Separate from the existing physical Gift Registry (gift_registries / gift_contributions).
//
// All money values use integer minor units (pence for GBP).
// Reuse src/lib/budgetMoney.ts for formatting — never float.

import type { CurrencyCode } from '@/lib/budgetMoney';

// ── Enums ──

export const GIFT_FUND_CATEGORIES = [
  'honeymoon',
  'new_home',
  'furniture',
  'wedding',
  'experiences',
  'charity',
  'future_together',
  'custom',
] as const;

export type GiftFundCategory = (typeof GIFT_FUND_CATEGORIES)[number];

export const GIFT_FUND_CATEGORY_LABELS: Record<GiftFundCategory, string> = {
  honeymoon: 'Honeymoon',
  new_home: 'New Home',
  furniture: 'Furniture',
  wedding: 'Wedding',
  experiences: 'Experiences',
  charity: 'Charity',
  future_together: 'Future Together',
  custom: 'Custom',
};

export const GIFT_FUND_CATEGORY_ICONS: Record<GiftFundCategory, string> = {
  honeymoon: 'ri-plane-line',
  new_home: 'ri-home-4-line',
  furniture: 'ri-sofa-line',
  wedding: 'ri-cake-line',
  experiences: 'ri-compass-3-line',
  charity: 'ri-heart-pulse-line',
  future_together: 'ri-rocket-line',
  custom: 'ri-heart-line',
};

export type GiftFundVisibility = 'public' | 'name_only' | 'anonymous';

export type GiftFundPaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed'
  | 'dispute_won'
  | 'dispute_lost';

/** Payment statuses that count toward confirmed totals. */
export const CONFIRMED_PAYMENT_STATUSES: ReadonlySet<GiftFundPaymentStatus> = new Set([
  'paid',
  'partially_refunded',
  'dispute_won',
]);

/** Payment statuses that do NOT contribute to confirmed totals. */
export const EXCLUDED_PAYMENT_STATUSES: ReadonlySet<GiftFundPaymentStatus> = new Set([
  'pending',
  'processing',
  'failed',
  'expired',
  'refunded',
  'disputed',
  'dispute_lost',
]);

export type GiftFundProcessingStatus = 'received' | 'processed' | 'ignored' | 'failed';

// ── Database row types (mirrors schema) ──

export interface GiftFundAccountRow {
  id: string;
  wedding_id: string;
  user_id: string; // vestigial — NOT the ownership model; RLS uses wedding_id
  stripe_account_id: string | null;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_due: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftFundRow {
  id: string;
  wedding_id: string;
  user_id: string; // vestigial — NOT the ownership model
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
  updated_at: string;
}

export interface GiftFundContributionRow {
  id: string;
  fund_id: string;
  wedding_id: string;
  guest_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  idempotency_key: string;
  contributor_name: string | null;
  contributor_email: string | null;
  message: string | null;
  amount_minor: number;
  currency: string;
  payment_status: string;
  visibility: string;
  refunded_amount_minor: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftFundEventRow {
  id: string;
  contribution_id: string | null;
  stripe_event_id: string;
  event_type: string;
  processing_status: string;
  error_code: string | null;
  created_at: string;
  processed_at: string | null;
}

// ── Application / presentation types ──

export interface GiftFundConnectStatus {
  status: 'not_connected' | 'onboarding' | 'action_required' | 'ready' | 'payouts_paused' | 'error' | 'loading';
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_due: boolean;
}

export interface GiftFundListItem {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  category: GiftFundCategory;
  target_amount_minor: number | null;
  currency: CurrencyCode;
  cover_image_path: string | null;
  is_active: boolean;
  is_public: boolean;
  show_total_raised: boolean;
  show_contributor_names: boolean;
  closes_at: string | null;
  created_at: string;
  raised_amount_minor: number;
  contributor_count: number;
}

export interface GiftFundContributionPublic {
  id: string;
  contributor_name: string | null;
  message: string | null;
  amount_minor: number;
  visibility: GiftFundVisibility;
  paid_at: string | null;
  display_name: string | null;
  display_amount_minor: number | null;
  display_message: string | null;
}

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
  raised_amount_minor: number;
  contributor_count: number;
  recent_contributions: GiftFundContributionPublic[];
}

export interface GiftFundData {
  funds: GiftFundLight[];
  couple_account_ready: boolean;
}

export interface CreateGiftFundInput {
  wedding_id: string;
  title: string;
  description?: string | null;
  category: GiftFundCategory;
  target_amount_minor?: number | null;
  currency?: string;
  cover_image_path?: string | null;
}

export interface UpdateGiftFundInput {
  title?: string;
  description?: string | null;
  category?: GiftFundCategory;
  target_amount_minor?: number | null;
  cover_image_path?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  show_total_raised?: boolean;
  show_contributor_names?: boolean;
  closes_at?: string | null;
}

export interface ContributionFilter {
  fund_id?: string;
  payment_status?: GiftFundPaymentStatus | GiftFundPaymentStatus[];
  visibility?: GiftFundVisibility;
  limit?: number;
  offset?: number;
}

// ── Validation ──

export const GIFT_FUND_TITLE_MAX = 80;
export const GIFT_FUND_DESCRIPTION_MAX = 600;
export const GIFT_FUND_CONTRIBUTION_NAME_MAX = 120;
export const GIFT_FUND_CONTRIBUTION_EMAIL_MAX = 254;
export const GIFT_FUND_CONTRIBUTION_MESSAGE_MAX = 500;
export const GIFT_FUND_CONTRIBUTION_MIN_MAJOR = 1;
export const GIFT_FUND_CONTRIBUTION_MAX_MAJOR = 5000;

export const GIFT_FUND_CONTRIBUTION_MIN_MINOR = 100;  // £1.00
export const GIFT_FUND_CONTRIBUTION_MAX_MINOR = 500000; // £5,000.00

export function validateGiftFundTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < 1) return 'Title is required.';
  if (trimmed.length > GIFT_FUND_TITLE_MAX) return `Title must be ${GIFT_FUND_TITLE_MAX} characters or fewer.`;
  return null;
}

export function validateGiftFundDescription(description: string | null | undefined): string | null {
  if (!description) return null;
  if (description.length > GIFT_FUND_DESCRIPTION_MAX) return `Description must be ${GIFT_FUND_DESCRIPTION_MAX} characters or fewer.`;
  return null;
}

export function validateGiftFundTarget(targetMajor: number | null | undefined): string | null {
  if (targetMajor == null) return null;
  if (targetMajor <= 0) return 'Target must be a positive amount.';
  if (!Number.isFinite(targetMajor)) return 'Target must be a valid number.';
  return null;
}

export function validateContributionAmount(minorAmount: number): string | null {
  if (!Number.isFinite(minorAmount) || minorAmount <= 0) return 'Amount must be a positive number.';
  if (minorAmount < GIFT_FUND_CONTRIBUTION_MIN_MINOR) return `Minimum contribution is £${GIFT_FUND_CONTRIBUTION_MIN_MAJOR}.`;
  if (minorAmount > GIFT_FUND_CONTRIBUTION_MAX_MINOR) return `Maximum contribution is £${GIFT_FUND_CONTRIBUTION_MAX_MAJOR.toLocaleString()}.`;
  return null;
}

export function validateContributorName(name: string | null | undefined): string | null {
  if (!name) return null;
  if (name.length > GIFT_FUND_CONTRIBUTION_NAME_MAX) return `Name must be ${GIFT_FUND_CONTRIBUTION_NAME_MAX} characters or fewer.`;
  return null;
}

export function validateContributorEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  if (email.length > GIFT_FUND_CONTRIBUTION_EMAIL_MAX) return `Email must be ${GIFT_FUND_CONTRIBUTION_EMAIL_MAX} characters or fewer.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  return null;
}

export function validateContributionMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  if (message.length > GIFT_FUND_CONTRIBUTION_MESSAGE_MAX) return `Message must be ${GIFT_FUND_CONTRIBUTION_MESSAGE_MAX} characters or fewer.`;
  return null;
}