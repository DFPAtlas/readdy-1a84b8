import type { BillingPlanKey, PlanConfig, PlanLimits } from '@/types/billing';

// ── Central plan configuration ──
// This is the single source of truth for plan features, limits, and display info.
// Stripe price IDs come from wedora_subscription_plans in the database.
// The frontend NEVER sends raw Stripe price IDs to the backend.

const UNLIMITED = null;

const FREE_LIMITS: PlanLimits = {
  maxGuests: 20,
  maxCollaborators: 1,
  maxAlbums: 2,
  maxCustomSections: 1,
  maxEmailCampaigns: 0,
  maxInvitations: 0,
  galleryStorageMb: 100,
  whiteLabel: false,
  prioritySupport: false,
  seatingPlanner: false,
  budgetTracker: false,
  travelConcierge: false,
  customDomain: false,
  apiAccess: false,
};

const ESSENTIAL_LIMITS: PlanLimits = {
  maxGuests: 80,
  maxCollaborators: 3,
  maxAlbums: 5,
  maxCustomSections: 3,
  maxEmailCampaigns: 5,
  maxInvitations: 80,
  galleryStorageMb: 500,
  whiteLabel: true,
  prioritySupport: false,
  seatingPlanner: false,
  budgetTracker: false,
  travelConcierge: true,
  customDomain: false,
  apiAccess: false,
};

const COMPLETE_LIMITS: PlanLimits = {
  maxGuests: 200,
  maxCollaborators: 10,
  maxAlbums: 15,
  maxCustomSections: 5,
  maxEmailCampaigns: 20,
  maxInvitations: 200,
  galleryStorageMb: 2000,
  whiteLabel: true,
  prioritySupport: false,
  seatingPlanner: true,
  budgetTracker: true,
  travelConcierge: true,
  customDomain: false,
  apiAccess: false,
};

const LUXURY_LIMITS: PlanLimits = {
  maxGuests: UNLIMITED,
  maxCollaborators: UNLIMITED,
  maxAlbums: UNLIMITED,
  maxCustomSections: UNLIMITED,
  maxEmailCampaigns: UNLIMITED,
  maxInvitations: UNLIMITED,
  galleryStorageMb: 10000,
  whiteLabel: true,
  prioritySupport: true,
  seatingPlanner: true,
  budgetTracker: true,
  travelConcierge: true,
  customDomain: true,
  apiAccess: true,
};

// ── Plan definitions ──

export const PLANS: Record<BillingPlanKey, PlanConfig> = {
  free: {
    planKey: 'free',
    name: 'Vowora Free',
    description: 'For couples starting their wedding journey.',
    audience: 'Getting started',
    monthlyPriceMinor: 0,
    currency: 'gbp',
    currencySymbol: '£',
    trialDays: 0,
    features: [
      'Basic wedding page',
      'Up to 20 guests',
      'Simple RSVP collection',
      'Essential wedding details',
      '1 collaborator',
      'Community support',
    ],
    limits: FREE_LIMITS,
    sortOrder: 10,
    isHighlighted: false,
    isActive: true,
    isFree: true,
    stripeProductId: 'prod_UzfkqfqrR2pJCB',
    stripePriceId: 'price_1TzgPME4cxqnm0AFaj5EgIyP',
  },
  essential: {
    planKey: 'essential',
    name: 'Vowora Essential',
    description: 'For couples who want more guest features.',
    audience: 'Growing guest list',
    monthlyPriceMinor: 900,
    currency: 'gbp',
    currencySymbol: '£',
    trialDays: 14,
    features: [
      'Up to 80 guests',
      'Custom wedding page',
      'Full RSVP collection',
      'Digital invitations',
      'Email updates',
      'Travel guide',
      'Gallery uploads',
      'Remove Vowora branding',
      'Up to 3 collaborators',
    ],
    limits: ESSENTIAL_LIMITS,
    sortOrder: 20,
    isHighlighted: false,
    isActive: true,
    isFree: false,
    stripeProductId: 'prod_UzfkGsFj56zv5i',
    stripePriceId: 'price_1TzgPQE4cxqnm0AFsoIH0U6F',
  },
  complete: {
    planKey: 'complete',
    name: 'Vowora Complete',
    description: 'Everything you need to plan in detail.',
    audience: 'Full planning',
    monthlyPriceMinor: 1900,
    currency: 'gbp',
    currencySymbol: '£',
    trialDays: 14,
    features: [
      'Up to 200 guests',
      'Full guest management',
      'Planning tools',
      'Supplier management',
      'Budget tracker',
      'Seating planner',
      'Enhanced travel features',
      'Up to 10 collaborators',
      'Email campaigns',
      'Priority support',
    ],
    limits: COMPLETE_LIMITS,
    sortOrder: 30,
    isHighlighted: true,
    isActive: true,
    isFree: false,
    stripeProductId: 'prod_UzflmaXuXsPgbo',
    stripePriceId: 'price_1TzgPUE4cxqnm0AFF7rtNLeZ',
  },
  luxury: {
    planKey: 'luxury',
    name: 'Vowora Luxury',
    description: 'For couples who want the full experience.',
    audience: 'Everything included',
    monthlyPriceMinor: 3900,
    currency: 'gbp',
    currencySymbol: '£',
    trialDays: 14,
    features: [
      'Unlimited guests',
      'Premium designs',
      'Planner access',
      'Priority support',
      'Advanced communications',
      'Wedding-day tools',
      'Unlimited collaborators',
      'Custom domain',
      'API access',
      'Dedicated support',
    ],
    limits: LUXURY_LIMITS,
    sortOrder: 40,
    isHighlighted: false,
    isActive: true,
    isFree: false,
    stripeProductId: 'prod_Uzfl8nDffjo3Oq',
    stripePriceId: 'price_1TzgPfE4cxqnm0AF0D05t1dQ',
  },
};

