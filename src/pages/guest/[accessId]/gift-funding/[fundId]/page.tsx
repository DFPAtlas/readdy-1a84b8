import { useState, useRef } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, useNavigate } from 'react-router-dom';
import { formatMinor, toMinor } from '@/lib/budgetMoney';
import type { CurrencyCode } from '@/lib/budgetMoney';
import type { GiftFundLight, GiftFundContributionPublic } from '@/types/access';

const CHECKOUT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/gift-fund-create-checkout';

const SUGGESTED_AMOUNTS = [2500, 5000, 7500, 10000, 15000, 25000]; // £25, £50, £75, £100, £150, £250

function ContributionCard({ c }: { c: GiftFundContributionPublic }) {
  const showName = c.visibility === 'public' && c.display_name;
  const showAmount = c.visibility === 'public' && c.display_amount_minor;
  const showMsg = c.visibility === 'public' && c.display_message;
  const isAnonymous = c.visibility === 'anonymous';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background-50">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isAnonymous ? 'bg-secondary-200 text-foreground-400' : 'bg-primary-50 text-primary-500'
      }`}>
        <i className={`text-xs ${isAnonymous ? 'ri-user-3-line' : 'ri-user-heart-line'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {showName && <span className="text-xs font-medium text-foreground-700">{c.display_name}</span>}
          {isAnonymous && <span className="text-xs text-foreground-400 italic">Anonymous</span>}
          {c.visibility === 'name_only' && <span className="text-xs text-foreground-500">A generous guest</span>}
          {showAmount && (
            <span className="text-xs font-semibold text-accent-600">{formatMinor(c.display_amount_minor!, 'GBP' as CurrencyCode)}</span>
          )}
        </div>
        {showMsg && <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">&ldquo;{c.display_message}&rdquo;</p>}
        {c.paid_at && (
          <p className="text-[10px] text-foreground-400 mt-0.5">
            {new Date(c.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GuestGiftFundDetailPage() {
  const { data, loading } = useGuestPortal();
  const { accessId, fundId } = useParams<{ accessId: string; fundId: string }>();
  const navigate = useNavigate();
  const basePath = accessId ? `/guest/${accessId}` : '';

  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'name_only' | 'anonymous'>('name_only');
  const [agreed, setAgreed] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-secondary-100 rounded-lg" />
        <div className="h-4 w-full bg-secondary-100 rounded" />
        <div className="h-64 bg-secondary-100 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const giftFunds = data.giftFunds;
  const fund = giftFunds?.funds.find((f) => f.id === fundId);

  if (!fund) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
          <i className="ri-error-warning-line text-2xl text-secondary-400" />
        </div>
        <p className="text-sm text-foreground-600">This fund is no longer available.</p>
        <button onClick={() => navigate(basePath + '/gift-funding')} className="inline-flex items-center gap-1 mt-4 text-sm font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to Gift Fund
        </button>
      </div>
    );
  }

  const progress = fund.target_amount_minor
    ? Math.min((fund.raised_amount_minor / fund.target_amount_minor) * 100, 100)
    : 0;
  const hasTarget = fund.target_amount_minor != null && fund.target_amount_minor > 0;
  const coupleReady = giftFunds?.couple_account_ready || false;
  const isClosed = fund.closes_at ? new Date(fund.closes_at) <= new Date() : false;

  const effectiveAmount = selectedAmount || (customAmount ? toMinor(Number(customAmount)) : null);
  const amountValid = effectiveAmount != null && effectiveAmount >= 100 && effectiveAmount <= 500000;

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValid || !agreed || !coupleReady) return;

    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const sessionHash = sessionStorage.getItem('vowora_guest_session') || undefined;

      const res = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fund_id: fund.id,
          amount_minor: effectiveAmount,
          contributor_name: contributorName || null,
          contributor_email: contributorEmail || null,
          message: message || null,
          visibility,
          session_hash: sessionHash,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setCheckoutError(result.error || 'Could not create payment session. Please try again.');
        setCheckoutLoading(false);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        setCheckoutError('Could not redirect to payment. Please try again.');
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutError('A network error occurred. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const { recent_contributions: recentContribs, contributor_count: contribCount, raised_amount_minor: raised } = fund;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <button
        onClick={() => navigate(basePath + '/gift-funding')}
        className="inline-flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-6"
      >
        <i className="ri-arrow-left-line" /> Back to Gift Fund
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Fund details — left side */}
        <div className="lg:col-span-3 space-y-6">
          {fund.cover_image_path && (
            <div className="w-full h-56 rounded-xl overflow-hidden bg-background-50">
              <img src={fund.cover_image_path} alt={fund.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-100 text-foreground-600 text-[10px] font-label capitalize mb-2 inline-block">
              {fund.category}
            </span>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">{fund.title}</h1>
            {fund.description && (
              <p className="text-sm text-foreground-600 leading-relaxed">{fund.description}</p>
            )}
          </div>

          {hasTarget && (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-lg font-semibold text-foreground-900">
                  {formatMinor(raised, 'GBP' as CurrencyCode)}
                </span>
                <span className="text-sm text-foreground-400">
                  of {formatMinor(fund.target_amount_minor!, 'GBP' as CurrencyCode)} target
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary-100 overflow-hidden">
                <div className="h-full rounded-full bg-accent-500 transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-foreground-400">{Math.round(progress)}% funded &middot; {contribCount} {contribCount === 1 ? 'gift' : 'gifts'}</p>
            </div>
          )}

          {!hasTarget && (
            <div>
              <span className="text-lg font-semibold text-foreground-900">
                {formatMinor(raised, 'GBP' as CurrencyCode)} raised
              </span>
              <span className="text-sm text-foreground-400 ml-2">from {contribCount} {contribCount === 1 ? 'gift' : 'gifts'}</span>
            </div>
          )}

          {/* Recent contributions */}
          {recentContribs && recentContribs.length > 0 && (
            <div>
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Recent gifts</h2>
              <div className="space-y-2">
                {recentContribs.map((c) => (
                  <ContributionCard key={c.id} c={c} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contribution form — right side */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-secondary-100 p-5 sticky top-24">
            <h2 className="font-heading text-lg font-semibold text-foreground-900 mb-4">Make a contribution</h2>

            {isClosed && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-foreground-50 border border-foreground-200 mb-4">
                <i className="ri-lock-line text-foreground-500" />
                <p className="text-xs text-foreground-600">This fund is now closed. Thank you to everyone who contributed.</p>
              </div>
            )}

            {!coupleReady && !isClosed && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <i className="ri-time-line text-amber-600" />
                <p className="text-xs text-amber-700">The couple are setting up their payment account. Contributions will be available soon.</p>
              </div>
            )}

            {coupleReady && !isClosed && (
              <form ref={formRef} onSubmit={handleContribute} className="space-y-5">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Amount</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {SUGGESTED_AMOUNTS.map((am) => (
                      <button
                        key={am}
                        type="button"
                        onClick={() => { setSelectedAmount(am); setCustomAmount(''); }}
                        className={`px-3 py-2 rounded-lg text-sm font-label border transition-colors cursor-pointer whitespace-nowrap ${
                          selectedAmount === am
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-secondary-200 text-foreground-600 hover:border-secondary-300'
                        }`}
                      >
                        {formatMinor(am, 'GBP' as CurrencyCode)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-400">£</span>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      step="1"
                      placeholder="Other amount"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      className="w-full pl-7 pr-4 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors"
                    />
                  </div>
                  {customAmount && Number(customAmount) > 5000 && (
                    <p className="text-[10px] text-red-500 mt-1">Maximum contribution is £5,000</p>
                  )}
                  {customAmount && Number(customAmount) < 1 && Number(customAmount) > 0 && (
                    <p className="text-[10px] text-red-500 mt-1">Minimum contribution is £1</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="contributor-name" className="block text-xs font-label font-medium text-foreground-700 mb-1">Your name</label>
                  <input
                    id="contributor-name"
                    type="text"
                    maxLength={120}
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    placeholder="How you'd like to be known"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="contributor-email" className="block text-xs font-label font-medium text-foreground-700 mb-1">Email (for receipt)</label>
                  <input
                    id="contributor-email"
                    type="email"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contributor-message" className="block text-xs font-label font-medium text-foreground-700 mb-1">
                    Message <span className="text-foreground-400 font-normal">(optional, max 500 characters)</span>
                  </label>
                  <textarea
                    id="contributor-message"
                    maxLength={500}
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="A short message for the couple..."
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors resize-none"
                  />
                  <p className="text-[10px] text-foreground-400 text-right mt-0.5">{message.length}/500</p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Display</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'public' as const, label: 'Public', icon: 'ri-eye-line' },
                      { value: 'name_only' as const, label: 'Name only', icon: 'ri-user-line' },
                      { value: 'anonymous' as const, label: 'Anonymous', icon: 'ri-user-3-line' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVisibility(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-label border transition-colors cursor-pointer whitespace-nowrap ${
                          visibility === opt.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'
                        }`}
                      >
                        <i className={`${opt.icon} text-[10px]`} /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agreement */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                  />
                  <span className="text-[11px] text-foreground-500 leading-relaxed">
                    I understand this is a voluntary gift contribution. It does not provide ownership, financial returns or rewards. Payments are processed securely by Stripe.
                  </span>
                </label>

                {/* Submit */}
                {checkoutError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{checkoutError}</div>
                )}

                <button
                  type="submit"
                  disabled={!amountValid || !agreed || checkoutLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  {checkoutLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      Contribute {effectiveAmount ? formatMinor(effectiveAmount, 'GBP' as CurrencyCode) : ''}
                      <i className="ri-arrow-right-line text-xs" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-foreground-400 text-center">
                  Secured by <span className="font-medium">Stripe</span>. We never store your card details.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}