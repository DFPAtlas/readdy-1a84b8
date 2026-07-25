import { useState } from 'react';
import type { GiftRegistryItem, GiftContributionPublic } from '@/types/access';

// ── Currency formatter ──

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatCurrencyFull(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ── Registry type icons / labels ──

const REGISTRY_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  honeymoon_fund: { icon: 'ri-plane-line', label: 'Honeymoon Fund' },
  charity: { icon: 'ri-heart-pulse-line', label: 'Charity' },
  external_links: { icon: 'ri-external-link-line', label: 'Registry Links' },
  cash_gift: { icon: 'ri-gift-2-line', label: 'Cash Gift Guidance' },
  general: { icon: 'ri-gift-line', label: 'Gift Registry' },
};

// ── Item Card ──

function ItemCard({
  item,
  currency,
  groupGiftingEnabled,
  showDonors,
  showAmounts,
}: {
  item: GiftRegistryItem;
  currency: string;
  groupGiftingEnabled: boolean;
  showDonors: boolean;
  showAmounts: boolean;
}) {
  const [showContributions, setShowContributions] = useState(false);

  const itemCurrency = item.currency || currency;
  const hasPrice = item.price != null && item.price > 0;
  const hasTarget = item.target_amount != null && item.target_amount > 0;
  const isGroupGift = item.is_group_gift && groupGiftingEnabled;
  const progress = isGroupGift && hasTarget
    ? Math.min(((item.contributed_total || 0) / (item.target_amount || 1)) * 100, 100)
    : 0;

  const hasContributions = (item.contributions || []).length > 0;

  return (
    <div className="bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-secondary-200 transition-colors flex flex-col">
      {/* Image */}
      <div className="relative w-full h-48 bg-background-50 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
              <i className="ri-gift-line text-3xl text-primary-400" />
            </div>
          </div>
        )}
        {item.is_featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-accent-500 text-white text-[11px] font-label font-semibold whitespace-nowrap">
            Featured
          </span>
        )}
        {item.provider && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 text-foreground-600 text-[11px] font-label whitespace-nowrap border border-secondary-100">
            {item.provider}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading text-base font-semibold text-foreground-900 mb-1.5 leading-snug">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-foreground-500 leading-relaxed mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Price / target / progress */}
        <div className="mt-auto space-y-2">
          {hasPrice && !isGroupGift && (
            <p className="text-base font-semibold text-foreground-900">
              {formatCurrencyFull(item.price!, itemCurrency)}
            </p>
          )}

          {isGroupGift && (
            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-foreground-700">
                  {formatCurrency(item.contributed_total || 0, itemCurrency)} raised
                </span>
                {hasTarget && (
                  <span className="text-xs text-foreground-400">
                    of {formatCurrency(item.target_amount!, itemCurrency)}
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {item.contributor_count != null && item.contributor_count > 0 && (
                <p className="text-xs text-foreground-400">
                  {item.contributor_count} {item.contributor_count === 1 ? 'person' : 'people'} contributed
                </p>
              )}
            </div>
          )}

          {/* Action */}
          <div className="flex items-center gap-2 pt-2">
            {item.external_url ? (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap nofollow"
              >
                {isGroupGift ? 'Contribute' : 'View gift'}
                <i className="ri-arrow-right-up-line text-xs" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-100 text-foreground-500 text-sm font-label font-medium cursor-default whitespace-nowrap">
                <i className="ri-gift-line text-xs" />
                Registry gift
              </span>
            )}

            {hasContributions && (
              <button
                onClick={() => setShowContributions(!showContributions)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-foreground-400 text-xs font-label hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-user-heart-line" />
                {item.contributor_count}
              </button>
            )}
          </div>
        </div>

        {/* Contributions list */}
        {showContributions && hasContributions && (
          <div className="mt-3 pt-3 border-t border-secondary-100 space-y-2">
            {(item.contributions || []).map((c: GiftContributionPublic) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className={`text-xs ${c.is_anonymous ? 'ri-user-3-line text-foreground-400' : 'ri-user-heart-line text-primary-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!c.is_anonymous && c.show_name && (
                      <span className="text-xs font-medium text-foreground-700">A generous guest</span>
                    )}
                    {c.is_anonymous && (
                      <span className="text-xs text-foreground-400 italic">Anonymous</span>
                    )}
                    {c.show_amount && c.amount != null && (
                      <span className="text-xs font-semibold text-accent-600">
                        {formatCurrencyFull(c.amount, itemCurrency)}
                      </span>
                    )}
                  </div>
                  {c.message && (
                    <p className="text-xs text-foreground-400 mt-0.5 line-clamp-2">"{c.message}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── External Link Card ──

function ExternalLinkCard({ label, url, icon }: { label: string; url: string; icon: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer group nofollow"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
        <i className={`${icon} text-lg text-primary-500`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground-900">{label}</p>
        <p className="text-xs text-foreground-400 truncate">{url}</p>
      </div>
      <i className="ri-arrow-right-s-line text-foreground-300 group-hover:text-primary-500 transition-colors" />
    </a>
  );
}

// ── Empty State ──

function RegistryEmpty() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
        <i className="ri-gift-line text-4xl text-secondary-400" />
      </div>
      <h2 className="font-heading text-2xl text-foreground-900 mb-3">No gifts to display</h2>
      <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto">
        The couple haven't added any gift ideas yet. Your presence is what matters most.
      </p>
    </div>
  );
}

// ── Disabled State ──

function RegistryDisabled({ message }: { message?: string }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
        <i className="ri-gift-2-line text-4xl text-secondary-400" />
      </div>
      <h2 className="font-heading text-2xl text-foreground-900 mb-3">Registry not available</h2>
      <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto">
        {message || 'The gift registry is not available at this time. Your presence at the wedding is the greatest gift.'}
      </p>
    </div>
  );
}

// ── Loading Skeleton ──

function RegistrySkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-secondary-100 rounded-lg" />
      <div className="h-5 w-full max-w-lg bg-secondary-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-secondary-100 overflow-hidden">
            <div className="h-48 bg-secondary-100" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-secondary-100 rounded" />
              <div className="h-4 w-full bg-secondary-100 rounded" />
              <div className="h-10 w-28 bg-secondary-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Registry Page Export ──

export { ExternalLinkCard, ItemCard, RegistryEmpty, RegistryDisabled, RegistrySkeleton, formatCurrency, formatCurrencyFull, REGISTRY_TYPE_CONFIG };