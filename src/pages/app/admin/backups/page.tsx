import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type BackupStatus = 'scheduled' | 'running' | 'completed' | 'verified' | 'failed' | 'expired' | 'unknown';
type BackupType = 'postgresql' | 'storage' | 'edge_functions' | 'configuration' | 'dns' | 'manual';

interface BackupRecord {
  id: string;
  backup_type: BackupType;
  environment: string;
  status: BackupStatus;
  started_at: string | null;
  completed_at: string | null;
  provider_reference: string | null;
  database_version: string | null;
  approximate_size_bytes: number | null;
  encryption_status: string | null;
  retention_expiry: string | null;
  verification_status: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

const BACKUP_TYPE_LABELS: Record<BackupType, string> = {
  postgresql: 'PostgreSQL Database',
  storage: 'Storage Objects',
  edge_functions: 'Edge Functions',
  configuration: 'Configuration',
  dns: 'DNS Records',
  manual: 'Manual',
};

const BACKUP_TYPE_ICONS: Record<BackupType, string> = {
  postgresql: 'ri-database-2-line',
  storage: 'ri-folder-line',
  edge_functions: 'ri-code-s-slash-line',
  configuration: 'ri-settings-3-line',
  dns: 'ri-global-line',
  manual: 'ri-user-line',
};

function StatusBadge({ status }: { status: BackupStatus }) {
  const styles: Record<BackupStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-700', running: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700', verified: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-500', unknown: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status]}`}>{status}</span>;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// ── Demo data ──
const DEMO_BACKUPS: BackupRecord[] = [
  { id: 'bak-001', backup_type: 'postgresql', environment: 'production', status: 'verified', started_at: '2027-08-05T02:00:00Z', completed_at: '2027-08-05T02:03:15Z', provider_reference: 'supabase-pg-backup-daily', database_version: 'PostgreSQL 16.1', approximate_size_bytes: 52428800, encryption_status: 'AES-256-GCM', retention_expiry: '2027-08-12T02:00:00Z', verification_status: 'verified', verified_by: 'System Admin', verified_at: '2027-08-05T08:30:00Z', notes: 'Automated daily backup. Verified via restore test RT-042.', created_at: '2027-08-05T02:00:00Z' },
  { id: 'bak-002', backup_type: 'storage', environment: 'production', status: 'completed', started_at: '2027-08-05T03:00:00Z', completed_at: '2027-08-05T03:12:45Z', provider_reference: 'supabase-storage-backup-daily', database_version: null, approximate_size_bytes: 2147483648, encryption_status: 'AES-256-GCM', retention_expiry: '2027-08-12T03:00:00Z', verification_status: 'unverified', verified_by: null, verified_at: null, notes: 'Daily storage backup. Restore test pending.', created_at: '2027-08-05T03:00:00Z' },
  { id: 'bak-003', backup_type: 'edge_functions', environment: 'production', status: 'completed', started_at: '2027-08-05T01:00:00Z', completed_at: '2027-08-05T01:02:30Z', provider_reference: 'supabase-functions-snapshot', database_version: null, approximate_size_bytes: 1048576, encryption_status: null, retention_expiry: '2027-08-12T01:00:00Z', verification_status: 'unverified', verified_by: null, verified_at: null, notes: 'Edge Function deployment snapshot.', created_at: '2027-08-05T01:00:00Z' },
  { id: 'bak-004', backup_type: 'configuration', environment: 'production', status: 'completed', started_at: '2027-08-04T18:00:00Z', completed_at: '2027-08-04T18:01:00Z', provider_reference: 'env-inventory-v2027-08-04', database_version: null, approximate_size_bytes: 4096, encryption_status: null, retention_expiry: '2027-09-04T18:00:00Z', verification_status: 'verified', verified_by: 'System Admin', verified_at: '2027-08-04T18:10:00Z', notes: 'Environment variable inventory (no secrets). Stripe/Resend config documented.', created_at: '2027-08-04T18:00:00Z' },
  { id: 'bak-005', backup_type: 'postgresql', environment: 'production', status: 'completed', started_at: '2027-08-04T02:00:00Z', completed_at: '2027-08-04T02:02:55Z', provider_reference: 'supabase-pg-backup-daily', database_version: 'PostgreSQL 16.1', approximate_size_bytes: 50331648, encryption_status: 'AES-256-GCM', retention_expiry: '2027-08-11T02:00:00Z', verification_status: 'verified', verified_by: 'System Admin', verified_at: '2027-08-04T09:15:00Z', notes: 'Daily backup expired. Previous restore test passed.', created_at: '2027-08-04T02:00:00Z' },
];

// ── Main component ──

function BackupRow({ backup, onRecordVerify }: { backup: BackupRecord; onRecordVerify: (id: string) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 border-b border-secondary-100 last:border-b-0">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-100 text-foreground-500 flex-shrink-0">
        <i className={BACKUP_TYPE_ICONS[backup.backup_type]} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-label font-medium text-sm text-foreground-900">{BACKUP_TYPE_LABELS[backup.backup_type]}</span>
          <StatusBadge status={backup.status} />
          {backup.verification_status === 'verified' && <span className="text-[10px] text-green-600 font-label"><i className="ri-shield-check-line mr-0.5" />Verified</span>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-foreground-500 mt-1">
          {backup.database_version && <span>v{backup.database_version}</span>}
          <span>{formatBytes(backup.approximate_size_bytes)}</span>
          {backup.encryption_status && <span className="text-green-600">{backup.encryption_status}</span>}
          <span>Provider: {backup.provider_reference || '—'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-foreground-400 mt-1">
          {backup.started_at && <span>Started: {new Date(backup.started_at).toLocaleString()}</span>}
          {backup.completed_at && <span>Completed: {new Date(backup.completed_at).toLocaleString()}</span>}
          {backup.retention_expiry && <span>Expires: {new Date(backup.retention_expiry).toLocaleDateString()}</span>}
        </div>
        {backup.verified_at && <p className="text-[10px] text-foreground-400 mt-1">Verified by {backup.verified_by} on {new Date(backup.verified_at).toLocaleString()}</p>}
        {backup.notes && <p className="text-[10px] text-foreground-500 mt-1 italic">{backup.notes}</p>}
      </div>
      {backup.status === 'completed' && backup.verification_status !== 'verified' && (
        <button onClick={() => onRecordVerify(backup.id)} className="flex-shrink-0 px-2.5 py-1.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-label font-medium hover:bg-primary-100 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-check-line mr-1" />Record verification
        </button>
      )}
    </div>
  );
}

export default function BackupsDashboardPage() {
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [refreshing, setRefreshing] = useState(true);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);
    if (isDemo) {
      setBackups(DEMO_BACKUPS);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error } = await supabase.from('backup_records').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setBackups(data || []);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Failed to fetch backup records');
    } finally {
      setRefreshing(false);
    }
  }, [isDemo]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleRecordVerify = async (id: string) => {
    if (isDemo) {
      setBackups((prev) => prev.map((b) => b.id === id ? { ...b, verification_status: 'verified', verified_by: 'You', verified_at: new Date().toISOString() } : b));
      return;
    }
    try {
      const { error } = await supabase.from('backup_records').update({ verification_status: 'verified', verified_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      fetchBackups();
    } catch { /* silent */ }
  };

  // Summary stats
  const latestDbBackup = backups.filter((b) => b.backup_type === 'postgresql' && b.status === 'completed').sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime())[0];
  const verifiedCount = backups.filter((b) => b.verification_status === 'verified').length;
  const failedCount = backups.filter((b) => b.status === 'failed').length;
  const coverageTypes = [...new Set(backups.filter((b) => b.status === 'completed' || b.status === 'verified').map((b) => b.backup_type))];

  // Access gates
  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50">
        <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
          <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
          <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Backups</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <BackupsContent backups={backups} refreshing={refreshing} queryError={queryError} latestDbBackup={latestDbBackup} verifiedCount={verifiedCount} failedCount={failedCount} coverageTypes={coverageTypes} onRefresh={fetchBackups} onRecordVerify={handleRecordVerify} isDemo />
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Backups dashboard.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap">
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
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Backups</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <BackupsContent backups={backups} refreshing={refreshing} queryError={queryError} latestDbBackup={latestDbBackup} verifiedCount={verifiedCount} failedCount={failedCount} coverageTypes={coverageTypes} onRefresh={fetchBackups} onRecordVerify={handleRecordVerify} isDemo={false} />
      </div>
    </div>
  );
}

function BackupsContent({ backups, refreshing, queryError, latestDbBackup, verifiedCount, failedCount, coverageTypes, onRefresh, onRecordVerify, isDemo }: {
  backups: BackupRecord[];
  refreshing: boolean;
  queryError: string | null;
  latestDbBackup: BackupRecord | undefined;
  verifiedCount: number;
  failedCount: number;
  coverageTypes: string[];
  onRefresh: () => void;
  onRecordVerify: (id: string) => void;
  isDemo: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Platform resilience</p>
          <h1 className="font-heading text-2xl text-foreground-900">Backups</h1>
          <p className="text-sm text-foreground-500 mt-1">Vowora records backup evidence but never exposes backup credentials.</p>
        </div>
        <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary-100 text-secondary-700 text-sm font-label font-medium hover:bg-secondary-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
          {refreshing ? <><i className="ri-loader-4-line animate-spin" /> Refreshing...</> : <><i className="ri-restart-line" /> Refresh status</>}
        </button>
      </div>

      {queryError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6">
          <div className="flex items-center gap-2"><i className="ri-error-warning-line text-red-600" /><p className="text-sm text-red-700 font-label">{queryError}</p></div>
          <button onClick={onRefresh} className="mt-2 text-xs text-red-600 underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-database-2-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Latest DB Backup</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{latestDbBackup ? new Date(latestDbBackup.completed_at || '').toLocaleDateString() : 'No data'}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-shield-check-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Verified Restore Tests</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{verifiedCount} of {backups.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-checkbox-circle-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Coverage</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{coverageTypes.length} types</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-hard-drive-2-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Storage Backup</p>
          <p className="font-label font-medium text-sm text-foreground-900 mt-0.5">{backups.filter((b) => b.backup_type === 'storage' && b.status !== 'failed').length > 0 ? 'Active' : 'Check'}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-secondary-100">
          <i className="ri-restart-line text-foreground-400 mb-2 block" />
          <p className="text-[10px] font-label text-foreground-400 uppercase tracking-wide">Recovery Readiness</p>
          <p className={`font-label font-medium text-sm mt-0.5 ${verifiedCount > 0 && failedCount === 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {verifiedCount > 0 && failedCount === 0 ? 'Ready' : 'Review needed'}
          </p>
        </div>
      </div>

      {/* Backup scope info */}
      {isDemo && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
          <p className="text-xs text-amber-700"><i className="ri-information-line mr-1" />
            <strong>Demo data:</strong> These are sample backup records. In production, backup metadata is ingested from Supabase provider APIs or manually recorded with evidence references.
          </p>
        </div>
      )}

      {/* Backup scope coverage */}
      <div className="mb-8 p-4 rounded-lg bg-white border border-secondary-100">
        <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Backup Scope</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(['postgresql', 'storage', 'edge_functions', 'configuration', 'dns', 'manual'] as BackupType[]).map((type) => {
            const covered = coverageTypes.includes(type);
            return (
              <div key={type} className={`flex items-center gap-2 p-2 rounded-lg ${covered ? 'bg-emerald-50' : 'bg-secondary-50'}`}>
                <i className={`${covered ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'}`} />
                <span className={`text-xs font-label ${covered ? 'text-emerald-700' : 'text-foreground-400'}`}>{BACKUP_TYPE_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup records list */}
      <h2 className="font-heading text-lg text-foreground-900 mb-4">Backup Records</h2>
      {refreshing && backups.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center">
          <i className="ri-loader-4-line animate-spin text-2xl text-foreground-300 mb-3 block" />
          <p className="text-sm text-foreground-400">Loading backup records...</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="rounded-lg bg-white border border-secondary-100 p-10 text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-3">
            <i className="ri-database-2-line text-xl" />
          </div>
          <p className="text-sm text-foreground-500">No backup records found</p>
          <p className="text-xs text-foreground-400 mt-1">Backup records appear here when verified evidence is recorded.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-secondary-100 overflow-hidden mb-8">
          {backups.map((bak) => <BackupRow key={bak.id} backup={bak} onRecordVerify={onRecordVerify} />)}
        </div>
      )}

      {/* Footer */}
      <div className="p-3 rounded-lg bg-background-100 border border-secondary-200">
        <p className="text-[11px] text-foreground-400">
          <i className="ri-lock-line mr-1" />This page does not expose backup download URLs, encryption keys, database passwords, service-role keys, or provider credentials.
        </p>
      </div>
    </>
  );
}