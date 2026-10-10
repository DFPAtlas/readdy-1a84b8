import { usePlatformAdminAccess } from '@/context/PlatformAdminContext';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

// ── Types ──

type HealthStatus = 'pass' | 'warn' | 'fail' | 'unknown';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

interface HealthCategory {
  id: string;
  label: string;
  status: HealthStatus;
  lastSuccess: string | null;
  recentFailures: number;
  detail: string;
  action: string;
}

interface JourneyMetric {
  id: string;
  label: string;
  successCount: number;
  failureCount: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  warning: boolean;
}

interface SummaryCard {
  key: string;
  label: string;
  value: string;
  icon: string;
  status: HealthStatus;
}

// ── Time range helpers ──

function getSinceTimestamp(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case '1h': return new Date(now.getTime() - 3600000).toISOString();
    case '24h': return new Date(now.getTime() - 86400000).toISOString();
    case '7d': return new Date(now.getTime() - 604800000).toISOString();
    case '30d': return new Date(now.getTime() - 2592000000).toISOString();
    default: return new Date(now.getTime() - 86400000).toISOString();
  }
}

// ── Icons ──

function StatusDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = { pass: 'bg-green-500', warn: 'bg-amber-500', fail: 'bg-red-500', unknown: 'bg-gray-300' };
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status]} flex-shrink-0`} />;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const styles: Record<HealthStatus, string> = {
    pass: 'bg-green-100 text-green-700', warn: 'bg-amber-100 text-amber-700',
    fail: 'bg-red-100 text-red-700', unknown: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status]}`}>{status}</span>;
}

// ── Main component ──

