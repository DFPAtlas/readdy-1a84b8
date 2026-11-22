import { useCallback, useEffect, useState } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { PLAN_LIMITS, FEATURE_PLANS, hasFeature, type EntitlementPlan, type PaidFeature } from '@/lib/entitlementConfig';

export interface WeddingEntitlements {
  planKey: EntitlementPlan;
  accessUntil: string | null;
  limits: typeof PLAN_LIMITS[EntitlementPlan];
  features: Record<PaidFeature, boolean>;
  usage: Partial<Record<keyof typeof PLAN_LIMITS.free, number>>;
}
type EntitlementResult = { weddingId: string; userId: string; data: WeddingEntitlements | null; error: string | null };

// Last result per wedding + user, shared across mounts. Paid pages render
// straight away on later navigations (no "Checking your subscription…" flash)
// while the check still re-runs in the background, as before.
const lastResults = new Map<string, EntitlementResult>();
const cacheKey = (weddingId: string | null | undefined, userId: string | null | undefined) =>
  weddingId && userId ? `${weddingId}:${userId}` : '';

export function useWeddingEntitlements() {
  const { weddingId, loading: weddingLoading } = useActiveWedding();
  const { isDemoSession, user } = useAuth();
  const demo = useDemoDataSafe();
  const [result, setResultState] = useState<EntitlementResult | null>(() => lastResults.get(cacheKey(weddingId, user?.id)) ?? null);
  const setResult = useCallback((next: EntitlementResult | null | ((previous: EntitlementResult | null) => EntitlementResult | null)) => {
    setResultState((previous) => {
      const value = typeof next === 'function' ? next(previous) : next;
      if (value && !value.error) lastResults.set(cacheKey(value.weddingId, value.userId), value);
      return value;
    });
  }, []);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (isDemoMode || isDemoSession || !weddingId || !user?.id) return;
    let cancelled = false;
    setResult(previous => previous?.weddingId === weddingId && previous?.userId === user.id ? previous : lastResults.get(cacheKey(weddingId, user.id)) ?? null);
    supabase.rpc('get_wedding_entitlements', { p_wedding_id: weddingId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data || !Object.hasOwn(PLAN_LIMITS, data.planKey) || !data.features || !data.usage) {
        setResult({ weddingId, userId: user.id, data: null, error: 'Your subscription access could not be checked. Please retry.' });
      } else setResult({ weddingId, userId: user.id, data: data as WeddingEntitlements, error: null });
    });
    return () => { cancelled = true; };
  }, [weddingId, user?.id, isDemoSession, revision, setResult]);
  useEffect(() => {
    if (isDemoMode || isDemoSession || !weddingId) return;
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [weddingId, isDemoSession, refresh]);
  const current = result?.weddingId === weddingId && result?.userId === user?.id ? result : null;
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
  // While the active wedding is still resolving, report loading rather than the
  // "select a wedding" error, so paying customers never see a paywall flash.
  const resolvingWedding = !weddingId && weddingLoading;
  return { data, loading: resolvingWedding || (!!weddingId && !current), error: current?.error || (!weddingId && !resolvingWedding ? 'Select a wedding to check its subscription.' : null), refresh };
}
