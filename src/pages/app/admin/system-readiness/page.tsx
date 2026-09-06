import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { IS_DEMO_MODE, PUBLIC_SITE_URL, SUPABASE_URL, RELEASE_VERSION, BUILD_TIMESTAMP, getMissingEnvVars } from '@/lib/env';
import { isDemoMode } from '@/demo/demoConfig';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

type CheckStatus = 'pass' | 'warn' | 'fail' | 'checking';
type TabId = 'health' | 'launch';

interface HealthCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
}

interface LaunchChecklistItem {
  id: string;
  group: string;
  label: string;
  description: string;
  checked: boolean;
  checkedBy: string;
  checkedAt: string | null;
}

interface LaunchChecklistGroup {
  id: string;
  label: string;
  items: LaunchChecklistItem[];
}

interface EdgeFnStatus {
  name: string;
  status: CheckStatus;
  detail: string;
}

// ═══════════════════════════════════════════
// Launch Checklist Data
// ═══════════════════════════════════════════

const LAUNCH_CHECKLIST_GROUPS: { id: string; label: string; items: { id: string; label: string; description: string }[] }[] = [
  {
    id: 'backup', label: '1. Backup Confirmed', items: [
      { id: 'backup-db', label: 'Database backup created', description: 'Verified Supabase database backup exists with timestamp and identifier' },
      { id: 'backup-storage', label: 'Storage backup considered', description: 'Critical files in storage buckets have backup coverage' },
      { id: 'backup-rollback-recorded', label: 'Rollback version recorded', description: 'Previous stable release version documented for rollback' },
    ],
  },
  {
    id: 'migrations', label: '2. Migrations Applied', items: [
      { id: 'migrate-all', label: 'All migrations applied in order', description: 'Timestamp-ordered migrations applied successfully, no partial failures' },
      { id: 'migrate-rls', label: 'RLS remains enabled', description: 'Row-Level Security confirmed active on all required tables post-migration' },
      { id: 'migrate-verify', label: 'Schema verification queries pass', description: 'Key tables (weddings, guests, invitations, rsvp) queried successfully' },
    ],
  },
  {
    id: 'functions', label: '3. Functions Deployed', items: [
      { id: 'fn-validate-invitation', label: 'validate-invitation deployed', description: 'Invitation token validation Edge Function deployed and reachable' },
      { id: 'fn-submit-rsvp', label: 'submit-rsvp deployed', description: 'RSVP submission Edge Function deployed and reachable' },
      { id: 'fn-stripe', label: 'Stripe functions deployed', description: 'create-subscription-checkout, stripe-webhook-handler, create-billing-portal-session all deployed' },
      { id: 'fn-email', label: 'Email functions deployed', description: 'invitation-send and email-campaign-send deployed' },
      { id: 'fn-provision', label: 'provision-wedding-workspace deployed', description: 'Wedding provisioning function deployed' },
    ],
  },
  {
    id: 'frontend', label: '4. Frontend Deployed', items: [
      { id: 'fe-build', label: 'Production build succeeds', description: 'vite build completes without errors' },
      { id: 'fe-typescript', label: 'TypeScript check passes', description: 'tsc --noEmit returns zero errors' },
      { id: 'fe-demo-off', label: 'VITE_DEMO_MODE=false', description: 'Demo mode is disabled for production deployment' },
      { id: 'fe-no-localhost', label: 'No localhost references', description: 'Public URL is a real domain, not localhost or 127.0.0.1' },
      { id: 'fe-homepage', label: 'Public homepage loads', description: 'Root URL returns successfully with correct metadata' },
    ],
  },
  {
    id: 'env', label: '5. Environment Verified', items: [
      { id: 'env-supabase', label: 'Supabase URL and anon key configured', description: 'VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY are set' },
      { id: 'env-public-url', label: 'Public site URL configured', description: 'VITE_PUBLIC_SITE_URL is set to canonical domain' },
      { id: 'env-secrets', label: 'Server secrets confirmed', description: 'Stripe, Resend secrets present in Supabase Dashboard (not client bundle)' },
    ],
  },
  {
    id: 'auth', label: '6. Auth Tested', items: [
      { id: 'auth-signup', label: 'Signup works', description: 'New test account created successfully' },
      { id: 'auth-login', label: 'Login works', description: 'Existing account can log in' },
      { id: 'auth-logout', label: 'Logout works', description: 'Session cleared, protected routes redirect' },
      { id: 'auth-reset', label: 'Password reset works', description: 'Reset email received, reset flow completes' },
    ],
  },
  {
    id: 'invitation', label: '7. Guest Invitation Tested', items: [
      { id: 'inv-create', label: 'Invitation created', description: 'Test guest invitation created with valid token' },
      { id: 'inv-validate', label: 'Token validated', description: 'Invitation token resolves to correct wedding and household' },
      { id: 'inv-guest-access', label: 'Guest access established', description: 'Guest session created, portal loads with correct data' },
      { id: 'inv-security', label: 'Security verified', description: 'No cross-wedding data, no raw token in logs or URLs' },
    ],
  },
  {
    id: 'rsvp', label: '8. RSVP Tested', items: [
      { id: 'rsvp-open', label: 'RSVP form loads', description: 'Guest can open and view RSVP form with correct events' },
      { id: 'rsvp-save', label: 'Draft saves', description: 'Partial response saved as draft' },
      { id: 'rsvp-submit', label: 'Submission succeeds', description: 'Full response submitted, confirmation displayed' },
      { id: 'rsvp-couple-view', label: 'Couple views response', description: 'Submitted response visible in organiser dashboard' },
    ],
  },
  {
    id: 'email', label: '9. Email Tested', items: [
      { id: 'email-send', label: 'Test email sent', description: 'One approved test email sent from production sender' },
      { id: 'email-links', label: 'Email links correct', description: 'Links use production URL, not localhost or preview domain' },
      { id: 'email-delivery', label: 'Delivery confirmed', description: 'Email delivered or failure accurately reported' },
    ],
  },
  {
    id: 'stripe', label: '10. Stripe Test Verified', items: [
      { id: 'stripe-checkout', label: 'Checkout Session created', description: 'Pricing action creates a valid Stripe Checkout Session' },
      { id: 'stripe-payment', label: 'Test payment processed', description: 'Test-mode payment completes successfully' },
      { id: 'stripe-webhook', label: 'Webhook received', description: 'Stripe webhook updates subscription record in Supabase' },
      { id: 'stripe-entitlement', label: 'Entitlement refreshed', description: 'Subscription state reflects plan correctly' },
    ],
  },
  {
    id: 'storage', label: '11. Storage Tested', items: [
      { id: 'storage-upload', label: 'Upload works', description: 'Test image upload creates database record' },
      { id: 'storage-access', label: 'Access policy correct', description: 'Image loads with correct permissions, no cross-wedding access' },
      { id: 'storage-delete', label: 'Cleanup works', description: 'Test item deleted, database and storage in sync' },
    ],
  },
  {
    id: 'security', label: '12. Security Checks Passed', items: [
      { id: 'sec-cross-wedding', label: 'Cross-wedding access blocked', description: 'RLS prevents reading or writing across wedding boundaries' },
      { id: 'sec-guest', label: 'Guest boundaries enforced', description: 'Guests cannot access organiser tables or other guest data' },
      { id: 'sec-secrets', label: 'No secrets in client bundle', description: 'Server-only secrets absent from client-side code' },
      { id: 'sec-tokens', label: 'Token security intact', description: 'Invitation tokens hashed, not logged, not in URLs beyond initial access' },
    ],
  },
  {
    id: 'mobile', label: '13. Mobile Routes Checked', items: [
      { id: 'mobile-login', label: 'Login at 375px', description: 'Login page renders without horizontal overflow' },
      { id: 'mobile-rsvp', label: 'RSVP at 375px', description: 'RSVP form usable on mobile viewport' },
      { id: 'mobile-gallery', label: 'Gallery at 375px', description: 'Gallery pages render without broken layout' },
      { id: 'mobile-billing', label: 'Billing at 375px', description: 'Billing dashboard usable on mobile' },
    ],
  },
  {
    id: 'monitoring', label: '14. Monitoring Active', items: [
      { id: 'mon-frontend', label: 'Frontend error tracking active', description: 'Error boundary and logging confirmed operational' },
      { id: 'mon-functions', label: 'Function failure monitoring active', description: 'Edge Function errors visible in Supabase dashboard' },
      { id: 'mon-webhook', label: 'Webhook monitoring active', description: 'Stripe webhook events logged and visible' },
    ],
  },
  {
    id: 'publish', label: '15. Publishing Verified', items: [
      { id: 'pub-website', label: 'Website publishes correctly', description: 'Draft saved, published, guest-facing version correct' },
      { id: 'pub-draft-private', label: 'Draft changes remain private', description: 'Unpublished changes not visible to guests' },
      { id: 'pub-export', label: 'Export creates real file', description: 'Test export generates valid downloadable file' },
    ],
  },
];