// ── Helpers ──

export function getPlanConfig(planKey: BillingPlanKey): PlanConfig {
  return PLANS[planKey];
}

export function getActivePlans(): PlanConfig[] {
  return Object.values(PLANS)
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatPrice(minorAmount: number, currency: string): string {
  const symbols: Record<string, string> = { gbp: '£', usd: '$', eur: '€' };
  const sym = symbols[currency.toLowerCase()] || currency;
  const major = (minorAmount / 100).toFixed(2);
  if (minorAmount === 0) return 'Free';
  return `${sym}${major.replace('.00', '')}`;
}

export function getPlanSortOrder(planKey: BillingPlanKey): number {
  const order: Record<BillingPlanKey, number> = {
    free: 0,
    essential: 1,
    complete: 2,
    luxury: 3,
  };
  return order[planKey] ?? 99;
}

export function isUpgrade(from: BillingPlanKey, to: BillingPlanKey): boolean {
  return getPlanSortOrder(to) > getPlanSortOrder(from);
}

export function isDowngrade(from: BillingPlanKey, to: BillingPlanKey): boolean {
  return getPlanSortOrder(to) < getPlanSortOrder(from);
}

export function getComparisonFeatures(): { feature: string; values: Record<BillingPlanKey, string> }[] {
  return [
    { feature: 'Guest limit', values: { free: '20', essential: '80', complete: '200', luxury: 'Unlimited' } },
    { feature: 'Wedding page', values: { free: 'Basic', essential: 'Custom', complete: 'Custom', luxury: 'Premium' } },
    { feature: 'RSVP collection', values: { free: 'Basic', essential: 'Full', complete: 'Full', luxury: 'Full' } },
    { feature: 'Invitations', values: { free: '—', essential: '✓', complete: '✓', luxury: '✓' } },
    { feature: 'Email updates', values: { free: '—', essential: '✓', complete: '✓', luxury: '✓' } },
    { feature: 'Travel guide', values: { free: '—', essential: '✓', complete: '✓', luxury: '✓' } },
    { feature: 'Planning tools', values: { free: '—', essential: '—', complete: '✓', luxury: '✓' } },
    { feature: 'Supplier management', values: { free: '—', essential: '—', complete: '✓', luxury: '✓' } },
    { feature: 'Budget tracker', values: { free: '—', essential: '—', complete: '✓', luxury: '✓' } },
    { feature: 'Seating planner', values: { free: '—', essential: '—', complete: '✓', luxury: '✓' } },
    { feature: 'Collaborators', values: { free: '1', essential: '3', complete: '10', luxury: 'Unlimited' } },
    { feature: 'Wedding-day tools', values: { free: '—', essential: '—', complete: '—', luxury: '✓' } },
    { feature: 'Priority support', values: { free: '—', essential: '—', complete: '✓', luxury: '✓' } },
    { feature: 'Custom domain', values: { free: '—', essential: '—', complete: '—', luxury: '✓' } },
    { feature: 'Vowora branding', values: { free: 'On', essential: 'Off', complete: 'Off', luxury: 'Off' } },
  ];
}