import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding, setActiveWeddingId } from '@/context/ActiveWeddingProvider';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const PLANNING_PRIORITIES = [
  'Guest list and RSVPs',
  'Wedding website',
  'Budget',
  'Seating plan',
  'Suppliers',
  'Travel and accommodation',
  'Wedding-day photo wall',
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Athens', label: 'Eastern European (EET)' },
  { value: 'America/New_York', label: 'Eastern US (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central US (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain US (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific US (PST/PDT)' },
  { value: 'America/Toronto', label: 'Canada Eastern' },
  { value: 'America/Vancouver', label: 'Canada Pacific' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

const STEPS = [
  { title: 'Welcome', description: "Let's start planning" },
  { title: 'Couple details', description: 'Tell us about you' },
  { title: 'Wedding details', description: 'When and where' },
  { title: 'Guest estimate', description: 'How many guests?' },
  { title: 'Review', description: "You're all set" },
];

const DRAFT_KEY = 'wedora.onboarding.draft';
const DEMO_SESSION_KEY = 'wedora.demo.session';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface OnboardingDraft {
  partnerOneFirst: string;
  partnerOneLast: string;
  partnerTwoFirst: string;
  partnerTwoLast: string;
  displayName: string;
  weddingDate: string;
  location: string;
  ceremonyVenue: string;
  ceremonyTime: string;
  receptionVenue: string;
  receptionTime: string;
  guestEstimate: number;
  priorities: string[];
  timezone: string;
  publishWebsite: boolean;
  currentStep: number;
  savedAt: number;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function saveDraft(draft: Omit<OnboardingDraft, 'savedAt'>): void {
  try {
    const data: OnboardingDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch { /* storage full — silently fail */ }
}

function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

function formatDateUK(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════

export default function OnboardingPage() {
  const navigate = useNavigate();
  const demoData = useDemoDataSafe();
  const { profile, refreshProfile } = useAuth();
  const { weddings, weddingState, refreshWeddings } = useActiveWedding();

  // ── Existing wedding check ──
  const hasExistingWedding = !isDemoMode && weddings.length > 0 && weddingState === 'ready';

  // ── Provisioning request ID (stable across steps) ──
  const provisioningRequestId = useRef(
    `prov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );

  // ── Load initial values (demo data > saved draft > profile > defaults) ──
  const savedDraft = !isDemoMode ? loadDraft() : null;

  const [partnerOneFirst, setPartnerOneFirst] = useState(
    isDemoMode ? (demoData?.state.wedding.partner_one_name ?? '') : (savedDraft?.partnerOneFirst ?? profile?.first_name ?? '')
  );
  const [partnerOneLast, setPartnerOneLast] = useState(savedDraft?.partnerOneLast ?? '');
  const [partnerTwoFirst, setPartnerTwoFirst] = useState(
    isDemoMode ? (demoData?.state.wedding.partner_two_name ?? '') : (savedDraft?.partnerTwoFirst ?? '')
  );
  const [partnerTwoLast, setPartnerTwoLast] = useState(savedDraft?.partnerTwoLast ?? '');
  const [displayName, setDisplayName] = useState(
    isDemoMode ? (demoData?.state.wedding.title ?? '') : (savedDraft?.displayName ?? profile?.display_name ?? '')
  );

  const [weddingDate, setWeddingDate] = useState(
    isDemoMode ? (demoData?.state.wedding.wedding_date ?? '') : (savedDraft?.weddingDate ?? '')
  );
  const [location, setLocation] = useState(
    isDemoMode ? (demoData?.state.wedding.location ?? '') : (savedDraft?.location ?? '')
  );
  const [ceremonyVenue, setCeremonyVenue] = useState(
    isDemoMode ? (demoData?.state.venues.find((v) => v.venue_type === 'ceremony')?.name ?? '') : (savedDraft?.ceremonyVenue ?? '')
  );
  const [ceremonyTime, setCeremonyTime] = useState(savedDraft?.ceremonyTime ?? '13:00');
  const [receptionVenue, setReceptionVenue] = useState(
    isDemoMode ? (demoData?.state.venues.find((v) => v.venue_type === 'reception')?.name ?? '') : (savedDraft?.receptionVenue ?? '')
  );
  const [receptionTime, setReceptionTime] = useState(savedDraft?.receptionTime ?? '15:00');
  const [timezone, setTimezone] = useState(savedDraft?.timezone ?? 'Europe/London');
  const [publishWebsite, setPublishWebsite] = useState(savedDraft?.publishWebsite ?? false);

  const [guestEstimate, setGuestEstimate] = useState(
    isDemoMode ? (demoData?.state.guestEstimate ?? 24) : (savedDraft?.guestEstimate ?? 80)
  );
  const [priorities, setPriorities] = useState<string[]>(
    isDemoMode ? (demoData?.state.planningPriorities ?? []) : (savedDraft?.priorities ?? [])
  );

  const [currentStep, setCurrentStep] = useState(savedDraft?.currentStep ?? 0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ── Persist draft on every meaningful change ──
  const persistDraft = useCallback(() => {
    if (isDemoMode) return;
    saveDraft({
      partnerOneFirst, partnerOneLast, partnerTwoFirst, partnerTwoLast,
      displayName, weddingDate, location, ceremonyVenue, ceremonyTime,
      receptionVenue, receptionTime, guestEstimate, priorities,
      timezone, publishWebsite, currentStep,
    });
  }, [partnerOneFirst, partnerOneLast, partnerTwoFirst, partnerTwoLast,
      displayName, weddingDate, location, ceremonyVenue, ceremonyTime,
      receptionVenue, receptionTime, guestEstimate, priorities,
      timezone, publishWebsite, currentStep]);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  // ── Helpers ──
  const togglePriority = (p: string) => {
    setPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const updateDisplayName = (p1first: string, p2first: string) => {
    if (p1first && p2first) setDisplayName(`${p1first} & ${p2first}`);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return true;
      case 1: return (
        partnerOneFirst.trim() !== '' && partnerOneLast.trim() !== '' &&
        partnerTwoFirst.trim() !== '' && partnerTwoLast.trim() !== ''
      );
      case 2: return (
        weddingDate !== '' && location.trim() !== '' &&
        ceremonyVenue.trim() !== '' && receptionVenue.trim() !== ''
      );
      case 3: return guestEstimate > 0 && priorities.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  // ── Step navigation ──
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  // ── Skip ──
  const handleSkip = () => {
    if (isDemoMode) {
      if (demoData) {
        demoData.markOnboardingComplete(
          ['Guest list and RSVPs', 'Wedding website', 'Budget', 'Seating plan', 'Travel and accommodation'],
          guestEstimate,
        );
      }
      localStorage.setItem(DEMO_SESSION_KEY, 'true');
      navigate('/app/dashboard');
      return;
    }
    // Production: save current draft and continue to dashboard
    persistDraft();
    navigate('/app/dashboard');
  };

  // ── Reset Demo ──
  const handleResetDemo = () => {
    if (!isDemoMode || !demoData) return;
    demoData.resetDemo();
    localStorage.removeItem(DEMO_SESSION_KEY);
    setToast('Demo reset — starting fresh!');
    setTimeout(() => setToast(''), 2500);
  };

  // ── Finish ──
  const handleFinish = async () => {
    if (submitted) return;
    setSubmitted(true);
    setLoading(true);
    setError('');

    // ── Demo mode ──
    if (isDemoMode) {
      if (demoData) {
        demoData.updateWedding({
          partner_one_name: partnerOneFirst,
          partner_two_name: partnerTwoFirst,
          title: displayName || `${partnerOneFirst} & ${partnerTwoFirst}`,
          wedding_date: weddingDate,
          location,
        });
        demoData.markOnboardingComplete(priorities, guestEstimate);
        demoData.addDemoActivity({
          id: `demo-activity-onboarding-${Date.now()}`,
          timestamp: new Date().toISOString(),
          message: 'Wedding workspace setup completed',
          category: 'setup',
          related_guest: '',
          wedding_id: demoData.state.wedding.id,
        });
      }
      localStorage.setItem(DEMO_SESSION_KEY, 'true');
      await new Promise((r) => setTimeout(r, 600));
      setLoading(false);
      setSubmitted(false);
      setToast('Wedding workspace created!');
      setTimeout(() => { setToast(''); navigate('/app/dashboard'); }, 1200);
      return;
    }

    // ── Production mode ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Your session appears to have expired. Please log in again.');
        setLoading(false);
        setSubmitted(false);
        return;
      }

      const response = await supabase.functions.invoke('provision-wedding-workspace', {
        body: {
          partner_one_first: partnerOneFirst,
          partner_one_last: partnerOneLast,
          partner_two_first: partnerTwoFirst,
          partner_two_last: partnerTwoLast,
          display_name: displayName || `${partnerOneFirst} & ${partnerTwoFirst}`,
          wedding_date: weddingDate,
          location,
          ceremony_venue: ceremonyVenue,
          ceremony_time: ceremonyTime,
          reception_venue: receptionVenue,
          reception_time: receptionTime,
          guest_estimate: guestEstimate,
          priorities,
          timezone,
          publish_website: publishWebsite,
          provisioning_request_id: provisioningRequestId.current,
        },
      });

      const result = response.data || {};

      if (response.error || !result.success) {
        const msg = result?.error || 'Something went wrong. Please try again.';
        setError(msg);
        setLoading(false);
        setSubmitted(false);
        return;
      }

      // Success — clear draft, update providers
      clearDraft();
      if (result.wedding_id) {
        setActiveWeddingId(result.wedding_id);
        await refreshProfile();
        await refreshWeddings();
      }

      setToast(result.already_provisioned
        ? 'Workspace found — taking you to your dashboard.'
        : 'Wedding workspace created!');
      setLoading(false);
      setTimeout(() => { setToast(''); navigate('/app/dashboard'); }, 1200);
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
      setLoading(false);
      setSubmitted(false);
    }
  };

  // ── Existing wedding handler ──
  const handleGoToDashboard = () => navigate('/app/dashboard');
  const handleCreateAnother = () => setCurrentStep(0);

  // ── Compute progress ──
  const progressPercent = Math.round(((currentStep + 1) / STEPS.length) * 100);

  // ── Existing wedding screen ──
  if (hasExistingWedding && currentStep === 0) {
    return (
      <div className="min-h-screen bg-background-50 flex flex-col">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg">
            <i className="ri-check-line mr-2" />{toast}
          </div>
        )}

        <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
          <Link to="/" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">
            Vowora
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-6">
              <i className="ri-check-double-line text-2xl" />
            </div>
            <h1 className="font-heading text-2xl text-foreground-900 mb-3">
              You already have a wedding workspace
            </h1>
            <p className="text-sm text-foreground-500 mb-8 max-w-sm mx-auto">
              You have {weddings.length} wedding{weddings.length !== 1 ? 's' : ''} set up. Continue to your dashboard or create a new one if needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleGoToDashboard} className="btn-primary cursor-pointer whitespace-nowrap">
                <i className="ri-dashboard-line mr-1.5" /> Go to dashboard
              </button>
              <button onClick={handleCreateAnother} className="btn-outline cursor-pointer whitespace-nowrap">
                <i className="ri-add-line mr-1.5" /> Create another wedding
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════
  // Main onboarding flow
  // ═══════════════════════

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg animate-[fadeIn_0.2s_ease-out]">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      {/* Top bar */}
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">
          Vowora
        </Link>
        <div className="flex-1 mx-4 md:mx-8">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-background-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-label text-foreground-500 whitespace-nowrap">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
        </div>
        {isDemoMode && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-medium tracking-wide uppercase whitespace-nowrap">
            Demo
          </span>
        )}
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-lg">
          {/* Step indicator dots */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-primary-400' : 'bg-background-200'
                }`}
              />
            ))}
          </div>

          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">
            {STEPS[currentStep].title}
          </h1>
          <p className="text-sm text-foreground-500 mb-8">{STEPS[currentStep].description}</p>

          {/* ── Step 0: Welcome ── */}
          {currentStep === 0 && (
            <div className="card-default text-center py-8">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-5">
                <i className="ri-heart-line text-2xl" />
              </div>
              <h2 className="font-heading text-xl text-foreground-900 mb-3">
                {isDemoMode
                  ? "Let's start planning Emma & James's wedding"
                  : "Let's set up your wedding workspace"}
              </h2>
              <p className="text-sm text-foreground-600 max-w-sm mx-auto leading-relaxed">
                Vowora brings together your wedding website, guest list, invitations, RSVP tracking,
                budget, seating plan, travel information, and wedding-day memories — all in one place.
              </p>

              {/* Draft indicator */}
              {!isDemoMode && savedDraft && savedDraft.currentStep > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-accent-50 border border-accent-100 text-sm">
                  <p className="text-accent-800 font-label font-medium">
                    <i className="ri-history-line mr-1.5" />You have a saved draft
                  </p>
                  <p className="text-xs text-accent-600 mt-1">
                    Last saved: {new Date(savedDraft.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    . &nbsp;
                    <button onClick={() => setCurrentStep(savedDraft.currentStep)} className="underline cursor-pointer font-medium">
                      Resume from step {savedDraft.currentStep + 1}
                    </button>
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={goNext} className="btn-primary cursor-pointer whitespace-nowrap">
                  Start setup <i className="ri-arrow-right-line ml-1.5" />
                </button>
                {isDemoMode && (
                  <button onClick={handleSkip} className="btn-outline cursor-pointer whitespace-nowrap">
                    Skip and use prepared demo wedding
                  </button>
                )}
              </div>

              {/* Demo reset */}
              {isDemoMode && (
                <div className="mt-6 pt-4 border-t border-secondary-100">
                  <button onClick={handleResetDemo} className="text-xs text-foreground-400 hover:text-red-500 cursor-pointer transition-colors whitespace-nowrap">
                    <i className="ri-restart-line mr-1" /> Reset demo data
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Couple details ── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Partner one first name <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerOneFirst}
                    onChange={(e) => { setPartnerOneFirst(e.target.value); updateDisplayName(e.target.value, partnerTwoFirst); }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="Emma"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Partner one surname <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerOneLast}
                    onChange={(e) => setPartnerOneLast(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="Carter"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Partner two first name <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerTwoFirst}
                    onChange={(e) => { setPartnerTwoFirst(e.target.value); updateDisplayName(partnerOneFirst, e.target.value); }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="James"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Partner two surname <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerTwoLast}
                    onChange={(e) => setPartnerTwoLast(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="Bennett"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Preferred couple display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  placeholder="Emma &amp; James"
                />
                <p className="text-[11px] text-foreground-400 mt-1">
                  This will appear on your public wedding page and guest portal
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Wedding details ── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Wedding date <span className="text-foreground-400">*</span>
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                />
                {weddingDate && (
                  <p className="text-xs text-foreground-500 mt-1.5">{formatDateUK(weddingDate)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.75rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.25rem" }}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-foreground-400 mt-1">
                  Used for countdown timers and event scheduling on your guest portal
                </p>
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Main location <span className="text-foreground-400">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  placeholder="Bath, Somerset"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Ceremony venue <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={ceremonyVenue}
                    onChange={(e) => setCeremonyVenue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="St Mary's Church"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Ceremony time
                  </label>
                  <input
                    type="time"
                    value={ceremonyTime}
                    onChange={(e) => setCeremonyTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Reception venue <span className="text-foreground-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={receptionVenue}
                    onChange={(e) => setReceptionVenue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                    placeholder="The Orangery"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                    Reception time
                  </label>
                  <input
                    type="time"
                    value={receptionTime}
                    onChange={(e) => setReceptionTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Guest estimate & priorities ── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Estimated number of guests <span className="text-foreground-400">*</span>
                </label>
                <input
                  type="number"
                  value={guestEstimate}
                  onChange={(e) => setGuestEstimate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  min="1"
                  max="999"
                />
                {isDemoMode && (
                  <p className="text-xs text-foreground-500 mt-1.5">
                    The demo includes 24 guest records. Changing this estimate does not add or remove guests.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-2">
                  Planning priorities <span className="text-foreground-400">*</span>
                </label>
                <p className="text-xs text-foreground-500 mb-3">Select the things that matter most for your wedding:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLANNING_PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-label text-left transition-colors cursor-pointer whitespace-nowrap ${
                        priorities.includes(p)
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-secondary-200 text-foreground-600 hover:border-secondary-300'
                      }`}
                    >
                      <span className={`w-4 h-4 flex items-center justify-center rounded text-xs ${priorities.includes(p) ? 'text-primary-600' : 'text-foreground-400'}`}>
                        <i className={priorities.includes(p) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} />
                      </span>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Publication toggle */}
              <div className="p-4 rounded-lg bg-background-50 border border-secondary-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-label font-medium text-foreground-700 mb-1">
                      Publish wedding website
                    </label>
                    <p className="text-[11px] text-foreground-500">
                      Make your wedding page and guest portal available immediately after setup. You can always change this later.
                    </p>
                  </div>
                  <button
                    onClick={() => setPublishWebsite(!publishWebsite)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                      publishWebsite ? 'bg-primary-500' : 'bg-secondary-300'
                    }`}
                    role="switch"
                    aria-checked={publishWebsite}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        publishWebsite ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Review and finish ── */}
          {currentStep === 4 && (
            <div className="card-default py-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
                  <i className="ri-check-line text-2xl" />
                </div>
                <h2 className="font-heading text-xl text-foreground-900 mb-1">Ready to go</h2>
                <p className="text-sm text-foreground-500">Here is a summary of your wedding workspace:</p>
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Couple</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">
                    {displayName || `${partnerOneFirst} & ${partnerTwoFirst}`}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Date</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">
                    {formatDateUK(weddingDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Timezone</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">
                    {TIMEZONE_OPTIONS.find((t) => t.value === timezone)?.label ?? timezone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Location</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">{location}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Ceremony</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">
                    {ceremonyVenue} at {ceremonyTime}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Reception</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">
                    {receptionVenue} at {receptionTime}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Estimated guests</span>
                  <span className="text-sm font-label font-semibold text-foreground-900">{guestEstimate}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-foreground-500">Website</span>
                  <span className={`text-sm font-label font-semibold ${publishWebsite ? 'text-accent-600' : 'text-foreground-500'}`}>
                    {publishWebsite ? 'Published on setup' : 'Private for now'}
                  </span>
                </div>
                <div className="py-2">
                  <span className="text-sm text-foreground-500 block mb-2">Priorities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {priorities.map((p) => (
                      <span key={p} className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-label">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Error state ── */}
          {error && (
            <div className="mt-4 p-3 rounded-md bg-primary-50 border border-primary-200 text-sm text-primary-800 text-center">
              <i className="ri-error-warning-line mr-1.5" />{error}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goBack}
              disabled={currentStep === 0 || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-30 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {/* Skip link (step 0 or last step) */}
              {(currentStep === 0 || currentStep === STEPS.length - 1) && (
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors whitespace-nowrap px-2"
                >
                  {currentStep === 0 ? 'Skip for now' : 'Save & finish later'}
                </button>
              )}

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                >
                  Continue
                  <i className="ri-arrow-right-line" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? (
                    <><i className="ri-loader-4-line animate-spin" /> Finishing...</>
                  ) : (
                    <>Finish setup <i className="ri-check-line" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}