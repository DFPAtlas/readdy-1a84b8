import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import type { BillingPlanKey, SubscriptionRecord, BillingInvoice } from '@/types/billing';
import { getPlanConfig, formatPrice } from '@/lib/plans';

export function useSubscription(weddingId: string | null) {
  const { user, isDemoSession } = useAuth();
  const demo = useDemoDataSafe();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoSession || isDemoMode) {
      // Demo mode: return mock subscription
      if (mountedRef.current) {
        const demoSub = demo?.state?.subscription;
        if (demoSub) {
          setSubscription(demoSub as unknown as SubscriptionRecord);
        } else {
          setSubscription({
            id: 'demo-sub-1',
            weddingId: weddingId || 'demo-wedding',
            userId: 'demo-user',
            planKey: 'free',
            status: 'active',
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            billingInterval: 'month',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            trialEnd: null,
            cancelledAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      setLoading(false);
      return;
    }

    if (!weddingId || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: qe } = await supabase
        .from('wedora_subscriptions')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe) throw qe;

      if (data) {
        setSubscription({
          id: data.id,
          weddingId: data.wedding_id,
          userId: data.user_id,
          planKey: data.plan_key || (await inferPlanKey(data.plan_id)),
          status: data.status,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
          billingInterval: data.billing_interval || 'month',
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          trialEnd: data.trial_end,
          cancelledAt: data.cancelled_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        // Check subscription_records as fallback
        const { data: fallback } = await supabase
          .from('subscription_records')
          .select('*')
          .eq('wedding_id', weddingId)
          .maybeSingle();

        if (fallback) {
          setSubscription({
            id: fallback.id,
            weddingId: fallback.wedding_id,
            userId: fallback.user_id,
            planKey: (fallback.plan as BillingPlanKey) || 'free',
            status: fallback.status || 'active',
            stripeCustomerId: fallback.stripe_customer_id,
            stripeSubscriptionId: fallback.stripe_subscription_id,
            billingInterval: 'month',
            currentPeriodStart: fallback.current_period_start,
            currentPeriodEnd: fallback.current_period_end,
            cancelAtPeriodEnd: fallback.cancel_at_period_end ?? false,
            trialEnd: null,
            cancelledAt: null,
            createdAt: fallback.created_at,
            updatedAt: fallback.updated_at,
          });
        } else {
          setSubscription(null);
        }
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId, user, isDemoSession, demo]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const startCheckout = useCallback(async (planKey: BillingPlanKey) => {
    if (!weddingId) throw new Error('No wedding selected');
    if (isDemoSession || isDemoMode) {
      // Demo: simulate checkout redirect
      return { url: `/app/billing?checkout=demo&plan=${planKey}` };
    }

    const { data, error: invokeErr } = await supabase.functions.invoke('create-subscription-checkout', {
      body: { planKey, weddingId, billingInterval: 'month' },
    });

    if (invokeErr) throw invokeErr;
    return data as { url: string; sessionId: string };
  }, [weddingId, isDemoSession]);

  const openBillingPortal = useCallback(async () => {
    if (isDemoSession || isDemoMode) {
      alert('Billing portal is not available in demo mode.');
      return null;
    }

    const { data, error: invokeErr } = await supabase.functions.invoke('create-billing-portal-session', {
      body: {},
    });

    if (invokeErr) throw invokeErr;
    return data as { url: string };
  }, [isDemoSession]);

  const getInvoices = useCallback(async (): Promise<BillingInvoice[]> => {
    if (isDemoSession || isDemoMode) {
      return [
        {
          id: 'inv-demo-1',
          number: 'INV-DEMO-001',
          description: 'Vowora Free — Monthly',
          amountMinor: 0,
          currency: 'gbp',
          status: 'paid',
          invoiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          hostedUrl: null,
          pdfUrl: null,
        },
        {
          id: 'inv-demo-2',
          number: 'INV-DEMO-002',
          description: 'Vowora Free — Monthly',
          amountMinor: 0,
          currency: 'gbp',
          status: 'paid',
          invoiceDate: new Date().toISOString(),
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date().toISOString(),
          hostedUrl: null,
          pdfUrl: null,
        },
      ];
    }
    return [];
  }, [isDemoSession]);

  return {
    subscription,
    loading,
    error,
    fetch,
    startCheckout,
    openBillingPortal,
    getInvoices,
  };
}

async function inferPlanKey(planId: string | null): Promise<BillingPlanKey> {
  if (!planId) return 'free';
  try {
    const { data } = await supabase
      .from('wedora_subscription_plans')
      .select('plan_code')
      .eq('id', planId)
      .maybeSingle();
    return (data?.plan_code as BillingPlanKey) || 'free';
  } catch {
    return 'free';
  }
}

export { getPlanConfig, formatPrice };