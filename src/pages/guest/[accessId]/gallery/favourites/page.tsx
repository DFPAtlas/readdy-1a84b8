import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GalleryAlbum, GalleryAsset, GalleryData } from '@/types/access';
import { isDemoMode } from '@/demo/demoConfig';

const INTERACT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-gallery-interact';

export default function GuestGalleryFavouritesPage() {
  const { accessId } = useParams();
  const { data, loading } = useGuestPortal();

  const [optimisticFavourites, setOptimisticFavourites] = useState<Set<string>>(new Set());
  const [interactLoading, setInteractLoading] = useState(false);

  const gallery: GalleryData | null = data?.gallery ?? null;
  const albums: GalleryAlbum[] = gallery?.albums ?? [];
  const basePath = `/guest/${accessId}`;

  const isFavourited = useCallback(
    (asset: GalleryAsset): boolean => {
      if (optimisticFavourites.has(asset.id)) return false;
      return asset.is_favourited && !optimisticFavourites.has(asset.id);
    },
    [optimisticFavourites]
  );

  const favouriteAssets = useMemo(() => {
    return albums
      .flatMap((album) =>
        album.assets
          .filter((asset) => isFavourited(asset) && (asset.moderation_status === 'approved' || asset.publication_status === 'published'))
          .map((asset) => ({ ...asset, album_title: album.title, album_id: album.id }))
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [albums, isFavourited]);

  const handleUnfavourite = useCallback(async (assetId: string) => {
    if (interactLoading) return;
    setInteractLoading(true);
    setOptimisticFavourites((prev) => { const next = new Set(prev); next.add(assetId); return next; });
    // In demo mode, skip Edge Function call
    if (!isDemoMode) {
      try {
        await fetch(INTERACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_hash: accessId, action: 'favourite_toggle', asset_id: assetId }) });
      } catch {
        setOptimisticFavourites((prev) => { const next = new Set(prev); next.delete(assetId); return next; });
      }
    }
    setInteractLoading(false);
  }, [accessId, interactLoading]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-40 bg-secondary-100 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="aspect-[4/3] rounded-xl bg-secondary-100" />))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentAsset = favouriteAssets[lightboxIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      {/* Breadcrumb */}
      <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1 text-xs text-foreground-400 hover:text-foreground-600 mb-4 cursor-pointer">
        <i className="ri-arrow-left-line text-[10px]" /> Gallery
      </Link>

      <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">My Favourites</h1>
      <p className="text-sm text-foreground-500 mb-8">
        {favouriteAssets.length} saved photo{favouriteAssets.length !== 1 ? 's' : ''}
        {gallery?.my_favourites_count ? ` of ${gallery.my_favourites_count}` : ''}
      </p>

      {favouriteAssets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-heart-line text-4xl text-secondary-400" />
          </div>
          <h2 className="font-heading text-2xl text-foreground-900 mb-3">No favourites yet</h2>
          <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto mb-6">
            Tap the heart icon on any photo in the gallery to save it here. Your favourites are private — only you can see them.
          </p>
          <Link
            to={`${basePath}/gallery`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-image-line" /> Browse gallery
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favouriteAssets.map((asset, index) => (
              <button
                key={asset.id}
                onClick={() => openLightbox(index)}
                className="relative group rounded-xl overflow-hidden bg-background-50 aspect-[4/3] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                {asset.signed_url ? (
                  <img src={asset.signed_url} alt={asset.title || 'Favourite photo'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary-100"><i className="ri-image-line text-3xl text-foreground-300" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                  <i className="ri-heart-fill text-red-400 text-sm" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs text-white/70 truncate">{asset.album_title}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-foreground-350 text-center mt-10">
            <i className="ri-information-line mr-1" />
            Your favourites are private — only you can see them.
          </p>

          {/* Lightbox */}
          {lightboxOpen && currentAsset && (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-label="Image lightbox">
              <div className="flex items-center justify-between px-4 py-3 text-white/80">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-label text-white/60">{lightboxIndex + 1} / {favouriteAssets.length}</span>
                  {currentAsset.album_title && <span className="text-xs text-white/50">{currentAsset.album_title}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleUnfavourite(currentAsset.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Remove from favourites">
                    <i className="ri-heart-fill text-red-400 text-lg" />
                  </button>
                  <button onClick={() => setLightboxOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2" aria-label="Close">
                    <i className="ri-close-line text-xl" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center px-2 relative min-h-0">
                {lightboxIndex > 0 && (
                  <button onClick={() => setLightboxIndex(lightboxIndex - 1)} className="absolute left-2 md:left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer" aria-label="Previous">
                    <i className="ri-arrow-left-s-line text-xl" />
                  </button>
                )}
                <img src={currentAsset.signed_url} alt={currentAsset.title || 'Wedding photo'} className="max-w-full max-h-[75vh] object-contain" />
                {lightboxIndex < favouriteAssets.length - 1 && (
                  <button onClick={() => setLightboxIndex(lightboxIndex + 1)} className="absolute right-2 md:right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer" aria-label="Next">
                    <i className="ri-arrow-right-s-line text-xl" />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}