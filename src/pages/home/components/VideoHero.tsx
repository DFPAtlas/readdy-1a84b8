import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface VideoHeroProps {
  videoSrc: string;
  posterSrc: string;
}

export default function VideoHero({ videoSrc, posterSrc }: VideoHeroProps) {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preload poster image so we know when either video or poster is ready
  useEffect(() => {
    const img = new Image();
    img.src = posterSrc;
    img.onload = () => setPosterLoaded(true);
    img.onerror = () => setPosterLoaded(true); // still hide loader on error
  }, [posterSrc]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || videoError || prefersReducedMotion) return;
    const playPromise = vid.play();
    if (playPromise) {
      playPromise.catch(() => {
        setVideoError(true);
      });
    }
  }, [videoError, prefersReducedMotion]);

  const showPoster = videoError || prefersReducedMotion;
  const heroReady = videoLoaded || posterLoaded;

  return (
    <section className="relative w-full h-screen min-h-[600px] max-h-[900px] overflow-hidden" aria-label="Wedora hero">
      {/* Loading screen */}
      {!heroReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white transition-opacity duration-700">
          <div className="text-center">
            <p className="font-heading text-3xl md:text-4xl text-foreground-900 tracking-tight">
              Wedora
            </p>
            <div className="mt-4 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Background layer */}
      <div className="absolute inset-0">
        {/* Video */}
        {!showPoster && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={videoSrc}
            poster={posterSrc}
            muted
            autoPlay
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            aria-hidden="true"
          />
        )}

        {/* Poster image — fallback only */}
        {showPoster && (
          <img
            src={posterSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
        )}

        {/* Warm overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-white/80 text-xs md:text-sm tracking-widest uppercase font-label mb-4 md:mb-6">
              Your complete wedding planning space
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-light leading-tight">
              Your wedding,<br />beautifully organised.
            </h1>
            <p className="text-white/80 text-sm md:text-base lg:text-lg leading-relaxed mt-6 max-w-lg">
              Create your wedding website, manage every guest, collect RSVPs, share updates and help everyone plan their journey — all from one beautiful place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white text-foreground-900 px-6 py-3.5 text-sm font-medium font-label cursor-pointer hover:bg-white/90 transition-all"
              >
                Start planning your wedding
                <span className="w-5 h-5 flex items-center justify-center ml-2">
                  <i className="ri-arrow-right-line text-sm" />
                </span>
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-white/30 text-white px-6 py-3.5 text-sm font-medium font-label cursor-pointer hover:bg-white/10 transition-all"
              >
                Explore Wedora
              </Link>
            </div>
            <p className="text-white/60 text-xs mt-6 font-label">
              Built for couples, planners and every guest joining the celebration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}