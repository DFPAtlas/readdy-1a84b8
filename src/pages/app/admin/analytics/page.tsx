import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type TimeRange = '7d' | '30d' | '90d';
type MetricStatus = 'up' | 'down' | 'flat' | 'no_data';

interface SummaryMetric {
  key: string;
  label: string;
  value: string;
  change: string;
  trend: MetricStatus;
  icon: string;
}

interface FunnelStage {
  label: string;
  count: number;
  pctFromPrev: number | null;
  pctOverall: number;
  medianTime: string | null;
}

interface FeatureUsage {
  feature: string;
  activeCount: number;
  pctOfActive: number;
  actionsCompleted: number;
  trend: MetricStatus;
  errorRate: string | null;
}

interface JourneyFunnel {
  id: string;
  label: string;
  stages: FunnelStage[];
}

function TrendBadge({ trend }: { trend: MetricStatus }) {
  if (trend === 'no_data') return <span className="text-[10px] text-foreground-400 font-label">No data</span>;
  const styles: Record<string, string> = {
    up: 'text-green-600', down: 'text-red-600', flat: 'text-foreground-400',
  };
  const icons: Record<string, string> = {
    up: 'ri-arrow-up-line', down: 'ri-arrow-down-line', flat: 'ri-subtract-line',
  };
  return (
    <span className={`text-[11px] font-label font-medium ${styles[trend]}`}>
      <i className={`${icons[trend]} mr-0.5 text-xs`} />
    </span>
  );
}

function getSinceDate(range: TimeRange): string {
  const d = new Date();
  if (range === '7d') d.setDate(d.getDate() - 7);
  else if (range === '30d') d.setDate(d.getDate() - 30);
  else d.setDate(d.getDate() - 90);
  return d.toISOString();
}

