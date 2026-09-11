import { useState } from 'react';
import type { EditorAsset } from '../types';

// ── Custom MIME type for Vowora asset drag payload ──

const VOWORA_ASSET_MIME = 'application/x-vowora-asset';

// ── Props ──

interface AssetCardProps {
  asset: EditorAsset;
  assetLookupMap?: Map<string, EditorAsset>;
  compact?: boolean;
}

// ── Component ──

export default function AssetCard({ asset, assetLookupMap, compact = false }: AssetCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Verify asset exists in lookup map if provided
    if (assetLookupMap && !assetLookupMap.has(asset.id)) return;

    // Set custom MIME payload — minimal JSON with only assetId
    const payload = JSON.stringify({ assetId: asset.id });
    e.dataTransfer.setData(VOWORA_ASSET_MIME, payload);

    // Text/plain fallback with asset ID only
    e.dataTransfer.setData('text/plain', asset.id);

    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (compact) {
    // Compact mode for sidebar grid
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`rounded-lg border bg-white overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none group ${
          isDragging
            ? 'border-[#b8925a] opacity-60 shadow-md scale-95'
            : 'border-[#eee7df] hover:border-[#d4c5a9]'
        }`}
        title={asset.name}
      >
        {/* Thumbnail area */}
        <div className="w-full aspect-square flex items-center justify-center bg-[#faf7f2] overflow-hidden relative">
          {!imgError ? (
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
              draggable={false}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col items-center gap-0.5">
                <i className="ri-image-line text-foreground-300 text-sm" />
                <span className="text-[8px] text-foreground-400 font-label">No preview</span>
              </div>
            </div>
          )}

          {/* Premium badge */}
          {asset.isPremium && (
            <span className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded-full bg-[#b8925a] text-[7px] font-label font-semibold text-white leading-none">
              PRO
            </span>
          )}
        </div>

        {/* Label area */}
        <div className="px-1 py-1">
          <p className="text-[9px] text-foreground-600 truncate font-label text-center leading-tight">
            {asset.name}
          </p>
        </div>
      </div>
    );
  }

  // Full-size mode (original)
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`flex-shrink-0 w-[100px] h-[100px] rounded-lg border bg-white overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none group ${
        isDragging
          ? 'border-[#b8925a] opacity-60 shadow-md scale-95'
          : 'border-[#eee7df] hover:border-[#d4c5a9]'
      }`}
      title={asset.name}
    >
      {/* Thumbnail area */}
      <div className="w-full h-[72px] flex items-center justify-center bg-[#faf7f2] overflow-hidden relative">
        {!imgError ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
            draggable={false}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <div className="flex flex-col items-center gap-1">
              <i className="ri-image-line text-foreground-300 text-lg" />
              <span className="text-[9px] text-foreground-400 font-label">No preview</span>
            </div>
          </div>
        )}

        {/* Premium badge */}
        {asset.isPremium && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[#b8925a] text-[8px] font-label font-semibold text-white leading-none">
            PRO
          </span>
        )}
      </div>

      {/* Label area */}
      <div className="h-[28px] flex items-center justify-center px-1">
        <p className="text-[10px] text-foreground-600 truncate font-label text-center leading-tight max-w-full">
          {asset.name}
        </p>
      </div>
    </div>
  );
}

// ── Loading skeleton ──

export function AssetCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-lg border border-[#eee7df] bg-white overflow-hidden animate-pulse">
        <div className="w-full aspect-square bg-background-200" />
        <div className="px-1 py-1">
          <div className="w-10 h-2 bg-background-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[100px] h-[100px] rounded-lg border border-[#eee7df] bg-white overflow-hidden animate-pulse">
      <div className="w-full h-[72px] bg-background-200" />
      <div className="h-[28px] flex items-center justify-center px-2">
        <div className="w-14 h-2 bg-background-200 rounded" />
      </div>
    </div>
  );
}

// ── Empty state for a category ──

export function AssetCardEmpty() {
  return (
    <div className="w-full rounded-lg border border-dashed border-[#d4c5a9] bg-[#faf7f2] flex items-center justify-center py-4">
      <p className="text-[10px] text-foreground-400 font-label text-center px-2">
        No assets in this category
      </p>
    </div>
  );
}

// ── Full library empty state ──

export function AssetCardLibraryEmpty() {
  return (
    <div className="w-full rounded-lg border border-dashed border-[#d4c5a9] bg-[#faf7f2] flex items-center justify-center py-4">
      <p className="text-[10px] text-foreground-400 font-label text-center px-2">
        No invitation assets available
      </p>
    </div>
  );
}

// ── Error state ──

interface AssetCardErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function AssetCardError({ message, onRetry }: AssetCardErrorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50">
        <i className="ri-error-warning-line text-red-400 text-sm flex-shrink-0" />
        <span className="text-[11px] text-red-600 font-label whitespace-nowrap">
          {message || "Couldn't load assets"}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] text-red-700 underline cursor-pointer hover:text-red-800 whitespace-nowrap font-label"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}