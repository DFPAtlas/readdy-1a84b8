import { useMemo } from 'react';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { ONBOARDING_STEPS, computeProgress, getNextRecommendedStep } from '@/lib/onboardingSteps';
import type { OnboardingStep, StepKey } from '@/lib/onboardingSteps';

export interface OnboardingProgress {
  loading: boolean;
  completed: number;
  total: number;
  percentage: number;
  steps: (OnboardingStep & { completed: boolean })[];
  nextStep: (OnboardingStep & { completed: boolean }) | null;
  isComplete: boolean;
}

export function useOnboardingProgress(): OnboardingProgress {
  const demoData = useDemoDataSafe();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  return useMemo(() => {
    if (isDemoMode) {
      if (!demoData) {
        return {
          loading: true,
          completed: 0,
          total: ONBOARDING_STEPS.length,
          percentage: 0,
          steps: ONBOARDING_STEPS.map((s) => ({ ...s, completed: false })),
          nextStep: null,
          isComplete: false,
        };
      }
      const state = demoData.state;
      const result = computeProgress(state);
      return {
        loading: false,
        completed: result.completed,
        total: result.total,
        percentage: result.percentage,
        steps: result.steps,
        nextStep: getNextRecommendedStep(state),
        isComplete: result.steps.filter((s) => s.required).every((s) => s.completed),
      };
    }

    // Production mode — placeholder until Supabase checks are wired
    const isProductionLoading = weddingLoading;
    return {
      loading: isProductionLoading,
      completed: 0,
      total: ONBOARDING_STEPS.length,
      percentage: 0,
      steps: ONBOARDING_STEPS.map((s) => ({ ...s, completed: false })),
      nextStep: ONBOARDING_STEPS.map((s) => ({ ...s, completed: false })).find((s) => s.required) || null,
      isComplete: false,
    };
  }, [demoData, demoData?.state, weddingLoading]);
}

export type { OnboardingStep, StepKey };