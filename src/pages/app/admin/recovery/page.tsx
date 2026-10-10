import { usePlatformAdminAccess } from '@/context/PlatformAdminContext';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type RestoreStatus = 'planned' | 'running' | 'passed' | 'passed_with_warnings' | 'failed';
type VerifyResult = 'passed' | 'failed' | 'skipped' | 'partial';

interface RestoreTest {
  id: string;
  backup_id: string | null;
  test_environment: string;
  status: RestoreStatus;
  requested_by: string;
  started_at: string | null;
  completed_at: string | null;
  database_restoration_result: VerifyResult | null;
  storage_restoration_result: VerifyResult | null;
  authentication_verification: VerifyResult | null;
  rls_verification: VerifyResult | null;
  guest_rsvp_verification: VerifyResult | null;
  stripe_isolation: boolean;
  email_isolation: boolean;
  issues_found: string | null;
  resolution: string | null;
  overall_result: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: RestoreStatus }) {
  const styles: Record<RestoreStatus, string> = {
    planned: 'bg-blue-100 text-blue-700', running: 'bg-amber-100 text-amber-700',
    passed: 'bg-green-100 text-green-700', passed_with_warnings: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  };
  return <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status]}`}>{status.replace('_', ' ')}</span>;
}

function ResultBadge({ result }: { result: VerifyResult | null }) {
  if (!result) return <span className="text-[10px] text-foreground-400">—</span>;
  const styles: Record<VerifyResult, string> = {
    passed: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700',
    skipped: 'bg-gray-50 text-gray-500', partial: 'bg-amber-50 text-amber-700',
  };
  return <span className={`text-[10px] font-label font-medium px-1.5 py-0.5 rounded ${styles[result]}`}>{result}</span>;
}

// ── Demo data ──
const DEMO_TESTS: RestoreTest[] = [
  {
    id: 'rt-042', backup_id: 'bak-001', test_environment: 'staging-vowora-01', status: 'passed',
    requested_by: 'System Admin', started_at: '2027-08-05T08:00:00Z', completed_at: '2027-08-05T08:27:30Z',
    database_restoration_result: 'passed', storage_restoration_result: 'skipped', authentication_verification: 'passed',
    rls_verification: 'passed', guest_rsvp_verification: 'passed', stripe_isolation: true, email_isolation: true,
    issues_found: null, resolution: null, overall_result: 'passed', created_at: '2027-08-05T08:00:00Z',
  },
  {
    id: 'rt-041', backup_id: 'bak-005', test_environment: 'staging-vowora-01', status: 'passed_with_warnings',
    requested_by: 'System Admin', started_at: '2027-08-04T09:00:00Z', completed_at: '2027-08-04T09:32:15Z',
    database_restoration_result: 'passed', storage_restoration_result: 'partial', authentication_verification: 'passed',
    rls_verification: 'passed', guest_rsvp_verification: 'passed', stripe_isolation: true, email_isolation: true,
    issues_found: 'Storage restoration partial — 3 large gallery files failed checksum. Re-uploaded from origin bucket.',
    resolution: 'Files re-verified; affected records matched.', overall_result: 'passed_with_warnings', created_at: '2027-08-04T09:00:00Z',
  },
  {
    id: 'rt-040', backup_id: null, test_environment: 'staging-vowora-01', status: 'failed',
    requested_by: 'System Admin', started_at: '2027-08-03T14:00:00Z', completed_at: '2027-08-03T14:15:10Z',
    database_restoration_result: 'failed', storage_restoration_result: 'skipped', authentication_verification: 'skipped',
    rls_verification: 'skipped', guest_rsvp_verification: 'skipped', stripe_isolation: true, email_isolation: true,
    issues_found: 'Migration 0047_add_seating_indexes failed — index already exists on restored schema. Forward-fixed by dropping duplicate index.',
    resolution: 'Forward-fix applied. New restore test RT-041 succeeded.', overall_result: 'failed', created_at: '2027-08-03T14:00:00Z',
  },
];

// ── Main component ──

export default function RecoveryPage() {
  const { membership } = useActiveWedding();
  const isAuthorised = usePlatformAdminAccess();
  const isDemo = isDemoMode;

  const [refreshing, setRefreshing] = useState(true);
  const [tests, setTests] = useState<RestoreTest[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);
    if (isDemo) { setTests(DEMO_TESTS); setRefreshing(false); return; }
    try {
      const { data, error } = await supabase.from('restore_tests').select('*').order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      setTests(data || []);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Failed to fetch restore tests');
    } finally {
      setRefreshing(false);
    }
  }, [isDemo]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const latestPassed = tests.find((t) => t.overall_result === 'passed');
  const failed = tests.filter((t) => t.overall_result === 'failed').length;

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50">
        <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
          <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
          <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Recovery</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <RecoveryContent tests={tests} refreshing={refreshing} queryError={queryError} latestPassed={latestPassed} failed={failed} onRefresh={fetchTests} isDemo />
        </div>
      </div>
    );
  }

  if (!isAuthorised) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-6"><i className="ri-shield-check-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Access Restricted</h1>
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Recovery dashboard.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" /> Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Recovery</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <RecoveryContent tests={tests} refreshing={refreshing} queryError={queryError} latestPassed={latestPassed} failed={failed} onRefresh={fetchTests} isDemo={false} />
      </div>
    </div>
  );
}

function RecoveryContent({ tests, refreshing, queryError, latestPassed, failed, onRefresh, isDemo }: {
  tests: RestoreTest[];
  refreshing: boolean;
  queryError: string | null;
  latestPassed: RestoreTest | undefined;
  failed: number;
  onRefresh: () => void;
  isDemo: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Disaster recovery readiness</p>
          <h1 className="font-heading text-2xl text-foreground-900">Restore Tests</h1>
          <p className="text-sm text-foreground-500 mt-1">Every restore test runs in an isolated environment. Production data is never overwritten by routine tests.</p>
        </div>
        <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
          {refreshing ? <><i className="ri-loader-4-line animate-spin" /> Refreshing...</> : <><i className="ri-restart-line" /> Refresh</>}
        </button>
      </div>

      {queryError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
          <div className="flex items-center gap-2"><i className="ri-error-warning-line text-red-600" /><p className="text-sm text-red-700 font-label">{queryError}</p></div>
          <button onClick={onRefresh} className="mt-2 text-xs text-red-600 underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Latest Passed</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{latestPassed ? new Date(latestPassed.completed_at || '').toLocaleDateString() : 'None'}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Total Tests</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{tests.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Failed</p>
          <p className={`font-label font-medium text-sm mt-0.5 ${failed > 0 ? 'text-red-600' : 'text-foreground-900'}`}>{failed}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Environment</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">Isolated</p>
        </div>
      </div>

      {isDemo && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
          <p className="text-xs text-amber-700"><i className="ri-information-line mr-1" /><strong>Demo data:</strong> These are sample restore test records showing the verification workflow. Restore tests must always run in isolated environments — never over production.</p>
        </div>
      )}

      {/* Restore test requirements checklist */}
      <div className="mb-8 p-4 rounded-lg bg-white border border-secondary-100">
        <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Restore Test Verification Checklist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            'Database opens successfully',
            'Migration history is readable',
            'Weddings and memberships exist',
            'RLS remains enabled',
            'Cross-wedding access blocked',
            'Auth test user accesses only authorised data',
            'Guest token validation safe',
            'RSVP data consistent',
            'Storage references resolve',
            'Stripe disconnected or test-only',
            'Resend disabled or test-only',
            'Demo mode correctly separated',
            'Production secrets not copied',
            'Application builds against restored schema',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5"><i className="ri-checkbox-blank-circle-line text-foreground-300 text-[10px]" /><span className="text-xs text-foreground-600">{item}</span></div>
          ))}
        </div>
      </div>

      {/* Restore tests list */}
      <h2 className="font-heading text-lg text-foreground-900 mb-4">Restore Test Register</h2>
      {refreshing && tests.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center">
          <i className="ri-loader-4-line animate-spin text-2xl text-foreground-300 mb-3 block" />
          <p className="text-sm text-foreground-400">Loading restore tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-3"><i className="ri-restart-line text-xl" /></div>
          <p className="text-sm text-foreground-500">No restore tests recorded</p>
          <p className="text-xs text-foreground-400 mt-1">Restore tests appear here when verified in isolated environments.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden mb-8">
          {tests.map((test) => (
            <div key={test.id} className="border-b border-secondary-100 last:border-b-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-foreground-500 flex-shrink-0">
                  <i className="ri-restart-line" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-label font-medium text-sm text-foreground-900">Test {test.id}</span>
                    <StatusBadge status={test.status} />
                    {test.overall_result && <span className={`text-[10px] font-label font-semibold ${test.overall_result === 'passed' ? 'text-green-600' : test.overall_result === 'passed_with_warnings' ? 'text-amber-600' : 'text-red-600'}`}>{test.overall_result.replace('_', ' ')}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-500">
                    <span>Env: {test.test_environment}</span>
                    <span>By: {test.requested_by}</span>
                    {test.started_at && <span>{new Date(test.started_at).toLocaleString()}</span>}
                  </div>
                </div>
                <button onClick={() => setExpandedId(expandedId === test.id ? null : test.id)} className="flex-shrink-0 text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  {expandedId === test.id ? 'Less detail' : 'Full detail'}
                  <i className={`ml-1 ${expandedId === test.id ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`} />
                </button>
              </div>
              {expandedId === test.id && (
                <div className="px-3 pb-4 pt-0 bg-background-50 border-t border-secondary-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3">
                    <div><p className="text-foreground-400">Database</p><ResultBadge result={test.database_restoration_result} /></div>
                    <div><p className="text-foreground-400">Storage</p><ResultBadge result={test.storage_restoration_result} /></div>
                    <div><p className="text-foreground-400">Authentication</p><ResultBadge result={test.authentication_verification} /></div>
                    <div><p className="text-foreground-400">RLS</p><ResultBadge result={test.rls_verification} /></div>
                    <div><p className="text-foreground-400">Guest RSVP</p><ResultBadge result={test.guest_rsvp_verification} /></div>
                    <div><p className="text-foreground-400">Stripe Isolated</p><span className="text-[10px] font-label">{test.stripe_isolation ? 'Yes' : 'No'}</span></div>
                    <div><p className="text-foreground-400">Email Isolated</p><span className="text-[10px] font-label">{test.email_isolation ? 'Yes' : 'No'}</span></div>
                  </div>
                  {test.issues_found && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[10px] font-label font-semibold text-amber-700 mb-0.5">Issues found</p>
                      <p className="text-xs text-amber-700">{test.issues_found}</p>
                    </div>
                  )}
                  {test.resolution && (
                    <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-[10px] font-label font-semibold text-green-700 mb-0.5">Resolution</p>
                      <p className="text-xs text-green-700">{test.resolution}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recovery objectives */}
      <div className="mb-8 p-4 rounded-lg bg-white border border-secondary-100">
        <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Recovery Objectives</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-background-50 border border-secondary-200">
            <p className="font-label font-semibold text-foreground-900 mb-1">Recovery Point Objective (RPO)</p>
            <p className="text-foreground-600">24 hours <span className="text-[10px] text-amber-600 font-label ml-1">Proposed</span></p>
            <p className="text-[10px] text-foreground-400 mt-1">Based on daily Supabase backups. Requires admin confirmation.</p>
          </div>
          <div className="p-3 rounded-lg bg-background-50 border border-secondary-200">
            <p className="font-label font-semibold text-foreground-900 mb-1">Recovery Time Objective (RTO)</p>
            <p className="text-foreground-600">4 hours <span className="text-[10px] text-amber-600 font-label ml-1">Proposed</span></p>
            <p className="text-[10px] text-foreground-400 mt-1">Includes database restoration, function deployment, and smoke testing.</p>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-background-100 border border-secondary-200">
        <p className="text-[11px] text-foreground-400"><i className="ri-lock-line mr-1" />Restore tests run in isolated environments only. Production is never overwritten. No customer emails or live Stripe charges are triggered during testing.</p>
      </div>
    </>
  );
}