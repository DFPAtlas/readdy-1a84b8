import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import WeddingSelector from '@/components/feature/WeddingSelector';
import DemoGuide from '@/components/feature/DemoGuide';

const DEMO_SESSION_KEY = 'wedora.demo.session';

// ── Sidebar link definitions ──

const sidebarLinks = [
  { label: 'Dashboard', href: '/app/dashboard', icon: 'ri-dashboard-line' },
  { label: 'Wedding details', href: '/app/wedding', icon: 'ri-heart-line' },
  { label: 'Styleboard', href: '/app/styleboard', icon: 'ri-palette-line' },
  ...(isDemoMode ? [] : [{ label: 'Updates', href: '/app/updates', icon: 'ri-notification-3-line' }]),
];

const guestSubLinks = [
  { label: 'All guests', href: '/app/guests', icon: 'ri-group-line' },
  { label: 'Households', href: '/app/guests/households', icon: 'ri-home-4-line' },
  { label: 'Tags', href: '/app/guests/tags', icon: 'ri-price-tag-3-line' },
  ...(isDemoMode ? [] : [
    { label: 'Import', href: '/app/guests/import', icon: 'ri-upload-line' },
    { label: 'Export', href: '/app/guests/export', icon: 'ri-download-line' },
  ]),
];

const invitationSubLinks = [
  { label: 'All invitations', href: '/app/invitations', icon: 'ri-mail-send-line' },
  { label: 'Create design', href: '/app/invitations/design/new', icon: 'ri-paint-brush-line' },
  { label: 'Templates', href: '/app/invitations/templates', icon: 'ri-layout-line' },
];

const budgetSubLinks = [
  { label: 'Overview', href: '/app/budget', icon: 'ri-money-pound-circle-line' },
  { label: 'Categories', href: '/app/budget/categories', icon: 'ri-list-check' },
  { label: 'Payments', href: '/app/budget/payments', icon: 'ri-bank-card-line' },
  { label: 'Reports', href: '/app/budget/reports', icon: 'ri-bar-chart-line' },
  { label: 'Set Budget', href: '/app/budget/settings', icon: 'ri-settings-3-line' },
  { label: 'Vendor payments', href: '/app/budget/suppliers', icon: 'ri-file-list-3-line' },
  { label: 'Gift fund', href: '/app/budget/gift-funding', icon: 'ri-hand-heart-line' },
];

// Demo mode: simplified bottom links
const demoBottomLinks = [
  { label: 'Seating', href: '/app/seating', icon: 'ri-layout-grid-line' },
  { label: 'Invitations', href: '/app/invitations', icon: 'ri-mail-send-line' },
  { label: 'Budget', href: '/app/budget', icon: 'ri-money-pound-circle-line' },
  { label: 'Guests', href: '/app/guests', icon: 'ri-group-line' },
  { label: 'Travel', href: '/app/travel', icon: 'ri-map-pin-line' },
  { label: 'Gallery & Wall', href: '/app/gallery-control', icon: 'ri-image-line' },
];

// Normal mode: full bottom links
const normalBottomLinks = [
  { label: 'Updates', href: '/app/updates', icon: 'ri-notification-3-line' },
  { label: 'Travel', href: '/app/travel', icon: 'ri-map-pin-line' },
  { label: 'Tasks', href: '/app/tasks', icon: 'ri-calendar-check-line' },
  { label: 'Suppliers', href: '/app/suppliers', icon: 'ri-contacts-book-line' },
  { label: 'Seating', href: '/app/seating', icon: 'ri-layout-grid-line' },
  { label: 'Settings', href: '/app/settings', icon: 'ri-settings-3-line' },
];

const seatingSubLinks = [
  { label: 'Overview', href: '/app/seating', icon: 'ri-layout-grid-line' },
  { label: 'Manage plans', href: '/app/seating/plans', icon: 'ri-list-check' },
];

// ── Sidebar link component ──

