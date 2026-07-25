import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';
import type { GiftRegistryItem } from '@/types/access';

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function GuestFundsPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-6">
        <div className="h-7 w-48 bg-secondary-100 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map((i) => <div key={i} className="h-64 bg-secondary-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const registry = data.registry;
  const fundRegistries = registry?.registries?.filter(
    (r) => r.registry_type === 'honeymoon_fund'
  ) || [];

  const allFunds: GiftRegistryItem[] = fundRegistries.flatMap((r) =>
    (r.items || []).map((i) => ({ ...i, currency: i.currency || r.currency || 'GBP' }))
  );

  if (allFunds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
          <i className="ri-arrow-left-s-line" /> Back to registry
        </Link>
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-plane-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">No funds published</h1>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto">The couple haven&apos;t added any honeymoon or experience funds yet.</p>
        </div>
      </div>
    );
  }

  const primary = fundRegistries[0];
  const headerTitle = primary?.title || 'Honeymoon & Experience Funds';
  const headerDesc = primary?.description || 'Contribute towards experiences that will create lasting memories for the couple.';

  const fundIcons: Record<string, string> = {
    flights: 'ri-flight-takeoff-line', hotel: 'ri-hotel-line', dinner: 'ri-restaurant-line',
    excursion: 'ri-compass-3-line', spa: 'ri-mental-health-line', album: 'ri-camera-line',
    home: 'ri-home-heart-line',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
        <i className="ri-arrow-left-s-line" /> Back to registry
      </Link>

      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">{headerTitle}</h1>
        <p className="text-sm text-foreground-500 max-w-lg mx-auto">{headerDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {allFunds.map((fund) => {
          const fundCurrency = fund.currency || 'GBP';
          const hasTarget = fund.target_amount != null && fund.target_amount > 0;
          const progress = hasTarget ? Math.min(((fund.contributed_total || 0) / (fund.target_amount || 1)) * 100, 100) : 0;
          const catIcon = fundIcons[fund.category || ''] || 'ri-gift-line';

          return (
            <Link
              key={fund.id}
              to={`${basePath}/registry/funds/${fund.id}`}
              className="group bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-primary-200 transition-all cursor-pointer flex flex-col"
            >
              <div className="w-full h-44 bg-background-50 overflow-hidden flex-shrink-0 relative">
                {fund.image ? (
                  <img src={fund.image} alt={fund.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary-50">
                    <i className={`${catIcon} text-3xl text-secondary-300`} />
                  </div>
                )}
                {fund.category && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/90 text-foreground-500 text-[10px] font-label border border-secondary-100 capitalize">{fund.category}</span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-heading text-sm font-semibold text-foreground-900 group-hover:text-primary-600 transition-colors">{fund.title}</h3>
                {fund.description && (
                  <p className="text-xs text-foreground-500 line-clamp-2 mt-1">{fund.description}</p>
                )}
                <div className="mt-auto pt-3">
                  {hasTarget && (
                    <div className="space-y-1">
                      <div className="flex items-end justify-between text-xs">
                        <span>{formatCurrency(fund.contributed_total || 0, fundCurrency)}</span>
                        <span className="text-foreground-400">of {formatCurrency(fund.target_amount!, fundCurrency)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {fund.guide_amount && !hasTarget && (
                    <p className="text-sm font-semibold text-foreground-900">From {formatCurrency(fund.guide_amount, fundCurrency)}</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!registry?.payment_provider_available && (
        <div className="text-center mt-10 pt-8 border-t border-secondary-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-label">
            <i className="ri-information-line" /> Online contributions are not yet available
          </div>
        </div>
      )}
    </div>
  );
}