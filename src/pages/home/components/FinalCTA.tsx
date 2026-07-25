import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const sectionH = rect.height;
        const progress = 1 - rect.bottom / (viewportH + sectionH);
        const clamped = Math.max(0, Math.min(1, progress));
        setParallaxY(clamped * 70);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full py-28 md:py-36 overflow-hidden">
      {/* Background image with parallax */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Elegant%20wedding%20reception%20table%20setting%20with%20soft%20candlelight%2C%20cream%20linen%2C%20fresh%20floral%20arrangements%20in%20muted%20rose%20and%20sage%20tones%2C%20delicate%20glassware%2C%20warm%20ambient%20lighting%2C%20shallow%20depth%20of%20field%2C%20romantic%20atmosphere%2C%20editorial%20photography&width=1800&height=900&seq=final-cta-bg&orientation=landscape"
          alt=""
          className="absolute inset-0 w-full h-[115%] object-cover object-center will-change-transform"
          style={{ transform: `translateY(${-parallaxY}px)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-xl">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-white font-light leading-tight">
            Bring every wedding detail<br />
            into one beautiful place
          </h2>
          <p className="text-white/80 text-base md:text-lg leading-relaxed mt-5 max-w-md">
            Start creating your Wedora space and make planning easier for you, your partner and every guest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white text-foreground-900 px-6 py-3.5 text-sm font-medium font-label cursor-pointer hover:bg-white/90 transition-all"
            >
              Start planning
              <span className="w-5 h-5 flex items-center justify-center ml-2">
                <i className="ri-arrow-right-line text-sm" />
              </span>
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-white/30 text-white px-6 py-3.5 text-sm font-medium font-label cursor-pointer hover:bg-white/10 transition-all"
            >
              View features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}