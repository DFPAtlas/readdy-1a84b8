import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';
import { isDemoMode } from '@/demo/demoConfig';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useSubscription } from '@/hooks/useSubscription';
import { getActivePlans, formatPrice, getComparisonFeatures, isUpgrade, isDowngrade } from '@/lib/plans';
import type { BillingPlanKey } from '@/types/billing';

const RINGS_BG = 'https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/065bb409-a687-4c47-ac84-cf74a32a70b0_compressed_pexels-nick-greaux-15231247.webp';

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const { weddingId } = useActiveWedding();
  const { subscription, startCheckout } = useSubscription(isAuthenticated ? weddingId : null);
  const navigate = useNavigate();

  const [checkoutPlan, setCheckoutPlan] = useState<BillingPlanKey | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<BillingPlanKey | null>(null);

  const plans = getActivePlans();
  const comparisonRows = getComparisonFeatures();
  const currentPlanKey = subscription?.planKey || 'free';

  const handlePlanAction = useCallback((planKey: BillingPlanKey) => {
    if (planKey === 'free' && currentPlanKey === 'free') return; // Already on free

    if (!isAuthenticated) {
      // Redirect to signup with plan preserved
      navigate(`/signup?plan=${planKey}`);
      return;
    }

    if (planKey === currentPlanKey) return; // Already on this plan

    setShowConfirm(planKey);
  }, [isAuthenticated, currentPlanKey, navigate]);

  const handleCheckout = useCallback(async () => {
    if (!showConfirm) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const result = await startCheckout(showConfirm);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  }, [showConfirm, startCheckout]);

  const getButtonProps = (planKey: BillingPlanKey): { label: string; disabled: boolean; className: string } => {
    const isCurrent = planKey === currentPlanKey;
    const plan = plans.find((p) => p.planKey === planKey);
    const isFree = plan?.isFree;

    if (!isAuthenticated) {
      if (isDemoMode) {
        return { label: 'Get started', disabled: false, className: plan?.isHighlighted ? 'btn-primary' : 'btn-outline' };
      }
      return { label: 'Get started', disabled: false, className: plan?.isHighlighted ? 'btn-primary' : 'btn-outline' };
    }

    if (isCurrent) {
      return { label: 'Current plan', disabled: true, className: 'bg-emerald-100 text-emerald-700 cursor-default' };
    }

    if (isFree && currentPlanKey === 'free') {
      return { label: 'Current plan', disabled: true, className: 'bg-emerald-100 text-emerald-700 cursor-default' };
    }

    const upgrading = isUpgrade(currentPlanKey, planKey);
    const downgrading = isDowngrade(currentPlanKey, planKey);

    if (upgrading) return { label: 'Upgrade', disabled: false, className: 'btn-primary' };
    if (downgrading) return { label: 'Downgrade', disabled: false, className: 'btn-outline' };
    return { label: 'Select', disabled: false, className: 'btn-primary' };
  };

  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <img
            src="https://readdy.ai/api/search-image?query=Elegant%20minimal%20wedding%20table%20setting%20with%20soft%20linen%2C%20dried%20flowers%2C%20candlelight%20and%20gold%20cutlery%2C%20warm%20neutral%20cream%20and%20taupe%20tones%2C%20shallow%20depth%20of%20field%2C%20editorial%20style%20photography%2C%20serene%20luxury%20atmosphere&width=1600&height=700&seq=pricing-hero-bg-v2&orientation=landscape"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-background-50/80" />
          <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 text-xs font-label tracking-wider uppercase">Pricing</span>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3">
              Plans for<br />
              <em className="font-light italic">every wedding</em>
            </h1>
            <p className="text-foreground-600 text-base md:text-lg mt-5 max-w-xl mx-auto">
              From simple RSVPs to full wedding planning — find the plan that fits your big day.
            </p>
            {!isAuthenticated && !isDemoMode && (
              <p className="text-xs text-foreground-400 mt-3">No credit card required to start. Upgrade when you&rsquo;re ready.</p>
            )}
          </div>
        </section>

        {/* Plans */}
        <section className="py-8 md:py-12 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const btn = getButtonProps(plan.planKey);
                const isCurrentPlan = plan.planKey === currentPlanKey && isAuthenticated;

                return (
                  <div
                    key={plan.planKey}
                    className={`card-default relative flex flex-col ${
                      plan.isHighlighted
                        ? 'border-primary-300 ring-1 ring-primary-200'
                        : isCurrentPlan
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : ''
                    }`}
                  >
                    {plan.isHighlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-primary-500 text-white text-[10px] font-label font-semibold whitespace-nowrap">
                        Most popular
                      </span>
                    )}
                    {isCurrentPlan && !plan.isHighlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-label font-semibold whitespace-nowrap">
                        Your plan
                      </span>
                    )}

                    <h3 className="font-heading text-xl text-foreground-900">{plan.name}</h3>
                    <p className="text-sm text-foreground-500 mt-1">{plan.description}</p>

                    <div className="mt-5 mb-1">
                      <span className="font-heading text-3xl text-foreground-900">
                        {plan.isFree ? 'Free' : formatPrice(plan.monthlyPriceMinor, plan.currency)}
                      </span>
                      {!plan.isFree && (
                        <span className="text-sm text-foreground-500 font-label">/mo</span>
                      )}
                    </div>
                    {plan.trialDays > 0 && !isCurrentPlan && (
                      <p className="text-xs text-accent-700 font-label mt-0.5">{plan.trialDays}-day free trial</p>
                    )}

                    <ul className="mt-5 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-600">
                            <i className="ri-check-line text-xs" />
                          </span>
                          <span className="text-foreground-700">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanAction(plan.planKey)}
                      disabled={btn.disabled}
                      className={`mt-6 w-full py-3 rounded-lg text-sm font-label font-medium transition-colors whitespace-nowrap ${
                        btn.disabled ? btn.className + ' cursor-default' :
                        btn.className === 'btn-primary'
                          ? 'bg-primary-500 text-white hover:bg-primary-600 cursor-pointer'
                          : 'border border-secondary-200 text-foreground-800 hover:bg-background-100 cursor-pointer'
                      }`}
                    >
                      {btn.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="font-heading text-3xl text-foreground-900 text-center mb-10">
              Compare plans
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-4 font-label text-xs text-foreground-700">Feature</th>
                    <th className="text-center py-3 px-4 font-label text-xs text-foreground-700">Free</th>
                    <th className="text-center py-3 px-4 font-label text-xs text-foreground-700">Essential</th>
                    <th className="text-center py-3 px-4 font-label text-xs text-primary-700 bg-primary-50/50">Complete</th>
                    <th className="text-center py-3 px-4 font-label text-xs text-foreground-700">Luxury</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-secondary-100">
                      <td className="py-3 px-4 text-xs font-label text-foreground-800">{row.feature}</td>
                      <td className="text-center py-3 px-4 text-xs text-foreground-600">{row.values.free}</td>
                      <td className="text-center py-3 px-4 text-xs text-foreground-600">{row.values.essential}</td>
                      <td className="text-center py-3 px-4 text-xs text-primary-700 bg-primary-50/30">{row.values.complete}</td>
                      <td className="text-center py-3 px-4 text-xs text-foreground-600">{row.values.luxury}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-3xl mx-auto px-4 md:px-6">
            <h2 className="font-heading text-3xl text-foreground-900 text-center mb-10">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                { q: 'Can I switch plans later?', a: 'Yes, you can upgrade or downgrade at any time. When upgrading, you get immediate access to new features. When downgrading, changes take effect at the end of your billing period.' },
                { q: 'What happens to my data if I downgrade?', a: 'Your data is always safe. If you exceed a plan limit after downgrading, existing data remains accessible but you may not be able to add more until you upgrade again.' },
                { q: 'Is there a free trial?', a: 'Essential, Complete, and Luxury plans come with a 14-day free trial. You can cancel anytime during the trial and won\'t be charged.' },
                { q: 'How does billing work?', a: 'All payments are processed securely through Stripe. You\'ll be billed monthly and can view your invoices anytime from your billing dashboard.' },
                { q: 'Can I get a refund?', a: 'We don\'t offer refunds for partial months, but you can cancel anytime and keep access until the end of your billing period.' },
              ].map((faq, i) => (
                <details key={i} className="group bg-background-50 border border-secondary-200/70 rounded-xl">
                  <summary className="px-5 py-4 text-sm font-label font-medium text-foreground-900 cursor-pointer flex items-center justify-between list-none">
                    {faq.q}
                    <i className="ri-arrow-down-s-line text-lg text-foreground-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-foreground-600 leading-relaxed">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Start with the Free plan
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              No credit card required. Upgrade any time as your planning progresses.
            </p>
            <Link to={isAuthenticated ? '/app/dashboard' : '/signup'} className="btn-primary text-base px-8 py-3.5 cursor-pointer whitespace-nowrap">
              {isAuthenticated ? 'Go to dashboard' : 'Start planning for free'}
            </Link>
          </div>
        </section>

        {/* Checkout confirmation modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConfirm(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading text-lg text-foreground-900 mb-2">
                {isUpgrade(currentPlanKey, showConfirm) ? 'Upgrade' : isDowngrade(currentPlanKey, showConfirm) ? 'Downgrade' : 'Switch'} to {plans.find((p) => p.planKey === showConfirm)?.name}?
              </h3>
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">Current plan</span>
                  <span className="text-foreground-900 font-label">{plans.find((p) => p.planKey === currentPlanKey)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">New plan</span>
                  <span className="text-foreground-900 font-label">{plans.find((p) => p.planKey === showConfirm)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-500">Price</span>
                  <span className="text-foreground-900 font-label">
                    {formatPrice(plans.find((p) => p.planKey === showConfirm)?.monthlyPriceMinor || 0,
                      plans.find((p) => p.planKey === showConfirm)?.currency || 'gbp')}/mo
                  </span>
                </div>
                {isAuthenticated && (
                  <p className="text-xs text-foreground-500 mt-2">
                    You will be redirected to Stripe to complete this securely.
                  </p>
                )}
              </div>
              {checkoutError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 mb-4">{checkoutError}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-2.5 rounded-lg border border-secondary-200 text-foreground-700 text-sm font-label font-semibold hover:bg-secondary-50 cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="flex-1 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {checkoutLoading ? 'Redirecting...' : 'Continue'}
                  </button>
                ) : (
                  <Link
                    to={`/signup?plan=${showConfirm}`}
                    className="flex-1 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap text-center"
                  >
                    Create account
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}