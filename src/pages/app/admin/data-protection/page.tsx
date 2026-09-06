import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type RequestStatus = 'submitted' | 'verification_required' | 'verified' | 'processing' | 'waiting_for_customer' | 'completed' | 'rejected' | 'cancelled' | 'failed';
type RequestType = 'account_export' | 'wedding_export' | 'account_deletion' | 'wedding_deletion' | 'correction' | 'restriction' | 'other';

interface PrivacyRequest {
  id: string;
  request_type: RequestType;
  user_id: string;
  wedding_id: string | null;
  status: RequestStatus;
  submitted_at: string;
  verified_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  export_storage_path: string | null;
  export_expires_at: string | null;
  downloaded_at: string | null;
  deletion_reference: string | null;
  cooling_off_until: string | null;
  scheduled_deletion_at: string | null;
  failure_reason: string | null;
  safe_notes: string | null;
}

type Tab = 'requests' | 'retention' | 'deletion' | 'audit';

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  account_export: 'Account Export', wedding_export: 'Wedding Export',
  account_deletion: 'Account Deletion', wedding_deletion: 'Wedding Deletion',
  correction: 'Correction', restriction: 'Restriction', other: 'Other',
};

const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  account_export: 'ri-download-line', wedding_export: 'ri-folder-download-line',
  account_deletion: 'ri-delete-bin-line', wedding_deletion: 'ri-delete-bin-6-line',
  correction: 'ri-edit-line', restriction: 'ri-lock-line', other: 'ri-question-line',
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    submitted: 'bg-blue-100 text-blue-700', verification_required: 'bg-purple-100 text-purple-700',
    verified: 'bg-emerald-100 text-emerald-700', processing: 'bg-amber-100 text-amber-700',
    waiting_for_customer: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500', failed: 'bg-red-100 text-red-700',
  };
  return <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
}

// ── Demo data ──
const DEMO_REQUESTS: PrivacyRequest[] = [
  { id: 'pr-001', request_type: 'account_export', user_id: 'usr-emma', wedding_id: null, status: 'completed', submitted_at: '2027-08-01T10:00:00Z', verified_at: '2027-08-01T10:15:00Z', assigned_to: null, completed_at: '2027-08-01T10:30:00Z', export_storage_path: 'private/exports/pr-001.zip', export_expires_at: '2027-08-08T10:30:00Z', downloaded_at: '2027-08-01T11:00:00Z', deletion_reference: null, cooling_off_until: null, scheduled_deletion_at: null, failure_reason: null, safe_notes: 'Full account export requested and downloaded by owner.' },
  { id: 'pr-002', request_type: 'wedding_deletion', user_id: 'usr-emma', wedding_id: 'wed-demo-01', status: 'processing', submitted_at: '2027-08-04T14:00:00Z', verified_at: '2027-08-04T14:30:00Z', assigned_to: null, completed_at: null, export_storage_path: null, export_expires_at: null, downloaded_at: null, deletion_reference: 'DEL-2027-08-04-001', cooling_off_until: '2027-09-03T14:00:00Z', scheduled_deletion_at: '2027-09-04T02:00:00Z', failure_reason: null, safe_notes: 'Cooling-off period active. Deletion scheduled after 30 days.' },
  { id: 'pr-003', request_type: 'wedding_export', user_id: 'usr-james', wedding_id: 'wed-demo-02', status: 'verification_required', submitted_at: '2027-08-05T09:00:00Z', verified_at: null, assigned_to: null, completed_at: null, export_storage_path: null, export_expires_at: null, downloaded_at: null, deletion_reference: null, cooling_off_until: null, scheduled_deletion_at: null, failure_reason: null, safe_notes: 'Awaiting email verification before processing.' },
  { id: 'pr-004', request_type: 'account_deletion', user_id: 'usr-sarah', wedding_id: null, status: 'failed', submitted_at: '2027-08-02T16:00:00Z', verified_at: '2027-08-02T16:20:00Z', assigned_to: null, completed_at: '2027-08-02T16:25:00Z', export_storage_path: null, export_expires_at: null, downloaded_at: null, deletion_reference: null, cooling_off_until: null, scheduled_deletion_at: null, failure_reason: 'Active subscription found — must cancel billing before account deletion.', safe_notes: 'User contacted; pending subscription cancellation.' },
  { id: 'pr-005', request_type: 'correction', user_id: 'usr-tom', wedding_id: 'wed-demo-03', status: 'completed', submitted_at: '2027-07-28T11:00:00Z', verified_at: '2027-07-28T11:10:00Z', assigned_to: null, completed_at: '2027-07-28T11:45:00Z', export_storage_path: null, export_expires_at: null, downloaded_at: null, deletion_reference: null, cooling_off_until: null, scheduled_deletion_at: null, failure_reason: null, safe_notes: 'Guest name spelling corrected across 3 records.' },
];

