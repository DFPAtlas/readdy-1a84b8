import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useAuth } from '@/context/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getActivePlans, formatPrice, getComparisonFeatures, isUpgrade } from '@/lib/plans';
import type { BillingPlanKey, BillingInvoice, UsageSummary } from '@/types/billing';
import type { PlanConfig } from '@/types/billing';

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
    trialing: { label: 'Trial', className: 'bg-accent-100 text-accent-700' },
    past_due: { label: 'Past due', className: 'bg-red-100 text-red-700' },
    unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', className: 'bg-secondary-100 text-secondary-600' },
    incomplete: { label: 'Incomplete', className: 'bg-amber-100 text-amber-700' },
    incomplete_expired: { label: 'Expired', className: 'bg-secondary-100 text-secondary-600' },
    paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
  };
  const item = map[status] || { label: status, className: 'bg-secondary-100 text-secondary-600' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-label font-semibold whitespace-nowrap ${item.className}`}>
      {item.label}
    </span>
  );
}

// ── Skeleton ──
function BillingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse space-y-8">
      <div>
        <div className="h-4 w-32 rounded bg-secondary-200 mb-2" />
        <div className="h-8 w-64 rounded bg-secondary-200 mb-1" />
        <div className="h-4 w-80 rounded bg-secondary-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
            <div className="h-3 w-24 rounded bg-secondary-200 mb-3" />
            <div className="h-7 w-20 rounded bg-secondary-200" />
          </div>
        ))}
      </div>
      <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6">
        <div className="h-5 w-40 rounded bg-secondary-200 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 w-full rounded bg-secondary-100" />)}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function BillingPage() {
  const { weddingId } = useActiveWedding();
  const { user, isDemoSession } = useAuth();
  const demo = useDemoDataSafe();
  const [searchParams, setSearchParams] = useSearchParams();

  const { subscription, loading, error, fetch, startCheckout, openBillingPortal, getInvoices } = useSubscription(weddingId);
  const currentPlanKey = subscription?.planKey || 'free';
  const entitlements = useEntitlements(currentPlanKey);

  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'subscription' | 'plans' | 'usage' | 'history'>('subscription');
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState<BillingPlanKey | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle checkout return
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      fetch();
      setToast({ type: 'success', message: 'Your subscription is being activated. This may take a moment.' });
      // Clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('session_id');
      newParams.delete('plan');
      setSearchParams(newParams, { replace: true });
    } else if (checkoutStatus === 'cancelled') {
      setToast({ type: 'error', message: 'Checkout was cancelled. No changes were made.' });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('plan');
      setSearchParams(newParams, { replace: true });
    } else if (checkoutStatus === 'demo') {
      const planKey = searchParams.get('plan') as BillingPlanKey;
      if (planKey && demo) {
        // Demo: simulate subscription change
        demo.updateSubscription?.({ planKey, status: 'active' });
        fetch();
        setToast({ type: 'success', message: `Demo: Switched to ${planKey} plan` });
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('plan');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  // Load invoices
  useEffect(() => {
    let cancelled = false;
    setInvoicesLoading(true);
    getInvoices().then((data) => {
      if (!cancelled) {
        setInvoices(data);
        setInvoicesLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setInvoicesLoading(false);
    });
    return () => { cancelled = true; };
  }, [getInvoices]);

  const handleCheckout = useCallback(async (planKey: BillingPlanKey) => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    setShowUpgradeConfirm(null);
    try {
      const result = await startCheckout(planKey);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  }, [startCheckout]);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const result = await openBillingPortal();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }, [openBillingPortal]);

  const plans = useMemo(() => getActivePlans(), []);
  const comparisonRows = useMemo(() => getComparisonFeatures(), []);
  const currentPlan = plans.find((p) => p.planKey === currentPlanKey);
  const isPaidPlan = currentPlanKey !== 'free';

  // Sample usage for demo
  const sampleUsage: Partial<Record<string, number>> = {
    maxGuests: currentPlanKey === 'free' ? 18 : 45,
    maxCollaborators: 1,
    maxAlbums: 2,
    maxCustomSections: 0,
    maxEmailCampaigns: 0,
  };
  const usageSummaries = entitlements.getUsageSummaries(sampleUsage);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (loading) return <BillingSkeleton />;

  const isDemo = isDemoSession || isDemoMode;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 max-w-sm px-5 py-3 rounded-xl border shadow-lg text-sm font-label ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <i className={`${toast.type === 'success' ? 'ri-check-line text-emerald-600' : 'ri-error-warning-line text-red-600'} text-base`} />
              {toast.message}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-2">
          <span className="text-xs text-foreground-400 font-label tracking-wider uppercase">Account</span>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mt-1">Plans &amp; Billing</h1>
          <p className="text-sm text-foreground-500 mt-1.5 max-w-2xl">
            Manage your subscription, view plan details, and access billing history.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetch} className="text-xs text-red-600 hover:underline cursor-pointer whitespace-nowrap">Retry</button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
            <span className="text-xs text-foreground-400 font-label">Current plan</span>
            <p className="text-lg font-heading font-semibold text-foreground-900 mt-1">{currentPlan?.name || currentPlanKey}</p>
            {subscription && <StatusBadge status={subscription.status} />}
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
            <span className="text-xs text-foreground-400 font-label">Billing</span>
            <p className="text-lg font-heading font-semibold text-foreground-900 mt-1">
              {currentPlan?.isFree ? 'Free' : formatPrice(currentPlan?.monthlyPriceMinor || 0, currentPlan?.currency || 'gbp')}
              <span className="text-sm font-label text-foreground-500">/mo</span>
            </p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
            <span className="text-xs text-foreground-400 font-label">
              {subscription?.cancelAtPeriodEnd ? 'Ends' : subscription?.status === 'cancelled' ? 'Ended' : 'Next billing'}
            </span>
            <p className="text-lg font-heading font-semibold text-foreground-900 mt-1">
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : currentPlan?.isFree ? 'Never' : '—'}
            </p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
            <span className="text-xs text-foreground-400 font-label">Payment method</span>
            <p className="text-sm font-label text-foreground-700 mt-1">
              {isPaidPlan && !isDemo ? 'Stripe' : isDemo ? 'Demo' : 'None'}
            </p>
            {isPaidPlan && !isDemo && (
              <button onClick={handlePortal} disabled={portalLoading} className="text-xs text-primary-600 hover:underline mt-1 cursor-pointer whitespace-nowrap">
                {portalLoading ? 'Opening...' : 'Manage in Stripe'}
              </button>
            )}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-secondary-200 pb-0 overflow-x-auto">
          {(['subscription', 'plans', 'usage', 'history'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2.5 text-sm font-label whitespace-nowrap transition-colors cursor-pointer rounded-t-lg ${
                activeSection === s
                  ? 'bg-background-50 border border-secondary-200 border-b-background-50 text-foreground-900 font-semibold -mb-px relative'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {s === 'subscription' && 'Subscription'}
              {s === 'plans' && 'Compare plans'}
              {s === 'usage' && 'Usage & limits'}
              {s === 'history' && 'Billing history'}
            </button>
          ))}
        </div>

        {/* ── SUBSCRIPTION SECTION ── */}
        {activeSection === 'subscription' && (
          <div className="space-y-6">
            {/* Current plan detail */}
            <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">
                Current subscription
                {isDemo && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-medium">Demo</span>}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs text-foreground-400 font-label">Plan</span>
                  <p className="text-sm font-label font-semibold text-foreground-900">{currentPlan?.name || 'Free'}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-400 font-label">Status</span>
                  <div className="mt-0.5">{subscription && <StatusBadge status={subscription.status} />}</div>
                </div>
                {subscription?.currentPeriodStart && (
                  <div>
                    <span className="text-xs text-foreground-400 font-label">Current period</span>
                    <p className="text-sm text-foreground-700">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} —{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                )}
                {subscription?.trialEnd && (
                  <div>
                    <span className="text-xs text-foreground-400 font-label">Trial ends</span>
                    <p className="text-sm text-foreground-700">{new Date(subscription.trialEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2">
                    <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                      <i className="ri-alert-line mr-2" />
                      Your subscription will end on{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'the end of the current period'}.
                      After this date, you will be moved to the Free plan.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {currentPlanKey !== 'luxury' && (
                  <button
                    onClick={() => setActiveSection('plans')}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {currentPlanKey === 'free' ? 'Upgrade plan' : 'Change plan'}
                  </button>
                )}
                {isPaidPlan && !isDemo && (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="px-4 py-2 rounded-lg border border-secondary-200 text-foreground-700 text-sm font-label font-semibold hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {portalLoading ? 'Opening...' : 'Manage billing'}
                  </button>
                )}
                {portalError && <p className="text-xs text-red-600">{portalError}</p>}
                {isPaidPlan && !subscription?.cancelAtPeriodEnd && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 rounded-lg text-sm font-label text-red-600 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>

            {/* Features */}
            {currentPlan && (
              <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6">
                <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Included features</h2>
                <ul className="space-y-2">
                  {currentPlan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground-700">
                      <i className="ri-check-line text-emerald-500 text-sm" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── PLANS COMPARISON ── */}
        {activeSection === 'plans' && (
          <div className="space-y-6">
            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.planKey === currentPlanKey;
                const canUpgrade = entitlements.canUpgradeTo(plan.planKey);
                const canDowngrade = entitlements.canDowngradeTo(plan.planKey);
                const isUpgradeAction = canUpgrade && !isCurrent;

                return (
                  <div
                    key={plan.planKey}
                    className={`bg-background-50 relative flex flex-col rounded-xl border-2 p-5 ${
                      plan.isHighlighted ? 'border-primary-300 ring-1 ring-primary-200' :
                      isCurrent ? 'border-emerald-300 bg-emerald-50/30' : 'border-secondary-200'
                    }`}
                  >
                    {plan.isHighlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-primary-500 text-white text-[10px] font-label font-semibold whitespace-nowrap">
                        Most popular
                      </span>
                    )}
                    <h3 className="font-heading text-lg text-foreground-900">{plan.name}</h3>
                    <p className="text-xs text-foreground-500 mt-1">{plan.description}</p>

                    <div className="mt-4 mb-1">
                      <span className="font-heading text-3xl text-foreground-900">
                        {plan.isFree ? 'Free' : formatPrice(plan.monthlyPriceMinor, plan.currency)}
                      </span>
                      {!plan.isFree && (
                        <span className="text-sm text-foreground-500 font-label">/mo</span>
                      )}
                    </div>
                    {plan.trialDays > 0 && !isCurrent && (
                      <p className="text-xs text-accent-700 font-label mb-2">{plan.trialDays}-day free trial</p>
                    )}

                    <ul className="mt-3 space-y-1.5 flex-1">
                      {plan.features.slice(0, 7).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <i className="ri-check-line text-emerald-500 text-xs mt-0.5 flex-shrink-0" />
                          <span className="text-foreground-600">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-label font-semibold cursor-default whitespace-nowrap"
                        >
                          Current plan
                        </button>
                      ) : isUpgradeAction ? (
                        <button
                          onClick={() => setShowUpgradeConfirm(plan.planKey)}
                          className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {canDowngrade ? 'Downgrade' : 'Upgrade'}
                        </button>
                      ) : canDowngrade ? (
                        <button
                          onClick={() => setShowUpgradeConfirm(plan.planKey)}
                          className="w-full py-2.5 rounded-lg border border-secondary-200 text-foreground-700 text-sm font-label font-semibold hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Downgrade
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg bg-secondary-100 text-foreground-400 text-sm font-label cursor-default whitespace-nowrap"
                        >
                          Current plan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6 overflow-x-auto">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Feature comparison</h2>
              <table className="w-full text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-2.5 px-3 font-label text-foreground-700 text-xs">Feature</th>
                    <th className="text-center py-2.5 px-3 font-label text-foreground-700 text-xs">Free</th>
                    <th className="text-center py-2.5 px-3 font-label text-foreground-700 text-xs">Essential</th>
                    <th className="text-center py-2.5 px-3 font-label text-primary-700 bg-primary-50/50 text-xs">Complete</th>
                    <th className="text-center py-2.5 px-3 font-label text-foreground-700 text-xs">Luxury</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-secondary-100">
                      <td className="py-2.5 px-3 text-xs font-label text-foreground-800">{row.feature}</td>
                      <td className="text-center py-2.5 px-3 text-xs text-foreground-600">{row.values.free}</td>
                      <td className="text-center py-2.5 px-3 text-xs text-foreground-600">{row.values.essential}</td>
                      <td className="text-center py-2.5 px-3 text-xs text-primary-700 bg-primary-50/30">{row.values.complete}</td>
                      <td className="text-center py-2.5 px-3 text-xs text-foreground-600">{row.values.luxury}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USAGE & LIMITS ── */}
        {activeSection === 'usage' && (
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Usage &amp; limits</h2>
            {currentPlan?.isFree && (
              <div className="px-4 py-3 rounded-lg bg-accent-50 border border-accent-100 text-sm text-accent-800 mb-5">
                <i className="ri-information-line mr-2" />
                You&rsquo;re on the Free plan. Upgrade to unlock more capacity for guests, albums, email campaigns, and more.
              </div>
            )}
            <div className="space-y-4">
              {usageSummaries.map((item) => (
                <div key={item.featureName}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-label text-foreground-700">{item.featureName}</span>
                    <span className="text-xs text-foreground-500">
                      {item.isUnlimited
                        ? `${item.used} / Unlimited`
                        : `${item.used} / ${item.limit} ${item.unit}`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.percentage >= 90 ? 'bg-red-500' :
                        item.percentage >= 70 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${item.isUnlimited ? 0 : Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  {item.percentage >= 90 && !item.isUnlimited && (
                    <p className="text-xs text-red-600 mt-1">Near limit — consider upgrading</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BILLING HISTORY ── */}
        {activeSection === 'history' && (
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Billing history</h2>
            {invoicesLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-secondary-100" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                  <i className="ri-file-list-3-line text-xl text-foreground-400" />
                </div>
                <p className="text-sm text-foreground-600 font-label">No invoices yet</p>
                <p className="text-xs text-foreground-400 mt-1">Billing history appears here once you have paid invoices.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2.5 px-3 font-label text-xs text-foreground-700">Invoice</th>
                      <th className="text-left py-2.5 px-3 font-label text-xs text-foreground-700">Date</th>
                      <th className="text-left py-2.5 px-3 font-label text-xs text-foreground-700">Amount</th>
                      <th className="text-left py-2.5 px-3 font-label text-xs text-foreground-700">Status</th>
                      <th className="text-right py-2.5 px-3 font-label text-xs text-foreground-700">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-secondary-100">
                        <td className="py-3 px-3 text-xs text-foreground-800">{inv.number}</td>
                        <td className="py-3 px-3 text-xs text-foreground-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-xs text-foreground-700">{formatPrice(inv.amountMinor, inv.currency)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold whitespace-nowrap ${
                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            inv.status === 'open' ? 'bg-amber-100 text-amber-700' :
                            'bg-secondary-100 text-secondary-600'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {inv.hostedUrl ? (
                            <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline cursor-pointer whitespace-nowrap">
                              View
                            </a>
                          ) : inv.pdfUrl ? (
                            <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline cursor-pointer whitespace-nowrap">
                              Download
                            </a>
                          ) : (
                            <span className="text-xs text-foreground-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-foreground-500">
              <i className="ri-information-line" />
              <span>
                {isDemo
                  ? 'Demo invoices shown. Real invoices appear here in production.'
                  : isPaidPlan
                    ? 'View and download invoices from your Stripe billing portal.'
                    : 'No paid invoices yet.'}
              </span>
            </div>
          </div>
        )}

        {/* ── UPGRADE CONFIRMATION MODAL ── */}
        {showUpgradeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpgradeConfirm(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <i className="ri-arrow-up-circle-line text-lg text-primary-600" />
                </div>
                <div>
                  <h3 className="font-label text-sm font-semibold text-foreground-900">
                    {isUpgrade(currentPlanKey, showUpgradeConfirm) ? 'Upgrade' : 'Change'} to {plans.find((p) => p.planKey === showUpgradeConfirm)?.name}?
                  </h3>
                  <p className="text-xs text-foreground-500">Review your plan change</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">Current plan</span>
                  <span className="text-foreground-900 font-label">{currentPlan?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">New plan</span>
                  <span className="text-foreground-900 font-label">{plans.find((p) => p.planKey === showUpgradeConfirm)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">Billing</span>
                  <span className="text-foreground-900 font-label">
                    {formatPrice(plans.find((p) => p.planKey === showUpgradeConfirm)?.monthlyPriceMinor || 0,
                      plans.find((p) => p.planKey === showUpgradeConfirm)?.currency || 'gbp')}/mo
                  </span>
                </div>
                {isDemo && (
                  <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                    Demo mode — this simulates a plan change. No real payment is made.
                  </div>
                )}
                {!isDemo && (
                  <p className="text-xs text-foreground-500">
                    You will be redirected to Stripe to complete this change securely.
                    {isUpgrade(currentPlanKey, showUpgradeConfirm)
                      ? ' Your new features will be available immediately after payment.'
                      : ' Changes take effect at the end of your current billing period.'}
                  </p>
                )}
              </div>

              {checkoutError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 mb-4">
                  {checkoutError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUpgradeConfirm(null)}
                  className="flex-1 py-2.5 rounded-lg border border-secondary-200 text-foreground-700 font-label text-sm font-semibold hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCheckout(showUpgradeConfirm)}
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 rounded-lg bg-primary-500 text-white font-label text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {checkoutLoading ? 'Redirecting...' : 'Continue to checkout'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CANCEL CONFIRMATION MODAL ── */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelConfirm(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <i className="ri-close-circle-line text-lg text-red-600" />
                </div>
                <div>
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Cancel subscription?</h3>
                  <p className="text-xs text-foreground-500">Your access will continue until the end of the billing period</p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-sm text-foreground-700">
                  You&rsquo;ll keep access to <strong>{currentPlan?.name}</strong> features until{' '}
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'the end of your billing period'}.
                </p>
                <p className="text-xs text-foreground-500">
                  After that, you&rsquo;ll be moved to the Free plan. Your data remains safe and can be accessed when you reactivate.
                </p>
                {isDemo && (
                  <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 mt-2">
                    Demo: cancellation is simulated. In production, you&rsquo;d be redirected to the Stripe billing portal.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-secondary-200 text-foreground-700 font-label text-sm font-semibold hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Keep subscription
                </button>
                <button
                  onClick={() => {
                    if (isDemo && demo) {
                      demo.updateSubscription?.({ planKey: 'free', status: 'active' });
                      fetch();
                      setShowCancelConfirm(false);
                      setToast({ type: 'success', message: 'Demo: Subscription cancelled' });
                    } else {
                      handlePortal();
                      setShowCancelConfirm(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-label text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isDemo ? 'Cancel (demo)' : 'Manage in Stripe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-10 p-5 rounded-xl bg-background-100 border border-secondary-200/60 text-center">
          <p className="text-xs text-foreground-500">
            Billing is securely handled by Stripe.{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
            {' '}&middot;{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}