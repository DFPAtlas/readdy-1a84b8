import type { BillingPlanKey, PlanLimits, UsageSummary } from '@/types/billing';
import { getPlanConfig } from '@/lib/plans';

export interface Entitlements {
  currentPlan: BillingPlanKey;
  isPlanAtLeast: (target: BillingPlanKey) => boolean;
  getLimit: <K extends keyof PlanLimits>(key: K) => number | null;
  isUnlimited: <K extends keyof PlanLimits>(key: K) => boolean;
  getUsageSummaries: (usage: Partial<Record<keyof PlanLimits, number>>) => UsageSummary[];
  canUpgradeTo: (target: BillingPlanKey) => boolean;
  canDowngradeTo: (target: BillingPlanKey) => boolean;
  isOverLimit: <K extends keyof PlanLimits>(key: K, currentValue: number) => boolean;
  limits: PlanLimits;
}

const PLAN_ORDER: Record<BillingPlanKey, number> = {
  free: 0,
  essential: 1,
  complete: 2,
  luxury: 3,
};

export function useEntitlements(currentPlan: BillingPlanKey): Entitlements {
  const plan = getPlanConfig(currentPlan);
  const currentOrder = PLAN_ORDER[currentPlan];

  const isPlanAtLeast = (target: BillingPlanKey): boolean => {
    return currentOrder >= PLAN_ORDER[target];
  };

  const getLimit = <K extends keyof PlanLimits>(key: K): number | null => {
    return plan.limits[key] as number | null;
  };

  const isUnlimited = <K extends keyof PlanLimits>(key: K): boolean => {
    return plan.limits[key] === null;
  };

  const isOverLimit = <K extends keyof PlanLimits>(key: K, currentValue: number): boolean => {
    const limit = plan.limits[key];
    if (limit === null) return false;
    return currentValue > limit;
  };

  const canUpgradeTo = (target: BillingPlanKey): boolean => {
    return PLAN_ORDER[target] > currentOrder;
  };

  const canDowngradeTo = (target: BillingPlanKey): boolean => {
    return PLAN_ORDER[target] < currentOrder;
  };

  const getUsageSummaries = (usage: Partial<Record<keyof PlanLimits, number>>): UsageSummary[] => {
    const labelMap: Record<string, string> = {
      maxGuests: 'Guests',
      maxCollaborators: 'Collaborators',
      maxAlbums: 'Albums',
      maxCustomSections: 'Custom sections',
      maxEmailCampaigns: 'Email campaigns',
      maxInvitations: 'Invitations',
      galleryStorageMb: 'Gallery storage',
    };

    const unitMap: Record<string, string> = {
      maxGuests: 'guests',
      maxCollaborators: 'members',
      maxAlbums: 'albums',
      maxCustomSections: 'sections',
      maxEmailCampaigns: 'campaigns',
      maxInvitations: 'invitations',
      galleryStorageMb: 'MB',
    };

    return Object.entries(labelMap).map(([key, label]) => {
      const limit = plan.limits[key as keyof PlanLimits] as number | null;
      const used = usage[key as keyof PlanLimits] || 0;
      const isUnlimited = limit === null;
      const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / (limit || 1)) * 100));

      return {
        featureName: label,
        used,
        limit,
        isUnlimited,
        percentage,
        unit: unitMap[key] || '',
      };
    });
  };

  return {
    currentPlan,
    isPlanAtLeast,
    getLimit,
    isUnlimited,
    getUsageSummaries,
    canUpgradeTo,
    canDowngradeTo,
    isOverLimit,
    limits: plan.limits,
  };
}