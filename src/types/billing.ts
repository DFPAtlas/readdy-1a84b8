// ── Billing Types for Vowora ──

export type BillingPlanKey = 'free' | 'essential' | 'complete' | 'luxury';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

export type BillingInterval = 'month' | 'year';

export interface PlanConfig {
  planKey: BillingPlanKey;
  name: string;
  description: string;
  audience: string;
  monthlyPriceMinor: number;
  currency: string;
  currencySymbol: string;
  trialDays: number;
  features: string[];
  limits: PlanLimits;
  sortOrder: number;
  isHighlighted: boolean;
  isActive: boolean;
  isFree: boolean;
  stripeProductId: string;
  stripePriceId: string;
}

export interface PlanLimits {
  maxGuests: number | null;
  maxCollaborators: number | null;
  maxAlbums: number | null;
  maxCustomSections: number | null;
  maxEmailCampaigns: number | null;
  maxInvitations: number | null;
  galleryStorageMb: number | null;
  whiteLabel: boolean;
  prioritySupport: boolean;
  seatingPlanner: boolean;
  budgetTracker: boolean;
  travelConcierge: boolean;
  customDomain: boolean;
  apiAccess: boolean;
}

export interface PlanInfo {
  planKey: BillingPlanKey;
  name: string;
  description: string;
  monthlyPriceMinor: number;
  currency: string;
  currencySymbol: string;
  trialDays: number;
  sortOrder: number;
  isHighlighted: boolean;
  isActive: boolean;
  isFree: boolean;
}

export interface SubscriptionRecord {
  id: string;
  weddingId: string;
  userId: string;
  planKey: BillingPlanKey;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingInterval: BillingInterval;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  number: string;
  description: string;
  amountMinor: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

export interface CheckoutReviewData {
  planKey: BillingPlanKey;
  planName: string;
  billingInterval: BillingInterval;
  price: number;
  currency: string;
  currencySymbol: string;
  features: string[];
  limits: PlanLimits;
  trialDays: number;
}

export interface UsageSummary {
  featureName: string;
  used: number;
  limit: number | null;
  isUnlimited: boolean;
  percentage: number;
  unit: string;
}