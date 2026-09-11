import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode } from '@/demo/demoConfig';

// ── Tip definitions per route ──

interface GuideTip {
  route: string;
  title: string;
  icon: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  highlightSelector?: string;
}

const GUIDE_TIPS: GuideTip[] = [
  {
    route: '/app/dashboard',
    title: 'Your wedding command centre',
    icon: 'ri-dashboard-line',
    description: 'This dashboard shows everything at a glance — guest counts, RSVP stats, budget progress, upcoming tasks, and quick links to every tool. Click any stat card to jump straight to that section.',
  },
  {
    route: '/app/guests',
    title: 'Guest list & RSVP tracking',
    icon: 'ri-group-line',
    description: 'Your full guest list with filters for RSVP status, guest type, dietary needs and more. Use the checkboxes for bulk actions like moving guests to households or tagging them. Click any guest to see their full profile.',
    actionLabel: 'Add a guest',
    actionTo: '/app/guests/new',
  },
  {
    route: '/app/guests/new',
    title: 'Adding a guest',
    icon: 'ri-user-add-line',
    description: 'Fill in the guest details here. Demo mode will check for possible duplicate guests before saving. All changes are stored in your browser during the demo — nothing goes to a real database.',
  },
  {
    route: '/app/guests/households',
    title: 'Household management',
    icon: 'ri-home-4-line',
    description: 'Group guests into households like "The Carters" or "Ben\'s work friends". Households help you send one invitation to a family and seat them together. Invitations can target whole households at once.',
  },
  {
    route: '/app/guests/tags',
    title: 'Guest tags',
    icon: 'ri-price-tag-3-line',
    description: 'Create custom tags like "VIP", "Dietary", or "Plus-one needed". Tags make it easy to filter your guest list and spot groups that need attention. Create as many tags as you need.',
  },
  {
    route: '/app/invitations',
    title: 'Invitation designer',
    icon: 'ri-mail-send-line',
    description: 'Design and manage your wedding invitations here. Choose between individual, couple, or household invitations. Preview how each one looks, and when you\'re ready, you can simulate sending them.',
    actionLabel: 'Create an invitation',
    actionTo: '/app/invitations/new',
  },
  {
    route: '/app/budget',
    title: 'Budget tracker',
    icon: 'ri-money-pound-circle-line',
    description: 'Track every pound of your wedding budget. Add expenses by category, record supplier quotes, and schedule payments. The guest cost calculator at the bottom helps you estimate per-head catering costs.',
  },
  {
    route: '/app/budget/categories',
    title: 'Budget categories',
    icon: 'ri-list-check',
    description: 'Manage your budget categories here — Venue, Catering, Photography, and more. Each category has a planned amount and tracks committed vs paid spending. Adjust allocations as your plans evolve.',
  },
  {
    route: '/app/budget/payments',
    title: 'Payment schedule',
    icon: 'ri-bank-card-line',
    description: 'Keep track of every payment deadline. Mark payments as paid as you go, and the dashboard will show exactly how much is outstanding. The demo simulates payments — no real money moves.',
  },
  {
    route: '/app/seating',
    title: 'Seating planner',
    icon: 'ri-layout-grid-line',
    description: 'Drag and drop guests onto tables in the Orangery reception room. See who has dietary or accessibility needs, and spot unassigned guests at a glance. Open the full planner to customise table layouts.',
    actionLabel: 'Open full planner',
    actionTo: '/app/seating/plans/demo-plan',
  },
  {
    route: '/app/travel',
    title: 'Travel concierge',
    icon: 'ri-map-pin-line',
    description: 'Curate accommodation, restaurants, transport and local tips for your guests. Approve recommendations to make them visible on the guest website, and feature the best ones to highlight them.',
  },
  {
    route: '/app/gallery-control',
    title: 'Gallery & live wall',
    icon: 'ri-image-line',
    description: 'Review guest-uploaded photos and control what appears on the live reception wall. Approve, hide, or reject photos. Toggle the live wall on and off, and adjust settings like upload permissions and transition speed.',
  },
  {
    route: '/app/tasks',
    title: 'Task checklist',
    icon: 'ri-calendar-check-line',
    description: 'Your wedding to-do list. Tasks are organised by category with priority levels and due dates. Mark them complete to track your planning progress on the dashboard.',
  },
  {
    route: '/app/wedding',
    title: 'Wedding details',
    icon: 'ri-heart-line',
    description: 'Review and edit your wedding details — couple names, date, venue information and more. These details appear on your public wedding website for guests.',
  },
  {
    route: '/app/styleboard',
    title: 'Style inspiration',
    icon: 'ri-palette-line',
    description: 'Collect and organise visual inspiration for your wedding. Save colour palettes, floral arrangements, dress ideas and decoration references all in one place.',
  },
  {
    route: '/guest/demo-session',
    title: 'Guest portal experience',
    icon: 'ri-user-line',
    description: 'See what your guests will experience! Browse the guest website as Oliver Bennett — view the itinerary, RSVP, explore travel recommendations, browse the gallery, and check out the gift registry.',
  },
];

// ── Storage key ──

const DISMISSED_TIPS_KEY = 'vowora.demo.guide.dismissed';

// ── The guide component ──

