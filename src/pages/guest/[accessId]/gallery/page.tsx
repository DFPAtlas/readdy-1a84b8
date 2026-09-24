import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { GalleryAlbum, GalleryAsset, GalleryData } from '@/types/access';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';
import {
  Lightbox,
  UploadModal,
  PendingUploadCard,
  GallerySkeleton,
  GalleryEmpty,
  GalleryDisabled,
  ALBUM_TYPE_ICONS,
} from './components/GalleryComponents';

const INTERACT_URL = edgeFunctionUrl('guest-gallery-interact');

export default function GuestGalleryPage() {
  const { accessId } = useParams();
  const { data, loading } = useGuestPortal();

  // ── All hooks must be at the top ──
  const [activeAlbumId, setActiveAlbumId] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState<string>('');
  const [optimisticFavourites, setOptimisticFavourites] = useState<Set<string>>(new Set());
  const [localRemoved, setLocalRemoved] = useState<Set<string>>(new Set());
  const [interactLoading, setInteractLoading] = useState(false);

  // Demo upload state
  const demoData = useDemoDataSafe();
  const isDemo = isDemoMode && accessId === 'demo-session';
  const [demoUploadOpen, setDemoUploadOpen] = useState(false);
  const [demoCaption, setDemoCaption] = useState('');
  const [demoAlbum, setDemoAlbum] = useState('demo-album-reception');
  const [demoConsent, setDemoConsent] = useState(false);
  const [demoUploading, setDemoUploading] = useState(false);
  const [demoUploadDone, setDemoUploadDone] = useState(false);
  const [demoUploadError, setDemoUploadError] = useState('');

  const gallery: GalleryData | null = data?.gallery ?? null;
  const portalSettings = data?.portal_settings ?? null;
  const showGallery = portalSettings?.show_gallery !== false;
  const albums = gallery?.albums ?? [];

  // ── Derived data (memos) ──
  const activeAlbum = useMemo(() => {
    if (activeAlbumId === 'all') return null;
    return albums.find((a) => a.id === activeAlbumId) || null;
  }, [activeAlbumId, albums]);

  const allApprovedAssets = useMemo(() => {
    const all: { asset: GalleryAsset; album: GalleryAlbum }[] = [];
    for (const album of albums) {
      for (const asset of album.assets) {
        if (asset.moderation_status === 'approved' && !localRemoved.has(asset.id)) {
          all.push({ asset, album });
        }
      }
    }
    return all;
  }, [albums, localRemoved]);

  const displayedAssets = useMemo(() => {
    if (activeAlbumId === 'all') {
      return albums.flatMap((a) =>
        a.assets.filter((asset) => asset.moderation_status === 'approved' && !localRemoved.has(asset.id))
      );
    }
    if (!activeAlbum) return [];
    return activeAlbum.assets.filter((asset) => asset.moderation_status === 'approved' && !localRemoved.has(asset.id));
  }, [activeAlbumId, activeAlbum, albums, localRemoved]);

  const pendingUploads = useMemo(() => {
    return albums.flatMap((a) =>
      a.assets.filter(
        (asset) =>
          asset.moderation_status === 'pending' &&
          asset.uploaded_by_guest_id &&
          !localRemoved.has(asset.id)
      )
    );
  }, [albums, localRemoved]);

  const albumTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: string; count: number; hasUploads: boolean }[] = [
      {
        id: 'all',
        label: 'All photos',
        icon: 'ri-image-line',
        count: allApprovedAssets.length,
        hasUploads: false,
      },
    ];
    for (const album of albums) {
      const approvedCount = album.assets.filter(
        (a) => a.moderation_status === 'approved' && !localRemoved.has(a.id)
      ).length;
      if (approvedCount > 0 || album.allow_uploads) {
        tabs.push({
          id: album.id,
          label: album.title,
          icon: ALBUM_TYPE_ICONS[album.album_type] || 'ri-image-line',
          count: approvedCount,
          hasUploads: album.allow_uploads,
        });
      }
    }
    return tabs;
  }, [albums, allApprovedAssets, localRemoved]);

  const currentLightboxAlbum = useMemo(() => {
    if (activeAlbumId === 'all') {
      const asset = displayedAssets[lightboxIndex];
      if (!asset) return albums[0] || null;
      const found = albums.find((a) => a.assets.some((as) => as.id === asset.id));
      return found || albums[0] || null;
    }
    return activeAlbum || albums[0] || null;
  }, [activeAlbumId, activeAlbum, displayedAssets, lightboxIndex, albums]);

  const isFavourited = useCallback(
    (asset: GalleryAsset): boolean => {
      if (optimisticFavourites.has(asset.id)) return true;
      return asset.is_favourited && !optimisticFavourites.has(asset.id);
    },
    [optimisticFavourites]
  );

  const enrichedAssets = useMemo(() => {
    return displayedAssets.map((a) => ({
      ...a,
      is_favourited: isFavourited(a),
    }));
  }, [displayedAssets, isFavourited]);

  // ── Interact handlers ──
  const handleFavourite = useCallback(async (assetId: string) => {
    if (interactLoading) return;
    setInteractLoading(true);

    const wasFavourited = optimisticFavourites.has(assetId);
    setOptimisticFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });

    // In demo mode, skip the Edge Function call
    if (!isDemo) {
      try {
        const res = await fetch(INTERACT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_hash: accessId,
            action: 'favourite_toggle',
            asset_id: assetId,
          }),
        });
        const result = await res.json();
        if (!result.success) {
          setOptimisticFavourites((prev) => {
            const next = new Set(prev);
            if (wasFavourited) next.add(assetId);
            else next.delete(assetId);
            return next;
          });
        }
      } catch {
        setOptimisticFavourites((prev) => {
          const next = new Set(prev);
          if (wasFavourited) next.add(assetId);
          else next.delete(assetId);
          return next;
        });
      }
    }

    setInteractLoading(false);
  }, [accessId, interactLoading, optimisticFavourites, isDemo]);

  const handleReport = useCallback(async (assetId: string) => {
    // In demo mode, simulate report without Edge Function call
    if (isDemo) return;
    try {
      await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_hash: accessId,
          action: 'report',
          asset_id: assetId,
          reason: 'Reported by guest via lightbox',
        }),
      });
    } catch { /* silent */ }
  }, [accessId, isDemo]);

  const handleRemoveUpload = useCallback(async (assetId: string) => {
    // In demo mode, simulate removal locally
    if (isDemo) {
      setLocalRemoved((prev) => new Set(prev).add(assetId));
      return;
    }
    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_hash: accessId,
          action: 'remove_upload',
          asset_id: assetId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setLocalRemoved((prev) => new Set(prev).add(assetId));
      }
    } catch { /* silent */ }
  }, [accessId, isDemo]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // ── Render branches ──

  // Loading
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-8">
          <div className="animate-pulse h-9 w-48 bg-secondary-100 rounded-lg mb-3" />
          <div className="animate-pulse h-5 w-72 bg-secondary-100 rounded" />
        </div>
        <GallerySkeleton />
      </div>
    );
  }

  // No data (error state)
  if (!data) return null;

  // Gallery not shown
  if (!showGallery) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <GalleryDisabled />
      </div>
    );
  }

  // No gallery configured
  if (!gallery || albums.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-camera-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-3xl text-foreground-900 mb-3">Wedding Gallery</h1>
          <p className="text-sm text-foreground-500 leading-relaxed max-w-md mx-auto">
            The couple haven&apos;t shared any photos yet. Once they add albums and pictures, they&apos;ll appear here for you to enjoy.
          </p>
        </div>
      </div>
    );
  }

  const hasAnyUploadAlbum = albums.some((a) => a.allow_uploads);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-3">
          Wedding Gallery
        </h1>
        <p className="text-sm text-foreground-500 max-w-lg">
          Browse photos shared by the couple and other guests. {hasAnyUploadAlbum && 'You can also upload your own photos to share with everyone.'}
        </p>
      </div>

      {/* ── Pending uploads ── */}
      {pendingUploads.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground-900 mb-3 flex items-center gap-2">
            <i className="ri-time-line text-amber-500" />
            Your pending uploads
          </h2>
          <p className="text-xs text-foreground-400 mb-4">
            These photos are awaiting approval from the couple. You can remove them if you change your mind.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingUploads.map((asset) => (
              <PendingUploadCard
                key={asset.id}
                asset={asset}
                onRemove={handleRemoveUpload}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Album tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {albumTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAlbumId(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              activeAlbumId === tab.id
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300 hover:text-foreground-900'
            }`}
          >
            <i className={`${tab.icon} text-xs`} />
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[22px] text-center ${
              activeAlbumId === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-secondary-100 text-foreground-500'
            }`}>
              {tab.count}
            </span>
            {tab.hasUploads && (
              <i className={`ri-upload-cloud-2-line text-[10px] ${
                activeAlbumId === tab.id ? 'text-white/60' : 'text-primary-400'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* ── Upload CTA ── */}
      {(activeAlbum?.allow_uploads || isDemo) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {activeAlbum?.allow_uploads && !isDemo && (
            <button
              onClick={() => {
                setUploadAlbumId(activeAlbum.id);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-label font-medium hover:bg-primary-100 transition-colors cursor-pointer whitespace-nowrap border border-primary-200"
            >
              <i className="ri-upload-cloud-2-line" /> Upload a photo to {activeAlbum.title}
            </button>
          )}
          {isDemo && !demoUploadDone && (
            <button
              onClick={() => setDemoUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-camera-line" /> Share a wedding moment
            </button>
          )}
          {isDemo && demoUploadDone && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-label font-medium border border-emerald-200">
              <i className="ri-check-double-line" /> Your photo has been sent to Emma &amp; James for approval
            </div>
          )}
        </div>
      )}

      {/* ── Main grid ── */}
      {enrichedAssets.length === 0 ? (
        <GalleryEmpty />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {enrichedAssets.map((asset, index) => (
            <button
              key={asset.id}
              onClick={() => openLightbox(index)}
              className="relative group rounded-xl overflow-hidden bg-background-50 aspect-[4/3] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {asset.signed_url ? (
                <img
                  src={asset.signed_url}
                  alt={asset.title || 'Wedding gallery photo'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary-100">
                  <i className="ri-image-line text-3xl text-foreground-300" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Favourite icon */}
              {currentLightboxAlbum?.allow_favourites && asset.is_favourited && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                  <i className="ri-heart-fill text-red-400 text-sm" />
                </div>
              )}

              {/* Featured badge */}
              {asset.is_featured && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent-500 text-white text-[10px] font-label font-semibold">
                  Featured
                </div>
              )}

              {/* Caption on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {asset.title && (
                  <p className="text-xs text-white font-medium truncate">{asset.title}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Global upload CTA ── */}
      {activeAlbumId === 'all' && hasAnyUploadAlbum && !activeAlbum?.allow_uploads && (
        <div className="mt-8 text-center">
          <p className="text-xs text-foreground-400 mb-3">
            Select an album above to upload your own photos
          </p>
        </div>
      )}

      {/* ── Photo count ── */}
      <p className="text-xs text-foreground-350 text-center mt-10">
        {enrichedAssets.length} photo{enrichedAssets.length !== 1 ? 's' : ''}
        {gallery.total_assets > 0 && ` of ${gallery.total_assets} total`}
      </p>

      {/* ── Lightbox ── */}
      {lightboxOpen && enrichedAssets.length > 0 && currentLightboxAlbum && (
        <Lightbox
          assets={enrichedAssets}
          currentIndex={lightboxIndex}
          album={currentLightboxAlbum}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
          onFavourite={handleFavourite}
          onReport={handleReport}
        />
      )}

      {/* ── Upload modal ── */}
      {showUploadModal && (
        <UploadModal
          albumId={uploadAlbumId}
          albumTitle={activeAlbum?.title || 'Gallery'}
          sessionHash={accessId || ''}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* ── Demo upload modal ── */}
      {demoUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDemoUploadOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg text-foreground-900">Share a wedding moment</h3>
              <button onClick={() => setDemoUploadOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>

            {demoUploading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
                  <i className="ri-scan-line text-2xl animate-pulse" />
                </div>
                <p className="text-sm text-foreground-700 font-label mb-1">Scanning your photo...</p>
                <p className="text-xs text-foreground-400">Simulated safety check for demonstration</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-foreground-500 mb-3">
                  Demo upload — this image remains on this device and is not sent to a server.
                  A prepared demo image will be used for the simulation.
                </p>
                {demoUploadError && (
                  <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded">{demoUploadError}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-label text-foreground-500 mb-1 block">Image</label>
                    <div className="w-full h-32 rounded-lg bg-secondary-100 flex items-center justify-center border border-secondary-200">
                      <div className="text-center">
                        <i className="ri-image-add-line text-2xl text-foreground-300 mb-1 block" />
                        <span className="text-[11px] text-foreground-400">Demo image will be used</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-label text-foreground-500 mb-1 block">Caption <span className="text-red-400">*</span></label>
                    <input type="text" value={demoCaption} onChange={(e) => setDemoCaption(e.target.value)} placeholder="What's happening in this photo?" maxLength={200} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none focus:border-primary-300" />
                  </div>
                  <div>
                    <label className="text-[11px] font-label text-foreground-500 mb-1 block">Album</label>
                    <select value={demoAlbum} onChange={(e) => setDemoAlbum(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none cursor-pointer">
                      <option value="demo-album-engagement">Engagement Shoot</option>
                      <option value="demo-album-welcome">Welcome Drinks</option>
                      <option value="demo-album-ceremony">Ceremony</option>
                      <option value="demo-album-reception">Reception & Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-label text-foreground-500 mb-1 block">Display name</label>
                    <input type="text" defaultValue="Oliver Bennett" readOnly className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-500 bg-background-50 outline-none" />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={demoConsent} onChange={(e) => setDemoConsent(e.target.checked)} className="mt-0.5 cursor-pointer" />
                    <span className="text-xs text-foreground-600 leading-relaxed">I confirm this is a simulated demo upload. No real photo is stored on any server.</span>
                  </label>
                </div>
                <button
                  onClick={() => {
                    if (!demoCaption.trim()) { setDemoUploadError('Please add a caption for your photo.'); return; }
                    if (!demoConsent) { setDemoUploadError('Please confirm the consent checkbox.'); return; }
                    if (!demoData) return;
                    setDemoUploading(true);
                    setTimeout(() => {
                      demoData.addGalleryItem({
                        id: `demo-gallery-guest-${Date.now()}`,
                        wedding_id: demoData.state.wedding.id,
                        album_id: demoAlbum,
                        image_src: 'https://readdy.ai/api/search-image?query=Candid%20moment%20of%20wedding%20guests%20laughing%20and%20enjoying%20the%20celebration%2C%20warm%20ambient%20lighting%2C%20joyful%20atmosphere%2C%20documentary%20wedding%20photography%20style%2C%20soft%20focus%20background%2C%20natural%20expressions&width=800&height=600&seq=wedora-demo-guest-upload&orientation=landscape',
                        caption: demoCaption,
                        uploader_name: 'Oliver Bennett',
                        upload_time: new Date().toISOString(),
                        moderation_status: 'needs_review',
                        favourite_count: 0,
                        reported: false,
                        ai_label: 'Guest upload, simulated scan',
                        wall_visible: false,
                      });
                      demoData.addDemoActivity({
                        id: `demo-activity-upload-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        message: 'Oliver Bennett submitted a new photo — awaiting review.',
                        category: 'gallery',
                        related_guest: 'Oliver Bennett',
                        wedding_id: demoData.state.wedding.id,
                      });
                      setDemoUploading(false);
                      setDemoUploadOpen(false);
                      setDemoUploadDone(true);
                      setDemoCaption('');
                      setDemoConsent(false);
                      setDemoUploadError('');
                    }, 2000);
                  }}
                  disabled={!demoCaption.trim() || !demoConsent}
                  className="w-full mt-4 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap transition-colors"
                >
                  Submit demo photo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}