import { useState, useEffect, useCallback, useMemo } from 'react';
import AssetCard, { AssetCardSkeleton, AssetCardEmpty, AssetCardLibraryEmpty, AssetCardError } from './AssetCard';
import type { EditorAsset } from '../types';
import { loadAssetLibrary } from '../assetService';

// ── Visible category order (exact per spec) ──

const CATEGORY_TAB_ORDER = [
  'All',
  'Florals',
  'Leaves',
  'Frames',
  'Icons',
  'Illustrations',
  'Patterns',
] as const;

// ── Props ──

interface AssetLibraryProps {
  seeding?: boolean;
}

// ── Component ──

export default function AssetLibrary({ seeding = false }: AssetLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [assets, setAssets] = useState<EditorAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // Build asset lookup map for drag verification
  const assetLookupMap = useMemo(() => {
    const map = new Map<string, EditorAsset>();
    for (const a of assets) {
      map.set(a.id, a);
    }
    return map;
  }, [assets]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await loadAssetLibrary();
    if (result.success) {
      setAssets(result.data ?? []);
    } else {
      setError(result.error ?? 'Failed to load assets');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Client-side filtering — never refetch
  const filteredAssets = useMemo(() => {
    if (activeCategory === 'All') return assets;
    const catLower = activeCategory.toLowerCase();
    return assets.filter(
      (a) => a.category.toLowerCase() === catLower,
    );
  }, [assets, activeCategory]);

  return (
    <div
      className={`flex flex-col bg-white flex-shrink-0 transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-[200px]'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="h-9 flex items-center justify-center border-b border-[#eee7df] text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer flex-shrink-0"
        title={collapsed ? 'Expand asset library' : 'Collapse asset library'}
        aria-label={collapsed ? 'Expand asset library' : 'Collapse asset library'}
      >
        <i className={`ri-${collapsed ? 'arrow-right' : 'arrow-left'}-s-line text-lg`} />
      </button>

      {collapsed ? (
        <div className="flex-1 flex flex-col items-center py-3 gap-3">
          <i className="ri-image-line text-foreground-300 text-xl" title="Asset library collapsed" />
          <span
            className="text-[9px] text-foreground-400 font-label rotate-180 whitespace-nowrap"
            style={{ writingMode: 'vertical-lr' }}
          >
            ASSETS
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <p className="text-[10px] font-label font-semibold tracking-[0.12em] uppercase text-foreground-500">
              Asset Library
            </p>
            <p className="text-[10px] text-foreground-400 mt-0.5 leading-snug">
              Drag onto canvas
            </p>
          </div>

          {/* Category tabs */}
          <div className="px-2 pb-2 flex-shrink-0">
            <div className="flex flex-wrap gap-1">
              {CATEGORY_TAB_ORDER.map((cat) => (
                <button
                  key={cat}
                  onClick={() => !loading && setActiveCategory(cat)}
                  disabled={loading}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium transition-colors whitespace-nowrap ${
                    loading
                      ? 'text-foreground-300 cursor-not-allowed'
                      : activeCategory === cat
                        ? 'bg-[#e8a2ab] text-white cursor-pointer'
                        : 'text-foreground-500 hover:text-foreground-700 hover:bg-background-100 cursor-pointer'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Asset grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
            {seeding ? (
              <div className="flex items-center gap-2 py-4">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50/80">
                  <i className="ri-loader-4-line animate-spin text-amber-500 text-xs flex-shrink-0" />
                  <span className="text-[10px] text-amber-700 font-label whitespace-nowrap">
                    Preparing…
                  </span>
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AssetCardSkeleton key={i} compact />
                ))}
              </div>
            ) : error ? (
              <div className="py-4">
                <AssetCardError message={error} onRetry={fetchAssets} />
              </div>
            ) : assets.length === 0 ? (
              <div className="py-4">
                <AssetCardLibraryEmpty />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-4">
                <AssetCardEmpty />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 py-2">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    assetLookupMap={assetLookupMap}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}