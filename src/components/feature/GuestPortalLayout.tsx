import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { GuestPortalProvider, GuestPortalContext, useGuestPortal, clearGuestSession } from '@/hooks/useGuestPortal';
import type { GuestPortalData } from '@/hooks/useGuestPortal';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { buildDemoGuestPortalData } from '@/demo/demoGuestPortalMapping';
import { useDemoTheme } from '@/hooks/useDemoTheme';

// ── NAV ITEMS ──

interface NavItem {
  label: string;
  href: string;
  icon: string;
  settingKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '', icon: 'ri-home-4-line' },
  { label: 'RSVP', href: '/rsvp', icon: 'ri-check-double-line', settingKey: 'rsvp_enabled' },
  { label: 'Itinerary', href: '/itinerary', icon: 'ri-calendar-event-line', settingKey: 'itinerary_enabled' },
  { label: 'Travel & Stay', href: '/travel', icon: 'ri-map-pin-line', settingKey: 'show_travel' },
  { label: 'Updates', href: '/updates', icon: 'ri-notification-3-line', settingKey: 'show_updates' },
  { label: 'Registry', href: '/registry', icon: 'ri-gift-line', settingKey: 'show_registry' },
  { label: 'Gallery', href: '/gallery', icon: 'ri-camera-line', settingKey: 'show_gallery' },
  { label: 'My seating', href: '/seating', icon: 'ri-user-location-line', settingKey: 'seating_enabled' },
  { label: 'Wedding details', href: '/details', icon: 'ri-heart-line' },
  { label: 'Contacts', href: '/contacts', icon: 'ri-contacts-line', settingKey: 'show_contacts' },
  { label: 'Settings', href: '/settings', icon: 'ri-settings-3-line', settingKey: 'settings_enabled' },
];

// ── INTERNAL CONTENT ──