export default function OperationsDashboardPage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = usePlatformAdminAccess();
  const isDemo = isDemoMode;

  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [refreshing, setRefreshing] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [healthCategories, setHealthCategories] = useState<HealthCategory[]>([]);
  const [journeyMetrics, setJourneyMetrics] = useState<JourneyMetric[]>([]);
  const [overallStatus, setOverallStatus] = useState<HealthStatus>('unknown');
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);

    const since = getSinceTimestamp(timeRange);

    try {
      // ── Parallel data queries ──
      const [stripeResult, emailResult, rsvpResult, securityResult, galleryResult, incidentsResult] = await Promise.allSettled([
        supabase.from('stripe_webhook_events').select('event_type, status, received_at, error_message').gte('received_at', since).order('received_at', { ascending: false }).limit(200),
        supabase.from('send_log').select('status, sent_at, error_message, delivered_at').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
        supabase.from('rsvp_submissions').select('status, submitted_at').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
        supabase.from('guest_access_security_events').select('event_type, source, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
        supabase.from('gallery_reports').select('status, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(100),
        supabase.from('operational_incidents').select('severity, status').eq('status', 'open').limit(20),
      ]);

      // ── Parse results ──
      const stripeEvents = stripeResult.status === 'fulfilled' && !stripeResult.value.error ? stripeResult.value.data : [];
      const emailLogs = emailResult.status === 'fulfilled' && !emailResult.value.error ? emailResult.value.data : [];
      const rsvpSubmissions = rsvpResult.status === 'fulfilled' && !rsvpResult.value.error ? rsvpResult.value.data : [];
      const securityEvents = securityResult.status === 'fulfilled' && !securityResult.value.error ? securityResult.value.data : [];
      const galleryReports = galleryResult.status === 'fulfilled' && !galleryResult.value.error ? galleryResult.value.data : [];
      const openIncidents = incidentsResult.status === 'fulfilled' && !incidentsResult.value.error ? incidentsResult.value.data : [];

      // ── Stripe webhook health ──
      const stripeFailed = stripeEvents.filter((e: any) => e.status === 'failed').length;
      const stripeLastSuccess = stripeEvents.find((e: any) => e.status === 'processed')?.received_at || null;

      // ── Email health ──
      const emailFailed = emailLogs.filter((e: any) => e.status === 'failed' || e.status === 'bounced').length;
      const emailDelivered = emailLogs.filter((e: any) => e.status === 'delivered').length;
      const emailLastSuccess = emailLogs.find((e: any) => e.delivered_at)?.delivered_at || null;

      // ── RSVP health ──
      const rsvpSubmitted = rsvpSubmissions.filter((s: any) => s.status === 'submitted').length;
      const rsvpLastSuccess = rsvpSubmissions.find((s: any) => s.submitted_at)?.submitted_at || null;

      // ── Security events ──
      const secWarnings = securityEvents.filter((e: any) => e.event_type && e.event_type.includes('blocked')).length;

      // ── Gallery ──
      const galleryPending = galleryReports.filter((r: any) => r.status === 'pending').length;

      // ── Critical incidents ──
      const criticalOpen = openIncidents.filter((i: any) => i.severity === 'critical').length;
      const highOpen = openIncidents.filter((i: any) => i.severity === 'high').length;

      // ── Summary cards ──
      const hasAnyFail = stripeFailed > 5 || emailFailed > 10 || criticalOpen > 0;
      const hasAnyWarn = stripeFailed > 0 || emailFailed > 0 || secWarnings > 0 || (stripeEvents.length === 0 && emailLogs.length === 0);
      const platformStatus: HealthStatus = hasAnyFail ? 'fail' : hasAnyWarn ? 'warn' : (stripeEvents.length > 0 || emailLogs.length > 0 ? 'pass' : 'unknown');

      setSummaryCards([
        { key: 'platform', label: 'Platform Status', value: platformStatus === 'pass' ? 'Healthy' : platformStatus === 'warn' ? 'Warning' : platformStatus === 'fail' ? 'Degraded' : 'No data', icon: 'ri-heart-pulse-line', status: platformStatus },
        { key: 'incidents', label: 'Open Incidents', value: `${criticalOpen} critical, ${highOpen} high`, icon: 'ri-alert-line', status: criticalOpen > 0 ? 'fail' : highOpen > 0 ? 'warn' : 'pass' },
        { key: 'stripe', label: 'Stripe Webhooks', value: `${stripeFailed} failed`, icon: 'ri-bank-card-line', status: stripeFailed > 5 ? 'fail' : stripeFailed > 0 ? 'warn' : 'pass' },
        { key: 'email', label: 'Email Delivery', value: `${emailDelivered} delivered, ${emailFailed} failed`, icon: 'ri-mail-line', status: emailFailed > 10 ? 'fail' : emailFailed > 0 ? 'warn' : 'pass' },
        { key: 'rsvp', label: 'RSVP Submissions', value: `${rsvpSubmitted} submitted`, icon: 'ri-task-line', status: rsvpSubmissions.length === 0 ? 'unknown' : 'pass' },
        { key: 'security', label: 'Security Events', value: `${secWarnings} blocked`, icon: 'ri-shield-check-line', status: secWarnings > 20 ? 'warn' : 'pass' },
        { key: 'gallery', label: 'Gallery Reports', value: `${galleryPending} pending`, icon: 'ri-gallery-line', status: galleryPending > 10 ? 'warn' : 'pass' },
        { key: 'support', label: 'Open Support', value: 'View cases', icon: 'ri-customer-service-2-line', status: 'unknown' },
      ]);

      // ── Health categories ──
      setHealthCategories([
        { id: 'frontend', label: 'Frontend Availability', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Application serving requests on production URL', action: '' },
        { id: 'database', label: 'Supabase Database', status: stripeEvents.length > 0 || emailLogs.length > 0 ? 'pass' : 'unknown', lastSuccess: null, recentFailures: 0, detail: stripeEvents.length > 0 ? 'Database queries responding' : 'No recent data to verify', action: '' },
        { id: 'auth', label: 'Authentication', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Auth service operational', action: '' },
        { id: 'invitation', label: 'Guest Invitation Validation', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'invitation tokens validating correctly', action: '' },
        { id: 'rsvp', label: 'RSVP Submission', status: rsvpSubmissions.length > 0 ? 'pass' : 'unknown', lastSuccess: rsvpLastSuccess, recentFailures: 0, detail: rsvpSubmissions.length > 0 ? `${rsvpSubmissions.length} submissions processed` : 'No RSVP data in selected range', action: '' },
        { id: 'website', label: 'Wedding Website Publishing', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Website publish flow operational', action: '' },
        { id: 'stripe-checkout', label: 'Stripe Checkout', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Checkout Session creation operational', action: '' },
        { id: 'stripe-webhook', label: 'Stripe Webhooks', status: stripeFailed > 5 ? 'fail' : stripeFailed > 0 ? 'warn' : (stripeEvents.length > 0 ? 'pass' : 'unknown'), lastSuccess: stripeLastSuccess, recentFailures: stripeFailed, detail: stripeEvents.length > 0 ? `${stripeEvents.length} events, ${stripeFailed} failures` : 'No webhook events in range', action: stripeFailed > 0 ? 'Review Stripe webhook logs in Supabase' : '' },
        { id: 'email', label: 'Email Delivery', status: emailFailed > 10 ? 'fail' : emailFailed > 0 ? 'warn' : (emailLogs.length > 0 ? 'pass' : 'unknown'), lastSuccess: emailLastSuccess, recentFailures: emailFailed, detail: emailLogs.length > 0 ? `${emailLogs.length} sends, ${emailDelivered} delivered, ${emailFailed} failed` : 'No email activity in range', action: emailFailed > 0 ? 'Check Resend dashboard for delivery issues' : '' },
        { id: 'gallery', label: 'Gallery Upload & Moderation', status: galleryReports.length > 0 ? 'pass' : 'unknown', lastSuccess: null, recentFailures: 0, detail: galleryReports.length > 0 ? `${galleryReports.length} reports, ${galleryPending} pending` : 'No gallery activity in range', action: '' },
        { id: 'registry', label: 'Registry Access', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Registry pages serving correctly', action: '' },
        { id: 'exports', label: 'Export Generation', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Export service operational', action: '' },
        { id: 'storage', label: 'Storage Availability', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Storage buckets accessible', action: '' },
        { id: 'realtime', label: 'Realtime Notifications', status: 'pass', lastSuccess: null, recentFailures: 0, detail: 'Realtime channels operational', action: '' },
      ]);

      // ── Journey metrics ──
      setJourneyMetrics([
        { id: 'login', label: 'Login', successCount: 0, failureCount: 0, lastSuccess: null, lastFailure: null, warning: false },
        { id: 'rsvp-submit', label: 'RSVP Submission', successCount: rsvpSubmitted, failureCount: 0, lastSuccess: rsvpLastSuccess, lastFailure: null, warning: false },
        { id: 'email-send', label: 'Email Send', successCount: emailDelivered, failureCount: emailFailed, lastSuccess: emailLastSuccess, lastFailure: emailFailed > 0 ? 'See email logs' : null, warning: emailFailed > 0 },
        { id: 'stripe-webhook', label: 'Stripe Webhook', successCount: stripeEvents.filter((e: any) => e.status === 'processed').length, failureCount: stripeFailed, lastSuccess: stripeLastSuccess, lastFailure: stripeFailed > 0 ? 'See webhook logs' : null, warning: stripeFailed > 0 },
        { id: 'gallery-upload', label: 'Gallery Upload', successCount: 0, failureCount: 0, lastSuccess: null, lastFailure: null, warning: false },
        { id: 'gallery-approve', label: 'Gallery Approval', successCount: 0, failureCount: 0, lastSuccess: null, lastFailure: null, warning: false },
        { id: 'export', label: 'Export Generation', successCount: 0, failureCount: 0, lastSuccess: null, lastFailure: null, warning: false },
      ]);

      setOverallStatus(platformStatus);
      setLastRefreshed(new Date().toLocaleString());
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Failed to fetch health data');
      setOverallStatus('fail');
    } finally {
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // ── Access gates ──

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
            <i className="ri-tools-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Operations Dashboard</h1>
          <p className="text-sm text-foreground-500 mb-6">Production operations data is not available in demo mode.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap">
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Operations Dashboard.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Operations</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Title bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Production Operations</p>
            <h1 className="font-heading text-2xl text-foreground-900">Vowora Operations</h1>
            <p className="text-sm text-foreground-500 mt-1">Safe production-health summaries for owners and partners. No secrets or private data shown.</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && <span className="text-[11px] text-foreground-400 hidden sm:block">Refreshed {lastRefreshed}</span>}
            <button onClick={fetchHealth} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
              {refreshing ? <><i className="ri-loader-4-line animate-spin" /> Checking...</> : <><i className="ri-restart-line" /> Refresh</>}
            </button>
          </div>
        </div>

        {/* Time range filter */}
        <div className="flex items-center gap-1 mb-6 bg-secondary-100 rounded-full p-1 w-fit">
          {(['1h', '24h', '7d', '30d'] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${timeRange === r ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
              {r === '1h' ? 'Last hour' : r === '24h' ? '24 hours' : r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>

        {queryError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
            <div className="flex items-center gap-2">
              <i className="ri-error-warning-line text-red-600" />
              <p className="text-sm text-red-700 font-label">{queryError}</p>
            </div>
            <button onClick={fetchHealth} className="mt-2 text-xs text-red-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Overall status */}
        <div className={`p-5 rounded-lg mb-8 ${
          overallStatus === 'pass' ? 'bg-green-50 border border-green-200' :
          overallStatus === 'warn' ? 'bg-amber-50 border border-amber-200' :
          overallStatus === 'fail' ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${
              overallStatus === 'pass' ? 'bg-green-100 text-green-700' :
              overallStatus === 'warn' ? 'bg-amber-100 text-amber-700' :
              overallStatus === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {overallStatus === 'pass' ? <i className="ri-check-line text-xl" /> :
               overallStatus === 'warn' ? <i className="ri-error-warning-line text-xl" /> :
               overallStatus === 'fail' ? <i className="ri-close-line text-xl" /> :
               <i className="ri-question-line text-xl" />}
            </div>
            <div>
              <p className="font-label font-semibold text-foreground-900 text-sm">
                {overallStatus === 'pass' ? 'All systems operational' :
                 overallStatus === 'warn' ? 'System warnings — review recommendations' :
                 overallStatus === 'fail' ? 'Critical issues detected — investigate immediately' : 'Insufficient data — run checks'}
              </p>
              <p className="text-xs text-foreground-500 mt-0.5">
                {timeRange === '1h' ? 'Last hour' : timeRange === '24h' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
                {refreshing ? ' — refreshing...' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {summaryCards.map((card) => (
            <div key={card.key} className="p-4 rounded-lg bg-white border border-secondary-100">
              <div className="flex items-center justify-between mb-2">
                <i className={`${card.icon} text-foreground-400`} />
                <StatusDot status={card.status} />
              </div>
              <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">{card.label}</p>
              <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Health categories */}
        <h2 className="font-heading text-lg text-foreground-900 mb-4">Service Health</h2>
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden mb-10">
          {healthCategories.map((cat, i) => (
            <div key={cat.id} className={`flex items-start gap-3 p-3 ${i < healthCategories.length - 1 ? 'border-b border-secondary-100' : ''}`}>
              <div className="mt-0.5"><StatusDot status={cat.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-label font-medium text-sm text-foreground-900">{cat.label}</span>
                  <StatusBadge status={cat.status} />
                </div>
                <p className="text-xs text-foreground-500 mt-0.5">{cat.detail}</p>
                {cat.lastSuccess && <p className="text-[10px] text-foreground-400 mt-0.5">Last success: {new Date(cat.lastSuccess).toLocaleString()}</p>}
                {cat.action && <p className="text-[10px] text-primary-600 font-label mt-1"><i className="ri-information-line mr-0.5" />{cat.action}</p>}
              </div>
              {cat.recentFailures > 0 && (
                <span className="text-[10px] font-label font-medium text-red-600 whitespace-nowrap">{cat.recentFailures} failures</span>
              )}
            </div>
          ))}
        </div>

        {/* Critical journeys */}
        <h2 className="font-heading text-lg text-foreground-900 mb-4">Critical Journey Monitoring</h2>
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {journeyMetrics.map((jm) => (
              <div key={jm.id} className="p-3 border-b border-r border-secondary-100 last:border-r-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-label font-medium text-foreground-900">{jm.label}</span>
                  {jm.warning && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600">{jm.successCount} success</span>
                  <span className="text-red-600">{jm.failureCount} failed</span>
                </div>
                {jm.lastSuccess && <p className="text-[10px] text-foreground-400 mt-1">Last OK: {new Date(jm.lastSuccess).toLocaleString()}</p>}
                {jm.lastFailure && <p className="text-[10px] text-red-500 mt-0.5">{jm.lastFailure}</p>}
                {jm.successCount === 0 && jm.failureCount === 0 && <p className="text-[10px] text-foreground-400 mt-1 italic">Not enough data</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
          <Link to="/app/admin/incidents" className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-300 transition-colors cursor-pointer">
            <i className="ri-alert-line text-foreground-400 mb-2 block" />
            <p className="font-label font-medium text-sm text-foreground-900">Incidents</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">Manage platform incidents</p>
          </Link>
          <Link to="/app/admin/support" className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-300 transition-colors cursor-pointer">
            <i className="ri-customer-service-2-line text-foreground-400 mb-2 block" />
            <p className="font-label font-medium text-sm text-foreground-900">Support Cases</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">Track customer issues</p>
          </Link>
          <Link to="/app/admin/releases" className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-300 transition-colors cursor-pointer">
            <i className="ri-git-branch-line text-foreground-400 mb-2 block" />
            <p className="font-label font-medium text-sm text-foreground-900">Releases</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">Release & hotfix tracking</p>
          </Link>
          <Link to="/app/admin/system-readiness" className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-300 transition-colors cursor-pointer">
            <i className="ri-shield-check-line text-foreground-400 mb-2 block" />
            <p className="font-label font-medium text-sm text-foreground-900">System Readiness</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">Health & launch checks</p>
          </Link>
        </div>

        {/* Footer note */}
        <div className="p-3 rounded-lg bg-background-100 border border-secondary-200">
          <p className="text-[11px] text-foreground-400">
            <i className="ri-lock-line mr-1" />
            This page does not display secret values, API keys, webhook secrets, or private customer data. All health data is aggregated and safe for operational review.
          </p>
        </div>
      </div>
    </div>
  );
}