export default function DemoGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<GuideTip | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_TIPS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [showTourMenu, setShowTourMenu] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [animating, setAnimating] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find matching tip for current route
  useEffect(() => {
    // Clear any pending dismiss timer when route changes
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    const path = location.pathname;

    // Find best matching tip
    let matched: GuideTip | undefined;
    // Exact match first
    matched = GUIDE_TIPS.find((t) => t.route === path);
    // Fallback: prefix match (e.g. /app/guests/abc matches /app/guests)
    if (!matched) {
      const segments = path.split('/').filter(Boolean);
      while (segments.length > 1) {
        segments.pop();
        const prefix = '/' + segments.join('/');
        matched = GUIDE_TIPS.find((t) => t.route === prefix);
        if (matched) break;
      }
    }

    if (matched && !dismissed.has(matched.route)) {
      setCurrentTip(matched);
      setMinimised(false);

      // Delay showing to let page transition finish, but use ref-based check
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setAnimating(true);
        setVisible(true);
        dismissTimerRef.current = null;
      }, 600);
    } else {
      setVisible(false);
      setCurrentTip(null);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [location.pathname]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback((route: string) => {
    setAnimating(false);
    setVisible(false);
    const next = new Set(dismissed);
    next.add(route);
    setDismissed(next);
    localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(Array.from(next)));
    setMinimised(false);
  }, [dismissed]);

  const handleDismissAll = useCallback(() => {
    const allRoutes = new Set(GUIDE_TIPS.map((t) => t.route));
    setDismissed(allRoutes);
    localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(Array.from(allRoutes)));
    setVisible(false);
    setMinimised(false);
    setShowTourMenu(false);
  }, []);

  const handleResetTips = useCallback(() => {
    setDismissed(new Set());
    localStorage.removeItem(DISMISSED_TIPS_KEY);
    setShowTourMenu(false);
    setMinimised(false);
  }, []);

  const handleAction = useCallback((tip: GuideTip) => {
    if (tip.actionTo) {
      navigate(tip.actionTo);
    }
  }, [navigate]);

  // Don't render anything if not in demo mode or no tip
  if (!isDemoMode) return null;
  if (!currentTip) {
    // Show minimised launcher if tips were dismissed
    const allDismissed = GUIDE_TIPS.every((t) => dismissed.has(t.route));
    if (!allDismissed) return null;

    return (
      <div className="fixed bottom-5 right-5 z-40">
        {/* Small help button */}
        <button
          onClick={() => setShowTourMenu(!showTourMenu)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-foreground-900 text-white shadow-lg hover:bg-foreground-800 transition-colors cursor-pointer"
          title="Demo help"
        >
          <i className="ri-question-line text-lg" />
        </button>

        {/* Tour menu */}
        {showTourMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowTourMenu(false)} />
            <div className="absolute bottom-12 right-0 w-64 bg-white border border-secondary-200 rounded-xl shadow-xl p-4 z-40 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-label font-semibold text-foreground-900">Demo guide</h3>
                <button onClick={() => setShowTourMenu(false)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer">
                  <i className="ri-close-line text-sm" />
                </button>
              </div>
              <p className="text-xs text-foreground-500 mb-3">
                All tips are hidden. Reset them to see helper cards on each page again.
              </p>
              <button
                onClick={handleResetTips}
                className="w-full py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1.5" />Show all tips again
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // If there's a current tip but it's minimised, show a small badge
  if (minimised) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setMinimised(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent-500 text-white shadow-lg hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className={`${currentTip.icon} text-sm`} />
          <span className="text-xs font-label font-medium">Show tip</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop to catch clicks outside (only when tour menu is open) */}
      {showTourMenu && <div className="fixed inset-0 z-30" onClick={() => setShowTourMenu(false)} />}

      {/* Main tip card */}
      <div
        className={`fixed bottom-5 right-5 z-40 w-80 max-w-[calc(100vw-2.5rem)] bg-white border border-secondary-200 rounded-xl shadow-xl transition-all duration-300 ${
          animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600 flex-shrink-0 mt-0.5">
            <i className={`${currentTip.icon} text-base`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-label font-semibold text-foreground-900">{currentTip.title}</h3>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setMinimised(true)}
                  className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer"
                  title="Minimise"
                >
                  <i className="ri-subtract-line text-xs" />
                </button>
                <button
                  onClick={() => handleDismiss(currentTip.route)}
                  className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer"
                  title="Dismiss"
                >
                  <i className="ri-close-line text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-4">
          <p className="text-xs text-foreground-600 leading-relaxed">{currentTip.description}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {currentTip.actionLabel && currentTip.actionTo && (
              <button
                onClick={() => handleAction(currentTip)}
                className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                {currentTip.actionLabel}
              </button>
            )}
            <button
              onClick={() => handleDismiss(currentTip.route)}
              className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs font-label text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Got it
            </button>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-secondary-100">
            <span className="text-[10px] text-foreground-400 font-label">
              Demo guide
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTourMenu(!showTourMenu)}
                className="text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-more-line mr-0.5" />Options
              </button>
            </div>
          </div>

          {/* Tour menu dropdown */}
          {showTourMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-white border border-secondary-200 rounded-lg shadow-lg p-2 z-50 animate-[fadeIn_0.12s_ease-out]">
              <button
                onClick={handleDismissAll}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 hover:bg-background-100 rounded cursor-pointer whitespace-nowrap"
              >
                <i className="ri-close-circle-line text-sm" />Hide all tips
              </button>
              <button
                onClick={handleResetTips}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 hover:bg-background-100 rounded cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line text-sm" />Show all tips again
              </button>
              <div className="border-t border-secondary-100 my-1" />
              <p className="px-3 py-1 text-[10px] text-foreground-400">Tips appear once per page. Dismiss them or click "Got it" to hide them permanently.</p>
            </div>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}