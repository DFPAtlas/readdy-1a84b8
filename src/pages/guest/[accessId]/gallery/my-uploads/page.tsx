import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GalleryAlbum, GalleryAsset, GalleryData } from '@/types/access';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';
import { isDemoMode } from '@/demo/demoConfig';

const INTERACT_URL = edgeFunctionUrl('guest-gallery-interact');

const STATUS_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  pending: { icon: 'ri-time-line', label: 'Pending review', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  awaiting_review: { icon: 'ri-time-line', label: 'Awaiting review', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  uploading: { icon: 'ri-loader-4-line', label: 'Uploading', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  processing: { icon: 'ri-loader-4-line', label: 'Processing', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  approved: { icon: 'ri-check-line', label: 'Approved', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  rejected: { icon: 'ri-close-line', label: 'Not approved', color: 'bg-red-50 border-red-200 text-red-600' },
  hidden: { icon: 'ri-eye-off-line', label: 'Hidden', color: 'bg-foreground-50 border-foreground-200 text-foreground-500' },
  removed: { icon: 'ri-delete-bin-line', label: 'Removed', color: 'bg-foreground-50 border-foreground-200 text-foreground-500' },
  failed: { icon: 'ri-error-warning-line', label: 'Failed', color: 'bg-red-50 border-red-200 text-red-600' },
};

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GuestGalleryMyUploadsPage() {
  const { accessId } = useParams();
  const { data, loading } = useGuestPortal();

  const [localRemoved, setLocalRemoved] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const gallery: GalleryData | null = data?.gallery ?? null;
  const albums: GalleryAlbum[] = gallery?.albums ?? [];
  const basePath = `/guest/${accessId}`;

  const myUploads = useMemo(() => {
    return albums.flatMap((album) =>
      album.assets
        .filter((asset) => asset.uploaded_by_guest_id && !localRemoved.has(asset.id))
        .map((asset) => ({ ...asset, album_title: album.title, album_id: album.id }))
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [albums, localRemoved]);

  const handleRemove = useCallback(async (assetId: string) => {
    if (removingId) return;
    setRemovingId(assetId);
    // In demo mode, simulate removal locally
    if (isDemoMode) {
      setLocalRemoved((prev) => new Set(prev).add(assetId));
      setRemovingId(null);
      return;
    }
    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action: 'remove_upload', asset_id: assetId }),
      });
      const result = await res.json();
      if (result.success) {
        setLocalRemoved((prev) => new Set(prev).add(assetId));
      }
    } catch { /* noop */ }
    setRemovingId(null);
  }, [accessId, removingId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-40 bg-secondary-100 rounded-lg" />
          {[1, 2, 3].map((i) => (<div key={i} className="h-28 rounded-xl bg-secondary-100" />))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1 text-xs text-foreground-400 hover:text-foreground-600 mb-4 cursor-pointer">
        <i className="ri-arrow-left-line text-[10px]" /> Gallery
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl text-foreground-900">My Uploads</h1>
          <p className="text-sm text-foreground-500 mt-1">
            {myUploads.length} upload{myUploads.length !== 1 ? 's' : ''}
          </p>
        </div>
        {gallery?.upload_settings?.uploads_enabled && (
          <Link
            to={`${basePath}/gallery/upload`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-upload-cloud-2-line" /> Upload more
          </Link>
        )}
      </div>

      {myUploads.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-upload-cloud-2-line text-4xl text-secondary-400" />
          </div>
          <h2 className="font-heading text-2xl text-foreground-900 mb-3">No uploads yet</h2>
          <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto mb-6">
            You haven&apos;t uploaded any photos yet. Share your memories with the couple and other guests!
          </p>
          {gallery?.upload_settings?.uploads_enabled ? (
            <Link
              to={`${basePath}/gallery/upload`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-upload-cloud-2-line" /> Upload photos
            </Link>
          ) : (
            <p className="text-xs text-foreground-400">Uploads are not currently open.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {myUploads.map((asset) => {
            const badge = STATUS_BADGES[asset.moderation_status] || STATUS_BADGES.pending;
            const canRemove = ['pending', 'awaiting_review', 'failed', 'uploading', 'processing'].includes(asset.moderation_status);

            return (
              <div key={asset.id} className="flex items-center gap-4 p-4 rounded-xl border border-secondary-100 bg-white">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-100">
                  {asset.thumbnail_signed_url ? (
                    <img src={asset.thumbnail_signed_url} alt={asset.title || ''} className="w-full h-full object-cover" loading="lazy" />
                  ) : asset.signed_url ? (
                    <img src={asset.signed_url} alt={asset.title || ''} className="w-full h-full object-cover opacity-60" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="ri-image-line text-xl text-foreground-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground-900 truncate">{asset.title || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground-400">
                    <span>{asset.album_title}</span>
                    <span>&middot;</span>
                    <span>{formatDateShort(asset.created_at)}</span>
                    {asset.file_size && (
                      <><span>&middot;</span><span>{(asset.file_size / 1048576).toFixed(1)} MB</span></>
                    )}
                  </div>
                  {asset.caption && (
                    <p className="text-xs text-foreground-500 mt-1 line-clamp-1">{asset.caption}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-label font-medium border ${badge.color}`}>
                    <i className={`${badge.icon} text-[10px]`} />
                    {badge.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {asset.moderation_status === 'approved' && (
                    <Link
                      to={`${basePath}/gallery/albums/${asset.album_id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                      aria-label="View in album"
                    >
                      <i className="ri-eye-line text-sm" />
                    </Link>
                  )}
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(asset.id)}
                      disabled={removingId === asset.id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                      aria-label="Remove upload"
                    >
                      {removingId === asset.id ? (
                        <i className="ri-loader-4-line animate-spin text-sm" />
                      ) : (
                        <i className="ri-delete-bin-line text-sm" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-foreground-350 text-center mt-8 leading-relaxed max-w-md mx-auto">
        Photos you upload are reviewed by the couple before appearing in the gallery. You can remove pending uploads at any time. Approved photos may remain in the gallery at the couple&apos;s discretion.
      </p>
    </div>
  );
}