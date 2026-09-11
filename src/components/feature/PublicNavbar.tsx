import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface PublicNavbarProps {
  transparent?: boolean;
}

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Guest Experience', href: '/guest-experience' },
  { label: 'Travel Concierge', href: '/travel-concierge' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export default function PublicNavbar({ transparent: initialTransparent = true }: PublicNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isTransparent = initialTransparent && !scrolled;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-white border-b border-secondary-100'
        }`}
      >
        <nav className="w-full px-4 md:px-6 lg:px-8" role="navigation" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link
              to="/"
              className={`font-heading text-2xl font-semibold tracking-tight cursor-pointer transition-colors ${
                isTransparent ? 'text-white' : 'text-foreground-900'
              }`}
              aria-label="Vowora home"
            >
              Vowora
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isTransparent
                      ? 'text-white/80 hover:text-white'
                      : 'text-foreground-700 hover:text-foreground-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="/invite/DEMO-VOWORA-2026"
                className={`text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isTransparent
                    ? 'text-white/70 hover:text-white border-white/30 hover:border-white/60'
                    : 'text-foreground-500 hover:text-foreground-700 border-secondary-200 hover:border-secondary-400'
                } border rounded-lg px-3 py-1.5`}
              >
                View Demo
              </a>
              <Link
                to="/login"
                className={`text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isTransparent
                    ? 'text-white/80 hover:text-white'
                    : 'text-foreground-700 hover:text-foreground-900'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium font-label transition-all cursor-pointer ${
                  isTransparent
                    ? 'bg-white text-foreground-900 hover:bg-white/90'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                Start planning
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                isTransparent ? 'text-white hover:bg-white/10' : 'text-foreground-800 hover:bg-background-100'
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <i className="ri-close-line text-2xl" />
              ) : (
                <i className="ri-menu-line text-2xl" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="flex flex-col h-full pt-20 px-6">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-foreground-800 text-base font-label py-3 px-2 rounded-md hover:bg-background-100 transition-colors cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-secondary-100 mt-4 pt-4 flex flex-col gap-3">
            <a
              href="/invite/DEMO-VOWORA-2026"
              className="text-foreground-500 text-base font-label py-3 px-2 rounded-md hover:bg-background-100 transition-colors cursor-pointer border border-secondary-200 text-center"
            >
              View Demo
            </a>
            <Link
              to="/login"
              className="text-foreground-800 text-base font-label py-3 px-2 rounded-md hover:bg-background-100 transition-colors cursor-pointer"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 text-white px-5 py-3 text-sm font-medium font-label cursor-pointer hover:bg-primary-600 transition-colors"
            >
              Start planning
            </Link>
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-secondary-200 text-foreground-600 shadow-sm hover:bg-background-50 hover:text-primary-600 hover:border-primary-300 transition-all cursor-pointer"
          aria-label="Back to top"
          title="Back to top"
        >
          <i className="ri-arrow-up-line text-lg" />
        </button>
      )}
    </>
  );
}