function GuestPortalContent() {
  const { accessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error } = useGuestPortal();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // ── Security: noindex, nofollow meta tag ──
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      try { document.head.removeChild(meta); } catch { /* already removed */ }
    };
  }, []);

  // ── Keyboard: Escape closes drawer ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // ── Focus trap for mobile drawer ──
  useEffect(() => {
    if (!mobileMenuOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;
    prevFocusRef.current = document.activeElement as HTMLElement;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    drawer.addEventListener('keydown', trap);
    first?.focus();

    document.body.style.overflow = 'hidden';

    return () => {
      drawer.removeEventListener('keydown', trap);
      document.body.style.overflow = '';
      prevFocusRef.current?.focus();
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const handleLeave = useCallback(() => {
    clearGuestSession();
    navigate('/');
  }, [navigate]);

  const currentPath = (() => {
    const base = `/guest/${accessId}`;
    if (location.pathname === base) return '';
    return location.pathname.replace(base, '');
  })();

  const isDemoSession = isDemoMode && accessId === DEMO_CONFIG.guestSessionId;

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading your guest portal...</p>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (error || !data) {
    const isExpired = error?.includes('expired');
    const isClosed = error?.includes('closed');
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6">
            <i className={`${isExpired ? 'ri-hourglass-line' : isClosed ? 'ri-door-closed-line' : 'ri-error-warning-line'} text-3xl`} />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">
            {isExpired ? 'Session Expired' : isClosed ? 'Portal Closed' : 'Portal Unavailable'}
          </h1>
          <p className="text-sm text-foreground-500 leading-relaxed mb-6">
            {isExpired
              ? 'Your guest session has ended. Please use your invitation link to return.'
              : isClosed
                ? 'This guest portal is now closed. Please contact the couple if you need any information.'
                : error || 'Your session is no longer valid.'}
          </p>
          {!isClosed && (
            <button
              onClick={handleLeave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Return to website
            </button>
          )}
        </div>
      </div>
    );
  }

  const settings = data.portal_settings || {};
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.settingKey) return true;
    const key = item.settingKey as keyof typeof settings;
    const val = settings[key];
    if (val === undefined || val === null) return true;
    return val === true;
  });

  const wedding = data.wedding;
  const basePath = `/guest/${accessId}`;
  const unreadUpdateCount = data.updates?.unread_count || 0;

  const primaryRecipient = data.recipients[0];
  const guestDisplayName = primaryRecipient?.preferred_name || primaryRecipient?.guest_name || 'Guest';

  const guestInitials = guestDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── SIDEBAR RENDERER ──
  const renderSidebarContent = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <Link to={basePath} className="inline-block cursor-pointer" onClick={onItemClick}>
          <span className="font-heading text-xl font-semibold text-foreground-900 tracking-tight">Vowora</span>
        </Link>
        <p className="text-[10px] text-foreground-400 font-label uppercase tracking-widest mt-0.5">Guest Portal</p>
      </div>
      <div className="px-5 pb-2 flex-shrink-0">
        <div className="border-t border-secondary-100" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Guest portal navigation">
        <ul className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const isActive = item.href === '' ? currentPath === '' : currentPath.startsWith(item.href);
            const isUpdates = item.href === '/updates';
            return (
              <li key={item.label}>
                <Link
                  to={item.href ? `${basePath}${item.href}` : basePath}
                  onClick={onItemClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-label transition-colors cursor-pointer group whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <i className={`${item.icon} text-base w-5 text-center flex-shrink-0 ${isActive ? 'text-primary-500' : 'text-foreground-400 group-hover:text-foreground-600'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isUpdates && unreadUpdateCount > 0 && (
                    <span className="px-1.5 py-px rounded-full bg-primary-500 text-white text-[10px] font-medium leading-tight flex-shrink-0">
                      {unreadUpdateCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className="rounded-lg bg-background-100/80 border border-secondary-100 p-4 mb-3">
          <p className="text-xs font-label font-medium text-foreground-900 mb-1">Need help?</p>
          <p className="text-[11px] text-foreground-500 leading-relaxed mb-3">
            Contact the couple or wedding team if you need help with your invitation or wedding information.
          </p>
          {visibleNavItems.some((ni) => ni.href === '/contacts') && (
            <Link
              to={`${basePath}/contacts`}
              onClick={onItemClick}
              className="inline-flex items-center gap-1.5 text-[11px] font-label text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-right-line text-[10px]" /> View contacts
            </Link>
          )}
        </div>
        <p className="text-[10px] text-foreground-300 text-center">
          Powered by <span className="font-label font-medium text-foreground-400">Vowora</span>
        </p>
        {isDemoSession && (
          <Link
            to="/app/dashboard"
            className="mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-label hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line text-[10px]" /> Return to couple dashboard
          </Link>
        )}
      </div>
    </div>
  );

  // ── MAIN LAYOUT ──
  return (
    <div className="min-h-screen bg-background-50 flex">
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 bg-white border-r border-secondary-100 h-screen sticky top-0">
        {renderSidebarContent()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-secondary-100 lg:hidden">
          <div className="flex items-center h-14 px-4">
            <button
              ref={hamburgerRef}
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 cursor-pointer flex-shrink-0 mr-3"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <i className="ri-menu-line text-lg" />
            </button>
            <Link to={basePath} className="font-heading text-base font-semibold text-foreground-900 truncate cursor-pointer whitespace-nowrap flex-1 min-w-0">
              {wedding.partner_one_name} &amp; {wedding.partner_two_name}
            </Link>
          </div>
        </header>

        <div className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-secondary-100 bg-white sticky top-0 z-20">
          <div>
            <p className="text-xs text-foreground-400 font-label uppercase tracking-wider">Guest Portal</p>
            <p className="text-sm text-foreground-900 font-label font-medium">Welcome, {guestDisplayName}</p>
          </div>
          <div className="flex items-center gap-3" ref={profileMenuRef}>
            {isDemoSession && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-label">Demo Guest View</span>
            )}
            {visibleNavItems.some((ni) => ni.href === '/settings') && (
              <Link
                to={`${basePath}/settings`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 hover:text-foreground-600 transition-colors cursor-pointer"
                aria-label="Settings"
              >
                <i className="ri-settings-3-line text-sm" />
              </Link>
            )}
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-label font-semibold text-xs">
                {guestInitials}
              </div>
              <span className="text-xs font-label text-foreground-600">{guestDisplayName}</span>
              <i className="ri-arrow-drop-down-line text-foreground-400 text-[10px]" />
            </button>

            {profileMenuOpen && (
              <div className="absolute top-full right-6 mt-1 w-48 bg-white border border-secondary-200 rounded-xl shadow-lg z-50 py-1">
                {isDemoSession && (
                  <Link
                    to="/app/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-dashboard-line text-foreground-400" /> Couple dashboard
                  </Link>
                )}
                <button
                  onClick={() => { setProfileMenuOpen(false); handleLeave(); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-foreground-500 hover:text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap text-left"
                >
                  <i className="ri-logout-box-line" /> Leave Guest Portal
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:hidden px-4 py-3 bg-background-50 border-b border-secondary-100">
          <p className="text-xs text-foreground-500">
            Welcome, <span className="font-medium text-foreground-700">{guestDisplayName}</span>
            {isDemoSession && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-label">Demo</span>
            )}
          </p>
        </div>

        <main id="main-content" className="flex-1" tabIndex={-1} role="main" aria-label="Guest portal content">
          {/* Breadcrumb bar for sub-pages */}
          {currentPath !== '' && (
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-2">
              <nav className="flex items-center gap-2 text-xs text-foreground-400" aria-label="Breadcrumb">
                <Link to={basePath} className="hover:text-foreground-600 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-home-4-line text-[10px]" /> Home
                </Link>
                {visibleNavItems.filter((ni) => ni.href !== '' && currentPath.startsWith(ni.href)).slice(0, 1).map((ni) => (
                  <span key={ni.label} className="flex items-center gap-2">
                    <i className="ri-arrow-right-s-line text-[10px]" />
                    <span className="text-foreground-600 font-medium">{ni.label}</span>
                  </span>
                ))}
              </nav>
            </div>
          )}
          <Outlet />
        </main>

        <footer className="py-6 text-center border-t border-secondary-100 bg-white" role="contentinfo">
          <p className="text-xs text-foreground-400">
            {wedding.partner_one_name} &amp; {wedding.partner_two_name}
            {wedding.wedding_date && (
              <> &middot; {new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
            )}
          </p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <button
              onClick={handleLeave}
              className="text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap transition-colors"
            >
              Leave Guest Portal
            </button>
          </div>
          {isDemoSession && (
            <p className="text-[10px] text-foreground-300 mt-2">Demo mode — this is a private demonstration portal.</p>
          )}
        </footer>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="fixed top-0 left-0 w-64 bg-white z-50 h-full lg:hidden shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            {renderSidebarContent(() => setMobileMenuOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Demo Portal Data Provider ──

function DemoGuestPortalDataProvider({ children }: { children: React.ReactNode }) {
  const demo = useDemoDataSafe();
  const { accessId } = useParams();

  const demoData: GuestPortalData | null = useMemo(() => {
    if (!demo) return null;
    return buildDemoGuestPortalData(demo) as unknown as GuestPortalData;
  }, [demo]);

  if (!demoData) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading demo guest portal...</p>
        </div>
      </div>
    );
  }

  return (
    <GuestPortalContext.Provider value={{
      data: demoData,
      loading: false,
      error: '',
      refresh: async () => {},
      logout: () => {
        try { sessionStorage.removeItem('vowora_guest_session'); } catch { /* ignore */ }
      },
    }}>
      {children}
    </GuestPortalContext.Provider>
  );
}

// ── LAYOUT WRAPPER ──

export default function GuestPortalLayout() {
  const { accessId } = useParams();

  // Apply demo theme colours from settings (no-op in production)
  useDemoTheme();

  // ── Demo Mode: inject demo data for demo-session ──
  if (isDemoMode && accessId === DEMO_CONFIG.guestSessionId) {
    return (
      <DemoGuestPortalDataProvider>
        <GuestPortalContent />
      </DemoGuestPortalDataProvider>
    );
  }

  return (
    <GuestPortalProvider accessId={accessId}>
      <GuestPortalContent />
    </GuestPortalProvider>
  );
}