export default function DataProtectionPage() {
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [refreshing, setRefreshing] = useState(true);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);
    if (isDemo) { setRequests(DEMO_REQUESTS); setRefreshing(false); return; }
    try {
      const { data, error } = await supabase.from('privacy_requests').select('*').order('submitted_at', { ascending: false }).limit(100);
      if (error) throw error;
      setRequests(data || []);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Failed to fetch privacy requests');
    } finally {
      setRefreshing(false);
    }
  }, [isDemo]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Summary stats
  const openCount = requests.filter((r) => !['completed', 'rejected', 'cancelled', 'failed'].includes(r.status)).length;
  const deletionCount = requests.filter((r) => (r.request_type === 'account_deletion' || r.request_type === 'wedding_deletion') && !['completed', 'rejected', 'cancelled', 'failed'].includes(r.status)).length;
  const nearingDeadline = requests.filter((r) => r.cooling_off_until && new Date(r.cooling_off_until) < new Date(Date.now() + 86400000 * 3)).length;
  const exportPending = requests.filter((r) => r.status === 'completed' && r.export_storage_path && r.export_expires_at && new Date(r.export_expires_at) > new Date() && !r.downloaded_at).length;

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    if (isDemo) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
      return;
    }
    try {
      await supabase.from('privacy_requests').update({ status: newStatus }).eq('id', id);
      fetchRequests();
    } catch { /* silent */ }
  };

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50">
        <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
          <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
          <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Data Protection</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <DataProtectionContent activeTab={activeTab} setActiveTab={setActiveTab} requests={requests} refreshing={refreshing} queryError={queryError} openCount={openCount} deletionCount={deletionCount} nearingDeadline={nearingDeadline} exportPending={exportPending} onRefresh={fetchRequests} onStatusChange={handleStatusChange} isDemo />
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Data Protection dashboard.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" /> Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Data Protection</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <DataProtectionContent activeTab={activeTab} setActiveTab={setActiveTab} requests={requests} refreshing={refreshing} queryError={queryError} openCount={openCount} deletionCount={deletionCount} nearingDeadline={nearingDeadline} exportPending={exportPending} onRefresh={fetchRequests} onStatusChange={handleStatusChange} isDemo={false} />
      </div>
    </div>
  );
}

