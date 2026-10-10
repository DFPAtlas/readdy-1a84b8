import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { ONBOARDING_STEPS, computeProgress, getNextRecommendedStep } from '@/lib/onboardingSteps';
import type { OnboardingStep, StepKey } from '@/lib/onboardingSteps';

export interface OnboardingProgress {
  loading: boolean;
  error?: string;
  completed: number;
  total: number;
  percentage: number;
  steps: (OnboardingStep & { completed: boolean })[];
  nextStep: (OnboardingStep & { completed: boolean }) | null;
  isComplete: boolean;
}

export function useOnboardingProgress(): OnboardingProgress {
  const demoData = useDemoDataSafe();
  const { weddingId, activeWedding, loading: weddingLoading } = useActiveWedding();
  const [completion, setCompletion] = useState<Partial<Record<StepKey, boolean>>>({});
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setCompletion({}); setError(''); setChecking(false);
    if (isDemoMode || !weddingId) return;
    async function load() {
      setChecking(true);
      const tables = ['wedding_events', 'guests', 'invitations', 'wedding_local_places', 'wedding_suppliers', 'wedding_budgets', 'seating_assignments', 'gift_funds', 'gallery_albums', 'wedding_member_invitations', 'guest_access_sessions'];
      const results = await Promise.all(tables.map(table => supabase.from(table).select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId)));
      const [wedding, portal, website, ceremony] = await Promise.all([
        supabase.from('weddings').select('title, partner_one_name, partner_two_name, location, wedding_date, timezone, status').eq('id', weddingId).single(),
        supabase.from('guest_portal_settings').select('rsvp_enabled, portal_enabled').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('wedding_website_configs').select('status').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('wedding_events').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('event_type', 'ceremony').not('start_at', 'is', null),
      ]);
      if (cancelled) return;
      const failed = results.some(result => result.error) || wedding.error || portal.error || website.error || ceremony.error;
      setError(failed ? 'Some setup checks could not be loaded. Refresh to retry; your saved wedding data is unchanged.' : '');
      const has = (table: string) => !results[tables.indexOf(table)].error && (results[tables.indexOf(table)].count || 0) > 0;
      const w = wedding.data;
      setCompletion({
        'wedding-details': Boolean(w?.title && w.partner_one_name && w.partner_two_name),
        'wedding-date': Boolean(w?.wedding_date && w.timezone),
        'ceremony-event': !ceremony.error && (ceremony.count || 0) > 0, 'add-guests': has('guests'),
        'create-invitation': has('invitations'), 'configure-rsvp': portal.data?.rsvp_enabled === true,
        'travel-info': has('wedding_local_places'), 'wedding-website': website.data?.status === 'published',
        'add-suppliers': has('wedding_suppliers'), 'create-budget': has('wedding_budgets'),
        'start-seating': has('seating_assignments'), 'configure-registry': has('gift_funds'),
        'configure-gallery': has('gallery_albums'), 'invite-collaborator': has('wedding_member_invitations'),
        'review-guest-portal': has('guest_access_sessions'), 'publish-experience': website.data?.status === 'published' && portal.data?.portal_enabled === true,
      }); setChecking(false);
    }
    load().catch(() => { if (!cancelled) { setError('Setup checks could not be loaded. Refresh to retry.'); setChecking(false); } });
    return () => { cancelled = true; };
  }, [weddingId]);

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

    const steps = ONBOARDING_STEPS.map(step => ({ ...step,
      route: step.key === 'review-guest-portal' ? '/app/invitations' : step.key === 'publish-experience' ? `/w/${activeWedding?.slug || ''}` : step.key === 'configure-rsvp' ? '/app/rsvp-settings' : step.route,
      completed: completion[step.key] === true,
    }));
    const completed = steps.filter(step => step.completed).length;
    return { loading: weddingLoading || checking, error, completed, total: steps.length,
      percentage: Math.round(completed / steps.length * 100), steps,
      nextStep: steps.find(step => step.required && !step.completed) || steps.find(step => !step.completed) || null,
      isComplete: steps.filter(step => step.required).every(step => step.completed),
    };
  }, [demoData, weddingLoading, checking, completion, error, activeWedding?.slug]);
}

export type { OnboardingStep, StepKey };