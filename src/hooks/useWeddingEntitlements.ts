import { useCallback, useEffect, useState } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { PLAN_LIMITS, FEATURE_PLANS, hasFeature, type EntitlementPlan, type PaidFeature } from '../../supabase/functions/_shared/entitlementConfig';

export interface WeddingEntitlements {
  planKey: EntitlementPlan;
  accessUntil: string | null;
  limits: typeof PLAN_LIMITS[EntitlementPlan];
  features: Record<PaidFeature, boolean>;
  usage: Partial<Record<keyof typeof PLAN_LIMITS.free, number>>;
}
export function useWeddingEntitlements() {
  const { weddingId } = useActiveWedding();
  const { isDemoSession } = useAuth();
  const demo = useDemoDataSafe();
  const [result, setResult] = useState<{ weddingId: string; data: WeddingEntitlements | null; error: string | null } | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (isDemoMode || isDemoSession || !weddingId) return;
    let cancelled = false;
    setResult(previous => previous?.weddingId === weddingId ? previous : null);
    supabase.rpc('get_wedding_entitlements', { p_wedding_id: weddingId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data || !Object.hasOwn(PLAN_LIMITS, data.planKey) || !data.features || !data.usage) {
        setResult({ weddingId, data: null, error: 'Your subscription access could not be checked. Please retry.' });
      } else setResult({ weddingId, data: data as WeddingEntitlements, error: null });
    });
    return () => { cancelled = true; };
  }, [weddingId, isDemoSession, revision]);
  useEffect(() => {
    if (isDemoMode || isDemoSession || !weddingId) return;
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [weddingId, isDemoSession, refresh]);
  const current = result?.weddingId === weddingId ? result : null;
  useEffect(() => {
    if (!current?.data?.accessUntil) return;
    const delay = Date.parse(current.data.accessUntil) - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(refresh, Math.min(delay + 10, 2147483647));
    return () => window.clearTimeout(timer);
  }, [current, refresh]);
  if (isDemoMode || isDemoSession) {
    const candidate = demo?.state?.subscription?.planKey || 'free';
    const planKey: EntitlementPlan = typeof candidate === 'string' && Object.hasOwn(PLAN_LIMITS, candidate) ? candidate as EntitlementPlan : 'free';
    return { data: { planKey, accessUntil: null, limits: PLAN_LIMITS[planKey], usage: {}, features: Object.fromEntries(Object.keys(FEATURE_PLANS).map(f => [f, hasFeature(planKey, f as PaidFeature)])) } as WeddingEntitlements, loading: false, error: null, refresh };
  }
  const expired = current?.data?.planKey !== 'free' && current?.data?.accessUntil && Date.parse(current.data.accessUntil) <= Date.now();
  const data = expired && current?.data ? { ...current.data, planKey: 'free' as const, limits: PLAN_LIMITS.free, features: Object.fromEntries(Object.keys(FEATURE_PLANS).map(f => [f, false])) as Record<PaidFeature, boolean> } : current?.data || null;
  return { data, loading: !!weddingId && !current, error: current?.error || (!weddingId ? 'Select a wedding to check its subscription.' : null), refresh };
}
