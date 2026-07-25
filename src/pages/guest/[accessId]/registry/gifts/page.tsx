import { useState, useMemo } from 'react';
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

function formatCurrencyFull(amount: number, currency: string = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function GuestGiftsPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const allItems: GiftRegistryItem[] = (data?.registry?.registries || [])
    .filter((r) => r.registry_type === 'general' || r.registry_type === 'external_links')
    .flatMap((r) => (r.items || []).map((i) => ({ ...i, currency: i.currency || r.currency || 'GBP' })));

  const filterCategories = [
    { key: 'all', label: 'All', count: allItems.length },
    { key: 'featured', label: 'Featured', count: allItems.filter((i) => i.is_featured).length },
    { key: 'group', label: 'Group gifts', count: allItems.filter((i) => i.is_group_gift || i.allow_group_gifting).length },
    { key: 'external', label: 'External', count: allItems.filter((i) => i.external_url).length },
  ];

  const filtered = useMemo(() => {
    let items = allItems;
    if (filter === 'featured') items = items.filter((i) => i.is_featured);
    if (filter === 'group') items = items.filter((i) => i.is_group_gift || i.allow_group_gifting);
    if (filter === 'external') items = items.filter((i) => i.external_url);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [allItems, filter, search]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-6">
        <div className="h-7 w-40 bg-secondary-100 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map((i) => <div key={i} className="h-64 bg-secondary-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (allItems.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
          <i className="ri-arrow-left-s-line" /> Back to registry
        </Link>
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-gift-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">No gifts to display</h1>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto">The couple haven&apos;t added any gifts to this section yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
        <i className="ri-arrow-left-s-line" /> Back to registry
      </Link>

      <h1 className="font-heading text-3xl text-foreground-900 mb-2">Gift List</h1>
      <p className="text-sm text-foreground-500 mb-8">Browse the gifts the couple have chosen for their wedding.</p>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
          <input
            type="text"
            placeholder="Search gifts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder-foreground-400 focus:outline-none focus:border-primary-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterCategories.filter((c) => c.count > 0).map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap border ${
                filter === cat.key
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300'
              }`}
            >
              {cat.label} <span className="opacity-70">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gift grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-foreground-500">No gifts match your search.</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mt-2">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const itemCurrency = item.currency || 'GBP';
            const hasPrice = item.price != null && item.price > 0;
            const hasTarget = item.target_amount != null && item.target_amount > 0;
            const isGroup = item.is_group_gift || item.allow_group_gifting;
            const progress = isGroup && hasTarget ? Math.min(((item.contributed_total || 0) / (item.target_amount || 1)) * 100, 100) : 0;

            return (
              <Link
                key={item.id}
                to={`${basePath}/registry/gifts/${item.id}`}
                className="group bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-primary-200 transition-all cursor-pointer flex flex-col"
              >
                <div className="w-full h-44 bg-background-50 overflow-hidden flex-shrink-0 relative">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary-50">
                      <i className="ri-gift-line text-3xl text-secondary-300" />
                    </div>
                  )}
                  {item.is_featured && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-accent-500 text-white text-[10px] font-label">Featured</span>
                  )}
                  {item.category && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 text-foreground-500 text-[10px] font-label border border-secondary-100">{item.category}</span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-heading text-sm font-semibold text-foreground-900 group-hover:text-primary-600 transition-colors">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-foreground-500 line-clamp-2 mt-1">{item.description}</p>
                  )}
                  <div className="mt-auto pt-3">
                    {hasPrice && !isGroup && (
                      <p className="text-sm font-semibold text-foreground-900">{formatCurrencyFull(item.price!, itemCurrency)}</p>
                    )}
                    {isGroup && hasTarget && (
                      <div>
                        <div className="w-full h-1 rounded-full bg-secondary-100 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] text-foreground-400 mt-1">{formatCurrency(item.contributed_total || 0, itemCurrency)} of {formatCurrency(item.target_amount!, itemCurrency)}</p>
                      </div>
                    )}
                    {item.guide_amount && !hasPrice && (
                      <p className="text-sm font-semibold text-foreground-900">From {formatCurrency(item.guide_amount, itemCurrency)}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}