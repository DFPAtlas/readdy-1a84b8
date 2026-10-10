import PublicPhotoWall from '@/components/feature/PublicPhotoWall';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useGalleryRealtime, type WallAsset } from '@/hooks/useGalleryRealtime';

// ── Non-demo: Live wall with Supabase Realtime ──

function QRCodeOverlay({ slug, onClose }: { slug: string; onClose: () => void }) {
  const uploadUrl = `${window.location.origin}/guest/${slug}/gallery`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer"
          aria-label="Close"
        >
          <i className="ri-close-line" />
        </button>

        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-5">
          <i className="ri-camera-line text-3xl" />
        </div>
        <h2 className="font-heading text-xl text-foreground-900 mb-2">Share your photos</h2>
        <p className="text-sm text-foreground-500 mb-6 leading-relaxed">
          Scan the QR code or visit the link below to upload your wedding photos.
        </p>

        {/* QR Code placeholder — in production use a real QR generation */}
        <div className="w-48 h-48 mx-auto bg-secondary-100 rounded-xl flex items-center justify-center mb-4">
          <div className="text-center">
            <i className="ri-qr-code-line text-5xl text-foreground-400 block mb-2" />
            <span className="text-[10px] text-foreground-400 font-label">QR Code</span>
          </div>
        </div>

        <p className="text-xs text-foreground-400 break-all mb-6 px-4">{uploadUrl}</p>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(uploadUrl).catch(() => {});
            }}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-file-copy-line mr-1.5" /> Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Demo wall (preserved from existing) ──