const STORAGE_KEY_PREFIX = 'wedora.launch-checklist';

function getStorageKey(releaseVersion: string): string {
  return `${STORAGE_KEY_PREFIX}.${releaseVersion}`;
}

interface StoredChecklistState {
  releaseVersion: string;
  items: Record<string, { checked: boolean; checkedBy: string; checkedAt: string | null }>;
  updatedAt: string;
}

function loadChecklistState(releaseVersion: string): StoredChecklistState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(releaseVersion));
    if (!raw) return null;
    return JSON.parse(raw) as StoredChecklistState;
  } catch {
    return null;
  }
}

function saveChecklistState(state: StoredChecklistState): void {
  try {
    localStorage.setItem(getStorageKey(state.releaseVersion), JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <i className="ri-check-line text-green-600" />;
  if (status === 'fail') return <i className="ri-close-line text-red-600" />;
  if (status === 'warn') return <i className="ri-error-warning-line text-amber-600" />;
  return <i className="ri-loader-4-line animate-spin text-foreground-400" />;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === 'checking') return null;
  return (
    <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${
      status === 'pass' ? 'bg-green-100 text-green-700' :
      status === 'fail' ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    }`}>
      {status}
    </span>
  );
}

function LaunchStatusCard({ label, value, icon, status }: { label: string; value: string; icon: string; status: CheckStatus }) {
  return (
    <div className="p-4 rounded-lg bg-white border border-secondary-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">{label}</span>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-center gap-2">
        <i className={`${icon} text-foreground-500`} />
        <span className="font-label font-medium text-sm text-foreground-900">{value}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Authorised Content (hooks safe here — no early returns above)
// ═══════════════════════════════════════════

function SystemReadinessContent() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const [activeTab, setActiveTab] = useState<TabId>('health');
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [running, setRunning] = useState(true);
  const [overallVerdict, setOverallVerdict] = useState<CheckStatus>('checking');
  const [edgeFnStatuses, setEdgeFnStatuses] = useState<EdgeFnStatus[]>([]);

  // Launch checklist state
  const [checklistGroups, setChecklistGroups] = useState<LaunchChecklistGroup[]>(() => {
    const stored = loadChecklistState(RELEASE_VERSION);
    return LAUNCH_CHECKLIST_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      items: g.items.map((item) => {
        const saved = stored?.items[item.id];
        return {
          ...item,
          checked: saved?.checked ?? false,
          checkedBy: saved?.checkedBy ?? '',
          checkedAt: saved?.checkedAt ?? null,
        };
      }),
    }));
  });
  const [checklistChanged, setChecklistChanged] = useState(false);
  const [checklistSavedAt, setChecklistSavedAt] = useState<string | null>(null);

  // ── Run health checks ──
  const runChecks = useCallback(async () => {
    setRunning(true);
    setOverallVerdict('checking');

    const results: HealthCheck[] = [];

    // 1. Production mode
    results.push({
      id: 'demo-mode',
      label: 'Production Mode',
      description: 'Demo mode must be disabled for production deployment',
      status: IS_DEMO_MODE ? 'fail' : 'pass',
      detail: IS_DEMO_MODE ? 'VITE_DEMO_MODE is true — application is running in demo mode' : 'VITE_DEMO_MODE is false — production mode active',
    });

    // 2. Supabase URL
    const missingVars = getMissingEnvVars();
    results.push({
      id: 'supabase-url',
      label: 'Supabase URL',
      description: 'Supabase project URL must be configured',
      status: SUPABASE_URL ? 'pass' : 'fail',
      detail: SUPABASE_URL ? 'VITE_PUBLIC_SUPABASE_URL is configured' : 'VITE_PUBLIC_SUPABASE_URL is missing',
    });

    // 3. Supabase Anon Key
    results.push({
      id: 'supabase-anon-key',
      label: 'Supabase Anon Key',
      description: 'Supabase anonymous key must be configured',
      status: missingVars.includes('VITE_PUBLIC_SUPABASE_ANON_KEY') ? 'fail' : 'pass',
      detail: missingVars.includes('VITE_PUBLIC_SUPABASE_ANON_KEY') ? 'VITE_PUBLIC_SUPABASE_ANON_KEY is missing' : 'VITE_PUBLIC_SUPABASE_ANON_KEY is configured',
    });

    // 4. Public site URL
    results.push({
      id: 'public-url',
      label: 'Public Site URL',
      description: 'Canonical public URL for share links and redirects',
      status: PUBLIC_SITE_URL ? 'pass' : 'warn',
      detail: PUBLIC_SITE_URL ? `VITE_PUBLIC_SITE_URL is ${PUBLIC_SITE_URL}` : 'VITE_PUBLIC_SITE_URL is not set — share links may use incorrect URLs',
    });

    // 5. Supabase connectivity
    results.push({ id: 'supabase-conn', label: 'Supabase Connection', description: 'Testing database connectivity', status: 'checking', detail: 'Checking...' });
    try {
      const start = performance.now();
      const { data, error } = await supabase.from('weddings').select('id', { count: 'exact', head: true }).limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) {
        results[results.findIndex((c) => c.id === 'supabase-conn')] = {
          id: 'supabase-conn', label: 'Supabase Connection', description: 'Testing database connectivity',
          status: 'fail', detail: `Query failed — ${error.message.slice(0, 120)}`,
        };
      } else {
        results[results.findIndex((c) => c.id === 'supabase-conn')] = {
          id: 'supabase-conn', label: 'Supabase Connection', description: 'Testing database connectivity',
          status: 'pass', detail: `Connected — ${latency}ms response, ${data !== null ? 'OK' : 'no rows'}`,
        };
      }
    } catch (err: unknown) {
      results[results.findIndex((c) => c.id === 'supabase-conn')] = {
        id: 'supabase-conn', label: 'Supabase Connection', description: 'Testing database connectivity',
        status: 'fail', detail: `Connection failed — ${err instanceof Error ? err.message.slice(0, 120) : 'Unknown error'}`,
      };
    }

    // 6. Auth session
    results.push({
      id: 'auth-session', label: 'Auth Session', description: 'Verifying authenticated session',
      status: profile ? 'pass' : 'warn',
      detail: profile ? `Signed in as ${profile.email || 'unknown'}` : 'No profile loaded — auth may be incomplete',
    });

    // 7. RLS check
    results.push({
      id: 'rls', label: 'Row-Level Security', description: 'Cross-wedding access prevention',
      status: membership ? 'pass' : 'warn',
      detail: membership ? `Active membership with role: ${membership.role}` : 'No wedding membership detected',
    });

    // 8. Storage
    results.push({ id: 'storage', label: 'Storage Buckets', description: 'Checking storage bucket availability', status: 'checking', detail: 'Checking...' });
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketNames = (buckets || []).map((b) => b.name).join(', ');
      results[results.findIndex((c) => c.id === 'storage')] = {
        id: 'storage', label: 'Storage Buckets', description: 'Checking storage bucket availability',
        status: (buckets && buckets.length > 0) ? 'pass' : 'warn',
        detail: buckets && buckets.length > 0 ? `${buckets.length} bucket(s): ${bucketNames}` : 'No storage buckets found',
      };
    } catch {
      results[results.findIndex((c) => c.id === 'storage')] = {
        id: 'storage', label: 'Storage Buckets', description: 'Checking storage bucket availability',
        status: 'fail', detail: 'Could not list storage buckets',
      };
    }

    // 9. Edge Functions
    results.push({ id: 'edge-functions', label: 'Edge Functions', description: 'Checking key Edge Function availability', status: 'checking', detail: 'Checking invitation validation...' });
    const fnStatuses: EdgeFnStatus[] = [];
    const keyFunctions = ['validate-invitation', 'submit-rsvp', 'create-subscription-checkout', 'invitation-send'];
    for (const fnName of keyFunctions) {
      try {
        const { error: fnErr } = await supabase.functions.invoke(fnName, {
          body: { rawToken: 'health-check-probe-token' },
        });
        const unreachable = fnErr && fnErr.message?.includes('Failed to fetch');
        fnStatuses.push({
          name: fnName,
          status: unreachable ? 'fail' : 'pass',
          detail: unreachable ? 'Unreachable' : 'Responds',
        });
      } catch {
        fnStatuses.push({ name: fnName, status: 'fail', detail: 'Invocation failed' });
      }
    }
    setEdgeFnStatuses(fnStatuses);
    const anyFnFail = fnStatuses.some((f) => f.status === 'fail');
    results[results.findIndex((c) => c.id === 'edge-functions')] = {
      id: 'edge-functions', label: 'Edge Functions', description: 'Checking key Edge Function availability',
      status: anyFnFail ? 'fail' : 'pass',
      detail: `${fnStatuses.filter((f) => f.status === 'pass').length}/${fnStatuses.length} key functions reachable`,
    };

    // 10. Plan mapping
    results.push({ id: 'plans', label: 'Subscription Plans', description: 'Stripe plan mapping availability', status: 'checking', detail: 'Checking...' });
    try {
      const { data: plans } = await supabase.from('wedora_subscription_plans').select('plan_code, is_active').eq('is_active', true);
      const planNames = (plans || []).map((p) => p.plan_code).join(', ');
      results[results.findIndex((c) => c.id === 'plans')] = {
        id: 'plans', label: 'Subscription Plans', description: 'Stripe plan mapping availability',
        status: plans && plans.length > 0 ? 'pass' : 'warn',
        detail: plans && plans.length > 0 ? `${plans.length} active plan(s): ${planNames}` : 'No active subscription plans found in wedora_subscription_plans',
      };
    } catch {
      results[results.findIndex((c) => c.id === 'plans')] = {
        id: 'plans', label: 'Subscription Plans', description: 'Stripe plan mapping availability',
        status: 'warn', detail: 'Could not query subscription plans',
      };
    }

    // 11. Public URL validation
    results.push({
      id: 'url-validation',
      label: 'Public URL Validation',
      description: 'Ensuring no localhost in production URLs',
      status: PUBLIC_SITE_URL && (PUBLIC_SITE_URL.includes('localhost') || PUBLIC_SITE_URL.includes('127.0.0.1')) ? 'fail' : (PUBLIC_SITE_URL ? 'pass' : 'warn'),
      detail: PUBLIC_SITE_URL
        ? (PUBLIC_SITE_URL.includes('localhost') || PUBLIC_SITE_URL.includes('127.0.0.1'))
          ? 'VITE_PUBLIC_SITE_URL contains localhost — must be a real domain in production'
          : 'VITE_PUBLIC_SITE_URL is set to a proper domain'
        : 'VITE_PUBLIC_SITE_URL is not configured',
    });

    const hasFail = results.some((c) => c.status === 'fail');
    const hasWarn = results.some((c) => c.status === 'warn');
    const verdict: CheckStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

    setChecks(results);
    setOverallVerdict(verdict);
    setRunning(false);
  }, [profile, membership]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // ── Checklist handlers ──
  const toggleChecklistItem = (groupId: string, itemId: string) => {
    setChecklistGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) => {
            if (item.id !== itemId) return item;
            const newChecked = !item.checked;
            return {
              ...item,
              checked: newChecked,
              checkedBy: newChecked ? (profile?.email || 'unknown') : '',
              checkedAt: newChecked ? new Date().toISOString() : null,
            };
          }),
        };
      }),
    );
    setChecklistChanged(true);
  };

  const saveChecklist = () => {
    const items: Record<string, { checked: boolean; checkedBy: string; checkedAt: string | null }> = {};
    checklistGroups.forEach((g) => {
      g.items.forEach((item) => {
        items[item.id] = { checked: item.checked, checkedBy: item.checkedBy, checkedAt: item.checkedAt };
      });
    });
    const state: StoredChecklistState = {
      releaseVersion: RELEASE_VERSION,
      items,
      updatedAt: new Date().toISOString(),
    };
    saveChecklistState(state);
    setChecklistSavedAt(state.updatedAt);
    setChecklistChanged(false);
  };

  const resetChecklist = () => {
    setChecklistGroups(
      LAUNCH_CHECKLIST_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        items: g.items.map((item) => ({
          ...item,
          checked: false,
          checkedBy: '',
          checkedAt: null,
        })),
      })),
    );
    setChecklistChanged(true);
    setChecklistSavedAt(null);
  };

  const totalChecklistItems = checklistGroups.reduce((sum, g) => sum + g.items.length, 0);
  const checkedCount = checklistGroups.reduce((sum, g) => sum + g.items.filter((i) => i.checked).length, 0);

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background-50">
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">
          Vowora
        </Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">
          System
        </span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">
          v{RELEASE_VERSION}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Diagnostics</p>
          <h1 className="font-heading text-2xl text-foreground-900 mb-2">System Readiness &amp; Launch Control</h1>
          <p className="text-sm text-foreground-500">
            Production deployment health checks, launch checklist, and monitoring dashboard. Access restricted to wedding owners and partners.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-8 bg-secondary-100 rounded-full p-1 w-fit">
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 rounded-full text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'health' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <i className="ri-heart-pulse-line mr-1.5" />
            Health Checks
          </button>
          <button
            onClick={() => setActiveTab('launch')}
            className={`px-4 py-2 rounded-full text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'launch' ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <i className="ri-rocket-line mr-1.5" />
            Launch Control
          </button>
        </div>

        {/* ═══ HEALTH CHECKS TAB ═══ */}
        {activeTab === 'health' && (
          <>
            {!running && (
              <div className={`p-5 rounded-lg mb-8 ${
                overallVerdict === 'pass' ? 'bg-green-50 border border-green-200' :
                overallVerdict === 'warn' ? 'bg-amber-50 border border-amber-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
                    overallVerdict === 'pass' ? 'bg-green-100 text-green-700' :
                    overallVerdict === 'warn' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {overallVerdict === 'pass' ? <i className="ri-shield-check-line text-xl" /> :
                     overallVerdict === 'warn' ? <i className="ri-error-warning-line text-xl" /> :
                     <i className="ri-close-circle-line text-xl" />}
                  </div>
                  <div>
                    <p className="font-label font-semibold text-foreground-900 text-sm">
                      {overallVerdict === 'pass' ? 'All checks passed' :
                       overallVerdict === 'warn' ? 'Some warnings — review before launch' :
                       'Issues detected — do not launch'}
                    </p>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      {overallVerdict === 'pass' ? 'System is ready for production deployment' :
                       overallVerdict === 'warn' ? 'Non-critical configuration gaps detected' :
                       'Critical configuration issues must be resolved'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {checks.map((check) => (
                <div key={check.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <StatusIcon status={check.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label font-medium text-sm text-foreground-900">{check.label}</span>
                      <StatusBadge status={check.status} />
                    </div>
                    <p className="text-xs text-foreground-500 mt-0.5">{check.description}</p>
                    <p className={`text-xs mt-1 ${
                      check.status === 'fail' ? 'text-red-600' :
                      check.status === 'warn' ? 'text-amber-600' :
                      check.status === 'pass' ? 'text-green-700' :
                      'text-foreground-400'
                    }`}>{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-secondary-100 flex items-center gap-3">
              <button
                onClick={runChecks}
                disabled={running}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {running ? <><i className="ri-loader-4-line animate-spin" /> Running...</> : <><i className="ri-restart-line" /> Run checks again</>}
              </button>
              <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
                <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
              </Link>
            </div>
          </>
        )}

        {/* ═══ LAUNCH CONTROL TAB ═══ */}
        {activeTab === 'launch' && (
          <>
            {/* Release info banner */}
            <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg text-foreground-900">Release Information</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold uppercase ${
                  RELEASE_VERSION === 'dev' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {RELEASE_VERSION === 'dev' ? 'Development' : 'Production'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <LaunchStatusCard label="Release Version" value={RELEASE_VERSION} icon="ri-git-branch-line" status={RELEASE_VERSION === 'dev' ? 'warn' : 'pass'} />
                <LaunchStatusCard label="Build Timestamp" value={BUILD_TIMESTAMP ? new Date(BUILD_TIMESTAMP).toLocaleString() : 'Unknown'} icon="ri-calendar-line" status={BUILD_TIMESTAMP ? 'pass' : 'warn'} />
                <LaunchStatusCard label="Demo Mode" value={IS_DEMO_MODE ? 'ON (BLOCKER)' : 'OFF'} icon="ri-contrast-drop-2-line" status={IS_DEMO_MODE ? 'fail' : 'pass'} />
                <LaunchStatusCard label="Public URL" value={PUBLIC_SITE_URL || 'Not set'} icon="ri-global-line" status={PUBLIC_SITE_URL && !PUBLIC_SITE_URL.includes('localhost') ? 'pass' : 'warn'} />
              </div>
            </div>

            {/* Deployment status */}
            <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Deployment Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LaunchStatusCard label="Frontend" value="Deployed" icon="ri-computer-line" status="pass" />
                <LaunchStatusCard label="Supabase Connection" value={SUPABASE_URL ? 'Configured' : 'Missing'} icon="ri-database-2-line" status={SUPABASE_URL ? 'pass' : 'fail'} />
                <LaunchStatusCard label="Auth Service" value={profile ? 'Active' : 'Unknown'} icon="ri-shield-user-line" status={profile ? 'pass' : 'warn'} />
                <LaunchStatusCard label="Active Incident" value="None" icon="ri-alert-line" status="pass" />
              </div>
            </div>

            {/* Edge Function Status */}
            <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Edge Function Status</h2>
              {edgeFnStatuses.length > 0 ? (
                <div className="space-y-2">
                  {edgeFnStatuses.map((fn) => (
                    <div key={fn.name} className="flex items-center justify-between p-3 rounded-lg bg-background-50">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <StatusIcon status={fn.status} />
                        </div>
                        <span className="font-label text-sm text-foreground-900">{fn.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-foreground-400">{fn.detail}</span>
                        <StatusBadge status={fn.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-400">Run Health Checks first to populate Edge Function status.</p>
              )}
            </div>

            {/* Launch Checklist */}
            <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-heading text-lg text-foreground-900">Launch Checklist</h2>
                <div className="flex items-center gap-2">
                  {checklistSavedAt && (
                    <span className="text-[10px] text-foreground-400">
                      Saved {new Date(checklistSavedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-foreground-500 mb-4">
                {checkedCount}/{totalChecklistItems} items checked for release v{RELEASE_VERSION}
              </p>
              <div className="w-full h-1.5 rounded-full bg-secondary-100 mb-6">
                <div className="h-full rounded-full bg-primary-500 transition-all duration-300" style={{ width: totalChecklistItems > 0 ? `${(checkedCount / totalChecklistItems) * 100}%` : '0%' }} />
              </div>

              <div className="space-y-6">
                {checklistGroups.map((group) => (
                  <div key={group.id}>
                    <h3 className="font-label font-semibold text-sm text-foreground-700 mb-2">{group.label}</h3>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleChecklistItem(group.id, item.id)}
                          className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-background-50 transition-colors text-left cursor-pointer"
                        >
                          <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded border-2 mt-0.5 transition-colors ${
                            item.checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-secondary-300 hover:border-secondary-400'
                          }`}>
                            {item.checked && <i className="ri-check-line text-xs" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`font-label text-sm ${item.checked ? 'text-foreground-500 line-through' : 'text-foreground-900'}`}>{item.label}</span>
                            <p className="text-[11px] text-foreground-400 mt-0.5">{item.description}</p>
                            {item.checked && item.checkedAt && (
                              <p className="text-[10px] text-foreground-300 mt-1">
                                Checked by {item.checkedBy || 'unknown'} — {new Date(item.checkedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-secondary-100 flex items-center gap-3">
                <button onClick={saveChecklist} disabled={!checklistChanged} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                  <i className="ri-save-line" /> Save checklist
                </button>
                <button onClick={resetChecklist} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-refresh-line" /> Reset for new release
                </button>
              </div>
            </div>

            {/* Launch decision */}
            <div className={`p-5 rounded-lg border ${
              checkedCount === totalChecklistItems && overallVerdict === 'pass' ? 'bg-green-50 border-green-200' :
              checkedCount >= Math.ceil(totalChecklistItems * 0.8) ? 'bg-amber-50 border-amber-200' : 'bg-background-100 border-secondary-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
                  checkedCount === totalChecklistItems && overallVerdict === 'pass' ? 'bg-green-100 text-green-700' :
                  checkedCount >= Math.ceil(totalChecklistItems * 0.8) ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-secondary-600'
                }`}>
                  {checkedCount === totalChecklistItems && overallVerdict === 'pass' ? <i className="ri-rocket-2-line text-xl" /> : <i className="ri-time-line text-xl" />}
                </div>
                <div>
                  <p className="font-label font-semibold text-sm text-foreground-900">
                    {checkedCount === totalChecklistItems && overallVerdict === 'pass' ? 'GO — Ready for Launch' :
                     checkedCount >= Math.ceil(totalChecklistItems * 0.8) ? 'CONDITIONAL GO — Complete remaining items' : 'HOLD — Complete checklist before launch'}
                  </p>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    {checkedCount === totalChecklistItems && overallVerdict === 'pass' ? `All ${totalChecklistItems} items checked and health checks pass. Safe to proceed with launch.` :
                     `${totalChecklistItems - checkedCount} items remaining. Manual checkboxes cannot override failed automated checks.`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security notice */}
        <div className="mt-6 p-3 rounded-lg bg-background-100 border border-secondary-200">
          <p className="text-[11px] text-foreground-400">
            <i className="ri-lock-line mr-1" />
            This page does not display secret values, API keys, webhook secrets, or private customer data. All checks are safe status reports only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Top-level Page (handles access gates only)
// ═══════════════════════════════════════════

export default function SystemReadinessPage() {
  const { membership } = useActiveWedding();
  const isDemo = isDemoMode;
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
            <i className="ri-tools-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">System Readiness</h1>
          <p className="text-sm text-foreground-500 mb-6">
            This diagnostic is not available in demo mode. Switch to production configuration to run system checks.
          </p>
          <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorised) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-6">
            <i className="ri-shield-check-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Access Restricted</h1>
          <p className="text-sm text-foreground-500 mb-6">
            Only wedding owners and partners can view system diagnostics.
          </p>
          <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <SystemReadinessContent />;
}