function SidebarNavLink({ href, icon, label, isActive, onClick }: {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${
        isActive
          ? 'bg-primary-100 text-primary-700 font-medium'
          : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
      }`}
    >
      <i className={`${icon} text-base w-5 text-center ${isActive ? 'text-primary-600' : 'text-primary-400'}`} />
      {label}
    </Link>
  );
}

// ── Account display helpers ──

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.includes('@')) return email.charAt(0).toUpperCase();
  return 'A';
}

function getDisplayLabel(profile: { first_name?: string | null; last_name?: string | null; display_name?: string | null; email?: string | null } | null): string {
  if (profile?.display_name) return profile.display_name;
  if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
  if (profile?.first_name) return profile.first_name;
  if (profile?.email) return profile.email.split('@')[0];
  return 'Account';
}

// ── AppShell component ──

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const demoData = useDemoDataSafe();
  const { profile, signOut, isAuthenticated } = useAuth();
  const { activeWedding } = useActiveWedding();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Track scroll position for floating toggle visibility
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close account menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    if (isDemoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      navigate('/login');
    } else {
      await signOut();
      navigate('/login');
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    await new Promise((r) => setTimeout(r, 500));
    if (demoData) demoData.resetDemo();
    setResetting(false);
    setResetConfirmOpen(false);
    setMenuOpen(false);
  };

  const isActive = (href: string) => location.pathname === href;
  const isGuestActive = (base: string) =>
    location.pathname === base || (location.pathname.startsWith('/app/guests/') && guestSubLinks.every((sl) => location.pathname !== sl.href));
  const isBudgetActive = (base: string) =>
    location.pathname === base || (location.pathname.startsWith('/app/budget/') && budgetSubLinks.slice(1).every((sl) => location.pathname !== sl.href));
  const isSeatingActive = (base: string) =>
    location.pathname === base || (location.pathname.startsWith('/app/seating/') && seatingSubLinks.slice(1).every((sl) => location.pathname !== sl.href));

  // ── Account display data ──
  let displayName: string;
  let displayEmail: string;
  let initials: string;

  if (isDemoMode) {
    const demoWedding = demoData?.state.wedding;
    const partnerOne = demoWedding?.partner_one_name || 'Emma';
    displayName = `${partnerOne} ${demoWedding?.partner_two_name || 'James'}`;
    displayEmail = 'demo@wedora.uk';
    initials = `${partnerOne.charAt(0)}${(demoWedding?.partner_two_name || 'James').charAt(0)}`;
  } else if (isAuthenticated && profile) {
    displayName = getDisplayLabel(profile);
    displayEmail = profile.email || '';
    initials = getInitials(profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(), profile.email);
  } else {
    displayName = 'Account';
    displayEmail = '';
    initials = 'A';
  }

  return (
    <div className="min-h-screen bg-background-50 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-secondary-100">
          <Link to="/" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">
            Wedora
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="Close menu"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3" role="navigation" aria-label="App navigation">
          <div className="space-y-0.5">
            {/* Overview — no group label */}
            {sidebarLinks.map((link) => (
              <SidebarNavLink key={link.href} {...link} isActive={isActive(link.href)} onClick={() => setSidebarOpen(false)} />
            ))}

            {/* Guests & Invites section */}
            <div className="pt-2">
              <div className="px-3 py-1 text-xs text-foreground-400 font-label tracking-wider uppercase">Guests &amp; Invites</div>
              {guestSubLinks.map((link) => {
                const active = isActive(link.href) || (link.href === '/app/guests' && isGuestActive(link.href));
                return <SidebarNavLink key={link.href} {...link} isActive={active} onClick={() => setSidebarOpen(false)} />;
              })}
              {invitationSubLinks.map((link) => (
                <SidebarNavLink key={link.href} {...link} isActive={isActive(link.href)} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>

            {/* Budget & Vendors section */}
            <div className="pt-2">
              <div className="px-3 py-1 text-xs text-foreground-400 font-label tracking-wider uppercase">Budget &amp; Vendors</div>
              {isDemoMode ? (
                <SidebarNavLink
                  href="/app/budget"
                  icon="ri-money-pound-circle-line"
                  label="Budget"
                  isActive={isActive('/app/budget')}
                  onClick={() => setSidebarOpen(false)}
                />
              ) : (
                budgetSubLinks.map((link) => {
                  const active = isActive(link.href) || (link.href === '/app/budget' && isBudgetActive(link.href));
                  return <SidebarNavLink key={link.href} {...link} isActive={active} onClick={() => setSidebarOpen(false)} />;
                })
              )}
            </div>

            {/* Day-of Planning section */}
            <div className="pt-2">
              <div className="px-3 py-1 text-xs text-foreground-400 font-label tracking-wider uppercase">Day-of Planning</div>
              {isDemoMode ? (
                <>
                  <SidebarNavLink
                    href="/app/seating"
                    icon="ri-layout-grid-line"
                    label="Seating"
                    isActive={isActive('/app/seating')}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <SidebarNavLink
                    href="/app/travel"
                    icon="ri-map-pin-line"
                    label="Travel"
                    isActive={isActive('/app/travel')}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <SidebarNavLink
                    href="/app/gallery-control"
                    icon="ri-image-line"
                    label="Gallery &amp; Wall"
                    isActive={isActive('/app/gallery-control')}
                    onClick={() => setSidebarOpen(false)}
                  />
                </>
              ) : (
                <>
                  {seatingSubLinks.map((link) => {
                    const active = isActive(link.href) || (link.href === '/app/seating' && isSeatingActive(link.href));
                    return <SidebarNavLink key={link.href} {...link} isActive={active} onClick={() => setSidebarOpen(false)} />;
                  })}
                  <SidebarNavLink
                    href="/app/travel"
                    icon="ri-map-pin-line"
                    label="Travel"
                    isActive={isActive('/app/travel')}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <SidebarNavLink
                    href="/app/tasks"
                    icon="ri-calendar-check-line"
                    label="Tasks"
                    isActive={isActive('/app/tasks')}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <SidebarNavLink
                    href="/app/suppliers"
                    icon="ri-contacts-book-line"
                    label="Vendors"
                    isActive={isActive('/app/suppliers')}
                    onClick={() => setSidebarOpen(false)}
                  />
                </>
              )}
            </div>

            {/* Account — no header, single item, non-demo only */}
            {!isDemoMode && (
              <div className="pt-2">
                <SidebarNavLink
                  href="/app/settings"
                  icon="ri-settings-3-line"
                  label="Settings"
                  isActive={isActive('/app/settings')}
                  onClick={() => setSidebarOpen(false)}
                />
              </div>
            )}
          </div>
        </nav>
        <div className="p-3 border-t border-secondary-100">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-label text-foreground-500 hover:bg-background-100 hover:text-foreground-800 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-base w-5 text-center" />
            Back to website
          </Link>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 hover:text-primary-500 cursor-pointer mr-3 transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-lg" />
          </button>
          <div className="flex-1" />
          {!isDemoMode && <WeddingSelector />}
          {isDemoMode && (
            <span className="mr-3 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-medium tracking-wide uppercase whitespace-nowrap" title="Demo Mode — data is simulated and stored locally">
              Demo Account
            </span>
          )}

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 font-label text-sm font-semibold cursor-pointer hover:bg-primary-200 transition-colors"
              title="Account"
            >
              {initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-secondary-100 rounded-xl shadow-lg z-30 py-1.5 animate-[fadeIn_0.15s_ease-out]">
                {/* User info */}
                <div className="px-4 py-3 border-b border-secondary-100">
                  <p className="text-sm font-label font-semibold text-foreground-900">{displayName}</p>
                  {displayEmail && (
                    <p className="text-[11px] text-foreground-400 mt-0.5">{displayEmail}</p>
                  )}
                </div>

                {isDemoMode && (
                  <>
                    <div className="px-4 py-2 border-b border-secondary-100">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-label font-medium tracking-wide uppercase">
                        Demo Account
                      </span>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/demo-start'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer text-left whitespace-nowrap"
                    >
                      <i className="ri-settings-3-line text-base w-5 text-center" />
                      Demo start page
                    </button>
                    <div className="border-t border-secondary-100" />
                  </>
                )}

                {isDemoMode && !resetConfirmOpen && (
                  <button
                    onClick={() => setResetConfirmOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left whitespace-nowrap"
                  >
                    <i className="ri-restart-line text-base w-5 text-center" />
                    Reset demo
                  </button>
                )}

                {isDemoMode && resetConfirmOpen && (
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-red-600 mb-2">Reset all demo data?</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetDemo}
                        disabled={resetting}
                        className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-label font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {resetting ? 'Resetting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setResetConfirmOpen(false)}
                        className="px-3 py-1.5 text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer text-left whitespace-nowrap"
                >
                  <i className="ri-logout-box-r-line text-base w-5 text-center" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 md:p-6 lg:p-8" tabIndex={-1}>
          {children}
        </main>

        {/* Demo guide helper (demo mode only) */}
        <DemoGuide />

        {/* Floating sidebar toggle — visible when scrolled past header */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 w-9 h-12 flex items-center justify-center bg-white border border-secondary-200 border-l-0 rounded-r-lg text-foreground-400 hover:text-primary-500 hover:bg-background-50 cursor-pointer transition-all duration-300 shadow-sm ${
              scrolled ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
            }`}
            aria-label="Open sidebar menu"
            title="Open sidebar"
          >
            <i className="ri-menu-line text-base" />
          </button>
        )}
      </div>

      {/* Style for fadeIn animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}