function DemoLiveWall() {
  const demo = useDemoDataSafe();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showNames, setShowNames] = useState(true);

  const wallItems = useMemo(() => {
    if (!demo) return [];
    return demo.state.galleryItems.filter((gi) => gi.moderation_status === 'approved' && gi.wall_visible);
  }, [demo?.state.galleryItems]);

  const settings = demo?.state.gallerySettings;
  const isPaused = settings?.wall_paused ?? false;
  const speedMs = settings?.wall_transition_speed === 'slow' ? 8000 : settings?.wall_transition_speed === 'fast' ? 3000 : 5000;

  useEffect(() => {
    if (isPaused || wallItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wallItems.length);
    }, speedMs);
    return () => clearInterval(interval);
  }, [isPaused, wallItems.length, speedMs]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev + 1) % Math.max(1, wallItems.length));
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev - 1 + Math.max(1, wallItems.length)) % Math.max(1, wallItems.length));
      if (e.key === ' ') { e.preventDefault(); demo?.updateGallerySettings({ wall_paused: !isPaused }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wallItems.length, isPaused, demo]);

  const currentItem = wallItems[currentIndex];

  if (!demo) {
    return (
      <div className="min-h-screen bg-foreground-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/40">
          <i className="ri-loader-4-line animate-spin text-xl" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  const wedding = demo.state.wedding;

  return (
    <div className={`relative min-h-screen bg-foreground-950 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}
      onMouseMove={() => { setShowControls(true); setTimeout(() => setShowControls(false), 3000); }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-foreground-900 via-foreground-950 to-foreground-900" />
      <div className="relative z-10 h-screen flex flex-col">
        {isPaused && wallItems.length > 0 && (
          <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-white/10 text-white/60 mb-4">
                <i className="ri-pause-circle-line text-3xl" />
              </div>
              <p className="text-white/70 text-lg font-heading">Photo wall paused</p>
              <p className="text-white/40 text-xs mt-2">{wedding.partner_one_name} &amp; {wedding.partner_two_name} · 24 April 2027</p>
            </div>
          </div>
        )}
        {wallItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-4">
              <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 text-white/30 mb-6">
                <i className="ri-camera-line text-4xl" />
              </div>
              <h1 className="font-heading text-2xl text-white/60 mb-3">{wedding.partner_one_name} &amp; {wedding.partner_two_name}</h1>
              <p className="text-white/40 text-sm mb-2">24 April 2027 · {wedding.location}</p>
              <p className="text-white/30 text-sm leading-relaxed">Photos shared during the celebration will appear here.</p>
              <p className="text-white/20 text-xs mt-6">Guests can upload from their Vowora invitation.</p>
            </div>
          </div>
        )}
        {wallItems.length > 0 && currentItem && (
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
            <div className="relative max-w-full max-h-full">
              <img
                src={currentItem.image_src}
                alt={currentItem.caption || 'Wedding photo'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                style={{ transition: `opacity ${speedMs > 4000 ? '1.5s' : '0.8s'} ease-in-out` }}
              />
              {(showCaptions || showNames) && currentItem.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6 rounded-b-lg">
                  {showCaptions && <p className="text-white/90 text-sm md:text-base font-label leading-relaxed">{currentItem.caption}</p>}
                  {showNames && currentItem.uploader_name && <p className="text-white/50 text-xs mt-1">by {currentItem.uploader_name}</p>}
                </div>
              )}
            </div>
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4 md:px-6">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-1.5">
                {wallItems.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`} aria-label={`Photo ${idx + 1}`} />
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-white/50 text-xs font-label font-medium tracking-wider uppercase">{wedding.partner_one_name} &amp; {wedding.partner_two_name}</span>
                <span className="text-white/20">·</span>
                <span className="text-white/40 text-xs">24 April 2027</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                  <i className={`ri-${isFullscreen ? 'fullscreen-exit' : 'fullscreen'}-line text-sm`} />
                </button>
                <button onClick={() => setShowNames(!showNames)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${showNames ? 'text-white/80 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title="Toggle names">
                  <i className="ri-user-line text-sm" />
                </button>
                <button onClick={() => setShowCaptions(!showCaptions)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${showCaptions ? 'text-white/80 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title="Toggle captions">
                  <i className="ri-file-text-line text-sm" />
                </button>
                <button onClick={() => { setCurrentIndex((prev) => (prev - 1 + wallItems.length) % wallItems.length); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors" title="Previous">
                  <i className="ri-skip-back-line text-sm" />
                </button>
                <button onClick={() => demo.updateGallerySettings({ wall_paused: !isPaused })} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${isPaused ? 'text-amber-400 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title={isPaused ? 'Resume' : 'Pause'}>
                  <i className={`ri-${isPaused ? 'play' : 'pause'}-line text-sm`} />
                </button>
                <button onClick={() => { setCurrentIndex((prev) => (prev + 1) % wallItems.length); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors" title="Next">
                  <i className="ri-skip-forward-line text-sm" />
                </button>
                <Link to="/app/gallery-control" className="ml-2 px-2.5 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 text-[10px] font-label cursor-pointer whitespace-nowrap transition-colors" title="Return to Gallery Control">
                  <i className="ri-dashboard-line mr-1" />Gallery Control
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className={`absolute top-4 left-4 md:top-6 md:left-6 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <span className="font-heading text-white/40 text-sm">Vowora</span>
        </div>
        <div className={`absolute top-4 right-4 md:top-6 md:right-6 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-white/25 text-[10px] text-right">
            <p className="mb-0.5">Share your wedding moments</p>
            <p>Upload from your Vowora invitation</p>
          </div>
        </div>
        {wallItems.length > 0 && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white/50 text-xs font-label">{currentIndex + 1} / {wallItems.length}</span>
          </div>
        )}
      </div>
      {!isFullscreen && wallItems.length > 0 && (
        <button onClick={() => setIsFullscreen(true)} className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-white/80 hover:bg-white/20 cursor-pointer transition-all" title="Enter fullscreen">
          <i className="ri-fullscreen-line text-lg" />
        </button>
      )}
    </div>
  );
}

// ── Main export ──

export default function LivePhotoWallPage() {
  const { slug } = useParams();
  return isDemoMode && slug === DEMO_CONFIG.publicSlug ? <DemoLiveWall /> : <PublicPhotoWall slug={slug} />;
}
