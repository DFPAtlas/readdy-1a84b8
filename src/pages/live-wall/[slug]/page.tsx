import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useGalleryRealtime, type WallAsset } from '@/hooks/useGalleryRealtime';

// ── Non-demo: Live wall with Supabase Realtime ──

function RealLiveWall({ weddingId, slug }: { weddingId: string; slug: string }) {
  const { wallAssets, loading, lastEvent } = useGalleryRealtime(weddingId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showUploaderNames, setShowUploaderNames] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [transitionSpeed, setTransitionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [showQR, setShowQR] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);

  const speedMs = transitionSpeed === 'slow' ? 8000 : transitionSpeed === 'fast' ? 3000 : 5000;
  const fadeDuration = transitionSpeed === 'slow' ? '1.5s' : transitionSpeed === 'fast' ? '0.6s' : '1s';

  // Monitor connection
  useEffect(() => {
    if (lastEvent) {
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    }
    const interval = setInterval(() => {
      if (!lastEvent || Date.now() - (lastEvent ? 0 : Date.now()) > 15000) {
        reconnectAttempts.current++;
        if (reconnectAttempts.current > 2) {
          setConnectionStatus('reconnecting');
        }
        if (reconnectAttempts.current > 5) {
          setConnectionStatus('disconnected');
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastEvent]);

  const currentItem = wallAssets[currentIndex];

  // Crossfade transitions
  const advanceSlide = useCallback(() => {
    if (wallAssets.length <= 1) return;
    setFadeState('out');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % wallAssets.length);
      setFadeState('in');
    }, 400);
  }, [wallAssets.length]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || wallAssets.length <= 1) return;
    const interval = setInterval(advanceSlide, speedMs);
    return () => clearInterval(interval);
  }, [isPaused, wallAssets.length, speedMs, advanceSlide]);

  // When assets change (realtime), reset if needed
  useEffect(() => {
    if (currentIndex >= wallAssets.length && wallAssets.length > 0) {
      setCurrentIndex(0);
    }
  }, [wallAssets.length, currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsFullscreen(false); setShowQR(false); }
      if (e.key === 'ArrowRight') advanceSlide();
      if (e.key === 'ArrowLeft' && wallAssets.length > 1) {
        setFadeState('out');
        setTimeout(() => {
          setCurrentIndex((prev) => (prev - 1 + wallAssets.length) % wallAssets.length);
          setFadeState('in');
        }, 400);
      }
      if (e.key === ' ') { e.preventDefault(); setIsPaused((p) => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advanceSlide, wallAssets.length]);

  // Hide controls after mouse idle
  useEffect(() => {
    if (showControls) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 4000);
    }
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, [showControls]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-foreground-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/20 border-t-white/60 animate-spin mb-4" />
          <p className="text-white/40 text-sm">Loading photo wall...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (wallAssets.length === 0) {
    return (
      <div className="min-h-screen bg-foreground-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-white/5 text-white/30 mb-6">
            <i className="ri-camera-line text-4xl" />
          </div>
          <h1 className="font-heading text-2xl text-white/60 mb-3">Wedding Photo Wall</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Photos shared during the celebration will appear here in real time. Guests can upload from their Vowora invitation.
          </p>
          <button
            onClick={() => setShowQR(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white/70 text-sm font-label font-medium hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-qr-code-line text-lg" /> Show upload QR code
          </button>
          <p className="text-white/20 text-xs mt-10">
            Display this page on a screen at your reception
          </p>
        </div>
        {showQR && (
          <QRCodeOverlay
            slug={slug}
            onClose={() => setShowQR(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen bg-foreground-950 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}
      onMouseMove={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground-900 via-foreground-950 to-foreground-900" />

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-white/10 text-white/60 mb-4">
              <i className="ri-pause-circle-line text-3xl" />
            </div>
            <p className="text-white/70 text-lg font-heading">Photo wall paused</p>
            <p className="text-white/40 text-xs mt-2">Press space or tap play to resume</p>
          </div>
        </div>
      )}

      {/* Main slideshow */}
      <div className="relative z-10 h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
          {currentItem && (
            <div className="relative max-w-full max-h-full">
              {currentItem.mime_type?.startsWith('video/') ? (
                <video
                  src={currentItem.signed_url}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    opacity: fadeState === 'in' ? 1 : 0,
                    transition: `opacity ${fadeDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                  onEnded={advanceSlide}
                />
              ) : (
                <img
                  src={currentItem.signed_url}
                  alt={currentItem.caption || currentItem.title || 'Wedding photo'}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                  style={{
                    opacity: fadeState === 'in' ? 1 : 0,
                    transition: `opacity ${fadeDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                />
              )}

              {/* Caption overlay */}
              {(showCaptions || showUploaderNames) && currentItem.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6 rounded-b-lg">
                  {showCaptions && currentItem.caption && (
                    <p className="text-white/90 text-sm md:text-base font-label leading-relaxed">{currentItem.caption}</p>
                  )}
                  {showUploaderNames && currentItem.credit_name && (
                    <p className="text-white/50 text-xs mt-1">
                      {currentItem.credit_visibility === 'first_name_only'
                        ? `by ${currentItem.credit_name.split(' ')[0]}`
                        : currentItem.credit_visibility === 'full_name' || currentItem.credit_visibility === 'display_name'
                          ? `by ${currentItem.credit_name}`
                          : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom control bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-500 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4 md:px-6">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {wallAssets.length > 15 ? (
                  <span className="text-white/40 text-xs font-label">
                    {currentIndex + 1} / {wallAssets.length}
                  </span>
                ) : (
                  wallAssets.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setFadeState('out'); setTimeout(() => { setCurrentIndex(idx); setFadeState('in'); }, 200); }}
                      className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                        idx === currentIndex ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Photo ${idx + 1}`}
                    />
                  ))
                )}
              </div>

              {/* Center: connection status */}
              <div className="hidden sm:flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400' :
                  connectionStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
                  'bg-red-400'
                }`} />
                <span className="text-white/30 text-xs">
                  {connectionStatus === 'connected' ? 'Live' :
                   connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                   'Offline'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <button onClick={() => setShowQR(!showQR)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${showQR ? 'text-white bg-white/20' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title="QR upload code">
                  <i className="ri-qr-code-line text-sm" />
                </button>
                <button onClick={() => setShowUploaderNames(!showUploaderNames)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${showUploaderNames ? 'text-white/80 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title="Toggle names">
                  <i className="ri-user-line text-sm" />
                </button>
                <button onClick={() => setShowCaptions(!showCaptions)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${showCaptions ? 'text-white/80 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title="Toggle captions">
                  <i className="ri-file-text-line text-sm" />
                </button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                  <i className={`ri-${isFullscreen ? 'fullscreen-exit' : 'fullscreen'}-line text-sm`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top bar */}
        <div className={`absolute top-0 left-0 right-0 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-gradient-to-b from-black/60 to-transparent pt-4 pb-8 px-4 md:px-6">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <span className="font-heading text-white/40 text-sm">Vowora</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTransitionSpeed('slow')}
                  className={`px-2 py-1 rounded text-[10px] font-label cursor-pointer transition-colors ${
                    transitionSpeed === 'slow' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Slow
                </button>
                <button
                  onClick={() => setTransitionSpeed('medium')}
                  className={`px-2 py-1 rounded text-[10px] font-label cursor-pointer transition-colors ${
                    transitionSpeed === 'medium' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Med
                </button>
                <button
                  onClick={() => setTransitionSpeed('fast')}
                  className={`px-2 py-1 rounded text-[10px] font-label cursor-pointer transition-colors ${
                    transitionSpeed === 'fast' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Fast
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsPaused(!isPaused)} className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${isPaused ? 'text-amber-400 bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`} title={isPaused ? 'Resume' : 'Pause'}>
                  <i className={`ri-${isPaused ? 'play' : 'pause'}-line text-sm`} />
                </button>
                <Link to={`/app/gallery-control`} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 text-[10px] font-label cursor-pointer whitespace-nowrap transition-colors">
                  Control
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code overlay */}
        {showQR && (
          <QRCodeOverlay
            slug={slug}
            onClose={() => setShowQR(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── QR Code overlay component ──

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
  const isDemo = isDemoMode && slug === DEMO_CONFIG.publicSlug;
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [loadingWedding, setLoadingWedding] = useState(!isDemo);

  // For non-demo walls, look up the wedding by slug
  useEffect(() => {
    if (isDemo) {
      setLoadingWedding(false);
      return;
    }

    if (!slug) {
      setLoadingWedding(false);
      return;
    }

    supabase
      .from('weddings')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setWeddingId((data as { id: string }).id);
        }
        setLoadingWedding(false);
      })
      .catch(() => setLoadingWedding(false));
  }, [slug, isDemo]);

  if (loadingWedding) {
    return (
      <div className="min-h-screen bg-foreground-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/40">
          <i className="ri-loader-4-line animate-spin text-xl" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (isDemo) {
    return <DemoLiveWall />;
  }

  if (!weddingId) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-5">
            <i className="ri-tv-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Photo Wall Unavailable</h1>
          <p className="text-sm text-foreground-600 mb-6">This photo wall is not available. Please check the link and try again.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            Back to Vowora
          </Link>
        </div>
      </div>
    );
  }

  return <RealLiveWall weddingId={weddingId} slug={slug || ''} />;
}