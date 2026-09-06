import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoData } from '@/demo/useDemoData';
import { getLastInitialised } from '@/demo/demoStorage';

export default function DemoStartPage() {
  const { state, stats, resetDemo, resetGallery } = useDemoData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetting, setResetting] = useState(false);

  const lastInit = getLastInitialised();
  const w = state.wedding;
  const slug = DEMO_CONFIG.publicSlug;
  const guestSession = DEMO_CONFIG.guestSessionId;

  const handleReset = useCallback(async () => {
    setResetting(true);
    await new Promise((r) => setTimeout(r, 600));
    resetDemo();
    setResetting(false);
    setConfirmOpen(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  }, [resetDemo]);

  const launchLinks = [
    { num: 1, label: 'Public Vowora homepage', href: '/', icon: 'ri-home-line', external: false },
    { num: 2, label: 'Demo login', href: '/login', icon: 'ri-login-box-line', external: false },
    { num: 3, label: 'Onboarding', href: '/app/onboarding', icon: 'ri-rocket-line', external: false },
    { num: 4, label: 'Couple dashboard', href: '/app/dashboard', icon: 'ri-dashboard-line', external: false },
    { num: 5, label: 'Guests', href: '/app/guests', icon: 'ri-group-line', external: false },
    { num: 6, label: 'Invitations', href: '/app/invitations', icon: 'ri-mail-send-line', external: false },
    { num: 7, label: 'Public wedding website', href: `/w/${slug}`, icon: 'ri-global-line', external: false },
    { num: 8, label: 'Guest RSVP (Oliver)', href: `/guest/${guestSession}/rsvp`, icon: 'ri-mail-open-line', external: false },
    { num: 9, label: 'Guest portal (Oliver)', href: `/guest/${guestSession}`, icon: 'ri-user-line', external: false },
    { num: 10, label: 'Budget', href: '/app/budget', icon: 'ri-money-pound-circle-line', external: false },
    { num: 11, label: 'Seating planner', href: '/app/seating', icon: 'ri-layout-grid-line', external: false },
    { num: 12, label: 'Travel Concierge', href: '/app/travel', icon: 'ri-map-pin-line', external: false },
    { num: 13, label: 'Gallery Control', href: '/app/gallery-control', icon: 'ri-image-line', external: false },
    { num: 14, label: 'Live Photo Wall', href: `/live-wall/${slug}`, icon: 'ri-tv-line', external: false },
  ];

  const checklist = [
    { label: 'Wedding created', done: true },
    { label: '24 guests with RSVPs', done: stats.totalInvited >= 20 },
    { label: 'Invitations prepared', done: state.invitations.length > 0 },
    { label: 'Public website live', done: true },
    { label: 'Guest portal working', done: true },
    { label: 'Budget with 10 expenses', done: stats.expenseCount >= 10 },
    { label: 'Seating plan with 6 tables', done: stats.tableCount >= 6 },
    { label: 'Travel recommendations', done: stats.travelPlacesCount >= 10 },
    { label: 'Gallery with 12+ photos', done: stats.galleryApprovedCount >= 12 },
    { label: 'Live photo wall ready', done: true },
    { label: 'All navigation links work', done: true },
  ];

  return (
    <div className="min-h-screen bg-background-50">
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">
          Vowora
        </Link>
        <div className="flex-1" />
        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-medium tracking-wide uppercase whitespace-nowrap">
          Demo Mode
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-5">
            <i className="ri-heart-line text-2xl" />
          </div>
          <p className="text-[11px] font-label font-medium text-foreground-400 uppercase tracking-wider mb-2">Client Presentation Launcher</p>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-3">{w.partner_one_name} &amp; {w.partner_two_name}</h1>
          <p className="text-sm text-foreground-500">24 April 2027 &middot; {w.location}</p>
        </div>

        {/* Status card */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6 mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Demo Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-500">Demo Mode</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-label font-medium ${isDemoMode ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-secondary-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-accent-500' : 'bg-secondary-400'}`} />
                {isDemoMode ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-500">Current wedding</span>
              <span className="text-xs text-foreground-800 font-label">{w.partner_one_name} &amp; {w.partner_two_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-500">Onboarding</span>
              <span className={`text-xs font-label ${state.onboardingComplete ? 'text-accent-600' : 'text-secondary-600'}`}>
                {state.onboardingComplete ? 'Completed' : 'Not completed'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-500">Last reset</span>
              <span className="text-xs text-foreground-600 font-label">
                {lastInit ? new Date(lastInit).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not yet initialised'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-500">Data version</span>
              <span className="text-xs text-foreground-600 font-label">Seed v1 — Emma &amp; James</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-secondary-100 rounded-lg p-4 text-center">
            <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.totalInvited}</p>
            <p className="text-[11px] text-foreground-500 font-label mt-0.5">Invited</p>
          </div>
          <div className="bg-white border border-secondary-100 rounded-lg p-4 text-center">
            <p className="text-2xl font-heading font-semibold text-accent-600">{stats.attending}</p>
            <p className="text-[11px] text-foreground-500 font-label mt-0.5">Attending</p>
          </div>
          <div className="bg-white border border-secondary-100 rounded-lg p-4 text-center">
            <p className="text-2xl font-heading font-semibold text-secondary-500">{stats.awaitingReply}</p>
            <p className="text-[11px] text-foreground-500 font-label mt-0.5">Awaiting</p>
          </div>
          <div className="bg-white border border-secondary-100 rounded-lg p-4 text-center">
            <p className="text-2xl font-heading font-semibold text-foreground-400">{stats.declined}</p>
            <p className="text-[11px] text-foreground-500 font-label mt-0.5">Declined</p>
          </div>
        </div>

        {/* Presentation checklist */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6 mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Presentation checklist</h2>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary-100 text-secondary-400'}`}>
                  <i className={`${item.done ? 'ri-check-line' : 'ri-more-line'}`} />
                </div>
                <span className={`text-xs ${item.done ? 'text-foreground-700' : 'text-foreground-400'}`}>{item.label}</span>
                {item.done && <span className="ml-auto text-[10px] text-emerald-500 font-label">Ready</span>}
                {!item.done && <span className="ml-auto text-[10px] text-foreground-350 font-label">—</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Launch buttons */}
        <div className="mb-8">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Presentation journey</h2>
          <div className="space-y-2">
            {launchLinks.map((link) => (
              <Link
                key={link.num}
                to={link.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-secondary-100 hover:border-secondary-300 hover:bg-background-50 transition-colors cursor-pointer group"
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-500 text-[11px] font-label font-semibold group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  {link.num}
                </span>
                <span className="flex-1 text-sm text-foreground-700 font-label">{link.label}</span>
                <i className="ri-arrow-right-line text-foreground-300 group-hover:text-foreground-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-sm" />
            </div>
            <div>
              <p className="text-sm font-label font-semibold text-amber-800 mb-1">Demonstration environment</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Email sending, payment processing, website publishing, and AI moderation are simulated.
                All data is stored locally and can be reset at any time. This is not a production environment.
              </p>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Reset demo data</h2>
          <p className="text-xs text-foreground-500 mb-4">
            Restore the Emma &amp; James dataset to its original state. All changes made during the demonstration will be lost.
            This resets guests, RSVPs, seating, budget, travel approvals, gallery photos, and live wall.
          </p>
          {!confirmOpen ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-label font-medium hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-restart-line" /> Reset all demo data
              </button>
              <button
                onClick={() => { if (window.confirm('Reset only gallery and live wall data?')) { resetGallery(); } }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-secondary-200 text-foreground-600 text-sm font-label hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-image-line" /> Reset gallery only
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-label font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {resetting ? (
                  <><i className="ri-loader-4-line animate-spin" /> Resetting...</>
                ) : (
                  <><i className="ri-check-line" /> Confirm reset</>
                )}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={resetting}
                className="text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
          {resetDone && (
            <div className="mt-3 flex items-center gap-2 text-xs text-accent-600 font-label">
              <i className="ri-checkbox-circle-fill" /> Demo data has been reset to the original Emma &amp; James dataset.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}