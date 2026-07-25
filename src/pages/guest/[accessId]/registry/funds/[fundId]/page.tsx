import { useState } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const SUGGESTED_AMOUNTS = [20, 50, 100, 200, 500];

export default function GuestFundDetailPage() {
  const { data, loading } = useGuestPortal();
  const { accessId, fundId } = useParams<{ accessId: string; fundId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [privateMessage, setPrivateMessage] = useState('');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-6">
        <div className="h-64 bg-secondary-100 rounded-xl" />
        <div className="h-6 w-48 bg-secondary-100 rounded" />
      </div>
    );
  }

  if (!data || !fundId) return null;

  const registry = data.registry;
  const allItems = registry?.registries?.flatMap((r) => r.items || []) || [];
  const fund = allItems.find((i) => i.id === fundId);
  const parentReg = registry?.registries?.find((r) => r.items?.some((i) => i.id === fundId));

  if (!fund) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <Link to={`${basePath}/registry/funds`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
          <i className="ri-arrow-left-s-line" /> Back to funds
        </Link>
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-plane-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Fund not found</h1>
          <p className="text-sm text-foreground-500">This fund may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  const fundCurrency = fund.currency || parentReg?.currency || 'GBP';
  const hasTarget = fund.target_amount != null && fund.target_amount > 0;
  const progress = hasTarget ? Math.min(((fund.contributed_total || 0) / (fund.target_amount || 1)) * 100, 100) : 0;
  const paymentAvailable = registry?.payment_provider_available || false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/registry/funds`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
        <i className="ri-arrow-left-s-line" /> Back to funds
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left */}
        <div className="lg:col-span-3 space-y-6">
          <div className="w-full h-80 rounded-xl bg-background-50 overflow-hidden">
            {fund.image ? (
              <img src={fund.image} alt={fund.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary-50">
                <i className="ri-plane-line text-5xl text-secondary-300" />
              </div>
            )}
          </div>

          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-3">{fund.title}</h1>
            {fund.description && (
              <p className="text-sm text-foreground-600 leading-relaxed">{fund.description}</p>
            )}
          </div>

          {fund.why_couple_chose && (
            <div className="bg-secondary-50 rounded-xl p-5 border border-secondary-100">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-heart-line text-accent-500 text-sm" />
                <span className="text-xs font-label font-semibold text-foreground-800">From the couple</span>
              </div>
              <p className="text-sm text-foreground-600">{fund.why_couple_chose}</p>
            </div>
          )}
        </div>

        {/* Right: contribution form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-secondary-100 p-5 space-y-5 sticky top-4">
            {hasTarget && (
              <div className="space-y-2">
                <p className="text-xl font-heading font-bold text-foreground-900">{formatCurrency(fund.target_amount!, fundCurrency)}</p>
                <div className="w-full h-2 rounded-full bg-secondary-100 overflow-hidden">
                  <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>{formatCurrency(fund.contributed_total || 0, fundCurrency)} raised</span>
                  <span className="text-foreground-400">{Math.round(progress)}%</span>
                </div>
              </div>
            )}

            {/* Contribution form */}
            {paymentAvailable ? (
              <div className="space-y-4">
                <p className="text-xs font-label font-semibold text-foreground-800">Choose an amount</p>
                <div className="grid grid-cols-3 gap-2">
                  {SUGGESTED_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedAmount(amount); setIsCustom(false); }}
                      className={`px-3 py-2 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer border whitespace-nowrap ${
                        !isCustom && selectedAmount === amount
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-foreground-700 border-secondary-200 hover:border-primary-300'
                      }`}
                    >
                      {formatCurrency(amount, fundCurrency)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsCustom(!isCustom)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-label transition-colors cursor-pointer border whitespace-nowrap ${
                    isCustom ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  Custom amount
                </button>
                {isCustom && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">{fundCurrency === 'GBP' ? '£' : fundCurrency}</span>
                    <input
                      type="number"
                      min={1}
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(Number(e.target.value) || 0); }}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder-foreground-400 focus:outline-none focus:border-primary-300 bg-white"
                    />
                  </div>
                )}

                {!isAnonymous && (
                  <div>
                    <label className="text-xs font-label text-foreground-700 block mb-1">Your name (optional)</label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Display name"
                      className="w-full px-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder-foreground-400 focus:outline-none focus:border-primary-300 bg-white"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  Give anonymously
                </label>

                <div>
                  <label className="text-xs font-label text-foreground-700 block mb-1">Private message for the couple</label>
                  <textarea
                    value={privateMessage}
                    onChange={(e) => setPrivateMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="A few words for the couple..."
                    className="w-full px-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder-foreground-400 focus:outline-none focus:border-primary-300 bg-white resize-none"
                  />
                </div>

                <button className="w-full px-5 py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                  Contribute {formatCurrency(selectedAmount, fundCurrency)}
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <i className="ri-information-line text-sm" />
                  <span className="text-sm font-label font-medium">Online contributions unavailable</span>
                </div>
                <p className="text-xs text-amber-600">Payment processing is not yet configured. Please contact the couple directly to contribute to this fund.</p>
              </div>
            )}

            {/* Privacy note */}
            <p className="text-[10px] text-foreground-400 leading-relaxed pt-3 border-t border-secondary-100">
              Contributions are private by default. Your personal details are never shared with other guests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}