function DataProtectionContent({ activeTab, setActiveTab, requests, refreshing, queryError, openCount, deletionCount, nearingDeadline, exportPending, onRefresh, onStatusChange, isDemo }: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  requests: PrivacyRequest[];
  refreshing: boolean;
  queryError: string | null;
  openCount: number;
  deletionCount: number;
  nearingDeadline: number;
  exportPending: number;
  onRefresh: () => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  isDemo: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Privacy operations</p>
          <h1 className="font-heading text-2xl text-foreground-900">Data Protection</h1>
          <p className="text-sm text-foreground-500 mt-1">Manage privacy requests, retention schedules, deletions, and audit trails.</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-file-list-3-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Open Requests</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{openCount}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-delete-bin-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Open Deletions</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{deletionCount}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-timer-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Nearing Deadline</p>
          <p className={`font-label font-medium text-sm mt-0.5 ${nearingDeadline > 0 ? 'text-amber-600' : 'text-foreground-900'}`}>{nearingDeadline}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-download-cloud-2-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Exports Pending Download</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{exportPending}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-secondary-100 rounded-full p-1 w-fit">
        {(['requests', 'retention', 'deletion', 'audit'] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap capitalize ${activeTab === tab ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'requests' && <RequestsTab requests={requests} refreshing={refreshing} onStatusChange={onStatusChange} isDemo={isDemo} />}
      {activeTab === 'retention' && <RetentionTab isDemo={isDemo} />}
      {activeTab === 'deletion' && <DeletionTab requests={requests.filter((r) => r.request_type === 'account_deletion' || r.request_type === 'wedding_deletion')} isDemo={isDemo} />}
      {activeTab === 'audit' && <AuditTab requests={requests} isDemo={isDemo} />}

      {/* Footer */}
      <div className="mt-8 p-3 rounded-lg bg-background-100 border border-secondary-200">
        <p className="text-[11px] text-foreground-400"><i className="ri-lock-line mr-1" />This interface is an operational aid. It follows the organisation's approved privacy policy. No formal legal compliance is claimed automatically.</p>
      </div>
    </>
  );
}

// ── Tab components ──

function RequestsTab({ requests, refreshing, onStatusChange, isDemo }: { requests: PrivacyRequest[]; refreshing: boolean; onStatusChange: (id: string, status: RequestStatus) => void; isDemo: boolean }) {
  return (
    <div>
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Privacy Requests</h3>
      {refreshing && requests.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center"><i className="ri-loader-4-line animate-spin text-2xl text-foreground-300 mb-3 block" /><p className="text-sm text-foreground-400">Loading requests...</p></div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-3"><i className="ri-file-list-3-line text-xl" /></div>
          <p className="text-sm text-foreground-500">No privacy requests</p>
          <p className="text-xs text-foreground-400 mt-1">Requests appear here when customers submit export or deletion requests.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden">
          {requests.map((req) => (
            <div key={req.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 border-b border-secondary-100 last:border-b-0">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-foreground-500 flex-shrink-0">
                <i className={REQUEST_TYPE_ICONS[req.request_type]} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-label font-medium text-sm text-foreground-900">{REQUEST_TYPE_LABELS[req.request_type]}</span>
                  <StatusBadge status={req.status} />
                </div>
                <div className="text-[10px] text-foreground-500 mt-1 space-y-0.5">
                  <p>ID: {req.id}</p>
                  <p>Submitted: {new Date(req.submitted_at).toLocaleString()}</p>
                  {req.verified_at && <p>Verified: {new Date(req.verified_at).toLocaleString()}</p>}
                  {req.completed_at && <p>Completed: {new Date(req.completed_at).toLocaleString()}</p>}
                  {req.export_expires_at && <p>Export expires: {new Date(req.export_expires_at).toLocaleString()}</p>}
                  {req.cooling_off_until && <p>Cooling off until: {new Date(req.cooling_off_until).toLocaleDateString()}</p>}
                  {req.scheduled_deletion_at && <p>Scheduled deletion: {new Date(req.scheduled_deletion_at).toLocaleString()}</p>}
                </div>
                {req.failure_reason && <p className="text-xs text-red-600 mt-1">{req.failure_reason}</p>}
                {req.safe_notes && <p className="text-xs text-foreground-500 mt-1 italic">{req.safe_notes}</p>}
              </div>
              {!['completed', 'rejected', 'cancelled'].includes(req.status) && (
                <div className="flex flex-wrap gap-1 flex-shrink-0">
                  {req.status === 'submitted' && (
                    <button onClick={() => onStatusChange(req.id, 'verification_required')} className="px-2 py-1 rounded text-[10px] bg-purple-50 text-purple-700 font-label hover:bg-purple-100 cursor-pointer whitespace-nowrap">Verify</button>
                  )}
                  {req.status === 'verification_required' && (
                    <button onClick={() => onStatusChange(req.id, 'verified')} className="px-2 py-1 rounded text-[10px] bg-emerald-50 text-emerald-700 font-label hover:bg-emerald-100 cursor-pointer whitespace-nowrap">Approve</button>
                  )}
                  {req.status === 'verified' && (
                    <button onClick={() => onStatusChange(req.id, 'processing')} className="px-2 py-1 rounded text-[10px] bg-amber-50 text-amber-700 font-label hover:bg-amber-100 cursor-pointer whitespace-nowrap">Process</button>
                  )}
                  {req.status === 'processing' && (
                    <button onClick={() => onStatusChange(req.id, 'completed')} className="px-2 py-1 rounded text-[10px] bg-green-50 text-green-700 font-label hover:bg-green-100 cursor-pointer whitespace-nowrap">Complete</button>
                  )}
                  <button onClick={() => onStatusChange(req.id, 'cancelled')} className="px-2 py-1 rounded text-[10px] bg-gray-50 text-gray-500 font-label hover:bg-gray-100 cursor-pointer whitespace-nowrap">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RetentionTab({ isDemo }: { isDemo: boolean }) {
  const categories = [
    { name: 'Active account data', period: 'Account lifetime + 30 days', action: 'Deletion on account removal' },
    { name: 'Guest personal data', period: 'Wedding lifetime + 30 days', action: 'Cascading delete with wedding' },
    { name: 'RSVP submissions', period: 'Wedding data retention', action: 'Cascading delete with wedding' },
    { name: 'Gallery photos & videos', period: 'Wedding data retention', action: 'Storage + DB removal' },
    { name: 'Rejected/quarantined media', period: '30 days from rejection', action: 'Scheduled job' },
    { name: 'Invitation tokens & sessions', period: '30 days post-expiry / 90 days post-last-use', action: 'Scheduled job' },
    { name: 'Activity & audit logs', period: '12 months', action: 'Scheduled monthly purge' },
    { name: 'Email suppression list', period: 'Indefinite', action: 'Manual on verified request' },
    { name: 'Payment records', period: '6 years from transaction', action: 'Manual after statutory period' },
    { name: 'Deleted account backups', period: '90 days cold storage', action: 'Automated rotation' },
    { name: 'Cookie consent records', period: '6 months', action: 'Browser storage expiry' },
    { name: 'Operational events', period: '12 months', action: 'Scheduled monthly purge' },
    { name: 'Analytics events', period: '90 days raw / 24mo aggregated', action: 'Scheduled jobs' },
    { name: 'Generated exports', period: '72 hours from generation', action: 'Scheduled job' },
    { name: 'Support cases', period: 'Duration of account + 6 years', action: 'Manual on account removal' },
    { name: 'Incident & release records', period: 'Indefinite', action: 'Manual review' },
  ];

  return (
    <div>
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Retention Schedule</h3>
      {isDemo && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
          <p className="text-xs text-amber-700"><i className="ri-information-line mr-1" /><strong>Review note:</strong> Retention periods marked as proposed require legal/management confirmation. Do not rely on these durations as final policy.</p>
        </div>
      )}
      <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-secondary-200 bg-background-50">
                <th className="text-left py-2.5 px-3 font-label font-semibold text-foreground-700">Category</th>
                <th className="text-left py-2.5 px-3 font-label font-semibold text-foreground-700">Retention Period</th>
                <th className="text-left py-2.5 px-3 font-label font-semibold text-foreground-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {categories.map((cat, i) => (
                <tr key={i} className="hover:bg-background-50">
                  <td className="py-2 px-3 text-foreground-800 font-label">{cat.name}</td>
                  <td className="py-2 px-3 text-foreground-600">{cat.period}</td>
                  <td className="py-2 px-3 text-foreground-500">{cat.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-background-100 border border-secondary-200">
        <p className="text-[11px] text-foreground-500">
          <i className="ri-file-text-line mr-1" />Full retention schedule documented at <Link to="/retention" className="text-primary-600 hover:underline cursor-pointer">/retention</Link> and <code className="text-[10px] bg-secondary-200 px-1 rounded">docs/data-retention-schedule.md</code>.
        </p>
      </div>
    </div>
  );
}

function DeletionTab({ requests, isDemo }: { requests: PrivacyRequest[]; isDemo: boolean }) {
  return (
    <div>
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Deletion Pipeline</h3>
      <div className="rounded-lg bg-white border border-secondary-100 p-5 mb-6">
        <h4 className="font-label text-xs font-semibold text-foreground-700 mb-3">Staged Deletion Workflow</h4>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
          {['Request submitted', 'Ownership & billing checks', 'Cooling-off period', 'Scheduled deletion', 'Final deletion', 'Audit complete'].map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-700 font-label text-[10px] font-semibold">{i + 1}</span>
              <span className="text-foreground-600">{stage}</span>
              {i < 5 && <i className="ri-arrow-right-line text-foreground-300 hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      <h4 className="font-label text-xs font-semibold text-foreground-700 mb-3">Active Deletions ({requests.length})</h4>
      {requests.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-8 text-center">
          <i className="ri-delete-bin-line text-2xl text-foreground-300 mb-2 block" />
          <p className="text-sm text-foreground-500">No active deletion requests</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden">
          {requests.map((req) => (
            <div key={req.id} className="p-3 border-b border-secondary-100 last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label font-medium text-sm text-foreground-900">{REQUEST_TYPE_LABELS[req.request_type]}</span>
                <StatusBadge status={req.status} />
              </div>
              <div className="text-[10px] text-foreground-500 space-y-0.5">
                <p>Submitted: {new Date(req.submitted_at).toLocaleString()}</p>
                {req.cooling_off_until && <p>Cooling off until: {new Date(req.cooling_off_until).toLocaleDateString()}</p>}
                {req.scheduled_deletion_at && <p>Scheduled: {new Date(req.scheduled_deletion_at).toLocaleString()}</p>}
                {req.safe_notes && <p className="italic mt-1">{req.safe_notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isDemo && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700"><i className="ri-alert-line mr-1" />Deletions never run from the browser. The <code className="text-[10px] bg-amber-200 px-1 rounded">process-data-deletion-request</code> Edge Function handles all deletions server-side with ownership verification and safe table ordering.</p>
        </div>
      )}
    </div>
  );
}

function AuditTab({ requests, isDemo }: { requests: PrivacyRequest[]; isDemo: boolean }) {
  const completed = requests.filter((r) => r.status === 'completed');
  return (
    <div>
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Privacy Request Audit</h3>
      <div className="rounded-lg bg-white border border-secondary-100 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-background-50">
            <p className="text-foreground-400 font-label mb-1">Total Requests</p>
            <p className="font-semibold text-foreground-900 text-lg">{requests.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-background-50">
            <p className="text-foreground-400 font-label mb-1">Completed</p>
            <p className="font-semibold text-green-600 text-lg">{completed.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-background-50">
            <p className="text-foreground-400 font-label mb-1">Failed/Rejected</p>
            <p className="font-semibold text-red-600 text-lg">{requests.filter((r) => r.status === 'failed' || r.status === 'rejected').length}</p>
          </div>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-secondary-200">
        <p className="text-[11px] text-foreground-500">
          <i className="ri-file-list-3-line mr-1" />Every request records: request ID, type, user, submitted/verified/completed date, assigned operator, and outcome. Completed request history is never silently deleted. Full audit trails available in the privacy_requests table.
        </p>
      </div>
    </div>
  );
}