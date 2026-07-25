import { useState } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';
import type { GiftRegistryLight, GiftRegistryItem } from '@/types/access';

const REGISTRY_TYPE_CONFIG: Record<string, { icon: string; label: string; colour: string }> = {
  honeymoon_fund: { icon: 'ri-plane-line', label: 'Honeymoon Fund', colour: 'accent' },
  charity: { icon: 'ri-heart-pulse-line', label: 'Charity', colour: 'rose' },
  external_links: { icon: 'ri-external-link-line', label: 'External Registry', colour: 'secondary' },
  cash_gift: { icon: 'ri-gift-2-line', label: 'Cash Gift', colour: 'emerald' },
  general: { icon: 'ri-gift-line', label: 'Gift Registry', colour: 'primary' },
};

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function FeaturedItemCard({ item, currency, basePath }: { item: GiftRegistryItem; currency: string; basePath: string }) {
  const itemCurrency = item.currency || currency;
  const hasTarget = item.target_amount != null && item.target_amount > 0;
  const isGroup = item.is_group_gift || item.allow_group_gifting;
  const progress = isGroup && hasTarget
    ? Math.min(((item.contributed_total || 0) / (item.target_amount || 1)) * 100, 100)
    : 0;

  return (
    <Link
      to={`${basePath}/registry/gifts/${item.id}`}
      className="group bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-primary-200 transition-all cursor-pointer flex flex-col"
    >
      <div className="relative w-full h-44 bg-background-50 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
              <i className="ri-gift-line text-2xl text-primary-400" />
            </div>
          </div>
        )}
        {item.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/90 text-foreground-600 text-[10px] font-label border border-secondary-100">
            {item.category}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-1 group-hover:text-primary-600 transition-colors">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{item.description}</p>
        )}
        <div className="mt-auto">
          {item.price && !isGroup && (
            <p className="text-sm font-semibold text-foreground-900">{formatCurrency(item.price, itemCurrency)}</p>
          )}
          {isGroup && hasTarget && (
            <div className="space-y-1">
              <div className="w-full h-1 rounded-full bg-secondary-100 overflow-hidden">
                <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-foreground-400">{Math.round(progress)}% funded</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GuestRegistryPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-8">
        <div className="text-center space-y-3">
          <div className="h-8 w-48 bg-secondary-100 rounded-lg mx-auto" />
          <div className="h-4 w-80 bg-secondary-100 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-52 bg-secondary-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const registry = data.registry;
  const settings = data.portal_settings || {};
  const showRegistry = settings.show_registry !== false;

  if (!showRegistry) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-gift-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-3xl text-foreground-900 mb-3">Gift Registry</h1>
          <p className="text-sm text-foreground-500 max-w-md mx-auto">The couple have chosen not to share their gift registry through the portal.</p>
        </div>
      </div>
    );
  }

  if (!registry || !registry.registries || registry.registries.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-gift-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-3xl text-foreground-900 mb-3">Gift Registry</h1>
          <p className="text-sm text-foreground-500 max-w-md mx-auto">
            The couple haven&apos;t set up their gift registry yet. Your presence at their wedding is the greatest gift of all.
          </p>
        </div>
      </div>
    );
  }

  const wedding = data.wedding;
  const registries = registry.registries.filter((r) => r.enabled !== false && r.status !== 'draft');
  const primaryRegistry = registries[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      {/* ── Header ── */}
      <div className="text-center mb-12">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-3">
          {primaryRegistry?.title || 'Gift Registry'}
        </h1>
        {primaryRegistry?.presence_message && (
          <div className="max-w-xl mx-auto mb-5">
            <div className="relative bg-secondary-50 rounded-2xl p-5 border border-secondary-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-8 h-8 rounded-full bg-white border border-secondary-100 flex items-center justify-center">
                  <i className="ri-heart-line text-sm text-accent-500" />
                </div>
              </div>
              <p className="text-sm text-foreground-600 leading-relaxed italic pt-2">{primaryRegistry.presence_message}</p>
            </div>
          </div>
        )}
        {primaryRegistry?.description && (
          <p className="text-sm text-foreground-500 leading-relaxed max-w-lg mx-auto">{primaryRegistry.description}</p>
        )}
      </div>

      {/* ── Registry cards ── */}
      {registries.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {registries.map((reg) => {
            const config = REGISTRY_TYPE_CONFIG[reg.registry_type] || REGISTRY_TYPE_CONFIG.general;
            const subPath = reg.registry_type === 'honeymoon_fund' ? 'funds' :
              reg.registry_type === 'charity' ? 'charities' :
              reg.registry_type === 'external_links' ? reg.external_url || '#' :
              'gifts';
            const isExternal = reg.registry_type === 'external_links';
            const CardWrapper = isExternal ? 'a' : Link;
            const cardProps = isExternal
              ? { href: subPath as string, target: '_blank', rel: 'noopener noreferrer', className: 'bg-white rounded-xl border border-secondary-100 p-5 hover:border-primary-200 transition-all cursor-pointer group nofollow' }
              : { to: subPath as string, className: 'bg-white rounded-xl border border-secondary-100 p-5 hover:border-primary-200 transition-all cursor-pointer group' };

            return (
              <CardWrapper key={reg.id} {...(cardProps as Record<string, unknown>)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <i className={`${config.icon} text-sm text-primary-500`} />
                  </div>
                  <div>
                    <p className="text-sm font-label font-semibold text-foreground-900">{reg.title || config.label}</p>
                    <p className="text-[10px] text-foreground-400">{reg.items.length} item{reg.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {reg.description && (
                  <p className="text-xs text-foreground-500 line-clamp-2">{reg.description}</p>
                )}
                <div className="flex items-center gap-1 mt-3 text-xs font-label text-primary-600 group-hover:text-primary-700">
                  {isExternal ? 'Open registry' : 'View details'}
                  <i className={`${isExternal ? 'ri-arrow-right-up-line' : 'ri-arrow-right-line'} text-[10px]`} />
                </div>
              </CardWrapper>
            );
          })}
        </div>
      )}

      {/* ── Featured Gifts (for single registry) ── */}
      {primaryRegistry && primaryRegistry.items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-lg font-semibold text-foreground-900">
              {primaryRegistry.registry_type === 'honeymoon_fund' ? 'Honeymoon Experiences' :
               primaryRegistry.registry_type === 'charity' ? 'Causes we support' :
               'Featured gifts'}
            </h2>
            <Link
              to={`${basePath}/registry/${primaryRegistry.registry_type === 'honeymoon_fund' ? 'funds' : primaryRegistry.registry_type === 'charity' ? 'charities' : 'gifts'}`}
              className="text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              View all <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(primaryRegistry.items.filter((i) => i.is_featured).length > 0
              ? primaryRegistry.items.filter((i) => i.is_featured)
              : primaryRegistry.items.slice(0, 3)
            ).map((item) => (
              <FeaturedItemCard
                key={item.id}
                item={item}
                currency={primaryRegistry.currency || 'GBP'}
                basePath={basePath}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Payment notice ── */}
      {!registry.payment_provider_available && (
        <div className="text-center mt-10 pt-8 border-t border-secondary-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-label mb-3">
            <i className="ri-information-line" /> Online contributions are not yet available
          </div>
          <p className="text-xs text-foreground-400 max-w-sm mx-auto">
            You can browse the registry below. To contribute, please use the external links provided or contact the couple directly.
          </p>
        </div>
      )}

      {/* ── Thank you ── */}
      {primaryRegistry?.thank_you_message && (
        <div className="text-center mt-10 pt-8 border-t border-secondary-100">
          <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-primary-50 mb-3">
            <i className="ri-heart-line text-lg text-primary-400" />
          </div>
          <p className="text-sm text-foreground-600 italic max-w-md mx-auto">{primaryRegistry.thank_you_message}</p>
          <p className="text-xs text-foreground-400 mt-2">&mdash; {wedding.partner_one_name} &amp; {wedding.partner_two_name}</p>
        </div>
      )}

      {/* ── Privacy note ── */}
      <p className="text-center text-[11px] text-foreground-350 mt-8 max-w-md mx-auto leading-relaxed">
        Contributions are private by default. Donor names and amounts are only shown when the giver chooses to share them.
      </p>
    </div>
  );
}