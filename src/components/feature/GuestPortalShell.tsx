import type * as React from "react";
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import type { GuestAccessResponse } from '@/types/access';

const STORAGE_PREFIX = 'vowora_guest_';

export function useGuestData(accessId: string | undefined) {
  const [data, setData] = useState<(GuestAccessResponse & { session_id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessId) {
      setError('No access session found.');
      setLoading(false);
      return;
    }

    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${accessId}`);
      if (!raw) {
        setError('Your guest session has expired or is invalid. Please use your invitation link again.');
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw);
      setData({ ...parsed, session_id: accessId });
    } catch {
      setError('Could not load your guest session.');
    } finally {
      setLoading(false);
    }
  }, [accessId]);

  return { data, loading, error };
}

const GUEST_NAV_ITEMS = [
  { label: 'Invitation', href: '', icon: 'ri-mail-open-line' },
  { label: 'Wedding details', href: '/details', icon: 'ri-heart-line' },
  { label: 'Seating', href: '/seating', icon: 'ri-user-location-line' },
  { label: 'Travel', href: '/travel', icon: 'ri-map-pin-line' },
  { label: 'Updates', href: '/updates', icon: 'ri-notification-3-line' },
];

export default function GuestPortalShell({
  children,
  guestPath,
}: {
  children: React.ReactNode;
  guestPath: string;
}) {
  const { accessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error } = useGuestData(accessId);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLeave = () => {
    if (accessId) {
      try { localStorage.removeItem(`${STORAGE_PREFIX}${accessId}`); } catch { /* ignore */ }
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <h1 className="font-heading text-xl text-foreground-900 mb-2">Session Unavailable</h1>
          <p className="text-sm text-foreground-500 mb-6">{error || 'Your session has ended.'}</p>
          <button onClick={handleLeave} className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
            Return to website
          </button>
        </div>
      </div>
    );
  }

  const wedding = data.wedding;
  const basePath = `/guest/${accessId}`;

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-secondary-100">
        <div className="max-w-6xl mx-auto flex items-center h-14 px-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer flex-shrink-0"
              aria-label="Menu"
            >
              <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line`} />
            </button>
            <Link to={basePath} className="font-heading text-lg font-semibold text-foreground-900 truncate cursor-pointer whitespace-nowrap">
              {wedding.partner_one_name} &amp; {wedding.partner_two_name}
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Guest navigation">
            {GUEST_NAV_ITEMS.map((item) => {
              const href = item.href ? `${basePath}${item.href}` : basePath;
              const isActive = item.href === '' ? guestPath === '' : guestPath === item.href;
              return (
                <Link
                  key={item.label}
                  to={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                  }`}
                >
                  <i className={`${item.icon} text-xs`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleLeave}
              className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap flex items-center gap-1"
              title="Leave guest portal"
            >
              <i className="ri-logout-box-line" /> Leave
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-14 left-0 w-56 bg-white z-50 border-r border-secondary-100 h-[calc(100vh-3.5rem)] md:hidden">
            <nav className="py-2 px-2 space-y-0.5">
              {GUEST_NAV_ITEMS.map((item) => {
                const href = item.href ? `${basePath}${item.href}` : basePath;
                const isActive = item.href === '' ? guestPath === '' : guestPath === item.href;
                return (
                  <Link
                    key={item.label}
                    to={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-label transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-foreground-600 hover:bg-background-100'
                    }`}
                  >
                    <i className={`${item.icon} text-base w-5 text-center`} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-secondary-100 mt-2">
                <button
                  onClick={handleLeave}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground-400 hover:bg-background-100 w-full text-left cursor-pointer"
                >
                  <i className="ri-logout-box-line text-base w-5 text-center" /> Leave portal
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-secondary-100 bg-white">
        <p className="text-xs text-foreground-400">
          {wedding.partner_one_name} &amp; {wedding.partner_two_name} · Wedding on{' '}
          {wedding.wedding_date
            ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : ''}
        </p>
        <p className="text-[10px] text-foreground-300 mt-1">This is a private guest portal. Please do not share.</p>
      </footer>
    </div>
  );
}

export { STORAGE_PREFIX };