export default function AnalyticsDashboardPage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetric[]>([]);
  const [activationFunnel, setActivationFunnel] = useState<FunnelStage[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [invitationFunnel, setInvitationFunnel] = useState<FunnelStage[]>([]);
  const [websiteFunnel, setWebsiteFunnel] = useState<FunnelStage[]>([]);
  const [billingFunnel, setBillingFunnel] = useState<FunnelStage[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ label: string; count: number }[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = getSinceDate(timeRange);

    try {
      // ── Parallel queries ──
      const [
        weddingsResult, membersResult, websitesResult,
        invitationsResult, rsvpResult, subscriptionsResult,
        supportResult, guestsResult, eventsResult,
        galleryResult, registryResult,
      ] = await Promise.allSettled([
        supabase.from('weddings').select('id, status, created_at').gte('created_at', since),
        supabase.from('wedding_members').select('id, role'),
        supabase.from('wedding_website_configs').select('id, is_published, published_at'),
        supabase.from('invitations').select('id, status, created_at'),
        supabase.from('rsvp_submissions').select('id, status, submitted_at'),
        supabase.from('subscriptions').select('id, status, plan_code, created_at'),
        supabase.from('wedora_support_cases').select('id, status, created_at'),
        supabase.from('guests').select('id, created_at'),
        supabase.from('wedding_events').select('id, created_at'),
        supabase.from('gallery_assets').select('id, status, created_at'),
        supabase.from('gift_registry_items').select('id, is_published'),
      ]);

      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && !r.value.error ? r.value.data : [];

      const weddings = get(weddingsResult);
      const members = get(membersResult);
      const websites = get(websitesResult);
      const invitations = get(invitationsResult);
      const rsvps = get(rsvpResult);
      const subs = get(subscriptionsResult);
      const supportCases = get(supportResult);
      const guests = get(guestsResult);
      const events = get(eventsResult);
      const gallery = get(galleryResult);
      const registry = get(registryResult);

      // ── Summary metrics ──
      const activeWeddingsCount = weddings.filter((w: any) => w.status === 'active').length;
      const newWeddingsCount = weddings.length;
      const publishedSites = websites.filter((w: any) => w.is_published).length;
      const activeMembers = members.length;
      const activeSubs = subs.filter((s: any) => s.status === 'active').length;
      const totalSubs = subs.length;
      const trialSubs = subs.filter((s: any) => s.status === 'trial').length;
      const rsvpSubmitted = rsvps.filter((r: any) => r.status === 'submitted').length;
      const supportOpened = supportCases.filter((c: any) => c.status === 'new' || c.status === 'open').length;

      const trialToPaid = trialSubs > 0 && activeSubs > 0
        ? `${Math.round((activeSubs / (trialSubs + activeSubs)) * 100)}%`
        : 'Not enough data';

      setSummaryMetrics([
        { key: 'accounts', label: 'Active Accounts', value: `${activeMembers}`, change: '', trend: 'no_data', icon: 'ri-user-line' },
        { key: 'weddings', label: 'Active Weddings', value: `${activeWeddingsCount}`, change: `+${newWeddingsCount} new`, trend: newWeddingsCount > 0 ? 'up' : 'flat', icon: 'ri-heart-line' },
        { key: 'websites', label: 'Published Websites', value: `${publishedSites}`, change: '', trend: 'no_data', icon: 'ri-layout-4-line' },
        { key: 'invitations', label: 'Invitations Created', value: `${invitations.length}`, change: '', trend: invitations.length > 0 ? 'up' : 'flat', icon: 'ri-mail-send-line' },
        { key: 'rsvp', label: 'RSVP Submissions', value: `${rsvpSubmitted}`, change: '', trend: 'no_data', icon: 'ri-task-line' },
        { key: 'subs', label: 'Paid Subscriptions', value: `${activeSubs}`, change: `${trialSubs} trial`, trend: activeSubs > 0 ? 'up' : 'flat', icon: 'ri-bank-card-line' },
        { key: 'conversion', label: 'Trial-to-Paid', value: trialToPaid, change: '', trend: 'no_data', icon: 'ri-line-chart-line' },
        { key: 'support', label: 'Support Cases', value: `${supportOpened} open`, change: '', trend: supportOpened > 0 ? 'down' : 'flat', icon: 'ri-customer-service-2-line' },
      ]);

      // ── Activation funnel ──
      const allWeddings = weddings;
      const withDetails = allWeddings.filter((w: any) => w.partner_one_name && w.partner_two_name);
      const withGuests = guests.length > 0 ? Math.min(allWeddings.length, guests.length) : 0;
      const withEvents = events.length > 0 ? Math.min(allWeddings.length, events.length) : 0;
      const withInvitations = invitations.length > 0 ? Math.min(allWeddings.length, invitations.length) : 0;
      const withRSVP = rsvps.length > 0 ? Math.min(allWeddings.length, new Set(rsvps.map((r: any) => r.id)).size) : 0;
      const withWebsite = publishedSites;

      setActivationFunnel([
        { label: 'Account Created', count: activeMembers, pctFromPrev: null, pctOverall: 100, medianTime: null },
        { label: 'Wedding Created', count: weddings.length, pctFromPrev: activeMembers > 0 ? Math.round((weddings.length / activeMembers) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((weddings.length / activeMembers) * 100) : 0, medianTime: null },
        { label: 'Details Completed', count: withDetails.length, pctFromPrev: weddings.length > 0 ? Math.round((withDetails.length / weddings.length) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withDetails.length / activeMembers) * 100) : 0, medianTime: null },
        { label: 'First Guest Added', count: withGuests, pctFromPrev: withDetails.length > 0 ? Math.round((withGuests / withDetails.length) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withGuests / activeMembers) * 100) : 0, medianTime: null },
        { label: 'First Event Created', count: withEvents, pctFromPrev: withGuests > 0 ? Math.round((withEvents / withGuests) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withEvents / activeMembers) * 100) : 0, medianTime: null },
        { label: 'Invitation Created', count: withInvitations, pctFromPrev: withEvents > 0 ? Math.round((withInvitations / withEvents) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withInvitations / activeMembers) * 100) : 0, medianTime: null },
        { label: 'RSVP Configured', count: withRSVP, pctFromPrev: withInvitations > 0 ? Math.round((withRSVP / withInvitations) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withRSVP / activeMembers) * 100) : 0, medianTime: null },
        { label: 'Website Drafted', count: websites.length, pctFromPrev: withRSVP > 0 ? Math.round((websites.length / withRSVP) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((websites.length / activeMembers) * 100) : 0, medianTime: null },
        { label: 'Published', count: withWebsite, pctFromPrev: websites.length > 0 ? Math.round((withWebsite / websites.length) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((withWebsite / activeMembers) * 100) : 0, medianTime: null },
        { label: 'First RSVP Received', count: rsvpSubmitted, pctFromPrev: withWebsite > 0 ? Math.round((rsvpSubmitted / withWebsite) * 100) : 0, pctOverall: activeMembers > 0 ? Math.round((rsvpSubmitted / activeMembers) * 100) : 0, medianTime: null },
      ]);

      // ── Invitation journey funnel ──
      const sent = invitations.filter((i: any) => i.status === 'sent').length;
      setInvitationFunnel([
        { label: 'Created', count: invitations.length, pctFromPrev: null, pctOverall: 100, medianTime: null },
        { label: 'Sent', count: sent, pctFromPrev: invitations.length > 0 ? Math.round((sent / invitations.length) * 100) : 0, pctOverall: 100, medianTime: null },
        { label: 'Opened', count: 0, pctFromPrev: null, pctOverall: 0, medianTime: null },
        { label: 'RSVP Opened', count: 0, pctFromPrev: null, pctOverall: 0, medianTime: null },
        { label: 'RSVP Started', count: 0, pctFromPrev: null, pctOverall: 0, medianTime: null },
        { label: 'RSVP Submitted', count: rsvpSubmitted, pctFromPrev: sent > 0 ? Math.round((rsvpSubmitted / sent) * 100) : 0, pctOverall: invitations.length > 0 ? Math.round((rsvpSubmitted / invitations.length) * 100) : 0, medianTime: null },
      ]);

      // ── Website journey funnel ──
      setWebsiteFunnel([
        { label: 'Builder Opened', count: websites.length, pctFromPrev: null, pctOverall: 100, medianTime: null },
        { label: 'Draft Saved', count: websites.length, pctFromPrev: 100, pctOverall: 100, medianTime: null },
        { label: 'Preview Opened', count: 0, pctFromPrev: null, pctOverall: 0, medianTime: null },
        { label: 'Published', count: publishedSites, pctFromPrev: websites.length > 0 ? Math.round((publishedSites / websites.length) * 100) : 0, pctOverall: 100, medianTime: null },
      ]);

      // ── Billing journey funnel ──
      const subsTotal = subs.length;
      setBillingFunnel([
        { label: 'Plan Selected', count: subsTotal, pctFromPrev: null, pctOverall: 100, medianTime: null },
        { label: 'Checkout Started', count: subsTotal, pctFromPrev: 100, pctOverall: 100, medianTime: null },
        { label: 'Checkout Completed', count: subs.filter((s: any) => s.status !== 'incomplete').length, pctFromPrev: subsTotal > 0 ? Math.round(((subs.filter((s: any) => s.status !== 'incomplete').length) / subsTotal) * 100) : 0, pctOverall: 100, medianTime: null },
        { label: 'Active', count: activeSubs, pctFromPrev: subsTotal > 0 ? Math.round((activeSubs / subsTotal) * 100) : 0, pctOverall: 100, medianTime: null },
      ]);

      // ── Plan distribution ──
      const planMap: Record<string, number> = {};
      subs.forEach((s: any) => {
        const plan = s.plan_code || 'unknown';
        planMap[plan] = (planMap[plan] || 0) + 1;
      });
      setPlanDistribution(Object.entries(planMap).map(([label, count]) => ({ label, count })));

      // ── Feature usage ──
      const totalActive = activeWeddingsCount || 1;
      setFeatureUsage([
        { feature: 'Guests', activeCount: withGuests, pctOfActive: Math.round((withGuests / totalActive) * 100), actionsCompleted: guests.length, trend: guests.length > 0 ? 'up' : 'flat', errorRate: null },
        { feature: 'Invitations', activeCount: withInvitations, pctOfActive: Math.round((withInvitations / totalActive) * 100), actionsCompleted: invitations.length, trend: invitations.length > 0 ? 'up' : 'flat', errorRate: null },
        { feature: 'RSVP', activeCount: rsvps.length, pctOfActive: Math.round((rsvps.length / totalActive) * 100), actionsCompleted: rsvpSubmitted, trend: rsvpSubmitted > 0 ? 'up' : 'flat', errorRate: null },
        { feature: 'Events', activeCount: withEvents, pctOfActive: Math.round((withEvents / totalActive) * 100), actionsCompleted: events.length, trend: events.length > 0 ? 'up' : 'flat', errorRate: null },
        { feature: 'Website', activeCount: websites.length, pctOfActive: Math.round((websites.length / totalActive) * 100), actionsCompleted: publishedSites, trend: publishedSites > 0 ? 'up' : 'flat', errorRate: null },
        { feature: 'Gallery', activeCount: gallery.length, pctOfActive: Math.round((gallery.length / totalActive) * 100), actionsCompleted: gallery.filter((g: any) => g.status === 'approved').length, trend: 'no_data', errorRate: null },
        { feature: 'Registry', activeCount: registry.length, pctOfActive: Math.round((registry.length / totalActive) * 100), actionsCompleted: registry.filter((r: any) => r.is_published).length, trend: 'no_data', errorRate: null },
      ]);

      setLastRefreshed(new Date().toLocaleString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Access gates ──
  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
            <i className="ri-line-chart-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Product Analytics</h1>
          <p className="text-sm text-foreground-500 mb-6">Production analytics are not available in demo mode. Switch to production configuration to view usage data.</p>
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access platform analytics.</p>
          <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Analytics</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Product Insights</p>
            <h1 className="font-heading text-2xl text-foreground-900">Vowora Analytics</h1>
            <p className="text-sm text-foreground-500 mt-1">Aggregated and privacy-safe usage data. No guest names, emails, tokens, or private content is collected.</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && <span className="text-[11px] text-foreground-400 hidden sm:block">Refreshed {lastRefreshed}</span>}
            <button onClick={fetchAnalytics} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
              {loading ? <><i className="ri-loader-4-line animate-spin" /> Loading...</> : <><i className="ri-restart-line" /> Refresh</>}
            </button>
          </div>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1 mb-8 bg-secondary-100 rounded-full p-1 w-fit">
          {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${timeRange === r ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
              {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700 font-label">{error}</p>
            <button onClick={fetchAnalytics} className="ml-auto text-xs text-red-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-secondary-100" />
              ))}
            </div>
            <div className="h-64 rounded-lg bg-secondary-100" />
          </div>
        )}

        {!loading && (
          <>
            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
              {summaryMetrics.map((m) => (
                <div key={m.key} className="p-4 rounded-lg bg-white border border-secondary-100">
                  <div className="flex items-center justify-between mb-2">
                    <i className={`${m.icon} text-foreground-400`} />
                    <TrendBadge trend={m.trend} />
                  </div>
                  <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">{m.label}</p>
                  <p className="font-label font-medium text-lg text-foreground-900 mt-0.5">{m.value}</p>
                  {m.change && <p className="text-[10px] text-foreground-400 mt-0.5">{m.change}</p>}
                </div>
              ))}
            </div>

            {/* Activation funnel */}
            <div className="rounded-lg bg-white border border-secondary-100 p-5 mb-8">
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Activation Funnel</h2>
              {activationFunnel.length > 0 && (
                <div className="space-y-1">
                  {activationFunnel.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-7 text-right text-[10px] font-label text-foreground-400">{i + 1}</span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 bg-secondary-100 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-500/70 transition-all"
                            style={{ width: `${Math.min(stage.pctOverall, 100)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-[10px] font-label font-medium text-foreground-900">{stage.count} {stage.label}</span>
                        </div>
                        <span className="text-[10px] font-label text-foreground-400 w-16 text-right">
                          {stage.pctFromPrev !== null ? `${stage.pctFromPrev}%` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Journey funnels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Invitation journey */}
              <div className="rounded-lg bg-white border border-secondary-100 p-5">
                <h3 className="font-label font-semibold text-sm text-foreground-900 mb-4">Invitation Journey</h3>
                <div className="space-y-2">
                  {invitationFunnel.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-[10px] font-label font-medium text-foreground-500">{i + 1}</span>
                      <span className="text-xs text-foreground-700 flex-1">{s.label}</span>
                      <span className="text-xs font-label font-medium text-foreground-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Website journey */}
              <div className="rounded-lg bg-white border border-secondary-100 p-5">
                <h3 className="font-label font-semibold text-sm text-foreground-900 mb-4">Website Journey</h3>
                <div className="space-y-2">
                  {websiteFunnel.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-[10px] font-label font-medium text-foreground-500">{i + 1}</span>
                      <span className="text-xs text-foreground-700 flex-1">{s.label}</span>
                      <span className="text-xs font-label font-medium text-foreground-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing journey */}
              <div className="rounded-lg bg-white border border-secondary-100 p-5">
                <h3 className="font-label font-semibold text-sm text-foreground-900 mb-4">Billing Journey</h3>
                <div className="space-y-2">
                  {billingFunnel.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary-100 text-[10px] font-label font-medium text-foreground-500">{i + 1}</span>
                      <span className="text-xs text-foreground-700 flex-1">{s.label}</span>
                      <span className="text-xs font-label font-medium text-foreground-900">{s.count}</span>
                    </div>
                  ))}
                </div>

                {/* Plan distribution */}
                {planDistribution.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-secondary-100">
                    <p className="text-[10px] font-label text-foreground-400 uppercase mb-2">Plan Distribution</p>
                    <div className="space-y-1">
                      {planDistribution.map((p) => (
                        <div key={p.label} className="flex items-center gap-2">
                          <span className="text-xs text-foreground-700 flex-1 capitalize">{p.label}</span>
                          <span className="text-xs font-label font-medium text-foreground-900">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Feature usage */}
            <div className="rounded-lg bg-white border border-secondary-100 p-5 mb-8">
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Feature Usage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {featureUsage.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3 p-3 rounded-lg bg-background-50">
                    <div className="flex-1">
                      <p className="text-sm font-label font-medium text-foreground-900">{f.feature}</p>
                      <p className="text-[10px] text-foreground-400">{f.actionsCompleted} actions · {f.pctOfActive}% of weddings</p>
                      {f.errorRate && <p className="text-[10px] text-red-500">{f.errorRate}</p>}
                    </div>
                    <TrendBadge trend={f.trend} />
                  </div>
                ))}
              </div>
            </div>

            {/* No-data notice */}
            {summaryMetrics.every((m) => m.value === '0' || m.value === 'Not enough data') && (
              <div className="p-8 rounded-lg bg-background-100 border border-secondary-200 text-center">
                <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-200 text-foreground-400 mb-4">
                  <i className="ri-bar-chart-line text-xl" />
                </div>
                <p className="font-label font-medium text-sm text-foreground-500">Not enough data for the selected time range</p>
                <p className="text-xs text-foreground-400 mt-1">Try a wider range or wait for more activity to accumulate.</p>
              </div>
            )}

            {/* Privacy notice */}
            <div className="mt-8 p-3 rounded-lg bg-background-100 border border-secondary-200">
              <p className="text-[11px] text-foreground-400">
                <i className="ri-lock-line mr-1" />
                No guest names, emails, tokens, RSVP content, or payment data is collected or displayed. All metrics are aggregated and privacy-safe. Individual customer activity is never exposed.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}