import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function GuestGiftDetailPage() {
  const { data, loading } = useGuestPortal();
  const { accessId, itemId } = useParams<{ accessId: string; itemId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-6">
        <div className="h-64 bg-secondary-100 rounded-xl" />
        <div className="h-6 w-48 bg-secondary-100 rounded" />
        <div className="h-4 w-96 bg-secondary-100 rounded" />
      </div>
    );
  }

  if (!data || !itemId) return null;

  const registry = data.registry;
  const allItems = registry?.registries?.flatMap((r) => r.items || []) || [];
  const item = allItems.find((i) => i.id === itemId);
  const parentRegistry = registry?.registries?.find((r) => r.items?.some((i) => i.id === itemId));

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
          <i className="ri-arrow-left-s-line" /> Back to registry
        </Link>
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-gift-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Gift not found</h1>
          <p className="text-sm text-foreground-500">This gift may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  const itemCurrency = item.currency || parentRegistry?.currency || 'GBP';
  const hasTarget = item.target_amount != null && item.target_amount > 0;
  const isGroup = item.is_group_gift || item.allow_group_gifting;
  const progress = isGroup && hasTarget ? Math.min(((item.contributed_total || 0) / (item.target_amount || 1)) * 100, 100) : 0;
  const myReservation = registry?.my_reservations?.find((r) => r.registry_item_id === item.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/registry/gifts`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
        <i className="ri-arrow-left-s-line" /> Back to gifts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: image + description */}
        <div className="lg:col-span-3 space-y-6">
          <div className="w-full h-80 rounded-xl bg-background-50 overflow-hidden">
            {item.image ? (
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary-50">
                <div className="text-center">
                  <i className="ri-gift-line text-5xl text-secondary-300 block mb-2" />
                  <span className="text-sm text-foreground-400">No image</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {item.category && (
                <span className="px-2 py-0.5 rounded-full bg-secondary-100 text-foreground-500 text-[10px] font-label">{item.category}</span>
              )}
              {isGroup && (
                <span className="px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label">Group gift</span>
              )}
              {item.allow_reservation && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-label">Reservable</span>
              )}
            </div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-3">{item.title}</h1>
            {item.description && (
              <p className="text-sm text-foreground-600 leading-relaxed">{item.description}</p>
            )}
          </div>

          {item.why_couple_chose && (
            <div className="bg-secondary-50 rounded-xl p-5 border border-secondary-100">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-heart-line text-accent-500 text-sm" />
                <span className="text-xs font-label font-semibold text-foreground-800">Why the couple chose this</span>
              </div>
              <p className="text-sm text-foreground-600">{item.why_couple_chose}</p>
            </div>
          )}
        </div>

        {/* Right: details sidebar */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-secondary-100 p-5 space-y-4 sticky top-4">
            {/* Price / target */}
            {item.price && !isGroup && (
              <div>
                <p className="text-2xl font-heading font-bold text-foreground-900">{formatCurrency(item.price, itemCurrency)}</p>
                {item.guide_amount && <p className="text-xs text-foreground-400 mt-0.5">Guide price</p>}
              </div>
            )}

            {isGroup && hasTarget && (
              <div className="space-y-2">
                <p className="text-2xl font-heading font-bold text-foreground-900">{formatCurrency(item.target_amount!, itemCurrency)}</p>
                <div className="w-full h-2 rounded-full bg-secondary-100 overflow-hidden">
                  <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">{formatCurrency(item.contributed_total || 0, itemCurrency)} raised</span>
                  <span className="text-foreground-400">{Math.round(progress)}%</span>
                </div>
                {item.contributor_count != null && item.contributor_count > 0 && (
                  <p className="text-[11px] text-foreground-400">{item.contributor_count} {item.contributor_count === 1 ? 'person has' : 'people have'} contributed</p>
                )}
              </div>
            )}

            {item.guide_amount && !item.price && !hasTarget && (
              <p className="text-2xl font-heading font-bold text-foreground-900">From {formatCurrency(item.guide_amount, itemCurrency)}</p>
            )}

            {/* Actions */}
            {item.external_url ? (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap nofollow"
              >
                View on {item.provider || 'retailer'} <i className="ri-external-link-line text-xs" />
              </a>
            ) : (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <i className="ri-information-line" />
                  Online contributions are not yet available. Please contact the couple directly.
                </p>
              </div>
            )}

            {/* Reservation */}
            {item.allow_reservation && !item.external_url && myReservation && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <i className="ri-check-line" />
                  You&apos;ve reserved this gift
                  {myReservation.expires_at && (
                    <span className="block text-[10px] mt-0.5">Expires {new Date(myReservation.expires_at).toLocaleDateString('en-GB')}</span>
                  )}
                </p>
              </div>
            )}

            {/* Meta */}
            <div className="pt-3 border-t border-secondary-100 space-y-2">
              {item.provider && (
                <p className="flex items-center gap-2 text-xs text-foreground-500">
                  <i className="ri-store-line text-foreground-400" /> {item.provider}
                </p>
              )}
              <p className="text-[11px] text-foreground-400 italic">
                Check current price and availability with the retailer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}