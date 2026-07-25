import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GalleryAlbum, GalleryAsset, GalleryData } from '@/types/access';

const INTERACT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-gallery-interact';

const ALBUM_TYPE_ICONS: Record<string, string> = {
  couple: 'ri-hearts-line', engagement: 'ri-heart-2-line', venue: 'ri-building-4-line',
  wedding_day: 'ri-camera-line', guest_uploads: 'ri-upload-cloud-2-line', featured: 'ri-star-line',
  general: 'ri-image-line', preparation: 'ri-shirt-line', ceremony: 'ri-archive-line',
  reception: 'ri-cake-line', evening: 'ri-moon-line', wedding_party: 'ri-group-line',
  honeymoon: 'ri-plane-line', day_after: 'ri-sun-line', custom: 'ri-folder-line',
};

export default function GuestGalleryAlbumDetailPage() {
  const { accessId, albumId } = useParams();
  const { data, loading } = useGuestPortal();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [optimisticFavourites, setOptimisticFavourites] = useState<Set<string>>(new Set());
  const [interactLoading, setInteractLoading] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const gallery: GalleryData | null = data?.gallery ?? null;
  const albums: GalleryAlbum[] = gallery?.albums ?? [];

  const album = useMemo(() => albums.find((a) => a.id === albumId) || null, [albums, albumId]);

  const basePath = `/guest/${accessId}`;

  // Mark album as read
  useEffect(() => {
    if (!album || !accessId) return;
    fetch(INTERACT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_hash: accessId, action: 'mark_album_read', album_id: album.id }),
    }).catch(() => { /* noop */ });
  }, [album?.id, accessId]);

  const isFavourited = useCallback(
    (asset: GalleryAsset): boolean => {
      if (optimisticFavourites.has(asset.id)) return true;
      return asset.is_favourited && !optimisticFavourites.has(asset.id);
    },
    [optimisticFavourites]
  );

  const enrichedAssets = useMemo(() => {
    if (!album) return [];
    return album.assets
      .filter((a) => a.moderation_status === 'approved' || a.publication_status === 'published')
      .map((a) => ({ ...a, is_favourited: isFavourited(a) }));
  }, [album, isFavourited]);

  const handleFavourite = useCallback(async (assetId: string) => {
    if (interactLoading) return;
    setInteractLoading(true);
    const wasFavourited = optimisticFavourites.has(assetId);
    setOptimisticFavourites((prev) => { const next = new Set(prev); if (next.has(assetId)) next.delete(assetId); else next.add(assetId); return next; });
    try {
      const res = await fetch(INTERACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_hash: accessId, action: 'favourite_toggle', asset_id: assetId }) });
      const result = await res.json();
      if (!result.success) {
        setOptimisticFavourites((prev) => { const next = new Set(prev); if (wasFavourited) next.add(assetId); else next.delete(assetId); return next; });
      }
    } catch {
      setOptimisticFavourites((prev) => { const next = new Set(prev); if (wasFavourited) next.add(assetId); else next.delete(assetId); return next; });
    }
    setInteractLoading(false);
  }, [accessId, interactLoading, optimisticFavourites]);

  const handleReport = useCallback(async (assetId: string) => {
    if (!reportReason.trim()) return;
    try {
      await fetch(INTERACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_hash: accessId, action: 'report', asset_id: assetId, reason: reportReason.trim() }) });
      setReportSubmitted(true);
      setShowReportInput(false);
      setReportReason('');
      setTimeout(() => setReportSubmitted(false), 3000);
    } catch { /* noop */ }
  }, [accessId, reportReason]);

  const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };

  // Keyboard nav in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < enrichedAssets.length - 1) setLightboxIndex(lightboxIndex + 1);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [lightboxOpen, lightboxIndex, enrichedAssets.length]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-48 bg-secondary-100 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-secondary-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !album) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
          <i className="ri-folder-unknow-line text-4xl text-secondary-400" />
        </div>
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">Album not found</h1>
        <p className="text-sm text-foreground-500 mb-6">This album may have been removed or is no longer available.</p>
        <Link to={`${basePath}/gallery/albums`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Browse albums
        </Link>
      </div>
    );
  }

  const currentLightboxAsset = enrichedAssets[lightboxIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-foreground-400 mb-6">
        <Link to={`${basePath}/gallery`} className="hover:text-foreground-600 cursor-pointer">Gallery</Link>
        <i className="ri-arrow-right-s-line text-[10px]" />
        <Link to={`${basePath}/gallery/albums`} className="hover:text-foreground-600 cursor-pointer">Albums</Link>
        <i className="ri-arrow-right-s-line text-[10px]" />
        <span className="text-foreground-600">{album.title}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <i className={`${ALBUM_TYPE_ICONS[album.album_type] || 'ri-folder-line'} text-lg text-primary-500`} />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-foreground-900">{album.title}</h1>
            {album.description && (
              <p className="text-sm text-foreground-500 mt-1">{album.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-foreground-400">
          <span><i className="ri-camera-line mr-1" />{enrichedAssets.length} photo{enrichedAssets.length !== 1 ? 's' : ''}</span>
          {album.published_at && <span>{new Date(album.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          {album.has_new_images && (
            <span className="text-primary-600 font-medium"><i className="ri-sparkling-line mr-1" />New photos</span>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      {enrichedAssets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
            <i className="ri-image-line text-2xl text-foreground-350" />
          </div>
          <p className="text-sm text-foreground-500">No photos in this album yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {enrichedAssets.map((asset, index) => (
            <button
              key={asset.id}
              onClick={() => openLightbox(index)}
              className="relative group rounded-xl overflow-hidden bg-background-50 aspect-[4/3] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {asset.signed_url ? (
                <img src={asset.signed_url} alt={asset.title || 'Wedding photo'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary-100">
                  <i className="ri-image-line text-3xl text-foreground-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {asset.is_favourited && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                  <i className="ri-heart-fill text-red-400 text-sm" />
                </div>
              )}
              {asset.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent-500 text-white text-[10px] font-label font-semibold">Featured</div>
              )}
              {asset.title && (
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs text-white font-medium truncate">{asset.title}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-10 text-center">
        <Link to={`${basePath}/gallery/albums`} className="inline-flex items-center gap-2 text-xs font-label text-foreground-400 hover:text-foreground-600 cursor-pointer">
          <i className="ri-arrow-left-line" /> All albums
        </Link>
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentLightboxAsset && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-label="Image lightbox">
          <div className="flex items-center justify-between px-4 py-3 text-white/80">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-label text-white/60">{lightboxIndex + 1} / {enrichedAssets.length}</span>
              {currentLightboxAsset.title && <span className="text-sm text-white/80 truncate hidden sm:inline">{currentLightboxAsset.title}</span>}
            </div>
            <div className="flex items-center gap-1">
              {album.allow_favourites && (
                <button onClick={() => handleFavourite(currentLightboxAsset.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label={currentLightboxAsset.is_favourited ? 'Remove from favourites' : 'Add to favourites'}>
                  <i className={`${currentLightboxAsset.is_favourited ? 'ri-heart-fill text-red-400' : 'ri-heart-line'} text-lg`} />
                </button>
              )}
              {album.allow_downloads && currentLightboxAsset.downloads_enabled !== false && (
                <button onClick={() => { const a = document.createElement('a'); a.href = currentLightboxAsset.signed_url; a.download = currentLightboxAsset.title || 'wedding-photo'; a.click(); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Download">
                  <i className="ri-download-line text-lg" />
                </button>
              )}
              <button onClick={() => { setShowReportInput(!showReportInput); setReportSubmitted(false); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer" aria-label="Report">
                <i className="ri-flag-line text-lg" />
              </button>
              <button onClick={() => setLightboxOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2" aria-label="Close">
                <i className="ri-close-line text-xl" />
              </button>
            </div>
          </div>
          {showReportInput && !reportSubmitted && (
            <div className="mx-auto w-full max-w-md px-4 mb-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <input type="text" value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Why are you reporting this?" maxLength={200} className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none px-2" onKeyDown={(e) => { if (e.key === 'Enter') handleReport(currentLightboxAsset.id); }} />
                <button onClick={() => handleReport(currentLightboxAsset.id)} disabled={!reportReason.trim()} className="px-3 py-1.5 rounded-md bg-white/20 text-white text-xs font-label disabled:opacity-30 cursor-pointer whitespace-nowrap">Report</button>
              </div>
            </div>
          )}
          {reportSubmitted && <div className="mx-auto w-full max-w-md px-4 mb-2"><p className="text-center text-xs text-white/50">Thank you — your report has been submitted.</p></div>}
          <div className="flex-1 flex items-center justify-center px-2 relative min-h-0">
            {lightboxIndex > 0 && (
              <button onClick={() => setLightboxIndex(lightboxIndex - 1)} className="absolute left-2 md:left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer" aria-label="Previous">
                <i className="ri-arrow-left-s-line text-xl" />
              </button>
            )}
            <img src={currentLightboxAsset.signed_url} alt={currentLightboxAsset.title || 'Wedding photo'} className="max-w-full max-h-[75vh] object-contain" />
            {lightboxIndex < enrichedAssets.length - 1 && (
              <button onClick={() => setLightboxIndex(lightboxIndex + 1)} className="absolute right-2 md:right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer" aria-label="Next">
                <i className="ri-arrow-right-s-line text-xl" />
              </button>
            )}
          </div>
          {currentLightboxAsset.caption && <div className="px-4 py-3 text-center"><p className="text-sm text-white/50">{currentLightboxAsset.caption}</p></div>}
          {enrichedAssets.length > 1 && (
            <div className="px-4 pb-3 overflow-x-auto">
              <div className="flex items-center gap-2 justify-center">
                {enrichedAssets.map((a, i) => (
                  <button key={a.id} onClick={() => setLightboxIndex(i)} className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${i === lightboxIndex ? 'border-white scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}>
                    <img src={a.signed_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}